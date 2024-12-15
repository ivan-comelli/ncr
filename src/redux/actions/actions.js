import TYPES from '../types';

// STATUS FOR MODAL
export const dispatchInventoryStart = () => ({ type: TYPES.DISPATCH_INVENTORY_START });
export const dispatchInventorySuccess = (inventory) => ({ type: TYPES.DISPATCH_INVENTORY_SUCCESS, payload: inventory });
export const dispatchInventoryFailure = (error) => ({
    type: TYPES.DISPATCH_INVENTORY_FAILURE,
    payload: error,
});

// STATUS PARA EL TABLE
export const fetchInventoryStart = () => ({ type: TYPES.FETCH_INVENTORY_START });
export const fetchInventorySuccess = (inventory) => ({ type: TYPES.FETCH_INVENTORY_SUCCESS, payload: inventory });
export const fetchInventoryFailure = (error) => ({
    type: TYPES.FETCH_INVENTORY_FAILURE,
    payload: error,
});

export const isolatePartInTable = () => {
    // Implement logic here
};

export const openUploadModal = () => {
    // Implement logic here
};

export const closeUploadModal = () => {
    // Implement logic here
};

export const searchInTable = (value) => ({
    type: TYPES.SEARCH_IN_TABLE,
    payload: value
});

export const setTable = (newTable) => ({ type: TYPES.SET_TABLE, payload: newTable });

