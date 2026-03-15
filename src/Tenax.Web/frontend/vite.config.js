import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
const parsePort = (value, fallback) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    return {
        plugins: [react()],
        server: {
            host: env.TENAX_FRONTEND_HOST ?? "127.0.0.1",
            port: parsePort(env.TENAX_FRONTEND_PORT, 5173),
            strictPort: true,
            proxy: {
                "/api": {
                    target: env.TENAX_API_PROXY_TARGET ?? "http://localhost:5062",
                    changeOrigin: true,
                    secure: false
                }
            }
        }
    };
});
