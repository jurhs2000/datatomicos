import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// `base: "./"` hace que el sitio funcione en cualquier subcarpeta,
// por ejemplo https://<usuario>.github.io/datatomicos/.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
