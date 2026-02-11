import { PayloadAction, createSlice } from "@reduxjs/toolkit";

interface CollapseState {
  isCollapseHistory: string[];
  isCollapseMyPositions: number[];
}

const initialState: CollapseState = {
  isCollapseHistory: [],
  isCollapseMyPositions: [],
};

export const collapseSlice = createSlice({
  name: "collapse",
  initialState,
  reducers: {
    setCollapseMyPositions: (state, action: PayloadAction<{ isCollapseMyPositions: number }>) => {
      const _isCollapseMyPositions = action.payload.isCollapseMyPositions;
      const isExits = state.isCollapseMyPositions.includes(_isCollapseMyPositions);
      if (isExits) {
        const filterIsCollapseMyPositions = state.isCollapseMyPositions.filter(
          (item) => item !== _isCollapseMyPositions
        );
        state.isCollapseMyPositions = filterIsCollapseMyPositions;
      } else {
        state.isCollapseMyPositions = [...state.isCollapseMyPositions, _isCollapseMyPositions];
      }
    },
    setCollapseHistory: (state, action: PayloadAction<{ isCollapseHistory: string }>) => {
      const _isCollapseHistory = action.payload.isCollapseHistory;
      const isExits = state.isCollapseHistory.includes(_isCollapseHistory);
      if (isExits) {
        const filterIsCollapseMyPositions = state.isCollapseHistory.filter(
          (item) => item !== _isCollapseHistory
        );
        state.isCollapseHistory = filterIsCollapseMyPositions;
      } else {
        state.isCollapseHistory = [...state.isCollapseHistory, _isCollapseHistory];
      }
    },
  },
});

export const { setCollapseMyPositions, setCollapseHistory } = collapseSlice.actions;

export default collapseSlice.reducer;
