import { configureStore } from '@reduxjs/toolkit';
import draftsReducer from './draftsSlice';

export const store = configureStore({
    reducer: {
        drafts: draftsReducer,
    },
});

