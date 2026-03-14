import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BeforeAfterDiff } from "@/components/BeforeAfterDiff";
import { useAuth } from "@/features/auth/AuthContext";
import { LoginModal } from "@/features/auth/LoginModal";
import config from "@/lib/config";

const ROOMS = [
  {
    room: "Dining Room",
    before: "/img/example-dining-room.webp",
    styles: [
      {
        style: "Industrial",
        after: "/img/example-dining-room-industrial.webp",
      },
      { style: "Japandi", after: "/img/example-dining-room-japandi.webp" },
    ],
  },
  {
    room: "Bathroom",
    before: "/img/example-bathroom.webp",
    styles: [
      { style: "Industrial", after: "/img/example-bathroom-industrial.webp" },
      { style: "Japandi", after: "/img/example-bathroom-japandi.webp" },
    ],
  },
];

export function LandingPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [loginOpen, setLoginOpen] = useState(false);
  const [activeRoom, setActiveRoom] = useState(0);
  const [activeStyle, setActiveStyle] = useState(0);

  useEffect(() => {
    if (session) {
      navigate("/properties", { replace: true });
    }
  }, [session, navigate]);

  const room = ROOMS[activeRoom];
  const ex = { ...room, ...room.styles[activeStyle] };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <main className="flex-1 flex items-center px-6 py-16">
        <div className="max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <div>
            <h1 className="text-5xl font-bold tracking-tight mb-5 leading-tight">
              Reimagine your rooms | {config.api.is_preview}
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

          {/* Before / After diff */}
          <div className="lg:flex flex-col gap-3">
            <BeforeAfterDiff
              beforeSrc={ex.before}
              afterSrc={ex.after}
              beforeLabel={ex.room}
              afterLabel={ex.style}
            />
            {/* Room + style switcher */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-2">
              <div className="join">
                {ROOMS.map((r, i) => (
                  <button
                    key={r.room}
                    type="button"
                    onClick={() => {
                      setActiveRoom(i);
                      setActiveStyle(0);
                    }}
                    className={`btn btn-xs join-item ${i === activeRoom ? "btn-primary" : "btn-ghost"}`}
                  >
                    {r.room}
                  </button>
                ))}
              </div>
              <div className="divider divider-horizontal hidden sm:flex"></div>
              <div className="join">
                {room.styles.map((s, i) => (
                  <button
                    key={s.style}
                    type="button"
                    onClick={() => setActiveStyle(i)}
                    className={`btn btn-xs join-item ${i === activeStyle ? "btn-neutral" : "btn-ghost"}`}
                  >
                    {s.style}
                  </button>
                ))}
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
                <h3 className="card-title text-base">
                  Pick a style &amp; generate
                </h3>
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
