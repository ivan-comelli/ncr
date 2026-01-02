
import dbData from '../db/output.json';
import { FormatCSV, InventoryCSV } from '../types/csvInventoryType';
import { InventoryDTO, TechnicianDTO } from '../types/dtoType';


/*
*   Este modulo resuelve la validacion, calculo y formateo de los objetos para distintos fines.
*   Desde DTO a ViewModels
*   Por lo menos donde estamos trabajando tengo que crear hash para evitar excesivos cambios en base de datos, por repeticiones.
*   Y mejorar la logica del Catalogo DB que requiere de un refactory.
*/

async function processInventoryData(
    inventoryData: InventoryCSV[],
): Promise<{ inventoryDTO: InventoryDTO[], techniciansDTO: TechnicianDTO[] }> {
    let inventoryDTO: InventoryDTO[] = [];
    let techniciansDTO: TechnicianDTO[] = [];
    for (const item of inventoryData) {
        let catalogId;
        const matchDB = dbData.find(ref =>
            ref.pn.some(pn => item.partNumber.includes(pn))
        );
        if (!matchDB) {
            catalogId = item.partNumber;
        }
        else {
            catalogId = matchDB.id;
        }

        inventoryDTO.push({
            id: catalogId,
            partNumber: 
        });

        techniciansDTO.push({
            id: `${catalogId}-${item.technician.csr.toLowerCase()}`,

        });
    }
    return { inventoryDTO, techniciansDTO };
}
