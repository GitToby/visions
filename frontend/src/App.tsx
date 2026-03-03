import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./features/auth/AuthContext";
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import { HomePage } from "./pages/HomePage";
import { HouseDetailPage } from "./pages/HouseDetailPage";
import { LandingPage } from "./pages/LandingPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/home/:houseId" element={<HouseDetailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
