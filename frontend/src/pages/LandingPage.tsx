import { ArrowRight, Palette, Sparkles, Upload, Wand2 } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { apiClient } from "@/lib/api/client";

const STEPS = [
  {
    icon: Upload,
    step: 1,
    title: "Upload a Photo",
    desc: "Take a photo of any room — bedroom, kitchen, living room, and more.",
  },
  {
    icon: Palette,
    step: 2,
    title: "Choose a Style",
    desc: "Pick from dozens of curated interior design aesthetics.",
  },
  {
    icon: Wand2,
    step: 3,
    title: "Get AI Designs",
    desc: "Receive stunning redesigns in seconds, powered by Google Gemini.",
  },
];

export function LandingPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/home", { replace: true });
    }
  }, [user, isLoading, navigate]);

  async function handleLogin() {
    // biome-ignore lint/suspicious/noExplicitAny: /auth/login not in schema until regenerated
    const { data } = await (apiClient as any).GET("/auth/login");
    if (data?.url) {
      window.location.href = data.url;
    }
  }

  return (
    <div className="min-h-screen bg-base-100">
      {/* Sticky navbar */}
      <div className="navbar sticky top-0 z-50 border-b border-base-300 bg-base-100/80 backdrop-blur-md">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="flex-1">
            <span className="flex items-center gap-2 text-xl font-bold">
              <Sparkles className="h-5 w-5 text-primary" />
              Visions
            </span>
          </div>
          <div className="flex-none">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleLogin}
            >
              Sign in
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="bg-gradient-to-b from-base-200 to-base-100 px-4 pb-24 pt-20 text-center sm:pb-32 sm:pt-28">
        <div className="container mx-auto max-w-3xl">
          <div className="badge badge-soft badge-primary mb-6 gap-1.5 px-4 py-3 text-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Powered by Google Gemini
          </div>
          <h1 className="mb-6 text-4xl leading-[1.1] font-extrabold tracking-tight text-base-content sm:text-6xl">
            Reimagine your home
            <br />
            <span className="text-primary">with AI</span>
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-lg text-base-content/60 sm:text-xl">
            Upload a photo of any room and explore stunning redesigns in seconds
            — no design experience required.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={handleLogin}
          >
            Get started free
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </section>

      {/* Demo — interactive before/after slider */}
      <section className="px-4 py-16 sm:py-20">
        <div className="container mx-auto max-w-5xl">
          <h2 className="mb-3 text-center text-2xl font-bold sm:text-3xl">
            See it in action
          </h2>
          <p className="mx-auto mb-10 max-w-lg text-center text-base-content/60">
            Drag the slider to compare an original room with an AI-generated
            redesign.
          </p>
          <div className="diff aspect-video max-w-2xl mx-auto overflow-hidden rounded-box shadow-xl">
            <div className="diff-item-1">
              <img
                src="https://picsum.photos/seed/livingroom42/800/450"
                alt="Original room"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="diff-item-2">
              <img
                src="https://picsum.photos/seed/moderndesign9/800/450"
                alt="AI redesigned room"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="diff-resizer" />
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {[
              "Modern",
              "Minimalist",
              "Scandinavian",
              "Industrial",
              "Bohemian",
            ].map((style) => (
              <span key={style} className="badge badge-outline">
                {style}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-base-200 px-4 py-16 sm:py-20">
        <div className="container mx-auto max-w-5xl">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-primary">
            How it works
          </p>
          <h2 className="mb-12 text-center text-2xl font-bold sm:text-3xl">
            Three steps to your dream room
          </h2>
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, step, title, desc }) => (
              <div
                key={step}
                className="flex flex-col items-center text-center"
              >
                <div className="relative mb-5">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <span className="badge badge-primary badge-sm absolute -top-2 -right-2 font-bold">
                    {step}
                  </span>
                </div>
                <h3 className="mb-2 font-semibold">{title}</h3>
                <p className="text-sm text-base-content/60">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-4 py-16 text-center sm:py-24">
        <div className="container mx-auto max-w-xl">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl">
            Ready to transform your space?
          </h2>
          <p className="mb-8 text-base-content/60">
            Get started in seconds with your Google account.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-lg w-full sm:w-auto"
            onClick={handleLogin}
          >
            Sign in with Google
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-base-300 py-6 text-center text-sm text-base-content/40">
        <p>© {new Date().getFullYear()} Visions — AI-powered interior design</p>
      </footer>
    </div>
  );
}
