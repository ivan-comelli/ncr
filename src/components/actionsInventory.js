import { collection, writeBatch, doc, getDocs, getDoc, setDoc, query, where, Timestamp, or } from "firebase/firestore";
import { db } from '../firebase';
const options = [
    { name: "Diego Molina", csr: "AR103S42" },
    { name: "Nahuel DeLuca", csr: "AR103S44" },
    { name: "Adrian Santarelli", csr: "AR103S45" },
    { name: "Juan Valenzuela", csr: "AR903S49" },
    { name: "Ivan Comelli", csr: "AR903S48" }
  ];

async function getTechnicianOfSomePart(refInventory, identity) {
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
        response = technicianSnapshot.docs.map(doc => ({
            id: doc.id, // Incluye el ID del documento si es necesario
            ...doc.data() // Extrae los datos del documento
        }));
    } catch(error) {
        throw new Error("No se pudo obtener el tecnico, " + error.message);
    }
    return response;
}

async function setTechnicianToSomePart(refTechnician, newTechnician, batch) {
    //hay que preguntarse si el nuevo tecnico ya existe en la coleccion y actualizar
    try {
        if(!refTechnician) {
            throw new Error("No hay referencia para actualizar");
        }
        batch.set(refTechnician, {
            ...newTechnician,
            csr: newTechnician.csr.toLowerCase(),
            onHand: newTechnician.onHand || 0,
            ppk: newTechnician.ppk || 0,
            lastUpdate: Timestamp.now()
        }, 
        { merge: true });
    } catch(error) {
        throw new Error("No se pudo agregar al tecnico: " + error.message);
    }
    return batch;
}

