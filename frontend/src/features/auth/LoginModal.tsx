import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

export function LoginModal({ open, onClose }: LoginModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
      setSent(false);
      setEmail("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setSent(true);
    setLoading(false);
  };

  return (
    <dialog ref={dialogRef} className="modal" onClose={onClose}>
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">Sign in to Visions</h3>
        {sent ? (
          <div className="text-center py-4">
            <p className="text-success font-medium mb-2">Check your email!</p>
            <p className="text-sm text-base-content/60">
              We sent a magic link to {email}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Email address</legend>
              <input
                type="email"
                className="input w-full"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="label">We'll send you a magic link to sign in</p>
            </fieldset>
            <div className="modal-action">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  "Send magic link"
                )}
              </button>
            </div>
          </form>
        )}
        {sent && (
          <div className="modal-action">
            <button type="button" className="btn" onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit">close</button>
      </form>
    </dialog>
  );
}
