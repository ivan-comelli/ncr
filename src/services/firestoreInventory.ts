import {
    writeBatch,
    DocumentReference,
    Timestamp,
    doc,
    Firestore,
    WriteBatch,
    collection,
    QueryDocumentSnapshot,
    FirestoreDataConverter,
    DocumentSnapshot,
    DocumentData,
    getDoc,
    setDoc,
    query,
    getDocs,
    or,
    where,
    SnapshotOptions,
    CollectionReference,
    QuerySnapshot
} from "firebase/firestore";

import { db } from '../db/firebase';
import { StockModel, TechnicianModel, InventoryModel } from "../types";
import { technicianOption, TechnicianOption } from "../constant";

export const inventoryConverter: FirestoreDataConverter<InventoryModel> = {
    toFirestore(data: InventoryModel): DocumentData {
        return data;
    },

    fromFirestore(snapshot: QueryDocumentSnapshot): InventoryModel {
        return snapshot.data() as InventoryModel;
    }
};

export const technicianConverter: FirestoreDataConverter<TechnicianModel> = {
    toFirestore(data: TechnicianModel): DocumentData {
        const { id, ...rest } = data; // evitamos guardar id en Firestore
        return rest;
    },

    fromFirestore(
        snapshot: QueryDocumentSnapshot,
        options: SnapshotOptions
    ): TechnicianModel {
        const data = snapshot.data(options);
        return {
            id: snapshot.id,   // acá recuperamos el id real del documento
            ...data
        } as TechnicianModel;
    }
};

/**
 * Los Document Reference, deberian tener el generico seteado y las interfaces de los modelos DB creados de forma correspondiente.
 * Reevaluar como se gestionan las banderas de cambio de estado en la base de datos. Por el sistema de Sync eficiente.
 */


/**
 * Primitivamente esta funcion permite setear los imbalances entre el onHand y el stock fisico.
 * El onHand va ser calculado por las diferencias detectadas entre sincronizacion y estado onHand registradas en la coleccion stock.
 * Debo setear a que tecnico corresponde.
 * Debo resguardar que numero de parte tiene en el legajo.
 * Cada cierta cantidad de tiempo se unifican registros para liberar espacio, como tambien se descargan los detalles para analisis de datos.
 */

export async function setStockToSomePart(
    refStock: DocumentReference<StockModel>,
    newStock: Partial<StockModel>,
    db: Firestore
): Promise<WriteBatch> {
    const batch = writeBatch(db);

    try {
        // Set del stock interno
        batch.set(refStock, {
            quantity: newStock.quantity,
            status: newStock.status,
            csr: newStock.csr,
            note: newStock.note ?? "",
            lastUpdate: Timestamp.now(),
        });

        // Acceso al documento padre (Inventory > item)
        const parentId = refStock.parent?.parent?.id;
        if (parentId) {
            const parentRef = doc(db, "Inventory", parentId);
            batch.set(parentRef, { lastUpdate: Timestamp.now() }, { merge: true });
        }
    } catch (error: any) {
        throw new Error("No se pudo agregar el stock: " + error.message);
    }

    await batch.commit();
    return batch;
}

/**
 * Se Inicializa intanciando todos los tecnicos del equipo, para evitar huecos en las estructura de datos cuando se crea un nuevo documento en inventory.
 */

export async function initTechnicianToSomePart(
    refInventory: DocumentReference<InventoryModel>,
    batch: WriteBatch,
): Promise<WriteBatch> {
    try {
        console.log(`Initialization technician of inventory ${refInventory.id}:`);

        technicianOption.forEach((tec) => {
            const docTech = doc(
                collection(refInventory, "technicians"),
                `${refInventory.id}-${tec.csr.toLowerCase()}`
            );

            console.log(`Init ${tec.name} in ${docTech.id}`);

            batch.set(
                docTech,
                {
                    csr: tec.csr.toLowerCase(),
                },
                { merge: true }
            );
        });
    } catch (e) {
        console.error(e);
    }

    return batch;
}

/**
 * Sencillamente setea los cambios sobre documentos de la coleccion de tecnicos, el unico problema es que se prevee la posibilidad de guardar datos precalculados que tengo que tener en cuenta.
 */

