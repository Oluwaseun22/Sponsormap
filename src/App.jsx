import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";

// ─── Data ─────────────────────────────────────────────────────────────────────

const SPONSORS = [
  { id: 1,  name: "HSBC UK Bank plc",                     town: "Birmingham", county: "West Midlands",      sector: "Finance",     rating: "A", route: "Skilled Worker" },
  { id: 2,  name: "Google UK Limited",                    town: "London",     county: "Greater London",     sector: "Technology",  rating: "A", route: "Skilled Worker" },
  { id: 3,  name: "NHS England",                          town: "Leeds",      county: "West Yorkshire",     sector: "Healthcare",  rating: "A", route: "Health & Care Worker" },
  { id: 4,  name: "Arup Group Limited",                   town: "Leeds",      county: "West Yorkshire",     sector: "Engineering", rating: "A", route: "Skilled Worker" },
  { id: 5,  name: "Deloitte LLP",                         town: "London",     county: "Greater London",     sector: "Finance",     rating: "A", route: "Skilled Worker" },
  { id: 6,  name: "Bradford Teaching Hospitals NHS FT",   town: "Bradford",   county: "West Yorkshire",     sector: "Healthcare",  rating: "A", route: "Health & Care Worker" },
  { id: 7,  name: "Lloyds Banking Group plc",             town: "Leeds",      county: "West Yorkshire",     sector: "Finance",     rating: "A", route: "Skilled Worker" },
  { id: 8,  name: "Amazon UK Services Ltd",               town: "London",     county: "Greater London",     sector: "Technology",  rating: "A", route: "Skilled Worker" },
  { id: 9,  name: "Mott MacDonald Limited",               town: "Leeds",      county: "West Yorkshire",     sector: "Engineering", rating: "A", route: "Skilled Worker" },
  { id: 10, name: "Capita Business Services Ltd",         town: "Bradford",   county: "West Yorkshire",     sector: "Technology",  rating: "A", route: "Skilled Worker" },
  { id: 11, name: "PwC UK",                               town: "London",     county: "Greater London",     sector: "Finance",     rating: "A", route: "Skilled Worker" },
  { id: 12, name: "Infosys BPO Limited",                  town: "London",     county: "Greater London",     sector: "Technology",  rating: "A", route: "Skilled Worker" },
  { id: 13, name: "University of Leeds",                  town: "Leeds",      county: "West Yorkshire",     sector: "Education",   rating: "A", route: "Skilled Worker" },
  { id: 14, name: "Kirklees Council",                     town: "Bradford",   county: "West Yorkshire",     sector: "Education",   rating: "A", route: "Skilled Worker" },
  { id: 15, name: "Asda Stores Limited",                  town: "Leeds",      county: "West Yorkshire",     sector: "Retail",      rating: "A", route: "Skilled Worker" },
  { id: 16, name: "Accenture (UK) Limited",               town: "London",     county: "Greater London",     sector: "Technology",  rating: "A", route: "Skilled Worker" },
  { id: 17, name: "KPMG LLP",                             town: "London",     county: "Greater London",     sector: "Finance",     rating: "A", route: "Skilled Worker" },
  { id: 18, name: "British Airways plc",                  town: "London",     county: "Greater London",     sector: "Transport",   rating: "A", route: "Skilled Worker" },
  { id: 19, name: "Sheffield Teaching Hospitals NHS FT",  town: "Sheffield",  county: "South Yorkshire",    sector: "Healthcare",  rating: "A", route: "Health & Care Worker" },
  { id: 20, name: "University of Manchester",             town: "Manchester", county: "Greater Manchester", sector: "Education",   rating: "A", route: "Skilled Worker" },
  { id: 21, name: "JPMorgan Chase Bank NA",               town: "Glasgow",    county: "Glasgow City",       sector: "Finance",     rating: "A", route: "Skilled Worker" },
  { id: 22, name: "University of Edinburgh",              town: "Edinburgh",  county: "City of Edinburgh",  sector: "Education",   rating: "A", route: "Skilled Worker" },
  { id: 23, name: "Barclays Bank plc",                    town: "Glasgow",    county: "Glasgow City",       sector: "Finance",     rating: "A", route: "Skilled Worker" },
  { id: 24, name: "CGI IT UK Limited",                    town: "Bristol",    county: "City of Bristol",    sector: "Technology",  rating: "A", route: "Skilled Worker" },
  { id: 25, name: "Newcastle Upon Tyne Hospitals NHS FT", town: "Newcastle",  county: "Tyne and Wear",      sector: "Healthcare",  rating: "A", route: "Health & Care Worker" },
];

const SECTORS   = ["Technology","Finance","Healthcare","Engineering","Education","Retail","Transport"];
const LOCATIONS = ["London","Leeds","Bradford","Manchester","Birmingham","Sheffield","Glasgow","Edinburgh","Bristol","Newcastle","Liverpool","Cardiff","Oxford","Cambridge","Aberdeen","Nottingham","Southampton","Reading","York","Brighton"];
const ROUTES    = ["Skilled Worker","Health & Care Worker","Global Business Mobility","Temporary Worker"];
const REGIONS   = ["Scotland","England","Wales","Northern Ireland"];

// Maps county names from the CSV to UK regions
const COUNTY_TO_REGION = {
  // Scotland
  "Glasgow City": "Scotland", "City of Edinburgh": "Scotland", "Aberdeen City": "Scotland",
  "Highland": "Scotland", "Fife": "Scotland", "North Lanarkshire": "Scotland",
  "South Lanarkshire": "Scotland", "Aberdeenshire": "Scotland", "Edinburgh": "Scotland",

  // Wales
  "Cardiff": "Wales", "Swansea": "Wales", "Newport": "Wales", "Wrexham": "Wales",
  "Bridgend": "Wales", "Rhondda Cynon Taf": "Wales", "Carmarthenshire": "Wales",

  // Northern Ireland
  "Belfast": "Northern Ireland", "Antrim": "Northern Ireland", "Derry": "Northern Ireland",
  "Down": "Northern Ireland", "Armagh": "Northern Ireland", "Tyrone": "Northern Ireland",

  // England — everything else defaults to England in the filter logic
};

const POPULAR_CITIES = [
  "London","Manchester","Birmingham","Leeds","Glasgow",
  "Edinburgh","Bristol","Sheffield","Newcastle","Liverpool",
  "Cardiff","Oxford","Cambridge","Brighton","Aberdeen",
];

const SECTOR_META = {
  Technology:  { icon: "⬡", color: "var(--c-blue)",   desc: "Software, cloud, data & IT" },
  Finance:     { icon: "◈", color: "var(--c-amber)",  desc: "Banking, consulting & fintech" },
  Healthcare:  { icon: "✚", color: "var(--c-green)",  desc: "NHS, hospitals & clinical" },
  Engineering: { icon: "⚙", color: "var(--c-slate)",  desc: "Civil, mechanical & infrastructure" },
  Education:   { icon: "◎", color: "var(--c-violet)", desc: "Universities & research" },
  Retail:      { icon: "◇", color: "var(--c-rose)",   desc: "Commerce & consumer goods" },
  Transport:   { icon: "➤", color: "var(--c-sky)",    desc: "Aviation, logistics & rail" },
};

const AI_SUGGESTIONS = [
  "Tech sponsors in Leeds",
  "What's the new entrant salary?",
  "Is Google a reliable sponsor?",
  "Healthcare sponsors in Glasgow",
  "A-rating vs B-rating explained",
];

// ─── Design tokens ────────────────────────────────────────────────────────────

