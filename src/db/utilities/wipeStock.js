import { db } from "../firebase.js"; // Asegúrate de importar tu instancia de Firestore
import { collection, getDocs, deleteDoc, updateDoc, serverTimestamp } from "firebase/firestore";

async function deleteAllStockAndUpdateLastUpdate() {
  try {
    const inventorySnapshot = await getDocs(collection(db, "Inventory"));

    for (const inventoryDoc of inventorySnapshot.docs) {
      const stockRef = collection(inventoryDoc.ref, "stock");
      const stockSnapshot = await getDocs(stockRef);

      for (const stockDoc of stockSnapshot.docs) {
        await deleteDoc(stockDoc.ref);
        console.log(`🗑️ Borrado: Inventory/${inventoryDoc.id}/stock/${stockDoc.id}`);
      }

      // Actualizar el campo lastUpdate
      await updateDoc(inventoryDoc.ref, {
        lastUpdate: serverTimestamp()
      });
      console.log(`✅ lastUpdate actualizado para Inventory/${inventoryDoc.id}`);
    }

    console.log("✔️ Operación completada: stocks eliminados y lastUpdate actualizado.");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Ejecutar la función
deleteAllStockAndUpdateLastUpdate();
