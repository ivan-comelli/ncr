import {
    Timestamp,
} from "firebase/firestore";

export interface StockModel {
    id?: string;
    csr: string;
    quantity: number;
    status: string;
    note?: string;
    lastUpdate: Timestamp
}

export interface TechnicianModel {
    id?: string;
    csr: string;
    ppk: number;
    onHand: number;
    order: number;
    lastUpdate: Timestamp
}

export interface InventoryModel {
    id?: string;
    partNumber: string[];
    name: string;
    cost: number;
    lastUpdate: Timestamp
}