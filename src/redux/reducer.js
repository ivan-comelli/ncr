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
                dataItem.partNumber.forEach((part) => {
                    if(item.partNumber.includes(part)) {
                        find = true;
                    }
                })
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
                existingItem.stock.forEach((newStock) => {
                    item.stock.detail.forEach((op) => {
                        if(op.csr.toLowerCase() == newStock.csr.toLowerCase()) {
                            countTotal += Number(op.stock);
                        }
                    });
                    item.stock.detail.push({
                        csr: newStock.csr.toLowerCase(),
                        name: newStock.name.toLowerCase(),
                        status: newStock.status,
                        lastUpdate: newStock.lastUpdate,
                        stock: Number(newStock.quantity),
                        total: countTotal + newStock.quantity
                    });
                    let quantitySum = 0;
                    switch (newStock.status) {
                        case STATUS.PENDIENT:
                            quantitySum = Number(newStock.quantity);
                        break;
                        case STATUS.FAILED:
                        break;
                        case STATUS.SYNC:
                            quantitySum = Number(newStock.quantity);
                        break;
                        case STATUS.ADJUST:
                            quantitySum = Number(newStock.quantity);
                        break;
                        case STATUS.ISSUE:
                            quantitySum = Number(newStock.quantity);
                        break;
                        case STATUS.DONE:
                            quantitySum = 0;
                        break;
                        default:
                            quantitySum = Number(newStock.quantity);
                        break;
                                
                    }

                    item.stock.total[newStock.csr.toLowerCase()] = (item.stock.total[newStock.csr.toLowerCase()] ? item.stock.total[newStock.csr.toLowerCase()] : 0) + Number(quantitySum)
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

            return { ...state, search: search, table: data };   

        case TYPES.ISOLATE_PART_IN_TABLE:
            return { ...state, isolated: action.payload }

        default:
            return state;
    }
};
