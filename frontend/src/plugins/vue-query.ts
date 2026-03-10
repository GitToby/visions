import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";

export default defineNuxtPlugin((nuxtApp) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60, // 1 min
        retry: 1,
      },
    },
  });

  nuxtApp.vueApp.use(VueQueryPlugin, { queryClient });
});
