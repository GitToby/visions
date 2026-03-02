import createClient from "openapi-fetch";
import { createMutationHook, createQueryHook } from "swr-openapi";
import type { paths } from "./schema";

export const apiClient = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  credentials: "include",
});

export const useQuery = createQueryHook(apiClient, "visions-api");
export const useMutation = createMutationHook(apiClient, "visions-api");
