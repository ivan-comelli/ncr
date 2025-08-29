import { arrayUnion, collection, writeBatch, doc, getDocs, getDoc, deleteDoc, setDoc, Timestamp, documentId, updateDoc, where, query, or } from "firebase/firestore";
import { db } from '../../../db/firebase';
import dbData from '../../../db/output.json';

import { 
    dispatchInventoryFailure, 
    dispatchInventorySuccess, 
    dispatchInventoryStart, 
    setStepLoader,
    updatePriority,
    deleteStockOP,
} from '../sync';

const options = [
  { name: "Diego Molina", csr: "AR103S42" },
  { name: "Nahuel DeLuca", csr: "AR103S44" },
  { name: "Juan Valenzuela", csr: "AR103S46" },
  { name: "Ivan Comelli", csr: "AR903S48" }
];

const STATUS = {
  PENDIENT: "PENDIENT",
  FAILED: "FAILED",
  ADJUST: "ADJUST",
  DONE: "DONE",
  SYNC: "SYNC",
  ISSUE: "ISSUE"
}

async function setStockToSomePart(refStock, newStock) {
  console.log(`Set Stock ${newStock.quantity} On State ${newStock.status}`)
  const batch = writeBatch(db);
  
  try {
      if(!refStock) {
          throw new Error("No hay referencia para actualizar");
      }
      batch.set(refStock, {
          quantity: newStock.quantity || 0,
          status: newStock.status,
          csr: "default",
          name: "default",
          note: newStock.note || "",
          lastUpdate: Timestamp.now()

      });
      console.log(refStock)
      batch.set(doc(db,'Inventory', refStock.parent.parent.id), {
        lastUpdate: Timestamp.now()
      }, {merge: true});
  } catch(error) {
      throw new Error("No se pudo agregar el stock: " + error.message);
  }
  batch.commit();
  return batch;
}

async function initTechnicianToSomePart(refInventory, batch) {
  try {
      console.log(`Initialization technician of inventory ${refInventory.id}:`);
      options.forEach((item) => {
              let docTech = doc(collection(refInventory, "technicians"), `${refInventory.id}-${item.csr.toLowerCase()}`);
              console.log(`Init ${item.name} in ${docTech.id}`);
              batch.set(docTech, {
                  name: item.name,
                  csr: item.csr.toLowerCase()
              }, {merge: true});
      })
  }
  catch(e) {

  }
  return batch

}

async function setTechnicianToSomePart(refTechnician, newTechnician, batch) {
  try {
      if(!refTechnician) {
          console.error("Not Exist Reference to Update");
          throw new Error("No hay referencia para actualizar");
      }

      console.log(`Setting tech ${newTechnician.csr.toLowerCase()} in reference ${refTechnician.id} for ${newTechnician.ppk}`);

      batch.set(refTechnician, {
          ...newTechnician,
          csr: newTechnician.csr.toLowerCase(),
          ...(newTechnician.onHand && {onHand: newTechnician.onHand}),
          ...(newTechnician.ppk && {ppk: newTechnician.ppk}),
          lastUpdate: Timestamp.now()
      }, 
      { merge: true });
  } catch(error) {
      throw new Error("No se pudo agregar al tecnico: " + error.message);
  }
  finally {
    return batch;
  }
}

