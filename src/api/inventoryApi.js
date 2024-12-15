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

export async function setInventoryPart(refInventory, newInventory, batch) {
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
        else if(snapInventory.data() && snapInventory.data().description) {
            batch.set(refInventory, {
                partNumber: arrayUnion(snapInventory.data().partNumber, newInventory.partNumber),
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
                partNumber: newInventory.partNumber,
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
