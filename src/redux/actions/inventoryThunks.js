import { collection, writeBatch, doc, getDocs, getDoc, setDoc, query, where, Timestamp, or } from "firebase/firestore";
import { db } from '../../api/firebase';
import { getInventoryByPartNumber, setInventoryPart } from '../../api/inventoryApi'
import { setStockToSomePart, getAllStockOfSomePart } from '../../api/stockApi'
import { setTechnicianToSomePart, getTechnicianOfSomePart } from '../../api/technicianApi'

import { 
    dispatchInventoryFailure, 
    dispatchInventorySuccess, 
    dispatchInventoryStart, 
    fetchInventoryFailure, 
    fetchInventorySuccess, 
    fetchInventoryStart,
    searchInTable,
    setTable,
    isolatePartInTable
} from './actions';

let timer;

export function dispatchBulkInventory(data, reload = false) {
    return async (dispatch) => {
        const batch = writeBatch(db);
        try {
            if (!data) {
                throw new Error("No hay datos o no son válidos");
            }
            dispatch(dispatchInventoryStart());

            for (const item of data) {
                const snapShotInventory = await getInventoryByPartNumber(item.partNumber);

                const refInventory = snapShotInventory
                    ? snapShotInventory.ref
                    : doc(collection(db, "Inventory"));

                await setInventoryPart(refInventory, item, batch);

                if (item.stock && Object.keys(item.stock).length !== 0) {
                    await setStockToSomePart(doc(collection(refInventory, "stock")), item.stock, batch);
                }

                if (item.technician && Object.keys(item.technician).length !== 0) {
                    const existingTechnicians = await getDocs(collection(refInventory, "technicians"));

                    const technicianExists = existingTechnicians.docs.find(
                        (doc) => doc.data().csr.toLowerCase() === item.technician.csr.toLowerCase()
                    );

                    if (!technicianExists) {
                        await setTechnicianToSomePart(doc(collection(refInventory, "technicians")), item.technician, batch);
                    } else {
                        await setTechnicianToSomePart(technicianExists.ref, item.technician, batch, technicianExists.data());
                    }
                }
            }

            await batch.commit();
            console.log(batch)
            const lastUpdateFlag = doc(db, 'config', 'generalSettings');
            await setDoc(lastUpdateFlag, { lastUpdate: Timestamp.now() });
            if(!reload) {
                let inPart = false;
                let stock = [];
                let technicians = [];
                let part = {};
                let formatData = [];
                batch._mutations.forEach((item) => {
                    console.log(item) 
                    let data;
                    let path = item.key.collectionGroup;

                    if(item.type == 1){
                        data = item.data.value.mapValue.fields;
                    }
                    else if (item.type == 0) {
                        data = item.value.value.mapValue.fields;
                    }

                    switch(path) {
                        case "Inventory":
                            if(inPart) {
                                formatData.push({
                                    ...part,
                                    stock: stock,
                                    technicians: technicians
                                });
                                inPart = false;
                                part = {};
                                stock = [];
                                technicians = [];
                            }
                            else {
                                inPart = true;
                                part.partNumber = data.partNumber.arrayValue.values.map((value) => value.stringValue);
                                //VA A FALTAR RECUPERAR OTROS VALORES COO DESCR SI ES QUE EXISTE Y EL LASTUPDATE
                            }
                        break;
                        case "stock":
                            stock.push({
                                csr: data.csr?.stringValue,
                                name: data.name?.stringValue,
                                quantity: Number(data.quantity.integerValue)
                            });
                        break;
                        case "technicians":
                            technicians.push({
                                csr: data.csr?.stringValue,
                                name: data.name?.stringValue,
                                onHand: Number(data.onHand.integerValue),
                                ppk: Number(data.ppk.integerValue)
                            });
                        break;
                    }
                });
                formatData.push({
                    ...part,
                    stock: stock,
                    technicians: technicians
                });
                dispatch(dispatchInventorySuccess(formatData));
                dispatch(formatTableWithFilters(true));
            }
            else{
                dispatch(fetchAllInventory());
            }
        } catch (error) {
            dispatch(dispatchInventoryFailure(error.message));
            throw error;
        }
    };
}

export function fetchAllInventory() {
    return async (dispatch) => {
        try {
            dispatch(fetchInventoryStart());

            const lastUpdateFlag = (await getDoc(doc(db, 'config', 'generalSettings'))).data().lastUpdate.toDate();
            const inventoryCollectionRef = collection(db, "Inventory");

            const localData = localStorage.getItem('db');
            let response = [];

            if (!localData || lastUpdateFlag > new Date(JSON.parse(localData).lastUpdate)) {
                const inventorySnapshot = await getDocs(inventoryCollectionRef);

                if (inventorySnapshot.empty) {
                    throw new Error("No se encontraron documentos en la colección de inventario.");
                }

                response = await Promise.all(
                    inventorySnapshot.docs.map(async (inventoryDoc) => {
                        const inventoryData = {
                            id: inventoryDoc.id,
                            partNumber: inventoryDoc.data().partNumber,
                            description: inventoryDoc.data().description,
                        };

                        const refInventory = inventoryDoc.ref;

                        const technicians = await getTechnicianOfSomePart(refInventory);
                        const stock = await getAllStockOfSomePart(refInventory);

                        return {
                            ...inventoryData,
                            technicians,
                            stock,
                        };
                    })
                );

                localStorage.setItem('db', JSON.stringify({ data: response, lastUpdate: lastUpdateFlag }));
            } else {
                response = JSON.parse(localData).data;
            }
            console.log("FETCH")

            dispatch(fetchInventorySuccess(response));
            dispatch(formatTableWithFilters(true));
        } catch (error) {
            dispatch(fetchInventoryFailure(error.message));
            throw error;
        }
    };
}


export const formatTableWithFilters = (hasFilter = false) => {
    return ((dispatch, getState) => {
        let dataTable = structuredClone(getState().inventory.data);
        dataTable = dataTable.map((item => {
            return {
                id: item.id,
                partNumber: item.partNumber,
                description: item.description,
                stock: Object.values(item.stock.total).reduce((sum, value) => sum += value, 0) || 0,
                ppk: item.technicians.reduce((sum, value) => sum += value.ppk, 0) || 0,
                onHand: item.technicians.reduce((sum, value) => sum += value.onHand, 0) || 0,
                nodes: item.technicians.map((node) => {
                    return {
                        id: node.id,
                        partNumber: [],
                        description: node.name,
                        ppk: node.ppk,
                        onHand: node.onHand,
                        stock: item.stock.total[node.csr] || 0
                    }
                }) 
            }
        }));
        dispatch(setTable(dataTable));
        if(hasFilter) {
            dispatch(searchInTable(null))
        }
        else {
            dispatch(searchInTable(''))

        }
    })
}


export function lazySearch(value) {
    return ((dispatch) => {
        clearTimeout(timer); // Limpia el timeout si el usuario sigue escribiendo
        
        timer = setTimeout(() => {
            dispatch(formatTableWithFilters());
            dispatch(searchInTable(value)); // Cambia el estado final después del debounce
            if (value == '') {
                dispatch(isolatePartInTable(null));
            }
        }, 1000); // Ventana de 1 segundo
    })
}