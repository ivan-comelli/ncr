import TYPES from '../../types'
// STATUS FOR MODAL
export const dispatchInventoryStart = () => ({ 
    type: TYPES.DISPATCH_INVENTORY_START, 
});

export const dispatchInventorySuccess = (inventory) => ({ 
    type: TYPES.DISPATCH_INVENTORY_SUCCESS, 
    payload: inventory 
});

export const dispatchInventoryFailure = (error) => ({
    type: TYPES.DISPATCH_INVENTORY_FAILURE,
    payload: error,
});