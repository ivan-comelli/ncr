import { collection, writeBatch, doc, getDocs, getDoc, setDoc, Timestamp, updateDoc, where, query, or } from "firebase/firestore";
import { db } from '../../../db/firebase';
import { 
    fetchInventoryFailure, 
    fetchInventorySuccess, 
    fetchInventoryStart,
    searchInDataTable,
    isolatePartInTable,
} from '../sync';

export * from './dispatch';

let timer;

const STATUS = {
    PENDIENT: "PENDIENT",
    FAILED: "FAILED",
    ADJUST: "ADJUST",
    DONE: "DONE",
    SYNC: "SYNC",
    ISSUE: "ISSUE"
  }
  




//Aca hay logica de servicio que tengo que migrar, pero si es un action
export function fetchAllInventory() {
  return async (dispatch) => {
    try {
      dispatch(fetchInventoryStart());

      const inventoryCollectionRef = collection(db, "Inventory");
      const lastUpdateTimestamp = localStorage.getItem('session');
      let updateMostNew = lastUpdateTimestamp || new Date(0);
      let storedData = JSON.parse(localStorage.getItem('db')) || [];
      console.log(lastUpdateTimestamp)
      const inventoryQuery = lastUpdateTimestamp
        ? query(
            inventoryCollectionRef,
            where("lastUpdate", ">", Timestamp.fromDate(new Date(lastUpdateTimestamp)))
          )
        : inventoryCollectionRef;

      const inventorySnapshot = await getDocs(inventoryQuery);

      if (inventorySnapshot.empty) {
        console.log('No new updates.');
        dispatch(fetchInventorySuccess(storedData));
        return;
      }

      await Promise.all(
        inventorySnapshot.docs.map(async (inventoryDoc) => {
            try {
                const data = inventoryDoc.data();
                console.log(data)
                const inventoryData = {
                id: inventoryDoc.id,
                cost: Number(data.cost),
                reWork: data.reWork,
                priority: data.priority,
                };

                const docUpdateDate = data.lastUpdate.toDate();
                if (new Date(docUpdateDate) > new Date(updateMostNew)) {
                updateMostNew = docUpdateDate;
                }

                const refInventory = inventoryDoc.ref;
                const technicians = await getTechnicianOfSomePart(refInventory);
                const stock = await getAllStockOfSomePart(refInventory);

                const index = storedData.findIndex(
                (existingItem) => existingItem.id === inventoryDoc.id
                );

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
            } catch (error) {
                console.error(`Error processing ${inventoryDoc.id}: ${error.message}`);
            }
        })
      );      
      localStorage.setItem('db', JSON.stringify(storedData));
      localStorage.setItem('session', updateMostNew);
      dispatch(fetchInventorySuccess(storedData));
    } catch (error) {
      dispatch(fetchInventoryFailure(error.message));
      console.error(error);
    }
  };
}


export function lazySearch(value) {
    return ((dispatch) => {
        clearTimeout(timer); // Limpia el timeout si el usuario sigue escribiendo
        timer = setTimeout(() => {
            dispatch(searchInDataTable(value)); // Cambia el estado final después del debounce
            if (value == '') {
                dispatch(isolatePartInTable(null));
            }
        }, 1000); // Ventana de 1 segundo
    })
}