export async function setTechnicianToSomePart(
    refTechnician: DocumentReference<TechnicianModel>,
    newTechnician: Partial<TechnicianModel>,
    batch: WriteBatch
): Promise<WriteBatch> {
    if (!refTechnician) {
        throw new Error("Referencia inválida para actualizar");
    }

    try {
        console.log(
            `Setting tech ${newTechnician.csr?.toLowerCase()} in reference ${refTechnician.id} for ${newTechnician.ppk}`
        );

        const { onHand, ppk, ...rest } = newTechnician;

        const dataToSet: Partial<TechnicianModel> = {
            ...rest,
            ...(onHand !== undefined && { onHand }),
            ...(ppk !== undefined && { ppk }),
            lastUpdate: Timestamp.now(),
        };

        batch.set(refTechnician, dataToSet, { merge: true });

        return batch;
    } catch (error: any) {
        throw new Error("No se pudo agregar al tecnico: " + error.message);
    }
}

/**
 * Simplemente si no existe un documento con el identificador, se crea una referencia al mismo
 */

export async function getOrCreateInventoryRef(
    batch: WriteBatch,
    catalogId: string,
): Promise<DocumentReference> {
    try {
        const ref = doc(db, "Inventory", catalogId).withConverter(inventoryConverter);
        const snap: DocumentSnapshot<InventoryModel> = await getDoc(ref);
        if (!snap.exists()) {
            await initTechnicianToSomePart(ref, batch);
        }
        return ref;
    } catch (error: any) {
        console.error(`[inventory-error] ${error.message}`);
        throw {
            code: "inventory-error",
            message: error.message || "Error inesperado al preparar el inventario"
        };
    }
}

/**
 * Queda pendiente a revision el funionamiento de la logica para syncronizar eficientemente las base de datos locales
 */

export async function updateGeneralSettings(batch) {
    await batch.commit();
    const lastUpdateFlag = doc(db, 'config', 'generalSettings');
    await setDoc(lastUpdateFlag, { lastUpdate: Timestamp.now() });
}

/**
 * Esta funcion devuelve los tecnicos de una parte especifica del inventario.
 */

export async function getTechnicianOfSomePart(
    refInventory: DocumentReference<InventoryModel>,
    csr?: string
): Promise<Array<TechnicianModel>> {

    if (!refInventory) {
        throw new Error("No hay referencia de la parte para actualizar");
    }

    const technicianCollectionRef: CollectionReference<TechnicianModel> =
        collection(refInventory, "technicians").withConverter(technicianConverter);

    let technicianSnapshot: QuerySnapshot<TechnicianModel>;

    if (csr) {
        const qTechnician = query(
            technicianCollectionRef,
            or(
                where("csr", "==", csr),
            )
        );
        technicianSnapshot = await getDocs(qTechnician);
    } else {
        technicianSnapshot = await getDocs(technicianCollectionRef);
    }

    if (technicianSnapshot.size > 1 && csr) {
        throw new Error("Hay mas de una coincidencia.");
    }

    return technicianSnapshot.docs.map(d => d.data());
}

export async function getAllStockOfSomePart(refInventory: DocumentReference) {
    //Aqui se debe calcular la sumatoria por cada CSR presente y la total de todas
    try {
        if(!refInventory) {
            throw new Error("No hay referencia de la parte para actualizar");
        }
        const stockCollectionRef = collection(refInventory, "stock");
        const stockSnapshot = await getDocs(stockCollectionRef);
        if (stockSnapshot.empty) {
            return {
                total: 0,
                detail: []
            };
        }
        let balance = [];
        let commonCount = 0;
        stockSnapshot.docs.forEach((doc) => {
            switch (doc.data().status) {
                case STATUS.PENDIENT:
                     commonCount = commonCount + Number(doc.data().quantity);
                break;
                case STATUS.FAILED:
                    commonCount = commonCount + 0;
                break;
                case STATUS.SYNC:
                     commonCount = commonCount + Number(doc.data().quantity);
                break;
                case STATUS.ADJUST:
                     commonCount = commonCount + Number(doc.data().quantity);
                break;
                case STATUS.ISSUE:
                     commonCount = commonCount + Number(doc.data().quantity);
                break;
                case STATUS.DONE:
                     commonCount = commonCount + 0;
                break;
                default:
                     commonCount = commonCount + Number(doc.data().quantity);
                break;        
            }
            balance.push({
                id: doc.id,
                stock: Number(doc.data().quantity),
                status: doc.data().status,
                note: doc.data().note,
                lastUpdate: doc.data().lastUpdate,
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
