import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/features/auth/AuthContext";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";

const AuthCallbackPage = lazy(() =>
  import("@/pages/auth/AuthCallbackPage").then((m) => ({
    default: m.AuthCallbackPage,
  }))
);
const HomePage = lazy(() =>
  import("@/pages/properties/HomePage").then((m) => ({ default: m.HomePage }))
);
const LandingPage = lazy(() =>
  import("@/pages/LandingPage").then((m) => ({ default: m.LandingPage }))
);
const ProfilePage = lazy(() =>
  import("@/pages/profile/ProfilePage").then((m) => ({
    default: m.ProfilePage,
  }))
);
const PropertyDetailPage = lazy(() =>
  import("@/pages/properties/PropertyDetailPage").then((m) => ({
    default: m.PropertyDetailPage,
  }))
);
const RoomViewPage = lazy(() =>
  import("@/pages/properties/room/RoomViewPage").then((m) => ({
    default: m.RoomViewPage,
  }))
);

export default function App() {
  return (
    <AuthProvider>
      <Suspense>
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
      </Suspense>
    </AuthProvider>
  );
}
