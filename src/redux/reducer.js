import { format } from 'path-browserify';
import TYPES from './types';
import dbData from '../db/output.json';

//EL REDUCER NO CONTEMPLA SI LA NUEVA DATA A MERGER ESTA CON ITEMS REPETIDOS, APLICA CAMBIOS CON LA PRIMERA COINCIDENCIA, LAS DEMAS SE IGNORAN

const options = [
    { name: "Diego Molina", csr: "AR103S42" },
    { name: "Nahuel DeLuca", csr: "AR103S44" },
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

  // Si no hay data previa, inicializa base
  if (oldData.length === 0) {
    oldData = newData.map(item => ({
      ...item,
      stock: { detail: [], total: 0 },
    }));
  }

  result = oldData.map(item => {
    // Encuentra todos los matches de este ID (en caso de que haya duplicados)
    const matchingItems = newData.filter(dataItem => dataItem.id == item.id);

    // Si no hay match, devuelve item tal cual (pero clonado para nueva ref)
    if (matchingItems.length === 0) {
      return {
        ...item,
        stock: {
          detail: Array.isArray(item.stock?.detail) ? [...item.stock.detail] : [],
          total: item.stock?.total || 0
        },
        technicians: [...item.technicians]
      };
    }

    // Combinar stock y technicians de todos los matches
    let stockDetail = Array.isArray(item.stock?.detail) ? [...item.stock.detail] : [];
    let stockTotal = item.stock?.total || 0;

    let updatedTechnicians = [...item.technicians];

    matchingItems.forEach(existingItem => {
      // Actualizar technicians
      updatedTechnicians = updatedTechnicians.map(technician => {
        const matchingTec = existingItem.technicians?.find(tec => tec.csr === technician.csr);
        return matchingTec ? {
          ...technician,
          onHand: matchingTec.onHand || 0,
          ppk: matchingTec.ppk || 0,
          createdAt: matchingTec.createdAt || technician.createdAt,
        } : technician;
      });

      // Actualizar stock
      console.log(existingItem)
      existingItem.stock?.forEach(newStock => {
        const existingOpIndex = stockDetail.findIndex(op => op.id === newStock.id);
        const existStockOp = existingOpIndex !== -1 ? stockDetail[existingOpIndex] : null;

        // DELETE
        if (newStock.req === 'DELETE') {
          if (existStockOp) {
            stockDetail = [
              ...stockDetail.slice(0, existingOpIndex),
              ...stockDetail.slice(existingOpIndex + 1)
            ];
            stockTotal -= Number(existStockOp.stock) || 0;
          }
          return;
        }

        // MERGE o INSERT
        const mergedStock = {
          id: newStock.id ?? existStockOp?.id,
          status: newStock.status ?? existStockOp?.status,
          lastUpdate: newStock.lastUpdate ?? existStockOp?.lastUpdate,
          stock: newStock.quantity != null ? Number(newStock.quantity) : (existStockOp?.stock || 0),
        };

        if (existStockOp) {
          stockTotal -= Number(existStockOp.stock || 0);  // quita el viejo
          stockTotal += Number(mergedStock.stock);        // suma el nuevo

          stockDetail = [
            ...stockDetail.slice(0, existingOpIndex),
            mergedStock,
            ...stockDetail.slice(existingOpIndex + 1)
          ];
        } else {
          stockDetail = [...stockDetail, mergedStock];
          stockTotal += Number(mergedStock.stock);
        }
      });
    });

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
        response = item?.stock?.detail? [...item.stock.detail].filter((item) => item.status !== "DONE") : null;
    }
        
    return response;
}

const filterDataTable = (filters, dataState) => {
    let dataTable = structuredClone(dataState);

    // Primero filtramos
    let filteredData = dataTable?.filter((item) => {
        let descriptionMatch = true;
        let partNumberMatch = true;
        let reworkMatch = false;
        let priorityMatch = false;
        let categoryMatch = false;

        if (filters.search && filters.search !== "") {
            const searchWords = filters.search.toLowerCase().split(/\s+/); // separa por espacios
            const description = item.description?.toLowerCase() ?? "";
            descriptionMatch = searchWords.every(word => description.includes(word));
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

        if (filters.category.key?.length > 0) {
            filters.category.key?.forEach((name) => {
                if (item.category === name) {
                    categoryMatch = true;
                }
            });
        } else {
            categoryMatch = true;
        }

        return (descriptionMatch || partNumberMatch) && reworkMatch && priorityMatch && categoryMatch;
    });

    // Ahora agrupamos y ordenamos por categoría
    let groupedOrdered = [];

    if (filters.category.key?.length > 0) {
        filters.category.key.forEach((categoryName) => {
            let group = filteredData.filter(item => item.category === categoryName);
            groupedOrdered = groupedOrdered.concat(group);
        });
    } else {
        // Si no hay categorías seleccionadas, devolver todo filtrado sin ordenar
        groupedOrdered = filteredData;
    }

    return groupedOrdered;
};


const formatDataTable = (dataState) => {
    console.groupCollapsed(`Format Data`);

    console.log(dataState)
    let dataTable = structuredClone(dataState);
    dataTable = dataTable.map((item => {
        var issue = false;
        const matchDB = dbData.find((db) => (db.id === item.id));
        item.stock.detail.forEach(op => {
            op.status === 'ISSUE' && (issue = true);
        });

        return {
            id: item.id,
            partNumber: matchDB?.pn || [item.id],
            description: matchDB?.desc || 'Fuera de Catalogo',
            reWork: item.reWork,
            category: matchDB?.modulo,
            cost: item.cost || 0,
            stock: (item.reWork ?  Number(item.stock.total) : item.technicians.reduce((sum, value) => sum += value.onHand || 0, 0) + Number(item.stock.total)) || 0,
            ppk: item.technicians.reduce((sum, value) => sum += value.ppk || 0, 0) || 0,
            priority: item.priority || 'LOW',
            init: item.stock.detail.length > 0,
            teoricStock: item.technicians.reduce((sum, value) => sum += value.onHand || 0, 0),
            nodes: item.technicians
            .filter((node) => {
                // Filtrar nodos donde ppk, onHand y stock no sean todos 0
                return !(!node.ppk && !node.onHand);
            })
            .map((node) => {
                return {
                    id: node.id,
                    partNumber: [],
                    description: node.name,
                    reWork: null,
                    ppk: node.ppk || 0,
                    stock: node.onHand || 0
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
        case TYPES.DELETE_STOCK_OP: {
            console.log(action.reference)
            let newNativeData = mergeDataTable(action.reference, state.nativeData);
            newDataTable = formatDataTable(newNativeData) || [];
            return { 
                ...state, 
                nativeData: newNativeData,
                dataTable: newDataTable, 
                renderTable: filterDataTable(state.filters, newDataTable),
                overView: {
                    active: state.overView.active,
                    data: sortedDetails(state.isolated?.id, newNativeData),
                }, 
                stepLoading: 0 
            };
        }

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
                    data: sortedDetails(state.isolated?.id, action.payload),
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
                    data: sortedDetails(state.isolated?.id, newNativeData),
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
