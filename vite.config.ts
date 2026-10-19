import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

export default defineConfig(({mode}) => {
  if (mode !== "development" && mode !== "production") {
    throw new Error(`Unsupported Firebase build mode: ${mode}`);
  }
  return {
    define: {
      "process.env.FLEXPAYZ_ENV": JSON.stringify(mode === "development" ? "development" : "production"),
    },
    plugins: [react(), svgr()],
    build: {
      outDir: "build",
    },
  };
});
