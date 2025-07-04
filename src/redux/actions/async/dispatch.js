import { collection, writeBatch, doc, getDocs, getDoc, setDoc, Timestamp, updateDoc, where, query, or } from "firebase/firestore";
import { db } from '../../../db/firebase';
import dbData from '../../../db/output.json';
import { 
    dispatchInventoryFailure, 
    dispatchInventorySuccess, 
    dispatchInventoryStart, 
    setStepLoader,
    updatePriority,
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

/**async function verifyStockOfSomeTechnicianInPartBETA(batch, tecRef, csr, diffOnHand, period) {
  //aqui buscamos desde el inicio del periodo hacia atras hasta fichar como corrupto todo los pendientes
  //luego acumular todo el stock del periodo y eh ir verificando desde el ultimo registro si se puede validar siendo exacto el acumulado y el diferencia
  //si falla desestima el ultimo stock y trata de que coincida con el anterior
  //si falla en todos los casos busca el instante que estuvo mas cerca y catalogo los consiguientes como corruptos
  //tambien estoy pensando si deberia simplificar las operaciones para reducir costes de almacenamiento4
  if(!batch) {
      batch = writeBatch(db);
      
  }
  try {
      //Se deben borrar todas las operaciones manuales pendientes o nulos dejando solo los sync . Al finalizar el wipe se ajusta el quantity considerando inmutables los adjust
      
      if(!(Timestamp.fromDate(new Date(period[0])).isEqual(Timestamp.fromDate(new Date(period[1]))))) {
          const q = query(collection(tecRef.parent.parent, "stock"), where("csr", "==", csr.toLowerCase()));
          const querySnapshot = await getDocs(q);
          let surplus = 0;
          // Filtrar los resultados en el cliente
          const lastPeriodCollection = querySnapshot.docs.filter((doc) => {
          const fecha = doc.data().lastUpdate; // Convertir Timestamp a Date
          return fecha >= Timestamp.fromDate(new Date(period[0])) && fecha <= Timestamp.fromDate(new Date(period[1]));
          });
          const restCollection = querySnapshot.docs.filter((doc) => {
              const fecha = doc.data().lastUpdate; // Convertir Timestamp a Date
              return fecha <= Timestamp.fromDate(new Date(period[0]));
          });
          //HAY QUE REFACTORIZAR LA FUNCION DE CONTEO DE OPERACION PARA EL STOCK DEBIDO A LOS NUEVOS ESTADOS QUE CONDICIONAN
          //Hay que Cuantificar y cambiar estados de cada uno de los tipos de operacion. Ya que en esta instancia se crea una operacion de ajuste en base a los balances
          let balance = {
              adjust: 0,
              failed: 0,
              sync: 0,
              done: 0,
              pendient: 0,
              issue: 0
          }
          lastPeriodCollection.forEach((doc) => {
              let quantity = doc.data().quantity;
              switch (doc.data().status) {
                  case STATUS.ADJUST:
                      //INMUTABLE
                      balance.adjust += quantity;
                  break;
                  case STATUS.FAILED:
                      //SE BORRA LUEGO DE UN PERIODO
                      balance.failed += quantity;
                      batch.delete(doc.ref);
                  break;
                  case STATUS.SYNC:
                      //INMUTABLE
                      balance.sync += quantity;
                  break;
                  case STATUS.DONE:
                      //SE BORRAN LUEGO DE UN PERIODO SIENDO EL TRANSCURRIDO NO COMMPUTADO
                      balance.done += quantity;
                      batch.delete(doc.ref);
                  break;
                  case STATUS.PENDIENT:
                      //SE COMPUTA Y NEUTRALIZA EL ESTADO PARA DEJAR REGISTRO
                      balance.pendient += quantity;
                      batch.update(doc.ref, {
                          status: STATUS.DONE
                      });
                  break;
                  case STATUS.ISSUE:
                      balance.issue += quantity;
                  break;
                  default:
                      //SE ASUME QUE ES UN PENDIENTE
                      balance.pendient += quantity;
                      batch.update(doc.ref, {
                          status: STATUS.DONE
                      });
                  break;
              }
          });

          restCollection.forEach((doc) => {
              let quantity = doc.data().quantity;
              switch (doc.data().status) {
                  case STATUS.ADJUST:
                      //INMUTABLE
                      balance.adjust += quantity;
                  break;
                  case STATUS.FAILED:
                      //SE BORRA LUEGO DE UN PERIODO
                      batch.delete(doc.ref);
                  break;
                  case STATUS.SYNC:
                      //INMUTABLE
                      balance.sync += quantity;
                  break;
                  case STATUS.DONE:
                      //SE BORRAN LUEGO DE UN PERIODO SIENDO EL TRANSCURRIDO NO COMMPUTADO
                      batch.delete(doc.ref);
                  break;
                  case STATUS.PENDIENT:
                      //SE COMPUTA Y NEUTRALIZA EL ESTADO PARA DEJAR REGISTRO
                      batch.delete(doc.ref);
                  break;
                  case STATUS.ISSUE:
                      balance.issue += quantity;
                  break;
                  default:
                      //SE ASUME QUE ES UN PENDIENTE
                      batch.delete(doc.ref);
                  break;
              }
          });
          console.log(balance)
          //El resto se recorre para hacer una wipe
          //Necesito saber si las pendientes
          console.log(diffOnHand)
          if(diffOnHand !== 0) {
              batch.set(doc(collection(tecRef.parent.parent, "stock")), {
                  status: STATUS.SYNC,
                  quantity: diffOnHand,
                  name: options.find(option => option.csr.toLowerCase() == (csr && csr.toLowerCase())).name,
                  csr: csr.toLowerCase(),
                  lastUpdate: Timestamp.now()
              });
          }
          if(balance.pendient !== diffOnHand) {
              if(diffOnHand >= 0) {
                  surplus = balance.pendient - diffOnHand; //No puede quedar excedentes positivos
                  if(surplus < 0) {
                      surplus = 0;
                  }
              }
              else {
                  surplus = balance.pendient - diffOnHand;  //no pueden quedar excedentes negativos
                  if(surplus >= 0) {
                      surplus = 0;
                  }
              }
          }
          if(surplus != 0) {
              batch.set(doc(collection(tecRef.parent.parent, "stock")), {
                  status: STATUS.FAILED,
                  quantity: surplus,
                  name: options.find(option => option.csr.toLowerCase() == (csr && csr.toLowerCase())).name,
                  csr: csr.toLowerCase(),
                  lastUpdate: Timestamp.now()
              });
          }

          console.log("stock: " + balance.sync + balance.adjust + diffOnHand);
          console.log("conflico con: " + surplus);
          console.log(querySnapshot);
          console.log(batch);
          console.log(tecRef);
          console.log(csr);
          console.log(diffOnHand);
          console.log(period);
      }
          
  } catch(e) {
      console.error(e)
  }
  
  //tengo que formatear el createDate para poder buscar con where en stock usando lastUpdaate
  //El algoritmo va a borrar todas las operaciones de la ventana para simplificar y asi ahorrar memoria y gasto de recursos
  return batch;
}**/

async function verifyStockOfSomeTechnicianInPart(batch, batchOfDate, tecRef, csr, onHand) {
  //aqui buscamos desde el inicio del periodo hacia atras hasta fichar como corrupto todo los pendientes
  //luego acumular todo el stock del periodo y eh ir verificando desde el ultimo registro si se puede validar siendo exacto el acumulado y el diferencia
  //si falla desestima el ultimo stock y trata de que coincida con el anterior
  //si falla en todos los casos busca el instante que estuvo mas cerca y catalogo los consiguientes como corruptos
  //tambien estoy pensando si deberia simplificar las operaciones para reducir costes de almacenamiento4
  if(!batch) {
      batch = writeBatch(db);
      
  }
  try {
          const q = query(collection(tecRef.parent.parent, "stock"), where("csr", "==", csr.toLowerCase()));
          const querySnapshot = await getDocs(q);

          let balance = {
              adjust: 0,
              failed: 0,
              sync: 0,
              done: 0,
              pendient: 0,
              issue: 0
          }

          querySnapshot.forEach((doc) => {
              let quantity = doc.data().quantity;
              switch (doc.data().status) {
                  case STATUS.ADJUST:
                      //INMUTABLE
                      balance.adjust += quantity;
                      batch.delete(doc.ref);
                  break;
                  case STATUS.FAILED:
                      //SE BORRA LUEGO DE UN PERIODO
                      balance.failed += quantity;
                      batch.delete(doc.ref);
                  break;
                  case STATUS.SYNC:
                      //INMUTABLE
                      balance.sync += quantity;
                      batch.delete(doc.ref);
                  break;
                  case STATUS.DONE:
                      //SE BORRAN LUEGO DE UN PERIODO SIENDO EL TRANSCURRIDO NO COMMPUTADO
                      balance.done += quantity;
                      batch.delete(doc.ref);
                  break;
                  case STATUS.PENDIENT:
                      //SE COMPUTA Y NEUTRALIZA EL ESTADO PARA DEJAR REGISTRO
                      balance.pendient += quantity;
                      batch.delete(doc.ref);
                  break;
                  case STATUS.ISSUE:
                      balance.issue += quantity;
                  break;
                  default:
                      //SE ASUME QUE ES UN PENDIENTE
                      balance.pendient += quantity;
                      batch.delete(doc.ref);
                  break;
              }
          });            

          console.log(`To tech ${options.find(option => option.csr.toLowerCase() == (csr && csr.toLowerCase())).name} insert ${onHand} units`);
          batch.set(doc(collection(tecRef.parent.parent, "stock")), {
              status: STATUS.SYNC,
              quantity: onHand,
              name: options.find(option => option.csr.toLowerCase() == (csr && csr.toLowerCase())).name,
              csr: csr.toLowerCase(),
              lastUpdate: Timestamp.now()
          });
          //Actualiza el updateAt del Main Ref, necesario para las actualizaciones optimizadas del fetch cliente
          batchOfDate.set(tecRef.parent.parent, {
              lastUpdate: Timestamp.now()
          }, {merge: true});
  } catch(e) {
      console.error(e)
  }
  
  //tengo que formatear el createDate para poder buscar con where en stock usando lastUpdaate
  //El algoritmo va a borrar todas las operaciones de la ventana para simplificar y asi ahorrar memoria y gasto de recursos
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
  //tengo que calcular la diferencia de OH en la ventana del ultimo periodo registrado
  //por cada technician de parte hay que ir a validar el stock
  //ACA FALLA porque si el tecnico no tiene ningun registro de onHand en una pieza tira error
  if(newTechnician.onHand != undefined) {
      await verifyStockOfSomeTechnicianInPart(batch, batchOfDate, refTechnician, newTechnician.csr, newTechnician.onHand);
  }

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
      batch = await setTechnicianToSomePart(doc(collection(snapDocInventory.ref, "technicians"), `${snapDocInventory.id}-${item.technician.csr.toLowerCase()}`), item.technician, batch, batchOfDate);
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
        const inventoryRef = doc(db, 'Inventory', matchDB.id);
        const refStock = doc(collection(inventoryRef, "stock"));
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