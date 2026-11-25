import { SUBJECTS, UI_COPY } from '../data/subjects';

/**
 * Generates a fully self-contained single-file HTML ChSB platform
 * that is a 1-to-1 visual and functional copy of the React application:
 * - Same Google Fonts (Plus Jakarta Sans, DM Sans, IBM Plex Mono) + offline fallbacks
 * - Exact 3-zone sticky header (Fanlar, Test, Qo'llanma, Natijalar)
 * - Subject switcher bar + O'zbekcha / English toggle
 * - All 4 views: Subjects overview, 25-question Quiz (5 variants + Random Mix + Start over),
 *   Study Guide & Topics, and Results History persisted in localStorage
 */
export function downloadStandaloneHtml(): void {
  const safeSubjectsJson = JSON.stringify(SUBJECTS).replace(/<\/script/gi, '<\\/script');
  const safeCopyJson = JSON.stringify(UI_COPY).replace(/<\/script/gi, '<\\/script');

  const html = `<!doctype html>
<html lang="uz">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>7-Sinf ChSB Tayyorlov Platformasi · Grade 7 Exam Prep</title>
<meta name="author" content="Ibrohimbek Xujanazarov" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400..700&family=IBM+Plex+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet" />
<style>
  :root {
    --font-display: "Plus Jakarta Sans", system-ui, -apple-system, sans-serif;
    --font-body: "DM Sans", system-ui, -apple-system, sans-serif;
    --font-mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, monospace;
    --bg: #f8fafc;
    --surface: #ffffff;
    --border: #e2e8f0;
    --border-hover: #cbd5e1;
    --text: #0f172a;
    --text-2: #334155;
    --muted: #475569;
    --muted-2: #64748b;
    --teal: #0f766e;
    --teal-hover: #115e59;
    --ok: #047857;
    --ok-soft: #ecfdf5;
    --ok-border: #6ee7b7;
    --bad: #be123c;
    --bad-soft: #fff1f2;
    --bad-border: #fda4af;
  }
  *, *::before, *::after { box-sizing: border-box; }
  html { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
  body {
    margin: 0;
    font-family: var(--font-body);
    background-color: var(--bg);
    color: var(--text);
    line-height: 1.5;
  }
  h1, h2, h3, h4, .font-display {
    font-family: var(--font-display);
    text-wrap: balance;
    margin: 0;
  }
  .font-mono-num {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
  }
  button { font-family: inherit; }
  button:focus-visible {
    outline: 2px solid var(--teal);
    outline-offset: 2px;
  }
  .container {
    max-width: 1152px;
    margin: 0 auto;
    padding-left: 16px;
    padding-right: 16px;
  }
  @media (min-width: 640px) {
    .container { padding-left: 24px; padding-right: 24px; }
  }

  /* Sticky 3-Zone Header */
  .topbar {
    position: sticky;
    top: 0;
    z-index: 30;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
  }
  .topbar-inner {
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 32px;
  }
  .brand-btn {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.025em;
    color: var(--text);
    white-space: nowrap;
    flex-shrink: 0;
  }
  .app-shell {
    display: flex;
    min-height: calc(100vh - 104px);
  }
  .side-menu {
    width: 230px;
    flex-shrink: 0;
    background: var(--surface);
    border-right: 1px solid var(--border);
    padding: 16px;
  }
  .side-menu.closed { display: none; }
  @media (max-width: 900px) {
    .app-shell { flex-direction: column; }
    .side-menu {
      width: 100%;
      border-right: none;
      border-bottom: 1px solid var(--border);
    }
  }
  .content-col {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .nav-links {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .nav-link {
    display: flex;
    align-items: center;
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    border-radius: 8px;
    padding: 10px 12px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    color: var(--muted);
    transition: background-color 0.15s, color 0.15s;
  }
  .nav-link:hover { background: #f1f5f9; color: var(--text); }
  .nav-link.active { background: #f0fdfa; color: #115e59; font-weight: 700; }
  .cta-dark {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 14px;
    border: none;
    border-radius: 8px;
    background: var(--text);
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
    flex-shrink: 0;
    cursor: pointer;
    transition: background 0.15s;
  }
  .cta-dark:hover { background: #1e293b; }

  /* Subject Bar */
  .subject-bar {
    background: rgba(248, 250, 252, 0.75);
    border-bottom: 1px solid var(--border);
  }
  .subject-bar-inner {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-top: 12px;
    padding-bottom: 12px;
  }
  .subject-tabs {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  .sub-tab {
    min-height: 40px;
    padding: 8px 14px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text-2);
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }
  .sub-tab:hover { background: #f1f5f9; color: var(--text); }
  .sub-tab.active {
    background: var(--teal);
    border-color: var(--teal);
    color: #fff;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
  }
  .seg-group {
    display: inline-flex;
    background: rgba(226, 232, 240, 0.75);
    padding: 2px;
    border-radius: 8px;
  }
  .seg-btn {
    min-height: 36px;
    padding: 0 12px;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    background: transparent;
    color: var(--muted);
    transition: background 0.15s, color 0.15s;
  }
  .seg-btn:hover { color: var(--text); }
  .seg-btn.active {
    background: var(--surface);
    color: var(--text);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
  }

  /* Main */
  main.container {
    padding-top: 32px;
    padding-bottom: 48px;
  }
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
  }
  .btn-teal {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 42px;
    padding: 0 16px;
    border: none;
    border-radius: 8px;
    background: var(--teal);
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }
  .btn-teal:hover { background: var(--teal-hover); }
  .btn-outline {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 42px;
    padding: 0 14px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text-2);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }
  .btn-outline:hover:not(:disabled) { background: #f8fafc; }
  .btn-outline:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-dark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 42px;
    padding: 0 20px;
    border: none;
    border-radius: 8px;
    background: var(--text);
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }
  .btn-dark:hover { background: #1e293b; }

  /* Overview Grid */
  .hero-head {
    border-bottom: 1px solid var(--border);
    padding-bottom: 24px;
    margin-bottom: 32px;
  }
  .eyebrow {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--teal);
    margin: 0;
  }
  .hero-title {
    margin-top: 8px;
    font-size: 30px;
    font-weight: 800;
    letter-spacing: -0.025em;
    color: var(--text);
  }
  @media (min-width: 640px) { .hero-title { font-size: 36px; } }
  .hero-sub {
    margin-top: 12px;
    max-width: 768px;
    font-size: 16px;
    color: var(--muted);
  }
  .subjects-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
  }
  @media (min-width: 768px) { .subjects-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1024px) { .subjects-grid { grid-template-columns: repeat(3, 1fr); } }
  .subject-card {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
    transition: border-color 0.15s;
  }
  .subject-card:hover { border-color: var(--border-hover); }
  .subject-card.current { border-color: rgba(15, 118, 110, 0.6); }
  .icon-box {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background: #f1f5f9;
    color: var(--teal);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Quiz Section */
  .quiz-stack > * + * { margin-top: 20px; }
  .row-between {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }
  .row-center {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }
  .variant-bar {
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid #f1f5f9;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .var-btn {
    min-height: 36px;
    padding: 0 12px;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    background: #f1f5f9;
    color: var(--text-2);
    transition: background 0.15s, color 0.15s;
  }
  .var-btn:hover { background: #e2e8f0; color: var(--text); }
  .var-btn.active { background: var(--text); color: #fff; }
  .diff-btn {
    min-height: 36px;
    padding: 0 14px;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    background: transparent;
    color: var(--muted);
    transition: background 0.15s, color 0.15s;
  }
  .diff-btn:hover { color: var(--text); }
  .diff-btn.active-easy { background: #047857; color: #fff; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08); }
  .diff-btn.active-medium { background: #d97706; color: #fff; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08); }
  .diff-btn.active-hard { background: #be123c; color: #fff; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08); }
  .meta-line {
    margin-top: 16px;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 8px;
    font-size: 12px;
    font-weight: 500;
    color: var(--muted-2);
  }
  .qnav-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px;
  }
  .qnav-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 6px;
  }
  @media (min-width: 640px) { .qnav-grid { grid-template-columns: repeat(10, minmax(0, 1fr)); } }
  @media (min-width: 768px) { .qnav-grid { grid-template-columns: repeat(25, minmax(0, 1fr)); } }
  .qnum {
    height: 36px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text-2);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .qnum:hover { background: #f8fafc; }
  .qnum.cur { background: var(--text); border-color: var(--text); color: #fff; }
  .qnum.ans { background: #f1f5f9; border-color: #94a3b8; color: var(--text); }
  .qnum.ok { background: var(--ok-soft); border-color: #6ee7b7; color: var(--ok); }
  .qnum.bad { background: var(--bad-soft); border-color: #fda4af; color: var(--bad); }

  .q-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
  }
  @media (min-width: 640px) { .q-card { padding: 32px; } }
  .q-passage {
    margin-top: 14px;
    max-height: 280px;
    overflow-y: auto;
    white-space: pre-wrap;
    border: 1px solid var(--border);
    border-left: 4px solid var(--teal);
    border-radius: 10px;
    background: #f8fafc;
    padding: 14px 16px;
    font-size: 14px;
    line-height: 1.65;
    color: var(--text-2);
  }
  .q-title {
    margin-top: 12px;
    font-size: 20px;
    font-weight: 700;
    line-height: 1.35;
    color: var(--text);
    white-space: pre-line;
  }
  @media (min-width: 640px) { .q-title { font-size: 24px; } }
  .opt-list { margin-top: 24px; display: flex; flex-direction: column; gap: 12px; }
  .opt-btn {
    width: 100%;
    min-height: 52px;
    padding: 14px 16px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: #1e293b;
    font-size: 16px;
    text-align: left;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }
  .opt-btn:hover:not(:disabled) { border-color: #94a3b8; background: #f8fafc; }
  .opt-btn:disabled { cursor: default; }
  .opt-btn.sel { border-color: var(--text); background: #f1f5f9; color: var(--text); font-weight: 600; }
  .opt-btn.ok { border-color: #10b981; background: var(--ok-soft); color: #064e3b; font-weight: 600; }
  .opt-btn.bad { border-color: #f43f5e; background: var(--bad-soft); color: #881337; font-weight: 600; }
  .opt-btn.dim { color: var(--muted-2); }
  .explain-box {
    margin-top: 20px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: #f8fafc;
    padding: 16px;
    font-size: 14px;
    color: var(--text-2);
  }
  .q-footer {
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid #f1f5f9;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  /* Results & Tables */
  .stats-grid {
    margin-top: 20px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
  @media (min-width: 640px) { .stats-grid { grid-template-columns: repeat(4, 1fr); } }
  .stat-box {
    border: 1px solid var(--border);
    border-radius: 8px;
    background: #f8fafc;
    padding: 16px;
  }
  .stat-val {
    margin-top: 4px;
    font-size: 28px;
    font-weight: 700;
    color: var(--text);
  }
  .table-wrap {
    margin-top: 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow-x: auto;
    background: var(--surface);
  }
  table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; }
  thead {
    background: #f8fafc;
    border-bottom: 1px solid var(--border);
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted-2);
  }
  th, td { padding: 11px 16px; border-bottom: 1px solid #f1f5f9; }
  tbody tr:last-child td { border-bottom: none; }
  .review-item {
    border: 1px solid var(--border);
    border-radius: 8px;
    background: rgba(248, 250, 252, 0.55);
    padding: 16px;
  }

  /* Study Guide */
  .guide-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
  }
  @media (min-width: 1024px) {
    .guide-grid { grid-template-columns: 4fr 8fr; align-items: start; }
  }
  .topic-li {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding-bottom: 8px;
    margin-bottom: 8px;
    border-bottom: 1px solid #f1f5f9;
    font-size: 14px;
    color: var(--text-2);
  }
  .topic-li:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
  .dot-li {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 14px;
    color: var(--text-2);
    margin-bottom: 10px;
  }
  .dot-li:last-child { margin-bottom: 0; }
  .teal-dot {
    width: 6px;
    height: 6px;
    border-radius: 9999px;
    background: var(--teal);
    margin-top: 8px;
    flex-shrink: 0;
  }

  body.quiz-locked {
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
  }

  @media print {
    .topbar, .subject-bar, .no-print { display: none !important; }
    body { background: #fff; }
    body.quiz-locked * { display: none !important; }
    body.quiz-locked::after {
      content: "Test paytida chop etish taqiqlanadi / Printing is disabled during an active quiz";
      display: block;
      padding: 48px 24px;
      font-size: 20px;
      font-weight: 700;
      color: #be123c;
      text-align: center;
    }
  }
</style>
</head>
<body>
<div role="alert" style="border-bottom:1px solid #9f1239;background:#be123c;padding:8px 16px;color:#fff">
  <div class="container" style="display:flex;align-items:center;justify-content:center;gap:8px;text-align:center;font-size:13px;font-weight:600;line-height:1.35">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffe4e6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
    <span id="topWarnText">OGOHLANTIRISH: Test paytida boshqa sayt, oyna yoki desktopga 3 soniyadan ortiq o‘tish, to‘liq ekrandan chiqish, skrinshot olish va Pusk / Win+G bosish taqiqlanadi (3 ta ogohlantirish tugasa, natija darhol 0 bo‘ladi).</span>
  </div>
</div>
<header class="topbar">
  <div class="topbar-inner" style="padding:0 24px">
    <div style="display:flex;align-items:center;gap:12px">
      <button type="button" class="btn-outline" id="menuToggleBtn" style="padding:8px 10px" aria-label="Toggle menu">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>
      </button>
      <button type="button" class="brand-btn" id="brandHomeBtn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f766e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>
        <span id="brandText">7-Sinf ChSB</span>
      </button>
    </div>

    <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
      <button type="button" class="btn-outline" id="fsBtn" title="Fullscreen" style="padding:8px 10px" aria-label="Fullscreen">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
      </button>
      <button type="button" class="cta-dark" id="printBtn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
        <span id="printBtnText">Chop etish</span>
      </button>
    </div>
  </div>
</header>

<div class="app-shell">
  <aside class="side-menu" id="sideMenu">
    <nav class="nav-links" aria-label="Primary" id="topNav"></nav>
  </aside>
  <div class="content-col">
    <div class="subject-bar">
      <div class="container subject-bar-inner">
        <div class="subject-tabs" id="subjectTabs" role="tablist"></div>
        <div class="seg-group" role="group">
          <button type="button" class="seg-btn" id="langUz">O'zbekcha</button>
          <button type="button" class="seg-btn" id="langEn">English</button>
        </div>
      </div>
    </div>

    <main class="container" id="app" style="width:100%;flex:1"></main>
    <footer style="border-top:1px solid var(--border);background:rgba(255,255,255,0.65);padding:16px;text-align:center;font-size:12px;font-weight:500;color:#64748b">
      Developer: <strong style="color:#334155">Ibrohimbek Xujanazarov</strong>
    </footer>
  </div>
</div>

<script>
const SUBJECTS = ${safeSubjectsJson};
const UI_COPY = ${safeCopyJson};
const HISTORY_KEY = 'g7_chsb_history_v1';
const LANG_KEY = 'g7_chsb_lang_v1';
const LETTERS = ['A', 'B', 'C', 'D'];

const ICONS = {
  math: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>',
  history: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>',
  science: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/></svg>',
  computing: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>',
  english: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>',
  uzbek: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>',
  book: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>',
  rotate: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>',
  arrowRight: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
  chevLeft: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
  chevRight: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
  check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
  cross: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
  trash: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>'
};

let lang = 'uz';
try {
  if (localStorage.getItem(LANG_KEY) === 'en') lang = 'en';
} catch (e) {}

let history = [];
try {
  const raw = localStorage.getItem(HISTORY_KEY);
  const parsed = raw ? JSON.parse(raw) : [];
  if (Array.isArray(parsed)) history = parsed;
} catch (e) {}

let activeView = 'dashboard';
let activeSubjectId = SUBJECTS[0].id;
let difficulty = 'easy';
let variant = 1;
let mode = 'practice';
let activeQuestions = [];
let answers = {};
let currentIdx = 0;
let started = false;
let submitted = false;
let reviewFilter = 'all';
let prevIds = [];
let seconds = 0;
let timerId = null;
const MAX_WARNINGS = 3;
const GRACE_MS = 3000;
const BASE_TITLE = document.title;
let warningsLeft = MAX_WARNINGS;
let isAway = false;
let graceSecondsLeft = 3;
let awayStartedAt = null;
let deductedThisAway = 0;
let warningModalInfo = null;
let forcedZero = false;
let showForcedZeroOverlay = false;
let fullscreenLost = false;
let wasFsInTest = false;
let securityViolationMsg = null;
let lastShotPenaltyAt = 0;
let pendingNavAction = null;
let blurConfirmId = null;
let awayIntervalId = null;

function isFsActive() {
  return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
}
function lockSystemKeys() {
  try {
    if (navigator.keyboard && navigator.keyboard.lock) {
      Promise.resolve(navigator.keyboard.lock(['Escape', 'F11', 'MetaLeft', 'MetaRight'])).catch(() => {});
    }
  } catch (e) {}
}
function unlockSystemKeys() {
  try {
    if (navigator.keyboard && navigator.keyboard.unlock) navigator.keyboard.unlock();
  } catch (e) {}
}
function enterFullScreen(withKeyLock) {
  if (isFsActive()) {
    if (withKeyLock) lockSystemKeys();
    return;
  }
  try {
    const el = document.documentElement;
    if (el.requestFullscreen) {
      Promise.resolve(el.requestFullscreen()).then(() => {
        if (withKeyLock) lockSystemKeys();
        if (activeView === 'quiz' && started && !submitted) {
          wasFsInTest = true;
          fullscreenLost = false;
          render();
        }
      }).catch(() => {});
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
      if (withKeyLock) lockSystemKeys();
    }
  } catch (e) {}
}
function toggleFullScreen() {
  const running = activeView === 'quiz' && started && !submitted;
  if (isFsActive()) {
    if (running) {
      enterFullScreen(true);
      return;
    }
    try {
      unlockSystemKeys();
      if (document.exitFullscreen) Promise.resolve(document.exitFullscreen()).catch(() => {});
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch (e) {}
  } else {
    enterFullScreen(running);
  }
}

function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtMath(str) {
  return esc(str)
    .replace(/\\^\\(([^()]*(?:\\([^()]*\\)[^()]*)*)\\)/g, '<sup style="font-size:0.75em;font-weight:600;color:#115e59;margin-left:1px">$1</sup>')
    .replace(/\\^([a-zA-Z0-9−+\\-]+)/g, '<sup style="font-size:0.75em;font-weight:600;color:#115e59;margin-left:1px">$1</sup>')
    .replace(/\\b([a-zA-Z])_([a-zA-Z0-9]+)\\b/g, '$1<sub style="font-size:0.75em;font-weight:600;color:#115e59;margin-left:1px">$2</sub>');
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function loc(v) {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object') return lang === 'uz' ? v.uz : v.en;
  return '';
}

function locOpts(v) {
  if (Array.isArray(v)) return v;
  if (v && typeof v === 'object') return lang === 'uz' ? v.uz : v.en;
  return [];
}

function getSubject(id) {
  return SUBJECTS.find(s => s.id === (id || activeSubjectId)) || SUBJECTS[0];
}

function nextVariant(v) {
  if (v === 5) return 'random';
  if (v === 'random') return 1;
  return v + 1;
}

function diffLabel(d) {
  if (d === 'easy') return lang === 'uz' ? 'Oson' : 'Easy';
  if (d === 'medium') return lang === 'uz' ? "O'rta" : 'Medium';
  return lang === 'uz' ? 'Qiyin' : 'Hard';
}

function diffColor(d) {
  if (d === 'easy') return '#047857';
  if (d === 'medium') return '#b45309';
  return '#be123c';
}

function variantLabel(v) {
  return v === 'random' ? UI_COPY[lang].randomVariant : (UI_COPY[lang].variant + ' ' + v);
}

function fmtTime(s) {
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

function gradeOf(pct) {
  if (pct >= 86) return { grade: 5, label: { uz: "A'lo", en: 'Excellent' } };
  if (pct >= 65) return { grade: 4, label: { uz: 'Yaxshi', en: 'Good' } };
  return { grade: 3, label: { uz: 'Qoniqarsiz', en: 'Unsatisfactory' } };
}

function interleaveByTopic(items) {
  const byTopic = {};
  const topicKeys = [];
  items.forEach(item => {
    if (!byTopic[item.topic]) {
      byTopic[item.topic] = [];
      topicKeys.push(item.topic);
    }
    byTopic[item.topic].push(item);
  });
  const out = [];
  let added = true;
  while (added) {
    added = false;
    topicKeys.forEach(k => {
      const next = byTopic[k].shift();
      if (next) {
        out.push(next);
        added = true;
      }
    });
  }
  return out;
}

function buildQuiz(sub, diffKey, varKey) {
  const filtered = sub.questions.filter(q => q.difficulty === diffKey);
  const basePool = filtered.length >= 25 ? filtered : sub.questions;
  const pool = interleaveByTopic(basePool);
  let picked = [];

  if (varKey === 1) {
    picked = pool.slice(0, 25);
  } else if (varKey === 2) {
    const sl = pool.slice(25, 50);
    picked = sl.length === 25 ? sl : pool.slice(-25);
  } else if (varKey === 3) {
    picked = pool.filter((_, idx) => idx % 2 === 0).slice(0, 25);
  } else if (varKey === 4) {
    picked = pool.filter((_, idx) => idx % 2 === 1).slice(0, 25);
  } else if (varKey === 5) {
    const seenIdx = {};
    const n = pool.length;
    for (let step = 0; picked.length < 25 && step < n * 2; step++) {
      let idx = (step * 3) % n;
      while (seenIdx[idx] && Object.keys(seenIdx).length < n) {
        idx = (idx + 1) % n;
      }
      if (!seenIdx[idx]) {
        seenIdx[idx] = true;
        picked.push(pool[idx]);
      }
    }
  } else {
    const fresh = pool.filter(q => !prevIds.includes(q.id));
    const candidate = fresh.length >= 25 ? fresh : pool;
    const byTopic = {};
    shuffle(candidate).forEach(q => {
      if (!byTopic[q.topic]) byTopic[q.topic] = [];
      byTopic[q.topic].push(q);
    });
    const queues = shuffle(Object.values(byTopic));
    picked = [];
    const seen = {};
    let added = true;
    while (picked.length < 25 && added) {
      added = false;
      queues.forEach(qArr => {
        if (picked.length >= 25) return;
        const item = qArr.shift();
        if (item && !seen[item.id]) {
          picked.push(item);
          seen[item.id] = true;
          added = true;
        }
      });
    }
    if (picked.length < 25) {
      shuffle(pool).forEach(q => {
        if (picked.length < 25 && !seen[q.id]) {
          picked.push(q);
          seen[q.id] = true;
        }
      });
    }
  }
  picked = shuffle(picked);
  prevIds = picked.map(q => q.id);
  return picked.map(q => ({ source: q, order: shuffle([0, 1, 2, 3]) }));
}

function resetFocusGuard() {
  if (blurConfirmId) { clearTimeout(blurConfirmId); blurConfirmId = null; }
  awayStartedAt = null;
  deductedThisAway = 0;
  warningsLeft = MAX_WARNINGS;
  isAway = false;
  graceSecondsLeft = 3;
  warningModalInfo = null;
  forcedZero = false;
  showForcedZeroOverlay = false;
  fullscreenLost = false;
  wasFsInTest = isFsActive();
  securityViolationMsg = null;
  pendingNavAction = null;
  document.title = BASE_TITLE;
}

function startSession(diffKey, varKey) {
  difficulty = diffKey || difficulty;
  variant = varKey;
  activeQuestions = buildQuiz(getSubject(), difficulty, variant);
  answers = {};
  currentIdx = 0;
  started = false;
  submitted = false;
  reviewFilter = 'all';
  seconds = 0;
  resetFocusGuard();
  if (timerId) clearInterval(timerId);
  timerId = setInterval(() => {
    if (started && !submitted && activeView === 'quiz') {
      seconds++;
      const el = document.getElementById('timerVal');
      if (el) el.textContent = UI_COPY[lang].timeLabel + ': ' + fmtTime(seconds);
    }
  }, 1000);
  render();
}

function beginQuiz() {
  resetFocusGuard();
  seconds = 0;
  started = true;
  enterFullScreen(true);
  render();
}

function guardQuizLeave(action) {
  if (activeView === 'quiz' && started && !submitted) {
    pendingNavAction = action;
    render();
    return;
  }
  action();
}

function cancelLeaveModal() {
  pendingNavAction = null;
  render();
}

function confirmFinishAndLeave() {
  const act = pendingNavAction;
  pendingNavAction = null;
  submitQuiz();
  if (typeof act === 'function') act();
}

function saveHistory() {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {}
}

function renderChrome() {
  const copy = UI_COPY[lang];
  const topWarnEl = document.getElementById('topWarnText');
  if (topWarnEl) {
    topWarnEl.textContent = lang === 'uz'
      ? 'OGOHLANTIRISH: Test paytida boshqa sayt, oyna yoki desktopga 3 soniyadan ortiq o‘tish, to‘liq ekrandan chiqish, skrinshot olish va Pusk / Win+G bosish taqiqlanadi (3 ta ogohlantirish tugasa, natija darhol 0 bo‘ladi).'
      : 'WARNING: During a test, leaving to another tab, window, or desktop for over 3 seconds, exiting fullscreen, taking screenshots, or pressing Win / Win+G is prohibited (3 warnings used = immediate 0 score).';
  }
  document.getElementById('brandText').textContent = copy.brand;
  document.getElementById('printBtnText').textContent = lang === 'uz' ? 'Chop etish' : 'Print / PDF';
  document.getElementById('langUz').className = 'seg-btn' + (lang === 'uz' ? ' active' : '');
  document.getElementById('langEn').className = 'seg-btn' + (lang === 'en' ? ' active' : '');

  const navItems = [
    { id: 'dashboard', label: copy.navHome || 'Dashboard' },
    { id: 'subjects', label: copy.navSubjects },
    { id: 'quiz', label: copy.navTest },
    { id: 'guide', label: copy.navGuide },
    { id: 'results', label: copy.navResults },
  ];
  document.getElementById('topNav').innerHTML = navItems.map(item =>
    '<button type="button" class="nav-link' + (activeView === item.id ? ' active' : '') + '" onclick="setView(\\'' + item.id + '\\')">' + esc(item.label) + '</button>'
  ).join('');

  document.getElementById('subjectTabs').innerHTML = SUBJECTS.map(s =>
    '<button type="button" role="tab" aria-selected="' + (s.id === activeSubjectId) + '" class="sub-tab' + (s.id === activeSubjectId ? ' active' : '') + '" onclick="selectSubject(\\'' + esc(s.id) + '\\')">' + esc(loc(s.shortLabel)) + '</button>'
  ).join('');
}

function setView(v) {
  if (v === activeView) return;
  guardQuizLeave(() => {
    activeView = v;
    render();
  });
}

function selectSubject(id) {
  if (id === activeSubjectId && activeView === 'quiz') return;
  guardQuizLeave(() => {
    activeSubjectId = id;
    if (activeView === 'dashboard' || activeView === 'subjects' || activeView === 'results') {
      activeView = 'quiz';
    }
    startSession(difficulty, 1);
  });
}

function startSubjectQuiz(id) {
  activeSubjectId = id;
  activeView = 'quiz';
  startSession(difficulty, 1);
  if (typeof window !== 'undefined' && window.scrollTo) window.scrollTo(0, 0);
}

function openSubjectGuide(id) {
  activeSubjectId = id;
  activeView = 'guide';
  render();
  if (typeof window !== 'undefined' && window.scrollTo) window.scrollTo(0, 0);
}

function selectDifficulty(d) {
  if (d === difficulty && !submitted) return;
  guardQuizLeave(() => {
    activeView = 'quiz';
    startSession(d, 1);
  });
}

function selectVariant(v) {
  const nextVar = v === 'random' ? 'random' : Number(v);
  if (nextVar === variant && !submitted) return;
  guardQuizLeave(() => {
    activeView = 'quiz';
    startSession(difficulty, nextVar);
  });
}

function handleStartOver() {
  guardQuizLeave(() => {
    activeView = 'quiz';
    startSession(difficulty, nextVariant(variant));
  });
}

function pickOption(dispIdx) {
  if (!started || submitted) return;
  if (mode === 'practice' && answers[currentIdx] !== undefined) return;
  answers[currentIdx] = dispIdx;
  render();
}

function forceZeroSubmit() {
  if (!started || submitted) return;
  if (blurConfirmId) { clearTimeout(blurConfirmId); blurConfirmId = null; }
  awayStartedAt = null;
  deductedThisAway = 0;
  warningsLeft = 0;
  isAway = false;
  warningModalInfo = null;
  forcedZero = true;
  showForcedZeroOverlay = true;
  document.title = BASE_TITLE;

  const gr = gradeOf(0).grade;
  history.unshift({
    id: activeSubjectId + '-' + Date.now(),
    subjectId: activeSubjectId,
    difficulty: difficulty,
    variant: variantLabel(variant),
    mode: mode,
    score: 0,
    total: 25,
    percentage: 0,
    grade: gr,
    elapsedSeconds: seconds,
    completedAt: new Date().toISOString(),
    cheated: true,
  });
  history = history.slice(0, 60);
  saveHistory();
  submitted = true;
  render();
}

function submitQuiz() {
  if (submitted) return;
  if (blurConfirmId) { clearTimeout(blurConfirmId); blurConfirmId = null; }
  awayStartedAt = null;
  isAway = false;
  warningModalInfo = null;
  document.title = BASE_TITLE;

  let correct = 0;
  activeQuestions.forEach((aq, i) => {
    const sel = answers[i];
    if (sel !== undefined && aq.order[sel] === aq.source.answer) correct++;
  });
  const pct = Math.round((correct / 25) * 100);
  const gr = gradeOf(pct).grade;
  history.unshift({
    id: activeSubjectId + '-' + Date.now(),
    subjectId: activeSubjectId,
    difficulty: difficulty,
    variant: variantLabel(variant),
    mode: mode,
    score: correct,
    total: 25,
    percentage: pct,
    grade: gr,
    elapsedSeconds: seconds,
    completedAt: new Date().toISOString(),
  });
  history = history.slice(0, 60);
  saveHistory();
  submitted = true;
  render();
}

function clearHistory() {
  history = [];
  saveHistory();
  render();
}

function renderDashboardView() {
  const copy = UI_COPY[lang];
  const avg = history.length ? Math.round(history.reduce((s, h) => s + h.percentage, 0) / history.length) : null;
  let html = '<section style="display:flex;flex-direction:column;gap:20px">';
  html += '<div class="card" style="padding:28px">';
  html += '<p class="eyebrow">' + (lang === 'uz' ? '7-Sinf ChSB · Asosiy Dashboard' : 'Grade 7 ChSB · Home Dashboard') + '</p>';
  html += '<h1 class="hero-title">' + esc(copy.heroTitle) + '</h1>';
  html += '<p class="hero-sub">' + esc(copy.heroSubtitle) + '</p>';
  html += '<div style="margin-top:20px;display:flex;flex-wrap:wrap;gap:10px">';
  html += '<button type="button" class="btn-teal" onclick="setView(\\'subjects\\')"><span>' + (lang === 'uz' ? 'Fanlar bo‘limi' : 'Browse Subjects') + '</span>' + ICONS.arrowRight + '</button>';
  html += '<button type="button" class="btn-outline" onclick="setView(\\'guide\\')"><span>' + esc(copy.navGuide) + '</span></button>';
  html += '<button type="button" class="btn-outline" onclick="setView(\\'results\\')"><span>' + esc(copy.navResults) + '</span></button>';
  html += '</div></div>';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px">';
  html += '<div class="card" style="padding:18px"><div style="font-size:12px;color:#64748b;font-weight:600">' + (lang === 'uz' ? 'Fanlar soni' : 'Subjects') + '</div><div class="font-mono-num" style="font-size:24px;font-weight:800;margin-top:6px">' + SUBJECTS.length + '</div></div>';
  html += '<div class="card" style="padding:18px"><div style="font-size:12px;color:#64748b;font-weight:600">' + (lang === 'uz' ? 'Topshirilgan testlar' : 'Completed Tests') + '</div><div class="font-mono-num" style="font-size:24px;font-weight:800;margin-top:6px">' + history.length + '</div></div>';
  html += '<div class="card" style="padding:18px"><div style="font-size:12px;color:#64748b;font-weight:600">' + (lang === 'uz' ? "O'rtacha natija" : 'Average Score') + '</div><div class="font-mono-num" style="font-size:24px;font-weight:800;margin-top:6px">' + (avg !== null ? avg + '%' : '—') + '</div></div>';
  html += '</div>';
  html += renderSubjectsView();
  html += '</section>';
  return html;
}

function renderSubjectsView() {
  const copy = UI_COPY[lang];
  let html = '<section>';
  html += '<div class="hero-head">';
  html += '<p class="eyebrow">' + esc(copy.questionsPerTest + ' · ' + copy.variantsCount + ' · ' + copy.totalBank) + '</p>';
  html += '<h1 class="hero-title">' + esc(copy.heroTitle) + '</h1>';
  html += '<p class="hero-sub">' + esc(copy.heroSubtitle) + '</p>';
  html += '</div>';

  html += '<div class="subjects-grid">';
  SUBJECTS.forEach(s => {
    const attempts = history.filter(h => h.subjectId === s.id);
    const best = attempts.reduce((b, cur) => (!b || cur.percentage > b.percentage ? cur : b), null);
    html += '<article class="subject-card' + (s.id === activeSubjectId ? ' current' : '') + '">';
    html += '<div>';
    html += '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">';
    html += '<div class="icon-box">' + (ICONS[s.id] || '') + '</div>';
    html += '<span class="font-mono-num" style="font-size:12px;font-weight:500;color:#64748b">' + s.questions.length + ' ' + (lang === 'uz' ? 'savol' : 'questions') + ' · 3×5 ' + (lang === 'uz' ? 'variant' : 'variants') + '</span>';
    html += '</div>';
    html += '<h2 class="font-display" style="margin-top:16px;font-size:20px;font-weight:700">' + esc(loc(s.title)) + '</h2>';
    html += '<p style="margin-top:6px;font-size:14px;color:#475569">' + esc(loc(s.subtitle)) + '</p>';
    html += '<p style="margin-top:14px;font-size:12px;font-weight:500;color:#64748b">' + esc(loc(s.questionLangNote)) + ' · ' + s.topics.length + ' ' + (lang === 'uz' ? 'mavzu' : 'topics') + '</p>';
    html += '</div>';

    html += '<div style="margin-top:20px;padding-top:16px;border-top:1px solid #f1f5f9">';
    html += '<div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b;margin-bottom:12px"><span>' + esc(copy.bestScore) + ':</span>';
    if (best) {
      html += '<span class="font-mono-num" style="font-weight:600;color:#0f172a">' + best.score + '/25 (' + best.percentage + '%) · ' + (lang === 'uz' ? 'Baho' : 'Grade') + ' ' + best.grade + '</span>';
    } else {
      html += '<span>' + esc(copy.notAttempted) + '</span>';
    }
    html += '</div>';
    html += '<div style="display:flex;gap:10px">';
    html += '<button type="button" class="btn-teal" style="flex:1" onclick="startSubjectQuiz(\\'' + esc(s.id) + '\\')"><span>' + esc(copy.startTest) + '</span>' + ICONS.arrowRight + '</button>';
    html += '<button type="button" class="btn-outline" title="' + esc(copy.openGuide) + '" onclick="openSubjectGuide(\\'' + esc(s.id) + '\\')">' + ICONS.book + '</button>';
    html += '</div></div></article>';
  });
  html += '</div></section>';
  return html;
}

function renderGuideView(sub) {
  const copy = UI_COPY[lang];
  let html = '<section>';
  html += '<div class="row-between" style="border-bottom:1px solid var(--border);padding-bottom:24px;margin-bottom:28px">';
  html += '<div>';
  html += '<p class="eyebrow">' + esc(loc(sub.shortLabel)) + ' · ' + sub.topics.length + ' ' + (lang === 'uz' ? 'mavzu' : 'topics') + ' · ' + sub.questions.length + ' ' + (lang === 'uz' ? 'savol' : 'questions') + '</p>';
  html += '<h1 class="font-display" style="margin-top:6px;font-size:28px;font-weight:800">' + esc(copy.studyGuideTitle) + '</h1>';
  html += '<p style="margin-top:6px;font-size:14px;color:#475569">' + esc(loc(sub.title)) + ' — ' + esc(loc(sub.subtitle)) + '</p>';
  html += '</div>';
  html += '<button type="button" class="btn-teal" onclick="setView(\\'quiz\\')"><span>' + esc(copy.startTest) + ' (25)</span>' + ICONS.arrowRight + '</button>';
  html += '</div>';

  html += '<div class="guide-grid">';
  html += '<div class="card"><h2 class="font-display" style="font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px"><span style="color:var(--teal);display:inline-flex">' + ICONS.book + '</span><span>' + esc(copy.topicsCovered) + '</span></h2>';
  html += '<ol style="list-style:none;padding:0;margin:16px 0 0">';
  sub.topics.forEach((t, idx) => {
    html += '<li class="topic-li"><span class="font-mono-num" style="font-size:12px;font-weight:600;color:#94a3b8;margin-top:2px">' + String(idx + 1).padStart(2, '0') + '</span><span>' + esc(t) + '</span></li>';
  });
  html += '</ol></div>';

  html += '<div style="display:flex;flex-direction:column;gap:16px">';
  sub.studyGuide.forEach(sg => {
    html += '<article class="card"><h3 class="font-display" style="font-size:18px;font-weight:700">' + esc(sg.title) + '</h3>';
    html += '<ul style="list-style:none;padding:0;margin:12px 0 0">';
    sg.points.forEach(pt => {
      html += '<li class="dot-li"><span class="teal-dot"></span><span>' + fmtMath(pt) + '</span></li>';
    });
    html += '</ul></article>';
  });
  html += '</div></div></section>';
  return html;
}

function renderResultsHistoryView() {
  const copy = UI_COPY[lang];
  let html = '<section>';
  html += '<div class="row-between" style="border-bottom:1px solid var(--border);padding-bottom:20px;margin-bottom:24px">';
  html += '<div><h1 class="font-display" style="font-size:28px;font-weight:800">' + esc(copy.historyTitle) + '</h1><p style="margin-top:4px;font-size:14px;color:#475569">' + esc(copy.gradingScaleNote) + '</p></div>';
  if (history.length > 0) {
    html += '<button type="button" class="btn-outline" onclick="clearHistory()">' + ICONS.trash + '<span>' + esc(copy.clearHistory) + '</span></button>';
  }
  html += '</div>';

  if (history.length === 0) {
    html += '<div class="card" style="text-align:center;color:#475569;font-size:14px;padding:32px">' + esc(copy.historyEmpty) + '</div>';
  } else {
    html += '<div class="table-wrap"><table><thead><tr>';
    html += '<th>' + esc(copy.subjectCol) + '</th><th>' + esc(copy.variantCol) + '</th><th>' + esc(copy.modeCol) + '</th><th>' + esc(copy.scoreLabel) + '</th><th>' + esc(copy.gradeLabel) + '</th><th>' + esc(copy.timeLabel) + '</th><th>' + esc(copy.dateCol) + '</th>';
    html += '</tr></thead><tbody>';
    history.forEach(item => {
      const sub = getSubject(item.subjectId);
      const timeStr = new Date(item.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const modeText = item.mode === 'practice' ? (lang === 'uz' ? 'Mashq' : 'Practice') : (lang === 'uz' ? 'Imtihon' : 'Exam');
      html += '<tr>';
      html += '<td><button type="button" style="background:none;border:none;padding:0;font-weight:600;color:var(--text);cursor:pointer;font-size:14px" onclick="startSubjectQuiz(\\'' + esc(item.subjectId) + '\\')">' + esc(loc(sub.shortLabel)) + '</button></td>';
      const dText = item.difficulty ? (diffLabel(item.difficulty) + ' · ') : '';
      html += '<td style="color:#334155">' + esc(dText + item.variant) + '</td>';
      html += '<td style="color:#475569">' + esc(modeText) + '</td>';
      const cheatedBadge = (item.cheated && item.score === 0) ? '<span style="margin-left:8px;font-family:var(--font-body);font-weight:800;color:#dc2626">Cheated</span>' : '';
      html += '<td class="font-mono-num" style="font-weight:600">' + item.score + '/' + item.total + ' (' + item.percentage + '%)' + cheatedBadge + '</td>';
      html += '<td class="font-mono-num" style="font-weight:700;color:var(--teal)">' + item.grade + '</td>';
      html += '<td class="font-mono-num" style="color:#475569">' + fmtTime(item.elapsedSeconds) + '</td>';
      html += '<td class="font-mono-num" style="color:#64748b">' + esc(timeStr) + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';
  }
  html += '</section>';
  return html;
}

function renderQuizView(sub) {
  const copy = UI_COPY[lang];
  const answeredCount = Object.keys(answers).length;
  let html = '<section class="quiz-stack">';

  html += '<div class="card">';
  html += '<div class="row-between">';
  html += '<div><h1 class="font-display" style="font-size:24px;font-weight:800">' + esc(loc(sub.title)) + '</h1>';
  html += '<p style="margin-top:4px;font-size:14px;color:#475569">' + esc(loc(sub.subtitle)) + ' · ' + esc(loc(sub.questionLangNote)) + '</p></div>';
  html += '<div class="row-center no-print">';
  html += '<button type="button" class="btn-outline" onclick="setView(\\'guide\\')"><span style="color:var(--teal);display:inline-flex">' + ICONS.book + '</span><span>' + esc(copy.navGuide) + '</span></button>';
  html += '<button type="button" class="btn-teal" title="' + esc(copy.startOverHint) + '" onclick="handleStartOver()">' + ICONS.rotate + '<span>' + esc(copy.startOver) + '</span></button>';
  html += '</div></div>';

  html += '<div class="variant-bar no-print">';
  html += '<div class="row-center" style="gap:8px"><span style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#64748b">' + esc(copy.difficultyLabel) + ':</span>';
  html += '<div class="seg-group">' + ['easy', 'medium', 'hard'].map(d =>
    '<button type="button" class="diff-btn' + (difficulty === d ? (' active-' + d) : '') + '" onclick="selectDifficulty(\\'' + d + '\\')">' + esc(diffLabel(d)) + '</button>'
  ).join('') + '</div></div>';
  html += '<div class="seg-group">';
  html += '<button type="button" class="seg-btn' + (mode === 'practice' ? ' active' : '') + '" onclick="mode=\\'practice\\';render()">' + esc(copy.modePractice) + '</button>';
  html += '<button type="button" class="seg-btn' + (mode === 'exam' ? ' active' : '') + '" onclick="mode=\\'exam\\';render()">' + esc(copy.modeExam) + '</button>';
  html += '</div></div>';

  html += '<div class="variant-bar no-print" style="margin-top:12px;padding-top:12px">';
  html += '<div class="row-center" style="gap:6px">' + [1, 2, 3, 4, 5, 'random'].map(v =>
    '<button type="button" class="var-btn' + (variant === v ? ' active' : '') + '" onclick="selectVariant(\\'' + v + '\\')">' + esc(variantLabel(v)) + '</button>'
  ).join('') + '</div>';
  html += '</div>';

  const warnColor = warningsLeft === 3 ? '#047857' : (warningsLeft === 2 ? '#b45309' : '#be123c');
  html += '<div class="meta-line font-mono-num">';
  html += '<span>' + esc(diffLabel(difficulty) + ' · ' + variantLabel(variant)) + ' · 25 ' + (lang === 'uz' ? 'savol' : 'questions') + ' · ' + esc(copy.answeredCount) + ': ' + answeredCount + '/25</span>';
  html += '<span style="display:inline-flex;align-items:center;gap:14px"><strong style="color:' + warnColor + '">' + (lang === 'uz' ? 'Ogohlantirish' : 'Warnings') + ': ' + warningsLeft + '/' + MAX_WARNINGS + '</strong><span id="timerVal">' + esc(copy.timeLabel) + ': ' + fmtTime(seconds) + '</span></span>';
  html += '</div></div>';

  if (started && !submitted && isAway) {
    html += '<div id="awayBanner" role="alert" style="position:fixed;inset:0;z-index:100;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#be123c;padding:24px;text-align:center;color:#fff">';
    html += '<div style="max-width:640px;margin:0 auto">';
    html += '<h2 class="font-display" style="font-size:clamp(28px,5vw,48px);font-weight:800;line-height:1.15;color:#fff">' + (lang === 'uz' ? 'DIQQAT! TEST OYNASIDAN CHIQIB KETDINGIZ!' : 'ATTENTION! YOU LEFT THE QUIZ WINDOW!') + '</h2>';
    html += '<div id="awaySecBadge" class="font-mono-num" style="display:inline-flex;align-items:center;justify-content:center;width:136px;height:136px;margin-top:28px;border-radius:24px;border:4px solid rgba(255,255,255,0.85);background:#9f1239;font-size:56px;font-weight:800;color:#fff">' + graceSecondsLeft + 's</div>';
    html += '<p style="margin:24px auto 0;font-size:18px;font-weight:600;line-height:1.5;color:#ffe4e6">' + (lang === 'uz' ? (graceSecondsLeft + ' soniya ichida testga qaytmasangiz 1 ta ogohlantirish olib tashlanadi!') : ('Return to the quiz within ' + graceSecondsLeft + 's or 1 warning will be deducted!')) + '</p>';
    html += '<div class="font-mono-num" style="display:inline-block;margin-top:18px;padding:10px 20px;border-radius:10px;border:1px solid rgba(255,255,255,0.35);background:rgba(136,19,55,0.7);font-size:16px;font-weight:700">' + (lang === 'uz' ? 'Qolgan ogohlantirishlar: ' : 'Warnings remaining: ') + warningsLeft + ' / ' + MAX_WARNINGS + '</div>';
    html += '</div></div>';
  }

  if (started && !submitted && warningModalInfo) {
    html += '<div role="dialog" aria-modal="true" style="position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:rgba(159,18,57,0.96);padding:24px;text-align:center;color:#fff">';
    html += '<div style="width:100%;max-width:560px;background:rgba(76,5,25,0.9);border:2px solid rgba(253,164,175,0.6);border-radius:16px;padding:32px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.45)">';
    html += '<h2 class="font-display" style="font-size:28px;font-weight:800;color:#fff">' + (lang === 'uz' ? 'TEST QOIDASI OGOHLANTIRISHI' : 'QUIZ FOCUS WARNING') + '</h2>';
    html += '<p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:#ffe4e6">' + (lang === 'uz' ? ('Boshqa sayt, oyna yoki desktopga 3 soniyadan ortiq chiqqaningiz uchun ' + warningModalInfo.deductedCount + ' ta ogohlantirish olib tashlandi.') : ('You left the test window for over 3 seconds; ' + warningModalInfo.deductedCount + ' warning deducted.')) + '</p>';
    html += '<div style="margin-top:20px;padding:16px;border-radius:12px;background:rgba(136,19,55,0.7);border:1px solid rgba(251,113,133,0.5)">';
    html += '<div class="font-mono-num" style="font-size:20px;font-weight:800;color:#fff">' + (lang === 'uz' ? 'Qolgan ogohlantirishlar: ' : 'Remaining warnings: ') + warningModalInfo.remaining + ' / ' + MAX_WARNINGS + '</div>';
    html += '<div style="margin-top:6px;font-size:13px;color:#ffe4e6">' + (lang === 'uz' ? 'Barcha 3 ta ogohlantirish tugasa, test darhol to‘xtaydi va natija 0 bo‘ladi.' : 'Using all 3 warnings terminates the test immediately with score 0.') + '</div></div>';
    html += '<button type="button" style="width:100%;margin-top:24px;padding:14px 24px;border-radius:12px;border:none;background:#fff;color:#881337;font-size:16px;font-weight:800;cursor:pointer" onclick="warningModalInfo=null;enterFullScreen(true);render()">' + (lang === 'uz' ? 'Tushunarli, testga qaytish' : 'Understood, continue quiz') + '</button>';
    html += '</div></div>';
  }

  if (started && !submitted && securityViolationMsg && !isAway) {
    html += '<div role="alertdialog" aria-modal="true" style="position:fixed;inset:0;z-index:105;display:flex;align-items:center;justify-content:center;background:#be123c;padding:24px;text-align:center;color:#fff">';
    html += '<div style="width:100%;max-width:560px;background:rgba(136,19,55,0.9);border:2px solid rgba(255,255,255,0.4);border-radius:16px;padding:32px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.45)">';
    html += '<h2 class="font-display" style="font-size:28px;font-weight:800;color:#fff">' + (lang === 'uz' ? 'TAQIQLANGAN HARAKAT!' : 'PROHIBITED ACTION DETECTED!') + '</h2>';
    html += '<p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:#ffe4e6">' + esc(securityViolationMsg) + '</p>';
    html += '<div class="font-mono-num" style="margin-top:20px;padding:14px;border-radius:12px;background:rgba(76,5,25,0.65);border:1px solid rgba(251,113,133,0.45);font-size:18px;font-weight:800">' + (lang === 'uz' ? 'Qolgan ogohlantirishlar: ' : 'Remaining warnings: ') + warningsLeft + ' / ' + MAX_WARNINGS + '</div>';
    html += '<button type="button" style="width:100%;margin-top:24px;padding:14px 24px;border-radius:12px;border:none;background:#fff;color:#881337;font-size:16px;font-weight:800;cursor:pointer" onclick="securityViolationMsg=null;enterFullScreen(true);render()">' + (lang === 'uz' ? 'Tushunarli, testga qaytish' : 'Understood, continue quiz') + '</button>';
    html += '</div></div>';
  }

  if (started && !submitted && fullscreenLost && !isAway && !securityViolationMsg) {
    html += '<div role="alertdialog" aria-modal="true" style="position:fixed;inset:0;z-index:105;display:flex;align-items:center;justify-content:center;background:#be123c;padding:24px;text-align:center;color:#fff">';
    html += '<div style="width:100%;max-width:560px;background:rgba(136,19,55,0.9);border:2px solid rgba(255,255,255,0.4);border-radius:16px;padding:32px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.45)">';
    html += '<h2 class="font-display" style="font-size:28px;font-weight:800;color:#fff">' + (lang === 'uz' ? 'FULLSCREENDAN CHIQISH TAQIQLANADI!' : 'EXITING FULLSCREEN IS NOT ALLOWED!') + '</h2>';
    html += '<p style="margin:14px 0 0;font-size:16px;line-height:1.6;color:#ffe4e6">' + (lang === 'uz' ? 'Testni davom ettirish uchun to‘liq ekran rejimiga qayting.' : 'Return to fullscreen mode to continue your test.') + '</p>';
    html += '<button type="button" style="width:100%;margin-top:24px;padding:14px 24px;border-radius:12px;border:none;background:#fff;color:#881337;font-size:16px;font-weight:800;cursor:pointer" onclick="fullscreenLost=false;enterFullScreen(true);render()">' + (lang === 'uz' ? 'To‘liq ekranga qaytish' : 'Return to Fullscreen') + '</button>';
    html += '</div></div>';
  }

  if (submitted && forcedZero && showForcedZeroOverlay) {
    html += '<div role="alertdialog" aria-modal="true" style="position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:#be123c;padding:24px;text-align:center;color:#fff">';
    html += '<div style="width:100%;max-width:560px;background:rgba(136,19,55,0.85);border:2px solid rgba(255,255,255,0.4);border-radius:16px;padding:32px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.45)">';
    html += '<div class="font-mono-num" style="font-size:52px;font-weight:800;color:#fff">0 / 25</div>';
    html += '<h2 class="font-display" style="margin-top:12px;font-size:26px;font-weight:800;color:#fff">' + (lang === 'uz' ? 'TEST QOIDABUZARLIK SABABLI DARHOL TO‘XTATILDI!' : 'TEST IMMEDIATELY TERMINATED (SCORE: 0)') + '</h2>';
    html += '<p style="margin:14px 0 0;font-size:16px;line-height:1.6;color:#ffe4e6">' + (lang === 'uz' ? '3 ta ogohlantirish ham sarflandi. Natija 0 / 25 (0%) qilib saqlandi.' : 'All 3 warnings exhausted. Score recorded as 0 / 25 (0%).') + '</p>';
    html += '<button type="button" style="width:100%;margin-top:24px;padding:14px 24px;border-radius:12px;border:none;background:#fff;color:#881337;font-size:16px;font-weight:800;cursor:pointer" onclick="showForcedZeroOverlay=false;render()">' + (lang === 'uz' ? 'Natijalarni ko‘rish' : 'View Results') + '</button>';
    html += '</div></div>';
  }

  if (!started) {
    html += '<div class="card" style="text-align:center;padding:40px 24px">';
    html += '<h2 class="font-display" style="font-size:22px;font-weight:800;color:#0f172a">' + esc(loc(sub.shortLabel) + ' · ' + diffLabel(difficulty) + ' · ' + variantLabel(variant)) + '</h2>';
    html += '<p style="max-width:560px;margin:10px auto 0;font-size:14px;line-height:1.6;color:#475569">';
    html += lang === 'uz'
      ? ('Ushbu variantda 25 ta savol mavjud (' + (mode === 'practice' ? copy.modePractice : copy.modeExam) + '). Boshlagandan keyin boshqa sayt, oyna yoki desktopga 3 soniyadan ortiq o‘tsangiz 1 ta ogohlantirish kamayadi (jami 3 ta; 3 tasi tugasa natija 0 bo‘ladi).')
      : ('This variant contains 25 questions (' + (mode === 'practice' ? copy.modePractice : copy.modeExam) + '). Once started, leaving to another tab, window, or desktop for over 3 seconds removes 1 warning (3 max; exhausting all 3 gives 0).');
    html += '</p>';
    html += '<button type="button" class="btn-teal" style="margin-top:24px;padding:12px 32px;font-size:16px;font-weight:700" onclick="beginQuiz()"><span>Start</span>' + ICONS.arrowRight + '</button>';
    html += '</div></section>';
    return html;
  }

  if (submitted) {
    let correct = 0;
    const byTopic = {};
    activeQuestions.forEach((aq, i) => {
      const t = aq.source.topic;
      if (!byTopic[t]) byTopic[t] = { ok: 0, total: 0 };
      byTopic[t].total++;
      const sel = answers[i];
      if (sel !== undefined && aq.order[sel] === aq.source.answer) {
        correct++;
        byTopic[t].ok++;
      }
    });
    const finalCorrect = forcedZero ? 0 : correct;
    const pct = Math.round((finalCorrect / 25) * 100);
    const gr = gradeOf(pct);

    if (forcedZero) {
      html += '<div role="alert" style="border-radius:12px;border:1px solid #fda4af;background:#fff1f2;padding:18px;color:#881337">';
      html += '<strong class="font-display" style="font-size:16px">' + (lang === 'uz' ? 'Test qoidabuzarlik sababli darhol to‘xtatildi (Natija: 0)' : 'Test terminated due to focus violations (Score: 0)') + '</strong>';
      html += '<p style="margin:6px 0 0;font-size:13px">' + (lang === 'uz' ? '3 ta ogohlantirish ham sarflandi. Natija 0 / 25 (0%) qilib saqlandi.' : 'All 3 warnings exhausted. Score recorded as 0 / 25 (0%).') + '</p></div>';
    }

    html += '<div class="card">';
    html += '<div class="row-between" style="border-bottom:1px solid #f1f5f9;padding-bottom:16px">';
    html += '<div><h2 class="font-display" style="font-size:24px;font-weight:800">' + esc(copy.resultTitle) + '</h2><p style="margin-top:4px;font-size:12px;color:#64748b">' + esc(copy.gradingScaleNote) + '</p></div>';
    html += '<button type="button" class="btn-teal no-print" onclick="handleStartOver()">' + ICONS.rotate + '<span>' + esc(copy.startOver) + '</span></button>';
    html += '</div>';

    html += '<div class="stats-grid">';
    const forcedCheatedTag = forcedZero ? '<span style="margin-left:8px;font-family:var(--font-body);font-size:16px;font-weight:800;color:#dc2626">Cheated</span>' : '';
    html += '<div class="stat-box"><div style="font-size:12px;color:#64748b">' + esc(copy.scoreLabel) + '</div><div class="stat-val font-mono-num">' + finalCorrect + ' / 25' + forcedCheatedTag + '</div></div>';
    html += '<div class="stat-box"><div style="font-size:12px;color:#64748b">' + esc(copy.accuracyCol) + '</div><div class="stat-val font-mono-num">' + pct + '%</div></div>';
    html += '<div class="stat-box"><div style="font-size:12px;color:#64748b">' + esc(copy.gradeLabel) + '</div><div class="stat-val font-mono-num" style="color:var(--teal)">' + gr.grade + ' <span style="font-family:var(--font-body);font-size:14px;font-weight:600;color:#475569">(' + esc(loc(gr.label)) + ')</span></div></div>';
    html += '<div class="stat-box"><div style="font-size:12px;color:#64748b">' + esc(copy.timeLabel) + '</div><div class="stat-val font-mono-num">' + fmtTime(seconds) + '</div></div>';
    html += '</div>';

    html += '<h3 class="font-display" style="margin-top:24px;font-size:16px;font-weight:700">' + esc(copy.topicBreakdown) + '</h3>';
    html += '<div class="table-wrap"><table><thead><tr><th>' + esc(copy.topicCol) + '</th><th>' + esc(copy.correctCol) + '</th><th>' + esc(copy.accuracyCol) + '</th></tr></thead><tbody>';
    Object.keys(byTopic).forEach(t => {
      const row = byTopic[t];
      const rowPct = Math.round((row.ok / row.total) * 100);
      html += '<tr><td style="font-weight:500">' + esc(t) + '</td><td class="font-mono-num">' + row.ok + ' / ' + row.total + '</td><td class="font-mono-num" style="font-weight:600">' + rowPct + '%</td></tr>';
    });
    html += '</tbody></table></div></div>';

    html += '<div class="card">';
    html += '<div class="row-between" style="border-bottom:1px solid #f1f5f9;padding-bottom:16px">';
    html += '<h3 class="font-display" style="font-size:18px;font-weight:700">' + esc(copy.answerReview) + '</h3>';
    html += '<div class="seg-group no-print">';
    html += '<button type="button" class="seg-btn' + (reviewFilter === 'all' ? ' active' : '') + '" onclick="reviewFilter=\\'all\\';render()">' + esc(copy.filterAll) + '</button>';
    html += '<button type="button" class="seg-btn' + (reviewFilter === 'wrong' ? ' active' : '') + '" onclick="reviewFilter=\\'wrong\\';render()">' + esc(copy.filterWrong) + '</button>';
    html += '</div></div>';

    html += '<div style="margin-top:16px;display:flex;flex-direction:column;gap:14px">';
    activeQuestions.forEach((aq, i) => {
      const sel = answers[i];
      const okDisp = aq.order.indexOf(aq.source.answer);
      const isOk = sel === okDisp;
      if (reviewFilter === 'wrong' && isOk) return;
      const opts = locOpts(aq.source.opts);
      const selText = sel !== undefined ? (LETTERS[sel] + '. ' + opts[aq.order[sel]]) : copy.notSelected;
      const corText = LETTERS[okDisp] + '. ' + opts[aq.source.answer];

      html += '<article class="review-item">';
      html += '<div style="display:flex;justify-content:space-between;gap:8px;font-size:12px">';
      html += '<span style="font-weight:500;color:#64748b">' + (i + 1) + '. ' + esc(aq.source.topic) + '</span>';
      html += '<span style="display:inline-flex;align-items:center;gap:4px;font-weight:600;color:' + (isOk ? 'var(--ok)' : 'var(--bad)') + '">' + (isOk ? ICONS.check + '<span>' + esc(copy.correctBadge) + '</span>' : ICONS.cross + '<span>' + esc(sel === undefined ? copy.unansweredBadge : copy.incorrectBadge) + '</span>') + '</span>';
      html += '</div>';
      if (aq.source.context) {
        html += '<div class="q-passage" style="max-height:180px;margin-top:10px;font-size:12px">' + esc(loc(aq.source.context)) + '</div>';
      }
      html += '<p class="font-display" style="margin:8px 0 0;font-size:16px;font-weight:600;white-space:pre-line">' + esc(loc(aq.source.q)) + '</p>';
      html += '<div style="margin-top:10px;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px;font-size:14px">';
      html += '<div><strong>' + esc(copy.yourAnswer) + ': </strong><span style="color:' + (isOk ? 'var(--ok)' : 'var(--bad)') + '">' + esc(selText) + '</span></div>';
      html += '<div><strong>' + esc(copy.correctAnswer) + ': </strong><span style="color:var(--ok);font-weight:500">' + esc(corText) + '</span></div>';
      html += '</div>';
      html += '<p style="margin:8px 0 0;font-size:12px;color:#475569"><strong>' + esc(copy.explanation) + ': </strong>' + fmtMath(loc(aq.source.explain)) + '</p>';
      html += '</article>';
    });
    html += '</div></div></section>';
    return html;
  }

  html += '<div class="qnav-card"><div class="qnav-grid">';
  activeQuestions.forEach((aq, i) => {
    let cls = 'qnum font-mono-num';
    const sel = answers[i];
    if (i === currentIdx) cls += ' cur';
    else if (mode === 'practice' && sel !== undefined) {
      cls += aq.order[sel] === aq.source.answer ? ' ok' : ' bad';
    } else if (sel !== undefined) cls += ' ans';
    html += '<button type="button" class="' + cls + '" onclick="currentIdx=' + i + ';render()">' + (i + 1) + '</button>';
  });
  html += '</div></div>';

  const cur = activeQuestions[currentIdx];
  const opts = locOpts(cur.source.opts);
  const sel = answers[currentIdx];
  const showFb = mode === 'practice' && sel !== undefined;
  const okDisp = cur.order.indexOf(cur.source.answer);

  html += '<div class="q-card">';
  html += '<div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;font-weight:500;color:#64748b">';
  html += '<span>' + esc(cur.source.topic) + ' · <strong style="color:' + diffColor(cur.source.difficulty || 'medium') + '">' + esc(diffLabel(cur.source.difficulty || 'medium')) + '</strong></span>';
  html += '<span class="font-mono-num">' + esc(copy.questionOf) + ' ' + (currentIdx + 1) + ' / 25</span>';
  html += '</div>';
  if (cur.source.context) {
    html += '<div class="q-passage">' + esc(loc(cur.source.context)) + '</div>';
  }
  html += '<h2 class="q-title font-display">' + esc(loc(cur.source.q)) + '</h2>';

  html += '<div class="opt-list">';
  cur.order.forEach((origIdx, dispIdx) => {
    let cls = 'opt-btn';
    let badge = '';
    if (showFb) {
      if (dispIdx === okDisp) {
        cls += ' ok';
        badge = '<span style="display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:700;color:var(--ok);flex-shrink:0">' + ICONS.check + '<span>' + esc(copy.correctBadge) + '</span></span>';
      } else if (dispIdx === sel) {
        cls += ' bad';
        badge = '<span style="display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:700;color:var(--bad);flex-shrink:0">' + ICONS.cross + '<span>' + esc(copy.incorrectBadge) + '</span></span>';
      } else {
        cls += ' dim';
      }
    } else if (sel === dispIdx) {
      cls += ' sel';
    }
    html += '<button type="button" class="' + cls + '" ' + (showFb ? 'disabled ' : '') + 'onclick="pickOption(' + dispIdx + ')">';
    html += '<span style="display:flex;align-items:baseline;gap:12px"><span class="font-mono-num" style="font-size:14px;font-weight:700;color:#64748b">' + LETTERS[dispIdx] + '.</span><span>' + esc(opts[origIdx]) + '</span></span>';
    html += badge + '</button>';
  });
  html += '</div>';

  if (showFb) {
    const isOk = sel === okDisp;
    html += '<div class="explain-box">';
    html += '<p style="margin:0;font-weight:600;display:flex;align-items:center;gap:6px">';
    html += '<span style="color:' + (isOk ? 'var(--ok)' : 'var(--bad)') + ';display:inline-flex;align-items:center;gap:6px">' + (isOk ? ICONS.check + '<span>' + esc(copy.correctBadge) + '</span>' : ICONS.cross + '<span>' + esc(copy.incorrectBadge) + '</span>') + '</span>';
    html += '<span style="color:#94a3b8">·</span><span>' + esc(copy.explanation) + '</span></p>';
    html += '<p style="margin:6px 0 0">' + fmtMath(loc(cur.source.explain)) + '</p>';
    html += '</div>';
  }

  html += '<div class="q-footer no-print">';
  html += '<button type="button" class="btn-outline" ' + (currentIdx === 0 ? 'disabled ' : '') + 'onclick="currentIdx--;render()">' + ICONS.chevLeft + '<span>' + esc(copy.previous) + '</span></button>';
  html += '<div class="row-center">';
  if (currentIdx < 24) {
    html += '<button type="button" class="btn-outline" onclick="currentIdx++;render()"><span>' + esc(copy.next) + '</span>' + ICONS.chevRight + '</button>';
  }
  html += '<button type="button" class="btn-dark" onclick="submitQuiz()">' + esc(copy.finishExam) + '</button>';
  html += '</div></div></div></section>';
  return html;
}

function renderLeaveConfirmModal() {
  if (!pendingNavAction || activeView !== 'quiz' || !started || submitted) return '';
  let modal = '<div role="dialog" aria-modal="true" style="position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,0.6);padding:16px">';
  modal += '<div style="width:100%;max-width:420px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1)">';
  modal += '<h2 class="font-display" style="font-size:18px;font-weight:800;color:#0f172a">' + (lang === 'uz' ? 'Test hali yakunlanmadi' : 'Test still in progress') + '</h2>';
  modal += '<p style="margin:10px 0 0;font-size:14px;line-height:1.5;color:#475569">' + (lang === 'uz' ? 'Hozir boshqa bo‘lim yoki variantga o‘tsangiz, joriy test yakunlanadi va natijasi saqlanadi.' : 'Switching sections or variants now will finish and submit your current test.') + '</p>';
  modal += '<div style="margin-top:20px;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:10px">';
  modal += '<button type="button" class="btn-outline" onclick="cancelLeaveModal()">Cancel</button>';
  modal += '<button type="button" class="btn-dark" onclick="confirmFinishAndLeave()">Finish the test</button>';
  modal += '</div></div></div>';
  return modal;
}

function render() {
  renderChrome();
  const running = activeView === 'quiz' && started && !submitted;
  document.body.classList.toggle('quiz-locked', running);
  if (!running) unlockSystemKeys();
  const fsBtn = document.getElementById('fsBtn');
  if (fsBtn) {
    fsBtn.disabled = running && isFsActive();
    fsBtn.style.opacity = fsBtn.disabled ? '0.45' : '1';
  }
  const sub = getSubject();
  const app = document.getElementById('app');
  let body = '';
  if (activeView === 'dashboard') body = renderDashboardView();
  else if (activeView === 'subjects') body = renderSubjectsView();
  else if (activeView === 'guide') body = renderGuideView(sub);
  else if (activeView === 'results') body = renderResultsHistoryView();
  else body = renderQuizView(sub);
  app.innerHTML = body + renderLeaveConfirmModal();
}

function tickOfflineAway() {
  if (awayStartedAt === null || !started || submitted || activeView !== 'quiz') return;
  const elapsedMs = Date.now() - awayStartedAt;
  const steps = Math.floor(elapsedMs / GRACE_MS);
  if (steps > deductedThisAway) {
    const delta = steps - deductedThisAway;
    deductedThisAway = steps;
    warningsLeft = Math.max(0, warningsLeft - delta);
    if (warningsLeft <= 0) {
      forceZeroSubmit();
      return;
    }
  }
  const nextB = (steps + 1) * GRACE_MS;
  graceSecondsLeft = Math.max(1, Math.ceil((nextB - elapsedMs) / 1000));
  document.title = (lang === 'uz' ? '⚠️ (' + graceSecondsLeft + 's) Testga qayting! — ' : '⚠️ (' + graceSecondsLeft + 's) Return to quiz! — ') + warningsLeft + '/' + MAX_WARNINGS;
  const badge = document.getElementById('awaySecBadge');
  if (badge) badge.textContent = graceSecondsLeft + 's';
}

function startOfflineAway() {
  if (!started || submitted || activeView !== 'quiz' || awayStartedAt !== null) return;
  awayStartedAt = Date.now();
  deductedThisAway = 0;
  isAway = true;
  graceSecondsLeft = 3;
  tickOfflineAway();
  render();
}

function stopOfflineAway() {
  if (blurConfirmId) { clearTimeout(blurConfirmId); blurConfirmId = null; }
  if (awayStartedAt === null) return;
  tickOfflineAway();
  if (submitted) return;
  const lost = deductedThisAway;
  awayStartedAt = null;
  deductedThisAway = 0;
  isAway = false;
  graceSecondsLeft = 3;
  document.title = BASE_TITLE;
  if (lost > 0) warningModalInfo = { remaining: warningsLeft, deductedCount: lost };
  render();
}

function triggerOfflineInstantPenalty(reasonUz, reasonEn) {
  if (!started || submitted || activeView !== 'quiz') return;
  const now = Date.now();
  if (now - lastShotPenaltyAt < 1500) return;
  lastShotPenaltyAt = now;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      Promise.resolve(navigator.clipboard.writeText('')).catch(() => {});
    }
  } catch (e) {}
  warningsLeft = Math.max(0, warningsLeft - 1);
  if (warningsLeft <= 0) {
    forceZeroSubmit();
    return;
  }
  securityViolationMsg = lang === 'uz' ? reasonUz : reasonEn;
  render();
}

awayIntervalId = setInterval(tickOfflineAway, 250);
document.addEventListener('visibilitychange', () => {
  if (!started || submitted || activeView !== 'quiz') return;
  if (document.hidden || document.visibilityState !== 'visible') startOfflineAway();
  else if (document.hasFocus()) stopOfflineAway();
});
function onOfflineFullscreenChange() {
  if (!started || submitted || activeView !== 'quiz') return;
  if (isFsActive()) {
    wasFsInTest = true;
    fullscreenLost = false;
    if (!document.hidden && document.hasFocus()) stopOfflineAway();
    else render();
  } else if (wasFsInTest) {
    fullscreenLost = true;
    startOfflineAway();
  }
}
document.addEventListener('fullscreenchange', onOfflineFullscreenChange);
document.addEventListener('webkitfullscreenchange', onOfflineFullscreenChange);
window.addEventListener('blur', () => {
  if (!started || submitted || activeView !== 'quiz') return;
  startOfflineAway();
});
window.addEventListener('focus', () => {
  if (!started || submitted || activeView !== 'quiz') return;
  if (!document.hidden && document.hasFocus()) stopOfflineAway();
});

function handleOfflineKeyGuard(e) {
  if (!started || submitted || activeView !== 'quiz') return;
  const keyLower = (e.key || '').toLowerCase();
  const isShotKey = e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44;
  const isMeta = e.key === 'Meta' || e.key === 'OS' || e.code === 'MetaLeft' || e.code === 'MetaRight' || e.metaKey;
  const isCtrlBlock = e.ctrlKey && (['p', 's', 'u', 'c', 'x', 'a', 'g'].includes(keyLower) || (e.shiftKey && ['i', 'j', 'c', 's'].includes(keyLower)));
  const isSysKey = e.key === 'Escape' || e.key === 'F11' || e.key === 'F12';
  if (isShotKey || isMeta || isCtrlBlock || isSysKey) {
    e.preventDefault();
    e.stopPropagation();
  }
  if (
    isShotKey ||
    isMeta ||
    (e.ctrlKey && e.shiftKey && keyLower === 's') ||
    (e.ctrlKey && keyLower === 'p') ||
    (isMeta && e.shiftKey && ['3', '4', '5', 's'].includes(keyLower))
  ) {
    triggerOfflineInstantPenalty(
      'Skrinshot olish, Pusk (Win) yoki Win+G tugmalarini bosish taqiqlanadi! 1 ta ogohlantirish olib tashlandi.',
      'Screenshots, Start (Win), and Win+G are prohibited! 1 warning was deducted.'
    );
  }
}
window.addEventListener('keydown', handleOfflineKeyGuard, { capture: true });
window.addEventListener('keyup', handleOfflineKeyGuard, { capture: true });
document.addEventListener('contextmenu', e => { e.preventDefault(); }, { capture: true });
['copy', 'cut', 'selectstart', 'dragstart'].forEach(ev => {
  document.addEventListener(ev, e => {
    if (started && !submitted && activeView === 'quiz') e.preventDefault();
  }, { capture: true });
});

document.getElementById('menuToggleBtn').onclick = () => {
  const side = document.getElementById('sideMenu');
  if (side) side.classList.toggle('closed');
};
document.getElementById('brandHomeBtn').onclick = () => setView('dashboard');
document.getElementById('fsBtn').onclick = () => toggleFullScreen();
document.getElementById('printBtn').onclick = () => {
  if (started && !submitted && activeView === 'quiz') return;
  if (typeof window !== 'undefined' && window.print) window.print();
};
document.getElementById('langUz').onclick = () => { lang = 'uz'; try { localStorage.setItem(LANG_KEY, 'uz'); } catch (e) {} render(); };
document.getElementById('langEn').onclick = () => { lang = 'en'; try { localStorage.setItem(LANG_KEY, 'en'); } catch (e) {} render(); };

startSession('easy', 1);
</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'Grade_7_ChSB_Platform.html';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
