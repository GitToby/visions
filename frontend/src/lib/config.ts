// env vars are set in mise.toml
const authConfig = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
  supabaseAnonKey: import.meta.env
    .VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY as string,
  submission_type: "code",
  scope: "email openid profile",
};

const apiConfig = {
  baseUrl: import.meta.env.API_BASE_URL as string,
  is_preview: import.meta.env.IS_PULL_REQUEST as boolean,
};

const config = {
  auth: authConfig,
  api: apiConfig,
};

console.log("Using config:", config);

export default config;
