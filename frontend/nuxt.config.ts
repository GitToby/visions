import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  srcDir: "src",
  ssr: false,

  compatibilityDate: "2024-11-01",

  vite: {
    plugins: [tailwindcss()],
  },

  css: ["~/assets/css/main.css"],

  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.VITE_API_BASE_URL || "http://localhost:8000",
      supabaseUrl: process.env.VITE_SUPABASE_URL || "",
      supabaseKey: process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || "",
    },
  },

  // Auto-import composables from features as well
  imports: {
    dirs: ["composables/**", "features/**/composables"],
  },
});