const CSS = `
  [data-theme="light"] {
    --bg:             #f5f4f0;
    --bg-raised:      #ffffff;
    --bg-card:        #ffffff;
    --bg-card-hi:     #efece6;
    --border:         rgba(0,0,0,0.09);
    --border-hi:      rgba(0,0,0,0.18);
    --border-focus:   rgba(196,136,48,0.55);
    --t-primary:      #16120e;
    --t-secondary:    #4e4540;
    --t-muted:        #9a8e84;
    --accent:         #c4852a;
    --accent-hi:      #d4963a;
    --accent-dim:     rgba(196,133,42,0.12);
    --accent-mid:     rgba(196,133,42,0.24);
    --c-green:        #15a348;
    --c-yellow:       #a84d09;
    --c-blue:         #1d56d8;
    --c-amber:        #d07006;
    --c-slate:        #3f5168;
    --c-violet:       #6d2fd4;
    --c-rose:         #d41840;
    --c-sky:          #0274b4;
    --c-green-dim:    rgba(21,163,72,0.1);
    --c-green-border: rgba(21,163,72,0.22);
    --c-yellow-dim:   rgba(168,77,9,0.1);
    --c-yellow-border:rgba(168,77,9,0.2);
    --glow-amber:     rgba(196,133,42,0.09);
    --glow-blue:      rgba(29,86,216,0.05);
    --sh-raised:      0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.07);
    --sh-card:        0 1px 4px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.05);
    --header-bg:      rgba(245,244,240,0.94);
    --hero-bg:        linear-gradient(160deg, #111d38 0%, #162f5e 45%, #0e1b30 100%);
    --hero-text:      #f2ead8;
    --hero-muted:     rgba(242,234,216,0.7);
    --select-arrow:   url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239a8e84' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  }

  [data-theme="dark"] {
    --bg:             #0d0f14;
    --bg-raised:      #13161e;
    --bg-card:        #181c26;
    --bg-card-hi:     #1e2230;
    --border:         rgba(255,255,255,0.07);
    --border-hi:      rgba(255,255,255,0.13);
    --border-focus:   rgba(196,160,100,0.55);
    --t-primary:      #f0ead8;
    --t-secondary:    #8a8f9e;
    --t-muted:        #4a4f5e;
    --accent:         #c4a064;
    --accent-hi:      #d4b074;
    --accent-dim:     rgba(196,160,100,0.15);
    --accent-mid:     rgba(196,160,100,0.25);
    --c-green:        #4ade80;
    --c-yellow:       #facc15;
    --c-blue:         #5b9cf6;
    --c-amber:        #f0a855;
    --c-slate:        #94a3b8;
    --c-violet:       #a78bfa;
    --c-rose:         #fb7185;
    --c-sky:          #38bdf8;
    --c-green-dim:    rgba(74,222,128,0.12);
    --c-green-border: rgba(74,222,128,0.2);
    --c-yellow-dim:   rgba(250,204,21,0.1);
    --c-yellow-border:rgba(250,204,21,0.2);
    --glow-amber:     rgba(196,160,100,0.06);
    --glow-blue:      rgba(91,156,246,0.05);
    --sh-raised:      0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3);
    --sh-card:        0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3);
    --header-bg:      rgba(13,15,20,0.9);
    --hero-bg:        linear-gradient(160deg, #0a0e1a 0%, #0d1829 50%, #080c16 100%);
    --hero-text:      #f0ead8;
    --hero-muted:     rgba(240,234,216,0.55);
    --select-arrow:   url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%234a4f5e' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  }

  :root {
    --r-sm: 8px; --r-md: 12px; --r-lg: 18px; --r-xl: 24px;
    --ff-display: 'Playfair Display', Georgia, serif;
    --ff-ui:      'DM Sans', system-ui, sans-serif;
    --ff-mono:    'DM Mono', 'Courier New', monospace;
    --ease: 0.2s cubic-bezier(0.4,0,0.2,1);
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-font-smoothing: antialiased; scroll-behavior: smooth; }
  body { background: var(--bg); color: var(--t-primary); font-family: var(--ff-ui); }

  ::selection { background: var(--accent-dim); color: var(--accent); }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  input, select, button, a { font-family: var(--ff-ui); }
  input::placeholder { color: var(--t-muted); }
  a { text-decoration: none; }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  select {
    appearance: none; -webkit-appearance: none;
    background-image: var(--select-arrow);
    background-repeat: no-repeat; background-position: right 12px center;
    padding-right: 32px !important; cursor: pointer;
  }
  select option { background: var(--bg-raised); color: var(--t-primary); }

  @keyframes fadeUp    { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn    { from { opacity:0; } to { opacity:1; } }
  @keyframes slideUp   { from { opacity:0; transform:translateY(100%); } to { opacity:1; transform:translateY(0); } }
  @keyframes cardIn    { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pulseDot  { 0%,100%{opacity:.25;transform:scale(.75);} 50%{opacity:1;transform:scale(1.1);} }
  @keyframes blink     { 0%,100%{opacity:1;} 50%{opacity:0;} }
  @keyframes pulse     { 0%,100% { box-shadow: 0 0 0 0 rgba(74,222,128,0.4); } 70% { box-shadow: 0 0 0 6px rgba(74,222,128,0); } }

  .card-enter { animation: cardIn 0.36s cubic-bezier(0.22,1,0.36,1) forwards; opacity: 0; }
  .fade-up    { animation: fadeUp 0.55s ease forwards; opacity: 0; }

  /* Header accent line — plays once on load */
  @keyframes accentLine { from { transform: scaleX(0); transform-origin: left; } to { transform: scaleX(1); transform-origin: left; } }
  .header-line {
    height: 2px;
    background: linear-gradient(90deg, var(--accent), var(--c-blue), transparent);
    animation: accentLine 1.2s cubic-bezier(0.22,1,0.36,1) 0.2s both;
  }

  /* Mono label utility */
  .mono-label {
    font-family: var(--ff-mono);
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-weight: 500;
  }

  /* Sector row left-border accent */
  .sponsor-row-accent {
    border-left: 3px solid var(--sector-color, var(--accent));
    padding-left: 14px !important;
    transition: border-color 0.2s;
  }

  /* Count-up number animation */
  @keyframes countUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .count-up { animation: countUp 0.5s ease forwards; }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

  .chip {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 14px; border-radius: 20px;
    font-size: 12px; font-weight: 500; cursor: pointer; user-select: none;
    transition: all var(--ease); border: 1px solid var(--border);
    background: transparent; color: var(--t-secondary); white-space: nowrap;
  }
  .chip:hover { border-color: var(--border-hi); color: var(--t-primary); background: var(--bg-card-hi); }
  .chip[aria-pressed="true"] {
    background: var(--t-primary); border-color: var(--t-primary);
    color: var(--bg); font-weight: 700;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }

  .btn-p {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    padding: 10px 20px; border-radius: 20px; background: var(--accent); border: none;
    color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap;
    transition: all var(--ease); letter-spacing: 0.01em;
  }
  .btn-p:hover  { background: var(--accent-hi); transform: translateY(-1px); box-shadow: 0 4px 16px var(--accent-mid); }
  .btn-p:active { transform: translateY(0); }

  .btn-g {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    padding: 10px 18px; border-radius: var(--r-sm); background: transparent;
    border: 1px solid var(--border); color: var(--t-secondary);
    font-size: 12px; font-weight: 500; cursor: pointer; white-space: nowrap; transition: all var(--ease);
  }
  .btn-g:hover  { border-color: var(--border-hi); color: var(--t-primary); background: var(--accent-dim); transform: translateY(-1px); }
  .btn-g:active { transform: translateY(0); }

  .btn-hero {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    padding: 14px 28px; border-radius: 20px; background: var(--accent); border: none;
    color: #fff; font-size: 15px; font-weight: 700; cursor: pointer; white-space: nowrap;
    transition: all var(--ease); letter-spacing: 0.01em;
  }
  .btn-hero:hover { background: var(--accent-hi); transform: translateY(-2px); box-shadow: 0 8px 24px var(--accent-mid); }
  .btn-hero:active { transform: translateY(0); }

  .btn-hero-ghost {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    padding: 14px 28px; border-radius: 20px; background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.25); color: #fff;
    font-size: 15px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all var(--ease);
  }
  .btn-hero-ghost:hover { background: rgba(255,255,255,0.18); transform: translateY(-2px); }
  .btn-hero-ghost:active { transform: translateY(0); }

  .field {
    width: 100%; background: var(--bg-card); border: 1px solid var(--border);
    border-radius: var(--r-md); padding: 13px 16px; color: var(--t-primary);
    font-size: 14px; outline: none;
    transition: border-color var(--ease), box-shadow var(--ease);
  }
  .field:focus { border-color: var(--border-focus); box-shadow: 0 0 0 3px var(--accent-dim); }

  .act {
    flex: 1 1 100px; padding: 10px 12px; border-radius: var(--r-sm);
    font-size: 12px; font-weight: 600; text-align: center;
    border: 1px solid var(--border); background: var(--bg-raised);
    color: var(--t-secondary); transition: all var(--ease); cursor: pointer;
  }
  .act:hover  { background: var(--accent-dim); border-color: var(--accent); color: var(--accent); transform: translateY(-1px); }
  .act:active { transform: translateY(0); }

  .pill {
    display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px;
    border-radius: 20px; font-size: 11px; font-weight: 500;
    background: var(--accent-dim); border: 1px solid var(--accent-mid); color: var(--accent);
  }

  .theme-btn {
    width: 36px; height: 36px; border-radius: var(--r-sm);
    border: 1px solid var(--border); background: var(--bg-card);
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    font-size: 15px; transition: all var(--ease); flex-shrink: 0;
  }
  .theme-btn:hover { border-color: var(--border-hi); background: var(--bg-card-hi); }

  /* Hero search field — white on dark hero bg */
  .hero-field {
    width: 100%; background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.2); border-radius: var(--r-md);
    padding: 14px 18px; color: #fff; font-size: 14px; font-family: var(--ff-ui);
    outline: none; transition: all var(--ease);
    backdrop-filter: blur(8px);
  }
  .hero-field::placeholder { color: rgba(255,255,255,0.45); }
  .hero-field:focus { border-color: rgba(196,160,100,0.7); background: rgba(255,255,255,0.16); box-shadow: 0 0 0 3px rgba(196,160,100,0.15); }

  /* Sector grid card */
  .sector-card {
    display: flex; flex-direction: column; align-items: flex-start; gap: 8px;
    padding: 20px; border-radius: var(--r-lg);
    border: 1px solid var(--border); background: var(--bg-card);
    cursor: pointer; transition: all var(--ease); text-align: left;
  }
  .sector-card:hover { border-color: var(--accent-mid); background: var(--bg-card-hi); transform: translateY(-2px); box-shadow: var(--sh-card); }
  .sector-card:active { transform: translateY(0); }

  /* Step card */
  .step-card {
    flex: 1 1 200px; padding: 28px 24px; border-radius: var(--r-xl);
    border: 1px solid var(--border); background: var(--bg-card);
    position: relative; overflow: hidden;
  }

  /* Trust card */
  .trust-card {
    padding: 24px; border-radius: var(--r-lg);
    border: 1px solid var(--border); background: var(--bg-card);
  }

  /* Live dot */
  .live-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--c-green); display: inline-block;
    animation: pulse 2s ease infinite;
  }

  /* Skeleton loading */
  @keyframes shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position: 600px 0; }
  }
  .skeleton {
    background: linear-gradient(90deg, var(--bg-card) 25%, var(--bg-card-hi) 50%, var(--bg-card) 75%);
    background-size: 600px 100%;
    animation: shimmer 1.4s ease infinite;
    border-radius: var(--r-sm);
  }

  /* Bookmark button */
  .bm-btn {
    width: 30px; height: 30px; border-radius: var(--r-sm);
    border: 1px solid var(--border); background: transparent;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    font-size: 14px; transition: all var(--ease); flex-shrink: 0;
    color: var(--t-muted);
  }
  .bm-btn:hover  { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }
  .bm-btn.active { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }

  /* ── Scroll reveal ── */
  .reveal { opacity: 0; transform: translateY(16px); transition: opacity 0.45s cubic-bezier(0.22,1,0.36,1), transform 0.45s cubic-bezier(0.22,1,0.36,1); }
  .reveal.visible { opacity: 1; transform: translateY(0); }
  .reveal.visible.reveal-dim { opacity: 0.82; }
  .reveal-delay-1 { transition-delay: 0.06s; }
  .reveal-delay-2 { transition-delay: 0.12s; }
  .reveal-delay-3 { transition-delay: 0.18s; }
  .reveal-delay-4 { transition-delay: 0.24s; }

  /* ── Awake-style nav pill CTA ── */
  .btn-nav-cta {
    display: inline-flex; align-items: center; gap: 0;
    background: var(--accent); border: none; border-radius: 50px;
    cursor: pointer; transition: all var(--ease); overflow: hidden;
    padding: 0; white-space: nowrap;
  }
  .btn-nav-cta:hover { background: var(--accent-hi); transform: translateY(-1px); box-shadow: 0 4px 16px var(--accent-mid); }
  .btn-nav-cta:active { transform: translateY(0); }
  .btn-nav-cta-label { padding: 9px 16px 9px 18px; font-size: 12px; font-weight: 700; color: #fff; letter-spacing: 0.01em; }
  .btn-nav-cta-icon { width: 32px; height: 32px; border-radius: 50%; background: rgba(0,0,0,0.18); margin: 3px; display: flex; align-items: center; justify-content: center; font-size: 14px; color: #fff; flex-shrink: 0; transition: background var(--ease); }
  .btn-nav-cta:hover .btn-nav-cta-icon { background: rgba(0,0,0,0.28); }

  /* ── Awake-style hero CTA ── */
  .btn-hero-pill {
    display: inline-flex; align-items: center; gap: 0;
    background: var(--accent); border: none; border-radius: 50px;
    cursor: pointer; transition: all var(--ease); overflow: hidden; padding: 0;
  }
  .btn-hero-pill:hover { background: var(--accent-hi); transform: translateY(-2px); box-shadow: 0 8px 28px var(--accent-mid); }
  .btn-hero-pill:active { transform: translateY(0); }
  .btn-hero-pill-label { padding: 13px 20px 13px 24px; font-size: 15px; font-weight: 700; color: #fff; }
  .btn-hero-pill-icon { width: 40px; height: 40px; border-radius: 50%; background: rgba(0,0,0,0.18); margin: 4px; display: flex; align-items: center; justify-content: center; font-size: 16px; color: #fff; flex-shrink: 0; }

  /* ── Avatar social proof row ── */
  .avatar-stack { display: flex; align-items: center; }
  .avatar-stack-item {
    width: 30px; height: 30px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3);
    margin-left: -8px; overflow: hidden; flex-shrink: 0; font-size: 12px; font-weight: 700;
    display: flex; align-items: center; justify-content: center; color: #fff;
  }
  .avatar-stack-item:first-child { margin-left: 0; }

  /* ── Product preview card in hero ── */
  .hero-preview-card {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: var(--r-lg); padding: 14px 16px;
    backdrop-filter: blur(12px);
    display: flex; align-items: center; gap: 12px;
    transition: all var(--ease);
    flex: 0 0 72%; scroll-snap-align: start; min-width: 200px;
  }
  .hero-preview-card:hover { background: rgba(255,255,255,0.1); border-color: rgba(196,160,100,0.3); }

  /* ── Comparison table ── */
  .cmp-table { width: 100%; border-collapse: collapse; }
  .cmp-table th, .cmp-table td { padding: 13px 16px; text-align: left; border-bottom: 1px solid var(--border); font-size: 13px; }
  .cmp-table th { font-family: var(--ff-mono); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; color: var(--t-muted); background: var(--bg-card-hi); }
  .cmp-table td:first-child { color: var(--t-secondary); font-weight: 500; }
  .cmp-table tr:last-child td { border-bottom: none; }
  .cmp-yes { color: var(--c-green); font-weight: 700; }
  .cmp-no  { color: var(--t-muted); }

  /* ── Testimonial card ── */
  .testi-card {
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: var(--r-xl); padding: 28px 24px;
    display: flex; flex-direction: column; gap: 16px;
    transition: all var(--ease);
  }
  .testi-card:hover { border-color: var(--accent-mid); transform: translateY(-2px); box-shadow: var(--sh-card); }

  /* ── FAQ accordion ── */
  .faq-item { border-bottom: 1px solid var(--border); }
  .faq-btn {
    width: 100%; display: flex; align-items: center; justify-content: space-between;
    padding: 18px 0; background: none; border: none; cursor: pointer;
    font-size: 15px; font-weight: 600; color: var(--t-primary); text-align: left;
    font-family: var(--ff-ui); transition: color var(--ease); gap: 16px;
  }
  .faq-btn:hover { color: var(--accent); }
  .faq-chevron { font-size: 18px; color: var(--t-muted); transition: transform var(--ease); flex-shrink: 0; }
  .faq-chevron.open { transform: rotate(180deg); }
  .faq-body { font-size: 14px; color: var(--t-secondary); line-height: 1.75; padding-bottom: 18px; }

  /* ── Newsletter in footer ── */
  .footer-newsletter {
    display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap;
  }
  .footer-email-input {
    flex: 1; min-width: 160px; background: var(--bg-card-hi); border: 1px solid var(--border);
    border-radius: var(--r-sm); padding: 9px 12px; font-size: 12px; color: var(--t-primary);
    font-family: var(--ff-ui); outline: none; transition: border-color var(--ease);
  }
  .footer-email-input:focus { border-color: var(--accent); }
  .footer-email-input::placeholder { color: var(--t-muted); }
  .footer-newsletter-btn {
    background: var(--accent); color: #fff; border: none; border-radius: var(--r-sm);
    padding: 9px 14px; font-size: 12px; font-weight: 700; cursor: pointer;
    font-family: var(--ff-ui); white-space: nowrap; transition: all var(--ease);
  }
  .footer-newsletter-btn:hover { background: var(--accent-hi); }

  @media (max-width: 600px) {
    .steps-row { flex-direction: column !important; }
    .trust-row { grid-template-columns: 1fr !important; }
    .sector-grid { grid-template-columns: 1fr 1fr !important; }
    .hero-btns { flex-direction: column !important; }
    .hero-preview-grid { grid-template-columns: 1fr !important; }
    .cmp-hide-mobile { display: none !important; }
    .testi-grid { grid-template-columns: 1fr !important; }
    .filter-chips-row { flex-wrap: wrap !important; }
  }
`;

// ─── Bookmarks hook ───────────────────────────────────────────────────────────

