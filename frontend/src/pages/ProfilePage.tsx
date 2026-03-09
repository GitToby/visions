import { Link } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { useAuth } from "../features/auth/AuthContext";

export function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-xl mx-auto w-full px-6 py-10 space-y-6">
        <div className="breadcrumbs text-sm">
          <ul>
            <li>
              <Link to="/properties">My Projects</Link>
            </li>
            <li>Profile</li>
          </ul>
        </div>

        <div className="card card-border bg-base-100">
          <div className="card-body gap-4">
            <div className="flex items-center gap-4">
              <div className="avatar avatar-placeholder">
                <div className="bg-neutral text-neutral-content w-14 rounded-full">
                  <span className="text-xl font-medium">
                    {user.name?.charAt(0).toUpperCase() ??
                      user.email.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div>
                {user.name && (
                  <p className="font-semibold text-lg">{user.name}</p>
                )}
                <p className="text-base-content/60 text-sm">{user.email}</p>
              </div>
            </div>

            <div className="divider" />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Credits</p>
                <p className="text-2xl font-bold text-primary">
                  {user.balance}
                </p>
              </div>
              <button type="button" className="btn btn-primary" disabled>
                Top up now
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
