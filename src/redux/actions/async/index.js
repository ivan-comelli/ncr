import { collection, writeBatch, doc, getDocs, getDoc, setDoc, Timestamp, updateDoc, where, query, or } from "firebase/firestore";
import { db } from '../../../db/firebase';
import { 
    fetchInventoryFailure, 
    fetchInventorySuccess, 
    fetchInventoryStart,
    searchInDataTable,
    isolatePartInTable,
} from '../sync';

export * from './dispatch';

let timer;

const STATUS = {
    PENDIENT: "PENDIENT",
    FAILED: "FAILED",
    ADJUST: "ADJUST",
    DONE: "DONE",
    SYNC: "SYNC",
    ISSUE: "ISSUE"
  }
  
export async function getTechnicianOfSomePart(refInventory, identity) {
    let response = null;
    try {
        if(!refInventory) {
            throw new Error("No hay referencia de la parte para actualizar");
        }
        const technicianCollectionRef = collection(refInventory, "technicians");
        let technicianSnapshot = null;
        if(identity){
            const qTechnician = query(technicianCollectionRef, or(where("csr", "==", identity.csr), where("name", "==", identity.name)));
            technicianSnapshot = await getDocs(qTechnician);
        }
        else {
            technicianSnapshot = await getDocs(technicianCollectionRef);
        }
        if (technicianSnapshot.size > 1 && identity) {
            throw new Error("Hay mas de una coincidencia.");
        }
        response = technicianSnapshot.docs.map(doc => {
            return {
                id: doc.id, // Incluye el ID del documento si es necesario
                ...doc.data() // Extrae los datos del documento
            }
        });
    } catch(error) {
        throw new Error("No se pudo obtener el tecnico, " + error.message);
    }
    return response;
}

export async function getAllStockOfSomePart(refInventory) {
    //Aqui se debe calcular la sumatoria por cada CSR presente y la total de todas
    try {
        if(!refInventory) {
            throw new Error("No hay referencia de la parte para actualizar");
        }
        const stockCollectionRef = collection(refInventory, "stock");
        const stockSnapshot = await getDocs(stockCollectionRef);
        if (stockSnapshot.empty) {
            return {
                total: 0,
                detail: []
            };
        }
        let balance = [];
        let commonCount = 0;
        stockSnapshot.docs.forEach((doc) => {
            switch (doc.data().status) {
                case STATUS.PENDIENT:
                     commonCount = commonCount + Number(doc.data().quantity);
                break;
                case STATUS.FAILED:
                    commonCount = commonCount + 0;
                break;
                case STATUS.SYNC:
                     commonCount = commonCount + Number(doc.data().quantity);
                break;
                case STATUS.ADJUST:
                     commonCount = commonCount + Number(doc.data().quantity);
                break;
                case STATUS.ISSUE:
                     commonCount = commonCount + Number(doc.data().quantity);
                break;
                case STATUS.DONE:
                     commonCount = commonCount + 0;
                break;
                default:
                     commonCount = commonCount + Number(doc.data().quantity);
                break;
                        
            }
            balance.push({
                id: doc.id,
                stock: Number(doc.data().quantity),
                status: doc.data().status,
                note: doc.data().note,
                lastUpdate: doc.data().lastUpdate,
            });
        });
        return {
            total: commonCount,
            detail: balance
        };
    } catch(error) {
        throw new Error("No se pudo obtener el stock, " + error.message);
    }
}

export function fetchAllInventory() {
  return async (dispatch) => {
    try {
      dispatch(fetchInventoryStart());

      const inventoryCollectionRef = collection(db, "Inventory");
      const lastUpdateTimestamp = localStorage.getItem('session');
      let updateMostNew = lastUpdateTimestamp || new Date(0);
      let storedData = JSON.parse(localStorage.getItem('db')) || [];
      console.log(lastUpdateTimestamp)
      const inventoryQuery = lastUpdateTimestamp
        ? query(
            inventoryCollectionRef,
            where("lastUpdate", ">", Timestamp.fromDate(new Date(lastUpdateTimestamp)))
          )
        : inventoryCollectionRef;

      const inventorySnapshot = await getDocs(inventoryQuery);

      if (inventorySnapshot.empty) {
        console.log('No new updates.');
        dispatch(fetchInventorySuccess(storedData));
        return;
      }

      await Promise.all(
        inventorySnapshot.docs.map(async (inventoryDoc) => {
            try {
                const data = inventoryDoc.data();
                console.log(data)
                const inventoryData = {
                id: inventoryDoc.id,
                cost: Number(data.cost),
                reWork: data.reWork,
                priority: data.priority,
                };

                const docUpdateDate = data.lastUpdate.toDate();
                if (new Date(docUpdateDate) > new Date(updateMostNew)) {
                updateMostNew = docUpdateDate;
                }

                const refInventory = inventoryDoc.ref;
                const technicians = await getTechnicianOfSomePart(refInventory);
                const stock = await getAllStockOfSomePart(refInventory);

                const index = storedData.findIndex(
                (existingItem) => existingItem.id === inventoryDoc.id
                );

                if (index !== -1) {
                storedData[index] = {
                    ...inventoryData,
                    technicians,
                    stock,
                };
                } else {
                storedData.push({
                    ...inventoryData,
                    technicians,
                    stock,
                });
                }
            } catch (error) {
                console.error(`Error processing ${inventoryDoc.id}: ${error.message}`);
            }
        })
      );      
      localStorage.setItem('db', JSON.stringify(storedData));
      localStorage.setItem('session', updateMostNew);
      dispatch(fetchInventorySuccess(storedData));
    } catch (error) {
      dispatch(fetchInventoryFailure(error.message));
      console.error(error);
    }
  };
}


export function lazySearch(value) {
    return ((dispatch) => {
        clearTimeout(timer); // Limpia el timeout si el usuario sigue escribiendo
        timer = setTimeout(() => {
            dispatch(searchInDataTable(value)); // Cambia el estado final después del debounce
            if (value == '') {
                dispatch(isolatePartInTable(null));
            }
        }, 1000); // Ventana de 1 segundo
    })
}