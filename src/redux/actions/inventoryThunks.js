import { collection, writeBatch, doc, getDocs, getDoc, setDoc, query, where, Timestamp, or, updateDoc } from "firebase/firestore";
import { format } from "path-browserify";
import { CardText } from "react-bootstrap";
import { db } from '../../api/firebase';
import { getInventoryByPartNumber, setInventoryPart } from '../../api/inventoryApi'
import { setStockToSomePart, getAllStockOfSomePart } from '../../api/stockApi'
import { setTechnicianToSomePart, getTechnicianOfSomePart, initTechnicianToSomePart } from '../../api/technicianApi'

import { 
    dispatchInventoryFailure, 
    dispatchInventorySuccess, 
    dispatchInventoryStart, 
    fetchInventoryFailure, 
    fetchInventorySuccess, 
    fetchInventoryStart,
    searchInTable,
    setTable,
    isolatePartInTable,
    findDetailStock,
    updateStock
} from './actions';

let timer;

export function dispatchUpdateStateStock(path, action) {
    return async (dispatch) => {
        try {
            console.log(path)
            const stockRef = doc(db, `Inventory/${path[0]}/stock/${path[1]}`);
    
            const Doc = await getDoc(stockRef);
            var updatedData = {
                idInventory: path[0],
                idStock: path[1],
                status: null
            }

            if (Doc.exists()) {
                console.log("Documento actual:", Doc.data());
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

                dispatch(updateStock(updatedData))
                dispatch(formatTableWithFilters(true));
                dispatch(findDetailStock());

            } else {
                console.error("El documento no existe");
            }
        } catch (error) {
            console.error("Error al actualizar el documento:", error);
        }
    }
}

