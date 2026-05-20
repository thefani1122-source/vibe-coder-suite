import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { authClient, dashboardCallbackURL } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Sign in — Lampcode" }] }),
});

const THEMES = [
  { hex: "#10b981", rgb: "16,185,129", name: "Emerald" },
  { hex: "#818cf8", rgb: "129,140,248", name: "Indigo" },
  { hex: "#c084fc", rgb: "192,132,252", name: "Violet" },
  { hex: "#f472b6", rgb: "244,114,182", name: "Rose" },
  { hex: "#fbbf24", rgb: "251,191,36", name: "Amber" },
  { hex: "#38bdf8", rgb: "56,189,248", name: "Sky" },
] as const;

function LoginPage() {
  const [on, setOn] = useState(false);
  const [cIdx, setCIdx] = useState(0);
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [pullKey, setPullKey] = useState(0);
  const [cardKey, setCardKey] = useState(0);
  const [showLiPw, setShowLiPw] = useState(false);
  const [showSuPw, setShowSuPw] = useState(false);
  const [suPw, setSuPw] = useState("");
  const [liEm, setLiEm] = useState("");
  const [liPw, setLiPw] = useState("");
  const [suFn, setSuFn] = useState("");
  const [suLn, setSuLn] = useState("");
  const [suEm, setSuEm] = useState("");
  const [liLoading, setLiLoading] = useState(false);
  const [suLoading, setSuLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { user, login, register } = useAuth();
  const navigate = useNavigate();

  const theme = THEMES[cIdx];

  // If already signed in, bounce to dashboard
  useEffect(() => {
    if (user) navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);

  // Apply CSS vars to scoped root
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    el.style.setProperty("--c", theme.hex);
    el.style.setProperty("--cr", theme.rgb);
  }, [theme]);

  const pullCord = () => {
    setPullKey((k) => k + 1);
    if (!on) {
      setOn(true);
      setCardKey((k) => k + 1);
      toast(`✦ Lampcode — ${theme.name} mode`);
    } else {
      const next = (cIdx + 1) % THEMES.length;
      setCIdx(next);
      setCardKey((k) => k + 1);
      toast(`Switched to ${THEMES[next].name} ✦`);
    }
  };

  const turnOff = () => {
    if (!on) return;
    setOn(false);
    toast("Lamp off — click cord to wake ☾");
  };

  const strength = (() => {
    const v = suPw;
    let s = 0;
    if (v.length >= 8) s++;
    if (/[A-Z]/.test(v)) s++;
    if (/[0-9]/.test(v)) s++;
    if (/[^a-zA-Z0-9]/.test(v)) s++;
    return s;
  })();
  const strCls = strength <= 1 ? "w" : strength <= 2 ? "m" : "g";

  const doLogin = async () => {
    if (!liEm || !liPw) return toast("Please fill in all fields.");
    setLiLoading(true);
    try {
      await login(liEm, liPw);
      toast("Welcome back!");
      navigate({ to: "/dashboard", replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      toast.error(msg);
    } finally {
      setLiLoading(false);
    }
  };

  const doSignup = async () => {
    if (!suFn || !suEm || !suPw) return toast("Please complete all fields.");
    if (suPw.length < 8) return toast("Password needs 8+ characters.");
    setSuLoading(true);
    try {
      await register({ email: suEm, password: suPw, name: `${suFn} ${suLn}`.trim() });
      toast("Account created! Signing you in…");
      await login(suEm, suPw);
      navigate({ to: "/dashboard", replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign up failed";
      toast.error(msg);
    } finally {
      setSuLoading(false);
    }
  };

  return (
    <div ref={rootRef} className={`lc-root ${on ? "is-on" : ""}`}>
      <style>{CSS}</style>

      <Link
        to="/dashboard"
        className="fixed left-4 top-4 z-50 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur transition hover:border-white/25 hover:bg-black/60 hover:text-white"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
        </svg>
        Back to Dashboard
      </Link>

      <div className="ambient">
        <div
          className="orb orb-1"
          style={{ background: `radial-gradient(circle, rgba(${theme.rgb},0.13), transparent 70%)` }}
        />
        <div
          className="orb orb-2"
          style={{ background: `radial-gradient(circle, rgba(${theme.rgb},0.10), transparent 70%)` }}
        />
        <div
          className="orb orb-3"
          style={{ background: `radial-gradient(circle, rgba(${theme.rgb},0.06), transparent 70%)` }}
        />
      </div>
      <div className="grain" />

      <div className="scene">
        {/* LAMP */}
        <div className="lamp-wrap">
          <motion.div
            animate={on ? { y: [0, -8, 0] } : { y: 0 }}
            transition={on ? { duration: 4, repeat: Infinity, ease: "easeInOut" } : { duration: 0.4 }}
            style={{ width: "100%" }}
          >
            <Lamp
              on={on}
              theme={theme}
              pullKey={pullKey}
              onPullCord={pullCord}
              onShadeClick={turnOff}
            />
          </motion.div>

          <div className="ground-glow" />

          <div className="hint-row">
            <span className="hint-text">Pull cord to change theme</span>
            <div className="dot-row">
              {THEMES.map((t, i) => (
                <div
                  key={t.name}
                  className={`cdot ${i === cIdx ? "active" : ""}`}
                  style={{ background: t.hex, color: t.hex }}
                  onClick={() => {
                    setCIdx(i);
                    setCardKey((k) => k + 1);
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* CARD */}
        <motion.div
          key={cardKey}
          className="card"
          initial={on ? { opacity: 0, scale: 0.78, y: 28, filter: "blur(8px)" } : false}
          animate={
            on
              ? { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }
              : { opacity: 0, scale: 0.82, y: 22, filter: "blur(6px)" }
          }
          transition={{ duration: 0.6, ease: [0.34, 1.2, 0.64, 1] }}
          style={{
            visibility: on ? "visible" : "hidden",
            pointerEvents: on ? "auto" : "none",
          }}
        >
          {/* Brand */}
          <div className="brand">
            <div className="brand-icon">
              <svg width="18" height="18" viewBox="0 0 24 24">
                {/* Lamp icon */}
                <path
                  d="M9 2h6l3 7a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5l3-7zm2 12h2v5a2 2 0 0 1-2 2 2 2 0 0 1-2-2h2v-5z"
                  fill={theme.hex}
                  style={{ transition: "fill .5s" }}
                />
              </svg>
            </div>
            <div className="brand-name">
              Lamp<span>code</span>
            </div>
          </div>

          {/* Tabs */}
          <div className={`tabs ${tab === "signup" ? "on-signup" : ""}`}>
            <div
              className="tab-pill"
              style={{
                background: theme.hex,
                boxShadow: `0 4px 16px rgba(${theme.rgb},0.38)`,
              }}
            />
            <button
              className={`tab-btn ${tab === "login" ? "active" : ""}`}
              onClick={() => setTab("login")}
            >
              Sign In
            </button>
            <button
              className={`tab-btn ${tab === "signup" ? "active" : ""}`}
              onClick={() => setTab("signup")}
            >
              Sign Up
            </button>
          </div>

          {/* Track */}
          <div className={`track ${tab === "signup" ? "on-signup" : ""}`}>
            {/* LOGIN PANE */}
            <div className="pane">
              <Socials />
              <Divider label="or with email" />

              <div className="field">
                <label className="field-lbl">Email</label>
                <div className="field-wrap">
                  <input
                    className="field-in"
                    type="email"
                    placeholder="you@lampcode.app"
                    value={liEm}
                    onChange={(e) => setLiEm(e.target.value)}
                  />
                  <span className="field-ico"><MailIcon /></span>
                </div>
              </div>

              <div className="field">
                <label className="field-lbl">Password</label>
                <div className="field-wrap">
                  <input
                    className="field-in"
                    type={showLiPw ? "text" : "password"}
                    placeholder="••••••••"
                    value={liPw}
                    onChange={(e) => setLiPw(e.target.value)}
                  />
                  <span className="field-ico"><LockIcon /></span>
                  <button
                    type="button"
                    className="eye-btn"
                    style={showLiPw ? { color: theme.hex } : undefined}
                    onClick={() => setShowLiPw((v) => !v)}
                  >
                    <EyeIcon />
                  </button>
                </div>
              </div>

              <div className="rem-row">
                <label className="chk-lbl">
                  <div className="chk-box"><input type="checkbox" /></div>
                  <span className="chk-txt">Keep me signed in</span>
                </label>
                <a href="#" className="fgt-link" onClick={(e) => e.preventDefault()}>
                  Forgot password?
                </a>
              </div>

              <button className="btn" onClick={doLogin} disabled={liLoading}>
                <span className="btn-shim" />
                {liLoading ? "Signing in…" : "Sign In"}
              </button>
              <p className="foot">
                No account?{" "}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setTab("signup");
                  }}
                >
                  Sign Up free
                </a>
              </p>
            </div>

            {/* SIGNUP PANE */}
            <div className="pane">
              <Socials />
              <Divider label="or create account" />

              <div className="name-row">
                <div className="field">
                  <label className="field-lbl">First name</label>
                  <div className="field-wrap">
                    <input
                      className="field-in"
                      type="text"
                      placeholder="John"
                      value={suFn}
                      onChange={(e) => setSuFn(e.target.value)}
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="field-lbl">Last name</label>
                  <div className="field-wrap">
                    <input
                      className="field-in"
                      type="text"
                      placeholder="Doe"
                      value={suLn}
                      onChange={(e) => setSuLn(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="field">
                <label className="field-lbl">Email</label>
                <div className="field-wrap">
                  <input
                    className="field-in"
                    type="email"
                    placeholder="you@lampcode.app"
                    value={suEm}
                    onChange={(e) => setSuEm(e.target.value)}
                  />
                  <span className="field-ico"><MailIcon /></span>
                </div>
              </div>

              <div className="field">
                <label className="field-lbl">Password</label>
                <div className="field-wrap">
                  <input
                    className="field-in"
                    type={showSuPw ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    value={suPw}
                    onChange={(e) => setSuPw(e.target.value)}
                  />
                  <span className="field-ico"><LockIcon /></span>
                  <button
                    type="button"
                    className="eye-btn"
                    style={showSuPw ? { color: theme.hex } : undefined}
                    onClick={() => setShowSuPw((v) => !v)}
                  >
                    <EyeIcon />
                  </button>
                </div>
                <div className="str-wrap">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`str-seg ${i < strength ? strCls : ""}`}
                    />
                  ))}
                </div>
              </div>

              <button
                className="btn"
                style={{ marginTop: 6 }}
                onClick={doSignup}
                disabled={suLoading}
              >
                <span className="btn-shim" />
                {suLoading ? "Creating…" : "Create Account"}
              </button>
              <p className="foot">
                Already a member?{" "}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setTab("login");
                  }}
                >
                  Sign In
                </a>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ─────── Sub components ─────── */

function Socials() {
  const oauth = async (provider: "google" | "github") => {
    try {
      const { data, error } = await authClient.signIn.social({
        provider,
        callbackURL: dashboardCallbackURL,
      });
      if (error) throw new Error(error.message || `${provider} sign-in failed`);
      // Better Auth returns the provider URL — perform a full redirect ourselves
      // so it works reliably inside the Lovable preview fetch proxy and on Vercel.
      const url = (data as { url?: string; redirect?: boolean } | null)?.url;
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : `${provider} sign-in failed`;
      toast.error(msg);
    }
  };
  return (
    <div className="socials">
      <button type="button" className="soc" onClick={() => oauth("google")}>
        <svg width="15" height="15" viewBox="0 0 24 24"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.19-1.79 4.13-1.15 1.15-2.93 2.4-6.05 2.4-4.83 0-8.6-3.89-8.6-8.72s3.77-8.72 8.6-8.72c2.6 0 4.51 1.03 5.91 2.35l2.31-2.31C18.75 1.44 16.13 0 12.48 0 5.87 0 .31 5.39.31 12s5.56 12 12.17 12c3.57 0 6.27-1.17 8.37-3.36 2.16-2.16 2.84-5.21 2.84-7.67 0-.76-.05-1.47-.17-2.05H12.48z"/></svg>
        Google
      </button>
      <button type="button" className="soc" onClick={() => oauth("github")}>
        <svg width="15" height="15" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.23c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 013-.4c1.02.01 2.04.14 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.21.69.82.57C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/></svg>
        GitHub
      </button>
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="div-row">
      <div className="div-line" />
      <span className="div-txt">{label}</span>
      <div className="div-line" />
    </div>
  );
}

const MailIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);
const LockIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const EyeIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

/* ─────── Lamp SVG (ported 1:1) ─────── */
function Lamp({
  on,
  theme,
  pullKey,
  onPullCord,
  onShadeClick,
}: {
  on: boolean;
  theme: { hex: string; rgb: string };
  pullKey: number;
  onPullCord: () => void;
  onShadeClick: () => void;
}) {
  const c = theme.hex;
  const cr = theme.rgb;
  return (
    <svg className="lamp-svg" viewBox="0 0 400 530" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="beamG" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={`rgba(${cr},0.52)`} />
          <stop offset="100%" stopColor={`rgba(${cr},0)`} />
        </linearGradient>
        <linearGradient id="poleG" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1c1508"/>
          <stop offset="22%" stopColor="#c8953a"/>
          <stop offset="44%" stopColor="#f7dfa0"/>
          <stop offset="60%" stopColor="#e2c060"/>
          <stop offset="80%" stopColor="#a87826"/>
          <stop offset="100%" stopColor="#141008"/>
        </linearGradient>
        <linearGradient id="baseG" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#141008"/>
          <stop offset="28%" stopColor="#c8953a"/>
          <stop offset="50%" stopColor="#f7dfa0"/>
          <stop offset="72%" stopColor="#c8953a"/>
          <stop offset="100%" stopColor="#141008"/>
        </linearGradient>
        <linearGradient id="shadeG" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#1e2236"/>
          <stop offset="55%" stopColor="#141727"/>
          <stop offset="100%" stopColor="#0c0e18"/>
        </linearGradient>
        <radialGradient id="beadG" cx="32%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#fff8e0"/>
          <stop offset="35%" stopColor="#e8c060"/>
          <stop offset="75%" stopColor="#9a6e18"/>
          <stop offset="100%" stopColor="#5c3e08"/>
        </radialGradient>
        <radialGradient id="bulbG" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={c} stopOpacity="0.95"/>
          <stop offset="55%" stopColor={c} stopOpacity="0.35"/>
          <stop offset="100%" stopColor={c} stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="blushG" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={c} stopOpacity="0.72"/>
          <stop offset="100%" stopColor={c} stopOpacity="0"/>
        </radialGradient>
        <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="7" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="softglow" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="16"/>
        </filter>
      </defs>

      <polygon className="beam" points="152,242 248,242 410,530 -10,530" fill="url(#beamG)" opacity="0.92"/>
      <polygon className="beam" points="168,242 232,242 345,530 55,530" fill="url(#beamG)" opacity="0.5"/>
      <circle className="beam bulb-glow" cx="200" cy="255" r="60" fill="url(#bulbG)" filter="url(#softglow)" opacity="0.7"/>

      <ellipse cx="202" cy="488" rx="85" ry="17" fill="rgba(0,0,0,0.5)"/>
      <ellipse cx="200" cy="480" rx="84" ry="16" fill="url(#baseG)"/>
      <ellipse cx="200" cy="474" rx="73" ry="12" fill="#141727"/>
      <ellipse cx="200" cy="470" rx="60" ry="9" fill="url(#baseG)" opacity="0.65"/>
      <ellipse cx="200" cy="466" rx="46" ry="6" fill="#0f1120"/>

      <rect x="204" y="176" width="10" height="292" fill="rgba(0,0,0,0.3)" rx="5"/>
      <rect x="193" y="173" width="14" height="294" fill="url(#poleG)" rx="7"/>
      <rect x="196" y="177" width="2.5" height="284" fill="rgba(255,255,255,0.16)" rx="1.5"/>
      <ellipse cx="200" cy="173" rx="14" ry="6" fill="#242030"/>
      <ellipse cx="200" cy="170" rx="11" ry="5" fill="url(#baseG)"/>
      <ellipse cx="200" cy="168" rx="8" ry="3.5" fill="#141727"/>
      <ellipse cx="200" cy="466" rx="14" ry="5" fill="url(#baseG)"/>
      <ellipse cx="200" cy="464" rx="10" ry="3.5" fill="#0f1120"/>

      {/* CORD */}
      <g key={pullKey} className="cord-g cord-pull" onClick={onPullCord}>
        <rect x="118" y="238" width="68" height="195" fill="transparent"/>
        <path
          d="M 152 242 C 148 266 156 292 150 316 C 145 336 153 356 151 376 C 150 390 151 400 151 408"
          fill="none" stroke="#666" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="5 4"
        />
        <ellipse cx="151" cy="400" rx="4" ry="2.8" fill="#555"/>
        <circle className="bead-ring" cx="151" cy="422" r="18" stroke={c} strokeWidth="2" fill="none"/>
        <circle cx="153" cy="425" r="13.5" fill="rgba(0,0,0,0.45)"/>
        <circle cx="151" cy="420" r="13.5" fill="url(#beadG)"/>
        <ellipse cx="145" cy="413" rx="6" ry="5" fill="rgba(255,255,255,0.62)" transform="rotate(-22,145,413)"/>
        <circle cx="151" cy="420" r="2.5" fill="rgba(255,255,255,0.22)"/>
        <text x="143" y="424" fontSize="11" fill="rgba(255,255,255,0.32)" fontFamily="sans-serif">✦</text>
      </g>

      {/* SHADE */}
      <path d="M 148 84 Q 200 66 252 84 C 290 142 314 194 322 242 Q 200 264 78 242 C 86 194 110 142 148 84 Z"
        fill="rgba(0,0,0,0.32)" transform="translate(5,8)"/>
      <path className="shade-fill" style={{ cursor: "pointer" }} onClick={onShadeClick}
        d="M 146 82 Q 200 62 254 82 C 294 140 316 194 324 240 Q 200 263 76 240 C 84 194 106 140 146 82 Z"
        fill="url(#shadeG)"
        filter={on ? `drop-shadow(0 14px 32px rgba(${cr}, 0.42))` : undefined}
      />
      <path d="M 146 82 C 106 140 84 194 76 240 Q 102 252 125 247 C 112 202 100 152 128 92 Z"
        fill="rgba(255,255,255,0.055)"/>
      <path d="M 162 78 Q 200 62 238 78 Q 200 72 162 78Z"
        fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>

      <path d="M 78 244 Q 200 267 322 244 Q 200 258 78 244Z" fill="rgba(0,0,0,0.3)"/>
      <path d="M 78 241 Q 200 264 322 241 Q 200 255 78 241Z" fill="url(#baseG)" opacity="0.9"/>
      <path d="M 96 238 Q 200 260 304 238 Q 200 250 96 238Z" fill="rgba(255,255,255,0.16)"/>
      <circle cx="132" cy="249" r="2.2" fill="url(#baseG)" opacity="0.95"/>
      <circle cx="165" cy="255" r="2.2" fill="url(#baseG)" opacity="0.95"/>
      <circle cx="200" cy="258" r="2.2" fill="url(#baseG)" opacity="0.95"/>
      <circle cx="235" cy="255" r="2.2" fill="url(#baseG)" opacity="0.95"/>
      <circle cx="268" cy="249" r="2.2" fill="url(#baseG)" opacity="0.95"/>

      <ellipse cx="200" cy="82" rx="23" ry="10" fill="#1c2030"/>
      <ellipse cx="200" cy="79" rx="21" ry="9" fill="url(#baseG)"/>
      <ellipse cx="200" cy="76" rx="16" ry="6.5" fill="#141727"/>
      <ellipse cx="200" cy="74" rx="11" ry="5" fill="url(#baseG)" opacity="0.75"/>

      <circle className="bulb-glow" cx="200" cy="224" r="62" fill="url(#bulbG)" filter="url(#softglow)" opacity="0.88"/>
      <ellipse cx="200" cy="218" rx="19" ry="23" fill="#10121e" stroke="#22253a" strokeWidth="1.5"/>
      <path d="M 197 230 Q 195 223 199 216 Q 203 210 200 204 Q 197 198 201 194"
        stroke="#2a2d40" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path className="bulb-glow"
        d="M 197 230 Q 195 223 199 216 Q 203 210 200 204 Q 197 198 201 194"
        stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" filter="url(#glow)"
      />
      <ellipse cx="200" cy="218" rx="19" ry="23" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
      <ellipse cx="193" cy="209" rx="5" ry="8" fill="rgba(255,255,255,0.06)" transform="rotate(-18,193,209)"/>

      {/* SLEEPY FACE */}
      <g className="face-off">
        <path d="M 163 160 Q 179 172 195 160" stroke="#353852" strokeWidth="4" strokeLinecap="round" fill="none"/>
        <path d="M 205 160 Q 221 172 237 160" stroke="#353852" strokeWidth="4" strokeLinecap="round" fill="none"/>
        <path d="M 165 157 Q 179 149 193 157" stroke="#272a3e" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <path d="M 207 157 Q 221 149 235 157" stroke="#272a3e" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <path d="M 190 174 Q 200 170 210 174" stroke="#353852" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <text x="250" y="115" fill="#252840" fontSize="10" fontWeight="800" fontFamily="Outfit,sans-serif">z</text>
        <text x="264" y="100" fill="#252840" fontSize="13" fontWeight="800" fontFamily="Outfit,sans-serif" opacity="0.7">z</text>
        <text x="278" y="84" fill="#252840" fontSize="16" fontWeight="800" fontFamily="Outfit,sans-serif" opacity="0.45">Z</text>
        <text x="262" y="122" fill="#252840" fontSize="12" fontFamily="sans-serif" opacity="0.35">🌙</text>
      </g>

      {/* HAPPY FACE */}
      <g className="face-on">
        <rect x="160" y="140" width="34" height="30" rx="15" fill="#f2f5ff" opacity="0.96"/>
        <rect x="206" y="140" width="34" height="30" rx="15" fill="#f2f5ff" opacity="0.96"/>
        <circle cx="177" cy="155" r="10.5" fill="#1a1d30"/>
        <circle cx="223" cy="155" r="10.5" fill="#1a1d30"/>
        <circle cx="178" cy="156" r="7" fill="#0a0c18"/>
        <circle cx="224" cy="156" r="7" fill="#0a0c18"/>
        <circle cx="171" cy="149" r="5" fill="rgba(255,255,255,0.96)"/>
        <circle cx="217" cy="149" r="5" fill="rgba(255,255,255,0.96)"/>
        <circle cx="183" cy="159" r="2.2" fill="rgba(255,255,255,0.6)"/>
        <circle cx="229" cy="159" r="2.2" fill="rgba(255,255,255,0.6)"/>
        <circle cx="168" cy="159" r="1.2" fill="rgba(255,255,255,0.35)"/>
        <circle cx="214" cy="159" r="1.2" fill="rgba(255,255,255,0.35)"/>
        <path d="M 160 146 Q 177 133 194 146" stroke="#0a0c18" strokeWidth="4" strokeLinecap="round" fill="none"/>
        <path d="M 206 146 Q 223 133 240 146" stroke="#0a0c18" strokeWidth="4" strokeLinecap="round" fill="none"/>
        <line x1="160" y1="146" x2="155" y2="140" stroke="#0a0c18" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="194" y1="146" x2="199" y2="140" stroke="#0a0c18" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="206" y1="146" x2="201" y2="140" stroke="#0a0c18" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="240" y1="146" x2="245" y2="140" stroke="#0a0c18" strokeWidth="2.5" strokeLinecap="round"/>
        <ellipse cx="147" cy="172" rx="17" ry="10" fill="url(#blushG)" opacity="0.78"/>
        <ellipse cx="253" cy="172" rx="17" ry="10" fill="url(#blushG)" opacity="0.78"/>
        <circle cx="140" cy="171" r="1.8" fill={c} opacity="0.5"/>
        <circle cx="147" cy="175" r="1.4" fill={c} opacity="0.38"/>
        <circle cx="154" cy="170" r="1.2" fill={c} opacity="0.32"/>
        <circle cx="246" cy="171" r="1.8" fill={c} opacity="0.5"/>
        <circle cx="253" cy="175" r="1.4" fill={c} opacity="0.38"/>
        <circle cx="260" cy="170" r="1.2" fill={c} opacity="0.32"/>
        <path d="M 181 175 C 183 196 217 196 219 175 Z" fill="rgba(0,0,0,0.38)"/>
        <path d="M 181 173 C 184 194 216 194 219 173 Z" fill="#0a0c18"/>
        <path d="M 185 176 C 186 188 214 188 215 176 Z" fill="rgba(255,255,255,0.92)"/>
        <line x1="196" y1="176" x2="195" y2="187" stroke="rgba(180,185,210,0.5)" strokeWidth="1"/>
        <line x1="205" y1="176" x2="206" y2="187" stroke="rgba(180,185,210,0.5)" strokeWidth="1"/>
        <ellipse cx="200" cy="188" rx="7.5" ry="4.5" fill={c} opacity="0.88"/>
        <ellipse cx="200" cy="187" rx="4" ry="2" fill="rgba(255,255,255,0.28)"/>
        <circle cx="181" cy="174" r="2.8" fill="rgba(0,0,0,0.22)"/>
        <circle cx="219" cy="174" r="2.8" fill="rgba(0,0,0,0.22)"/>
        <text className="sparkle" style={{ ["--dur" as never]: "2.1s", ["--del" as never]: "0s" }} x="122" y="128" fontSize="14" fill={c} fontFamily="sans-serif">✦</text>
        <text className="sparkle" style={{ ["--dur" as never]: "2.6s", ["--del" as never]: ".4s" }} x="258" y="120" fontSize="10" fill={c} fontFamily="sans-serif">✦</text>
        <text className="sparkle" style={{ ["--dur" as never]: "1.9s", ["--del" as never]: ".7s" }} x="104" y="168" fontSize="8" fill={c} fontFamily="sans-serif">✦</text>
        <text className="sparkle" style={{ ["--dur" as never]: "2.3s", ["--del" as never]: "1.0s" }} x="278" y="162" fontSize="12" fill={c} fontFamily="sans-serif">✦</text>
        <text className="sparkle" style={{ ["--dur" as never]: "2.8s", ["--del" as never]: ".25s" }} x="194" y="120" fontSize="10" fill={c} fontFamily="sans-serif">♡</text>
      </g>
    </svg>
  );
}

/* ─────── Scoped CSS (1:1 port) ─────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,600;1,400&display=swap');

.lc-root {
  --c: #10b981;
  --cr: 16,185,129;
  --bg: #13151f;
  --dark: #0c0e16;
  --lift: #1c1f2e;
  --card: #13151f;
  --text: #e6e8f4;
  --muted: #4e5472;
  --line: #1e2236;
  position: fixed; inset: 0;
  font-family: 'Outfit', sans-serif;
  background: var(--bg);
  color: var(--text);
  overflow: hidden;
  z-index: 50;
}
@media (max-width: 720px) { .lc-root { overflow-y: auto; position: relative; min-height: 100vh; } }

.lc-root .ambient { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.lc-root .orb { position: absolute; border-radius: 50%; filter: blur(70px); opacity: 0; transition: opacity 1.4s ease, background 0.8s ease; }
.lc-root .orb-1 { width: 500px; height: 500px; top: -180px; left: -100px; animation: lcDrift1 18s ease-in-out infinite; }
.lc-root .orb-2 { width: 420px; height: 420px; bottom: -140px; right: -80px; animation: lcDrift2 24s ease-in-out infinite; }
.lc-root .orb-3 { width: 260px; height: 260px; top: 50%; left: 50%; transform: translate(-50%,-50%); animation: lcDrift3 30s ease-in-out infinite; }
.lc-root.is-on .orb { opacity: 1; }
@keyframes lcDrift1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(30px,-20px); } }
@keyframes lcDrift2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-20px,30px); } }
@keyframes lcDrift3 { 0%,100% { transform: translate(-50%,-50%); } 50% { transform: translate(-50%,-52%) scale(1.15); } }

.lc-root .grain {
  position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: 0.025;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

.lc-root .scene {
  position: relative; z-index: 2;
  min-height: 100vh;
  display: flex; align-items: center; justify-content: center;
  gap: 4rem; padding: 2rem;
}
@media (max-width: 900px) { .lc-root .scene { gap: 2.5rem; } }
@media (max-width: 720px) { .lc-root .scene { flex-direction: column; min-height: unset; padding: 2rem 1.25rem 3rem; gap: 1.5rem; } }

.lc-root .lamp-wrap {
  flex: 0 0 auto;
  width: clamp(180px, 28vw, 290px);
  display: flex; flex-direction: column; align-items: center;
  user-select: none; position: relative;
}
@media (max-width: 720px) { .lc-root .lamp-wrap { width: min(220px, 55vw); } }
.lc-root .lamp-wrap svg { width: 100%; height: auto; overflow: visible; display: block; }

.lc-root .ground-glow {
  width: 70%; height: 20px; margin-top: -4px;
  background: radial-gradient(ellipse, rgba(var(--cr), 0.35), transparent 70%);
  filter: blur(8px); opacity: 0; transition: opacity 1s ease;
}
.lc-root.is-on .ground-glow { opacity: 1; }

.lc-root .hint-row {
  margin-top: 14px; display: flex; flex-direction: column; align-items: center; gap: 8px;
  opacity: 0; transition: opacity 0.6s ease 0.9s; pointer-events: none;
}
.lc-root.is-on .hint-row { opacity: 1; pointer-events: all; }
.lc-root .hint-text { font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted); }
.lc-root .dot-row { display: flex; gap: 7px; align-items: center; }
.lc-root .cdot { width: 9px; height: 9px; border-radius: 50%; transition: transform 0.3s, box-shadow 0.3s, opacity 0.3s; opacity: 0.5; cursor: pointer; }
.lc-root .cdot.active { transform: scale(1.6); box-shadow: 0 0 8px 2px currentColor; opacity: 1; }

.lc-root .beam { opacity: 0; transition: opacity 0.8s ease; pointer-events: none; }
.lc-root .bulb-glow { opacity: 0; transition: opacity 0.7s ease; }
.lc-root .face-off { transition: opacity 0.35s ease; }
.lc-root .face-on { opacity: 0; transition: opacity 0.4s ease 0.15s, transform 0.55s cubic-bezier(.34,1.56,.64,1); transform: scale(0.65); transform-origin: 200px 158px; }
.lc-root.is-on .beam { opacity: 1; }
.lc-root.is-on .bulb-glow { opacity: 1; }
.lc-root.is-on .face-off { opacity: 0; }
.lc-root.is-on .face-on { opacity: 1; transform: scale(1); }

.lc-root .cord-g { cursor: pointer; }
.lc-root .cord-pull { animation: lcCordPull 0.5s cubic-bezier(.36,.07,.19,.97); }
@keyframes lcCordPull { 0% { transform: translateY(0);} 35%{transform:translateY(20px);} 65%{transform:translateY(-5px);} 100%{transform:translateY(0);} }

.lc-root .bead-ring { opacity: 0; transition: opacity 0.5s ease, stroke 0.5s ease; }
.lc-root.is-on .bead-ring { opacity: 1; }

@keyframes lcStarTwinkle { 0%,100% { opacity: 0.5; transform: scale(1) rotate(0deg);} 50% { opacity: 1; transform: scale(1.4) rotate(18deg);} }
.lc-root .sparkle { animation: lcStarTwinkle var(--dur,2s) ease-in-out var(--del,0s) infinite; transform-box: fill-box; transform-origin: center; }

.lc-root .card {
  flex: 1; max-width: 390px; width: 100%;
  background: var(--card); border-radius: 28px;
  padding: 2.25rem 2.4rem 2rem;
  border: 1px solid rgba(255,255,255,0.04);
  box-shadow: 14px 14px 30px var(--dark), -10px -10px 26px var(--lift), inset 0 1px 0 rgba(255,255,255,0.04);
}

.lc-root .brand { display: flex; align-items: center; justify-content: center; gap: 9px; margin-bottom: 1.6rem; }
.lc-root .brand-icon { width: 38px; height: 38px; border-radius: 12px; background: var(--bg); box-shadow: 5px 5px 12px var(--dark), -5px -5px 12px var(--lift); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.lc-root .brand-name { font-family: 'Cormorant Garamond', serif; font-size: 1.7rem; font-weight: 600; letter-spacing: -0.01em; color: var(--text); line-height: 1; }
.lc-root .brand-name span { color: var(--c); transition: color 0.5s; font-style: italic; }

.lc-root .tabs { display: flex; gap: 0; background: var(--dark); border-radius: 50px; padding: 4px; position: relative; margin-bottom: 1.6rem; box-shadow: inset 4px 4px 8px rgba(0,0,0,0.4), inset -2px -2px 6px rgba(255,255,255,0.02); }
.lc-root .tab-pill { position: absolute; top: 4px; left: 4px; height: calc(100% - 8px); width: calc(50% - 4px); border-radius: 50px; transition: left 0.42s cubic-bezier(.34,1.3,.64,1), background 0.5s, box-shadow 0.5s; }
.lc-root .tabs.on-signup .tab-pill { left: calc(50%); }
.lc-root .tab-btn { flex: 1; padding: 10px 0; border: none; background: none; cursor: pointer; font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 600; letter-spacing: 0.04em; color: var(--muted); position: relative; z-index: 1; transition: color 0.3s; }
.lc-root .tab-btn.active { color: #fff; }

.lc-root .track { display: flex; overflow: hidden; }
.lc-root .pane { min-width: 100%; transition: transform 0.5s cubic-bezier(.34,1.1,.64,1); }
.lc-root .track.on-signup .pane { transform: translateX(-100%); }

.lc-root .socials { display: flex; gap: 9px; margin-bottom: 1.4rem; }
.lc-root .soc { flex: 1; padding: 11px 6px; background: var(--bg); border: none; border-radius: 13px; cursor: pointer; box-shadow: 5px 5px 12px var(--dark), -4px -4px 10px var(--lift); color: var(--muted); font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 7px; transition: color 0.25s, transform 0.2s, box-shadow 0.2s; }
.lc-root .soc:hover { color: var(--c); transform: translateY(-2px); }
.lc-root .soc:active { transform: translateY(1px); box-shadow: inset 4px 4px 8px var(--dark), inset -3px -3px 6px var(--lift); }
.lc-root .soc svg { flex-shrink: 0; fill: currentColor; }

.lc-root .div-row { display: flex; align-items: center; gap: 10px; margin-bottom: 1.3rem; }
.lc-root .div-line { flex: 1; height: 1px; background: var(--line); }
.lc-root .div-txt { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); white-space: nowrap; }

.lc-root .field { margin-bottom: 1.05rem; }
.lc-root .field-lbl { display: block; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; padding-left: 2px; font-weight: 600; }
.lc-root .field-wrap { position: relative; }
.lc-root .field-in { width: 100%; background: var(--dark); border: none; color: var(--text); padding: 13px 44px 13px 44px; border-radius: 50px; font-family: 'Outfit', sans-serif; font-size: 14px; box-shadow: inset 5px 5px 10px rgba(0,0,0,0.35), inset -4px -4px 8px rgba(255,255,255,0.025); outline: none; transition: box-shadow 0.3s; }
.lc-root .field-in::placeholder { color: var(--muted); }
.lc-root .field-in:focus { box-shadow: inset 5px 5px 10px rgba(0,0,0,0.35), inset -4px -4px 8px rgba(255,255,255,0.025), 0 0 0 2px rgba(var(--cr), 0.28); }
.lc-root .field-ico { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: var(--muted); pointer-events: none; transition: color 0.3s; }
.lc-root .field-in:focus ~ .field-ico { color: var(--c); }
.lc-root .eye-btn { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--muted); transition: color 0.25s; padding: 4px; }
.lc-root .eye-btn:hover { color: var(--c); }

.lc-root .name-row { display: flex; gap: 9px; }
.lc-root .name-row .field { flex: 1; }
.lc-root .name-row .field-in { padding: 13px 14px; }

.lc-root .str-wrap { display: flex; gap: 5px; margin-top: 7px; padding: 0 2px; }
.lc-root .str-seg { flex: 1; height: 3px; border-radius: 3px; background: var(--line); transition: background 0.4s; }
.lc-root .str-seg.w { background: #ef4444; }
.lc-root .str-seg.m { background: #f59e0b; }
.lc-root .str-seg.g { background: #10b981; }

.lc-root .rem-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.3rem; }
.lc-root .chk-lbl { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.lc-root .chk-box { width: 17px; height: 17px; border-radius: 5px; background: var(--dark); flex-shrink: 0; position: relative; box-shadow: 3px 3px 6px var(--dark), -2px -2px 5px var(--lift); }
.lc-root .chk-box input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width:100%; height:100%; }
.lc-root .chk-box::after { content: ''; position: absolute; left: 5px; top: 2px; width: 5px; height: 9px; border: 2px solid var(--c); border-left: none; border-top: none; transform: rotate(45deg) scale(0); transition: transform 0.22s cubic-bezier(.34,1.56,.64,1), border-color 0.5s; }
.lc-root .chk-box:has(input:checked)::after { transform: rotate(45deg) scale(1); }
.lc-root .chk-box:has(input:checked) { box-shadow: inset 3px 3px 6px var(--dark), inset -2px -2px 5px var(--lift); }
.lc-root .chk-txt { font-size: 12px; color: var(--muted); }
.lc-root .fgt-link { font-size: 12px; color: var(--c); text-decoration: none; transition: opacity 0.2s; }
.lc-root .fgt-link:hover { opacity: 0.7; }

.lc-root .btn { width: 100%; padding: 14px; background: var(--c); border: none; border-radius: 50px; color: #050810; font-family: 'Outfit', sans-serif; font-size: 13.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; position: relative; overflow: hidden; box-shadow: 0 6px 22px rgba(var(--cr), 0.38); transition: transform 0.2s, box-shadow 0.2s, background 0.5s; margin-bottom: 1.3rem; }
.lc-root .btn:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(var(--cr), 0.5); }
.lc-root .btn:active { transform: translateY(1px); box-shadow: inset 3px 3px 8px rgba(0,0,0,0.2); }
.lc-root .btn:disabled { opacity: 0.8; cursor: wait; }
.lc-root .btn-shim { position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent); transform: translateX(-100%); animation: lcShimmer 3s ease-in-out infinite; }
@keyframes lcShimmer { 0%{transform:translateX(-100%)} 50%,100%{transform:translateX(100%)} }

.lc-root .foot { text-align: center; font-size: 12px; color: var(--muted); }
.lc-root .foot a { color: var(--c); text-decoration: none; font-weight: 600; transition: opacity 0.2s; }
.lc-root .foot a:hover { opacity: 0.7; }
`;