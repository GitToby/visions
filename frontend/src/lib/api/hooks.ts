import { useQuery } from "@tanstack/react-query";
import createClient, { type Middleware } from "openapi-fetch";
import { queryKeys } from "@/lib/api/queryKeys";
import type { components, paths } from "@/lib/api/schema";
import config from "@/lib/config";
import { supabase } from "@/lib/supabase";

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
    queryKey: queryKeys.me,
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/auth/me");
      if (error) throw error;
      return data;
    },
    enabled,
    retry: false,
  });
}

export function useFeaturedProperties() {
  return useQuery({
    queryKey: queryKeys.featuredProperties,
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/properties/featured");
      if (error) throw error;
      return data;
    },
  });
}

export function useProperties() {
  return useQuery({
    queryKey: queryKeys.properties,
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/properties");
      if (error) throw error;
      return data;
    },
  });
}

type PropertyResponse = components["schemas"]["PropertyResponse"];

export function useProperty(
  propertyId: string,
  opts?: {
    refetchInterval?: (data: PropertyResponse | undefined) => number | false;
  }
) {
  return useQuery({
    queryKey: queryKeys.property(propertyId),
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/properties/{property_id}", {
        params: { path: { property_id: propertyId } },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
    refetchInterval: opts?.refetchInterval
      ? (query) => opts.refetchInterval!(query.state.data)
      : undefined,
  });
}

export function useStyles() {
  return useQuery({
    queryKey: queryKeys.styles,
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/styles");
      if (error) throw error;
      return data;
    },
  });
}

export function useGenerations(propertyId: string) {
  return useQuery({
    queryKey: queryKeys.generations(propertyId),
    queryFn: async () => {
      const { data, error } = await apiClient.GET(
        "/generation/property/{property_id}",
        { params: { path: { property_id: propertyId } } }
      );
      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const hasPending = data.some((j) => !j.completed_at && !j.error_message);
      return hasPending ? 5000 : false;
    },
  });
}
