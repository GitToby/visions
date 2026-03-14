/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

async function resolveApiBaseUrl(): Promise<string> {
  // Render env vars are set: https://render.com/docs/environment-variables
  const prod = "https://api.visions.tobydevlin.com";

  if (!process.env.RENDER && !process.env.USE_PROD_SERVICES)
    return "http://localhost:8000";

  // RENDER_EXTERNAL_URL = "https://visions-web-pr-42.onrender.com" on PR previews
  const externalUrl = process.env.RENDER_EXTERNAL_URL ?? "";
  if (externalUrl.includes("visions-web-pr-")) {
    // externalUrl will be in the form "https://visions-api-pr-<pr-number>.onrender.com", if it exists
    const prApiUrl = externalUrl.replace("visions-web-pr-", "visions-api-pr-");
    try {
      const r = await fetch(`${prApiUrl}/health`);
      if (r.ok) return prApiUrl;
    } catch {}
    console.warn(`[vite] PR API health check failed, falling back to ${prod}`);
  }
  return prod;
}

export default defineConfig(async () => {
  const apiBaseUrl = await resolveApiBaseUrl();
  console.log(`[vite] API base URL: ${apiBaseUrl}`);
  const isLocal = !process.env.RENDER && !process.env.USE_PROD_SERVICES;
  console.log(`[vite] isLocal: ${isLocal}`);
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "local-favicon", // make the favicon different for local
        transformIndexHtml: (html: string) =>
          isLocal ? html.replace("/favicon.svg", "/favicon_local.svg") : html,
      },
    ],
    define: {
      "import.meta.env.IS_PULL_REQUEST": JSON.stringify(
        process.env.IS_PULL_REQUEST ?? "false",
      ),
      "import.meta.env.API_BASE_URL": JSON.stringify(apiBaseUrl),
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom", "react-router-dom"],
            query: ["@tanstack/react-query"],
            supabase: ["@supabase/supabase-js"],
          },
        },
      },
    },
  };
});
