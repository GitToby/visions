import { Home } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="navbar bg-base-100 shadow-sm">
      <div className="container mx-auto flex max-w-6xl px-4">
        <div className="flex-1">
          <Link to="/" className="btn btn-ghost text-xl font-bold">
            <Home className="h-5 w-5" />
            Visions
          </Link>
        </div>
        {user && (
          <div className="flex-none">
            <div className="dropdown dropdown-end">
              <button
                type="button"
                tabIndex={0}
                className="avatar btn btn-circle btn-ghost"
              >
                <div className="w-10 rounded-full">
                  {user.picture ? (
                    <img src={user.picture} alt={user.name} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-primary text-sm font-bold text-primary-content">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </button>
              <ul
                tabIndex={0}
                className="menu dropdown-content menu-sm z-[1] mt-3 w-52 rounded-box bg-base-100 p-2 shadow"
              >
                <li className="menu-title">
                  <div className="font-semibold">{user.name}</div>
                  <div className="text-xs text-base-content/60">
                    {user.email}
                  </div>
                </li>
                <li>
                  <button type="button" onClick={logout}>
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
