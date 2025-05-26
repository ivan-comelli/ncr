import TYPES from '../../types'

//Este no hace absolutamente nada
export const setStock = ({ idPartRef, idStock, newStatus }) => ({ 
    type: TYPES.SET_STOCK, 
    payload: [
        {
            id: idPartRef,
            stock:[
                {
                    id: idStock, 
                    status: newStatus
                }
            ]
        }
    ] 
});

//Actualiza el estado: Inventory -> Table, que es el modelo formateado para renderizar Main Table Inventory
export const setTable = (value) => ({ 
    type: TYPES.SET_TABLE, 
    dataTable: value 
});

//Actualiza las categorias de partes en el inventario
export const setCategory = ({ idPartRef, newCategory }) => ({
    type: TYPES.SET_CATEGORY,
    dataItem: {
        id: idPartRef,
        name: newCategory
    }
});

//Actualiza las jerarquia de partes en el inventario
export const setPriority = ({ idPartRef, newPriority }) => ({
    type: TYPES.SET_PRIORITY,
    dataItem: {
        id: idPartRef,
        name: newPriority
    }
})

