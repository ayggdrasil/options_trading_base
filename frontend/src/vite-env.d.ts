// /// <reference types="vite/client" />

// import { MetaMaskInpageProvider } from "@metamask/providers";

// declare global {
//   interface Window {
//     ethereum?: MetaMaskInpageProvider;
//     injected?: any;
//   }
// }

declare module '*.svg' {
  const content: string;
  export default content;
}

interface ImportMetaEnv {
  VITE_PROJECT_ID: string
}

interface Window {
  ethereum?: any
  injected?: any
  isMobile?: boolean
}

declare module 'int-encoder';