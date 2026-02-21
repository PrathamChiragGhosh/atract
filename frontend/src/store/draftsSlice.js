import { createSlice } from '@reduxjs/toolkit';

// Get storage key for a specific employer
const getStorageKey = (employerId) => {
    return `jobDrafts_${employerId}`;
};

// Load drafts from localStorage for a specific employer
const loadDraftsFromStorage = (employerId) => {
    if (typeof window === 'undefined' || !employerId) return [];
    try {
        const stored = localStorage.getItem(getStorageKey(employerId));
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Error loading drafts from localStorage:', error);
        return [];
    }
};

// Save drafts to localStorage for a specific employer
const saveDraftsToStorage = (drafts, employerId) => {
    if (typeof window === 'undefined' || !employerId) return;
    try {
        localStorage.setItem(getStorageKey(employerId), JSON.stringify(drafts));
    } catch (error) {
        console.error('Error saving drafts to localStorage:', error);
    }
};

const initialState = {
    drafts: [],
    currentEmployerId: null,
};

const draftsSlice = createSlice({
    name: 'drafts',
    initialState,
    reducers: {
        // Initialize drafts for an employer
        initializeDrafts: (state, action) => {
            const employerId = action.payload;
            if (employerId && employerId !== state.currentEmployerId) {
                state.currentEmployerId = employerId;
                state.drafts = loadDraftsFromStorage(employerId);
            }
        },
        saveDraft: (state, action) => {
            const { draftData, employerId } = action.payload;
            
            if (!employerId) {
                console.error('Cannot save draft: employerId is required');
                return;
            }

            // Initialize if needed
            if (state.currentEmployerId !== employerId) {
                state.currentEmployerId = employerId;
                state.drafts = loadDraftsFromStorage(employerId);
            }

            const draft = {
                ...draftData,
                id: draftData.id || `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                updatedAt: new Date().toISOString(),
                employerId, // Store employer ID with draft for safety
            };
            
            const existingIndex = state.drafts.findIndex(d => d.id === draft.id);
            
            if (existingIndex >= 0) {
                state.drafts[existingIndex] = draft;
            } else {
                state.drafts.unshift(draft);
            }
            
            saveDraftsToStorage(state.drafts, employerId);
        },
        deleteDraft: (state, action) => {
            const { draftId, employerId } = action.payload;
            
            if (!employerId || state.currentEmployerId !== employerId) {
                console.error('Cannot delete draft: employerId mismatch');
                return;
            }

            state.drafts = state.drafts.filter(d => d.id !== draftId);
            saveDraftsToStorage(state.drafts, employerId);
        },
        clearAllDrafts: (state, action) => {
            const employerId = action.payload;
            
            if (!employerId || state.currentEmployerId !== employerId) {
                console.error('Cannot clear drafts: employerId mismatch');
                return;
            }

            state.drafts = [];
            saveDraftsToStorage(state.drafts, employerId);
        },
        loadDraft: (state, action) => {
            // This doesn't modify state, but we keep it for consistency
            return state;
        },
    },
});

export const { initializeDrafts, saveDraft, deleteDraft, clearAllDrafts, loadDraft } = draftsSlice.actions;
export default draftsSlice.reducer;

