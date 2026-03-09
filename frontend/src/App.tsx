import { Route, Routes } from "react-router-dom";
import { AuthProvider } from "./features/auth/AuthContext";
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { HomePage } from "./pages/HomePage";
import { LandingPage } from "./pages/LandingPage";
import { ProfilePage } from "./pages/ProfilePage";
import { PropertyDetailPage } from "./pages/PropertyDetailPage";
import { RoomViewPage } from "./pages/RoomViewPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/properties" element={<HomePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route
            path="/properties/:propertyId"
            element={<PropertyDetailPage />}
          />
          <Route
            path="/properties/:propertyId/room/:roomId"
            element={<RoomViewPage />}
          />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
