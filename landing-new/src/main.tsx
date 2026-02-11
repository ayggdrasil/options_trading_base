import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { StatsProvider } from "./contexts/data/StatsProvider.tsx";
import { DeviceProvider } from "./contexts/device/DeviceProvider.tsx";
import { TrendingProvider } from "./contexts/data/TrendingProvider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StatsProvider>
      <TrendingProvider>
        <DeviceProvider>
          <App />
        </DeviceProvider>
      </TrendingProvider>
    </StatsProvider>
  </StrictMode>
);
