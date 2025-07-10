import { collection, writeBatch, doc, getDocs, getDoc, deleteDoc, setDoc, Timestamp, updateDoc, where, query, or } from "firebase/firestore";
import { db } from '../../../db/firebase';
import dbData from '../../../db/output.json';
import crypto from "crypto";

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
  { name: "Adrian Santarelli", csr: "AR103S45" },
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

async function setTechnicianToSomePart(refTechnician, newTechnician, batch, batchOfDate, lastLog = {onHand: 0, createdAt: undefined}) {
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
  return batch;
}

function parseMutations(mutations, dispatch) {
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
            console.log(`Push Inventory ${ part.id } - ${lotTec.length} tech - ${lotStock.length} stock op`);
            formatData.push({ ...part, stock: [...lotStock], technicians: [...lotTec] });
            lotStock = [];
            lotTec = [];
            part = {};
          };
          const setInventory = () => {
            part = {
              id: item.key.path.segments[1],
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
              id: item.key.path.segments[3],
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

async function updateGeneralSettings(batch, batchOfDate) {
  await batchOfDate.commit();
  await batch.commit();
  const lastUpdateFlag = doc(db, 'config', 'generalSettings');
  await setDoc(lastUpdateFlag, { lastUpdate: Timestamp.now() });
}

async function getOrCreateInventoryRef(batch, catalogId) {
      try {
        const q = query(collection(db, "Inventory"), where("catalogId", "==", catalogId));
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
  
async function processSingleInventoryItem(batch, batchOfDate, item) {
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
      batch = await setTechnicianToSomePart(doc(collection(snapDocInventory.ref, "technicians"), `${snapDocInventory.id}-${item.technician.csr.toLowerCase()}`), item.technician, item, batch, batchOfDate);
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

async function processInventoryData(batch, batchOfDate, data, dispatch) {
    let index = 1;
    for (const item of data) {
      console.groupCollapsed(`Iteration: ${index}`);
      await processSingleInventoryItem(batch, batchOfDate, item);
      dispatch(setStepLoader(Math.floor((index / data.length) * 100)));
      index ++;
      console.groupEnd();
    }
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
      let batchOfDate = writeBatch(db);

      try {
        await processInventoryData(batch, batchOfDate, data, dispatch);
        await updateGeneralSettings(batch, batchOfDate);
        const parsed = parseMutations(batch._mutations, dispatch);
        dispatch(dispatchInventorySuccess(parsed));
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
        const randomBytes = crypto.randomBytes(4); // Buffer de 4 bytes
        const randomInt = randomBytes.readUInt32BE(0);
        const randomHex = randomInt.toString(16).padStart(8, "0");
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