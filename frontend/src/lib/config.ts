// env vars are set in mise.toml
const authConfig = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
  submission_type: "code",
  scope: "email openid profile",
};

const apiConfig = {
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000",
};

const config = {
  auth: authConfig,
  api: apiConfig,
};

console.log("Using config:", config);

export default config;
