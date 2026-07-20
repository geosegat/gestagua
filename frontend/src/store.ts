import { configureStore } from '@reduxjs/toolkit';
import { gestaguaApi } from './services/gestaguaApi';

export const store = configureStore({
  reducer: {
    [gestaguaApi.reducerPath]: gestaguaApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(gestaguaApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
