import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { LoginModal } from "../features/auth/LoginModal";

export function LandingPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    if (session) {
      navigate("/properties", { replace: true });
    }
  }, [session, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <main className="flex-1 flex items-center px-6 py-16">
        <div className="max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <div>
            <h1 className="text-5xl font-bold tracking-tight mb-5 leading-tight">
              Reimagine your rooms
            </h1>
            <p className="text-xl text-base-content/60 mb-8">
              Upload a photo of any room, pick a design style, and get an
              AI-generated vision of what it could look like.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => setLoginOpen(true)}
            >
              Get started
            </button>
          </div>

          {/* Before / After mockup */}
          <div className="relative hidden lg:flex gap-3 items-end">
            {/* Before card */}
            <div className="flex-1 rounded-2xl overflow-hidden shadow-lg border border-base-300">
              <div className="aspect-4/3 bg-linear-to-br from-base-300 to-base-200 flex items-end">
                <div className="w-full bg-base-100/80 backdrop-blur-sm px-3 py-2 flex items-center gap-2">
                  <span className="badge badge-neutral badge-sm">Before</span>
                  <span className="text-xs text-base-content/50 truncate">
                    Living Room
                  </span>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex-none text-2xl text-primary font-bold pb-5 select-none">
              →
            </div>

            {/* After card */}
            <div className="flex-1 rounded-2xl overflow-hidden shadow-xl border border-primary/30 ring-2 ring-primary/20">
              <div className="aspect-4/3 bg-linear-to-br from-primary/30 to-secondary/20 flex items-end">
                <div className="w-full bg-base-100/80 backdrop-blur-sm px-3 py-2 flex items-center gap-2">
                  <span className="badge badge-primary badge-sm">After</span>
                  <span className="text-xs text-base-content/50 truncate">
                    Japandi
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* How it works */}
      <section className="bg-base-200 py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body items-center text-center gap-2">
                <div className="badge badge-primary badge-lg">1</div>
                <h3 className="card-title text-base">Create a project</h3>
                <p className="text-sm text-base-content/60">
                  Name your project and group all the rooms you want to
                  redesign.
                </p>
              </div>
            </div>
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body items-center text-center gap-2">
                <div className="badge badge-primary badge-lg">2</div>
                <h3 className="card-title text-base">Upload room photos</h3>
                <p className="text-sm text-base-content/60">
                  Add photos of each room. The AI preserves layout and
                  architecture.
                </p>
              </div>
            </div>
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body items-center text-center gap-2">
                <div className="badge badge-primary badge-lg">3</div>
                <h3 className="card-title text-base">Pick a style & generate</h3>
                <p className="text-sm text-base-content/60">
                  Choose from curated design styles and get AI-rendered results
                  in seconds.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
