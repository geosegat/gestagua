import { configureStore } from '@reduxjs/toolkit';
import { gestaguaApi } from './services/gestaguaApi';
import { geoApi } from './services/geoApi';

export const store = configureStore({
  reducer: {
    [gestaguaApi.reducerPath]: gestaguaApi.reducer,
    [geoApi.reducerPath]: geoApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(gestaguaApi.middleware, geoApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
