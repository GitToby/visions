import { useQuery } from "@tanstack/react-query";
import createClient, { type Middleware } from "openapi-fetch";
import config from "../config";
import { supabase } from "../supabase";
import type { paths } from "./schema";

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }
    return request;
  },
};

export const apiClient = createClient<paths>({ baseUrl: config.api.baseUrl });
apiClient.use(authMiddleware);

export function useMe(enabled = true) {
  return useQuery({
    queryKey: ["get", "/auth/me"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/auth/me");
      if (error) throw error;
      return data;
    },
    enabled,
    retry: false,
  });
}

export function useHouses() {
  return useQuery({
    queryKey: ["get", "/houses"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/houses");
      if (error) throw error;
      return data;
    },
  });
}

export function useHouse(houseId: string) {
  return useQuery({
    queryKey: ["get", "/houses/{house_id}", houseId],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/houses/{house_id}", {
        params: { path: { house_id: houseId } },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!houseId,
  });
}

export function useStyles() {
  return useQuery({
    queryKey: ["get", "/styles"],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/styles");
      if (error) throw error;
      return data;
    },
  });
}

export function useGenerations(houseId: string) {
  return useQuery({
    queryKey: ["get", "/generation/houses/{house_id}", houseId],
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        "/generation/houses/{house_id}",
        { params: { path: { house_id: houseId } } }
      );
      if (error) throw error;
      return data;
    },
    enabled: !!houseId,
  });
}
