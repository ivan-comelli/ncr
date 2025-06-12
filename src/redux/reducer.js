import { format } from 'path-browserify';
import TYPES from './types';

const options = [
    { name: "Diego Molina", csr: "AR103S42" },
    { name: "Nahuel DeLuca", csr: "AR103S44" },
    { name: "Adrian Santarelli", csr: "AR103S45" },
    { name: "Juan Valenzuela", csr: "AR903S49" },
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
            values: ['CASH', 'BNA3', 'SCPM', 'SRU', 'GBRU', 'BRM', 'CPU', 'ATM', 'READ', 'TOOL', 'PRINT'],
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
    let oldData = structuredClone(data);
    let result = [];
    if (oldData.length > 0) {
        result = oldData.map(item => {
            const existingItem = newData.find(dataItem => {
                let find = false;
                dataItem.partNumber?.forEach((part) => {
                    if(item.partNumber.includes(part)) {
                        find = true;
                    }
                })
                !find && dataItem.id === item.id && (find = true)
                return find;
            });
            let updatedTechnicians;
            if (existingItem) {
                updatedTechnicians = item.technicians.map(technician => {
                    const matchingTechnician = existingItem.technicians?.find(tec => tec.csr === technician.csr);
                    if (matchingTechnician) {
                        return {
                            ...technician,
                            onHand: matchingTechnician.onHand ?? technician.onHand,
                            ppk: matchingTechnician.ppk ?? technician.ppk,
                            createdAt: matchingTechnician.createdAt || technician.createdAt,
                        };
                    }
                    return technician;
                });
                let countTotal = 0;
                console.log(existingItem)
                existingItem.stock.forEach((newStock) => {
                    let existStockOp = item.stock.detail.find((item) => item.id === newStock.id);
                    console.log(existStockOp)
                    let mergeStockData = {
                        id: newStock.id || existStockOp.id,
                        csr: newStock.csr?.toLowerCase() || existStockOp.csr.toLowerCase(),
                        name: newStock.name || existStockOp.name,
                        status: newStock.status || existStockOp.status,
                        lastUpdate: newStock.lastUpdate || existStockOp.lastUpdate,
                        stock: Number(newStock.quantity) || existStockOp.stock,
                    }
                    console.log(mergeStockData)
                    item.stock.detail.forEach((op) => {
                        if(op.csr.toLowerCase() == mergeStockData.csr.toLowerCase()) {
                            countTotal += Number(op.stock);
                        }
                    });

                    let quantitySum = 0;

                    existStockOp ? (
                        Object.assign(existStockOp, mergeStockData)
                    ) : (
                        item.stock.detail.push(mergeStockData)
                    )

                    switch (mergeStockData.status) {
                        case STATUS.PENDIENT:
                            quantitySum = Number(mergeStockData.stock);
                        break;

                        case STATUS.FAILED:
                        break;

                        case STATUS.SYNC:
                            quantitySum = Number(mergeStockData.stock);
                        break;

                        case STATUS.ADJUST:
                            quantitySum = Number(mergeStockData.stock);
                        break;

                        case STATUS.ISSUE:
                            quantitySum = Number(mergeStockData.stock);
                        break;

                        case STATUS.DONE:
                            quantitySum = Number(mergeStockData.stock) * (-1)
                        break;

                        default:
                            quantitySum = Number(mergeStockData.stock);
                        break;
                                
                    }


                    console.log(quantitySum)

                    item.stock.total[mergeStockData.csr.toLowerCase()] = (item.stock.total[mergeStockData.csr.toLowerCase()] ? item.stock.total[mergeStockData.csr.toLowerCase()] : 0) + quantitySum
                });
                
                newData.splice(newData.indexOf(existingItem), 1);
                console.log(item)
                return {
                    ...item,
                    technicians: updatedTechnicians,
                };
            }
            
            return item;
        });
    } 
    return result;
}

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
    let dataTable = structuredClone(dataState);
    dataTable = dataTable.map((item => {
        var issue = false;
        item.stock.detail.forEach(op => {
            op.status === 'ISSUE' && (issue = true);
        });
        return {
            id: item.id,
            partNumber: item.partNumber,
            description: item.description,
            reWork: item.reWork,
            category: item.category || null,
            cost: item.cost,
            stock: Object.values(item.stock.total).reduce((sum, value) => sum += value, 0) || 0,
            ppk: item.technicians.reduce((sum, value) => sum += value.ppk, 0) || 0,
            onHand: item.technicians.reduce((sum, value) => sum += value.onHand, 0) || 0,
            priority: item.priority || 'LOW',
            nodes: item.technicians
            .filter((node) => {
                // Filtrar nodos donde ppk, onHand y stock no sean todos 0
                return !(node.ppk === 0 && node.onHand === 0 && (item.stock.total[node.csr] || 0) === 0);
            })
            .map((node) => {
                return {
                    id: node.id,
                    partNumber: [],
                    description: node.name,
                    reWork: null,
                    ppk: node.ppk,
                    onHand: node.onHand,
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