function parseMutations(mutations, dispatch) {
  //HACER MERGE DE MUTACIONES EN STOCK Y TECNICOS SOBRE ITEM DE CATALOGO REPETIDOS
  const mergeById = (arr1, arr2) => {
    const map = new Map();

    // agregamos los objetos del primer array
    arr1.forEach(item => map.set(item.id, item));

    // agregamos los del segundo array, si ya existe el id se sobrescribe (o se ignora)
    arr2.forEach(item => map.set(item.id, item));

    // devolvemos un array con los valores únicos
    return Array.from(map.values());
  };
    let loadingProgress = 0;
    let lotStock = [], lotTec = [], part = {}, formatData = [];
    console.groupCollapsed('Parse Batch for Store');
    console.log(mutations)
    mutations.forEach((item, index) => {
      loadingProgress = ((index + 1) / mutations.length) * 100;
      dispatch(setStepLoader(Math.floor(loadingProgress)));
      let data;
      switch(item.type) {
        case 1:
          data = item.data.value.mapValue.fields;
        break;
        case 0:
          data = item.value.value.mapValue.fields
        break;
      }
      const path = item.key.collectionGroup;
      console.log(path)
      switch (path) {
        case "Inventory":
          const pushInventory = () => {
            //ACA HACER EL MERGE
            console.log(`Push Inventory ${ part.id } - ${lotTec.length} tech - ${lotStock.length} stock op`);
            let matchData = formatData.find((item) => item.id == part.id);
            if(matchData){
              matchData.technicians = mergeById(matchData.technicians, lotTec);
              matchData.stock = mergeById(matchData.stock, lotStock);
            }
            else {
              formatData.push({ ...part, stock: [...lotStock], technicians: [...lotTec] });
            }
            lotStock = [];
            lotTec = [];
            part = {};
          };
          const setInventory = () => {
            part = {
              id: item.key.path.segments[item.key.path.offset + 1],
              ...(data.catalogId?.stringValue && { catalogId: data.catalogId.stringValue }),
              ...(data.reWork?.booleanValue !== undefined && { reWork: data.reWork.booleanValue }),
              ...(data.cost?.stringValue && { cost: data.cost.stringValue }),
              ...(data.priority?.stringValue && { priority: data.priority.stringValue })
            };          
          };
          setInventory();
          pushInventory();
        break;
        case "stock":
          lotStock.push(item.type === 2
            ? { id: item.key.path.segments[8], req: "DELETE" }
            : {
                id: item.key.path.segments[3],
                req: "POST",
                ...(data.quantity && { quantity: Number(data.quantity.integerValue) }),
                ...(data.status && { status: data.status.stringValue }),
                ...(data.note && { note: data.note.stringValue }),
                ...(data.lastUpdate && {
                  lastUpdate: {
                    seconds: Math.floor(new Date(data.lastUpdate.timestampValue).getTime() / 1000)
                  }
                }),
              });
        break;
        case "technicians":
          let techIndex = lotTec.findIndex(t => t.id == item.key.path.segments[3]);
          console.log(`Parse tech find similar ${techIndex > 0}`)
          if (techIndex >= 0) {
            lotTec[techIndex] = {
              ...lotTec[techIndex],
              ...(data.onHand && { onHand: Number(data.onHand.integerValue) }),
              ...(data.ppk && { ppk: Number(data.ppk.integerValue) }),
              ...(data.lastUpdate && { lastUpdate: { seconds: Math.floor(new Date(data.lastUpdate.timestampValue).getTime() / 1000) } }),
            };
          } else {
            lotTec.push({
              id: item.key.path.segments[item.key.path.offset + 3],
              ...(data.csr && {csr: data.csr?.stringValue}),
              ...(data.onHand && { onHand: Number(data.onHand.integerValue) }),
              ...(data.ppk && { ppk: Number(data.ppk.integerValue) }),
              ...(data.lastUpdate && { lastUpdate: { seconds: Math.floor(new Date(data.lastUpdate.timestampValue).getTime() / 1000) } }),
              ...(data.name && { name: data.name.stringValue }),
            });
          }
        break;
      }
    });
    if (Object.keys(part).length > 0) {
      formatData.push({ ...part, stock: lotStock, technicians: lotTec });
    }
    console.groupEnd();
    return formatData;
}  

async function updateGeneralSettings(batch) {
  await batch.commit();
  const lastUpdateFlag = doc(db, 'config', 'generalSettings');
  await setDoc(lastUpdateFlag, { lastUpdate: Timestamp.now() });
}

async function getOrCreateInventoryRef(batch, catalogId) {
      try {
        const q = query(collection(db, "Inventory"), where(documentId(), "==", catalogId));
        const allDocs = await getDocs(q);
        let inventoryDoc;

        if (allDocs.size > 1) {
            throw {
                code: "multiple-docs",
                message: `Se encontraron múltiples coincidencias con catalogId=${catalogId}`
            };
        }

        if(allDocs.empty) {
          inventoryDoc = {
            id: catalogId,
            ref: doc(db, 'Inventory', catalogId)
          }
          await initTechnicianToSomePart(inventoryDoc.ref, batch);
        }
        else {
          inventoryDoc = allDocs.docs[0];
        }
      
        return inventoryDoc;

    } catch (error) {
        if (!error.code) {
            error = {
              code: "internal-error",
              message: error.message || "Error inesperado al buscar el inventario"
            };
          }
          console.error(`[${error.code}] ${error.message}`);
          throw error;
    }
}
  
