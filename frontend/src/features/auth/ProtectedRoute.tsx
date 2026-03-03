import { Navigate, Outlet } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "./AuthContext";

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
