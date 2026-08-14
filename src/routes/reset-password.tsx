import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/auth";
import { AUTH_PAGE_CSS } from "@/lib/auth-page-styles";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({ meta: [{ title: "Set a new password — Lampcode" }] }),
});

type Status = "verifying" | "ready" | "invalid";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("verifying");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  // Recovery links (PKCE `?code=` or implicit `#access_token=&type=recovery`) are
  // auto-processed by detectSessionInUrl (src/lib/supabase.ts). Supabase fires
  // PASSWORD_RECOVERY once that session is established, but event ordering isn't
  // guaranteed, so this accepts SIGNED_IN/INITIAL_SESSION too and falls back to
  // getSession()/manual hash parsing — mirroring auth.callback.tsx's chain, except
  // this page stays put and shows the new-password form instead of navigating away.
  useEffect(() => {
    let settled = false;
    let unsubscribe: (() => void) | null = null;

    const ready = () => {
      if (settled) return;
      settled = true;
      unsubscribe?.();
      setStatus("ready");
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION") &&
        session
      ) {
        useAuthStore.getState().setSession(session);
        ready();
      }
    });
    unsubscribe = () => subscription.unsubscribe();

    const tryFallbacks = async () => {
      await new Promise((r) => setTimeout(r, 400));
      if (settled) return;

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        useAuthStore.getState().setSession(data.session);
        ready();
        return;
      }

      const hash = window.location.hash.slice(1);
      if (hash) {
        const params = new URLSearchParams(hash);
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token) {
          const { data: sd } = await supabase.auth.setSession({
            access_token,
            refresh_token: refresh_token ?? "",
          });
          if (sd.session) {
            useAuthStore.getState().setSession(sd.session);
            ready();
          }
        }
      }
    };
    tryFallbacks();

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        unsubscribe?.();
        setStatus("invalid");
      }
    }, 8000);

    return () => {
      unsubscribe?.();
      clearTimeout(timeout);
    };
  }, []);

  const submit = async () => {
    if (pw.length < 8) return toast.error("Password must be at least 8 characters");
    if (pw !== confirm) return toast.error("Passwords do not match");
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Password updated");
      navigate({ to: "/", replace: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="lc-root is-on">
      <style>{AUTH_PAGE_CSS}</style>

      <div className="scene-solo">
        <div className="card">
          <div className="brand">
            <div className="brand-icon">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  d="M9 2h6l3 7a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5l3-7zm2 12h2v5a2 2 0 0 1-2 2 2 2 0 0 1-2-2h2v-5z"
                  fill="#10b981"
                />
              </svg>
            </div>
            <div className="brand-name">
              Lamp<span>code</span>
            </div>
          </div>

          {status === "verifying" && <p className="intro">Verifying your reset link…</p>}

          {status === "invalid" && (
            <div className="sent-box">
              <p className="sent-title">Link expired or invalid</p>
              <p className="sent-body">
                This password reset link is no longer valid. Request a new one to continue.
              </p>
              <Link to="/forgot-password" className="btn">
                Request new link
              </Link>
            </div>
          )}

          {status === "ready" && (
            <>
              <p className="intro">Choose a new password for your account.</p>
              <div className="field">
                <label className="field-lbl">New password</label>
                <div className="field-wrap">
                  <input
                    className="field-in"
                    type={show ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                  />
                  <button
                    type="button"
                    className="eye-btn"
                    onClick={() => setShow((v) => !v)}
                  >
                    <EyeIcon />
                  </button>
                </div>
              </div>
              <div className="field">
                <label className="field-lbl">Confirm password</label>
                <div className="field-wrap">
                  <input
                    className="field-in"
                    type={show ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                  />
                </div>
              </div>
              <button className="btn" onClick={submit} disabled={saving}>
                <span className="btn-shim" />
                {saving ? "Updating…" : "Update password"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const EyeIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