export function dispatchBulkInventory(data, reload = false) {
    return async (dispatch) => {
        var batch = writeBatch(db);
        try {
            if (!data) {
                throw new Error("No hay datos o no son válidos");
            }
            dispatch(dispatchInventoryStart(false));

            for (const item of data) {
                let snapShotInventory = await getInventoryByPartNumber(item.partNumber);
                console.log(item.partNumber)
                console.log(batch._mutations)
                let batchFindInventoryId = batch._mutations.find((doc) => { 
                    if(doc.type == 1){
                        data = doc?.data.value.mapValue.fields;
                    }
                    else if (doc.type == 0) {
                        data = doc?.value.value.mapValue.fields;
                    }
                    let partNumberDocBatch = data.partNumber;
                    if(partNumberDocBatch) { 
                        return partNumberDocBatch.arrayValue.values.find((part) => item.partNumber == part.stringValue);
                    }
                    else {
                        return false
                    }
                });
                console.log(batchFindInventoryId)
    
                if(batchFindInventoryId) batchFindInventoryId = batchFindInventoryId.key.path.segments[1];
                console.log(snapShotInventory)
                let refInventory;
                if (snapShotInventory) {
                    refInventory = snapShotInventory.ref;
                } else if (batchFindInventoryId) {
                    refInventory = doc(db, "Inventory", batchFindInventoryId);
                } else {
                    refInventory = doc(collection(db, "Inventory"));
                    batch = await initTechnicianToSomePart(refInventory, batch);
                }
                console.log(refInventory)
     
                
                batch = await setInventoryPart(refInventory, item, batch);
    
                if (Object.keys(item?.stock || {}).length > 0) {
                    batch = await setStockToSomePart(doc(collection(refInventory, "stock")), item.stock, batch);
                }
                if (Object.keys(item?.technician || {}).length > 0) {
                    //deberia buscar si ya existe ese tecnico antes
                    //LPM
                    const existingTechnicians = await getDocs(collection(refInventory, "technicians"));
                    console.log(item)
                    const technicianExists = (() => {
                        let existingTechniciansInDb = existingTechnicians.docs.find(
                            (doc) => doc.data().csr.toLowerCase() === item.technician.csr.toLowerCase()
                        );
                        let existingTechniciansInBatch = batch._mutations.find(
                            (doc) => {
                                if(doc.type == 1){
                                    data = doc?.data.value.mapValue.fields;
                                }
                                else if (doc.type == 0) {
                                    data = doc?.value.value.mapValue.fields;
                                }
            
                                console.log(doc.key.path.segments)
                                if(doc.key.path.segments[2] === "technicians" && doc.key.path.segments[1] === refInventory.id) {
                                    return data.csr.stringValue.toLowerCase() === item.technician.csr.toLowerCase()
                                }
                                return false
                            }
                        );
                        if(existingTechniciansInDb) existingTechniciansInDb = existingTechniciansInDb;
                        if(existingTechniciansInBatch) existingTechniciansInBatch = doc(db, ...existingTechniciansInBatch.key.path.segments)
                        return existingTechniciansInDb || existingTechniciansInBatch
                    })();
    
                    console.log("Existe: ", technicianExists)
                    if (!technicianExists) {
                        batch = await setTechnicianToSomePart(doc(collection(refInventory, "technicians")), item.technician, batch);
                    }
                    else {
                        batch = await setTechnicianToSomePart(technicianExists.ref ? technicianExists.ref : technicianExists, item.technician, batch, technicianExists.data && technicianExists.data());
                    }
                }    
            }
            console.log(batch._mutations)
            await batch.commit();

            const lastUpdateFlag = doc(db, 'config', 'generalSettings');
            await setDoc(lastUpdateFlag, {lastUpdate: Timestamp.now()});
            //Ya que se procesa el batch, debo de recuperar el lastupdate mas nuevo, para guardarlo en el estado de sync de la db
            if(!reload) {
                let inPart = false;
                let lotStock = [];
                let lotTec = [];
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
                                    stock: [...lotStock],
                                    technicians: [...lotTec]
                                });

                                inPart = false;
                                part = {};
                                lotStock = [];
                                lotTec = [];
                            }
                            else {
                                inPart = true;
                                part.partNumber = data.partNumber.arrayValue.values.map((value) => value.stringValue);
                                
                                //VA A FALTAR RECUPERAR OTROS VALORES COO DESCR SI ES QUE EXISTE Y EL LASTUPDATE
                            }
                        break;
                        case "stock":
                            lotStock.push({
                                id: item.key.path.segments[3],
                                csr: data.csr?.stringValue,
                                name: data.name?.stringValue,
                                quantity: Number(data.quantity.integerValue),
                                status: data.status?.stringValue,
                                note: data.note?.stringValue,
                                lastUpdate: {
                                    seconds: Math.floor(new Date(data.lastUpdate.timestampValue).getTime() / 1000)
                                }
                            });
                        break;
                        case "technicians":
                            lotTec.push({
                                csr: data.csr?.stringValue,
                                name: data.name?.stringValue,
                                onHand: Number(data.onHand.integerValue),
                                ppk: Number(data.ppk.integerValue),
                                lastUpdate: {
                                    seconds: Math.floor(new Date(data.lastUpdate.timestampValue).getTime() / 1000)
                                }
                                //FALTA PONER EL LASTUPDATE
                            });
                        break;
                    }
                });
                formatData.push({
                    ...part,
                    stock: [...lotStock],
                    technician: [...lotTec],
                });
                console.log(formatData)
                dispatch(dispatchInventorySuccess(formatData));
                dispatch(formatTableWithFilters(true));
                dispatch(findDetailStock());
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
            const inventoryCollectionRef = collection(db, "Inventory");
            var inventoryQuery;
            const lastUpdateTimestamp = localStorage.getItem('session');
            var updateMostNew = lastUpdateTimestamp || new Date(0);
            let storedData = JSON.parse(localStorage.getItem('db')) || [];
            if (lastUpdateTimestamp && storedData !== []) {
                // Si lastUpdateTimestamp es válido, hacer la consulta con el filtro
                console.log(Timestamp.fromDate(new Date(lastUpdateTimestamp)))
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
                    console.log(inventoryDoc)
                    const inventoryData = {
                        id: inventoryDoc.id,
                        partNumber: inventoryDoc.data().partNumber,
                        description: inventoryDoc.data().description,
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
            var issue = false;
            item.stock.detail.forEach(op => {
                op.status === 'ISSUE' && (issue = true);
            });
            return {
                id: item.id,
                partNumber: item.partNumber,
                description: item.description,
                stock: Object.values(item.stock.total).reduce((sum, value) => sum += value, 0) || 0,
                ppk: item.technicians.reduce((sum, value) => sum += value.ppk, 0) || 0,
                onHand: item.technicians.reduce((sum, value) => sum += value.onHand, 0) || 0,
                nodes: item.technicians
                .filter((node) => {
                    // Filtrar nodos donde ppk, onHand y stock no sean todos 0
                    return !(node.ppk === 0 && node.onHand === 0 && (item.stock.total[node.csr] || 0) === 0);
                })
                .map((node) => {
                    return {
                        id: node.id,
                        partNumber: [],
                        description: node.name,
                        ppk: node.ppk,
                        onHand: node.onHand,
                        stock: item.stock.total[node.csr] || 0
                    };
                })
                .sort((a, b) => {
                    // Ordenar alfabéticamente por description
                    return a.description.localeCompare(b.description);
                }),
                issue: issue
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