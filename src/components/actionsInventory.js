import { collection, writeBatch, doc, getDocs, getDoc, query, where, Timestamp, or } from "firebase/firestore";
import { db } from '../firebase';

async function getTechnicianOfSomePart(refInventory, identity) {
    let response = null;
    try {
        if(!refInventory) {
            throw new Error("No hay referencia de la parte para actualizar");
        }
        const technicianCollectionRef = collection(refInventory, "technicians");
        const qTechnician = query(technicianCollectionRef, or(where("csr", "==", identity.csr), where("name", "==", identity.name)));
        const technicianSnapshot = await getDocs(qTechnician);
        if (technicianSnapshot.size > 1) {
            throw new Error("Hay mas de una coincidencia.");
        }
        response = technicianSnapshot.docs[0];
    } catch(error) {
        throw new Error("No se pudo obtener el tecnico, " + error.message);
    }
    return response;
}

async function setTechnicianToSomePart(refTechnician, newTechnician, batch) {
    try {
        if(!refTechnician) {
            throw new Error("No hay referencia para actualizar");
        }
        batch.set(refTechnician, {
            ...newTechnician,
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
    let response = null;
    try {
        if(!refInventory) {
            throw new Error("No hay referencia de la parte para actualizar");
        }
        const stockCollectionRef = collection(refInventory, "stock");
        const stockSnapshot = await getDocs(stockCollectionRef);
        if (stockSnapshot.empty) {
            throw new Error("No hay registro para esta parte.");
        }
        response = () => {
            let balance = [] 
            stockSnapshot.docs.forEach((doc) => {
                let commonCount = balance.find((item) => item.csr == doc.csr);
                if(commonCount) {
                    commonCount.stock += doc.stock;
                }
                else {
                    balance.push({
                        csr: doc.csr,
                        stock: doc.quantity,
                        lastUpdate: doc.lastUpdate
                    });
                }
            });
            let totalStock = balance.reduce((sum, item) => sum + item.stock, 0);
            return {
                total: totalStock,
                detail: balance
            };
        }
    } catch(error) {
        throw new Error("No se pudo obtener el stock, " + error.message);
    }
    return response;
}

async function setStockToSomePart(refStock, newStock, batch) {
    try {
        if(!refStock) {
            throw new Error("No hay referencia para actualizar");
        }
        batch.set(refStock, {
            ...newStock,
            quantity: newStock.quantity || 0,
            lastUpdate: Timestamp.now()

        }, 
        { merge: true });
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
        else {
            batch.set(refInventory, {
                partNumber: snapInventory.data() ? arrayUnion(snapInventory.data().partNumber, newInventory.partNumber) : newInventory.partNumber,
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
            console.log(snapShotInventory)
            let refInventory = snapShotInventory && snapShotInventory.ref;
            console.log(refInventory)

            if (!refInventory) {
                console.log("entre")
                refInventory = doc(collection(db, "Inventory")); 
            }
        
            batch = await setInventoryPart(refInventory, item, batch);

            if (Object.keys(item.stock).length !== 0) {
                batch = await setStockToSomePart(doc(collection(refInventory, "stock")), item.stock, batch);
            }
            if (Object.keys(item.technician).length !== 0) {
                batch = await setTechnicianToSomePart(refInventory, item.technician, batch);
            }    
        }
        console.log(batch)
        batch.commit();
    } catch(error){
        throw new Error(error.message);
    }
}

export default setBulkInventory;