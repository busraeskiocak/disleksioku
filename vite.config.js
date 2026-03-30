import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// assetsInclude ile tüm .mjs eşlemesi node_modules paketlerini asset sanıp derlemeyi kırar; yalnızca proje kökündeki .mjs kalır.
function nodeModulesMjsNotAsset() {
  let wrap;
  return {
    name: "node-modules-mjs-not-vite-asset",
    configResolved(config) {
      const prev = config.assetsInclude.bind(config);
      wrap = (file) => {
        const n = file.replace(/\\/g, "/");
        if (n.includes("/node_modules/")) return false;
        return prev(file);
      };
      Object.defineProperty(config, "assetsInclude", {
        configurable: true,
        enumerable: true,
        get() {
          return wrap;
        },
      });
    },
  };
}

export default defineConfig({
  plugins: [nodeModulesMjsNotAsset(), react(), tailwindcss()],
  optimizeDeps: {
    include: ["pdfjs-dist"],
  },
  assetsInclude: ["**/*.mjs"],
});
