import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from '../../../api/firebase';
import { getAllStockOfSomePart } from '../../../api/SubCollectionStockApi'
import { getTechnicianOfSomePart } from '../../../api/SubCollectionTechnicianApi'

import { 
    fetchInventoryFailure, 
    fetchInventorySuccess, 
    fetchInventoryStart,
    searchInDataTable,
    isolatePartInTable,
} from '../sync';

import dbData from '../../../db/output.json';

export * from './dispatch'

let timer;

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
                        priority: inventoryDoc.data().priority
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