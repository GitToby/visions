import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { useMe } from "./lib/api/hooks";
import { supabase } from "./lib/supabase";

function UserPanel() {
  const { data: user, isLoading, error } = useMe();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="card bg-base-200 shadow-md p-6 w-full max-w-sm">
      <h2 className="text-lg font-semibold mb-3">User details</h2>
      {isLoading && <p className="text-sm text-base-content/60">Loading...</p>}
      {error && (
        <p className="text-sm text-error">Failed to load user from API</p>
      )}
      {user && (
        <dl className="text-sm space-y-1">
          <div className="flex gap-2">
            <dt className="font-medium w-16">Name</dt>
            <dd>{user.name}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium w-16">Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium w-16">ID</dt>
            <dd className="truncate text-base-content/60">{user.id}</dd>
          </div>
        </dl>
      )}
      <button
        type="button"
        className="btn btn-outline btn-sm mt-4"
        onClick={handleSignOut}
      >
        Sign out
      </button>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await supabase.auth.signInWithOtp({ email });
    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <p className="text-success text-sm">Check your email for a magic link!</p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 w-full max-w-sm"
    >
      <input
        type="email"
        className="input input-bordered w-full"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "Sending..." : "Send magic link"}
      </button>
    </form>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-bold">Hello World</h1>
      {session ? (
        <UserPanel />
      ) : (
        <div className="flex flex-col items-center gap-4">
          <p className="text-base-content/60 text-sm">Not logged in</p>
          <LoginForm />
        </div>
      )}
    </div>
  );
}
