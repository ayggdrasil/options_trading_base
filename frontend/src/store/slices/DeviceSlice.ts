import { PayloadAction, createSlice } from "@reduxjs/toolkit";

interface DeviceState {
  isMobile: boolean;
  isIpad: boolean;
}

const initialState: DeviceState = {
  isMobile: false,
  isIpad: false,
};

export const deviceSlice = createSlice({
  name: "device",
  initialState,
  reducers: {
    changeDevice: (state, action: PayloadAction<DeviceState>) => {
      state.isMobile = action.payload.isMobile;
      state.isIpad = action.payload.isIpad;
    },
  },
});

export const { changeDevice } = deviceSlice.actions;

export default deviceSlice.reducer;