async function processSingleInventoryItem(batch, item) {
  try {
    console.log(item)
    const matchDB = dbData.find(ref => 
      ref.pn.some(pn => item.partNumber.includes(pn))
    );
    console.log(matchDB)
    if (!matchDB) return;
    console.log(`Reference of Inventory is: ${matchDB.id}`)
    const snapDocInventory = await getOrCreateInventoryRef(batch, matchDB.id);

    if(item.technician && Object.keys(item.technician).length) {
      batch = await setTechnicianToSomePart(doc(collection(snapDocInventory.ref, "technicians"), `${snapDocInventory.id}-${item.technician.csr.toLowerCase()}`), item.technician, batch);
    }

    batch.set(snapDocInventory.ref, {
        ...(item.reWork !== undefined && { reWork: item.reWork }),
        ...(item.cost !== undefined && { cost: item.cost }),
        lastUpdate: Timestamp.now()
    }, { merge: true });

  } catch (error) {
      throw {
          code: "batch-set-failed",
          message: "No se pudo agregar la parte: " + (error.message || error)
      };
  }
}

async function processInventoryData(batch, data, dispatch) {
    let index = 1;
    let members = [];
    for (const item of data) {
      console.groupCollapsed(`Iteration: ${index}`);
      if(!members.includes(item.technician.csr.toLowerCase())) {
        members.push(item.technician.csr.toLowerCase())
      }
      await processSingleInventoryItem(batch, item);
      dispatch(setStepLoader(Math.floor((index / data.length) * 100)));
      index ++;
      console.groupEnd();
    }
    const type = data[0].type;

    return { membersMuted: members, flagType: type };
}
  
export function dispatchBulkInventory(data) {
    return async (dispatch) => {
      console.groupCollapsed("Start Dispatch in Bulk Inventory Parts...");
      if (!data) {
        dispatch(dispatchInventoryFailure("No hay datos o no son válidos"));
        return;
      }
      dispatch(dispatchInventoryStart(false));
      let batch = writeBatch(db);
      try {
        let {membersMuted, flagType} = await processInventoryData(batch, data, dispatch);
        await updateGeneralSettings(batch);
        const parsed = parseMutations(batch._mutations, dispatch);
        //primero recorremos todo el inventario y cada tecnico que haga una mutacion se inserta en el objeto modelo de abajo
        //ademas de crear una bandera para señalar que tecnicos estan involucrados.
        //{
          //id-catalog: ['ar903s48']
        //}
        //Luego tengo que crear un arreglo de id tecnicos generado con los id-catalog y los tecnicos que no se encuentran coincidentes teniendo en cuenta los participantes
        //Luego empieza el proceso de mutacion: el cual involucra realizar una query compleja buscando todos los id-tec del arreglo anterior y devolviendo un snapshot.
        //Se realiza la operacion correspondiente segun el tipo de pantilla
        console.log(parsed)
        console.log(membersMuted)
        let restDataId = [];
        let lessTecMutations = []

        parsed.forEach((item) => {
          restDataId.push(item.id);
          membersMuted.forEach(members => {
            !item.technicians.some(tec => tec.csr == members) && lessTecMutations.push(`${item.id}-${members}`);
          });
        });
        const indexRef = doc(db, "indexes", "itemsIndex");
        await setDoc(
          indexRef,
          { ids: arrayUnion(...restDataId) },
          { merge: true } // <- crea o actualiza
        );
        console.log(...restDataId);
        const indexSnap = await getDoc(indexRef, { source: "server" });
        let idsCache
        if (indexSnap.exists()) {
          idsCache = indexSnap.data().ids;  // ✅ sin paréntesis
          console.log("IDs:", idsCache);
        } else {
          console.log("El documento índice no existe todavía.");
          idsCache = []; // array vacío si no existe
        }        
        const restSet = new Set(restDataId);
        const diffItems = idsCache.filter(x => !restSet.has(x));
        console.log(diffItems);

        const batch2 = writeBatch(db);

        //Es muy costoso traer todo el inventario solo para saber cual no se muto
        //tendria que poder obtener una lista de estos inventarios
        console.log(membersMuted)
        console.log(lessTecMutations)
        console.log(flagType)
        //Debe de ser en Batch
        for (const item of lessTecMutations) {
          const result = item.split("-").slice(0, 5).join("-");
          const techRef = doc(db, "Inventory", result, "technicians", item);

          if (flagType === "OH") {
            batch2.set(techRef, { onHand: 0 }, { merge: true });
          } else if (flagType === "PPK") {
            batch2.set(techRef, { ppk: 0 }, { merge: true });
          }
          batch2.set(doc(db,'Inventory', result), {
            lastUpdate: Timestamp.now()
          }, {merge: true});
        }
        // 🔹 Segundo bucle: los items que no están en el set (diffItems)
        for (const item of diffItems) {
          for (const tec of membersMuted) {
            const techRef = doc(db, "Inventory", item, "technicians", `${item}-${tec}`);

            if (flagType === "OH") {
              batch2.set(techRef, { onHand: 0 }, { merge: true });
            } else if (flagType === "PPK") {
              batch2.set(techRef, { ppk: 0 }, { merge: true });
            }
            batch2.set(doc(db,'Inventory', item), {
              lastUpdate: Timestamp.now()
            }, {merge: true});
          }
        }

        // 🔹 Ejecutar todo junto
        //await batch2.commit();
        const newParsed = parseMutations(batch2._mutations, dispatch)
        console.log("✅ Batch ejecutado con éxito");
        console.log(newParsed)

        //dispatch(dispatchInventorySuccess(parsed));
      } catch (error) {
        dispatch(dispatchInventoryFailure(error.message));
        throw error;
      } finally {
        dispatch(setStepLoader(0));
        console.groupEnd();
      }
    };
}