function useBookmarks() {
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      const stored = localStorage.getItem("sm-bookmarks");
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const toggle = useCallback((sponsor) => {
    setBookmarks(prev => {
      const exists = prev.find(b => b.id === sponsor.id);
      const next = exists ? prev.filter(b => b.id !== sponsor.id) : [...prev, sponsor];
      try { localStorage.setItem("sm-bookmarks", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const isBookmarked = useCallback((id) => bookmarks.some(b => b.id === id), [bookmarks]);
  return { bookmarks, toggle, isBookmarked };
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
        <div className="skeleton" style={{ width: "36px", height: "36px", borderRadius: "var(--r-sm)", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ height: "14px", width: "55%", marginBottom: "6px" }} />
          <div className="skeleton" style={{ height: "12px", width: "35%" }} />
        </div>
        <div className="skeleton" style={{ width: "60px", height: "20px", borderRadius: "6px" }} />
      </div>
      <div style={{ display: "flex", gap: "6px" }}>
        <div className="skeleton" style={{ height: "22px", width: "80px", borderRadius: "20px" }} />
        <div className="skeleton" style={{ height: "22px", width: "70px", borderRadius: "20px" }} />
        <div className="skeleton" style={{ height: "22px", width: "100px", borderRadius: "20px" }} />
      </div>
    </div>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────

function Background() {
  return (
    <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <pattern id="dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.9" fill="var(--border)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 55% at 50% 0%, transparent 0%, var(--bg) 70%)" }} />
      <div style={{ position: "absolute", top: "-120px", right: "-80px", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, var(--glow-amber) 0%, transparent 70%)" }} />
      <div style={{ position: "absolute", bottom: "-100px", left: "-80px", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, var(--glow-blue) 0%, transparent 70%)" }} />
    </div>
  );
}

function Typewriter({ text, delay = 0 }) {
  const [displayed, setDisplayed] = useState("");
  const [started,   setStarted]   = useState(false);
  useEffect(() => { const t = setTimeout(() => setStarted(true), delay); return () => clearTimeout(t); }, [delay]);
  useEffect(() => {
    if (!started || displayed.length >= text.length) return;
    const t = setTimeout(() => setDisplayed(text.slice(0, displayed.length + 1)), 40);
    return () => clearTimeout(t);
  }, [started, displayed, text]);
  return (
    <span aria-label={text}>
      <span aria-hidden="true">
        {displayed}
        {displayed.length < text.length && started && (
          <span style={{ animation: "blink 0.8s step-end infinite", color: "var(--accent)" }}>|</span>
        )}
      </span>
    </span>
  );
}

function AppHeader({ dark, setDark, onSearch, currentView }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [narrow,   setNarrow]   = useState(true);
  const ref = useRef(null);

  // Measure actual container width — works inside iframes where CSS media queries
  // report the outer window width, not the iframe width.
  useEffect(() => {
    const check = () => {
      if (ref.current) setNarrow(ref.current.offsetWidth < 560);
    };
    check();
    const ro = new ResizeObserver(check);
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  // Close menu when nav item chosen
  const nav = (v) => { onSearch(v); setMenuOpen(false); };

  return (
    <header ref={ref} style={{ position: "sticky", top: 0, zIndex: 100, background: "var(--header-bg)", backdropFilter: "blur(16px)", borderBottom: "1px solid var(--border)" }}>
      <div style={{ maxWidth: "1080px", margin: "0 auto", padding: "0 16px", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>

        {/* Logo */}
        <button onClick={() => nav("home")} style={{ display: "flex", alignItems: "center", gap: "10px", background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "9px", background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-hi) 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 10px var(--accent-mid)" }}>
              <svg width="16" height="18" viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M8 0C4.686 0 2 2.686 2 6c0 4.5 6 12 6 12s6-7.5 6-12c0-3.314-2.686-6-6-6z" fill="white" fillOpacity="0.95"/>
                <circle cx="8" cy="6" r="2.2" fill="rgba(0,0,0,0.35)"/>
              </svg>
            </div>
          <span style={{ fontFamily: "var(--ff-display)", fontSize: "20px", fontWeight: "600", color: "var(--t-primary)", letterSpacing: "-0.02em" }}>SponsorMap</span>
        </button>

        {/* Right side — wide: full nav | narrow: toggle + hamburger */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          {!narrow && <>
            <a href="https://find-employer-sponsors.homeoffice.gov.uk" target="_blank" rel="noopener noreferrer"
               style={{ fontSize: "12px", color: "var(--t-muted)", padding: "8px 10px", transition: "color var(--ease)", whiteSpace: "nowrap" }}
               onMouseEnter={e => e.currentTarget.style.color = "var(--t-secondary)"}
               onMouseLeave={e => e.currentTarget.style.color = "var(--t-muted)"}
            >Gov.uk ↗</a>
            <button onClick={() => nav("about")} className="btn-g" style={{ padding: "7px 12px", fontSize: "12px", ...(currentView === "about" ? { borderColor: "var(--accent)", color: "var(--accent)", background: "var(--accent-dim)" } : {}) }}>About</button>
          <button onClick={() => nav("salary")} className="btn-g" style={{ padding: "7px 12px", fontSize: "12px", ...(currentView === "salary" ? { borderColor: "var(--accent)", color: "var(--accent)", background: "var(--accent-dim)" } : {}) }}>Salary</button>
          </>}

          {/* Theme toggle — always visible */}
          <button className="theme-btn" onClick={() => setDark(d => !d)}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} aria-pressed={dark}>
            {dark ? "☀" : "☾"}
          </button>

          {!narrow && (
            <button className="btn-nav-cta" onClick={() => nav("search")} aria-label="Search sponsors">
              <span className="btn-nav-cta-label">Search sponsors</span>
              <span className="btn-nav-cta-icon">→</span>
            </button>
          )}

          {narrow && (
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              style={{ width: "36px", height: "36px", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "var(--bg-card)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", color: "var(--t-secondary)", transition: "all var(--ease)" }}
            >
              {menuOpen ? "✕" : "≡"}
            </button>
          )}
        </div>
      </div>

      {/* Dropdown — narrow only */}
      {narrow && menuOpen && (
        <div style={{ background: "var(--bg-raised)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "4px 16px 16px", animation: "fadeIn 0.15s ease forwards" }}>
          {[["Home","home"],["Search Sponsors","search"],["Salary Checker","salary"],["About","about"],["Privacy Policy","privacy"]].map(([label, v]) => (
            <button key={v} onClick={() => nav(v)}
              style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: "14px 4px", fontSize: "15px", fontWeight: "500", color: "var(--t-primary)", cursor: "pointer", fontFamily: "var(--ff-ui)", borderBottom: "1px solid var(--border)", transition: "color var(--ease)" }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--accent)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--t-primary)"}
            >{label}</button>
          ))}
          <a href="https://find-employer-sponsors.homeoffice.gov.uk" target="_blank" rel="noopener noreferrer"
            onClick={() => setMenuOpen(false)}
            style={{ display: "block", padding: "14px 4px", fontSize: "15px", fontWeight: "500", color: "var(--t-muted)", fontFamily: "var(--ff-ui)" }}
          >Gov.uk Register ↗</a>
        </div>
      )}
    </header>
  );
}

// ─── AI Panel ─────────────────────────────────────────────────────────────────

function AIPanel({ onClose }) {
  const [query, setQuery]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [response, setResponse] = useState("");
  const inputRef  = useRef(null);
  const timerRef  = useRef(null);
  const lastCall  = useRef(0); // rate limiting timestamp

  useEffect(() => { timerRef.current = setTimeout(() => inputRef.current?.focus(), 280); return () => clearTimeout(timerRef.current); }, []);
  useEffect(() => { const h = e => { if (e.key === "Escape") onClose(); }; document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h); }, [onClose]);

  const ask = useCallback(async (override) => {
    const q = (override ?? query).trim();
    if (!q || loading) return;

    // Rate limit: 2s cooldown between calls
    const now = Date.now();
    if (now - lastCall.current < 2000) return;
    lastCall.current = now;

    setQuery(q); setLoading(true); setResponse("");
    try {
      // 15s timeout via Promise.race
      const fetchPromise = fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 15000)
      );
      const res  = await Promise.race([fetchPromise, timeoutPromise]);
      const data = await res.json();
      setResponse(data.text || data.error || "No response.");
    } catch (err) {
      if (err.message === "timeout") {
        setResponse("Taking longer than expected. Try again in a moment.");
      } else {
        setResponse("Couldn't reach the AI. Please try again.");
      }
    }
    setLoading(false);
  }, [query, loading]);

  return (
    <div role="dialog" aria-modal="true" aria-label="SponsorMap AI assistant" onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
    >
      <div onClick={e => e.stopPropagation()}
        style={{ width: "100%", maxWidth: "660px", background: "var(--bg-raised)", border: "1px solid var(--border)", borderBottom: "none", borderRadius: "var(--r-xl) var(--r-xl) 0 0", padding: "0 24px 48px", boxShadow: "var(--sh-raised)", animation: "slideUp 0.32s cubic-bezier(0.32,0.72,0,1) forwards", maxHeight: "88vh", overflowY: "auto" }}
      >
        <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 22px" }}>
          <div style={{ width: "40px", height: "4px", borderRadius: "2px", background: "var(--border)" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{ color: "var(--accent)", fontSize: "12px" }}>✦</span>
              <h2 style={{ fontFamily: "var(--ff-display)", fontSize: "20px", fontWeight: "600", color: "var(--t-primary)", letterSpacing: "-0.01em" }}>Ask SponsorMap AI</h2>
            </div>
            <p style={{ fontSize: "12px", color: "var(--t-muted)" }}>Powered by Claude · UK visa expertise</p>
          </div>
          <button className="btn-g" onClick={onClose} aria-label="Close AI panel" style={{ padding: "7px 12px", fontSize: "12px" }}>✕ Close</button>
        </div>
        <div style={{ position: "relative", marginBottom: "14px" }}>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && ask()}
            placeholder="Ask anything about UK visa sponsorship..." className="field"
            aria-label="Ask a question" style={{ paddingRight: "52px" }} />
          <button onClick={() => ask()} disabled={loading || !query.trim()} aria-label="Submit"
            style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", width: "36px", height: "36px", borderRadius: "var(--r-sm)", background: loading || !query.trim() ? "var(--border)" : "var(--accent)", border: "none", cursor: loading || !query.trim() ? "not-allowed" : "pointer", color: loading || !query.trim() ? "var(--t-muted)" : "#fff", fontSize: "17px", display: "flex", alignItems: "center", justifyContent: "center", transition: "all var(--ease)" }}
          >{loading ? "·" : "↑"}</button>
        </div>
        {loading && (
          <div style={{ display: "flex", gap: "5px", padding: "16px" }} aria-live="polite">
            {[0,1,2].map(i => <div key={i} style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--accent)", animation: `pulseDot 1.3s ease ${i*0.18}s infinite` }} />)}
          </div>
        )}
        {response && !loading && (
          <div aria-live="polite" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "3px solid var(--accent)", borderRadius: "var(--r-md)", padding: "16px 18px", fontSize: "14px", lineHeight: "1.75", color: "var(--t-secondary)", animation: "fadeIn 0.3s ease forwards", whiteSpace: "pre-wrap", marginBottom: "16px" }}>
            {response}
          </div>
        )}
        <div>
          <p className="mono-label" style={{ color: "var(--t-muted)", marginBottom: "10px" }}>Try asking</p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {AI_SUGGESTIONS.map(s => <button key={s} onClick={() => ask(s)} disabled={loading} className="chip" style={{ opacity: loading ? 0.5 : 1 }}>{s}</button>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Feature data ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    id: "search",
    live: true,
    icon: "⌕",
    colorVar: "c-blue",
    colorDimVar: "rgba(37,99,235,0.12)",
    label: "Sponsor Search",
    tagline: "Find any licensed sponsor instantly",
    bullets: ["120,000+ verified companies", "Search by name or location", "Home Office register data"],
    action: "search",
  },
  {
    id: "filter",
    live: true,
    icon: "◈",
    colorVar: "c-amber",
    colorDimVar: "rgba(217,119,6,0.12)",
    label: "Smart Filters",
    tagline: "Sector, city, visa route — stacked",
    bullets: ["Multi-sector selection", "Any UK city or town", "Skilled Worker & Health routes"],
    action: "search",
  },
  {
    id: "ai",
    live: true,
    icon: "✦",
    colorVar: "c-violet",
    colorDimVar: "rgba(124,58,237,0.12)",
    label: "AI Assistant",
    tagline: "Ask anything about UK visa sponsorship",
    bullets: ["2026 salary thresholds", "A-rating vs B-rating explained", "Sector-specific sponsor advice"],
    action: "ai",
  },
  {
    id: "jobs",
    live: true,
    icon: "➤",
    colorVar: "c-green",
    colorDimVar: "rgba(22,163,74,0.12)",
    label: "Job Links",
    tagline: "Go straight from sponsor to application",
    bullets: ["Reed direct job search", "LinkedIn jobs per company", "Gov.uk sponsor verification"],
    action: "search",
  },
  {
    id: "salary",
    live: true,
    icon: "£",
    colorVar: "c-rose",
    colorDimVar: "rgba(225,29,72,0.12)",
    label: "Salary Checker",
    tagline: "Verify your role meets the CoS threshold",
    bullets: ["£41,700 general threshold 2026", "£33,400 new entrant rate", "Check before you apply"],
    action: "salary",
  },
  {
    id: "alerts",
    live: false,
    icon: "🔔",
    colorVar: "accent",
    colorDimVar: "rgba(176,120,48,0.12)",
    label: "Job Alerts",
    tagline: "Get notified when your sector hires",
    bullets: ["Weekly email digest", "Custom sector + city alerts", "New sponsor additions"],
    action: null,
  },
  {
    id: "extension",
    live: false,
    icon: "⬡",
    colorVar: "c-sky",
    colorDimVar: "rgba(2,132,199,0.12)",
    label: "Browser Extension",
    tagline: "Check sponsor status on LinkedIn & Indeed",
    bullets: ["Instant ✓ or ✗ on any company", "Works on Reed, LinkedIn, Indeed", "Chrome & Firefox"],
    action: null,
  },
  {
    id: "civil",
    live: false,
    icon: "🏛",
    colorVar: "c-slate",
    colorDimVar: "rgba(71,85,105,0.12)",
    label: "Civil Service Tracker",
    tagline: "Public sector roles for international seekers",
    bullets: ["HMRC, Home Office, DVLA", "NHS Digital & Cabinet Office", "gov.uk jobs pipeline"],
    action: null,
  },
];

const ECOSYSTEM = [
  { name: "SponsorMap",         desc: "Who can hire you",       status: "live",   icon: "⌕" },
  { name: "JobHunter Pro",      desc: "Search Reed & Indeed",   status: "suite",  icon: "◈" },
  { name: "NHS Job Tracker",    desc: "Health & care sector",   status: "suite",  icon: "✚" },
  { name: "Civil Service",      desc: "Public sector roles",    status: "coming", icon: "🏛" },
  { name: "Tech Job Radar",     desc: "Software engineers",     status: "coming", icon: "⬡" },
];

// ─── Subscribe modal ──────────────────────────────────────────────────────────

function SubscribeModal({ feature, onClose }) {
  const [email,     setEmail]     = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error,     setError]     = useState("");

  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const handleSubmit = () => {
    if (!email.trim()) { setError("Enter your email address."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("That doesn't look like a valid email."); return; }
    setError(""); setSubmitted(true);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={`Get early access to ${feature.label}`}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
    >
      <div onClick={e => e.stopPropagation()}
        style={{ width: "100%", maxWidth: "420px", background: "var(--bg-raised)", border: "1px solid var(--border)", borderRadius: "var(--r-xl)", padding: "32px", boxShadow: "var(--sh-raised)", animation: "fadeUp 0.25s ease forwards" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "var(--r-md)", background: feature.colorDimVar, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", color: `var(--${feature.colorVar})`, flexShrink: 0 }}>
            {feature.icon}
          </div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--t-primary)", fontFamily: "var(--ff-display)" }}>{feature.label}</div>
            <div style={{ fontSize: "12px", color: "var(--t-muted)" }}>Coming soon · Get early access</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "var(--t-muted)", padding: "4px" }}>✕</button>
        </div>
        {!submitted ? (
          <>
            <p style={{ fontSize: "14px", color: "var(--t-secondary)", lineHeight: "1.6", marginBottom: "20px" }}>
              {feature.tagline}. Drop your email and we'll tell you the moment it goes live.
            </p>
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="your@email.com" autoComplete="email"
                aria-label="Email address"
                style={{ flex: 1, background: "var(--bg-card)", border: `1px solid ${error ? "var(--c-rose)" : "var(--border)"}`, borderRadius: "var(--r-md)", padding: "11px 14px", fontSize: "14px", color: "var(--t-primary)", fontFamily: "var(--ff-ui)", outline: "none" }}
                onFocus={e => e.target.style.borderColor = "var(--border-focus)"}
                onBlur={e => e.target.style.borderColor = error ? "var(--c-rose)" : "var(--border)"}
              />
              <button onClick={handleSubmit} className="btn-p" style={{ flexShrink: 0, padding: "11px 18px", fontSize: "13px" }}>Notify me</button>
            </div>
            {error && <p style={{ fontSize: "12px", color: "var(--c-rose)", marginTop: "4px" }}>{error}</p>}
            <p style={{ fontSize: "11px", color: "var(--t-muted)", marginTop: "10px" }}>No spam. One email when it launches.</p>
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "var(--c-green-dim)", border: "1px solid var(--c-green-border)", borderRadius: "var(--r-md)", padding: "16px" }}>
            <span style={{ fontSize: "20px" }}>✓</span>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--t-primary)" }}>You're on the list.</div>
              <div style={{ fontSize: "12px", color: "var(--t-muted)" }}>We'll email you when {feature.label} goes live.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Scroll reveal hook ───────────────────────────────────────────────────────

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    if (!els.length) return;
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          io.unobserve(e.target);
        }
      }),
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// ─── Landing page (V14) ───────────────────────────────────────────────────────

const STORIES = [
  {
    name: "Eyo John",
    location: "Glasgow, Scotland",
    field: "MSc Computing",
    avatar: "EJ",
    color: "#c4a064",
    bg: "rgba(196,160,100,0.18)",
    before: "Downloaded the CSV every Monday. Opened it in Excel. CTRL+F each company name. Checked their careers page. Checked the salary. Closed the tab. Repeat — for hours.",
    time: "3–4 hours every week",
  },
  {
    name: "Olayemi Odubiro",
    location: "Edinburgh, Scotland",
    field: "MSc Data Science",
    avatar: "OO",
    color: "#4ade80",
    bg: "rgba(74,222,128,0.18)",
    before: "Applied to 14 companies over two months. Six of them couldn't sponsor. Found out after the interview. The register existed the whole time — just no way to search it properly.",
    time: "2 months, 6 wasted applications",
  },
  {
    name: "Tolu A.",
    location: "Manchester, England",
    field: "MEng Mechanical Engineering",
    avatar: "TA",
    color: "#5b9cf6",
    bg: "rgba(91,156,246,0.18)",
    before: "I didn't even know the register existed until my fourth month of searching. My university careers team didn't mention it. I was just guessing which companies could sponsor.",
    time: "4 months searching blind",
  },
  {
    name: "Priya K.",
    location: "London, England",
    field: "MSc Finance",
    avatar: "PK",
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.18)",
    before: "The CSV has 125,000 rows. No sector column. No salary data. I spent a full weekend building a spreadsheet just to make it searchable. That shouldn't be necessary.",
    time: "A full weekend. Just to search.",
  },
];

const FAQ_ITEMS = [
  { q: "Is SponsorMap free to use?", a: "Yes. The sponsor directory, search, filters, salary checker, and AI assistant are all free. Job alerts, per-job CV generation, and Telegram notifications are part of V2 — sign up to get early access." },
  { q: "Where does the data come from?", a: "The Home Office publishes a Register of Licensed Sponsors, updated roughly every two weeks. SponsorMap pulls directly from that register. Every company you see has been verified by the UK government as eligible to sponsor Skilled Worker or Health & Care Worker visas." },
  { q: "What's the difference between A-rated and B-rated sponsors?", a: "An A-rating means the employer holds a full sponsor licence with no restrictions. B-rated sponsors are under a licensing action plan — they can still sponsor but are being monitored. Always check the Gov.uk register before applying to a B-rated company." },
  { q: "What salary do I need for a Skilled Worker visa in 2026?", a: "The general threshold is £41,700 per year, or £33,400 if you qualify as a new entrant (under 26, switching from a Student visa, or in a recognised shortage occupation). Use the Salary Checker to verify your specific role." },
  { q: "Can I use SponsorMap to find NHS jobs specifically?", a: "Yes. Filter by the Healthcare sector and select Scotland or any English region. NHS trusts are the largest single group of Health & Care Worker sponsors in the register. The upcoming Scotland filter (V2) will narrow this further to NHS Scotland bands." },
  { q: "How often is the data updated?", a: "The Home Office register is updated roughly every two weeks. SponsorMap syncs on the same schedule. The live dot in the search tool shows you the last sync date." },
];

function LandingPage({ onSearch }) {
  const [heroSearch,    setHeroSearch]    = useState("");
  const [subscribeFor,  setSubscribeFor]  = useState(null);
  const [waitEmail,     setWaitEmail]     = useState("");
  const [waitSubmitted, setWaitSubmitted] = useState(false);
  const [waitError,     setWaitError]     = useState("");
  const [openFaq,       setOpenFaq]       = useState(null);
  const [footerEmail,   setFooterEmail]   = useState("");
  const [footerDone,    setFooterDone]    = useState(false);

  useScrollReveal();

  const handleHeroSearch = () => onSearch("search", heroSearch);

  const handleWaitSubmit = () => {
    if (!waitEmail.trim()) { setWaitError("Enter your email address."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(waitEmail)) { setWaitError("That doesn't look like a valid email."); return; }
    setWaitError(""); setWaitSubmitted(true);
  };

  const handleFeatureClick = (f) => {
    if (f.live) {
      if (f.action === "ai") { onSearch("ai"); }
      else if (f.action === "salary") { onSearch("salary"); }
      else { onSearch("search"); }
    } else { setSubscribeFor(f); }
  };

  return (
    <div style={{ position: "relative", zIndex: 1 }}>
      {subscribeFor && <SubscribeModal feature={subscribeFor} onClose={() => setSubscribeFor(null)} />}

      {/* ── HERO ── */}
      <section style={{ background: "var(--hero-bg)", position: "relative", overflow: "hidden", padding: "80px 20px 96px" }}>
        {/* Dot grid */}
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, opacity: 0.1 }}>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="hero-dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="rgba(255,255,255,0.7)" /></pattern></defs>
            <rect width="100%" height="100%" fill="url(#hero-dots)" />
          </svg>
        </div>
        {/* Glow orbs */}
        <div aria-hidden="true" style={{ position: "absolute", top: "-80px", right: "-60px", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(196,160,100,0.13) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div aria-hidden="true" style={{ position: "absolute", bottom: "-60px", left: "-80px", width: "380px", height: "380px", borderRadius: "50%", background: "radial-gradient(circle, rgba(91,156,246,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: "720px", margin: "0 auto", textAlign: "center", position: "relative" }}>
          {/* Eyebrow */}
          <div className="fade-up" style={{ display: "inline-flex", alignItems: "center", gap: "7px", padding: "5px 14px", background: "rgba(196,160,100,0.12)", border: "1px solid rgba(196,160,100,0.25)", borderRadius: "50px", marginBottom: "28px" }}>
            <span className="live-dot" style={{ width: "6px", height: "6px" }} />
            <span style={{ fontSize: "11px", fontWeight: "600", color: "rgba(240,234,216,0.85)", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--ff-mono)" }}>Home Office Register · Updated Daily</span>
          </div>

          {/* Headline */}
          <h1 className="fade-up" style={{ fontFamily: "var(--ff-display)", fontSize: "clamp(36px, 8vw, 60px)", fontWeight: "700", color: "var(--hero-text)", lineHeight: "1.07", letterSpacing: "-0.03em", marginBottom: "22px", minHeight: "clamp(88px, 18vw, 132px)" }}>
            Find UK employers who<br />
            <em style={{ color: "var(--accent)", fontStyle: "italic" }}>
              <Typewriter text="can actually hire you." delay={600} />
            </em>
          </h1>

          {/* Sub */}
          <p className="fade-up" style={{ animationDelay: "0.15s", fontSize: "16px", color: "var(--hero-muted)", lineHeight: "1.75", maxWidth: "500px", margin: "0 auto 36px" }}>
            Search 120,000+ companies licensed by the Home Office to sponsor your visa. Filter by city, sector, and route.
          </p>

          {/* Hero search */}
          <div className="fade-up" style={{ animationDelay: "0.22s", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", borderRadius: "var(--r-xl)", padding: "12px", border: "1px solid rgba(255,255,255,0.13)", maxWidth: "580px", margin: "0 auto 24px" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <span aria-hidden="true" style={{ color: "rgba(255,255,255,0.35)", fontSize: "18px", flexShrink: 0, paddingLeft: "6px" }}>⌕</span>
              <input value={heroSearch} onChange={e => setHeroSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && handleHeroSearch()}
                placeholder="Company name, city, or sector..." className="hero-field" aria-label="Search for a sponsor" style={{ flex: 1, padding: "10px 8px" }} />
              <button className="btn-hero-pill" onClick={handleHeroSearch} aria-label="Search sponsors" style={{ flexShrink: 0 }}>
                <span className="btn-hero-pill-label">Search</span>
                <span className="btn-hero-pill-icon">→</span>
              </button>
            </div>
          </div>

          {/* Social proof — Awake style */}
          <div className="fade-up" style={{ animationDelay: "0.32s", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0" }}>
              <div className="avatar-stack">
                {[
                  { bg: "rgba(196,160,100,0.8)", label: "AO" },
                  { bg: "rgba(91,156,246,0.8)",  label: "RP" },
                  { bg: "rgba(74,222,128,0.8)",  label: "CM" },
                  { bg: "rgba(251,113,133,0.8)", label: "TK" },
                  { bg: "rgba(167,139,250,0.8)", label: "SB" },
                ].map(a => (
                  <div key={a.label} className="avatar-stack-item" style={{ background: a.bg }} aria-hidden="true">{a.label[0]}</div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ color: "#facc15", fontSize: "13px", letterSpacing: "1px" }}>★★★★★</span>
              <span style={{ fontSize: "13px", color: "rgba(240,234,216,0.65)" }}>Free · No sign-up required</span>
            </div>
          </div>

          {/* Hero product preview strip */}
          <div className="fade-up" style={{ animationDelay: "0.42s", marginTop: "36px", display: "flex", gap: "10px", overflowX: "auto", WebkitOverflowScrolling: "touch", scrollSnapType: "x mandatory", paddingBottom: "4px" }} aria-label="Live sponsor examples">
            {SPONSORS.slice(0,3).map(s => {
              const meta = SECTOR_META[s.sector] || { icon: "◉", color: "var(--accent)" };
              return (
                <button key={s.id} className="hero-preview-card" onClick={() => onSearch("search", s.name)} aria-label={`View ${s.name}`}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", color: meta.color, flexShrink: 0 }}>{meta.icon}</div>
                  <div style={{ minWidth: 0, textAlign: "left" }}>
                    <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--hero-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name.split(" ").slice(0,2).join(" ")}</div>
                    <div style={{ fontSize: "10px", color: "rgba(240,234,216,0.5)", fontFamily: "var(--ff-mono)" }}>{s.sector} · {s.town}</div>
                  </div>
                  <div style={{ marginLeft: "auto", flexShrink: 0, fontSize: "9px", fontWeight: "700", padding: "2px 7px", borderRadius: "4px", background: "rgba(74,222,128,0.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)", fontFamily: "var(--ff-mono)" }}>A</div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── STATS STRIP — 3 stats, breathing room ── */}
      <section style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: "640px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", background: "var(--border)" }}>
          {[
            { val: "120k+",   label: "Licensed sponsors" },
            { val: "6,240+",  label: "UK cities covered"  },
            { val: "£41,700", label: "2026 CoS threshold" },
          ].map(({ val, label }) => (
            <div key={label} style={{ background: "var(--bg-card)", padding: "28px 16px", textAlign: "center" }}>
              <div className="count-up" style={{ fontFamily: "var(--ff-display)", fontSize: "24px", fontWeight: "700", color: "var(--accent)", letterSpacing: "-0.02em", marginBottom: "6px" }}>{val}</div>
              <div className="mono-label" style={{ color: "var(--t-muted)" }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding: "80px 20px 0" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div className="reveal" style={{ marginBottom: "44px" }}>
            <div className="mono-label" style={{ color: "var(--accent)", marginBottom: "10px" }}>Everything SponsorMap does</div>
            <h2 style={{ fontFamily: "var(--ff-display)", fontSize: "clamp(26px, 5vw, 38px)", fontWeight: "700", color: "var(--t-primary)", letterSpacing: "-0.025em", lineHeight: "1.15", marginBottom: "12px" }}>
              One tool. The complete job hunt.
            </h2>
            <p style={{ fontSize: "14px", color: "var(--t-muted)", maxWidth: "480px" }}>
              Live features work now. Coming-soon features are in build — subscribe to get notified when they ship.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "14px", marginBottom: "16px" }}>
            {FEATURES.map((f, i) => (
              <button key={f.id} onClick={() => handleFeatureClick(f)}
                aria-label={f.live ? `Open ${f.label}` : `Subscribe to ${f.label}`}
                className={`reveal reveal-delay-${Math.min(i+1,4)}${!f.live ? " reveal-dim" : ""}`}
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--r-xl)", padding: "22px 20px", textAlign: "left", cursor: "pointer", transition: "transform 0.22s cubic-bezier(0.4,0,0.2,1), box-shadow 0.22s cubic-bezier(0.4,0,0.2,1), border-color 0.22s cubic-bezier(0.4,0,0.2,1)", position: "relative", overflow: "hidden" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "var(--sh-raised)"; e.currentTarget.style.borderColor = `var(--${f.colorVar})`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "var(--border)"; }}
              >
                <div style={{ position: "absolute", top: "14px", right: "14px" }}>
                  {f.live
                    ? <span style={{ fontSize: "9px", fontWeight: "700", letterSpacing: "0.08em", padding: "3px 7px", borderRadius: "20px", background: "var(--c-green-dim)", color: "var(--c-green)", border: "1px solid var(--c-green-border)", textTransform: "uppercase", fontFamily: "var(--ff-mono)" }}>Live</span>
                    : <span style={{ fontSize: "9px", fontWeight: "700", letterSpacing: "0.08em", padding: "3px 7px", borderRadius: "20px", background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent-mid)", textTransform: "uppercase", fontFamily: "var(--ff-mono)" }}>Soon</span>
                  }
                </div>
                <div style={{ width: "46px", height: "46px", borderRadius: "var(--r-md)", background: f.colorDimVar, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "21px", color: `var(--${f.colorVar})`, marginBottom: "14px", flexShrink: 0 }}>{f.icon}</div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--t-primary)", fontFamily: "var(--ff-display)", letterSpacing: "-0.01em", marginBottom: "5px" }}>{f.label}</div>
                <div style={{ fontSize: "12px", color: "var(--t-muted)", lineHeight: "1.5", marginBottom: "14px" }}>{f.tagline}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {f.bullets.map(b => (
                    <div key={b} style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                      <span style={{ color: f.live ? `var(--${f.colorVar})` : "var(--t-muted)", fontSize: "10px", flexShrink: 0, marginTop: "2px" }}>✓</span>
                      <span style={{ fontSize: "11px", color: "var(--t-secondary)", lineHeight: "1.4" }}>{b}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: "16px", fontSize: "11px", fontWeight: "600", color: f.live ? `var(--${f.colorVar})` : "var(--accent)" }}>
                  {f.live ? "Use now →" : "🔔 Notify me when live"}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: "80px 20px 0" }}>
        <div style={{ maxWidth: "860px", margin: "0 auto" }}>
          <div className="reveal" style={{ marginBottom: "40px" }}>
            <div className="mono-label" style={{ color: "var(--accent)", marginBottom: "10px" }}>How it works</div>
            <h2 style={{ fontFamily: "var(--ff-display)", fontSize: "clamp(24px, 5vw, 34px)", fontWeight: "700", color: "var(--t-primary)", letterSpacing: "-0.025em", lineHeight: "1.2" }}>
              From search to application in minutes
            </h2>
          </div>
          <div className="steps-row" style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            {[
              { num: "01", icon: "⌕", color: "#2563eb", colorDim: "rgba(37,99,235,0.1)", title: "Search", body: "Type a company name or city. 120,000+ sponsors. Results in under a second." },
              { num: "02", icon: "◈", color: "#d97706", colorDim: "rgba(217,119,6,0.1)", title: "Filter", body: "Sector chips. City dropdown. Visa route. Stack filters until the list is exactly what you need." },
              { num: "03", icon: "✦", color: "#a78bfa", colorDim: "rgba(167,139,250,0.1)", title: "Ask AI", body: "Not sure which route you qualify for? Ask the AI. It knows the 2026 salary thresholds cold." },
              { num: "04", icon: "➤", color: "#16a34a", colorDim: "rgba(22,163,74,0.1)", title: "Apply", body: "Click any company. Hit Reed, LinkedIn, or Gov.uk directly. No extra steps between you and the job." },
            ].map((s, i) => (
              <div key={s.num} className={`step-card reveal reveal-delay-${i+1}`} style={{ flex: "1 1 180px" }}>
                <div aria-hidden="true" style={{ position: "absolute", top: "8px", right: "12px", fontFamily: "var(--ff-mono)", fontSize: "64px", fontWeight: "500", color: "var(--accent)", lineHeight: 1, userSelect: "none", opacity: 0.08, letterSpacing: "-0.04em" }}>{s.num}</div>
                <div style={{ width: "44px", height: "44px", borderRadius: "var(--r-md)", background: s.colorDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", color: s.color, marginBottom: "14px" }}>{s.icon}</div>
                <div style={{ fontSize: "17px", fontWeight: "700", color: "var(--t-primary)", fontFamily: "var(--ff-display)", letterSpacing: "-0.01em", marginBottom: "8px" }}>{s.title}</div>
                <div style={{ fontSize: "13px", color: "var(--t-muted)", lineHeight: "1.65" }}>{s.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PAIN STORIES ── */}
      <section style={{ padding: "80px 20px 0" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div className="reveal" style={{ marginBottom: "40px" }}>
            <div className="mono-label" style={{ color: "var(--accent)", marginBottom: "10px" }}>The problem it solves</div>
            <h2 style={{ fontFamily: "var(--ff-display)", fontSize: "clamp(24px, 5vw, 34px)", fontWeight: "700", color: "var(--t-primary)", letterSpacing: "-0.025em", lineHeight: "1.2" }}>
              This is what job hunting looked like before.
            </h2>
            <p style={{ fontSize: "14px", color: "var(--t-muted)", marginTop: "10px", maxWidth: "520px", lineHeight: "1.7" }}>
              Real international students in the UK. Real hours lost. The register existed — just no way to search it.
            </p>
          </div>
          <div className="testi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
            {STORIES.map((s, i) => (
              <div key={s.name} className={`testi-card reveal reveal-delay-${i + 1}`}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: s.bg, border: `1px solid ${s.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "700", color: s.color, flexShrink: 0 }}>{s.avatar}</div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--t-primary)" }}>{s.name}</div>
                    <div style={{ fontSize: "11px", color: "var(--t-muted)", fontFamily: "var(--ff-mono)" }}>{s.field} · {s.location}</div>
                  </div>
                </div>

                {/* What they did before */}
                <p style={{ fontSize: "14px", color: "var(--t-secondary)", lineHeight: "1.75" }}>
                  "{s.before}"
                </p>

                {/* Time cost badge */}
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "5px 12px", background: "var(--c-yellow-dim)", border: "1px solid var(--c-yellow-border)", borderRadius: "20px", marginTop: "auto" }}>
                  <span style={{ fontSize: "11px", color: "var(--c-yellow)" }}>⏱</span>
                  <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--c-yellow)", fontFamily: "var(--ff-mono)" }}>{s.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VS COMPARISON ── */}
      <section style={{ padding: "80px 20px 0" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto" }}>
          <div className="reveal" style={{ marginBottom: "36px" }}>
            <div className="mono-label" style={{ color: "var(--accent)", marginBottom: "10px" }}>Why SponsorMap</div>
            <h2 style={{ fontFamily: "var(--ff-display)", fontSize: "clamp(24px, 5vw, 34px)", fontWeight: "700", color: "var(--t-primary)", letterSpacing: "-0.025em", lineHeight: "1.2" }}>
              Better than searching Gov.uk manually.
            </h2>
          </div>
          <div className="reveal" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--r-xl)", overflow: "hidden" }}>
            <table className="cmp-table">
              <thead>
                <tr>
                  <th style={{ width: "40%" }}>Feature</th>
                  <th style={{ width: "30%", color: "var(--accent)" }}>SponsorMap</th>
                  <th className="cmp-hide-mobile" style={{ width: "30%" }}>Gov.uk Register</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Search by sector",           true,  false],
                  ["Filter by city or region",   true,  false],
                  ["Salary threshold checker",   true,  false],
                  ["AI visa Q&A assistant",      true,  false],
                  ["Job links per company",      true,  false],
                  ["Bookmark sponsors",          true,  false],
                  ["Weekly digest alerts (V2)",  true,  false],
                  ["Official government source", true,  true ],
                ].map(([feat, sm, gov]) => (
                  <tr key={feat}>
                    <td>{feat}</td>
                    <td><span className={sm ? "cmp-yes" : "cmp-no"}>{sm ? "✓ Yes" : "✗ No"}</span></td>
                    <td className="cmp-hide-mobile"><span className={gov ? "cmp-yes" : "cmp-no"}>{gov ? "✓ Yes" : "✗ No"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── ECOSYSTEM ── */}
      <section style={{ padding: "80px 20px 0" }}>
        <div style={{ maxWidth: "860px", margin: "0 auto" }}>
          <div className="reveal" style={{ marginBottom: "28px" }}>
            <div className="mono-label" style={{ color: "var(--accent)", marginBottom: "10px" }}>The ENGTX Job Intelligence Suite</div>
            <h2 style={{ fontFamily: "var(--ff-display)", fontSize: "clamp(22px, 4vw, 30px)", fontWeight: "700", color: "var(--t-primary)", letterSpacing: "-0.025em", lineHeight: "1.2" }}>
              SponsorMap is just the entry point
            </h2>
          </div>
          <div className="reveal" style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
            {ECOSYSTEM.map((tool) => (
              <div key={tool.name} style={{ flex: "1 1 150px", maxWidth: "180px", background: tool.status === "live" ? "var(--accent-dim)" : "var(--bg-card)", border: `1px solid ${tool.status === "live" ? "var(--accent-mid)" : "var(--border)"}`, borderRadius: "var(--r-lg)", padding: "18px 16px", textAlign: "center", position: "relative" }}>
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>{tool.icon}</div>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--t-primary)", marginBottom: "3px", fontFamily: "var(--ff-display)" }}>{tool.name}</div>
                <div style={{ fontSize: "11px", color: "var(--t-muted)", lineHeight: "1.4", marginBottom: "10px" }}>{tool.desc}</div>
                <span style={{ fontSize: "9px", fontWeight: "700", letterSpacing: "0.08em", padding: "3px 8px", borderRadius: "20px", textTransform: "uppercase", fontFamily: "var(--ff-mono)", background: tool.status === "live" ? "var(--c-green-dim)" : tool.status === "suite" ? "rgba(37,99,235,0.1)" : "var(--accent-dim)", color: tool.status === "live" ? "var(--c-green)" : tool.status === "suite" ? "var(--c-blue)" : "var(--accent)", border: `1px solid ${tool.status === "live" ? "var(--c-green-border)" : tool.status === "suite" ? "rgba(37,99,235,0.2)" : "var(--accent-mid)"}` }}>
                  {tool.status === "live" ? "Live" : tool.status === "suite" ? "In suite" : "Coming"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: "80px 20px 0" }}>
        <div style={{ maxWidth: "680px", margin: "0 auto" }}>
          <div className="reveal" style={{ marginBottom: "36px" }}>
            <div className="mono-label" style={{ color: "var(--accent)", marginBottom: "10px" }}>Common questions</div>
            <h2 style={{ fontFamily: "var(--ff-display)", fontSize: "clamp(24px, 5vw, 34px)", fontWeight: "700", color: "var(--t-primary)", letterSpacing: "-0.025em", lineHeight: "1.2" }}>
              Things people ask before they search.
            </h2>
          </div>
          <div className="reveal" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--r-xl)", padding: "0 24px" }}>
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="faq-item">
                <button className="faq-btn" onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i}>
                  {item.q}
                  <span className={`faq-chevron ${openFaq === i ? "open" : ""}`}>⌄</span>
                </button>
                {openFaq === i && <div className="faq-body">{item.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WAITLIST CTA ── */}
      <section style={{ padding: "80px 20px 48px" }}>
        <div style={{ maxWidth: "660px", margin: "0 auto" }}>
          <div className="reveal" style={{ background: "var(--hero-bg)", borderRadius: "var(--r-xl)", overflow: "hidden", position: "relative" }}>
            <div aria-hidden="true" style={{ position: "absolute", inset: 0, opacity: 0.07 }}>
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs><pattern id="wait-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="rgba(255,255,255,0.8)" /></pattern></defs>
                <rect width="100%" height="100%" fill="url(#wait-dots)" />
              </svg>
            </div>
            <div style={{ position: "relative", padding: "48px 36px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "20px", marginBottom: "18px" }}>
                <span style={{ fontSize: "9px", fontWeight: "700", color: "rgba(240,234,216,0.9)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--ff-mono)" }}>V2 Early Access</span>
              </div>
              <h2 style={{ fontFamily: "var(--ff-display)", fontSize: "clamp(22px, 5vw, 30px)", fontWeight: "700", color: "var(--hero-text)", letterSpacing: "-0.02em", lineHeight: "1.2", marginBottom: "12px" }}>
                Stop applying blind.
              </h2>
              <p style={{ fontSize: "14px", color: "var(--hero-muted)", lineHeight: "1.75", marginBottom: "28px", maxWidth: "400px" }}>
                Job alerts, CV generation, Telegram notifications — all in build. First 200 sign-ups get Pro free for 3 months.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "28px" }}>
                {FEATURES.filter(f => !f.live).slice(0, 4).map(f => (
                  <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "var(--r-md)", padding: "10px 12px" }}>
                    <span style={{ fontSize: "15px", color: `var(--${f.colorVar})`, flexShrink: 0 }}>{f.icon}</span>
                    <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--hero-text)" }}>{f.label}</span>
                  </div>
                ))}
              </div>
              {!waitSubmitted ? (
                <div>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <input type="email" value={waitEmail} onChange={e => { setWaitEmail(e.target.value); setWaitError(""); }}
                      onKeyDown={e => e.key === "Enter" && handleWaitSubmit()}
                      placeholder="your@email.com" autoComplete="email" aria-label="Email for early access"
                      style={{ flex: 1, minWidth: "200px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "var(--r-md)", padding: "12px 14px", color: "#fff", fontSize: "14px", fontFamily: "var(--ff-ui)", outline: "none" }}
                      onFocus={e => e.target.style.background = "rgba(255,255,255,0.18)"}
                      onBlur={e => e.target.style.background = "rgba(255,255,255,0.1)"}
                    />
                    <button onClick={handleWaitSubmit} className="btn-hero-pill" style={{ flexShrink: 0 }}>
                      <span className="btn-hero-pill-label">Get early access</span>
                      <span className="btn-hero-pill-icon">→</span>
                    </button>
                  </div>
                  {waitError && <p style={{ fontSize: "12px", color: "var(--c-rose)", marginTop: "6px" }}>{waitError}</p>}
                  <p style={{ fontSize: "11px", color: "rgba(240,234,216,0.45)", marginTop: "10px" }}>🔒 No spam. One email when V2 ships. <button onClick={() => onSearch("privacy")} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(240,234,216,0.5)", fontSize: "11px", padding: 0, textDecoration: "underline", fontFamily: "var(--ff-ui)" }}>Privacy policy</button>.</p>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: "var(--r-md)", padding: "16px 18px" }}>
                  <span style={{ fontSize: "20px" }}>✓</span>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--hero-text)", marginBottom: "2px" }}>You're on the list.</div>
                    <div style={{ fontSize: "12px", color: "var(--hero-muted)" }}>We'll email you when V2 goes live.</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: "40px 20px" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "36px" }}>
          {/* Brand */}
          <div style={{ maxWidth: "240px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "linear-gradient(135deg, var(--accent), var(--accent-hi))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="10" height="12" viewBox="0 0 16 18" fill="none" aria-hidden="true">
                  <path d="M8 0C4.686 0 2 2.686 2 6c0 4.5 6 12 6 12s6-7.5 6-12c0-3.314-2.686-6-6-6z" fill="white" fillOpacity="0.95"/>
                  <circle cx="8" cy="6" r="2.2" fill="rgba(0,0,0,0.35)"/>
                </svg>
              </div>
              <span style={{ fontFamily: "var(--ff-display)", fontSize: "16px", fontWeight: "600", color: "var(--t-primary)" }}>SponsorMap</span>
            </div>
            <p style={{ fontSize: "12px", color: "var(--t-muted)", lineHeight: "1.75", marginBottom: "4px" }}>
              UK visa sponsor discovery. Data from the Home Office Register of Licensed Sponsors.
            </p>
            <p style={{ fontSize: "11px", color: "var(--t-muted)", lineHeight: "1.6" }}>Part of the <a href="https://engtx.co.uk" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>ENGTX</a> Job Intelligence Suite.</p>
            <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
              <a href="https://x.com/ToriolaSegun2" target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: "var(--t-muted)", transition: "color var(--ease)" }} onMouseEnter={e => e.currentTarget.style.color = "var(--accent)"} onMouseLeave={e => e.currentTarget.style.color = "var(--t-muted)"}>𝕏 @ToriolaSegun2</a>
              <a href="https://github.com/Oluwaseun22/sponsormap" target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: "var(--t-muted)", transition: "color var(--ease)" }} onMouseEnter={e => e.currentTarget.style.color = "var(--accent)"} onMouseLeave={e => e.currentTarget.style.color = "var(--t-muted)"}>GitHub ↗</a>
            </div>
          </div>

          {/* Links */}
          <div style={{ display: "flex", gap: "48px", flexWrap: "wrap" }}>
            <div>
              <div className="mono-label" style={{ color: "var(--t-secondary)", marginBottom: "14px" }}>Quick links</div>
              {[["Search Sponsors", "search"], ["Salary Checker", "salary"], ["Ask AI", "ai"], ["About", "about"], ["Privacy Policy", "privacy"]].map(([label, key]) => (
                <div key={key} style={{ marginBottom: "9px" }}>
                  <button onClick={() => onSearch(key)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "var(--t-muted)", padding: 0, transition: "color var(--ease)", fontFamily: "var(--ff-ui)" }}
                    onMouseEnter={e => e.currentTarget.style.color = "var(--accent)"}
                    onMouseLeave={e => e.currentTarget.style.color = "var(--t-muted)"}
                  >{label}</button>
                </div>
              ))}
            </div>

            {/* Newsletter */}
            <div style={{ maxWidth: "220px" }}>
              <div className="mono-label" style={{ color: "var(--t-secondary)", marginBottom: "14px" }}>Weekly digest</div>
              <p style={{ fontSize: "12px", color: "var(--t-muted)", lineHeight: "1.65", marginBottom: "2px" }}>New sponsors in your sector, every Monday.</p>
              {!footerDone ? (
                <div className="footer-newsletter">
                  <input type="email" value={footerEmail} onChange={e => setFooterEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && footerEmail.includes("@")) setFooterDone(true); }}
                    placeholder="your@email.com" aria-label="Subscribe to weekly digest"
                    className="footer-email-input" />
                  <button onClick={() => { if (footerEmail.includes("@")) setFooterDone(true); }} className="footer-newsletter-btn" aria-label="Subscribe">→</button>
                </div>
              ) : (
                <p style={{ fontSize: "12px", color: "var(--c-green)", marginTop: "8px", fontFamily: "var(--ff-mono)" }}>✓ Subscribed</p>
              )}
            </div>
          </div>
        </div>

        <div style={{ maxWidth: "960px", margin: "24px auto 0", paddingTop: "18px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          <span style={{ fontSize: "11px", color: "var(--t-muted)" }}>© 2026 SponsorMap · <a href="https://sponsormap.engtx.co.uk" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>sponsormap.engtx.co.uk</a></span>
          <span style={{ fontSize: "11px", color: "var(--t-muted)" }}>Data: <a href="https://find-employer-sponsors.homeoffice.gov.uk" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>Home Office Register</a></span>
        </div>
      </footer>
    </div>
  );
}

// ─── Search tool ──────────────────────────────────────────────────────────────

function SponsorCard({ sponsor, index, isBookmarked, onBookmark }) {
  const [open, setOpen] = useState(false);
  const meta     = SECTOR_META[sponsor.sector] || { icon: "◉", color: "var(--t-muted)" };
  const isARated = sponsor.rating === "A";
  const reedUrl     = `https://www.reed.co.uk/jobs?keywords=${encodeURIComponent(sponsor.name.split(" ")[0])}&location=${encodeURIComponent(sponsor.town)}`;
  const linkedinUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(sponsor.name)}&location=${encodeURIComponent(sponsor.town)}`;

  return (
    <div className="card-enter" style={{ animationDelay: `${Math.min(index * 0.045, 0.5)}s` }}>
      <div
        style={{
          background: open ? "var(--bg-card-hi)" : "var(--bg-card)",
          border: `1px solid ${open ? "var(--accent-mid)" : "var(--border)"}`,
          borderRadius: open ? "var(--r-lg) var(--r-lg) 0 0" : "var(--r-lg)",
          padding: "14px 16px",
          borderLeft: `3px solid ${meta.color}`,
          paddingLeft: "14px",
          transition: "background var(--ease), border-color var(--ease), box-shadow var(--ease)",
        }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.background = "var(--bg-card-hi)"; e.currentTarget.style.boxShadow = `0 4px 20px rgba(0,0,0,0.15), inset 0 0 0 0 transparent`; } }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = "var(--bg-card)"; e.currentTarget.style.boxShadow = "none"; } }}
      >
        {/* Top row: icon + name + rating */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "var(--r-sm)", flexShrink: 0, background: "var(--bg-raised)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", color: meta.color }}>
            {meta.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--t-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>
              {sponsor.name}
            </div>
          </div>
          <span style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "0.06em", padding: "3px 8px", borderRadius: "6px", flexShrink: 0, background: isARated ? "var(--c-green-dim)" : "var(--c-yellow-dim)", color: isARated ? "var(--c-green)" : "var(--c-yellow)", border: `1px solid ${isARated ? "var(--c-green-border)" : "var(--c-yellow-border)"}` }}>
            {isARated ? "✓ A-Rated" : "⚠ B-Rated"}
          </span>
        </div>

        {/* Tag row: sector + location + route — all visible, no expand needed */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: "600", padding: "3px 9px", borderRadius: "20px", background: "var(--accent-dim)", border: "1px solid var(--accent-mid)", color: "var(--accent)" }}>
            <span style={{ color: meta.color }}>{meta.icon}</span> {sponsor.sector}
          </span>
          <span className="mono-label" style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", borderRadius: "20px", background: "var(--bg-raised)", border: "1px solid var(--border)", color: "var(--t-secondary)" }}>
            ↟ {sponsor.town}
          </span>
          <span className="mono-label" style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", borderRadius: "20px", background: "var(--bg-raised)", border: "1px solid var(--border)", color: "var(--t-secondary)" }}>
            {sponsor.route === "Skilled Worker" ? "SW" : "HC"}
          </span>
          {/* Expand toggle — only to show job links */}
          <button
            role="button"
            aria-expanded={open}
            aria-label={open ? "Hide job links" : "Show job links"}
            onClick={() => setOpen(o => !o)}
            onKeyDown={e => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen(o => !o))}
            style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: "600", padding: "3px 10px", borderRadius: "20px", background: "none", border: "1px solid var(--border)", color: "var(--t-muted)", cursor: "pointer", transition: "all var(--ease)", whiteSpace: "nowrap" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--t-muted)"; }}
          >
            {open ? "Hide links ↑" : "Find jobs →"}
          </button>
          <button
            onClick={e => { e.stopPropagation(); onBookmark(sponsor); }}
            className={`bm-btn${isBookmarked ? " active" : ""}`}
            aria-label={isBookmarked ? "Remove bookmark" : "Bookmark this sponsor"}
            title={isBookmarked ? "Bookmarked" : "Save for later"}
          >
            {isBookmarked ? "★" : "☆"}
          </button>
        </div>
      </div>

      {/* Expanded: job links only */}
      {open && (
        <div style={{ background: "var(--bg-card-hi)", border: "1px solid var(--accent-mid)", borderTop: "1px solid var(--border)", borderRadius: "0 0 var(--r-lg) var(--r-lg)", padding: "12px 16px", display: "flex", gap: "8px", flexWrap: "wrap", animation: "fadeIn 0.18s ease forwards" }}>
          <a href={reedUrl}     target="_blank" rel="noopener noreferrer" className="act">Reed Jobs →</a>
          <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="act">LinkedIn →</a>
          <a href="https://find-employer-sponsors.homeoffice.gov.uk" target="_blank" rel="noopener noreferrer" className="act">Verify Gov.uk →</a>
        </div>
      )}
    </div>
  );
}

function ActiveFilters({ search, sectors, location, region, route, onClear }) {
  const pills = [
    ...(search   ? [{ key: "q",   label: `"${search}"` }] : []),
    ...sectors.map(s => ({ key: s, label: s })),
    ...(location ? [{ key: "loc", label: location }]       : []),
    ...(region   ? [{ key: "reg", label: region }]         : []),
    ...(route    ? [{ key: "rte", label: route }]          : []),
  ];
  if (!pills.length) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "12px", animation: "fadeIn 0.2s ease forwards" }}>
      <span style={{ fontSize: "11px", color: "var(--t-muted)", flexShrink: 0 }}>Filtering:</span>
      {pills.map(p => <span key={p.key} className="pill">{p.label}</span>)}
      <button onClick={onClear} aria-label="Clear all filters"
        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "11px", color: "var(--t-muted)", padding: "2px 4px", transition: "color var(--ease)" }}
        onMouseEnter={e => e.currentTarget.style.color = "var(--c-rose)"}
        onMouseLeave={e => e.currentTarget.style.color = "var(--t-muted)"}
      >✕ clear all</button>
    </div>
  );
}

function SearchTool({ initialSearch, initialSector, showAI, setShowAI }) {
  const [search,      setSearch]      = useState(initialSearch || "");
  const [debouncedQ,  setDebouncedQ]  = useState(initialSearch || "");
  const [sectors,     setSectors]     = useState(initialSector ? [initialSector] : []);
  const [location,    setLocation]    = useState("");
  const [region,      setRegion]      = useState("");
  const [route,       setRoute]       = useState("");
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(false);
  const [view,        setView]        = useState("search"); // "search" | "bookmarks"
  const { bookmarks, toggle, isBookmarked } = useBookmarks();
  const debounceRef = useRef(null);
  const PAGE_SIZE   = 10;

  // 300ms debounce on search input
  useEffect(() => {
    clearTimeout(debounceRef.current);
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      setDebouncedQ(search);
      setPage(1);
      setLoading(false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  // Reset page when any filter changes
  useEffect(() => { setPage(1); }, [sectors, location, region, route]);

  const toggleSector = useCallback(s => setSectors(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]), []);
  const clearAll     = useCallback(() => { setSearch(""); setDebouncedQ(""); setSectors([]); setLocation(""); setRegion(""); setRoute(""); setPage(1); }, []);
  const hasFilters   = !!(debouncedQ || sectors.length || location || region || route);

  const filtered = useMemo(() => {
    const q = debouncedQ.toLowerCase();
    return SPONSORS.filter(c => {
      const sponsorRegion = COUNTY_TO_REGION[c.county] ||
        (c.county && c.county !== "Not set" && c.county !== "NULL" ? "England" : "England");
      return (
        (!debouncedQ     || c.name.toLowerCase().includes(q) || c.town.toLowerCase().includes(q) || c.county.toLowerCase().includes(q)) &&
        (!sectors.length || sectors.includes(c.sector)) &&
        (!location       || c.town === location) &&
        (!region         || sponsorRegion === region) &&
        (!route          || c.route === route)
      );
    });
  }, [debouncedQ, sectors, location, region, route]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filterKey   = `${debouncedQ}|${sectors.join(",")}|${location}|${region}|${route}`;

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", padding: "32px 20px 120px", position: "relative", zIndex: 1 }}>

      {/* Page header */}
      <div style={{ marginBottom: "24px", animation: "fadeUp 0.5s ease forwards" }}>
        <h1 style={{ fontFamily: "var(--ff-display)", fontSize: "clamp(24px, 5vw, 32px)", fontWeight: "600", lineHeight: "1.15", letterSpacing: "-0.025em", color: "var(--t-primary)", marginBottom: "4px" }}>
          Search sponsors
        </h1>
        <p style={{ fontSize: "13px", color: "var(--t-muted)" }}>
          <span className="live-dot" style={{ marginRight: "6px" }} />
          120,000+ licensed sponsors · Home Office data
        </p>
      </div>

      {/* ── Unified search bar ── */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", display: "flex", alignItems: "stretch", gap: "0", marginBottom: "10px", overflow: "hidden", animation: "fadeUp 0.5s ease 0.06s forwards", opacity: 0, boxShadow: "var(--sh-card)", flexWrap: "wrap" }}>

        {/* Company name */}
        <div style={{ flex: "2 1 160px", position: "relative", borderRight: "1px solid var(--border)" }}>
          <span aria-hidden="true" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--t-muted)", fontSize: "14px", pointerEvents: "none" }}>⌕</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && null}
            placeholder="Company name..."
            aria-label="Search by company name"
            style={{ width: "100%", background: "transparent", border: "none", outline: "none", padding: "14px 14px 14px 38px", fontSize: "14px", color: "var(--t-primary)", fontFamily: "var(--ff-ui)" }}
          />
          {search && (
            <button onClick={() => setSearch("")} aria-label="Clear search"
              style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--t-muted)", fontSize: "16px", padding: "2px", lineHeight: 1 }}
            >×</button>
          )}
        </div>

        {/* City */}
        <div style={{ flex: "1 1 100px", borderRight: "1px solid var(--border)" }}>
          <select value={location} onChange={e => { setLocation(e.target.value); if (e.target.value) setRegion(""); }}
            aria-label="Filter by city"
            style={{ width: "100%", height: "100%", background: "transparent", border: "none", outline: "none", padding: "14px 28px 14px 14px", fontSize: "13px", color: location ? "var(--t-primary)" : "var(--t-muted)", fontFamily: "var(--ff-ui)", cursor: "pointer", backgroundImage: "var(--select-arrow)", backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", appearance: "none", WebkitAppearance: "none" }}>
            <option value="">All cities</option>
            {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        {/* Region */}
        <div style={{ flex: "1 1 100px", borderRight: "1px solid var(--border)" }}>
          <select value={region} onChange={e => { setRegion(e.target.value); if (e.target.value) setLocation(""); }}
            aria-label="Filter by region"
            style={{ width: "100%", height: "100%", background: "transparent", border: "none", outline: "none", padding: "14px 28px 14px 14px", fontSize: "13px", color: region ? "var(--t-primary)" : "var(--t-muted)", fontFamily: "var(--ff-ui)", cursor: "pointer", backgroundImage: "var(--select-arrow)", backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", appearance: "none", WebkitAppearance: "none" }}>
            <option value="">All regions</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Search button */}
        <button className="btn-p" aria-label="Search"
          style={{ borderRadius: "0", padding: "0 22px", fontSize: "13px", flexShrink: 0, height: "auto" }}>
          Search →
        </button>
      </div>

      {/* ── Popular cities strip ── */}
      <div style={{ marginBottom: "14px", animation: "fadeUp 0.5s ease 0.09s forwards", opacity: 0 }}>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: "var(--t-muted)", fontWeight: "500", flexShrink: 0 }}>Popular:</span>
          {POPULAR_CITIES.map(city => (
            <button key={city} onClick={() => { setLocation(city); setRegion(""); }}
              aria-label={`Filter by ${city}`}
              style={{
                padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "500",
                border: `1px solid ${location === city ? "var(--accent)" : "var(--border)"}`,
                background: location === city ? "var(--accent-dim)" : "transparent",
                color: location === city ? "var(--accent)" : "var(--t-muted)",
                cursor: "pointer", transition: "all var(--ease)", whiteSpace: "nowrap",
              }}
              onMouseEnter={e => { if (location !== city) { e.currentTarget.style.borderColor = "var(--border-hi)"; e.currentTarget.style.color = "var(--t-primary)"; }}}
              onMouseLeave={e => { if (location !== city) { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--t-muted)"; }}}
            >{city}</button>
          ))}
          {location && (
            <button onClick={() => setLocation("")} aria-label="Clear city filter"
              style={{ padding: "4px 8px", borderRadius: "20px", fontSize: "11px", background: "none", border: "none", cursor: "pointer", color: "var(--t-muted)", transition: "color var(--ease)" }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--c-rose)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--t-muted)"}
            >✕</button>
          )}
        </div>
      </div>

      {/* Sector chips — multi-select */}
      <div style={{ marginBottom: "16px", animation: "fadeUp 0.5s ease 0.12s forwards", opacity: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span style={{ fontSize: "11px", color: "var(--t-muted)", fontWeight: "500" }}>Filter by sector</span>
          {sectors.length > 0 && (
            <span style={{ fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "20px", background: "var(--accent-dim)", border: "1px solid var(--accent-mid)", color: "var(--accent)" }}>
              {sectors.length} selected
            </span>
          )}
          {sectors.length > 1 && (
            <button onClick={() => setSectors([])} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "11px", color: "var(--t-muted)", padding: 0, transition: "color var(--ease)" }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--c-rose)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--t-muted)"}
              aria-label="Clear sector filters"
            >✕ clear</button>
          )}
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }} role="group" aria-label="Filter by sector">
          {SECTORS.map(s => {
            const active = sectors.includes(s);
            const meta = SECTOR_META[s];
            return (
              <button
                key={s}
                onClick={() => toggleSector(s)}
                className="chip"
                aria-pressed={active}
                style={active ? {
                  background: `var(--${Object.entries({
                    Technology: "c-blue", Finance: "c-amber", Healthcare: "c-green",
                    Engineering: "c-slate", Education: "c-violet", Retail: "c-rose", Transport: "c-sky"
                  }).find(([k]) => k === s)?.[1]}, var(--accent))`,
                  borderColor: "transparent",
                  color: "#fff",
                  fontWeight: "700",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                } : {}}
              >
                <span aria-hidden="true" style={{ fontSize: "13px", color: active ? "#fff" : meta.color }}>{meta.icon}</span>
                {s}
                {active && <span aria-hidden="true" style={{ fontSize: "10px", opacity: 0.8 }}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      <ActiveFilters search={search} sectors={sectors} location={location} region={region} route={route} onClear={clearAll} />

      {/* ── View tabs: Results / Bookmarks ── */}
      <div style={{ display: "flex", gap: "0", marginBottom: "14px", borderBottom: "1px solid var(--border)" }}>
        {[["search", "Results"], ["bookmarks", `Saved (${bookmarks.length})`]].map(([v, label]) => (
          <button key={v} onClick={() => setView(v)}
            style={{ padding: "8px 18px", fontSize: "12px", fontWeight: "600", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--ff-ui)", borderBottom: `2px solid ${view === v ? "var(--accent)" : "transparent"}`, color: view === v ? "var(--accent)" : "var(--t-muted)", transition: "all var(--ease)", marginBottom: "-1px" }}
          >{label}</button>
        ))}
      </div>

      {/* ── SEARCH view ── */}
      {view === "search" && <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
          <span className="mono-label" style={{ color: "var(--t-muted)" }}>
            {loading
              ? "Searching..."
              : <><strong style={{ color: "var(--t-primary)", fontFamily: "var(--ff-mono)" }}>{filtered.length}</strong>{" "}sponsor{filtered.length !== 1 ? "s" : ""} found{totalPages > 1 && <span> · page {page} of {totalPages}</span>}</>
            }
          </span>
          {hasFilters && <button onClick={clearAll} className="btn-g" style={{ padding: "5px 12px", fontSize: "11px" }}>✕ Clear all</button>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }} role="list" aria-label="Sponsor results">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <div key={i} role="listitem"><SkeletonCard /></div>)
            : paginated.length > 0
            ? paginated.map((s, i) => (
                <div key={`${s.id}-${filterKey}-${page}`} role="listitem">
                  <SponsorCard sponsor={s} index={i} isBookmarked={isBookmarked(s.id)} onBookmark={toggle} />
                </div>
              ))
            : (
              <div style={{ textAlign: "center", padding: "60px 24px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--r-xl)", animation: "fadeIn 0.3s ease forwards" }}>
                <div style={{ fontSize: "36px", marginBottom: "14px", opacity: 0.35 }} aria-hidden="true">⌕</div>
                <div style={{ fontFamily: "var(--ff-display)", fontSize: "18px", color: "var(--t-primary)", marginBottom: "8px" }}>No sponsors found</div>
                <div style={{ fontSize: "13px", color: "var(--t-muted)", marginBottom: "22px", lineHeight: "1.6" }}>
                  {sectors.length > 0 && location ? `No ${sectors.join(" or ")} sponsors found in ${location}. Try adjusting your filters.`
                    : sectors.length > 0 && region  ? `No ${sectors.join(" or ")} sponsors found in ${region}. Try a different sector.`
                    : sectors.length > 0             ? `No ${sectors.join(" or ")} sponsors found. Try a different sector.`
                    : location                       ? `No sponsors found in ${location}. Try a different city.`
                    : region                         ? `No sponsors found in ${region}. Try a different region.`
                    : "No results match your search. Try different keywords or ask the AI."}
                </div>
                <button className="btn-p" onClick={() => setShowAI(true)}><span style={{ fontSize: "10px" }}>✦</span> Ask AI</button>
              </div>
            )
          }
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", marginTop: "24px", flexWrap: "wrap" }}>
            <button onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              disabled={page === 1} className="btn-g" style={{ padding: "7px 14px", fontSize: "12px", opacity: page === 1 ? 0.4 : 1 }}>← Prev</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pg = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i;
              return (
                <button key={pg} onClick={() => { setPage(pg); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  style={{ width: "34px", height: "34px", borderRadius: "var(--r-sm)", border: `1px solid ${page === pg ? "var(--accent)" : "var(--border)"}`, background: page === pg ? "var(--accent)" : "transparent", color: page === pg ? "#fff" : "var(--t-secondary)", fontSize: "12px", fontWeight: page === pg ? "700" : "500", cursor: "pointer", transition: "all var(--ease)", fontFamily: "var(--ff-ui)" }}>
                  {pg}
                </button>
              );
            })}
            <button onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              disabled={page === totalPages} className="btn-g" style={{ padding: "7px 14px", fontSize: "12px", opacity: page === totalPages ? 0.4 : 1 }}>Next →</button>
          </div>
        )}
      </>}

      {/* ── BOOKMARKS view ── */}
      {view === "bookmarks" && (
        bookmarks.length === 0
          ? (
            <div style={{ textAlign: "center", padding: "60px 24px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--r-xl)" }}>
              <div style={{ fontSize: "36px", marginBottom: "14px", opacity: 0.35 }}>☆</div>
              <div style={{ fontFamily: "var(--ff-display)", fontSize: "18px", color: "var(--t-primary)", marginBottom: "8px" }}>No saved sponsors yet</div>
              <div style={{ fontSize: "13px", color: "var(--t-muted)", marginBottom: "22px" }}>Hit the ☆ on any card to save it here.</div>
              <button className="btn-g" onClick={() => setView("search")} style={{ padding: "8px 20px", fontSize: "13px" }}>Back to search</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }} role="list" aria-label="Bookmarked sponsors">
              <div style={{ fontSize: "13px", color: "var(--t-muted)", marginBottom: "4px", paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
                <strong style={{ color: "var(--t-primary)" }}>{bookmarks.length}</strong> saved sponsor{bookmarks.length !== 1 ? "s" : ""}
              </div>
              {bookmarks.map((s, i) => (
                <div key={s.id} role="listitem">
                  <SponsorCard sponsor={s} index={i} isBookmarked={true} onBookmark={toggle} />
                </div>
              ))}
            </div>
          )
      )}

      {/* Disclaimer */}
      <div style={{ marginTop: "28px", padding: "14px 18px", background: "var(--c-yellow-dim)", border: "1px solid var(--c-yellow-border)", borderRadius: "var(--r-md)", fontSize: "12px", color: "var(--t-muted)", lineHeight: "1.7" }}>
        <span aria-hidden="true" style={{ color: "var(--c-yellow)", marginRight: "6px" }}>⚠</span>
        <strong style={{ color: "var(--t-secondary)" }}>Data sourced from the Home Office Register of Licensed Sponsors.</strong>
        {" "}Verify status on the{" "}
        <a href="https://find-employer-sponsors.homeoffice.gov.uk" target="_blank" rel="noopener noreferrer"
           style={{ color: "var(--accent)", fontWeight: "500" }}>official Home Office register</a>{" "}before applying.
      </div>
    </div>
  );
}

// ─── Salary checker ──────────────────────────────────────────────────────────

function SalaryChecker({ onSearch }) {
  const THRESHOLDS = [
    { label: "General threshold",      amount: "£41,700", note: "Most Skilled Worker roles",              color: "#16a34a" },
    { label: "New entrant rate",        amount: "£33,400", note: "Under 26, or switching from Student visa", color: "#2563eb" },
    { label: "Health & Care Worker",    amount: "£29,000", note: "NHS and care sector roles",              color: "#e11d48" },
    { label: "Shortage occupation",     amount: "£30,960", note: "Roles on the shortage list",             color: "#d97706" },
  ];

  const [salary, setSalary] = useState("");
  const numSalary = parseFloat(salary.replace(/[^0-9.]/g, "")) || 0;

  const getStatus = (threshold) => {
    if (!numSalary) return null;
    return numSalary >= parseFloat(threshold.replace("£","").replace(",","")) ? "pass" : "fail";
  };

  return (
    <div style={{ maxWidth: "660px", margin: "0 auto", padding: "32px 20px 120px", position: "relative", zIndex: 1 }}>
      <Background />

      <div style={{ marginBottom: "28px", animation: "fadeUp 0.5s ease forwards" }}>
        <button onClick={() => onSearch("home")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "var(--t-muted)", padding: "0 0 16px", fontFamily: "var(--ff-ui)", display: "flex", alignItems: "center", gap: "4px" }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--accent)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--t-muted)"}
        >← Back</button>
        <h1 style={{ fontFamily: "var(--ff-display)", fontSize: "clamp(26px, 6vw, 36px)", fontWeight: "600", lineHeight: "1.15", letterSpacing: "-0.025em", color: "var(--t-primary)", marginBottom: "6px" }}>
          Salary Checker
        </h1>
        <p style={{ fontSize: "14px", color: "var(--t-muted)" }}>Check if your salary meets the 2026 Certificate of Sponsorship thresholds.</p>
      </div>

      {/* Salary input */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--r-xl)", padding: "24px", marginBottom: "20px", boxShadow: "var(--sh-card)", animation: "fadeUp 0.5s ease 0.08s forwards", opacity: 0 }}>
        <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "var(--t-secondary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "10px" }}>
          Your annual salary (£)
        </label>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "var(--t-muted)", fontSize: "16px", fontWeight: "600", pointerEvents: "none" }}>£</span>
          <input
            type="number" value={salary} onChange={e => setSalary(e.target.value)}
            placeholder="e.g. 45000" min="0"
            aria-label="Annual salary in pounds"
            className="field"
            style={{ paddingLeft: "32px", fontSize: "18px", fontWeight: "600" }}
          />
        </div>
        {numSalary > 0 && (
          <p style={{ fontSize: "12px", color: "var(--t-muted)", marginTop: "8px" }}>
            = £{(numSalary / 12).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} per month
          </p>
        )}
      </div>

      {/* Threshold cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", animation: "fadeUp 0.5s ease 0.14s forwards", opacity: 0 }}>
        {THRESHOLDS.map(t => {
          const thresholdNum = parseFloat(t.amount.replace("£","").replace(",",""));
          const status = getStatus(t.amount);
          return (
            <div key={t.label} style={{ background: "var(--bg-card)", border: `1px solid ${status === "pass" ? "var(--c-green-border)" : status === "fail" ? "rgba(225,29,72,0.2)" : "var(--border)"}`, borderRadius: "var(--r-lg)", padding: "18px 20px", display: "flex", alignItems: "center", gap: "16px", transition: "all var(--ease)" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "var(--r-md)", background: `${t.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: "18px", fontWeight: "800", color: t.color, fontFamily: "var(--ff-display)" }}>£</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--t-primary)", marginBottom: "2px" }}>{t.label}</div>
                <div style={{ fontSize: "12px", color: "var(--t-muted)" }}>{t.note}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontFamily: "var(--ff-display)", fontSize: "18px", fontWeight: "700", color: t.color, letterSpacing: "-0.02em" }}>{t.amount}</div>
                {status && (
                  <div style={{ fontSize: "11px", fontWeight: "700", marginTop: "3px", color: status === "pass" ? "var(--c-green)" : "var(--c-rose)" }}>
                    {status === "pass" ? "✓ Meets threshold" : "✗ Below threshold"}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <div style={{ marginTop: "24px", padding: "14px 18px", background: "var(--c-yellow-dim)", border: "1px solid var(--c-yellow-border)", borderRadius: "var(--r-md)", fontSize: "12px", color: "var(--t-muted)", lineHeight: "1.7" }}>
        <span style={{ color: "var(--c-yellow)", marginRight: "6px" }}>⚠</span>
        <strong style={{ color: "var(--t-secondary)" }}>2026 thresholds.</strong>
        {" "}Always verify the exact going rate for your SOC code on the{" "}
        <a href="https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-skilled-worker" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", fontWeight: "500" }}>official guidance</a>.
      </div>
    </div>
  );
}

// ─── About page ──────────────────────────────────────────────────────────────

function AboutPage({ onSearch }) {
  return (
    <div style={{ position: "relative", zIndex: 1 }}>
      <div style={{ background: "var(--hero-bg)", padding: "64px 20px 72px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, opacity: 0.1 }}>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="about-dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="rgba(255,255,255,0.6)" /></pattern></defs>
            <rect width="100%" height="100%" fill="url(#about-dots)" />
          </svg>
        </div>
        <div style={{ position: "relative", maxWidth: "560px", margin: "0 auto" }}>
          <h1 style={{ fontFamily: "var(--ff-display)", fontSize: "clamp(28px, 7vw, 42px)", fontWeight: "700", color: "var(--hero-text)", letterSpacing: "-0.02em", marginBottom: "14px", lineHeight: "1.15" }}>
            Built by someone<br />going through it
          </h1>
          <p style={{ fontSize: "15px", color: "var(--hero-muted)", lineHeight: "1.7" }}>
            SponsorMap exists because the UK job hunt for international students is harder than it needs to be.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "60px 20px 80px" }}>

        {/* Story */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--r-xl)", padding: "36px 32px", marginBottom: "20px", boxShadow: "var(--sh-card)" }}>
          <h2 style={{ fontFamily: "var(--ff-display)", fontSize: "22px", fontWeight: "600", color: "var(--t-primary)", marginBottom: "24px", letterSpacing: "-0.01em" }}>The Story</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {[
              { icon: "📄", point: "120,000-company CSV. No search. No filters. Just a raw file from the Home Office." },
              { icon: "🕐", point: "Every Monday: manually check 50 careers pages. Hours gone. Hundreds of thousands doing the same thing." },
              { icon: "⬡", point: "So I built SponsorMap. Search, filter, ask AI. Free. The tool I needed while I was searching." },
            ].map(({ icon, point }) => (
              <div key={point} style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                <span style={{ fontSize: "20px", flexShrink: 0, marginTop: "1px" }}>{icon}</span>
                <p style={{ fontSize: "15px", color: "var(--t-secondary)", lineHeight: "1.65", margin: 0 }}>{point}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Data */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--r-xl)", padding: "36px 32px", marginBottom: "20px", boxShadow: "var(--sh-card)" }}>
          <h2 style={{ fontFamily: "var(--ff-display)", fontSize: "22px", fontWeight: "600", color: "var(--t-primary)", marginBottom: "20px", letterSpacing: "-0.01em" }}>The Data</h2>
          <div style={{ fontSize: "15px", color: "var(--t-secondary)", lineHeight: "1.85" }}>
            <p style={{ marginBottom: "16px" }}>Every company in SponsorMap is sourced from the{" "}<a href="https://find-employer-sponsors.homeoffice.gov.uk" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", fontWeight: "600" }}>Home Office Register of Licensed Sponsors</a>{" "}— the official UK government list of organisations authorised to issue Certificates of Sponsorship. No self-reported claims. No guesswork.</p>
            <p style={{ marginBottom: "20px" }}>SponsorMap processes the register, classifies companies by sector and city, and makes it searchable. That's it.</p>
          </div>
          <a href="https://find-employer-sponsors.homeoffice.gov.uk" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: "13px", color: "var(--accent)", fontWeight: "600", transition: "opacity var(--ease)" }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >View the official register on GOV.UK →</a>
        </div>

        {/* Builder */}
        <div style={{ background: "var(--accent-dim)", border: "1px solid var(--accent-mid)", borderRadius: "var(--r-xl)", padding: "32px", marginBottom: "36px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), var(--accent-hi))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: "700", color: "#fff", fontFamily: "var(--ff-display)", flexShrink: 0 }}>S</div>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--t-primary)", fontFamily: "var(--ff-display)", marginBottom: "4px" }}>Built by Segun Toriola</div>
              <div style={{ fontSize: "13px", color: "var(--t-secondary)", marginBottom: "14px", lineHeight: "1.6" }}>MSc Information Technology · University of the West of Scotland · Paisley, Scotland</div>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <a href="https://engtx.co.uk" target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: "12px", fontWeight: "600", color: "var(--accent)", padding: "6px 12px", border: "1px solid var(--accent-mid)", borderRadius: "20px", transition: "all var(--ease)" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--accent)"; }}
                >engtx.co.uk ↗</a>
                <a href="https://github.com/Oluwaseun22/sponsormap" target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: "12px", fontWeight: "600", color: "var(--t-secondary)", padding: "6px 12px", border: "1px solid var(--border)", borderRadius: "20px", transition: "all var(--ease)" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-hi)"; e.currentTarget.style.color = "var(--t-primary)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--t-secondary)"; }}
                >GitHub ↗</a>
              </div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <button className="btn-g" onClick={() => onSearch("home")} style={{ fontSize: "14px", padding: "12px 28px" }}>← Back to SponsorMap</button>
        </div>
      </div>

      <footer style={{ borderTop: "1px solid var(--border)", padding: "28px 20px", textAlign: "center" }}>
        <div style={{ fontSize: "11px", color: "var(--t-muted)" }}>© 2026 SponsorMap · sponsormap.engtx.co.uk</div>
      </footer>
    </div>
  );
}

// ─── Privacy policy ──────────────────────────────────────────────────────────

function PrivacyPage({ onSearch }) {
  return (
    <div style={{ position: "relative", zIndex: 1 }}>
      <div style={{ background: "var(--hero-bg)", padding: "48px 20px 56px", position: "relative", overflow: "hidden" }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, opacity: 0.08 }}>
          <svg width="100%" height="100%"><defs><pattern id="pp-dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="rgba(255,255,255,0.6)" /></pattern></defs><rect width="100%" height="100%" fill="url(#pp-dots)" /></svg>
        </div>
        <div style={{ position: "relative", maxWidth: "680px", margin: "0 auto" }}>
          <h1 style={{ fontFamily: "var(--ff-display)", fontSize: "clamp(26px, 6vw, 38px)", fontWeight: "700", color: "var(--hero-text)", letterSpacing: "-0.02em", marginBottom: "10px" }}>Privacy Policy</h1>
          <p style={{ fontSize: "14px", color: "var(--hero-muted)" }}>Last updated: April 2026</p>
        </div>
      </div>

      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "48px 20px 80px" }}>
        {[
          {
            title: "What we collect",
            body: "SponsorMap collects email addresses when you sign up for the waitlist or request early access to a feature. We collect nothing else. No account. No tracking cookies. No device fingerprinting.",
          },
          {
            title: "Why we collect it",
            body: "Your email is used only to notify you when SponsorMap V2 features go live. We don't use it for marketing campaigns, third-party services, or anything else.",
          },
          {
            title: "How long we keep it",
            body: "We retain your email until you ask us to remove it, or until SponsorMap V2 launches and we've sent the notification we promised.",
          },
          {
            title: "Third parties",
            body: "We don't sell, share, or transfer your email to any third party. The only external service SponsorMap uses is Google Fonts for typography — this loads fonts from Google's CDN but does not identify you individually.",
          },
          {
            title: "Your rights (UK GDPR)",
            body: "You have the right to access, correct, or delete your data at any time. Email seguntoriola25@gmail.com to request removal and we'll action it within 48 hours.",
          },
          {
            title: "Data storage",
            body: "Email addresses are stored in AWS DynamoDB (eu-west-2, London region). No data leaves the UK/EU.",
          },
          {
            title: "Contact",
            body: "Questions? Email seguntoriola25@gmail.com. SponsorMap is a product of ENGTX (engtx.co.uk), operated by Oluwasegun Toriola, Paisley, Scotland.",
          },
        ].map(({ title, body }) => (
          <div key={title} style={{ marginBottom: "28px", paddingBottom: "28px", borderBottom: "1px solid var(--border)" }}>
            <h2 style={{ fontFamily: "var(--ff-display)", fontSize: "18px", fontWeight: "600", color: "var(--t-primary)", marginBottom: "10px", letterSpacing: "-0.01em" }}>{title}</h2>
            <p style={{ fontSize: "14px", color: "var(--t-secondary)", lineHeight: "1.75" }}>{body}</p>
          </div>
        ))}

        <button className="btn-g" onClick={() => onSearch("home")} style={{ fontSize: "13px", padding: "10px 22px" }}>← Back to SponsorMap</button>
      </div>

      <footer style={{ borderTop: "1px solid var(--border)", padding: "24px 20px", textAlign: "center" }}>
        <div style={{ fontSize: "11px", color: "var(--t-muted)" }}>© 2026 SponsorMap · sponsormap.engtx.co.uk</div>
      </footer>
    </div>
  );
}


// ─── Error boundary ──────────────────────────────────────────────────────────

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err, info) { console.error("SponsorMap error:", err, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0e1929", padding: "40px 20px" }}>
          <div style={{ textAlign: "center", maxWidth: "400px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠</div>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: "24px", color: "#f2ead8", marginBottom: "12px" }}>Something went wrong</h1>
            <p style={{ fontSize: "14px", color: "#9a8e84", marginBottom: "24px", lineHeight: "1.6" }}>SponsorMap hit an unexpected error. Try refreshing the page.</p>
            <button onClick={() => window.location.reload()} style={{ background: "#c4852a", color: "#fff", border: "none", borderRadius: "20px", padding: "12px 28px", fontSize: "14px", fontWeight: "700", cursor: "pointer" }}>Refresh page</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── App shell ────────────────────────────────────────────────────────────────

export default function SponsorMap() {
  const [view,       setView]       = useState("home");
  const [dark,       setDark]       = useState(() => {
    try { return localStorage.getItem("sm-theme") === "dark"; } catch { return false; }
  });
  const [showAI,     setShowAI]     = useState(false);
  const [initSearch, setInitSearch] = useState("");
  const [initSector, setInitSector] = useState("");

  // Persist theme choice across sessions
  useEffect(() => {
    try { localStorage.setItem("sm-theme", dark ? "dark" : "light"); } catch {}
  }, [dark]);

  // Push history entry on every view change so back button works within the app
  const handleNav = useCallback((target, search = "", sector = "") => {
    const actualTarget = target === "ai" ? "search" : target;
    setView(actualTarget);
    setInitSearch(search);
    setInitSector(sector);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (target === "ai") { setShowAI(true); }
    // Push to browser history so back button returns to previous view
    if (actualTarget !== view) {
      window.history.pushState({ view: actualTarget }, "", "");
    }
  }, [view]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (e) => {
      if (e.state?.view) {
        setView(e.state.view);
        setShowAI(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        // No state = first entry, go home
        setView("home");
        setShowAI(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
    window.addEventListener("popstate", handlePopState);
    // Set initial history state
    window.history.replaceState({ view: "home" }, "", "");
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <ErrorBoundary>
    <div data-theme={dark ? "dark" : "light"} style={{ minHeight: "100vh", background: "var(--bg)", position: "relative" }}>
      <style>{CSS}</style>
      {view === "search" && <Background />}
      {showAI && <AIPanel onClose={() => setShowAI(false)} />}

      <AppHeader dark={dark} setDark={setDark} onSearch={handleNav} currentView={view} />

      {/* Global floating AI button — visible on every view */}
      <div style={{ position: "fixed", bottom: "28px", right: "24px", zIndex: 200 }}>
        <button
          className="btn-p"
          onClick={() => setShowAI(true)}
          aria-label="Ask the AI assistant"
          style={{ borderRadius: "50px", padding: "13px 22px", fontSize: "13px", boxShadow: "0 4px 24px var(--accent-mid)", display: "flex", alignItems: "center", gap: "6px" }}
        >
          <span style={{ fontSize: "11px" }}>✦</span> Ask AI
        </button>
      </div>

      {view === "home"    && <LandingPage onSearch={handleNav} />}
      {view === "search"  && <SearchTool initialSearch={initSearch} initialSector={initSector} showAI={showAI} setShowAI={setShowAI} />}
      {view === "salary"  && <SalaryChecker onSearch={handleNav} />}
      {view === "about"   && <AboutPage onSearch={handleNav} />}
      {view === "privacy" && <PrivacyPage onSearch={handleNav} />}
    </div>
    </ErrorBoundary>
  );
}
