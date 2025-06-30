import { format } from 'path-browserify';
import TYPES from './types';
import dbData from '../db/output.json';

//EL REDUCER NO CONTEMPLA SI LA NUEVA DATA A MERGER ESTA CON ITEMS REPETIDOS, APLICA CAMBIOS CON LA PRIMERA COINCIDENCIA, LAS DEMAS SE IGNORAN

const options = [
    { name: "Diego Molina", csr: "AR103S42" },
    { name: "Nahuel DeLuca", csr: "AR103S44" },
    { name: "Adrian Santarelli", csr: "AR103S45" },
    { name: "Juan Valenzuela", csr: "AR103S46" },
    { name: "Ivan Comelli", csr: "AR903S48" }
];

const STATUS = {
    PENDIENT: "PENDIENT",
    FAILED: "FAILED",
    ADJUST: "ADJUST",
    DONE: "DONE",
    SYNC: "SYNC",
    ISSUE: "ISSUE"
}
//Destaco que el stepLoading se activa cuando su valor es mayor a 0
const initialStateInventory = {
    stepLoading: 0,
    nativeData: [],
    dataTable: [],
    renderTable: [],
    overView: {
        active: false,
        data: null   
    },
    isolated: null,
    filters: {
        search: '',
        status: {
            values: ["Conflicto"],
            key: null
        },
        category: {
            values: ['S1', 'S2', 'BNA3', 'SCPM', 'SRU', 'GBRU', 'BRM', 'CPU', 'OTROS', 'LECTORAS', 'SOBRES', 'PRINTERS'],
            key: []
        },
        priority: {
            values: ["LOW", "MID", "HIGH", "ALL"],
            key: 3
        },
        reWork: {
            values: ["Non Rework", "Rework", "All"],
            key: 2
        }
    }
};

const mergeDataTable = (newData, data) => {
    console.groupCollapsed(`MergeData`);

    let oldData = structuredClone(data);
    let result = [];

    if (oldData.length === 0) {
        oldData = newData.map(item => ({
            ...item,
            stock: { detail: [], total: {} }
        }));
    }

    result = oldData.map(item => {
        const existingItem = newData.find(dataItem => item.id === dataItem.id);

        // Asegurar estructura mínima
        const stockDetail = Array.isArray(item.stock?.detail) ? [...item.stock.detail] : [];
        const stockTotal = item.stock?.total ? { ...item.stock.total } : {};

        let updatedTechnicians = item.technicians;
        if (existingItem) {
            // Actualizar técnicos
            updatedTechnicians = item.technicians.map(technician => {
                const matchingTechnician = existingItem.technicians?.find(tec => tec.csr === technician.csr);
                return matchingTechnician ? {
                    ...technician,
                    onHand: matchingTechnician.onHand || 0,
                    ppk: matchingTechnician.ppk || 0,
                    createdAt: matchingTechnician.createdAt || technician.createdAt,
                } : technician;
            });

            // Actualizar stock
            existingItem.stock?.forEach(newStock => {
                const csrKey = (newStock.csr || '').toLowerCase();
                const existingOpIndex = stockDetail.findIndex(item => item.id === newStock.id);
                const existStockOp = existingOpIndex !== -1 ? stockDetail[existingOpIndex] : null;

                // Eliminar stock si se marca como DELETE
                if (newStock.req === 'DELETE') {
                    if (existStockOp) {
                        stockDetail.splice(existingOpIndex, 1);
                        const quantity = Number(existStockOp.stock);
                        stockTotal[csrKey] = (stockTotal[csrKey] || 0) - quantity;
                    }
                    return;
                }

                // Crear objeto mergeado
                const mergedStock = {
                    id: newStock.id ?? existStockOp?.id,
                    csr: csrKey,
                    name: newStock.name ?? existStockOp?.name,
                    status: newStock.status ?? existStockOp?.status,
                    lastUpdate: newStock.lastUpdate ?? existStockOp?.lastUpdate,
                    stock: newStock.quantity != null ? Number(newStock.quantity) : existStockOp?.stock || 0,
                };

                // Reemplazar o insertar en stock.detail
                if (existStockOp) {
                    stockDetail[existingOpIndex] = mergedStock;
                } else {
                    stockDetail.push(mergedStock);
                }

                // Calcular cantidad a sumar
                stockTotal[csrKey] = (stockTotal[csrKey] || 0) + mergedStock.stock;
            });

            // Eliminar el ítem procesado de newData para evitar duplicados
            newData = newData.filter(dataItem => dataItem.id !== existingItem.id);

            return {
                ...item,
                stock: {
                    detail: stockDetail,
                    total: stockTotal
                },
                technicians: updatedTechnicians
            };
        }

        // Si no hay cambios, retornar el item tal como está
        return {
            ...item,
            stock: {
                detail: stockDetail,
                total: stockTotal
            },
            technicians: updatedTechnicians
        };
    });
    console.groupEnd();
    return result;
};
//Este se usar para buscar las operaciones para el overview del isolated
const sortedDetails = (id, nativeData) => {
    let response
    if(id) {
        var item = nativeData.find((element) => element.id === id);

        response = item?.stock?.detail? [...item.stock.detail].sort(
            (a, b) =>
                new Date(b.lastUpdate.seconds * 1000) - new Date(a.lastUpdate.seconds * 1000)
        ).filter((item) => 
            item.status !== "DONE") : null;
    }
        
    return response;
}

