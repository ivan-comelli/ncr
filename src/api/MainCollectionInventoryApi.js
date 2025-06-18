import { collection, writeBatch, doc, getDocs, getDoc, setDoc, query, where, Timestamp, or } from "firebase/firestore";
import { db } from './firebase';
const options = [
    { name: "Diego Molina", csr: "AR103S42" },
    { name: "Nahuel DeLuca", csr: "AR103S44" },
    { name: "Adrian Santarelli", csr: "AR103S45" },
    { name: "Juan Valenzuela", csr: "AR903S49" },
    { name: "Ivan Comelli", csr: "AR903S48" }
  ];

export async function getInventoryByPartNumber(partNumber) {
    const inventoryCollectionRef = collection(db, "Inventory");
    let inventoryDoc = null;
    console.log(`PartNumber To Search is ${partNumber}`);
    try {
        if (!Array.isArray(partNumber) || partNumber.length === 0 || partNumber[0] === '') {
            throw new Error("Error 'partNumbers' no es un array válido o está vacío.");
        } 
        const q = query(inventoryCollectionRef, where("partNumber", "array-contains-any", partNumber));
        const allDocs = await getDocs(q);
        if (!allDocs.empty) {
            console.log('Coincidence');
            inventoryDoc = allDocs.docs[0];
        } else if(allDocs.size > 1) {
            throw new Error("Hay mas de una coincidencia"); 
        }
    } catch(error) {
        throw new Error("Error al procesar el documento: " + error.message); 
    }
    return inventoryDoc;
}

export async function setInventoryPart(refInventory, newInventory, batch) {
    const OUT_SYS = "Fuera de Sistema";
    const arrayUnion = (existingArray, valuesToAdd) => {
        return [...new Set([...existingArray, ...valuesToAdd])];
    };

    try {
        console.groupCollapsed(`Set Part in Inventory ${refInventory}`);
        if(!refInventory) {
            throw new Error("No hay referencia para actualizar");
        }
        console.log(`Array of PartNumbers`);
        console.log(arrayUnion);
        console.log(`Description ${newInventory.description}`);
        console.log(`ReWork ${newInventory.reWork}`);
        console.log(`Cost ${newInventory.cost}`);
        const snapInventory = await getDoc(refInventory);
        
        if(snapInventory.data() && snapInventory.data().description == OUT_SYS && newInventory.description) {
            console.log(`Exist Part On Reference But Not Have Description`);
            batch.set(refInventory, {
                partNumber: arrayUnion(snapInventory.data().partNumber, newInventory.partNumber),
                description: newInventory.description || snapInventory.data().description,
                reWork: newInventory.reWork || snapInventory.data().reWork,
                cost: newInventory.cost || snapInventory.data().cost,
                priority: snapInventory.data().priority || 'LOW',
                category: snapInventory.data().category ||  null,
                lastUpdate: Timestamp.now()
            }, 
            { merge: true });
        }
        else if(snapInventory.data() && snapInventory.data().description) {
            console.log(`Exist Part On Reference With Description`);
            batch.set(refInventory, {
                partNumber: arrayUnion(snapInventory.data().partNumber, newInventory.partNumber),
                reWork: newInventory.reWork || snapInventory.data().reWork,
                cost: newInventory.cost || snapInventory.data().cost,
                priority: snapInventory.data().priority || 'LOW',
                category: snapInventory.data().category ||  null,
                lastUpdate: Timestamp.now()
            }, 
            { merge: true });
        }
        else if(!snapInventory.data()){
            console.log(`Not Exist Part On Reference`);
            batch.set(refInventory, {
                partNumber: newInventory.partNumber,
                description: newInventory.description || OUT_SYS,
                reWork: newInventory.reWork,
                cost: newInventory.cost,
                priority: 'LOW',
                category: null,
                lastUpdate: Timestamp.now()
            }, 
            { merge: true });
        }
        console.groupEnd();
       
    } catch(error) {
        throw new Error("No se pudo agregar la parte: " + error.message);
    }
    return batch;
}

export async function setCategoryOfInventoryPart(partNumber, newCategory) {
    try {
        // Obtener el documento
        const inventoryDoc = await getInventoryByPartNumber(partNumber);
        if (!inventoryDoc) {
            throw new Error("No se encontró un documento de inventario para ese partNumber.");
        }

        const refInventory = doc(db, "Inventory", inventoryDoc.id);

        // Actualizar directamente con setDoc
        await setDoc(refInventory, {
            category: newCategory,
            lastUpdate: Timestamp.now()
        }, { merge: true });

        console.info("Categoría actualizada correctamente.");
        return inventoryDoc.id

    } catch (error) {
        throw new Error("No se pudo actualizar la categoría: " + error.message);
    }
}

export async function setPriorityOfInventoryPart(partNumber, newPriority) {
    try {
        // Obtener el documento
        const inventoryDoc = await getInventoryByPartNumber(partNumber);
        if (!inventoryDoc) {
            throw new Error("No se encontró un documento de inventario para ese partNumber.");
        }

        const refInventory = doc(db, "Inventory", inventoryDoc.id);

        // Actualizar directamente con setDoc
        await setDoc(refInventory, {
            priority: newPriority,
            lastUpdate: Timestamp.now()
        }, { merge: true });
        console.info("Prioridad actualizada correctamente.");

        return inventoryDoc.id
    } catch (error) {
        throw new Error("No se pudo actualizar la prioridad: " + error.message);
    }
}
