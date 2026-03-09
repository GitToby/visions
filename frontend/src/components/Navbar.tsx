import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";

export function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="navbar bg-base-100 shadow-sm">
      <div className="flex-1">
        <Link to="/properties" className="btn btn-ghost text-xl font-bold">
          Visions
        </Link>
      </div>
      {user && (
        <div className="flex-none">
          <div className="dropdown dropdown-end">
            <button
              type="button"
              tabIndex={0}
              className="btn btn-ghost btn-circle avatar avatar-placeholder"
            >
              <div className="bg-neutral text-neutral-content w-10 rounded-full">
                <span className="text-sm font-medium">
                  {user.name?.charAt(0).toUpperCase() ??
                    user.email.charAt(0).toUpperCase()}
                </span>
              </div>
            </button>
            <ul
              tabIndex={0}
              className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow"
            >
              <li className="menu-title">
                <span className="truncate">{user.email}</span>
              </li>
              <li>
                <button type="button" onClick={() => void navigate("/profile")}>
                  Profile
                </button>
              </li>
              <li>
                <button type="button" onClick={signOut}>
                  Sign out
                </button>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
