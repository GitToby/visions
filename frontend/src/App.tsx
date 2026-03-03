import { Route, Routes } from "react-router-dom";
import { AuthProvider } from "./features/auth/AuthContext";
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { HomePage } from "./pages/HomePage";
import { HouseDetailPage } from "./pages/HouseDetailPage";
import { LandingPage } from "./pages/LandingPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/houses" element={<HomePage />} />
          <Route path="/houses/:houseId" element={<HouseDetailPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
