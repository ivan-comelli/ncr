import { collection, writeBatch, doc, getDocs, getDoc, setDoc, query, where, Timestamp, or } from "firebase/firestore";
import { db } from './firebase';
const options = [
    { name: "Diego Molina", csr: "AR103S42" },
    { name: "Nahuel DeLuca", csr: "AR103S44" },
    { name: "Adrian Santarelli", csr: "AR103S45" },
    { name: "Juan Valenzuela", csr: "AR903S49" },
    { name: "Ivan Comelli", csr: "AR903S48" }
  ];

export async function getInventoryByCatalog(catalogId) {
    const inventoryCollectionRef = collection(db, "Inventory");
    let inventoryDoc = null;
    try {
        const q = query(inventoryCollectionRef, where("catalogId", "==", catalogId));
        const allDocs = await getDocs(q);
        if (!allDocs.empty) {
            inventoryDoc = allDocs.docs[0];
            console.log(`Catalog Id To Search is ${catalogId} Exist ${inventoryDoc.id}`);

        } else if(allDocs.size > 1) {
            throw new Error("Hay mas de una coincidencia"); 
        }
        else {
            console.log('Not find coincidence')
        }
    } catch(error) {
        console.error("Error al procesar el documento: " + error.message);
        throw new Error("Error al procesar el documento: " + error.message); 
    }
    return inventoryDoc;
}

export async function setInventoryPart(refInventory, newInventory, batch) {
    try {
        if(!refInventory) {
            throw new Error("No hay referencia para actualizar");
        }
        
        console.log(`Set Part in Inventory ${refInventory.id} of Catalog ${newInventory.id}`);

        batch.set(refInventory, {
            catalogId: newInventory.id,
            ...(newInventory.reWork !== undefined && { reWork: newInventory.reWork }),
            ...(newInventory.cost !== undefined && { cost: newInventory.cost }),
            priority: newInventory.priority || 'LOW',
            lastUpdate: Timestamp.now()
        }, { merge: true });
       
    } catch(error) {
        throw new Error("No se pudo agregar la parte: " + error.message);
    }
    return batch;
}

/*
export async function setCategoryOfInventoryPart(partNumber, newCategory) {
    try {
        // Obtener el documento
        const inventoryDoc = await getInventoryByPartCatalog(partNumber);
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
}*/

export async function setPriorityOfInventoryPart(idInventory, newPriority) {
    try {
        console.log(`Id to Ref is: ${idInventory}`)
        const refInventory = doc(db, "Inventory", idInventory);

        // Actualizar directamente con setDoc
        await setDoc(refInventory, {
            priority: newPriority,
            lastUpdate: Timestamp.now()
        }, { merge: true });
        console.info("Prioridad actualizada correctamente.");

        return idInventory
    } catch (error) {
        throw new Error("No se pudo actualizar la prioridad: " + error.message);
    }
}
