import ReactDOM from "react-dom/client";
import store from "./store/store.ts";
import App from "./App.tsx";

import "./polyfills";
import "@rainbow-me/rainbowkit/styles.css";

import "./index.css";
import "./customWallet.css";
import "./utils/i18n";

import { Provider } from "react-redux";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { config } from "./store/wagmi.ts";

const queryClient = new QueryClient();

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider
        modalSize="compact"
        theme={darkTheme({
          accentColor: "#278EF5",
          accentColorForeground: "#f2f2f2",
          borderRadius: "small",
          fontStack: "system",
          overlayBlur: "small",
        })}
      >
        <Provider store={store}>
          <App />
        </Provider>
      </RainbowKitProvider>
    </QueryClientProvider>
  </WagmiProvider>
);
