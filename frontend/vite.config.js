import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // AWS IP vazhi purathu ninnu access cheyyan ithu aavashyamanu
    port: 3000,      // Nammal AWS firewall-il 3000 open cheythathu kondu port 3000 aaki maatti
  },
});