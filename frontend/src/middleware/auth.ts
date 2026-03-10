export default defineNuxtRouteMiddleware((to) => {
  const { session, isLoading } = useAuth();

  if (isLoading.value) return;
  if (!session.value && to.path !== "/login") {
    return navigateTo("/login");
  }
  if (session.value && to.path === "/login") {
    return navigateTo("/");
  }
});
