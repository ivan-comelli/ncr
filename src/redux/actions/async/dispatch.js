import { collection, writeBatch, doc, getDocs, getDoc, setDoc, Timestamp, updateDoc } from "firebase/firestore";
import { db } from '../../../api/firebase';
import { getInventoryByCatalog, setInventoryPart, setPriorityOfInventoryPart } from '../../../api/MainCollectionInventoryApi'
import { setStockToSomePart } from '../../../api/SubCollectionStockApi'
import { setTechnicianToSomePart, initTechnicianToSomePart } from '../../../api/SubCollectionTechnicianApi'
import dbData from '../../../db/output.json';
import { 
    dispatchInventoryFailure, 
    dispatchInventorySuccess, 
    dispatchInventoryStart, 
    setStepLoader,
    updatePriority,
    updateCategory
} from '../sync';

function parseMutations(mutations, dispatch) {
    let loadingProgress = 0;
    let lotStock = [], lotTec = [], part = {}, formatData = [];
    console.groupCollapsed('Parse Batch for Store');
    console.log(mutations)
    mutations.forEach((item, index) => {
      loadingProgress = ((index + 1) / mutations.length) * 100;
      dispatch(setStepLoader(Math.floor(loadingProgress)));
      let data;
      if(item.type === 1) {
        data = item.data.value.mapValue.fields;
      }
      else if (item.type === 0) {
        data = item.value.value.mapValue.fields
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
            console.log(data)
            part = {
              id: item.key.path.segments[1],
              ...(data.catalogId?.stringValue && { catalogId: data.catalogId.stringValue }),
              ...(data.reWork?.booleanValue !== undefined && { reWork: data.reWork.booleanValue }),
              ...(data.cost?.stringValue && { cost: data.cost.stringValue }),
              ...(data.priority?.stringValue && { priority: data.priority.stringValue })
            };          
          };
          const isLastUpdateChange = () => {
            let condition = item.fieldMask.fields.length == 1 && item.fieldMask.fields.find(field => (field.segments[0] == 'lastUpdate'))
            //console.log(`Format is ${condition}`)
            return condition;
          }
          
          if (!isLastUpdateChange()) {
            setInventory();
            pushInventory();
          }  
          
        break;
  
        case "stock":
          lotStock.push(item.type === 2
            ? { id: item.key.path.segments[8], req: "DELETE" }
            : {
                id: item.key.path.segments[3],
                req: "POST",
                csr: data.csr?.stringValue,
                name: data.name?.stringValue,
                quantity: Number(data.quantity.integerValue),
                status: data.status?.stringValue,
                note: data.note?.stringValue,
                lastUpdate: { seconds: Math.floor(new Date(data.lastUpdate.timestampValue).getTime() / 1000) }
              });
          break;
  
        case "technicians":
          let techIndex = lotTec.findIndex(t => t.id == item.key.path.segments[3]);
          console.log(`Parse tech find similar ${techIndex > 0}`)
          console.log(data.ppk.integerValue)
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

async function updateGeneralSettings(batch) {
  await batch.commit();
  const lastUpdateFlag = doc(db, 'config', 'generalSettings');
  await setDoc(lastUpdateFlag, { lastUpdate: Timestamp.now() });
}

async function checkTechnicianExists(batch, refInventory, technician) {
    const docsInDB = await getDocs(collection(refInventory, "technicians"));
    const foundInDb = docsInDB.docs.find(d => d.data().csr.toLowerCase() === technician.csr.toLowerCase());
  
    const foundInBatch = batch._mutations.find((doc) => {
      if (doc.key.path.segments[2] === "technicians" && doc.key.path.segments[1] === refInventory.id) {
        const fields = doc.type === 1 ? doc?.data.value.mapValue.fields : doc?.value.value.mapValue.fields;
        return fields.csr?.stringValue.toLowerCase() === technician.csr.toLowerCase();
      }
      return false;
    });
  
    return foundInDb || (foundInBatch && doc(db, ...foundInBatch.key.path.segments));
}
  
async function getOrCreateInventoryRef(batch, catalogId) {
    const snap = await getInventoryByCatalog(catalogId);
    if (snap) return snap.id;
  
    const batchMatch = batch._mutations.find(doc => {
      const fields = doc.type === 1 ? doc?.data.value.mapValue.fields : doc?.value.value.mapValue.fields;
      return fields.catalogId?.stringValue === catalogId;
    });
  
    if (batchMatch) return doc(db, "Inventory", batchMatch.key.path.segments[1]).id;
  
    const newRef = doc(collection(db, "Inventory"));
    await initTechnicianToSomePart(newRef, batch);
    return newRef.id;
}
  
async function processSingleInventoryItem(batch, item, dispatch) {
    const matchDB = dbData.find(ref => ref.pn.includes(item.partNumber));
    console.log(matchDB)
    if (!matchDB) return;
  
    const idInventory = await getOrCreateInventoryRef(batch, matchDB.id);
    const refInventory = doc(db, 'Inventory', idInventory);
    console.log(`Reference of Inventory is: ${refInventory.id}`)
    if (item.stock && Object.keys(item.stock).length) {
      batch = await setStockToSomePart(doc(collection(refInventory, "stock")), item.stock, batch);
    }
  
    if (item.technician && Object.keys(item.technician).length) {
      const techExists = await checkTechnicianExists(batch, refInventory, item.technician);
      if (!techExists) {
        batch = await setTechnicianToSomePart(doc(collection(refInventory, "technicians")), item.technician, batch);
      } else {
        batch = await setTechnicianToSomePart(techExists.ref || techExists, item.technician, batch, techExists.data && techExists.data());
      }
    }
  
    batch = await setInventoryPart(refInventory, {
      id: matchDB.id,
      reWork: item.reWork,
      cost: item.cost
    }, batch);
}

async function processInventoryData(batch, data, dispatch) {
    let index = 1;
    for (const item of data) {
      console.groupCollapsed(`Iteration: ${index}`);
      await processSingleInventoryItem(batch, item, dispatch);
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
  
      try {
        const formatData = await processInventoryData(batch, data, dispatch);
        await updateGeneralSettings(batch);
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

export function dispatchUpdatePriority(item) {
    return async (dispatch) => {
        try {
            const response = await setPriorityOfInventoryPart(item.id, item.priority);
            console.log("API response:", response);

            dispatch(updatePriority(response, item.priority));
        } catch (err) {
            console.error("Fallo el seteo", err);
        }
    };
}

/*
export function dispatchUpdateCategory(item) {
    return async (dispatch) => {
        try {
            const response = await setCategoryOfInventoryPart(item.partNumber, item.category);
            console.log("API response:", response);
            dispatch(updateCategory(response, item.category));
        } catch (err) {
            console.error("Fallo el seteo", err);
        }
    };
}*/

/**
export function dispatchUpdateStateStock(path, action) {
    return async (dispatch) => {
        try {
            const stockRef = doc(db, `Inventory/${path[0]}/stock/${path[1]}`);
    
            const Doc = await getDoc(stockRef);
            var updatedData = {
                idInventory: path[0],
                idStock: path[1],
                status: null
            }

            if (Doc.exists()) {
                switch (Doc.data().status) {
                    case "PENDIENT":
                        !action && (updatedData.status = "DONE");
                    break;
                    case "ISSUE":
                        !action && (updatedData.status = "DONE");
                    break;
                    case "FAILED":
                        action ? (updatedData.status = "ADJUST") : (updatedData.status = "DONE");
                    break;
                }

                updatedData.status != null && (await updateDoc(stockRef, updatedData));

                const lastUpdateFlag = doc(db, 'config', 'generalSettings');
                await setDoc(lastUpdateFlag, {lastUpdate: Timestamp.now()});

                dispatch(setStock(updatedData))

            } else {
                console.error("El documento no existe");
            }
        } catch (error) {
            console.error("Error al actualizar el documento:", error);
        }
    }
}*/