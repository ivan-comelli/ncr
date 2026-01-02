export interface InventoryCSV {
    partNumber: string;              // siempre presente, padded a 10
    description?: string;
    reWork?: boolean;
    cost?: number;

    technician?: TechnicianInfo;

    type?: FormatCSV;
}

export interface TechnicianInfo {
    csr?: string;
    name?: string;
    onHand?: number;
    ppk?: number;
    createdAt?: string | Date;
}

export type FormatCSV = 'PPK' | 'OH';