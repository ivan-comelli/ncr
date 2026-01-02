import {
    Firestore,
    DocumentReference,
    WriteBatch,
    Timestamp,
    doc,
    collection,
    getDoc,
    getDocs,
    query,
    where,
    or,
    writeBatch,
    setDoc,
    FirestoreDataConverter,
    QueryDocumentSnapshot,
    SnapshotOptions,
    DocumentData,
    QuerySnapshot
} from "firebase/firestore";

import {
    StockModel,
    TechnicianModel,
    InventoryModel
} from "../types/modelType";

import { StockDTO } from "../types/dtoType";
import { technicianOption } from "../constant";

import { db } from "../db/firebase";

/*
*   Es muy favorable el hecho de que este servicio sea una clase porque hay muchos estados globales que necesito
*   En el constructor debo hacer un fetch de los hash para detectar versiones
*   Tambien consultar la black list de idCatalog ya usados
*/

export class InventoryFirestoreService {
    private batch: WriteBatch;

    constructor() {
        this.batch = writeBatch(db);
    }

    /* ==========================
       Converters (privados)
    ========================== */

    private inventoryConverter: FirestoreDataConverter<InventoryModel> = {
        toFirestore: (data) => data,
        fromFirestore: (snap) => snap.data() as InventoryModel
    };

    private technicianConverter: FirestoreDataConverter<TechnicianModel> = {
        toFirestore: ({ id, ...rest }: TechnicianModel) => rest,
        fromFirestore: (snap, options) => ({
            id: snap.id,
            ...snap.data(options)
        }) as TechnicianModel
    };

    private stockConverter: FirestoreDataConverter<StockDTO> = {
        toFirestore: ({ id, ...rest }: StockModel) => rest,
        fromFirestore: (snap, options) => ({
            id: snap.id,
            ...snap.data(options)
        }) as StockDTO
    };

    /* ==========================
       Inventory
    ========================== */

    async getOrCreateInventoryRef(
        catalogId: string
    ): Promise<DocumentReference<InventoryModel>> {
        const ref = doc(db, "Inventory", catalogId)
            .withConverter(this.inventoryConverter);

        const snap = await getDoc(ref);

        if (!snap.exists()) {
            await this.initTechnicians(ref);
        }

        return ref;
    }

    private async initTechnicians(
        refInventory: DocumentReference<InventoryModel>,
    ): Promise<void> {
        technicianOption.forEach((tec) => {
            const techRef = doc(
                collection(refInventory, "technicians"),
                `${refInventory.id}-${tec.csr.toLowerCase()}`
            );

            this.batch.set(
                techRef,
                { csr: tec.csr.toLowerCase() },
                { merge: true }
            );
        });
    }

    /* ==========================
       Technicians
    ========================== */

    async getTechnicians(
        refInventory: DocumentReference<InventoryModel>,
        csr?: string
    ): Promise<TechnicianModel[]> {
        const colRef = collection(refInventory, "technicians")
            .withConverter(this.technicianConverter);

        let snapshot: QuerySnapshot<TechnicianModel>;

        if (csr) {
            const q = query(colRef, or(where("csr", "==", csr)));
            snapshot = await getDocs(q);

            if (snapshot.size > 1) {
                throw new Error("Hay más de una coincidencia.");
            }
        } else {
            snapshot = await getDocs(colRef);
        }

        return snapshot.docs.map(d => d.data());
    }

    async setTechnician(
        ref: DocumentReference<TechnicianModel>,
        data: Partial<TechnicianModel>,
    ): Promise<void> {
        const { onHand, ppk, ...rest } = data;

        this.batch.set(
            ref,
            {
                ...rest,
                ...(onHand !== undefined && { onHand }),
                ...(ppk !== undefined && { ppk }),
                lastUpdate: Timestamp.now()
            },
            { merge: true }
        );
    }

    /* ==========================
       Stock
    ========================== */

    async getAllStock(
        refInventory: DocumentReference<InventoryModel>
    ): Promise<StockDTO[]> {
        const colRef = collection(refInventory, "stock")
            .withConverter(this.stockConverter);

        const snapshot = await getDocs(colRef);
        return snapshot.docs.map(d => d.data());
    }

    async setStock(
        refStock: DocumentReference<StockModel>,
        data: Partial<StockModel>
    ): Promise<void> {
        const batch = writeBatch(db);

        batch.set(refStock, {
            quantity: data.quantity,
            status: data.status,
            csr: data.csr,
            note: data.note ?? "",
            lastUpdate: Timestamp.now()
        });

        const parentId = refStock.parent?.parent?.id;
        if (parentId) {
            batch.set(
                doc(db, "Inventory", parentId),
                { lastUpdate: Timestamp.now() },
                { merge: true }
            );
        }

        await batch.commit();
    }

    /* ==========================
       Config
    ========================== */

    async updateGeneralSettings(): Promise<void> {
        const ref = doc(db, "config", "generalSettings");
        await setDoc(ref, { lastUpdate: Timestamp.now() });
    }
}