const filterDataTable = (filters, dataState) => {
    let dataTable = structuredClone(dataState);
    let response = dataTable?.filter((item) => {
        let descriptionMatch = true;
        let partNumberMatch = true;
        let reworkMatch = false;
        let priorityMatch = false;
        let categoryMatch = false;

        if (filters.search && filters.search !== "") {
            descriptionMatch = item.description?.toLowerCase().includes(filters.search.toLowerCase()) ?? false;
            partNumberMatch = item.partNumber?.toString().includes(filters.search) ?? false;
        }

        switch (filters.reWork.key) {
            case 0:
                reworkMatch = item.reWork === false;
                break;
            case 1:
                reworkMatch = item.reWork === true;
                break;
            default:
                reworkMatch = true;
                break;
        }

        switch (filters.priority.key) {
            case 0:
                priorityMatch = item.priority === 'LOW';
                break;
            case 1:
                priorityMatch = item.priority === 'MID';
                break;
            case 2:
                priorityMatch = item.priority === 'HIGH';
                break;
            default:
                priorityMatch = true;
                break;
        }

        filters.category.key?.map((name, index) => {
            if(item.category == name) {
                categoryMatch = true;
            }
        });
        if(filters.category.key.length == 0) categoryMatch = true
        return (descriptionMatch || partNumberMatch) && reworkMatch && priorityMatch && categoryMatch;
    });

    return response;
}

const formatDataTable = (dataState) => {
    console.groupCollapsed(`Format Data`);

    console.log(dataState)
    let dataTable = structuredClone(dataState);
    dataTable = dataTable.map((item => {
        var issue = false;
        console.log(item);
        const matchDB = dbData.find((db) => (db.id === item.id));
        item.stock.detail.forEach(op => {
            op.status === 'ISSUE' && (issue = true);
        });
        console.log(item)
        console.log(matchDB)

        return {
            id: item.id,
            partNumber: matchDB.pn,
            description: matchDB.desc,
            reWork: item.reWork,
            category: matchDB.modulo,
            cost: item.cost || 0,
            stock: Object.values(item.stock.total).reduce((sum, value) => sum += value, 0) || 0,
            ppk: item.technicians.reduce((sum, value) => sum += value.ppk || 0, 0) || 0,
            onHand: item.technicians.reduce((sum, value) => sum += value.onHand || 0, 0) || 0,
            priority: item.priority || 'LOW',
            nodes: item.technicians
            .filter((node) => {
                // Filtrar nodos donde ppk, onHand y stock no sean todos 0
                return !(!node.ppk && !node.onHand && !(item.stock.total[node.csr] || 0));
            })
            .map((node) => {
                return {
                    id: node.id,
                    partNumber: [],
                    description: node.name,
                    reWork: null,
                    ppk: node.ppk || 0,
                    onHand: node.onHand || 0,
                    stock: item.stock.total[node.csr] || 0
                };
            })
            .sort((a, b) => {
                // Ordenar alfabéticamente por description
                return a.description.localeCompare(b.description);
            }),
            issue: issue
        }
    }));
    console.groupEnd();

    return dataTable;
}

