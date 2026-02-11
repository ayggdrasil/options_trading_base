import { Middleware } from "@reduxjs/toolkit";
import {
  MARKET_UPDATE_FUTURES_INDICES,
  UPDATE_KLINES_BTC,
  UPDATE_KLINES_ETH,
} from "../actions/actionTypes";
import { WEBSOCKET_API } from "@/utils/apis";

// 상수 정의
const INITIAL_CONNECTION_DELAY = 500; // 초기 연결 딜레이 (ms)
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000; // 첫 재연결 딜레이 (ms)
const MAX_RECONNECT_DELAY = 30000; // 최대 재연결 딜레이 (ms)

// Socket 인스턴스와 재연결 관련 상태를 middleware 외부에서 관리
let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
let isManualClose = false; // 수동 종료 여부 추적

// Exponential backoff를 사용한 재연결 딜레이 계산
const getReconnectDelay = (attempt: number): number => {
  const delay = Math.min(
    INITIAL_RECONNECT_DELAY * Math.pow(2, attempt),
    MAX_RECONNECT_DELAY
  );
  return delay;
};

// 기존 연결 정리
const cleanupConnection = () => {
  if (socket) {
    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;
    
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close();
    }
    socket = null;
  }
  
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
};

// 메시지 핸들러
const handleMessage = (storeAPI: any, message: MessageEvent) => {
  try {
    const result = JSON.parse(message.data);

    if (result.event === "futuresIndices") {
      const data = {
        data: result.data,
        lastUpdatedAt: result.timestamp,
      };

      storeAPI.dispatch({
        type: MARKET_UPDATE_FUTURES_INDICES,
        payload: data,
      });
    } else if (result.event === "klines") {
      if (result.symbol === "BTCUSDC") {
        storeAPI.dispatch({
          type: UPDATE_KLINES_BTC,
          payload: result.data,
        });
      } else if (result.symbol === "ETHUSDC") {
        storeAPI.dispatch({
          type: UPDATE_KLINES_ETH,
          payload: result.data,
        });
      }
    }
  } catch (error) {
    console.error("Failed to parse WebSocket message:", error);
    console.error("Raw message:", message.data);
  }
};

// WebSocket 연결 함수
const connectWebSocket = (storeAPI: any) => {
  // 이미 연결되어 있으면 재사용
  if (socket && socket.readyState === WebSocket.OPEN) {
    console.log("WebSocket already connected");
    return;
  }

  // 기존 연결 정리
  cleanupConnection();

  try {
    console.log("Attempting to connect to:", WEBSOCKET_API);
    socket = new WebSocket(WEBSOCKET_API);

    socket.onopen = () => {
      console.log("WebSocket connected successfully");
      reconnectAttempts = 0; // 연결 성공 시 재연결 카운터 리셋
      isManualClose = false;
    };

    socket.onmessage = (message) => {
      handleMessage(storeAPI, message);
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      console.error("Socket readyState:", socket?.readyState);
    };

    socket.onclose = (event) => {
      console.log("WebSocket disconnected");
      console.log("Close code:", event.code);
      console.log("Close reason:", event.reason);
      console.log("Was clean:", event.wasClean);

      socket = null;

      // 수동 종료가 아닌 경우에만 재연결 시도
      if (!isManualClose && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const delay = getReconnectDelay(reconnectAttempts - 1);
        
        console.log(
          `Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) in ${delay}ms...`
        );

        reconnectTimer = setTimeout(() => {
          connectWebSocket(storeAPI);
        }, delay);
      } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error(
          "Max reconnection attempts reached. Please refresh the page or check your connection."
        );
      }
    };
  } catch (error) {
    console.error("Failed to create WebSocket:", error);
    socket = null;
  }
};

export const webSocketMiddleware: Middleware =
  (storeAPI) => (next) => (action) => {
    if (action.type === "app/startWebSocket") {
      // 이미 연결되어 있으면 재사용
      if (socket && socket.readyState === WebSocket.OPEN) {
        console.log("WebSocket already connected");
        return next(action);
      }

      // 초기 연결 시 딜레이를 두어 앱 초기화 완료 대기
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }

      reconnectTimer = setTimeout(() => {
        connectWebSocket(storeAPI);
      }, INITIAL_CONNECTION_DELAY);
    }

    if (action.type === "app/stopWebSocket") {
      isManualClose = true;
      reconnectAttempts = 0; // 수동 종료 시 재연결 카운터 리셋
      cleanupConnection();
    }

    // Continue processing this action down the chain
    return next(action);
  };
