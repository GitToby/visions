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
      navigate("/houses", { replace: true });
    }
  }, [session, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight mb-4">
          Reimagine your rooms
        </h1>
        <p className="text-xl text-base-content/60 max-w-xl mb-8">
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
      </main>

      {/* How it works */}
      <section className="bg-base-200 py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="badge badge-primary badge-lg mb-3">1</div>
              <h3 className="font-semibold mb-1">Create a project</h3>
              <p className="text-sm text-base-content/60">
                Name your project and group all the rooms you want to redesign.
              </p>
            </div>
            <div className="text-center">
              <div className="badge badge-primary badge-lg mb-3">2</div>
              <h3 className="font-semibold mb-1">Upload room photos</h3>
              <p className="text-sm text-base-content/60">
                Add photos of each room. The AI preserves layout and
                architecture.
              </p>
            </div>
            <div className="text-center">
              <div className="badge badge-primary badge-lg mb-3">3</div>
              <h3 className="font-semibold mb-1">Pick a style & generate</h3>
              <p className="text-sm text-base-content/60">
                Choose from curated design styles and get AI-rendered results in
                seconds.
              </p>
            </div>
          </div>
        </div>
      </section>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