export function dispatchUpdatePriority(catalogId, newPriority) {
    return async (dispatch) => {
      try {
        console.log(`Id to Ref is: ${catalogId}`)
        const refInventory = doc(db, "Inventory", catalogId);
    
        // Actualizar directamente con setDoc
        await setDoc(refInventory, {
            priority: newPriority,
            lastUpdate: Timestamp.now()
        }, { merge: true });
        console.info("Prioridad actualizada correctamente.");
        dispatch(updatePriority(catalogId, newPriority));

      } catch (error) {
          throw new Error("No se pudo actualizar la prioridad: " + error.message);
      } 
    };
}

export function dispatchAddStock(newStock) {  
  return async(dispatch) => {    
    try {
      console.log(newStock)
      const matchDB = dbData.find(item => 
        item.pn.some(pn => newStock.partNumber.includes(pn))
      );
      if(matchDB) {
        const array = new Uint8Array(4);
        // Llena con valores aleatorios criptográficamente seguros
        crypto.getRandomValues(array);
        
        // Convierte los 4 bytes a un número entero (big endian)
        const randomInt =
          (array[0] << 24) |
          (array[1] << 16) |
          (array[2] << 8) |
          array[3];

        // Convierte a hexadecimal con padding a 8 caracteres
        // Usamos >>> 0 para forzar entero sin signo (porque JS usa 32 bits signed)
        const randomHex = (randomInt >>> 0).toString(16).padStart(8, '0');
        console.log(randomHex)
        const inventoryRef = doc(db, 'Inventory', matchDB.id);
        const refStock = doc(collection(inventoryRef, "stock"), `${matchDB.id}-${randomHex}`);
        console.log(`New Id Stock ${refStock.id}`);
        const result = await setStockToSomePart(refStock, newStock.stock);
        const merge = [{
          id: matchDB.id,
          stock: [{
            id: refStock.id,
            ...newStock.stock,
          }],
          technicians: []
        }];
        
        dispatch(dispatchInventorySuccess(merge));
      }
      else {
        console.error('NO exist match')
      }
    }
    catch {

    }
  }
}

export function dispatchDeleteStock(stock) {
  return async(dispatch) => {
    try {
      console.log("Delete Stock");
      const blocks = stock.split('-');
      blocks.pop();
      const catalog = blocks.join('-');
      console.log(catalog)
      const refInventory = doc(db, 'Inventory', catalog);
      const refStock = doc(collection(refInventory, 'stock'), stock);
      await deleteDoc(refStock);
      dispatch(deleteStockOP(catalog, stock));
    }
    catch(e) {
      console.error(`Fail Clear Stock OP: ${e}`);
    }
  }
}