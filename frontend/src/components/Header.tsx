import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="navbar sticky top-0 z-40 border-b border-base-300 bg-base-100/90 backdrop-blur-md">
      <div className="container mx-auto flex max-w-6xl px-4">
        <div className="flex-1">
          <Link
            to="/home"
            className="flex items-center gap-2 text-xl font-bold"
          >
            <Sparkles className="h-5 w-5 text-primary" />
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
                <div className="w-9 rounded-full overflow-hidden">
                  {user.picture ? (
                    <img src={user.picture} alt={user.name} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-content">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </button>
              <ul
                tabIndex={0}
                className="menu dropdown-content menu-sm z-[1] mt-3 w-52 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg"
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
