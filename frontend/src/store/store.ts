import { webSocketMiddleware } from "./middleware/webSocketMiddleware";
import { configureStore } from "@reduxjs/toolkit";

import networkReducer from "./slices/NetworkSlice";
import appReducer from "./slices/AppSlice";
import marketReducer from "./slices/MarketSlice";
import positionsReducer from "./slices/PositionsSlice";
import positionHistoryReducer from "./slices/PositionHistorySlice";
import modalReducer from "./slices/ModalSlice";
import userReducer from "./slices/UserSlice";
import webSocketReducer from "./slices/WebSocketSlice";
import olpQueueReducer from "./slices/OlpQueueSlice";
import olpEpochReducer from "./slices/OlpEpochSlice";

// Mobile Related
import selectedOptionReducer from "./slices/SelectedOption";
import collapseReducer from "./slices/CollapseSlice";
import deviceReducer from "./slices/DeviceSlice";

export const store = configureStore({
  reducer: {
    network: networkReducer,
    app: appReducer,
    market: marketReducer,
    positions: positionsReducer,
    positionHistory: positionHistoryReducer,
    modal: modalReducer,
    user: userReducer,
    webSocket: webSocketReducer,
    olpQueue: olpQueueReducer,
    olpEpoch: olpEpochReducer,
    selectedOption: selectedOptionReducer,
    collapse: collapseReducer,
    device: deviceReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(webSocketMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;
