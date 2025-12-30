/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["scripts/**/*.test.ts"], // we’ll put tests in scripts/
  },
});
