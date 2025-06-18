import { collection, writeBatch, doc, getDocs, getDoc, setDoc, Timestamp, updateDoc } from "firebase/firestore";
import { db } from '../../../api/firebase';
import { getInventoryByPartNumber, setInventoryPart, setPriorityOfInventoryPart, setCategoryOfInventoryPart } from '../../../api/MainCollectionInventoryApi'
import { setStockToSomePart } from '../../../api/SubCollectionStockApi'
import { setTechnicianToSomePart, initTechnicianToSomePart } from '../../../api/SubCollectionTechnicianApi'

import { 
    dispatchInventoryFailure, 
    dispatchInventorySuccess, 
    dispatchInventoryStart, 
    setStepLoader,
    updatePriority,
    updateCategory
} from '../sync';

export function dispatchBulkInventory(data) {
    console.groupCollapsed("Start Dispatch in Bulk Invetory Parts...");
    return async (dispatch) => {
        var batch = writeBatch(db);
        let loadingProgress = 0;
        try {
            if (!data) {
                throw new Error("No hay datos o no son válidos");
            }
            dispatch(dispatchInventoryStart(false));
            let index = 1;
            const length = data.length;
            console.group(`Exist ${length} Registers to Process`);
            for (const item of data) {
                console.groupCollapsed(`Iteration: ${index}`);
                console.groupCollapsed(`Item of New Part to Input`);
                console.debug(item);
                loadingProgress = (index / length) * 100;
                index += 1;
                let snapShotInventory = await getInventoryByPartNumber(item.partNumber);
                console.info(`Response of Get Inventory By Part Number`);
                console.debug(snapShotInventory);

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

                if(batchFindInventoryId) batchFindInventoryId = batchFindInventoryId.key.path.segments[1];
                console.log(`Is ${batchFindInventoryId ? 'ID: ' + batchFindInventoryId : 'Not'} Find Repeat PartNumber In Batch`)

                let refInventory;

                console.info('Option For Capture Document Reference Is:')
                if (snapShotInventory) {
                    console.info('With SnapShot');
                    refInventory = snapShotInventory.ref;
                } else if (batchFindInventoryId) {
                    console.info('With Batch Coincidence');
                    refInventory = doc(db, "Inventory", batchFindInventoryId);
                } else {
                    console.info('With Create a New Document');
                    refInventory = doc(collection(db, "Inventory"));
                    console.groupCollapsed('Initialized Technician for Part Emty');
                    batch = await initTechnicianToSomePart(refInventory, batch);
                    console.groupEnd();
                }
                console.groupEnd();
                console.groupCollapsed('Setter Inventory Part All Batch');
                batch = await setInventoryPart(refInventory, item, batch);
                console.log(batch);
                console.groupEnd();
                
                if (Object.keys(item?.stock || {}).length > 0) {
                    console.groupCollapsed('Setter Stock in Inventory Parts');
                    batch = await setStockToSomePart(doc(collection(refInventory, "stock")), item.stock, batch);
                    console.groupEnd();
                }
                
                if (Object.keys(item?.technician || {}).length > 0) {
                    console.groupCollapsed('Verify If Exist Action in Inventory For Same Part');
                    //deberia buscar si ya existe ese tecnico antes
                    const getTechniciansOfPart = await getDocs(collection(refInventory, "technicians"));
                    const technicianExists = (() => {
                        let existingTechniciansInDb = getTechniciansOfPart.docs.find(
                            (doc) => doc.data().csr.toLowerCase() === item.technician.csr.toLowerCase()
                        );
                        let existingTechniciansInBatch = batch._mutations.find(
                            (doc, index) => {
                                console.groupCollapsed(`Iteracion Batch Doc ${index}`);
                                let isCoincident = false;
                                if(doc.type == 1){
                                    data = doc?.data.value.mapValue.fields;
                                }
                                else if (doc.type == 0) {
                                    data = doc?.value.value.mapValue.fields;
                                }
                                console.log('Data in Batch');
                                console.log(data);
                                if(doc.key.path.segments[2] === "technicians" && doc.key.path.segments[1] === refInventory.id) {
                                    isCoincident = data.csr.stringValue.toLowerCase() === item.technician.csr.toLowerCase();
                                }
                                console.log(`Technician Muted is ${isCoincident}`);
                                console.groupEnd();
                                return isCoincident;
                            }
                        );
                        if(existingTechniciansInDb) console.log('Exist in DataBase');
                        if(existingTechniciansInBatch) {
                            existingTechniciansInBatch = doc(db, ...existingTechniciansInBatch.key.path.segments);
                            console.log('Exist in Batch');
                        }
                        console.log('Response is: ');
                        console.log(existingTechniciansInDb || existingTechniciansInBatch);
                        console.groupEnd();
                        return existingTechniciansInDb || existingTechniciansInBatch;
                    })();
                    if (!technicianExists) {
                        batch = await setTechnicianToSomePart(doc(collection(refInventory, "technicians")), item.technician, batch);
                    }
                    else {
                        batch = await setTechnicianToSomePart(technicianExists.ref ? technicianExists.ref : technicianExists, item.technician, batch, technicianExists.data && technicianExists.data());
                    }
                } 
                dispatch(setStepLoader(Math.floor(loadingProgress))); 

                console.groupEnd();
            }
            console.groupEnd();
            await batch.commit();

            console.groupCollapsed('Formating Batch for Response to Store');
            const lastUpdateFlag = doc(db, 'config', 'generalSettings');
            await setDoc(lastUpdateFlag, {lastUpdate: Timestamp.now()});
            //Ya que se procesa el batch, debo de recuperar el lastupdate mas nuevo, para guardarlo en el estado de sync de la db
            let inPart = false;
            let lotStock = [];
            let lotTec = [];
            let part = {};
            let formatData = [];
            loadingProgress = 0;
            batch._mutations.forEach((item, index) => {
                loadingProgress = ((index + 1) / batch._mutations.length) * 100;
                dispatch(setStepLoader(Math.floor(loadingProgress)));
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
                        if(item.type == 2 && item.key.path.segments[7] == 'stock' ) {
                            //Es elemento borrado
                            lotStock.push({
                                id: item.key.path.segments[8],
                                req: 'DELETE'                            
                            });

                        }
                        else {
                            lotStock.push({
                                id: item.key.path.segments[3],
                                req: "POST",
                                csr: data.csr?.stringValue,
                                name: data.name?.stringValue,
                                quantity: Number(data.quantity.integerValue),
                                status: data.status?.stringValue,
                                note: data.note?.stringValue,
                                lastUpdate: {
                                    seconds: Math.floor(new Date(data.lastUpdate.timestampValue).getTime() / 1000)
                                }
                            });
                        }
                  
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
                dispatch(setStepLoader(loadingProgress)); 
            });
            formatData.push({
                ...part,
                stock: [...lotStock],
                technicians: [...lotTec],
            });
            dispatch(dispatchInventorySuccess(formatData));
            dispatch(setStepLoader(0)); 
            console.groupEnd();
        } catch (error) {
            dispatch(dispatchInventoryFailure(error.message));
            dispatch(setStepLoader(0)); 
            throw error;
        }
    };
    console.groupEnd();
}

export function dispatchUpdatePriority(item) {
    return async (dispatch) => {
        try {
            const response = await setPriorityOfInventoryPart(item.partNumber, item.priority);
            console.log("API response:", response);

            dispatch(updatePriority(response, item.priority));
        } catch (err) {
            console.error("Fallo el seteo", err);
        }
    };
}

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
}

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