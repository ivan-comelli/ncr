import { collection, writeBatch, doc, getDocs, getDoc, setDoc, Timestamp, updateDoc, where, query, or } from "firebase/firestore";
import { db } from '../../../db/firebase';
import dbData from '../../../db/output.json';
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
        console.groupCollapsed(`Get technician of inventory ${refInventory.id}:`);

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
            console.log(`Tech ${doc.data().name} in ${doc.id}`);
            return {
                id: doc.id, // Incluye el ID del documento si es necesario
                ...doc.data() // Extrae los datos del documento
            }
        });
        console.groupEnd();
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
                total: {},
                detail: []
            };
        }
        let balance = [];
        let commonCount = {};
        stockSnapshot.docs.forEach((doc) => {
            if(!commonCount[doc.data().csr]) commonCount[doc.data().csr] = 0;
            switch (doc.data().status) {
                case STATUS.PENDIENT:
                     commonCount[doc.data().csr] += Number(doc.data().quantity);
                break;
                case STATUS.FAILED:
                    commonCount[doc.data().csr] += 0;
                break;
                case STATUS.SYNC:
                     commonCount[doc.data().csr] += Number(doc.data().quantity);
                break;
                case STATUS.ADJUST:
                     commonCount[doc.data().csr] += Number(doc.data().quantity);
                break;
                case STATUS.ISSUE:
                     commonCount[doc.data().csr] += Number(doc.data().quantity);
                break;
                case STATUS.DONE:
                     commonCount[doc.data().csr] += 0;
                break;
                default:
                     commonCount[doc.data().csr] += Number(doc.data().quantity);
                break;
                        
            }
            balance.push({
                id: doc.id,
                csr: doc.data().csr,
                name: doc.data().name,
                stock: Number(doc.data().quantity),
                status: doc.data().status,
                note: doc.data().note,
                lastUpdate: doc.data().lastUpdate,
                total: commonCount[doc.data().csr]
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
            var inventoryQuery;
            const lastUpdateTimestamp = localStorage.getItem('session');
            var updateMostNew = lastUpdateTimestamp || new Date(0);
            let storedData = JSON.parse(localStorage.getItem('db')) || [];
            if (lastUpdateTimestamp && storedData !== []) {
                // Si lastUpdateTimestamp es válido, hacer la consulta con el filtro
                inventoryQuery = query(
                    inventoryCollectionRef,
                    where("lastUpdate", ">", Timestamp.fromDate(new Date(lastUpdateTimestamp)))
                );
            } else {
                // Si lastUpdateTimestamp no es válido, traer todos los documentos
                inventoryQuery = inventoryCollectionRef;  // No hay filtro
            }
            const inventorySnapshot = await getDocs(inventoryQuery);

            if (inventorySnapshot.empty) {
                //throw new Error("No se encontraron documentos en la colección de inventario.");
            }

            await Promise.all(
                inventorySnapshot.docs.map(async (inventoryDoc) => {
                    let matchDb = dbData.find(ref => {
                        if (ref.id == inventoryDoc.idCatalog) return true;
                        return false;
                    });
                    const inventoryData = {
                        id: inventoryDoc.id,
                        cost: Number(inventoryDoc.data().cost),
                        reWork: inventoryDoc.data().reWork,
                        priority: inventoryDoc.data().priority,
                        catalogId: inventoryDoc.data().catalogId
                    };
                    new Date(inventoryDoc.data().lastUpdate.toDate()).getTime() > new Date(updateMostNew).getTime() && (updateMostNew = inventoryDoc.data().lastUpdate.toDate());
                    const refInventory = inventoryDoc.ref;
                    const technicians = await getTechnicianOfSomePart(refInventory);
                    const stock = await getAllStockOfSomePart(refInventory);

                    const index = storedData.findIndex(existingItem => existingItem.id === inventoryDoc.id);
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

                    return {
                        ...inventoryData,
                        technicians,
                        stock,
                    };
                })
            );
            localStorage.setItem('db', JSON.stringify(storedData));
            localStorage.setItem('session', updateMostNew);
            dispatch(fetchInventorySuccess(storedData));
        } catch (error) {
            dispatch(fetchInventoryFailure(error.message));
            throw error;
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