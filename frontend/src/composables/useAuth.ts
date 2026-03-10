import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "~/lib/supabase";

export function useAuth() {
  const user = useState<User | null>("auth.user", () => null);
  const session = useState<Session | null>("auth.session", () => null);
  const isLoading = useState<boolean>("auth.loading", () => true);

  const init = async () => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    session.value = currentSession;
    user.value = currentSession?.user ?? null;
    isLoading.value = false;

    supabase.auth.onAuthStateChange((_event, newSession) => {
      session.value = newSession;
      user.value = newSession?.user ?? null;
    });
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    await navigateTo("/login");
  };

  return { user, session, isLoading, init, signInWithGoogle, signOut };
}
