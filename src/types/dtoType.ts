import {
    Timestamp,
} from "firebase/firestore";

export interface StockDTO {
    id?: string;
    csr: string;
    quantity: number;
    status: string;
    note?: string;
    lastUpdate: Timestamp
}

export interface TechnicianDTO {
    id?: string;
    csr: string;
    ppk: number;
    onHand: number;
    order: number;
    lastUpdate: Timestamp
}

export interface InventoryDTO {
    id?: string;
    partNumber: string[];
    name: string;
    cost: number;
    lastUpdate: Timestamp
}