export const inventoryReducer = (state = initialStateInventory, action) => {
    let newDataTable;

    switch (action.type) {
        //FETCH //FETCH //FETCH //FETCH //FETCH //FETCH //FETCH //FETCH //FETCH //FETCH
        case TYPES.FETCH_INVENTORY_START:
            return { ...state, stepLoading: 1 };

        case TYPES.FETCH_INVENTORY_SUCCESS:
            newDataTable = formatDataTable(action.payload) || [];
            console.log(newDataTable)
            return { 
                ...state, 
                stepLoading: 0, 
                nativeData: action.payload,
                dataTable: newDataTable, 
                renderTable: filterDataTable(state.filters, newDataTable),
                overView: {
                    active: state.overView.active,
                    data: sortedDetails(state.isolated?.id, state.nativeData),
                }
        }

        case TYPES.FETCH_INVENTORY_FAILURE:
            return { ...state, stepLoading: 0 };

        //DISPATCH //DISPATCH //DISPATCH //DISPATCH //DISPATCH //DISPATCH //DISPATCH //DISPATCH
        case TYPES.DISPATCH_INVENTORY_START:
            return { ...state, stepLoading: 1 };

        case TYPES.DISPATCH_INVENTORY_SUCCESS:
            let newNativeData = mergeDataTable(action.payload, state.nativeData);
            newDataTable = formatDataTable(newNativeData) || [];
            return { 
                ...state, 
                nativeData: newNativeData,
                dataTable: newDataTable, 
                renderTable: filterDataTable(state.filters, newDataTable),
                overView: {
                    active: state.overView.active,
                    data: sortedDetails(state.isolated?.id, state.nativeData),
                }, 
                stepLoading: 0 
            };

        case TYPES.DISPATCH_INVENTORY_FAILURE:
            return { ...state, stepLoading: 0 };

        //UPDATE //UPDATE //UPDATE //UPDATE //UPDATE //UPDATE //UPDATE //UPDATE //UPDATE //UPDATE
        case TYPES.SET_TABLE:
            return { 
                ...state, 
                dataTable: action.dataTable, 
                renderTable: filterDataTable(state.filters, action.dataTable),
                overView: {
                    active: state.overView.active,
                    data: sortedDetails(state.isolated?.id, state.nativeData),
                }
        }

        case TYPES.SET_STOCK: {
            let newData = mergeDataTable(state.nativeData)
            return { ...state, nativeData: newData }
        }
        
        
        case TYPES.UPDATE_TABLE: {
            let newData = mergeDataTable(state.nativeData)
            return { ...state, nativeData: newData }
        }
        
        case TYPES.UPDATE_PRIORITY: {
            let newData = structuredClone(state.nativeData);
            newData.forEach((item) => {
                if (item.id === action.dataItem.id) {
                    item.priority = action.dataItem.status;
                }
            });

            newDataTable = formatDataTable(newData) || [];
            return { 
                ...state, 
                nativeData: newData,
                dataTable: newDataTable, 
                renderTable: filterDataTable(state.filters, newDataTable),
            };
        }

        case TYPES.UPDATE_CATEGORY: {
            let newData = structuredClone(state.nativeData);
            newData.forEach((item) => {
                if (item.id === action.dataItem.id) {
                    item.category = action.dataItem.name;
                }
            });

            newDataTable = formatDataTable(newData) || [];
            return { 
                ...state, 
                nativeData: newData,
                dataTable: newDataTable, 
                renderTable: filterDataTable(state.filters, newDataTable),
            };
        }

        //FILTERS //FILTERS //FILTERS //FILTERS //FILTERS //FILTERS //FILTERS //FILTERS

        //Hay contemplar que cada vez que se cambia un filtro hay que reformatear la tabla y luego recargar filtros
        case TYPES.SEARCH_IN_TABLE: { 
            let filters = { ...state.filters, search: action.search }  
            let filteredData = filterDataTable(filters, state.dataTable) 
            return { ...state, filters: filters, renderTable: filteredData, isolated: filteredData.length === 1 ? filteredData[0] : undefined };   
        }

        case TYPES.RELOAD_FILTERS: {
            return { ...state, renderTable: filterDataTable(filters, state.dataTable) }
        }

        case TYPES.CLEAR_FILTERS: {
            return { ...state, filters: initialStateInventory.filters, renderTable: state.dataTable }
        }

        case TYPES.FILTER_REWORK: {
            var filters = structuredClone(state.filters);
            filters.reWork.key = action.key
            return { ...state, renderTable: filterDataTable(filters, state.dataTable), filters: filters }
        }

        case TYPES.FILTER_CATEGORY: {
            var filters = structuredClone(state.filters);
            filters.category.key = action.key
            return { ...state, renderTable: filterDataTable(filters, state.dataTable), filters: filters }
        }

        case TYPES.FILTER_PRIORITY: {
            var filters = structuredClone(state.filters);
            filters.priority.key = action.key
            return { ...state, renderTable: filterDataTable(filters, state.dataTable), filters: filters }
        }

        case TYPES.FILTER_STATUS: {
            var filters = structuredClone(state.filters);
            filters.reWork.key = action.key
            return { ...state, renderTable: filterDataTable(filters, state.dataTable), filters: filters }
        }

        //TRIGGER //TRIGGER //TRIGGER //TRIGGER //TRIGGER //TRIGGER //TRIGGER //TRIGGER //TRIGGER //TRIGGER
        case TYPES.CLOSE_OVERVIEW: {
            return {
                ...state,
                overView: {
                    active: false,
                    data: null,
                },
            };
        }

        case TYPES.OPEN_OVERVIEW: {
            return {
                ...state,
                overView: {
                    active: true,
                    data: sortedDetails(state.isolated?.id, state.nativeData),
                },
            };
        }

        case TYPES.ISOLATE_PART_IN_TABLE: {
            return { 
                ...state, 
                isolated: action.dataItem, 
                overView: {
                    active: state.overView.active,
                    data: sortedDetails(action.dataItem?.id, state.nativeData),
                }
            }
        }

        case TYPES.STEP_LOADER: {
            return {
                ...state,
                stepLoading: action.step
            }
        }

        default:
            return state;
    }
};
