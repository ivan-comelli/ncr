import dbData from '../../../db/output.json';

import { 
    dispatchInventoryFailure, 
    dispatchInventorySuccess, 
    dispatchInventoryStart, 
    setStepLoader,
    updatePriority,
    deleteStockOP,
} from '../sync';

import { InventoryFirestoreService } from "../../../services/firestoreInventory";

function mergeResults(res1, res2) {
  const map = new Map();

  const mergeById = (arr1 = [], arr2 = []) => {
    const inner = new Map();
    [...arr1, ...arr2].forEach(item => {
      inner.set(item.id, { ...(inner.get(item.id) || {}), ...item });
    });
    return Array.from(inner.values());
  };

  [...res1, ...res2].forEach(item => {
    if (map.has(item.id)) {
      const existing = map.get(item.id);
      map.set(item.id, {
        ...existing,
        ...item,
        stock: mergeById(existing.stock, item.stock),
        technicians: mergeById(existing.technicians, item.technicians)
      });
    } else {
      map.set(item.id, {
        ...item,
        stock: [...item.stock],
        technicians: [...item.technicians]
      });
    }
  });

  return Array.from(map.values());
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
  


//Hay que ver de hacer una inteface con lo datos que pueden llegar del CSV
export function dispatchBulkInventory(data) {
    return async (dispatch) => {
      console.groupCollapsed("Start Dispatch in Bulk Inventory Parts...");
      console.log(data)
      if (!data) {
        dispatch(dispatchInventoryFailure("No hay datos o no son válidos"));
        return;
      }
      dispatch(dispatchInventoryStart(false));
      let serviceInventory = new InventoryFirestoreService();
      try {
        let {membersMuted, flagType} = await processInventoryData(data, (index) => {
          dispatch(setStepLoader(Math.floor((index / inventoryData.length) * 100)));
        });
        await updateGeneralSettings();
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

        //Entiendo que aqui busco saber cuales items no se modificaron con el archivo
        //por ende hay que dejar en 0 los contadores ya que no son actualizaciones merge

        //MUCHA LOGICA DE ACA SE VA RELACIONADA CON EL WIPE DE PARTES NO ACTUALIZADAS
        //TAMBIEN VA HABER UN NUEVO CONCEPTO DE HASH PARA DETECTAR CAMBIOS
        
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

        const formatItem = (item) => {
          const parts = item.split("-");
          if (parts.length <= 2) {
            // Caso corto: xxxx-xxxx
            return parts[0]
          } else {
            // Caso largo: xxxx-xxxx-xxxx-xxxx-xxxxx-xxxxx
            return parts.slice(0, 5).join("-");
          }
        };

        //Es muy costoso traer todo el inventario solo para saber cual no se muto
        //tendria que poder obtener una lista de estos inventarios
        console.log(membersMuted)
        console.log(lessTecMutations)
        console.log(flagType)
        //Debe de ser en Batch
        for (const item of lessTecMutations) {
          const result = formatItem(item)
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
        await batch2.commit();
        const newParsed = parseMutations(batch2._mutations, dispatch)
        console.log("✅ Batch ejecutado con éxito");
        console.log(newParsed)
        const mergeResult = mergeResults(parsed, newParsed);

        dispatch(dispatchInventorySuccess(mergeResult));
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
      let idRef;
      console.log(newStock)
      const matchDB = dbData.find(item => 
        item.pn.some(pn => newStock.partNumber.includes(pn))
      );
      if(matchDB) {
        idRef = matchDB.id;
      }
      else {
        idRef = newStock.partNumber[0];
      }

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
      const inventoryRef = doc(db, 'Inventory', idRef);
      const refStock = doc(collection(inventoryRef, "stock"), `${idRef}-${randomHex}`);
      console.log(`New Id Stock ${refStock.id}`);
      const result = await setStockToSomePart(refStock, newStock.stock);
      const merge = [{
        id: idRef,
        stock: [{
          id: refStock.id,
          ...newStock.stock,
        }],
        technicians: []
      }];
      
      dispatch(dispatchInventorySuccess(merge));
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