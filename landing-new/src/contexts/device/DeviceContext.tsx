import { createContext } from "react";

export interface DeviceContextType {
  isMobile: boolean;
}

export const DeviceContext = createContext<DeviceContextType | undefined>(undefined);
