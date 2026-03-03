import { createClient } from "@supabase/supabase-js";
import config from "./config";

export const supabase = createClient(
  config.auth.supabaseUrl,
  config.auth.supabaseAnonKey
);
