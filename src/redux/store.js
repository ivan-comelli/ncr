import { configureStore } from '@reduxjs/toolkit';
import { inventoryReducer } from './reducer';

const store = configureStore({
  reducer: {
      inventory: inventoryReducer,
  } 
});

export default store;