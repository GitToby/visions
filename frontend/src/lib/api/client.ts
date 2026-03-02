import createFetchClient from "openapi-fetch";
import createClient from "openapi-react-query";
import type { paths } from "./schema";

export const apiClient = createFetchClient<paths>({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  credentials: "include",
});

export const $api = createClient(apiClient);
