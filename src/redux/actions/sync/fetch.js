import TYPES from '../../types'

export const fetchInventoryStart = () => ({ 
    type: TYPES.FETCH_INVENTORY_START 
});

export const fetchInventorySuccess = (inventory) => ({ 
    type: TYPES.FETCH_INVENTORY_SUCCESS, 
    payload: inventory 
});

export const fetchInventoryFailure = (error) => ({
    type: TYPES.FETCH_INVENTORY_FAILURE,
    payload: error,
});