async function getAllStockOfSomePart(refInventory) {
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
            if(!commonCount[doc.data().csr ? doc.data().csr : "any"]) commonCount[doc.data().csr ? doc.data().csr : "any"] = 0;
            commonCount[doc.data().csr ? doc.data().csr : "any"] += Number(doc.data().quantity);
            balance.push({
                csr: doc.data().csr ? doc.data().csr : "any",
                stock: Number(doc.data().quantity),
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

async function setStockToSomePart(refStock, newStock, batch) {
    if(!batch) {
        batch = writeBatch(db);
    }
    try {
        if(!refStock) {
            throw new Error("No hay referencia para actualizar");
        }
        batch.set(refStock, {
            name: options.find(option => option.csr.toLowerCase() === newStock.csr && newStock.csr.toLowerCase()) || "any",
            csr: newStock.csr ? newStock.csr.toLowerCase() : "any",
            quantity: newStock.quantity || 0,
            lastUpdate: Timestamp.now()

        });
    } catch(error) {
        throw new Error("No se pudo agregar el stock: " + error.message);
    }
    return batch;
}

async function setInventoryPart(refInventory, newInventory, batch) {
    const OUT_SYS = "Fuera de Sistema";
    const arrayUnion = (existingArray, valuesToAdd) => {
        return [...new Set([...existingArray, ...valuesToAdd])];
    };

    try {
        if(!refInventory) {
            throw new Error("No hay referencia para actualizar");
        }

        const snapInventory = await getDoc(refInventory);
        if(snapInventory.data() && snapInventory.data().description == OUT_SYS && newInventory.description) {
            batch.set(refInventory, {
                partNumber: arrayUnion(snapInventory.data().partNumber, newInventory.partNumber),
                description: newInventory.description,
                lastUpdate: Timestamp.now()
            }, 
            { merge: true });
        }
        else if(!snapInventory.data() && !newInventory.description){
            batch.set(refInventory, {
                partNumber: newInventory.partNumber,
                description: OUT_SYS,
                lastUpdate: Timestamp.now()
            }, 
            { merge: true });
        }
        else if (!snapInventory.data() && newInventory.description) {
            batch.set(refInventory, {
                partNumber: snapInventory.data() ? arrayUnion(snapInventory.data().partNumber, newInventory.partNumber) : newInventory.partNumber,
                description: newInventory.description,
                lastUpdate: Timestamp.now()
            }, 
            { merge: true });
        }

       
    } catch(error) {
        throw new Error("No se pudo agregar la parte: " + error.message);
    }
    return batch;
}

async function getInventoryByPartNumber(partNumber) {
    const inventoryCollectionRef = collection(db, "Inventory");
    let inventoryDoc = null;
    try {
        if (!Array.isArray(partNumber) || partNumber.length === 0 || partNumber[0] === '') {
            throw new Error("Error 'partNumbers' no es un array válido o está vacío.");
        } 
        const q = query(inventoryCollectionRef, where("partNumber", "array-contains-any", partNumber));
        const allDocs = await getDocs(q);
        if (!allDocs.empty) {
            inventoryDoc = allDocs.docs[0];
        } else if(allDocs.size > 1) {
            throw new Error("Hay mas de una coincidencia"); 
        }
    } catch(error) {
        throw new Error("Error al procesar el documento: " + error.message); 
    }
    return inventoryDoc;
}

async function setBulkInventory(data) {
    console.log(data)
    let batch = writeBatch(db);
    try {
        for (const item of data) {
            let snapShotInventory = await getInventoryByPartNumber(item.partNumber);
            console.log(item.partNumber)
            console.log(batch._mutations)
            let batchFindInventoryId = batch._mutations.find((doc) => { 
                let partNumberDocBatch = doc.data.value.mapValue.fields.partNumber;
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
            let refInventory = snapShotInventory ? snapShotInventory.ref : batchFindInventoryId ? doc(db, "Inventory", batchFindInventoryId) : doc(collection(db, "Inventory"));
            console.log(refInventory)
 
        
            batch = await setInventoryPart(refInventory, item, batch);

            if (Object.keys(item.stock).length !== 0) {
                batch = await setStockToSomePart(doc(collection(refInventory, "stock")), item.stock, batch);
            }
            if (Object.keys(item.technician).length !== 0) {
                //deberia buscar si ya existe ese tecnico antes
                //LPM
                const existingTechnicians = await getDocs(collection(refInventory, "technicians"));
                const technicianExists = (() => {
                    let existingTechniciansInDb = existingTechnicians.docs.find(
                        (doc) => doc.data().csr.toLowerCase() === item.technician.csr.toLowerCase()
                    );
                    let existingTechniciansInBatch = batch._mutations.find(
                        (doc) => {
                            console.log(doc.key.path.segments)
                            if(doc.key.path.segments[2] == "technicians" && doc.key.path.segments[1] == refInventory.id) {
                                return doc.data.value.mapValue.fields.csr.stringValue.toLowerCase() === item.technician.csr.toLowerCase()
                            }
                            return false
                        }
                    );
                    if(existingTechniciansInDb) existingTechniciansInDb = existingTechniciansInDb.ref;
                    if(existingTechniciansInBatch) existingTechniciansInBatch = doc(db, ...existingTechniciansInBatch.key.path.segments)
                    return existingTechniciansInDb || existingTechniciansInBatch
                })();

                console.log(technicianExists)
                if (!technicianExists) {
                    batch = await setTechnicianToSomePart(doc(collection(refInventory, "technicians")), item.technician, batch);
                }
                else {
                    batch = await setTechnicianToSomePart(technicianExists, item.technician, batch);
                }
            }    
        }
        console.log(batch._mutations)
        await batch.commit();
        const lastUpdateFlag = doc(db, 'config', 'generalSettings');
        await setDoc(lastUpdateFlag, {lastUpdate: Timestamp.now()});
    } catch(error){
        throw new Error(error.message);
    }
}

async function getAllInventory() {
    const lastUpdateFlag = await (await getDoc(doc(db, 'config', 'generalSettings'))).data().lastUpdate.toDate();
    const inventoryCollectionRef = collection(db, "Inventory");
    let response = [];
    try {
        if((localStorage.getItem('db') && lastUpdateFlag > new Date(JSON.parse(localStorage.getItem('db')).lastUpdate) || !localStorage.getItem('db'))) {
            // Obtener todos los documentos de la colección "Inventory"
            const inventorySnapshot = await getDocs(inventoryCollectionRef);

            if (inventorySnapshot.empty) {
                throw new Error("No se encontraron documentos en la colección de inventario.");
            }

            // Procesar documentos concurrentemente
            response = await Promise.all(inventorySnapshot.docs.map(async (inventoryDoc) => {
                const inventoryData = {
                    id: inventoryDoc.id,
                    partNumber: inventoryDoc.data().partNumber,
                    description: inventoryDoc.data().description
                };

                const refInventory = inventoryDoc.ref;

                // Obtener datos de technicians
                let technicians = [];
                try {
                    technicians = await getTechnicianOfSomePart(refInventory);
                } catch (error) {
                    console.error("Error al obtener técnicos:", error.message);
                }

                // Obtener datos de stock
                let stock = [];
                try {
                    stock = await getAllStockOfSomePart(refInventory);
                } catch (error) {
                    console.error("Error al obtener stock:", error.message);
                }

                // Añadir información al inventario
                return {
                    ...inventoryData,
                    technicians,
                    stock
                };
            }));
        }
    } catch (error) {
        throw new Error("Error al obtener el inventario: " + error.message);
    }
    if(response.length > 0) {
        console.log(response)
        console.log(JSON.stringify({data: response, lastUpdate: lastUpdateFlag}))
        localStorage.setItem('db', JSON.stringify({data: response, lastUpdate: lastUpdateFlag}));
    }
    else {
        response = JSON.parse(localStorage.getItem('db')).data;
    }

    return response;
}

async function updateStockWithPart(partNumber, newData) {
    try {
        const inventoryDoc = await getInventoryByPartNumber(partNumber);
        const result = await setStockToSomePart(doc(collection(inventoryDoc.ref, "stock")), { quantity: newData.quantity, csr: newData.csr });
        result.commit();
        const lastUpdateFlag = doc(db, 'config', 'generalSettings');
        await setDoc(lastUpdateFlag, {lastUpdate: Timestamp.now()});
    } catch(error){
        console.error(error.message)
    }
}
async function verifyAndAddMissingTechnicians() {
    const inventoryCollectionRef = collection(db, "Inventory");
    console.log("Iniciando verificación de técnicos...");

    try {
        // Obtener todos los documentos de inventario
        const inventorySnapshot = await getDocs(inventoryCollectionRef);

        if (inventorySnapshot.empty) {
            console.log("No se encontraron documentos en la colección de inventario.");
            return;
        }

        // Procesar cada documento de inventario en paralelo
        const batchOps = inventorySnapshot.docs.map(async (inventoryDoc) => {
            const batch = writeBatch(db);
            const inventoryRef = inventoryDoc.ref;
            const techniciansCollectionRef = collection(inventoryRef, "technicians");

            // Obtener los técnicos existentes
            const techniciansSnapshot = await getDocs(techniciansCollectionRef);
            const existingCsrs = techniciansSnapshot.docs.map(doc => doc.data().csr);

            // Encontrar los técnicos faltantes
            const missingTechnicians = options.filter(option => !existingCsrs.includes(option.csr));

            // Agregar técnicos faltantes al batch
            missingTechnicians.forEach(missingTech => {
                const newTechnicianRef = doc(techniciansCollectionRef);
                batch.set(newTechnicianRef, {
                    csr: missingTech.csr,
                    name: missingTech.name,
                    onHand: 0,
                    ppk: 0,
                    createdAt: Timestamp.now(),
                    lastUpdate: Timestamp.now()
                });
            });

            // Ejecutar el batch para este inventario
            await batch.commit();
        });

        // Esperar a que todas las operaciones de batch terminen
        await Promise.all(batchOps);

        console.log("Se completó la verificación y actualización de técnicos faltantes.");
    } catch (error) {
        console.error("Error al verificar y agregar técnicos faltantes:", error.message);
    }
}


export {setBulkInventory, getAllInventory, updateStockWithPart, verifyAndAddMissingTechnicians};