import { copyFile } from "node:fs/promises";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  clean: true,
  treeshake: true,
  target: "es2022",
  external: ["react", "react-dom"],
  async onSuccess() {
    await copyFile("src/styles.css", "dist/styles.css");
  },
});
