import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { AUTH_PAGE_CSS } from "@/lib/auth-page-styles";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
  head: () => ({ meta: [{ title: "Reset your password — Lampcode" }] }),
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!email) return toast("Enter your email address.");
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) {
        toast.error(error.message);
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lc-root is-on">
      <style>{AUTH_PAGE_CSS}</style>

      <Link to="/login" className="back-link">
        ← Back to sign in
      </Link>

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

          {sent ? (
            <div className="sent-box">
              <p className="sent-title">Check your email</p>
              <p className="sent-body">
                If an account exists for <strong>{email}</strong>, we&apos;ve sent a link to reset
                your password. It expires shortly, so use it soon.
              </p>
            </div>
          ) : (
            <>
              <p className="intro">
                Enter the email on your account and we&apos;ll send you a link to reset your
                password.
              </p>
              <div className="field">
                <label className="field-lbl">Email</label>
                <div className="field-wrap">
                  <input
                    className="field-in"
                    type="email"
                    placeholder="you@lampcode.app"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                  />
                  <span className="field-ico"><MailIcon /></span>
                </div>
              </div>
              <button className="btn" onClick={submit} disabled={loading}>
                <span className="btn-shim" />
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const MailIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);
