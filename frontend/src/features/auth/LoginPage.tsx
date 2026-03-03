import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "./AuthContext";

export function LoginPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/", { replace: true });
    }
  }, [user, isLoading, navigate]);

  async function handleLogin() {
    // biome-ignore lint/suspicious/noExplicitAny: /auth/login not in schema until regenerated
    const { data } = await (apiClient as any).GET("/auth/login");
    if (data?.url) {
      window.location.href = data.url;
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-base-200">
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body items-center text-center">
          <h1 className="card-title text-3xl font-bold">Visions</h1>
          <p className="text-base-content/60">
            AI-powered interior design ideation
          </p>
          <div className="card-actions mt-4 w-full">
            <button
              type="button"
              className="btn btn-primary w-full"
              onClick={handleLogin}
            >
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
