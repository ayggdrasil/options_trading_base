import viteCompression from "vite-plugin-compression";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";

// https://vitejs.dev/config/
export default ({ mode }) => {
  return defineConfig({
    server: {
      host: "0.0.0.0",
      port: 5173,
    },
    build: {
      outDir: "build",
      rollupOptions: {
        output: {
          assetFileNames: (assetInfo) => {
            // mp4 no hash
            if (/\.(png|svg|mp4)$/.test(assetInfo.name ?? "")) {
              return "assets/[name][extname]";
            }
            // other file hash
            return "assets/[name]-[hash][extname]";
          },
        },
      },
    },
    plugins: [
      svgr(),
      react(),
      viteCompression({
        deleteOriginFile: false,
        disable: true,
      }),
    ],
    resolve: {
      alias: [
        { find: "@assets", replacement: "/src/assets" },
        { find: "@", replacement: "/src" },
      ],
    },
  });
};
