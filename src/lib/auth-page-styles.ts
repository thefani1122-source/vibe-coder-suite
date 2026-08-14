// Shared scoped CSS for the standalone "lamp" auth pages (login, forgot-password,
// reset-password) that live outside the Shell/RequireAuth layout. Trimmed from
// login.tsx's CSS to only the pieces a single-card utility page needs — the lamp
// SVG, theme cycling and tab-track styles stay local to login.tsx.
export const AUTH_PAGE_CSS = `
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
  overflow: auto;
  z-index: 50;
}

.lc-root .back-link {
  position: fixed; left: 1rem; top: 1rem; z-index: 51;
  display: inline-flex; align-items: center; gap: 6px;
  border-radius: 999px; border: 1px solid rgba(255,255,255,0.1);
  background: rgba(0,0,0,0.4); padding: 6px 12px;
  font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.8);
  text-decoration: none; backdrop-filter: blur(6px);
  transition: border-color .2s, background .2s, color .2s;
}
.lc-root .back-link:hover { border-color: rgba(255,255,255,0.25); background: rgba(0,0,0,0.6); color: #fff; }

.lc-root .scene-solo {
  position: relative; z-index: 2; min-height: 100vh;
  display: flex; align-items: center; justify-content: center; padding: 2rem;
}

.lc-root .card {
  flex: 0 1 390px; max-width: 390px; width: 100%;
  background: var(--card); border-radius: 28px;
  padding: 2.25rem 2.4rem 2rem;
  border: 1px solid rgba(255,255,255,0.04);
  box-shadow: 14px 14px 30px var(--dark), -10px -10px 26px var(--lift), inset 0 1px 0 rgba(255,255,255,0.04);
}

.lc-root .brand { display: flex; align-items: center; justify-content: center; gap: 9px; margin-bottom: 1.6rem; }
.lc-root .brand-icon { width: 38px; height: 38px; border-radius: 12px; background: var(--bg); box-shadow: 5px 5px 12px var(--dark), -5px -5px 12px var(--lift); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.lc-root .brand-name { font-family: 'Cormorant Garamond', serif; font-size: 1.7rem; font-weight: 600; letter-spacing: -0.01em; color: var(--text); line-height: 1; }
.lc-root .brand-name span { color: var(--c); font-style: italic; }

.lc-root .intro { font-size: 13px; color: var(--muted); text-align: center; margin: 0 0 1.4rem; line-height: 1.5; }

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

.lc-root .btn { width: 100%; padding: 14px; background: var(--c); border: none; border-radius: 50px; color: #050810; font-family: 'Outfit', sans-serif; font-size: 13.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; position: relative; overflow: hidden; box-shadow: 0 6px 22px rgba(var(--cr), 0.38); transition: transform 0.2s, box-shadow 0.2s; margin-bottom: 0.4rem; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; }
.lc-root .btn:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(var(--cr), 0.5); }
.lc-root .btn:active { transform: translateY(1px); box-shadow: inset 3px 3px 8px rgba(0,0,0,0.2); }
.lc-root .btn:disabled { opacity: 0.8; cursor: wait; }
.lc-root .btn-shim { position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent); transform: translateX(-100%); animation: lcShimmer 3s ease-in-out infinite; }
@keyframes lcShimmer { 0%{transform:translateX(-100%)} 50%,100%{transform:translateX(100%)} }

.lc-root .sent-box { text-align: center; padding: 0.5rem 0 0.25rem; }
.lc-root .sent-title { font-size: 15px; font-weight: 600; color: var(--text); margin: 0 0 8px; }
.lc-root .sent-body { font-size: 13px; color: var(--muted); line-height: 1.6; margin: 0 0 1.4rem; }
`;
