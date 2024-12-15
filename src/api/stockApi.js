import { collection, writeBatch, doc, getDocs, getDoc, setDoc, query, where, Timestamp, or } from "firebase/firestore";
import { db } from './firebase';
const options = [
    { name: "Diego Molina", csr: "AR103S42" },
    { name: "Nahuel DeLuca", csr: "AR103S44" },
    { name: "Adrian Santarelli", csr: "AR103S45" },
    { name: "Juan Valenzuela", csr: "AR903S49" },
    { name: "Ivan Comelli", csr: "AR903S48" }
  ];

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

export async function setStockToSomePart(refStock, newStock, batch) {
    if(!batch) {
        batch = writeBatch(db);
    }
    try {
        if(!refStock) {
            throw new Error("No hay referencia para actualizar");
        }
        batch.set(refStock, {
            name: options.find(option => option.csr.toLowerCase() == (newStock.csr && newStock.csr.toLowerCase())).name || "any",
            csr: newStock.csr ? newStock.csr.toLowerCase() : "any",
            quantity: newStock.quantity || 0,
            lastUpdate: Timestamp.now()

        });
    } catch(error) {
        throw new Error("No se pudo agregar el stock: " + error.message);
    }
    return batch;
}

