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

const mergeData = (newData, data) => {
    console.log(newData)
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


const initialStateInventory = {
    isLoading: true,
    data: [],
    table: [],
    search: ''
};

const sortedDetails = (id, state) => {
    var item;
    if(id == null) {
        item = state.data
        .find((element) => element.id === state.detail.id);
        
    }
    else {
        item = state.data
        .find((element) => element.id === id);
    }

    const sortedDetails = item?.stock?.detail
    ? [...item.stock.detail].sort(
        (a, b) =>
            new Date(b.lastUpdate.seconds * 1000) - new Date(a.lastUpdate.seconds * 1000)
    ).filter((item) => item.status !== "DONE")
    : null;
    
    return sortedDetails;
}

export const inventoryReducer = (state = initialStateInventory, action) => {
    switch (action.type) {
        case TYPES.FETCH_INVENTORY_START:
            return { ...state, isLoading: true };

        case TYPES.FETCH_INVENTORY_SUCCESS:
            return { ...state, isLoading: false, data: action.payload };

        case TYPES.FETCH_INVENTORY_FAILURE:
            return { ...state, isLoading: false };

        case TYPES.DISPATCH_INVENTORY_START:
            return { ...state, isLoading: true };

        case TYPES.DISPATCH_INVENTORY_SUCCESS:
            return { ...state, data: mergeData(action.payload, state.data),  isLoading: false };

        case TYPES.DISPATCH_INVENTORY_FAILURE:
            return { ...state, isLoading: false };

        case TYPES.SET_TABLE:
            return { ...state, table: action.payload }

        case TYPES.SEARCH_IN_TABLE: 
            const search = action.payload || (action.payload == null ? state.search : '');
            let data = structuredClone(state.table);
            data = data.filter((item) => {
                if(search && search !="") {
                    const descriptionMatch = item.description && item.description
                    .toLowerCase()
                    .includes(search.toLowerCase());
                    const partNumberMatch = item.description && item.partNumber
                    .toString()
                    .includes(search);
            
                    return descriptionMatch || partNumberMatch;
                }
                return true;
            });
            
            return { ...state, search: search, table: data, isolated: data.length === 1 ? data[0] : state.isolated };   

        case TYPES.FIND_DETAIL_STOCK:
            return {
                ...state,
                detail: {
                    id: action.payload || state.detail.id,
                    data: sortedDetails(action.payload, state) || null,
                },
            };

        case TYPES.ISOLATE_PART_IN_TABLE:
            return { ...state, isolated: action.payload, 
                detail: {
                    id: action.payload.id || state.detail.id,
                    data: sortedDetails(action.payload.id, state) || null,
                }, 
            }

        case TYPES.UPDATE_STOCK:
            const newData = mergeData([
                {
                    id: action.payload.idInventory,
                    stock:[
                        {
                            id: action.payload.idStock, 
                            status: action.payload.status
                        }
                    ]
                }
            ], state.data)
            return { ...state, data: newData }

        default:
            return state;
    }
};
