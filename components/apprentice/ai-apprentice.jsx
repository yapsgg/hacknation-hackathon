"use client"

import { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext } from "react";
import {
  MonitorUp, Play, Pause, FastForward, EyeOff, Check, X, PenLine, Download, Copy, RotateCcw, AlertTriangle,
  Lock, Square, Volume2, VolumeX, Keyboard, BookOpen, MessageSquare, Mic, Search, Hand, Bot, Database,
  UserCheck, ShieldCheck, Clock, Users, Menu, Sun, Moon, Monitor, ChevronDown, Info, FileText, Flag,
} from "lucide-react";

/* ------------------------------------------------------------------
   The AI Apprentice: starter UI, rebuilt on the Mono design practices.
   Layers (back to front):
     L0 canvas + static glow      L1 glass sidebar
     L2 one opaque workspace      L3 opaque cards in tiers
     L4 floating: toolbar pills, search frame, menus (translucent);
        dialogs, sheets, search results (opaque)
   Colour: semantic tokens only. One colour, one job.
   Geometry: inner radius = outer radius − padding.
------------------------------------------------------------------- */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* ---------- tokens: the only place hex values live ---------- */
.ap{
  --canvas:#E8EBF0; --glow-a:rgba(0,102,204,.10); --glow-b:rgba(10,115,110,.08);
  --glass:rgba(247,248,251,.66); --glass-border:rgba(29,29,31,.10);
  --paper:#FBFBFD; --paper-border:#D8DCE2; --card:#FFFFFF; --card-2:#F2F4F7;
  --line:#DDE1E7; --line-strong:#B8BFC9; --scrim:rgba(18,20,24,.32);
  --text:#1D1D1F; --text-2:#474C55; --text-3:#596069;
  --action:#0066CC; --action-fill:#0066CC; --action-fill-hover:#0059B3; --on-action:#FFFFFF; --action-wash:#E6F0FA;
  --agent:#0A736E; --agent-wash:#E2F1F0;
  --fact:#475160; --fact-wash:#EDEFF2;
  --pending:#82590F; --pending-wash:#F6EEDC;
  --warning:#A1461A; --warning-wash:#FBEBE2;
  --critical:#A3271F; --critical-wash:#FBE7E5;
  --success:#1D7339; --success-wash:#E3F2E7;
  --scr-bg:#FFFFFF; --scr-bar:#EEF1F5; --scr-line:#D5DBE2; --scr-text:#22303D; --scr-text-2:#56636F;
  --shadow-1:0 1px 2px rgba(18,20,24,.06); --shadow-2:0 1px 3px rgba(18,20,24,.06),0 8px 24px rgba(18,20,24,.06);
  --shadow-float:0 12px 32px rgba(18,20,24,.16);
  --d-press:90ms; --d-hover:150ms; --d-select:180ms; --d-panel:220ms; --d-dialog:240ms; --d-sheet:280ms; --d-row:320ms;
  --ease:cubic-bezier(0.32,0.72,0,1);
  color-scheme:light;
}
.ap.dark{
  --canvas:#121316; --glow-a:rgba(10,115,110,.16); --glow-b:rgba(31,107,192,.12);
  --glass:rgba(36,39,44,.64); --glass-border:rgba(255,255,255,.10);
  --paper:#1B1D21; --paper-border:#33373E; --card:#23262B; --card-2:#2C3036;
  --line:#3A3F47; --line-strong:#565D68; --scrim:rgba(0,0,0,.5);
  --text:#F2F3F5; --text-2:#BCC1C9; --text-3:#A6ACB5;
  --action:#5AAEFF; --action-fill:#1F6BC0; --action-fill-hover:#2A78CF; --on-action:#FFFFFF; --action-wash:#1A2D44;
  --agent:#4CC3BA; --agent-wash:#163331;
  --fact:#C4CAD2; --fact-wash:#2E333A;
  --pending:#E2B65E; --pending-wash:#352B19;
  --warning:#F28F62; --warning-wash:#3B241A;
  --critical:#FF8379; --critical-wash:#3D1D1B;
  --success:#62CE88; --success-wash:#17321F;
  --scr-bg:#202328; --scr-bar:#2A2E34; --scr-line:#3C424A; --scr-text:#E6EAEE; --scr-text-2:#B3BBC4;
  --shadow-1:0 1px 2px rgba(0,0,0,.3); --shadow-2:0 1px 3px rgba(0,0,0,.3),0 8px 24px rgba(0,0,0,.25);
  --shadow-float:0 12px 32px rgba(0,0,0,.45);
  color-scheme:dark;
}
@media (prefers-contrast: more){
  .ap{
    --glass:rgba(255,255,255,.94); --glass-border:#2B3038; --paper:#FFFFFF; --paper-border:#2B3038; --card:#FFFFFF; --card-2:#F0F2F5;
    --line:#6B7280; --line-strong:#2B3038;
    --text:#000000; --text-2:#1F2329; --text-3:#2B3038;
    --action:#00478F; --action-fill:#00478F; --action-fill-hover:#003A75; --action-wash:#E1ECF8;
    --agent:#045049; --agent-wash:#DDEFEE; --fact:#262D37; --fact-wash:#E9ECF0;
    --pending:#5A3D06; --pending-wash:#F4EAD3; --warning:#702E0A; --warning-wash:#F9E5DA;
    --critical:#771410; --critical-wash:#F9E0DD; --success:#0C4D22; --success-wash:#DDEFE3;
    --scr-bg:#FFFFFF; --scr-line:#2B3038; --scr-text:#000000; --scr-text-2:#262D37;
  }
  .ap.dark{
    --glass:rgba(18,20,23,.96); --glass-border:#D2D6DC; --paper:#000000; --paper-border:#D2D6DC; --card:#121417; --card-2:#1C1F24;
    --line:#8A919C; --line-strong:#D2D6DC;
    --text:#FFFFFF; --text-2:#E3E6EA; --text-3:#D2D6DC;
    --action:#9DCCFF; --action-fill:#0A4F99; --action-fill-hover:#0D5DB3; --action-wash:#10243B;
    --agent:#86E3DB; --agent-wash:#0E2826; --fact:#E6E9ED; --fact-wash:#24282E;
    --pending:#F5D08A; --pending-wash:#2C2414; --warning:#FFB491; --warning-wash:#33201A;
    --critical:#FFB0A9; --critical-wash:#361A18; --success:#94E8B0; --success-wash:#12291A;
    --scr-bg:#121417; --scr-line:#D2D6DC; --scr-text:#FFFFFF; --scr-text-2:#D9DEE4;
  }
}

/* ---------- base ---------- */
.ap *{box-sizing:border-box}
:where(.ap) button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}
:where(.ap) :is(h1,h2,h3,h4,p,ol,ul,figure,dl,dd){margin:0}
:where(.ap) :is(ol,ul){padding:0;list-style:none}
.ap{position:relative;font-family:Inter,-apple-system,BlinkMacSystemFont,'SF Pro Text',system-ui,sans-serif;font-size:13px;line-height:18px;
  color:var(--text);background:var(--canvas);font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased;
  height:100vh;display:grid;grid-template-columns:240px minmax(0,1fr);gap:12px;padding:12px;overflow:hidden}
.ap::before{content:'';position:absolute;inset:0;pointer-events:none;z-index:0;
  background:radial-gradient(55% 45% at 12% 0%,var(--glow-a),transparent 70%),radial-gradient(45% 40% at 100% 100%,var(--glow-b),transparent 70%)}
.ap > *{position:relative;z-index:1}
.ap :focus-visible{outline:2px solid var(--action);outline-offset:2px}
.sr{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}

/* ---------- type scale ---------- */
.t-page{font-size:28px;line-height:34px;font-weight:600;letter-spacing:-.02em}
.t-decision{font-size:22px;line-height:28px;font-weight:600;letter-spacing:-.015em}
.t-card{font-size:16px;line-height:22px;font-weight:600;letter-spacing:-.01em}
.t-body{font-size:13px;line-height:18px}
.t-sec{font-size:12px;line-height:16px;color:var(--text-2)}
.t-cap{font-size:11px;line-height:14px;font-weight:500;color:var(--text-2)}
.t-meta{font-size:12px;line-height:16px;font-weight:500;color:var(--text)}
.strong{font-weight:600}
.c2{color:var(--text-2)}

/* ---------- L1 sidebar (glass) ---------- */
.sidenav{background:var(--glass);-webkit-backdrop-filter:blur(24px) saturate(1.4);backdrop-filter:blur(24px) saturate(1.4);
  border:1px solid var(--glass-border);border-radius:20px;padding:12px;display:flex;flex-direction:column;gap:12px;overflow:auto;min-height:0}
.brand{display:flex;align-items:center;gap:8px;padding:4px 8px;font-size:16px;line-height:22px;font-weight:600;letter-spacing:-.01em}
.brand-mark{width:20px;height:20px;border-radius:6px;background:var(--text);display:grid;place-items:center;color:var(--paper)}
.people{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:8px}
.people .row{gap:6px}
.nav-label{display:flex;align-items:center;gap:8px;padding:8px 8px 4px;font-size:12px;line-height:16px;font-weight:600;color:var(--text-2)}
.nav-num{width:20px;height:20px;border-radius:6px;border:1px solid var(--line-strong);display:grid;place-items:center;font-size:11px;line-height:14px;font-weight:600;color:var(--text)}
.nav-num.done{background:var(--success-wash);border-color:var(--success);color:var(--success)}
.nav-item{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;min-height:32px;padding:6px 8px 6px 36px;border-radius:8px;text-align:left;color:var(--text);
  transition:background-color var(--d-hover) var(--ease)}
.nav-item.top{padding-left:8px}
.nav-item:hover{background:rgba(127,127,127,.12)}
.nav-item[aria-current="page"]{background:var(--action-wash);color:var(--action);font-weight:600;transition-duration:var(--d-select)}
.side-foot{margin-top:auto;display:flex;flex-direction:column;gap:8px}

/* ---------- L4 toolbar (floating, translucent) ---------- */
.col{display:grid;grid-template-rows:auto minmax(0,1fr);gap:12px;min-width:0;min-height:0}
.toolbar{display:flex;align-items:center;gap:8px;min-height:40px}
.pill{display:flex;align-items:center;gap:4px;height:40px;padding:4px;border-radius:20px;background:var(--glass);
  -webkit-backdrop-filter:blur(20px) saturate(1.4);backdrop-filter:blur(20px) saturate(1.4);border:1px solid var(--glass-border)}
.pill-btn{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:16px;font-weight:500;color:var(--text);transition:background-color var(--d-hover) var(--ease)}
.pill-btn:hover{background:rgba(127,127,127,.14)}
.pill-btn[aria-pressed="true"]{color:var(--action);font-weight:600}
.demo-tag{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;font-size:12px;line-height:16px;font-weight:500;color:var(--text)}
.search{position:relative;flex:1;max-width:440px}
.search .pill{padding:4px 4px 4px 12px}
.search input{flex:1;min-width:0;height:32px;border:0;background:transparent;font:inherit;color:var(--text)}
.search input::placeholder{color:var(--text-2)}
.search input:focus{outline:none}
.search .pill:focus-within{outline:2px solid var(--action);outline-offset:2px}
.kbd{font-size:11px;line-height:14px;font-weight:500;color:var(--text-2);border:1px solid var(--line-strong);border-radius:4px;padding:2px 6px;margin-right:6px}
.listbox{position:absolute;top:48px;left:0;right:0;z-index:30;background:var(--card);border:1px solid var(--line-strong);border-radius:12px;padding:4px;box-shadow:var(--shadow-float);max-height:360px;overflow:auto}
.option{display:flex;justify-content:space-between;gap:12px;align-items:center;min-height:32px;padding:6px 8px;border-radius:8px;cursor:pointer}
.option[aria-selected="true"]{background:var(--action-wash);color:var(--action)}
.option .t-sec{flex:none}
.option[aria-selected="true"] .t-sec{color:var(--action)}

/* ---------- L2 workspace (one opaque paper panel) ---------- */
.workspace{background:var(--paper);border:1px solid var(--paper-border);border-radius:28px;box-shadow:var(--shadow-2);display:flex;flex-direction:column;min-height:0;overflow:hidden}
.ws-scroll{flex:1;min-height:0;overflow:auto;padding:12px;scroll-padding:12px}
.pg-head{display:flex;gap:16px;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;padding:12px 12px 16px}
.pg-head .lede{margin-top:6px;max-width:72ch;color:var(--text-2)}
.pg-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}

/* ---------- L3 cards (concentric: workspace 28 − inset 12 = 16) ---------- */
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px;box-shadow:var(--shadow-1);min-width:0}
.card.tier2{background:var(--card-2);box-shadow:none}
.card.agent{background:var(--agent-wash);border-color:var(--agent)}
.card.warn{background:var(--warning-wash);border-color:var(--warning)}
.card-head{display:flex;align-items:center;gap:8px;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap}
.inset{background:var(--card-2);border:1px solid var(--line);border-radius:8px;padding:8px}
.inset .inner{border-radius:4px}
.stack{display:flex;flex-direction:column;gap:12px}
.stack.tight{gap:8px}
.stack.x-tight{gap:4px}
.row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.spacer{flex:1}
.grid{display:grid;gap:12px}
.g3{grid-template-columns:repeat(3,minmax(0,1fr))}
.g2{grid-template-columns:repeat(2,minmax(0,1fr))}
.g-main{grid-template-columns:minmax(0,1fr) 360px}
.g-wide{grid-template-columns:minmax(0,1.25fr) minmax(0,1fr)}
.g-map{grid-template-columns:minmax(0,.8fr) minmax(0,1.5fr)}
.g-ov{grid-template-columns:minmax(0,1fr) 320px}
.divider{height:1px;background:var(--line)}
.list-row{padding:8px 0;border-top:1px solid var(--line)}
.list-row:first-child{border-top:0;padding-top:0}

/* ---------- controls: 28 compact, 32 regular, 36 inputs, 40 capsule ---------- */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:32px;padding:0 12px;border-radius:8px;border:1px solid var(--line-strong)!important;
  background:var(--card)!important;color:var(--text);font-weight:500;white-space:nowrap;
  transition:background-color var(--d-hover) var(--ease),border-color var(--d-hover) var(--ease)}
.btn:hover{background:var(--card-2)!important}
.btn:active{background:var(--line)!important;transition-duration:var(--d-press)}
.btn.compact{height:28px;padding:0 8px;font-size:12px;line-height:16px}
.btn.capsule{height:40px;padding:0 20px;border-radius:20px;background:var(--action-fill)!important;border-color:var(--action-fill)!important;color:var(--on-action);font-weight:600}
.btn.capsule:hover{background:var(--action-fill-hover)!important}
.btn[aria-pressed="true"]{border-color:var(--action)!important;color:var(--action);background:var(--action-wash)!important;font-weight:600}
.btn:disabled,.btn[aria-disabled="true"]{opacity:.5;cursor:not-allowed}
.link{color:var(--action);text-decoration:underline;text-underline-offset:2px;display:inline-flex;align-items:center;min-height:24px}
.link:hover{text-decoration-thickness:2px}
.seg{display:inline-flex;padding:2px;gap:2px;border-radius:10px;background:var(--card-2);border:1px solid var(--line)}
.seg button{height:28px;padding:0 12px;border-radius:8px;color:var(--text);font-weight:500;transition:background-color var(--d-select) var(--ease)}
.seg button[aria-selected="true"],.seg button[aria-checked="true"]{background:var(--card);color:var(--action);font-weight:600;box-shadow:var(--shadow-1)}
.input{height:36px;padding:0 12px;border-radius:8px;border:1px solid var(--line-strong);background:var(--card);color:var(--text);font:inherit}
textarea.input{height:auto;min-height:72px;padding:8px 12px;width:100%;resize:vertical}
.switch{position:relative;width:40px;height:24px;border-radius:12px;background:var(--line-strong);flex:none;transition:background-color var(--d-select) var(--ease)}
.switch::after{content:'';position:absolute;top:2px;left:2px;width:20px;height:20px;border-radius:10px;background:#fff;box-shadow:var(--shadow-1);transition:transform var(--d-select) var(--ease)}
.switch[aria-checked="true"]{background:var(--action-fill)}
.switch[aria-checked="true"]::after{transform:translateX(16px)}
.setting{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:40px;padding:8px 0;border-top:1px solid var(--line)}
.setting:first-of-type{border-top:0}

/* ---------- badges: colour + icon + label, never colour alone ---------- */
.badge{display:inline-flex;align-items:center;gap:4px;height:22px;padding:0 8px;border-radius:11px;font-size:12px;line-height:16px;font-weight:500;white-space:nowrap;
  border:1px solid var(--line-strong);background:var(--card-2);color:var(--text)}
.b-agent{color:var(--agent);background:var(--agent-wash);border-color:var(--agent)}
.b-agent.dashed{border-style:dashed}
.b-fact{color:var(--fact);background:var(--fact-wash);border-color:var(--fact)}
.b-pending{color:var(--pending);background:var(--pending-wash);border-color:var(--pending)}
.b-warning{color:var(--warning);background:var(--warning-wash);border-color:var(--warning)}
.b-critical{color:var(--critical);background:var(--critical-wash);border-color:var(--critical)}
.b-success{color:var(--success);background:var(--success-wash);border-color:var(--success)}
.time{display:inline-flex;align-self:start;justify-self:start;align-items:center;min-height:24px;padding:0 6px;border-radius:6px;background:var(--fact-wash);color:var(--fact);font-size:12px;line-height:16px;font-weight:600}
button.time{color:var(--action);background:var(--action-wash);text-decoration:underline;text-underline-offset:2px}
.notice{display:flex;gap:8px;align-items:flex-start;padding:12px;border-radius:12px;border:1px solid var(--line-strong);background:var(--card-2);margin:0 12px 12px}
.notice.pending{border-color:var(--pending);background:var(--pending-wash)}
.notice.critical{border-color:var(--critical);background:var(--critical-wash)}
.notice.success{border-color:var(--success);background:var(--success-wash)}
.notice.agent{border-color:var(--agent);background:var(--agent-wash)}
.notice.inline{margin:0}
.req{display:flex;gap:8px;align-items:flex-start;padding:4px 0}
.req-box{width:18px;height:18px;border-radius:5px;border:1.5px solid var(--line-strong);display:grid;place-items:center;flex:none;margin-top:0}
.req-box.on{background:var(--success);border-color:var(--success);color:var(--card)}

/* ---------- quotes: the expert's words ---------- */
.quote{border-left:2px solid var(--fact);padding:2px 0 2px 12px}
.quote blockquote{margin:0;font-size:13px;line-height:18px;color:var(--text)}
.quote figcaption{margin-top:4px;display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center;font-size:12px;line-height:16px;color:var(--text-2)}
.quote.struck blockquote{text-decoration:line-through;color:var(--text-2)}

/* ---------- rules and evidence ---------- */
.claim{border:1px solid var(--line);border-radius:8px;padding:12px;background:var(--card);display:flex;flex-direction:column;gap:8px;transition:border-color var(--d-hover) var(--ease)}
.claim.proposed{border-style:dashed;border-color:var(--agent)}
.claim.verified{border-color:var(--success)}
.claim .txt{font-size:13px;line-height:18px;font-weight:500}
.guard{border:1px solid var(--warning);border-radius:8px;padding:12px;background:var(--warning-wash);display:flex;flex-direction:column;gap:8px}

/* ---------- capture ---------- */
.signals{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.signal{border:1px solid var(--line);border-radius:8px;padding:8px;background:var(--card-2);display:flex;flex-direction:column;gap:2px}
.signal.on{border-color:var(--fact);background:var(--fact-wash)}
.signal.pause{border-color:var(--agent);background:var(--agent-wash)}
.meter-bar{height:6px;border-radius:3px;background:var(--line);position:relative;margin-top:4px;overflow:visible}
.meter-bar i{position:absolute;left:0;top:0;bottom:0;border-radius:3px;background:var(--agent)}
.meter-bar s{position:absolute;top:-3px;width:2px;height:12px;background:var(--text)}
.scrub{position:relative;height:24px}
.scrub-track{position:absolute;left:0;right:0;top:10px;height:4px;border-radius:2px;background:var(--line)}
.scrub-fill{position:absolute;left:0;top:10px;height:4px;border-radius:2px;background:var(--fact)}
.scrub-off{position:absolute;top:6px;height:12px;border-radius:2px;background:repeating-linear-gradient(45deg,var(--line-strong) 0 3px,transparent 3px 6px)}
.scrub-q{position:absolute;top:4px;width:2px;height:16px;background:var(--agent)}
.scrub-q.g{background:var(--warning)}
.agent-state{display:flex;align-items:center;gap:8px;font-weight:600;color:var(--agent)}
.agent-line{margin-top:8px;font-size:16px;line-height:22px;font-weight:500;color:var(--text)}
.hatch{background:repeating-linear-gradient(45deg,var(--card-2) 0 6px,var(--card) 6px 12px)}
.tabs{display:flex;gap:4px;border-bottom:1px solid var(--line);margin-bottom:4px}
.tabs button{min-height:32px;padding:0 8px;color:var(--text-2);font-weight:500;border-bottom:2px solid transparent;margin-bottom:-1px}
.tabs button[aria-selected="true"]{color:var(--action);font-weight:600;border-bottom-color:var(--action)}
.feed{position:relative;max-height:360px;overflow:auto}
.feed-item{display:grid;grid-template-columns:48px minmax(0,1fr);gap:8px;padding:8px 0;border-top:1px solid var(--line)}
.feed-item:first-child{border-top:0}
.arrive{animation:arrive var(--d-row) var(--ease)}
@keyframes arrive{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.new-tag{display:none}
.new-pill{position:sticky;bottom:4px;margin:4px auto 0;display:flex;align-items:center;gap:4px;height:28px;padding:0 12px;border-radius:14px;
  background:var(--card);border:1px solid var(--action)!important;color:var(--action);font-size:12px;line-height:16px;font-weight:600;box-shadow:var(--shadow-float)}
.empty{padding:16px 0;color:var(--text-2)}

/* ---------- mock screens (the expert's / trainee's own apps) ---------- */
.scr{background:var(--scr-bg);border:1px solid var(--scr-line);border-radius:8px;overflow:hidden;position:relative;color:var(--scr-text);
  font-family:'Segoe UI',system-ui,-apple-system,sans-serif;font-size:12px;line-height:16px}
.scr-bar{display:flex;justify-content:space-between;gap:8px;padding:6px 12px;background:var(--scr-bar);border-bottom:1px solid var(--scr-line);color:var(--scr-text-2)}
.scr-body{padding:12px}
.scr-title{font-size:14px;line-height:20px;font-weight:600;margin-bottom:8px}
.scr-table{width:100%;border-collapse:collapse}
.scr-table th{text-align:left;font-weight:600;color:var(--scr-text-2);border-bottom:1px solid var(--scr-line);padding:4px 6px}
.scr-table td{padding:6px;border-bottom:1px solid var(--scr-line)}
.scr-sub{display:flex;justify-content:space-between;gap:8px;color:var(--scr-text-2);margin-bottom:8px}
.wb{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);min-height:300px}
.wb-doc{border-right:1px solid var(--scr-line);padding:12px}
.wb-model{padding:12px}
.wb-h{display:flex;justify-content:space-between;gap:8px;color:var(--scr-text-2);margin-bottom:6px}
.doc-name{font-weight:600;margin-bottom:8px}
.doc-line{padding:4px 8px;border-left:2px solid var(--scr-line);margin-bottom:4px}
.doc-line.hl{border-left-color:var(--fact);background:var(--fact-wash);font-weight:500}
.mrow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 12px;align-items:center;padding:6px;border-bottom:1px solid var(--scr-line)}
.mrow .v{font-weight:600;text-align:right}
.mrow .sub{grid-column:1/-1;color:var(--scr-text-2)}
.changed{outline:2px dashed var(--agent);outline-offset:-2px;background:var(--agent-wash)}
.chg-tag{font-size:11px;line-height:14px;font-weight:600;color:var(--agent)}
.redact{display:inline-block;padding:0 6px;border-radius:2px;background:var(--scr-text);color:var(--scr-bg);font-size:11px;line-height:16px;font-weight:500}
.scr-off{position:absolute;inset:0;display:flex;gap:8px;align-items:center;justify-content:center;padding:16px;text-align:center;font-weight:600;color:var(--text);
  background:repeating-linear-gradient(45deg,var(--card-2) 0 8px,var(--card) 8px 16px);font-family:Inter,system-ui,sans-serif}
.scr.compact .wb{grid-template-columns:1fr;min-height:0}
.scr.compact .wb-doc{border-right:0;border-bottom:1px solid var(--scr-line)}
.mrow input,.mrow select{height:28px;font:inherit;font-weight:600;border:1px solid var(--scr-line);border-radius:4px;padding:0 6px;background:var(--scr-bg);color:var(--scr-text);max-width:200px;text-align:right}
.doclist{border:1px solid var(--scr-line);border-radius:4px;margin-bottom:12px}
.doclist button{display:flex;justify-content:space-between;align-items:center;gap:8px;width:100%;min-height:28px;text-align:left;padding:4px 8px;border-bottom:1px solid var(--scr-line);font-family:inherit;font-size:12px}
.doclist button:last-child{border-bottom:0}
.doclist button[aria-pressed="true"]{background:var(--action-wash);color:var(--action);font-weight:600}
.scr-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:12px}
.scr-msg{margin-top:8px;padding:6px 8px;border-radius:4px;border:1px solid}
.scr-msg.bad{background:var(--warning-wash);border-color:var(--warning);color:var(--text)}
.scr-msg.good{background:var(--success-wash);border-color:var(--success);color:var(--text)}
.memo-sec{margin-bottom:12px}
.memo-sec h4{font-size:12px;line-height:16px;font-weight:600;margin-bottom:4px}
.risk{display:flex;gap:8px;align-items:flex-start;padding:6px 8px;min-height:28px;border:1px solid var(--scr-line);border-radius:4px;margin-bottom:6px;cursor:pointer}
.risk input{margin-top:2px;width:16px;height:16px}

/* ---------- work map ---------- */
.track{position:relative;height:64px;margin:0 16px}
.track-line{position:absolute;left:0;right:0;top:22px;height:2px;background:var(--line)}
.track-tick{position:absolute;top:44px;transform:translateX(-50%);font-size:11px;line-height:14px;font-weight:500;color:var(--text-2)}
.track-m{position:absolute;top:8px;transform:translateX(-50%);width:30px;height:30px;border-radius:15px;display:grid;place-items:center;font-size:12px;font-weight:600;
  background:var(--card);border:1.5px dashed var(--agent)!important;color:var(--agent)}
.track-m.verified{border:1.5px solid var(--success)!important;color:var(--success)}
.track-m.judg{border-radius:6px}
.track-m[aria-current="step"]{background:var(--action-wash);border-color:var(--action)!important;color:var(--action);border-style:solid!important}
.steps button{display:grid;grid-template-columns:24px minmax(0,1fr) auto;gap:8px;align-items:center;width:100%;min-height:48px;padding:8px;border-radius:8px;text-align:left;
  transition:background-color var(--d-select) var(--ease)}
.steps li+li{margin-top:2px}
.steps button:hover{background:var(--card-2)}
.steps button[aria-current="step"]{background:var(--action-wash)}
.steps button[aria-current="step"] .s-title{color:var(--action)}
.kv{display:grid;grid-template-columns:112px minmax(0,1fr);gap:12px 16px;align-items:start}
.kv dt{color:var(--text-2);font-size:12px;line-height:16px;font-weight:500;padding-top:2px}

/* ---------- teach ---------- */
.msgs{display:flex;flex-direction:column;gap:8px;max-height:620px;overflow:auto}
.msg{padding:12px;border-radius:12px;border:1px solid var(--line);background:var(--card);display:flex;flex-direction:column;gap:8px}
.msg.stop{border-color:var(--warning);background:var(--warning-wash)}
.msg.good{border-color:var(--success)}
.msg.me{background:var(--action-wash);border-color:transparent;margin-left:40px}
.msg-h{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-weight:600}
.metric{font-size:22px;line-height:28px;font-weight:600;letter-spacing:-.015em}
.bar{height:6px;border-radius:3px;background:var(--line);overflow:hidden}
.bar i{display:block;height:100%;background:var(--fact)}

/* ---------- tables: never scroll sideways ---------- */
.tbl{width:100%;border-collapse:collapse}
.tbl th{text-align:left;font-size:12px;line-height:16px;font-weight:600;color:var(--text-2);padding:8px;border-bottom:1px solid var(--line-strong)}
.tbl td{padding:8px;border-top:1px solid var(--line);vertical-align:top}
.tbl tr.diff td{background:var(--pending-wash)}

/* ---------- floating layer: menus (translucent), dialogs and sheets (opaque) ---------- */
.menu-wrap{position:relative}
.menu{position:absolute;right:0;top:48px;z-index:40;min-width:200px;padding:4px;border-radius:12px;background:var(--glass);
  -webkit-backdrop-filter:blur(24px) saturate(1.4);backdrop-filter:blur(24px) saturate(1.4);border:1px solid var(--glass-border);box-shadow:var(--shadow-float);
  animation:fade var(--d-panel) var(--ease)}
.menu [role="menuitemradio"]{display:flex;align-items:center;gap:8px;width:100%;min-height:32px;padding:0 8px;border-radius:8px;text-align:left}
.menu [role="menuitemradio"]:hover,.menu [role="menuitemradio"]:focus{background:var(--action-wash);color:var(--action);outline:none}
.menu [role="menuitemradio"]:focus-visible{outline:2px solid var(--action);outline-offset:-2px}
@keyframes fade{from{opacity:0}to{opacity:1}}
.scrim{position:fixed;inset:0;z-index:60;background:var(--scrim);display:grid;place-items:center;padding:16px;animation:fade var(--d-dialog) var(--ease)}
.dialog{width:min(440px,100%);background:var(--card);border:1px solid var(--line-strong);border-radius:28px;padding:20px;box-shadow:var(--shadow-float);
  display:flex;flex-direction:column;gap:12px;animation:rise var(--d-dialog) var(--ease)}
@keyframes rise{from{opacity:0;transform:scale(.98)}to{opacity:1;transform:none}}
.dialog-close{margin-left:auto;width:32px;height:32px;border-radius:8px;display:grid;place-items:center}
.dialog-close:hover{background:var(--card-2)}
.sheet-scrim{position:fixed;inset:0;z-index:60;background:var(--scrim);animation:fade var(--d-sheet) var(--ease)}
.sheet{position:fixed;left:0;right:0;top:0;z-index:61;max-height:88vh;overflow:auto;background:var(--paper);border-radius:0 0 24px 24px;padding:16px;box-shadow:var(--shadow-float);
  animation:drop var(--d-sheet) var(--ease)}
@keyframes drop{from{transform:translateY(-16px);opacity:0}to{transform:none;opacity:1}}
.topbar{display:none}

/* ---------- reduced motion: keep the meaning, drop the movement ---------- */
@media (prefers-reduced-motion: reduce){
  .ap *,.ap *::before,.ap *::after{animation:none!important;transition:none!important}
  .new-tag{display:inline-flex}
}

/* ---------- forced colors ---------- */
@media (forced-colors: active){
  .badge,.card,.claim,.guard,.msg,.btn,.pill,.notice,.time{border:1px solid CanvasText!important}
  .btn.capsule,.switch[aria-checked="true"],.req-box.on{background:Highlight!important;color:HighlightText!important}
  .changed{outline-color:Highlight}
}

/* ---------- responsive: 1440, 1280, 1024, 768, 390 ---------- */
@media (max-width:1240px){
  .g-main{grid-template-columns:minmax(0,1fr) 320px}
}
@media (max-width:1100px){
  .g-main,.g-wide,.g-map,.g-ov{grid-template-columns:minmax(0,1fr)}
  .tbl thead{display:none}
  .tbl tr{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 12px;padding:8px 0;border-top:1px solid var(--line)}
  .tbl td{padding:0;border:0}
  .tbl td.fold{grid-column:1/-1}
  .tbl tr.diff{background:var(--pending-wash);padding:8px}
  .tbl tr.diff td{background:none}
}
@media (max-width:900px){
  html{scroll-padding-top:72px}
  .ap{display:block;height:auto;min-height:100vh;overflow:visible;padding:0 8px 8px}
  .sidenav{display:none}
  .col{display:block}
  .col > .toolbar{display:none}
  .topbar{display:flex;align-items:center;gap:8px;position:sticky;top:0;z-index:20;margin:0 -8px 8px;padding:8px;
    background:var(--glass);-webkit-backdrop-filter:blur(20px) saturate(1.4);backdrop-filter:blur(20px) saturate(1.4);border-bottom:1px solid var(--glass-border)}
  .workspace{border-radius:24px;overflow:visible}
  .ws-scroll{overflow:visible;padding:8px}
  .g3,.g2{grid-template-columns:minmax(0,1fr)}
  .signals{grid-template-columns:repeat(2,minmax(0,1fr))}
  .wb{grid-template-columns:1fr}
  .wb-doc{border-right:0;border-bottom:1px solid var(--scr-line)}
  .kv{grid-template-columns:1fr;gap:4px}
  .kv dd{margin-bottom:12px}
  .msgs{max-height:none}
  .feed{max-height:420px}
}
@media (max-width:600px){
  .btn,.pill-btn,.seg button,.tabs button,.input,.nav-item,.doclist button,.option,.mrow input,.mrow select,.dialog-close,.link,button.time,.track-m{min-height:44px}
  .btn.compact{height:44px}
  .btn{height:44px}
  .btn.capsule{height:52px;border-radius:26px;padding:0 24px}
  .track-m{width:44px;height:44px;border-radius:22px;top:0}
  .track-m.judg{border-radius:8px}
  .track{height:72px}
  .track-tick{top:52px}
  .seg{flex-wrap:wrap}
  .switch{width:52px;height:32px;border-radius:16px}
  .switch::after{width:28px;height:28px;border-radius:14px}
  .switch[aria-checked="true"]::after{transform:translateX(20px)}
  .tbl tr{grid-template-columns:minmax(0,1fr)}
  .tbl td[data-label]::before{content:attr(data-label);display:block;font-size:11px;line-height:14px;font-weight:500;color:var(--text-2);margin-bottom:2px}
  .pg-head{padding:8px 8px 16px}
  .notice{margin:0 0 12px}
  .t-page{font-size:24px;line-height:30px}
  .msg.me{margin-left:16px}
  .t-meta,.time,.badge,.t-sec{font-size:13px;line-height:18px}
  .badge{height:24px}
}
`;
/* ----------------------------- people ---------------------------------- */
const EXPERT = { name: "Katharina Weiss", first: "Katharina", role: "Senior partner, 22 years in buyouts", lang: "German" };
const EXPERT2 = { name: "Marcus Webb", first: "Marcus", role: "Principal, 9 years" };
const TRAINEE = { name: "Priya Shah", first: "Priya", role: "Analyst, first deal" };
const DEAL = { code: "Project Atlas", target: "a fleet telematics software company" };
const TEACH_DEAL = { code: "Project Beacon", target: "a dental practice software company" };

/* --------------------- the expert's own words -------------------------- */
// Every rule and step links back to one of these. de = what she said, en = tutor language.
const QUOTES = {
  think: { de: "Erst das Dokument, dann die Zahl.", en: "Document first, then the number.", where: "said while working", t: 33 },
  q1: { de: "Die Beratung taucht seit drei Jahren jedes Jahr auf. Was jedes Jahr kommt, ist nicht einmalig.", en: "That consulting shows up every year for three years. If it comes every year, it isn't one-time.", where: "live question", t: 70 },
  q2: { de: "Nicht wenn es strittig ist. Strittige Add-backs gehen an das QoE-Team, mit den Rechnungen dran.", en: "Not if it's disputed. Disputed add-backs go to the QoE team, with the invoices attached.", where: "live question", t: 103 },
  q3: { de: "Paragraf 3 sagt, das Amendment ersetzt Anhang B. Zwei Verträge heißen nicht zweimal Umsatz.", en: "Section 3 says the amendment replaces Schedule B. Two contracts don't mean twice the revenue.", where: "live question", t: 153 },
  q4: { de: "Wenn das Management weniger Capex plant als je zuvor, will ich den Grund schriftlich sehen. Ohne Beleg rechne ich mit dem Durchschnitt und eskaliere.", en: "If management plans less capex than ever before, I want the reason in writing. Without proof, I model the average and escalate.", where: "live question", t: 211 },
  end: { de: "Und alles, was ich markiert habe, steht in Key Risks, mit dem Dollarbetrag.", en: "And everything I flagged goes into Key Risks, with the dollar amount.", where: "said while working", t: 222 },
  d1: { de: "Dann geht es an die Rechtsabteilung. Bei Vertragssprache rate ich nicht.", en: "Then it goes to legal. I don't guess at contract language.", where: "debrief", t: null },
  d2: { de: "Zwei Jahre reichen mir. Bei Umzügen, Abfindungen und Rechtsstreit schaue ich immer in die Rechnungen, egal was im Bridge steht.", en: "Two years is enough for me. For relocations, severance and litigation, I always check the invoices, whatever the bridge says.", where: "debrief", t: null },
  d3: { de: "Dann kommt die Zahl nicht ins Modell. Ich frage bei den Bankern nach und markiere sie als ungeprüft.", en: "Then the number doesn't go into the model. I request the source from the bankers and mark it unverified.", where: "debrief", t: null },
  d4: { de: "Ja, wenn ein Leasingvertrag die Flotte übernimmt. Dann will ich den Vertrag sehen. Eine Folie im Management-Deck reicht nicht.", en: "Yes, if a lease takes over the fleet. Then I want to see the lease. A slide in the management deck isn't enough.", where: "debrief", t: null },
  tb1: { de: "Nein, nach dem Datum der letzten Fassung. Die Banker räumen alte Versionen nie weg.", en: "No, by the date of the latest version. The bankers never clear out the old versions.", where: "teach-back correction", t: null },
  th1: { de: null, en: "The folder index mirrors the CIM, so it's easier to tick things off.", where: "comparison question", t: null, by: "Marcus" },
  th2: { de: null, en: "The new trucks are under warranty for three years, so I took management's word for it.", where: "comparison question", t: null, by: "Marcus" },
  sb1: { de: "Die Ordner zeigen, was die Banker zeigen wollen. Das Datum zeigt, was zuletzt unterschrieben wurde.", en: "The folders show what the bankers want you to see. The dates show what was signed last.", where: "comparison question", t: null },
  sb2: { de: "Eine Garantie deckt Reparaturen, keinen Ersatz. Zeig mir die Garantiebedingungen, dann reden wir.", en: "A warranty covers repairs, not replacement. Show me the warranty terms, then we can talk.", where: "comparison question", t: null },
};

/* ------------------------- rules (pencil -> ink) ------------------------ */
// kind: step | judgment | guardrail. moment = screen time in seconds.
const RULES = [
  { id: "R1", kind: "step", step: 1, moment: 6, text: "Spread the data room by latest version date, not folder by folder. Old versions are never cleared out.",
    draft: "Spread the data room folder by folder, in the order the bankers set it up.", draftWrong: true, correction: "tb1",
    sources: ["tb1"], basis: "Assumption from the data room's default folder order. Katharina never said it." },
  { id: "R7", kind: "guardrail", step: 2, moment: 21, text: "Never hardcode a management-adjusted number without opening its primary source. No source: request it from the bankers and mark it unverified.",
    sources: ["think", "d3"], basis: "Heard while she worked, and debrief" },
  { id: "R2", kind: "judgment", step: 3, moment: 58, text: "A cost that appears in two or more prior years is run-rate, not a one-time add-back.",
    sources: ["q1", "d2"], basis: "Live question and debrief" },
  { id: "R8", kind: "guardrail", step: 3, moment: 58, text: "Relocation, severance and litigation add-backs: check the invoices before accepting, whatever the bridge says.",
    sources: ["d2"], basis: "Debrief answer" },
  { id: "R3", kind: "guardrail", step: 4, moment: 100, text: "Never settle a disputed add-back yourself. Halt and send it to the QoE team with the invoices attached.",
    sources: ["q2"], basis: "Live question" },
  { id: "R4", kind: "judgment", step: 5, moment: 150, text: "When a contract has an amendment, read its fee clause. If it supersedes, ARR is the amendment's amount, not the sum of both.",
    sources: ["q3"], basis: "Live question" },
  { id: "R5", kind: "guardrail", step: 5, moment: 150, text: "Contract language unclear or two contracts look duplicative: halt and send it to legal.",
    sources: ["d1"], basis: "Debrief answer" },
  { id: "R6", kind: "judgment", step: 6, moment: 208, text: "Maintenance capex below the historical run-rate needs a document behind it, like a lease. Without one, model the historical average and escalate.",
    sources: ["q4", "d4"], basis: "Live question and debrief" },
  { id: "R9", kind: "step", step: 7, moment: 216, text: "Every flagged item goes into the IC memo's Key Risks, with its dollar impact.",
    sources: ["end"], basis: "Heard while she worked" },
];
const RULE = Object.fromEntries(RULES.map((r) => [r.id, r]));

const STEPS = [
  { n: 1, title: "Organize the data room", t: 6, field: null, decision: "Spread 1,240 files by latest version date instead of the bankers' folders", rules: ["R1"] },
  { n: 2, title: "Open the source before the number", t: 21, field: "doc", decision: "Opened the GL detail before touching management's EBITDA bridge", rules: ["R7"] },
  { n: 3, title: "Scrub the add-backs", t: 58, field: "addback", decision: "Cut the $1.2M “non-recurring” consulting add-back to $0", rules: ["R2", "R8"], judgment: true },
  { n: 4, title: "Send disputed items to QoE", t: 100, field: "qoe", decision: "Flagged the consulting line for QoE review with three years of invoices", rules: ["R3"] },
  { n: 5, title: "Validate the top contracts", t: 150, field: "arr", decision: "Corrected Meridian Freight ARR from $500,000 to $260,000", rules: ["R4", "R5"], judgment: true },
  { n: 6, title: "Check capex against history", t: 208, field: "capex", decision: "Replaced management's 1.5% maintenance capex with the 4.1% historical average", rules: ["R6"], judgment: true },
  { n: 7, title: "Carry the flags into the IC memo", t: 216, field: "memo", decision: "Added all three findings to Key Risks with their dollar impact", rules: ["R9"] },
];

/* ------------------------- debrief gaps -------------------------------- */
const GAPS = [
  { id: "d3", step: 2, q: "Every number today had a document behind it. What do you do when the data room has no source for a management figure?", why: "Case not seen during the task" },
  { id: "d2", step: 3, q: "You cut the consulting add-back after three years of history. How much history do you need before you call a cost recurring?", why: "Boundary not stated" },
  { id: "d1", step: 5, q: "Meridian's amendment clearly said it replaces Schedule B. What if the wording is unclear, or two contracts just look alike?", why: "Only the clear case was seen" },
  { id: "d4", step: 6, q: "Atlas's capex history was steady around 4%. Is there ever a good reason for it to drop after a buyout?", why: "Held back during the task to keep live questions short" },
];

/* --------------------- capture script (demo session) ------------------- */
const PAUSE_S = 1.5;      // quiet time before the agent may speak
const END_T = 228;        // demo session length in seconds
const LIVE_BUDGET = 5;    // max live questions per 10 minutes

// What the expert is doing. The agent never speaks over any of these.
const ACTIVITY = [
  { from: 0, to: 4, type: "reading" }, { from: 6, to: 18, type: "reading" }, { from: 21, to: 32, type: "reading" },
  { from: 33, to: 37, type: "speaking" }, { from: 38, to: 45, type: "reading" }, { from: 46, to: 66, type: "typing" },
  { from: 84, to: 99, type: "typing" }, { from: 120, to: 140, type: "reading" }, { from: 143, to: 149, type: "typing" },
  { from: 163, to: 186, type: "speaking" }, { from: 190, to: 200, type: "reading" }, { from: 201, to: 207, type: "typing" },
  { from: 212, to: 215, type: "typing" }, { from: 222, to: 226, type: "speaking" },
];

// Vision-model events. cands = candidate questions the picker considered.
const SCRIPT = [
  { t: 2, kind: "screen", text: "Data room opened: Project Atlas, 1,240 files" },
  { t: 6, kind: "screen", text: "Data room index: 9 folders, 1,240 files",
    cands: [{ q: "How many files are in the data room?", drop: "The screen already shows 1,240" }] },
  { t: 21, kind: "screen", text: "Opened 6.1 Adjusted EBITDA bridge: 4 add-backs, $3.1M total", field: "doc" },
  { t: 24, kind: "pii", n: 2, text: "Preparer name and email redacted in frame" },
  { t: 30, kind: "screen", text: "Opened 5.4 GL detail, filtered to Brightline Advisory", field: "doc" },
  { t: 33, kind: "speech", quote: "think" },
  { t: 58, kind: "screen", text: "Model cell changed: consulting add-back $1.2M → $0", field: "addback",
    cands: [
      { q: "What's the new add-back amount?", drop: "The screen already shows $0" },
      { id: "q1", q: "You cut the $1.2M consulting add-back to zero. What made you do that?", type: "reason", score: 0.92 },
    ] },
  { t: 100, kind: "screen", text: "Consulting line flagged for QoE review, 3 invoices attached", field: "qoe",
    cands: [
      { id: "q2", q: "You flagged that line for QoE instead of just deleting it. Would you ever settle an add-back yourself?", type: "guardrail", score: 0.88 },
      { q: "Which invoices did you attach?", drop: "Listed in the flag" },
    ] },
  { t: 112, kind: "screen", text: "Adjusted EBITDA recalculated: $21.5M → $20.3M", field: "ebitda" },
  { t: 120, kind: "screen", text: "Opened 3.2 Meridian Freight MSA: Schedule B, $240,000 a year", field: "doc" },
  { t: 121, kind: "pii", n: 1, text: "Customer signatory name redacted in frame" },
  { t: 130, kind: "screen", text: "Opened 3.2 Meridian Freight Amendment 1, §3.1 highlighted", field: "doc" },
  { t: 150, kind: "screen", text: "Model cell changed: Meridian Freight ARR $500,000 → $260,000", field: "arr",
    cands: [
      { id: "q3", q: "You changed Meridian from $500,000 to $260,000 after reading the amendment. Why not add both contracts?", type: "reason", score: 0.91 },
      { q: "Did you mean to lower Meridian's ARR?", drop: "Yes or no question; reveals no reason" },
    ] },
  { t: 163, kind: "offOn", text: "Katharina said “off the record”" },
  { t: 175, kind: "screen", text: "(not stored)" },
  { t: 186, kind: "offOff", text: "Back on the record" },
  { t: 190, kind: "screen", text: "Opened 7.3 Capex schedule and fixed asset history", field: "doc" },
  { t: 192, kind: "pii", n: 2, text: "CFO name and email redacted in frame" },
  { t: 208, kind: "screen", text: "Model cell changed: maintenance capex 1.5% → 4.1% of revenue; IRR 27.4% → 22.0% (−5.4 pp)", field: "capex",
    cands: [
      { id: "q4", q: "You replaced management's 1.5% capex with 4.1%. When do you stop and escalate instead of just changing it?", type: "guardrail", score: 0.9 },
      { q: "Is there ever a good reason for capex to drop after a buyout?", defer: "d4", why: "Useful but not urgent, so it waits for the debrief" },
      { q: "What's the new IRR?", drop: "Shown in the model" },
    ] },
  { t: 216, kind: "screen", text: "IC memo draft: 3 items added to Key Risks", field: "memo" },
  { t: 222, kind: "speech", quote: "end" },
  { t: 227, kind: "end", text: "Katharina ended the task" },
];

/* -------------- teach: Project Beacon, a deal she never saw ------------ */
const CASES = [
  { id: "rev", label: "Revenue and add-backs", stage: "Contract validation and QoE scrubbing",
    intro: `${TEACH_DEAL.code} is a deal Katharina never saw. Spread Crestline Health's ARR and the relocation add-back into the model, then save to run the debt schedule. I'll stay quiet unless you're about to save something she'd stop.`,
    predict: { q: "Crestline has an $80,000 MSA and a $110,000 software agreement. What's Crestline's ARR?", options: ["$190,000", "$110,000", "$80,000"], answer: "$110,000", rule: "R4" } },
  { id: "lbo", label: "LBO assumptions", stage: "Running the LBO and value creation plan",
    intro: "Revenue and EBITDA are scrubbed. Now link them to the LBO and enter maintenance capex before the model calculates IRR.",
    predict: { q: "Management says 1.6% maintenance capex. History averages 4.0%. What would Katharina put in the model?", options: ["1.6%, management's number", "4.0%, and ask why"], answer: "4.0%, and ask why", rule: "R6" } },
  { id: "memo", label: "IC memo", stage: "Drafting the Investment Committee memo",
    intro: "Last step: the IC memo. Check the Key Risks section before it goes to the partners.",
    predict: { q: "Which findings belong in Key Risks?", options: ["Only the biggest ones", "Every item you flagged"], answer: "Every item you flagged", rule: "R9" } },
];

const TEACH_DOCS = {
  rev: [
    { id: "arr", name: "4.2 ARR schedule (management).xlsx", lines: [["Crestline Health: MSA $80,000 + Software Agreement $110,000", true], ["Crestline Health ARR: $190,000"], ["Prepared by management, Mar 2025"]] },
    { id: "msa", name: "3.1 Crestline Health MSA (Feb 2023).pdf", lines: [["Schedule A: annual fees $80,000"], ["Term: 3 years, renews automatically"]] },
    { id: "sw25", name: "3.1 Crestline Health Software Agreement (Jan 2025).pdf", lines: [["§1.2 This Agreement supersedes and replaces the Master Services Agreement dated 9 February 2023, including Schedule A.", true], ["Annual fees: $110,000"]] },
    { id: "bridge", name: "6.1 Adjusted EBITDA bridge (management).xlsx", lines: [["Reported EBITDA 2024: $31.2M"], ["Relocation, one-time: +$4.0M", true], ["Adjusted EBITDA: $35.2M"]] },
    { id: "gl", name: "5.2 GL detail 2022–2024, facilities.xlsx", lines: [["Relocation and facility moves, 2022: $1.4M"], ["2023: $1.9M"], ["2024: $1.6M"], ["Vendor: Summit Relocation Group, every year", true]] },
  ],
  lbo: [
    { id: "plan", name: "7.3 Capex plan (management case).xlsx", lines: [["Maintenance capex 2026–2030: 1.6% of revenue", true], ["Note: “efficiency program”"]] },
    { id: "far", name: "7.5 Fixed asset register, history.xlsx", lines: [["2021: 3.8% of revenue"], ["2022: 4.2%"], ["2023: 3.9%"], ["2024: 4.1%"], ["Average: 4.0%", true]] },
    { id: "deck", name: "2.1 Management presentation.pdf", lines: [["“Modernized equipment requires less maintenance”"], ["No lease, warranty or vendor terms attached", true]] },
  ],
  memo: [],
};

const RISKS = [
  { id: "conc", text: "Customer concentration: the top 5 customers are 38% of ARR.", required: false },
  { id: "crest", short: "the Crestline contract replacement", text: "Crestline's 2025 agreement replaces its 2023 MSA. ARR is $110,000, not $190,000 (−$80,000).", required: true },
  { id: "reloc", short: "the disputed $4.0M relocation add-back", text: "The $4.0M relocation add-back is disputed. Relocation costs recur in 2022–2024. With the QoE team.", required: true },
  { id: "capex", short: "the capex gap against history", text: "Maintenance capex: management assumes 1.6% against a 4.0% history, with no supporting document. IRR falls from 26.8% to 21.5% at history (−5.3 pp).", required: true },
];

/* =========================== helpers ================================== */
const fmt = (s) => {
  const v = Math.max(0, Math.floor(s));
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
};
const eur = (n) => "€" + n.toLocaleString("en-US", { minimumFractionDigits: 2 });

/* ======================= capture engine ===============================
   Deterministic and pure: stepCap(state, dt) -> state.
   Rules enforced here:
   - every screen change becomes a timestamped event
   - a question is asked only if (a) a relevant event queued it and
     (b) nothing is active (typing, reading, talking) for PAUSE_S seconds
   - off the record: no events, no transcript, no questions
   In production, replace SCRIPT with vision-model events and ACTIVITY
   with keyboard/mouse activity + Scribe v2 Realtime voice activity.
====================================================================== */
function initCap() {
  return {
    t: 0, running: false, speed: 8, ei: 0, events: [], transcript: [], asked: [], deferred: [], dropped: [],
    queue: [], dyn: [], pending: null, askingUntil: 0, agent: "idle", agentLine: "", holdReason: "",
    off: false, offSegs: [], suppressed: 0, redacted: 0, done: false, interruptions: 0,
  };
}

function signalsAt(cap, t) {
  const s = { typing: false, reading: false, speaking: false, agent: false };
  let lastEnd = 0;
  const all = [...ACTIVITY, ...cap.dyn.map((d) => ({ ...d, type: "speaking" }))];
  for (const a of all) {
    if (t >= a.from && t < a.to) { s[a.type] = true; lastEnd = t; }
    else if (a.to <= t) lastEnd = Math.max(lastEnd, a.to);
  }
  if (t < cap.askingUntil) { s.agent = true; lastEnd = t; }
  return { ...s, quiet: Math.max(0, t - lastEnd), active: s.typing || s.reading || s.speaking || s.agent };
}

function stepCap(prev, dt) {
  if (prev.done) return prev;
  const c = { ...prev, events: [...prev.events], transcript: [...prev.transcript], asked: [...prev.asked],
    queue: [...prev.queue], deferred: [...prev.deferred], dropped: [...prev.dropped], dyn: [...prev.dyn], offSegs: [...prev.offSegs] };
  const t = Math.min(END_T, prev.t + dt);

  while (c.ei < SCRIPT.length && SCRIPT[c.ei].t <= t) {
    const e = SCRIPT[c.ei++];
    if (e.kind === "offOn") { if (!c.off) { c.off = true; c.offSegs.push({ from: e.t, to: null, how: "voice command" }); c.transcript.push({ t: e.t, who: "marker", text: "Off the record. Audio and frames are not stored." }); } continue; }
    if (e.kind === "offOff") { if (c.off) { c.off = false; c.offSegs[c.offSegs.length - 1] = { ...c.offSegs[c.offSegs.length - 1], to: e.t }; c.transcript.push({ t: e.t, who: "marker", text: "Back on the record." }); } continue; }
    if (c.off) { c.suppressed++; continue; }
    if (e.kind === "speech") { c.transcript.push({ t: e.t, who: "expert", quote: e.quote }); continue; }
    if (e.kind === "pii") { c.redacted += e.n; c.events.push({ t: e.t, kind: "pii", text: e.text }); continue; }
    if (e.kind === "end") {
      c.events.push({ t: e.t, kind: "end", text: e.text });
      c.done = true; c.running = false; c.agent = "done";
      c.agentLine = `Thanks, ${EXPERT.first}. I have a few open questions for the debrief.`;
      continue;
    }
    c.events.push({ t: e.t, kind: "screen", text: e.text, field: e.field });
    (e.cands || []).forEach((k) => {
      if (k.drop) c.dropped.push({ t: e.t, q: k.q, why: k.drop });
      else if (k.defer) c.deferred.push({ t: e.t, q: k.q, why: k.why, gap: k.defer });
      else c.queue.push({ ...k, eventT: e.t, eventText: e.text, alts: e.cands.filter((x) => x !== k) });
    });
  }

  if (c.pending && t >= c.pending.at) {
    c.transcript.push({ t: c.pending.at, who: "expert", quote: c.pending.quote });
    c.asked = c.asked.map((a) => (a.id === c.pending.quote ? { ...a, answeredAt: c.pending.at } : a));
    c.pending = null;
  }

  const sig = signalsAt(c, t);
  if (c.done) { /* keep */ }
  else if (c.off) c.agent = "off";
  else if (t < c.askingUntil) c.agent = "asking";
  else if (c.pending) c.agent = "listening";
  else if (c.queue.length) {
    if (sig.typing || sig.reading || sig.speaking) {
      c.agent = "holding";
      c.holdReason = sig.typing ? "typing" : sig.speaking ? "talking" : "reading";
    } else if (sig.quiet >= PAUSE_S && c.asked.length < LIVE_BUDGET) {
      c.queue.sort((a, b) => b.score - a.score);
      const k = c.queue.shift();
      if (sig.active) c.interruptions++; // never happens by construction; kept as a metric
      c.asked.push({ id: k.id, q: k.q, type: k.type, t, eventT: k.eventT, eventText: k.eventText, quiet: sig.quiet, alts: k.alts });
      c.transcript.push({ t, who: "agent", text: k.q });
      c.agent = "asking"; c.agentLine = k.q; c.askingUntil = t + 2.5;
      c.dyn.push({ from: t + 2.5, to: t + 8 });
      c.pending = { at: t + 8, quote: k.id };
    } else c.agent = "waiting";
  } else c.agent = "listening";

  c.t = t;
  return c;
}

function runToEnd(cap) {
  let c = { ...cap, running: false };
  let guard = 0;
  while (!c.done && guard++ < 5000) c = stepCap(c, 0.5);
  return c;
}

function toggleOff(c, how = "button") {
  if (c.done) return c;
  if (c.off) {
    const segs = [...c.offSegs]; segs[segs.length - 1] = { ...segs[segs.length - 1], to: c.t };
    return { ...c, off: false, offSegs: segs, transcript: [...c.transcript, { t: c.t, who: "marker", text: "Back on the record." }] };
  }
  return { ...c, off: true, offSegs: [...c.offSegs, { from: c.t, to: null, how }],
    transcript: [...c.transcript, { t: c.t, who: "marker", text: "Off the record. Audio and frames are not stored." }] };
}

/* ======================== screen at time t ============================= */
const VDR_ROWS = [
  ["3.2 Meridian Freight, Amendment 1.pdf", "3 Customer contracts", "14 Mar 2025", 20250314],
  ["6.1 Adjusted EBITDA bridge (mgmt).xlsx", "6 Financials", "02 Mar 2025", 20250302],
  ["7.3 Capex schedule (mgmt case).xlsx", "7 Operations", "28 Feb 2025", 20250228],
  ["5.4 GL detail 2022–2024.xlsx", "5 Accounting", "20 Feb 2025", 20250220],
  ["9.1 Employee census.xlsx", "9 HR", "05 Jan 2025", 20250105],
  ["3.2 Meridian Freight, MSA.pdf", "3 Customer contracts", "11 Jan 2023", 20230111],
];

// What was on Katharina's screen at second t: a data-room document on the left, the model on the right.
function screenAt(t) {
  if (t < 21) return { view: "index", sorted: t >= 10 };
  const ebitdaRows = [
    { key: "rep", label: "Reported EBITDA 2024", v: "$18.4M" },
    { key: "addback", label: "Add-back: consulting, non-recurring", v: t >= 58 ? "$0.0M" : "$1.2M", sub: t >= 58 ? "Was $1.2M in management's bridge" : "From management's bridge" },
    { key: "qoe", label: "QoE status", v: t >= 100 ? "Flagged for QoE review" : "–", sub: t >= 100 ? "3 invoices attached: 2022, 2023, 2024" : null },
    { key: "ebitda", label: "Adjusted EBITDA", v: t >= 112 ? "$20.3M" : "$21.5M", calc: true },
  ];
  if (t < 120) return { view: "work", label: "EBITDA bridge",
    doc: t < 30
      ? { name: "6.1 Adjusted EBITDA bridge (management).xlsx", lines: [["Reported EBITDA 2024: $18.4M"], ["Consulting, non-recurring: +$1.2M", true], ["Severance: +$0.7M"], ["Relocation: +$0.6M"], ["Pro forma pricing: +$0.6M"], ["Adjusted EBITDA: $21.5M"]], person: "Dana Whitfield, CFO" }
      : { name: "5.4 GL detail 2022–2024, filtered: Brightline Advisory", lines: [["2022: $1.1M"], ["2023: $1.3M"], ["2024: $1.2M", true], ["Description: ongoing operational advisory"]], person: "Dana Whitfield, CFO" },
    rows: ebitdaRows };
  if (t < 190) return { view: "work", label: "Top-20 contracts",
    doc: t < 130
      ? { name: "3.2 Meridian Freight MSA (Jan 2023).pdf", lines: [["Schedule B: annual subscription fees $240,000"], ["Term: 3 years, renews automatically"]], person: "Tom Reyes, VP Operations" }
      : { name: "3.2 Meridian Freight Amendment 1 (Mar 2025).pdf", lines: [["§3.1 This Amendment supersedes and replaces Schedule B in its entirety.", true], ["New annual fees: $260,000"]], person: "Tom Reyes, VP Operations" },
    rows: [
      { key: "ebitda", label: "Adjusted EBITDA", v: "$20.3M", calc: true },
      { key: "arr", label: "ARR: Meridian Freight", v: t >= 150 ? "$260,000" : "$500,000", sub: t >= 150 ? "Amendment 1 only" : "MSA $240,000 + Amendment 1 $260,000" },
      { key: "arrtop", label: "Top-20 customer ARR", v: t >= 150 ? "$13.94M" : "$14.18M", calc: true },
    ] };
  return { view: "work", label: "LBO assumptions",
    doc: { name: "7.3 Capex schedule and fixed asset history.xlsx", lines: [["2021: 4.1% of revenue"], ["2022: 3.9%"], ["2023: 4.4%"], ["2024: 4.0%"], ["Management plan 2026–2030: 1.5%", true]], person: "Dana Whitfield, CFO" },
    rows: [
      { key: "ebitda", label: "Adjusted EBITDA", v: "$20.3M", calc: true },
      { key: "capex", label: "Maintenance capex, % of revenue", v: t >= 208 ? "4.1%" : "1.5%", sub: t >= 208 ? "Historical average. Management case: 1.5%" : "Management case" },
      { key: "irr", label: "Sponsor IRR, 5 years", v: t >= 208 ? "22.0%" : "27.4%", calc: true },
      { key: "memo", label: "IC memo: Key Risks", v: t >= 216 ? "3 items" : "–" },
    ] };
}

function recentField(t) {
  let f = null;
  for (const e of SCRIPT) if (e.field && e.t <= t && t - e.t < 4) f = e.field;
  return f;
}


/* =========================== context ================================== */
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);
const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* ===================== one source of truth for counts ================= */
// Every count shown anywhere (sidebar, overview, page headers) comes from here.
function selectAll({ cap, gaps, claims, signed, teach, ruleEvidence }) {
  const gapsAnswered = GAPS.filter((g) => gaps[g.id] === "answered").length;
  const claimsResolved = RULES.filter((r) => claims[r.id]).length;
  const verified = RULES.filter((r) => ruleEvidence(r.id) === "verified").length;
  const awaiting = !cap.done ? [] : [
    ...GAPS.filter((g) => gaps[g.id] !== "answered").map((g) => ({ id: g.id, kind: "Open question", text: g.q, page: "debrief" })),
    ...(gapsAnswered === GAPS.length ? RULES.filter((r) => !claims[r.id]).map((r) => ({ id: r.id, kind: "Teach-back line", text: r.draftWrong ? r.draft : r.text, page: "debrief" })) : []),
    ...(gapsAnswered === GAPS.length && claimsResolved === RULES.length && !signed ? [{ id: "sign", kind: "Final sign-off", text: "Confirm the teach-back as a whole", page: "debrief" }] : []),
  ];
  const handled = CASES.filter((c) => teach.saved[c.id]).length;
  const caught = teach.log.filter((l) => l.kind === "caught").length;
  const own = CASES.filter((c) => teach.saved[c.id] && teach.saved[c.id].caught === 0).length;
  const preds = Object.values(teach.preds).filter(Boolean);
  return {
    asked: cap.asked.length, guardQs: cap.asked.filter((a) => a.type === "guardrail").length, dropped: cap.dropped.length,
    interruptions: cap.interruptions, offSegs: cap.offSegs.length, redacted: cap.redacted, captureDone: cap.done,
    gapsAnswered, gapsTotal: GAPS.length, claimsResolved, claimsTotal: RULES.length, verified, signed,
    awaiting, handled, casesTotal: CASES.length, caught, own, predsRight: preds.filter((p) => p.correct).length, predsTotal: preds.length,
  };
}

/* ======================== shared components =========================== */
function PageHead({ title, lede, actions }) {
  return (
    <header className="pg-head">
      <div style={{ minWidth: 0, flex: "1 1 560px" }}>
        <h1 className="t-page">{title}</h1>
        {lede && <p className="t-body lede">{lede}</p>}
      </div>
      {actions && <div className="pg-actions">{actions}</div>}
    </header>
  );
}

function Card({ title, extra, children, className = "", as: Tag = "section", label }) {
  return (
    <Tag className={"card " + className} aria-label={label || (typeof title === "string" ? title : undefined)}>
      {(title || extra) && <div className="card-head">{title && <h2 className="t-card">{title}</h2>}{extra}</div>}
      {children}
    </Tag>
  );
}

function Badge({ tone = "", icon: Icon, children, dashed, title }) {
  return <span className={"badge" + (tone ? " b-" + tone : "") + (dashed ? " dashed" : "")} title={title}>{Icon && <Icon size={12} aria-hidden />}{children}</span>;
}

// Six evidence levels. Green is reserved for "verified".
const EVIDENCE = {
  proposed: { label: "Proposed by apprentice", tone: "agent", icon: PenLine, dashed: true },
  reported: { label: "Agent reported", tone: "agent", icon: Bot },
  recorded: { label: "System recorded", tone: "fact", icon: Database },
  external: { label: "Externally confirmed", tone: "fact", icon: Users },
  approved: { label: `Approved by ${EXPERT.first}, source removed`, tone: "fact", icon: UserCheck },
  verified: { label: "Verified", tone: "success", icon: ShieldCheck },
};
function Evidence({ level, label }) {
  const e = EVIDENCE[level];
  return <Badge tone={e.tone} icon={e.icon} dashed={e.dashed}>{label || e.label}</Badge>;
}
function Awaiting({ children }) { return <Badge tone="pending" icon={Clock}>{children || `Awaiting ${EXPERT.first}`}</Badge>; }

// What kind of AI answer this is.
const ANSWER = {
  exact: { label: "Exact record", icon: FileText, tone: "fact" },
  grounded: { label: `Grounded in ${EXPERT.first}'s words`, icon: ShieldCheck, tone: "fact" },
  general: { label: "General explanation, not a verified rule", icon: Info, tone: "" },
};
function AnswerType({ kind }) { const a = ANSWER[kind]; return <Badge tone={a.tone} icon={a.icon}>{a.label}</Badge>; }

function TimeLink({ t, onClick }) {
  if (t == null) return null;
  return onClick
    ? <button className="time" onClick={() => onClick(t)} aria-label={`Screen moment ${fmt(t)}`}>{fmt(t)}</button>
    : <span className="time">{fmt(t)}</span>;
}

function Req({ on, children }) {
  return (
    <div className="req">
      <span className={"req-box" + (on ? " on" : "")} aria-hidden>{on && <Check size={12} strokeWidth={3} />}</span>
      <span><span className="sr">{on ? "Done: " : "Not yet: "}</span>{children}</span>
    </div>
  );
}

function Quote({ id, onTime }) {
  const { quotes, struck, settings } = useApp();
  const [flip, setFlip] = useState(false);
  const q = quotes[id];
  if (!q) return null;
  if (struck[id]) return <figure className="quote struck"><blockquote>Struck from the record by {EXPERT.first}.</blockquote></figure>;
  const lang = flip ? (settings.quoteLang === "en" ? "de" : "en") : settings.quoteLang;
  const text = lang === "de" && q.de ? q.de : q.en;
  return (
    <figure className="quote">
      <blockquote lang={lang === "de" && q.de ? "de" : "en"}>“{text}”</blockquote>
      <figcaption>
        <span className="t-meta">{q.by || EXPERT.first}</span><span>{q.where}</span>
        {q.t != null && <TimeLink t={q.t} onClick={onTime} />}
        {q.de && <button className="link" onClick={() => setFlip((f) => !f)}>{lang === "de" ? "Show English" : "Show original German"}</button>}
      </figcaption>
    </figure>
  );
}

/* The expert's screen at second t: a data-room file on the left, the model on the right. */
function Screen({ t, off = false, compact = false, highlight, redact }) {
  const s = screenAt(t);
  const changed = highlight !== undefined ? highlight : recentField(t);
  const r = redact || { PERSON: true };
  const rows = s.view === "index" ? [...VDR_ROWS].sort((a, b) => (s.sorted ? b[3] - a[3] : a[1].localeCompare(b[1]))) : [];
  return (
    <div className={"scr" + (compact ? " compact" : "")} role="img" aria-label={`${EXPERT.first}'s screen at ${fmt(t)}${changed ? ", changed: " + changed : ""}`}>
      <div className="scr-bar"><span>{DEAL.code} data room</span><span>LBO model v14.xlsx</span></div>
      {s.view === "index" ? (
        <div className="scr-body">
          <div className="scr-sub"><span>1,240 files in 9 folders</span><span>Sorted by {s.sorted ? "latest version first" : "folder"}</span></div>
          <table className="scr-table">
            <thead><tr><th>File</th>{!compact && <th>Folder</th>}<th>Version date</th></tr></thead>
            <tbody>{rows.map((x) => <tr key={x[0]}><td>{x[0]}</td>{!compact && <td>{x[1]}</td>}<td>{x[2]}</td></tr>)}</tbody>
          </table>
        </div>
      ) : (
        <div className="wb">
          <div className={"wb-doc" + (changed === "doc" ? " changed" : "")}>
            <div className="wb-h"><span>Data room</span>{changed === "doc" && <span className="chg-tag">Opened</span>}</div>
            <div className="doc-name">{s.doc.name}</div>
            {s.doc.lines.map(([l, hl], i) => <div key={i} className={"doc-line" + (hl ? " hl" : "")}>{l}</div>)}
            {!compact && <div className="doc-line" style={{ marginTop: 8 }}>Signed by: {r.PERSON ? <span className="redact">Name redacted</span> : s.doc.person}</div>}
          </div>
          <div className="wb-model">
            <div className="wb-h"><span>Model inputs: {s.label}</span></div>
            {s.rows.map((m) => (
              <div key={m.key} className={"mrow" + (changed === m.key ? " changed" : "")}>
                <span>{m.label}{changed === m.key && <> <span className="chg-tag">Changed</span></>}</span><span className="v">{m.v}</span>
                {m.sub && <span className="sub">{m.sub}</span>}
              </div>))}
          </div>
        </div>
      )}
      {off && <div className="scr-off"><EyeOff size={16} aria-hidden /> Off the record. Frames don't leave the browser and nothing is stored.</div>}
    </div>
  );
}

// Replays a short window around a screen moment, to show what changed.
// Reduced motion: shows the end state with the "Changed" tag instead of playing.
function Replay({ t, field, label }) {
  const reduced = prefersReducedMotion();
  const [now, setNow] = useState(reduced ? t : Math.max(0, t - 3));
  const [playing, setPlaying] = useState(!reduced);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setNow((n) => { if (n >= t + 2) { setPlaying(false); return n; } return n + 0.5; }), 220);
    return () => clearInterval(id);
  }, [playing, t]);
  return (
    <div className="stack tight">
      <div className="row"><span className="t-sec">{label || `${EXPERT.first}'s screen`}</span><TimeLink t={now} /><span className="spacer" />
        {!reduced && <button className="btn compact" onClick={() => { setNow(Math.max(0, t - 3)); setPlaying(true); }}><RotateCcw size={13} aria-hidden /> Replay</button>}</div>
      <Screen t={now} compact highlight={now >= t ? field : null} />
    </div>
  );
}

/* A feed that never moves rows under the reader. New rows append at the
   bottom; if the reader has scrolled up, a "N new" pill appears instead. */
function Feed({ items, render, emptyText, newestT, label }) {
  const box = useRef(null);
  const [atBottom, setAtBottom] = useState(true);
  const [unseen, setUnseen] = useState(0);
  const prev = useRef(items.length);
  useEffect(() => {
    const diff = items.length - prev.current; prev.current = items.length;
    if (diff <= 0) return;
    if (atBottom && box.current) box.current.scrollTop = box.current.scrollHeight;
    else setUnseen((u) => u + diff);
  }, [items.length]); // eslint-disable-line
  function onScroll() {
    const b = box.current; const bottom = b.scrollHeight - b.scrollTop - b.clientHeight < 8;
    setAtBottom(bottom); if (bottom) setUnseen(0);
  }
  return (
    <div className="feed" ref={box} onScroll={onScroll} tabIndex={0} aria-label={label}>
      {items.length === 0 && <p className="empty">{emptyText}</p>}
      {items.map((it, i) => render(it, i, newestT != null && newestT - (it.t ?? 0) < 3))}
      {unseen > 0 && <button className="new-pill" onClick={() => { box.current.scrollTop = box.current.scrollHeight; setUnseen(0); }}>{unseen} new {unseen === 1 ? "item" : "items"}</button>}
    </div>
  );
}

/* Dialog: opens with focus on its heading, traps Tab, returns focus on close. */
function Dialog({ title, children, actions, onClose }) {
  const ref = useRef(null); const head = useRef(null); const opener = useRef(null);
  useEffect(() => {
    opener.current = document.activeElement; head.current?.focus();
    return () => opener.current?.focus?.();
  }, []);
  function onKey(e) {
    if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    if (e.key === "Tab") {
      const f = ref.current.querySelectorAll("button:not([disabled]),[href],input,select,textarea,[tabindex='0']");
      if (!f.length) return; const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title" ref={ref} onKeyDown={onKey}>
        <div className="row" style={{ alignItems: "flex-start" }}>
          <h2 id="dlg-title" className="t-decision" tabIndex={-1} ref={head} style={{ outline: "none" }}>{title}</h2>
          <button className="dialog-close" onClick={onClose} aria-label="Close"><X size={16} aria-hidden /></button>
        </div>
        <div className="t-body c2">{children}</div>
        <div className="row" style={{ justifyContent: "flex-end" }}>{actions}</div>
      </div>
    </div>
  );
}

/* Menu: focus moves into it on open; arrows move; Escape returns focus. */
function AppearanceMenu() {
  const { settings, setSettings } = useApp();
  const [open, setOpen] = useState(false);
  const btn = useRef(null); const menu = useRef(null);
  const opts = [["system", "Match system", Monitor], ["light", "Light", Sun], ["dark", "Dark", Moon]];
  useEffect(() => {
    if (!open) return;
    const items = menu.current.querySelectorAll('[role="menuitemradio"]');
    const i = opts.findIndex((o) => o[0] === settings.theme);
    items[Math.max(0, i)]?.focus();
  }, [open]); // eslint-disable-line
  function key(e) {
    const items = [...menu.current.querySelectorAll('[role="menuitemradio"]')];
    const i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    if (e.key === "Home") { e.preventDefault(); items[0].focus(); }
    if (e.key === "End") { e.preventDefault(); items[items.length - 1].focus(); }
    if (e.key === "Escape") { e.preventDefault(); setOpen(false); btn.current.focus(); }
    if (e.key === "Tab") setOpen(false);
  }
  const cur = opts.find((o) => o[0] === settings.theme);
  const CurIcon = cur[2];
  return (
    <div className="menu-wrap">
      <div className="pill">
        <button ref={btn} className="pill-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <CurIcon size={14} aria-hidden /> Appearance <ChevronDown size={14} aria-hidden /></button>
      </div>
      {open && <div className="menu" role="menu" aria-label="Appearance" ref={menu} onKeyDown={key}>
        {opts.map(([v, l, I]) => (
          <button key={v} role="menuitemradio" aria-checked={settings.theme === v} tabIndex={-1}
            onClick={() => { setSettings((s) => ({ ...s, theme: v })); setOpen(false); btn.current.focus(); }}>
            <I size={14} aria-hidden /> {l} {settings.theme === v && <Check size={14} aria-hidden style={{ marginLeft: "auto" }} />}</button>))}
      </div>}
    </div>
  );
}

/* Command bar: WAI-ARIA combobox. Arrows move the highlight; Home/End move the
   text cursor until the user has started arrowing; no stray tab stops. */
const PAGES = [
  ["overview", "Overview"], ["capture", "Capture: live session"], ["debrief", "Debrief"], ["map", "Work Map"],
  ["teach", `Coach ${TRAINEE.first}`], ["results", "Results"], ["compare", "Compare experts"], ["export", "Agent export"], ["trust", "Trust and privacy"],
];
function CommandBar({ onDone }) {
  const { go, setMapStep } = useApp();
  const [q, setQ] = useState(""); const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1); const [arrowed, setArrowed] = useState(false);
  const all = useMemo(() => [
    ...PAGES.map(([p, l]) => ({ id: "p-" + p, label: l, kind: "Page", run: () => go(p) })),
    ...STEPS.map((s) => ({ id: "s-" + s.n, label: `Step ${s.n}: ${s.title}`, kind: "Work Map step", run: () => { setMapStep(s.n); go("map"); } })),
    ...RULES.map((r) => ({ id: "r-" + r.id, label: r.text, kind: r.kind === "guardrail" ? "Guardrail" : r.kind === "judgment" ? "Judgment call" : "Step rule", run: () => { setMapStep(r.step); go("map"); } })),
  ], [go, setMapStep]);
  const opts = all.filter((o) => !q.trim() || (o.label + " " + o.kind).toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8);
  function choose(o) { o.run(); setQ(""); setOpen(false); setActive(-1); setArrowed(false); onDone?.(); }
  function key(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setArrowed(true); setActive((a) => Math.min(a + 1, opts.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setOpen(true); setArrowed(true); setActive((a) => Math.max(a - 1, 0)); }
    else if ((e.key === "Home" || e.key === "End") && arrowed && open) { e.preventDefault(); setActive(e.key === "Home" ? 0 : opts.length - 1); }
    else if (e.key === "Enter" && open && active >= 0 && opts[active]) { e.preventDefault(); choose(opts[active]); }
    else if (e.key === "Escape") { if (open) { setOpen(false); setActive(-1); setArrowed(false); } else setQ(""); }
  }
  return (
    <div className="search">
      <div className="pill">
        <Search size={14} aria-hidden />
        <input role="combobox" aria-label="Search pages, steps and rules" aria-expanded={open && opts.length > 0} aria-controls="cmd-list" aria-autocomplete="list"
          aria-activedescendant={open && active >= 0 && opts[active] ? opts[active].id : undefined}
          placeholder="Search pages, steps and rules" value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(-1); setArrowed(false); }}
          onFocus={() => q && setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)} onKeyDown={key} />
        <span className="kbd" aria-hidden>↓</span>
      </div>
      {open && opts.length > 0 && (
        <ul className="listbox" role="listbox" id="cmd-list" aria-label="Results">
          {opts.map((o, i) => (
            <li key={o.id} id={o.id} role="option" aria-selected={i === active} className="option" onMouseDown={(e) => { e.preventDefault(); choose(o); }} onMouseEnter={() => setActive(i)}>
              <span style={{ minWidth: 0 }}>{o.label}</span><span className="t-sec">{o.kind}</span>
            </li>))}
        </ul>)}
      {open && q && opts.length === 0 && <div className="listbox" role="status"><p className="empty" style={{ padding: 8 }}>No page, step or rule matches “{q}”.</p></div>}
    </div>
  );
}

/* Browser speech is a stand-in. Swap for the ElevenAgents session (Expressive Mode). */
function speakText(on, text) {
  try {
    if (!on || !window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.rate = 0.98;
    window.speechSynthesis.speak(u);
  } catch (e) { /* ignore */ }
}

/* ============================== TEACH ================================= */
const CASE_RULES = { rev: ["R4", "R7", "R8", "R3"], lbo: ["R6"], memo: ["R9"] };
const FLAG_LABEL = { R4: "this ARR total", R7: "this ARR total", R8: "the relocation add-back", R6: "this capex assumption", R9: "the Key Risks section" };
const ASK = {
  R4: "Does the new software agreement add to the original, or replace it?",
  R7: "Which document did that number come from?",
  R8: "What historical invoices would you check before accepting that $4M as truly non-recurring?",
  R6: "Why would this company suddenly need less capital to maintain its equipment after the buyout?",
  R9: "Which of today's findings would a partner expect to read here?",
};
const blankForm = (id) => ({
  rev: { arr: "", addback: "accept", opened: [], open: "arr", result: null },
  lbo: { capex: "1.6", opened: [], open: "plan", escalated: false, result: null },
  memo: { inc: { conc: true, crest: false, reloc: false, capex: true }, opened: [], open: null, result: null },
}[id]);
const num = (v) => Number(String(v).replace(/[^0-9.]/g, ""));
const usd = (n) => "$" + Math.round(n).toLocaleString("en-US");
const irrAt = (capex) => { const x = num(capex); return isNaN(x) ? "–" : (26.8 - (x - 1.6) * 2.2).toFixed(1) + "%"; };

// Judges a trainee decision. Only ink (confirmed) rules can block.
function evaluate(caseId, f, isVerified) {
  const v = [];
  const add = (id, msg) => v.push({ id, msg, ink: isVerified(id) });
  if (caseId === "rev") {
    if (f.arr.trim() && !f.opened.includes("sw25")) add("R7", "That ARR came from management's schedule. You haven't opened the 2025 software agreement behind it.");
    if (f.arr.trim() && num(f.arr) !== 110000) add("R4", num(f.arr) === 190000
      ? "You added both contracts. §1.2 of the 2025 agreement replaces the MSA, so Crestline's ARR is $110,000, not $190,000."
      : `Check §1.2 of the 2025 agreement. It decides whether ${usd(num(f.arr))} is right.`);
    if (f.addback === "accept") add("R8", "Relocation costs show up in the GL in 2022, 2023 and 2024, with the same vendor every year. The $4.0M isn't proven one-time.");
  }
  if (caseId === "lbo") {
    if (num(f.capex) < 3.0 && !f.escalated) add("R6", `${f.capex}% is less than half of the 4.0% history, and nothing in the data room explains the drop.`);
  }
  if (caseId === "memo") {
    const missing = RISKS.filter((r) => r.required && !f.inc[r.id]);
    if (missing.length) add("R9", `${missing.length === 1 ? "This finding isn't" : "These findings aren't"} in Key Risks yet: ${missing.map((r) => r.short).join(" and ")}.`);
  }
  return v;
}


/* ============================= RESULTS ================================ */
const PRACTICE = {
  R1: "A data room with three versions of the same customer contract",
  R2: "A “one-time” IT migration that also shows up in last year's GL",
  R3: "An add-back the seller insists on, backed by only partial invoices",
  R4: "A customer with an MSA and two amendments, only one of which supersedes",
  R5: "Two contracts with one customer, overlapping scope and no superseding clause",
  R6: "A management case where capex falls because of a claimed equipment lease",
  R7: "A management ARR figure with no contract in the data room",
  R8: "A severance add-back with no invoice-level detail",
  R9: "An IC memo draft that sums up the flags in one sentence",
};


/* ============================ OVERVIEW ================================ */
function OverviewPage() {
  const { sel, go, fillDemo, askReset } = useApp();
  const S = sel;
  const next = !S.captureDone ? ["capture", "Start the capture"] : !S.signed ? ["debrief", "Continue the debrief"] : S.handled < S.casesTotal ? ["teach", `Coach ${TRAINEE.first}`] : ["results", "Review results"];
  const stages = [
    { n: 1, name: "Capture", page: "capture", done: S.captureDone,
      what: `${EXPERT.first} works the ${DEAL.code} data room into the model while the apprentice watches and asks why.`,
      status: S.captureDone ? `${S.asked} live questions asked` : "Not started" },
    { n: 2, name: "Map", page: "debrief", done: S.signed,
      what: "A spoken debrief closes the gaps, explains the process back and builds the Work Map.",
      status: `${S.verified} of ${S.claimsTotal} rules verified` },
    { n: 3, name: "Teach", page: "teach", done: S.handled === S.casesTotal,
      what: `${TRAINEE.first} runs a deal ${EXPERT.first} never saw. The tutor stops a bad input before it reaches the debt schedule.`,
      status: `${S.handled} of ${S.casesTotal} stages handled` },
  ];
  const test = [
    { name: "When to ask", page: "capture", ok: S.asked >= 3 && S.interruptions === 0,
      how: `Speaks after ${PAUSE_S} s of quiet with a screen event waiting; typing, reading or talking hold it.`,
      ev: `${S.asked} asked at pauses, ${S.interruptions} interruptions` },
    { name: "What to ask", page: "capture", ok: S.guardQs >= 1,
      how: "Drops any candidate question the screen already answers.",
      ev: `${S.guardQs} about guardrails, ${S.dropped} dropped` },
    { name: "When it has understood", page: "debrief", ok: S.signed,
      how: `Every open question answered, every teach-back line confirmed by ${EXPERT.first}.`,
      ev: `${S.gapsAnswered} of ${S.gapsTotal} answered, ${S.verified} of ${S.claimsTotal} verified` },
    { name: "Whether the new hire learned", page: "results", ok: S.caught >= 1 && S.handled >= 1,
      how: `${TRAINEE.first} works an unseen deal; only verified rules can block her.`,
      ev: `${S.handled} of ${S.casesTotal} stages, ${S.caught} inputs caught` },
    { name: "Trust", page: "trust", ok: S.offSegs >= 1,
      how: "Off the record by voice or button; names, SSNs and salaries redacted in the browser.",
      ev: `${S.offSegs} off-record ${S.offSegs === 1 ? "segment" : "segments"}, ${S.redacted} items redacted` },
  ];
  const shown = S.awaiting.slice(0, 3);
  return (
    <>
      <PageHead title={`Capture how ${EXPERT.first} challenges the numbers`}
        lede={`${EXPERT.first} never takes an add-back, a contract or a capex plan at face value. Record one diligence pass, check what the apprentice understood, then let it coach ${TRAINEE.first} on a deal ${EXPERT.first} never saw.`}
        actions={<>
          <button className="btn" onClick={askReset}><RotateCcw size={14} aria-hidden /> Start over</button>
          <button className="btn" onClick={fillDemo}>Load finished session</button>
          <button className="btn capsule" onClick={() => go(next[0])}>{next[1]}</button>
        </>} />
      <div className="stack">
        <div className="grid g3">
          {stages.map((s) => (
            <Card key={s.n} label={s.name}>
              <div className="stack tight">
                <div className="row"><span className={"nav-num" + (s.done ? " done" : "")} aria-hidden>{s.n}</span><h2 className="t-card">{s.name}</h2><span className="spacer" />
                  {s.done ? <Badge tone="success" icon={Check}>Completed</Badge> : <Badge>Open</Badge>}</div>
                <p className="t-sec">{s.what}</p>
                <div className="row"><span className="t-meta">{s.status}</span><span className="spacer" />
                  <button className="btn compact" onClick={() => go(s.page)}>Open {s.name.toLowerCase()}</button></div>
              </div>
            </Card>))}
        </div>
        <div className="grid g-ov">
          <Card title="The apprentice test" extra={<span className="t-sec">Updates as the demo runs</span>}>
            <ul>
              {test.map((r) => (
                <li key={r.name} className="list-row">
                  <div className="row" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
                    <Req on={r.ok}><span className="strong">{r.name}</span></Req>
                    <span className="spacer" />
                    <span className="t-meta" style={{ textAlign: "right", paddingTop: 4 }}>{r.ev}</span>
                    <button className="link" onClick={() => go(r.page)} aria-label={`Show evidence for ${r.name}`}>Show</button>
                  </div>
                  <p className="t-sec" style={{ marginLeft: 26, marginTop: -2 }}>{r.how}</p>
                </li>))}
            </ul>
          </Card>
          <Card title={`Waiting on ${EXPERT.first}`} extra={S.awaiting.length > 0 && <Awaiting>{S.awaiting.length} awaiting</Awaiting>}>
            {!S.captureDone ? <p className="empty">Questions for {EXPERT.first} appear when the capture ends.</p>
              : S.awaiting.length === 0 ? <div className="notice success inline"><ShieldCheck size={16} aria-hidden /><span>Nothing waiting. {S.verified} of {S.claimsTotal} rules are verified.</span></div>
              : <>
                <ul>{shown.map((a) => (
                  <li key={a.id} className="list-row stack x-tight">
                    <span className="t-cap">{a.kind}</span>
                    <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{a.text}</span>
                  </li>))}</ul>
                <div className="row" style={{ marginTop: 8 }}><span className="t-meta">Showing {shown.length} of {S.awaiting.length}</span><span className="spacer" />
                  <button className="btn compact" onClick={() => go("debrief")}>Open the debrief</button></div>
              </>}
          </Card>
        </div>
      </div>
    </>
  );
}

/* ============================= CAPTURE ================================ */
function CapturePage() {
  const { cap, setCap, settings, go, voice, sel, announce } = useApp();
  const [tab, setTab] = useState("questions");
  const [stream, setStream] = useState(null);
  const [shareMsg, setShareMsg] = useState(null);
  const [open, setOpen] = useState(null);
  const videoRef = useRef(null);
  const capRef = useRef(cap); capRef.current = cap;

  useEffect(() => {
    if (!cap.running) return;
    const id = setInterval(() => setCap((c) => (c.running ? stepCap(c, 0.1 * c.speed) : c)), 100);
    return () => clearInterval(id);
  }, [cap.running, setCap]);

  const said = useRef(cap.asked.length);
  useEffect(() => {
    if (cap.asked.length > said.current) speakText(voice, cap.asked[cap.asked.length - 1].q);
    said.current = cap.asked.length;
  }, [cap.asked.length, voice]);
  useEffect(() => { if (cap.done) announce("Capture finished. The debrief is ready."); }, [cap.done]); // eslint-disable-line

  useEffect(() => { if (videoRef.current && stream) videoRef.current.srcObject = stream; }, [stream]);
  useFrameSampler(stream, videoRef, capRef, setCap);

  async function share() {
    setShareMsg(null);
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 2 }, audio: false });
      s.getVideoTracks()[0].onended = () => setStream(null);
      setStream(s);
      setShareMsg({ tone: "agent", text: "Sharing. A frame goes to the vision model every 2 s; only the events it reports are kept." });
    } catch (e) {
      setShareMsg({ tone: "critical", text: "Screen sharing is blocked in this preview. Play the demo session here, or run the app on your own domain to share a real screen." });
    }
  }
  function stopShare() { stream?.getTracks().forEach((tr) => tr.stop()); setStream(null); setShareMsg(null); }

  const sig = signalsAt(cap, cap.t);
  const pause = !sig.active && sig.quiet >= PAUSE_S && !cap.off && !cap.done && cap.t > 0;
  const state = {
    idle: [Bot, "Ready"], listening: [Mic, cap.pending ? `Listening to ${EXPERT.first}'s answer` : "Listening"],
    waiting: [Clock, "Waiting for a natural pause"], asking: [MessageSquare, "Asking"],
    holding: [Hand, `Holding a question while ${EXPERT.first} is ${cap.holdReason}`], off: [EyeOff, "Off the record"], done: [Check, "Task finished"],
  }[cap.agent];
  const StateIcon = state[0];

  return (
    <>
      <PageHead title="Capture: watch the work, ask why"
        lede={`${EXPERT.first} shares her screen and works the ${DEAL.code} data room into the LBO model. The apprentice stays quiet while she types, reads or talks, and asks one short question at a natural pause, always about something on screen.`}
        actions={<button className="btn capsule" disabled={!cap.done} aria-disabled={!cap.done} onClick={() => go("debrief")}>Start the debrief</button>} />
      {shareMsg && <div className={"notice " + shareMsg.tone} role="status">{shareMsg.tone === "critical" ? <AlertTriangle size={16} aria-hidden /> : <MonitorUp size={16} aria-hidden />}<span>{shareMsg.text}</span></div>}

      <div className="grid g-main">
        <div className="stack">
          <Card title={`${EXPERT.first}'s screen`} extra={
            <div className="row">
              {stream ? <button className="btn compact" onClick={stopShare}><Square size={13} aria-hidden /> Stop sharing</button>
                : <button className="btn compact" onClick={share}><MonitorUp size={13} aria-hidden /> Share my screen</button>}
              <button className={"btn compact"} aria-pressed={cap.off} disabled={cap.done || cap.t === 0} onClick={() => setCap((c) => toggleOff(c))}>
                <EyeOff size={13} aria-hidden /> {cap.off ? "Go back on the record" : "Go off the record"}</button>
            </div>}>
            <div className="stack">
              <div className="row">
                <button className="btn" disabled={cap.done} onClick={() => setCap((c) => ({ ...c, running: !c.running }))}>
                  {cap.running ? <><Pause size={14} aria-hidden /> Pause demo</> : <><Play size={14} aria-hidden /> {cap.t > 0 ? "Resume demo" : "Play demo session"}</>}</button>
                <div className="seg" role="radiogroup" aria-label="Playback speed">
                  {[4, 8, 16].map((s) => <button key={s} role="radio" aria-checked={cap.speed === s} onClick={() => setCap((c) => ({ ...c, speed: s }))}>{s}×</button>)}
                </div>
                <button className="btn" disabled={cap.done} onClick={() => setCap((c) => runToEnd(c))}><FastForward size={14} aria-hidden /> Skip to end</button>
                <button className="btn" onClick={() => setCap(initCap())}><RotateCcw size={14} aria-hidden /> Restart</button>
              </div>
              {stream ? <video ref={videoRef} autoPlay muted playsInline style={{ width: "100%", borderRadius: 8, border: "1px solid var(--line)" }} />
                : <Screen t={cap.t} off={cap.off} redact={settings.redact} />}
              <div>
                <div className="row"><span className="t-sec">Session time</span><TimeLink t={cap.t} /><span className="spacer" />
                  <span className="t-sec">{fmt(END_T)} total</span></div>
                <div className="scrub" aria-hidden>
                  <div className="scrub-track" /><div className="scrub-fill" style={{ width: `${(cap.t / END_T) * 100}%` }} />
                  {cap.offSegs.map((s, i) => <div key={i} className="scrub-off" style={{ left: `${(s.from / END_T) * 100}%`, width: `${(((s.to ?? cap.t) - s.from) / END_T) * 100}%` }} />)}
                  {cap.asked.map((a) => <div key={a.id} className={"scrub-q" + (a.type === "guardrail" ? " g" : "")} style={{ left: `${(a.t / END_T) * 100}%` }} />)}
                </div>
              </div>
              <div className="signals" aria-label="Activity signals">
                <div className={"signal" + (sig.typing ? " on" : "")}><span className="row strong"><Keyboard size={13} aria-hidden /> Typing</span><span className="t-sec">{sig.typing ? "Active, so the apprentice waits" : "Keyboard idle"}</span></div>
                <div className={"signal" + (sig.reading ? " on" : "")}><span className="row strong"><BookOpen size={13} aria-hidden /> Reading</span><span className="t-sec">{sig.reading ? "Scrolling or reading" : "No reading detected"}</span></div>
                <div className={"signal" + (sig.speaking || sig.agent ? " on" : "")}><span className="row strong"><Mic size={13} aria-hidden /> Talking</span><span className="t-sec">{sig.agent ? "Apprentice speaking" : sig.speaking ? `${EXPERT.first} is talking` : "Silence"}</span></div>
                <div className={"signal" + (pause ? " pause" : "")}><span className="strong">{pause ? "Natural pause" : "Quiet time"}</span>
                  <span className="t-meta">{(sig.active || cap.t === 0 ? 0 : sig.quiet).toFixed(1)} s of {PAUSE_S} s</span>
                  <div className="meter-bar"><i style={{ width: `${Math.min(100, ((sig.active ? 0 : sig.quiet) / 3) * 100)}%` }} /><s style={{ left: `${(PAUSE_S / 3) * 100}%` }} /></div></div>
              </div>
              <p className="t-sec">Signals come from keyboard and mouse activity, the vision model (scrolling, reading) and voice activity from Scribe v2 Realtime.</p>
            </div>
          </Card>
        </div>

        <div className="stack">
          <section className={"card agent" + (cap.off ? " hatch" : "")} aria-live="polite" aria-label="Apprentice">
            <div className="agent-state" style={cap.off ? { color: "var(--text)" } : null}><StateIcon size={16} aria-hidden /> {state[1]}</div>
            {cap.agent === "asking" && <p className="agent-line">“{cap.agentLine}”</p>}
            {cap.agent === "idle" && <p className="t-sec" style={{ marginTop: 8 }}>Play the demo session, or share your own screen.</p>}
            {cap.agent === "done" && <p className="agent-line">{cap.agentLine}</p>}
            {cap.agent === "off" && <p className="t-sec" style={{ marginTop: 8 }}>Nothing is heard, seen or stored until {EXPERT.first} goes back on the record. Only the time span is kept.</p>}
            {(cap.agent === "holding" || cap.agent === "waiting") && cap.queue[0] && <p className="t-sec" style={{ marginTop: 8 }}>Held: “{cap.queue[0].q}”</p>}
          </section>

          <Card title="Required for this session">
            <Req on={sel.asked >= 3}>At least 3 questions at natural pauses about something on screen ({Math.min(sel.asked, 3)} of 3)</Req>
            <Req on={sel.guardQs >= 1}>At least 1 question about a guardrail ({sel.guardQs})</Req>
            <Req on={cap.t > 0 && sel.interruptions === 0}>No interruptions while typing, reading or talking ({sel.interruptions})</Req>
            <Req on={sel.asked <= LIVE_BUDGET}>Live budget: {sel.asked} of {LIVE_BUDGET} questions per 10 min; the rest waits for the debrief</Req>
          </Card>

          <Card label="Session record">
            <div className="tabs" role="tablist" aria-label="Session record">
              {[["questions", `Questions (${cap.asked.length})`], ["events", `Screen events (${cap.events.length})`], ["transcript", "Transcript"]].map(([k, l]) =>
                <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>)}
            </div>
            {tab === "questions" && <Feed label="Questions" items={cap.asked} newestT={cap.t} emptyText={`No questions yet. The first comes after a decision appears on screen and ${EXPERT.first} pauses.`}
              render={(a, i, isNew) => (
                <div className="feed-item arrive" key={a.id}>
                  <TimeLink t={a.t} />
                  <div className="stack tight">
                    <div className="row">{a.type === "guardrail" ? <Badge tone="warning" icon={Hand}>Guardrail</Badge> : <Badge tone="agent" icon={MessageSquare}>Reason</Badge>}
                      <span className="t-sec">after {a.quiet.toFixed(1)} s of quiet</span>{isNew && <span className="new-tag badge">New</span>}</div>
                    <span className="strong">{a.q}</span>
                    <span className="t-sec">Triggered by: {a.eventText} at {fmt(a.eventT)}</span>
                    <button className="link" style={{ alignSelf: "flex-start" }} aria-expanded={open === a.id} onClick={() => setOpen(open === a.id ? null : a.id)}>{open === a.id ? "Hide reasoning" : "Why this question"}</button>
                    {open === a.id && <div className="inset stack x-tight t-sec">
                      <span>Chosen because it asks for a reason or a limit the screen can't show.</span>
                      {a.alts.map((x) => <span key={x.q}>Not asked: “{x.q}” ({x.drop || x.why})</span>)}</div>}
                    {a.answeredAt && <Quote id={a.id} />}
                  </div>
                </div>)} />}
            {tab === "questions" && (cap.deferred.length > 0 || cap.dropped.length > 0) && <div className="stack x-tight" style={{ paddingTop: 8, borderTop: "1px solid var(--line)" }}>
              {cap.deferred.map((d) => <p className="t-sec" key={d.q}><Badge tone="pending" icon={Clock}>Saved for debrief</Badge> {d.q}</p>)}
              {cap.dropped.map((d) => <p className="t-sec" key={d.q}><Badge>Dropped</Badge> {d.q} ({d.why})</p>)}
            </div>}
            {tab === "events" && <>
              <p className="row t-sec" style={{ marginBottom: 4 }}><Evidence level="reported" /> Events come from the vision model and aren't checked yet.</p>
              <Feed label="Screen events" items={mergeOff(cap)} newestT={cap.t} emptyText="Screen changes appear here, for example “consulting add-back changed: $1.2M → $0”."
                render={(e, i, isNew) => e.off
                  ? <div className="feed-item hatch" key={"o" + i}><TimeLink t={e.from} /><span>Off the record until {e.to != null ? fmt(e.to) : "now"}. Nothing in this span is stored.</span></div>
                  : <div className="feed-item arrive" key={i}><TimeLink t={e.t} /><span>{e.kind === "pii" && <Lock size={12} aria-hidden style={{ marginRight: 4 }} />}{e.text}{e.live && <> <Badge tone="agent">Live</Badge></>}{isNew && <> <span className="new-tag badge">New</span></>}</span></div>} />
            </>}
            {tab === "transcript" && <>
              <p className="row t-sec" style={{ marginBottom: 4 }}><Evidence level="recorded" /> Transcribed by Scribe v2 Realtime.</p>
              <Feed label="Transcript" items={cap.transcript} newestT={cap.t} emptyText="Nothing said yet."
                render={(l, i) => (
                  <div className={"feed-item arrive" + (l.who === "marker" ? " hatch" : "")} key={i}>
                    <TimeLink t={l.t} />
                    {l.who === "agent" ? <span><span className="strong" style={{ color: "var(--agent)" }}>Apprentice:</span> {l.text}</span>
                      : l.who === "marker" ? <span>{l.text}</span> : <Quote id={l.quote} />}
                  </div>)} />
            </>}
          </Card>
        </div>
      </div>
    </>
  );
}

function mergeOff(cap) {
  const segs = cap.offSegs.map((s) => ({ ...s, off: true, t: s.from }));
  return [...cap.events, ...segs].sort((a, b) => a.t - b.t);
}

/* Live mode: sample a frame every 2 s and ask a vision model what changed.
   Uses the Claude API available inside Claude artifacts. In your own app,
   call your backend, then push the events into the ElevenAgents conversation
   as contextual updates (client tools). */
function useFrameSampler(stream, videoRef, capRef, setCap) {
  useEffect(() => {
    if (!stream) return;
    const started = Date.now();
    let busy = false, summary = "No screen seen yet.";
    const canvas = document.createElement("canvas");
    const id = setInterval(async () => {
      const v = videoRef.current;
      if (busy || !v || !v.videoWidth || capRef.current.off) return;
      busy = true;
      try {
        const w = 960, h = Math.round((v.videoHeight / v.videoWidth) * w);
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(v, 0, 0, w, h);
        const data = canvas.toDataURL("image/jpeg", 0.6).split(",")[1];
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-6", max_tokens: 1000,
            messages: [{ role: "user", content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data } },
              { type: "text", text: `You watch a private equity analyst's screen. Previous state: ${summary}
Describe only what changed since then, as short events like "opened 3.2 Meridian MSA" or "model cell changed: consulting add-back $1.2M to $0".
Replace personal data (names, SSNs, salaries, emails, phone numbers, bank accounts) with [REDACTED].
Reply with JSON only, no markdown: {"summary":"one sentence of current state","events":[{"text":"...","field":"doc|addback|qoe|ebitda|arr|capex|irr|memo|other"}]}` },
            ] }],
          }),
        });
        const json = await res.json();
        const text = (json.content || []).map((b) => b.text || "").join("").replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(text);
        summary = parsed.summary || summary;
        const t = (Date.now() - started) / 1000;
        if (parsed.events?.length) setCap((c) => ({ ...c, events: [...c.events, ...parsed.events.map((e) => ({ t, kind: "screen", text: e.text, field: e.field, live: true }))] }));
      } catch (e) { /* keep sampling */ }
      busy = false;
    }, 2000);
    return () => clearInterval(id);
  }, [stream]); // eslint-disable-line
}

/* ============================= DEBRIEF ================================ */
function DebriefPage() {
  const { cap, setCap, gaps, setGaps, claims, setClaims, signed, setSigned, addQuote, ruleEvidence, claimText, ruleSources, go, voice, sel, announce } = useApp();
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState("");
  const [agentLine, setAgentLine] = useState("");
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const allGaps = sel.gapsAnswered === sel.gapsTotal;
  const ordered = [...RULES].sort((a, b) => a.step - b.step);
  const allClaims = sel.claimsResolved === sel.claimsTotal;
  const busy = GAPS.some((g) => gaps[g.id] === "asking");

  function ask(g) {
    if (busy) return;
    setGaps((x) => ({ ...x, [g.id]: "asking" }));
    setAgentLine(g.q); speakText(voice, g.q);
    timers.current.push(setTimeout(() => { setGaps((x) => ({ ...x, [g.id]: "answered" })); setAgentLine(""); announce(`${EXPERT.first} answered: step ${g.step}.`); }, 2200));
  }
  function askNext() { const g = GAPS.find((x) => !gaps[x.id]); if (g) ask(g); }
  function confirm(r) {
    let quote;
    if (r.draftWrong) { quote = "c_" + r.id; addQuote(quote, { de: "Ja, so mache ich das.", en: "Yes, that's how I do it.", where: "teach-back" }); }
    setClaims((c) => ({ ...c, [r.id]: { status: "confirmed", text: claimText(r.id), quote } }));
  }
  function applyCorrection(r) { setClaims((c) => ({ ...c, [r.id]: { status: "corrected", text: r.text, quote: r.correction } })); setEditing(null); }
  function saveCorrection(r) {
    if (!draft.trim()) return;
    const key = "c_" + r.id;
    addQuote(key, { de: null, en: draft.trim(), where: "teach-back correction" });
    setClaims((c) => ({ ...c, [r.id]: { status: "corrected", text: draft.trim(), quote: key } }));
    setEditing(null); setDraft("");
  }
  function signOff() { setSigned(true); announce(`Teach-back confirmed. ${sel.claimsTotal} rules are verified.`); }

  if (!cap.done) return (
    <>
      <PageHead title="Debrief: close the gaps, then explain it back" lede="The debrief starts when the captured task is finished."
        actions={<button className="btn capsule" onClick={() => setCap((c) => runToEnd(c))}>Use the recorded session</button>} />
      <Card title="Nothing to debrief yet">
        <div className="row"><p className="c2">The capture is {cap.t > 0 ? `still running at ${fmt(cap.t)}` : "empty"}. Finish it first, or use the recorded demo session.</p><span className="spacer" />
          <button className="btn" onClick={() => go("capture")}>Go to capture</button></div>
      </Card>
    </>
  );

  return (
    <>
      <PageHead title="Debrief: close the gaps, then explain it back"
        lede={`The apprentice asks only what it couldn't learn during the task, then explains the process back. Nothing becomes a rule until ${EXPERT.first} confirms or corrects it.`} />
      <div className="grid g-wide">
        <div className="stack">
          <section className="card agent" aria-live="polite" aria-label="Apprentice">
            <div className="agent-state">{busy ? <MessageSquare size={16} aria-hidden /> : <Bot size={16} aria-hidden />}
              {busy ? "Asking" : signed ? "Debrief complete" : allGaps ? "Ready to explain it back" : "Spoken debrief"}</div>
            {agentLine && <p className="agent-line">“{agentLine}”</p>}
          </section>

          <Card title="Open questions" extra={<span className="t-meta">{sel.gapsAnswered} of {sel.gapsTotal} answered</span>}>
            <p className="t-sec" style={{ marginBottom: 8 }}>Found by comparing screen events, transcript and live answers. None were answered during the task.</p>
            <ul>
              {GAPS.map((g) => {
                const st = gaps[g.id]; const step = STEPS.find((s) => s.n === g.step);
                return (
                  <li key={g.id} className="list-row stack tight">
                    <div className="row"><span className="t-sec">Step {g.step}: {step.title}</span><TimeLink t={step.t} /><span className="spacer" />
                      {st === "answered" ? <Evidence level="recorded" label="Answered" /> : st === "asking" ? <Badge tone="agent" icon={Mic}>Listening</Badge>
                        : <><Awaiting /><button className="btn compact" disabled={busy} onClick={() => ask(g)}>Ask</button></>}</div>
                    <p className="strong">{g.q}</p>
                    <p className="t-sec">Why it's open: {g.why}</p>
                    {st === "answered" && <Quote id={g.id} />}
                  </li>);
              })}
            </ul>
            {!allGaps && <button className="btn" style={{ marginTop: 8 }} disabled={busy} onClick={askNext}><Volume2 size={14} aria-hidden /> Ask the next question</button>}
          </Card>

          <Card title="The debrief is done when">
            <Req on={sel.gapsAnswered >= 3}>At least 3 follow-up questions that weren't answered during the task ({Math.min(sel.gapsAnswered, 3)} of 3)</Req>
            <Req on={allGaps}>Every open question has an answer</Req>
            <Req on={allClaims}>Every teach-back line is confirmed or corrected ({sel.claimsResolved} of {sel.claimsTotal})</Req>
            <Req on={signed}>{EXPERT.first} says: yes, that is how it works</Req>
          </Card>
        </div>

        <Card title="Teach-back" extra={<button className="btn compact" disabled={!allGaps} onClick={() => { setAgentLine("Let me explain it back. Stop me where I'm wrong."); speakText(voice, "Let me explain it back. Stop me where I'm wrong. " + ordered.map((r) => claimText(r.id)).join(" ")); }}><Volume2 size={13} aria-hidden /> Explain it back</button>}>
          {!allGaps ? (
            <p className="empty">The apprentice explains the process back once every open question is answered. Until then, everything it believes is proposed, not verified.</p>
          ) : (
            <div className="stack">
              <p className="t-sec">Here's how I understood it. Each line stays proposed until {EXPERT.first} confirms or corrects it.</p>
              {ordered.map((r) => {
                const c = claims[r.id]; const ev = ruleEvidence(r.id);
                const srcs = c ? ruleSources(r.id) : r.draftWrong ? [] : r.sources;
                return (
                  <div key={r.id} className={"claim " + (ev === "verified" ? "verified" : ev === "proposed" ? "proposed" : "")}>
                    <div className="row"><span className="t-sec">Step {r.step}</span><KindChip kind={r.kind} /><span className="spacer" /><Evidence level={ev} />{!c && <Awaiting />}</div>
                    <p className="txt">{claimText(r.id)}</p>
                    <p className="t-sec">{c ? (c.status === "corrected" ? `Corrected in ${EXPERT.first}'s words:` : "Based on:") : r.draftWrong ? r.basis : `Based on: ${r.basis.toLowerCase()}`}</p>
                    {srcs.map((q) => <Quote key={q} id={q} />)}
                    {!c && editing !== r.id && (
                      <div className="row">
                        <button className="btn compact" onClick={() => confirm(r)}><Check size={13} aria-hidden /> Confirm</button>
                        <button className="btn compact" onClick={() => { setEditing(r.id); setDraft(""); }}><PenLine size={13} aria-hidden /> Correct</button>
                      </div>)}
                    {editing === r.id && (
                      <div className="inset stack tight">
                        {r.correction && <button className="btn compact" style={{ alignSelf: "flex-start" }} onClick={() => applyCorrection(r)}><Mic size={13} aria-hidden /> Use {EXPERT.first}'s spoken correction</button>}
                        <label className="t-sec" htmlFor={"fix" + r.id}>Or type the correction in her words</label>
                        <textarea id={"fix" + r.id} className="input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="What actually happens" />
                        <div className="row"><button className="btn compact" disabled={!draft.trim()} onClick={() => saveCorrection(r)}>Save correction</button>
                          <button className="btn compact" onClick={() => setEditing(null)}>Cancel</button></div>
                      </div>)}
                  </div>);
              })}
              <div className="divider" />
              {signed ? (
                <div className="notice success inline"><ShieldCheck size={16} aria-hidden />
                  <div className="stack tight"><span>{EXPERT.first} confirmed the teach-back. {sel.verified} of {sel.claimsTotal} rules are verified.</span>
                    <button className="btn compact" style={{ alignSelf: "flex-start" }} onClick={() => go("map")}>Open the Work Map</button></div></div>
              ) : (
                <div className="stack tight">
                  <button className="btn capsule" disabled={!allClaims} onClick={signOff} style={{ alignSelf: "flex-start" }}>Confirm teach-back as {EXPERT.first}</button>
                  <p className="t-sec">{allClaims
                    ? `Marks ${sel.claimsTotal} rules as verified. The tutor and the agent export will use them; anything later struck from the record drops back out.`
                    : `Confirm or correct every line first (${sel.claimsTotal - sel.claimsResolved} left).`}</p>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function KindChip({ kind }) {
  if (kind === "guardrail") return <Badge tone="warning" icon={Hand}>Guardrail</Badge>;
  if (kind === "judgment") return <Badge icon={Flag}>Judgment call</Badge>;
  return <Badge>Step rule</Badge>;
}

/* ============================ WORK MAP ================================ */
function WorkMapPage() {
  const { signed, ruleEvidence, claimText, ruleSources, go, mapStep, setMapStep, sel } = useApp();
  const sel2 = STEPS.find((s) => s.n === mapStep) || STEPS[0];
  const stepVerified = (s) => s.rules.every((id) => ruleEvidence(id) === "verified");
  const guards = RULES.filter((r) => r.kind === "guardrail");
  const judg = STEPS.filter((s) => s.judgment);
  const jump = (t) => { let best = STEPS[0]; STEPS.forEach((s) => { if (s.t <= t) best = s; }); setMapStep(best.n); };
  const selRules = sel2.rules.map((id) => RULE[id]);
  const reasonRules = selRules.filter((r) => r.kind !== "guardrail");
  const guardRules = selRules.filter((r) => r.kind === "guardrail");
  const scr = screenAt(sel2.t);

  return (
    <>
      <PageHead title="Work Map: from data room to IC memo"
        lede={`${STEPS.length} steps, ${judg.length} judgment calls and ${guards.length} guardrails. Every step links to its moment on ${EXPERT.first}'s screen and to her own words.`}
        actions={<button className="btn capsule" onClick={() => go("teach")}>Teach this to {TRAINEE.first}</button>} />
      {!signed && <div className="notice pending" role="status"><Clock size={16} aria-hidden /><span>Draft: {sel.claimsTotal - sel.verified} of {sel.claimsTotal} rules aren't verified yet, and the tutor won't teach them. <button className="link" onClick={() => go("debrief")}>Finish the debrief</button></span></div>}

      <div className="stack">
        <Card title="Session timeline" extra={<div className="row t-sec"><span>Square: judgment call</span><span>Dashed: proposed</span><span>Solid: verified</span></div>}>
          <div className="track">
            <div className="track-line" />
            {[0, 60, 120, 180, END_T].map((t) => <span key={t} className="track-tick" style={{ left: `${(t / END_T) * 100}%` }}>{fmt(t)}</span>)}
            {STEPS.map((s) => (
              <button key={s.n} className={"track-m" + (stepVerified(s) ? " verified" : "") + (s.judgment ? " judg" : "")} aria-current={s.n === sel2.n ? "step" : undefined}
                style={{ left: `${(s.t / END_T) * 100}%` }} onClick={() => setMapStep(s.n)}
                aria-label={`Step ${s.n}: ${s.title}, ${fmt(s.t)}, ${stepVerified(s) ? "verified" : "proposed"}${s.judgment ? ", judgment call" : ""}`}>{s.n}</button>))}
          </div>
        </Card>

        <div className="grid g-map">
          <Card title="Steps">
            <ol className="steps">
              {STEPS.map((s) => {
                const g = s.rules.filter((id) => RULE[id].kind === "guardrail").length;
                return (
                  <li key={s.n}><button aria-current={s.n === sel2.n ? "step" : undefined} onClick={() => setMapStep(s.n)}>
                    <span className="strong c2">{s.n}</span>
                    <span><span className="s-title strong" style={{ display: "block" }}>{s.title}</span>
                      <span className="t-sec">{[g ? `${g} guardrail${g > 1 ? "s" : ""}` : "No guardrail", s.judgment ? "judgment call" : null].filter(Boolean).join(", ")}</span></span>
                    {stepVerified(s) ? <ShieldCheck size={16} aria-label="Verified" style={{ color: "var(--success)" }} /> : <PenLine size={16} aria-label="Proposed" style={{ color: "var(--agent)" }} />}
                  </button></li>);
              })}
            </ol>
          </Card>

          <Card label={`Step ${sel2.n} detail`}>
            <div className="stack">
              <div className="row"><h2 className="t-decision">Step {sel2.n} of {STEPS.length}: {sel2.title.toLowerCase()}</h2><span className="spacer" />
                {sel2.judgment && <Badge icon={Flag}>Judgment call</Badge>}<Evidence level={stepVerified(sel2) ? "verified" : "proposed"} /></div>
              <dl className="kv">
                <dt>Screen moment</dt>
                <dd><Replay key={sel2.n} t={sel2.t} field={sel2.field} label={`${fmt(sel2.t)}, ${scr.view === "index" ? "data room index" : scr.doc.name}`} /></dd>
                <dt>Decision</dt><dd className="strong">{sel2.decision}</dd>
                <dt>Reason</dt>
                <dd className="stack tight">
                  {reasonRules.map((r) => (
                    <div key={r.id} className={"claim " + (ruleEvidence(r.id) === "verified" ? "verified" : "proposed")}>
                      <div className="row"><KindChip kind={r.kind} /><span className="spacer" /><Evidence level={ruleEvidence(r.id)} /></div>
                      <p className="txt">{claimText(r.id)}</p>
                      {ruleSources(r.id).map((q) => <Quote key={q} id={q} onTime={jump} />)}
                    </div>))}
                  {reasonRules.length === 0 && <span className="t-sec">This step is driven by its guardrails.</span>}
                </dd>
                <dt>Guardrails</dt>
                <dd className="stack tight">
                  {guardRules.length === 0 && <span className="t-sec">No guardrail on this step.</span>}
                  {guardRules.map((r) => (
                    <div key={r.id} className="guard">
                      <div className="row"><Badge tone="warning" icon={Hand}>Stop point</Badge><TimeLink t={r.moment} onClick={jump} /><span className="spacer" /><Evidence level={ruleEvidence(r.id)} /></div>
                      <p className="txt strong">{claimText(r.id)}</p>
                      {ruleSources(r.id).map((q) => <Quote key={q} id={q} onTime={jump} />)}
                    </div>))}
                </dd>
              </dl>
              <div className="row">
                <button className="btn compact" disabled={sel2.n === 1} onClick={() => setMapStep(sel2.n - 1)}>Previous step</button>
                <button className="btn compact" disabled={sel2.n === STEPS.length} onClick={() => setMapStep(sel2.n + 1)}>Next step</button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

/* ============================== TEACH ================================= */
function TeachPage() {
  const { teach, setTeach, isVerified, sel, fillDemo, go, voice, settings, ruleSources, announce } = useApp();
  const [caseId, setCaseId] = useState(CASES[0].id);
  const [openReplay, setOpenReplay] = useState({});
  const c = CASES.find((x) => x.id === caseId);
  const form = teach.forms[caseId] || blankForm(caseId);
  const msgs = teach.msgs[caseId] || [];
  const pred = teach.preds[caseId];
  const saved = teach.saved[caseId];
  const watch = useRef(null);
  const msgBox = useRef(null);
  const docs = TEACH_DOCS[caseId];
  const openDoc = docs.find((d) => d.id === form.open && form.opened.includes(d.id));

  // Newest message starts at the top of the tutor panel (no movement under the reader).
  useEffect(() => { const b = msgBox.current, l = b?.lastElementChild; if (b && l) b.scrollTop = l.offsetTop - b.offsetTop; }, [msgs.length]);
  useEffect(() => () => clearTimeout(watch.current), []);
  useEffect(() => { if (!teach.msgs[caseId]) pushMsg({ who: "tutor", kind: "general", text: c.intro }); }, [caseId]); // eslint-disable-line

  function pushMsg(m) {
    setTeach((t) => ({ ...t, msgs: { ...t.msgs, [caseId]: [...(t.msgs[caseId] || []), { ...m, id: Math.random().toString(36).slice(2) }] } }));
    if (m.who === "tutor") speakText(voice, m.say || m.text);
  }
  function log(entry) { setTeach((t) => ({ ...t, log: [...t.log, { ...entry, caseId, at: Date.now() }] })); }
  function setForm(patch) { setTeach((t) => ({ ...t, forms: { ...t.forms, [caseId]: { ...(t.forms[caseId] || blankForm(caseId)), ...patch } } })); }
  function open(id) { setForm({ open: id, opened: form.opened.includes(id) ? form.opened : [...form.opened, id] }); }
  function reset() { setTeach((t) => ({ ...t, forms: { ...t.forms, [caseId]: blankForm(caseId) }, saved: { ...t.saved, [caseId]: null }, msgs: { ...t.msgs, [caseId]: undefined }, preds: { ...t.preds, [caseId]: undefined } })); }

  function change(field, value) {
    const next = { ...form, [field]: value, result: null };
    setForm({ [field]: value, result: null });
    clearTimeout(watch.current);
    if (caseId !== "lbo" || field !== "capex" || saved) return;
    watch.current = setTimeout(() => {
      const v = evaluate(caseId, next, isVerified).filter((x) => x.ink);
      if (v.length) stop(v, "before you save");
    }, 1400);
  }

  function stop(vsIn, when) {
    const order = ["R4", "R8", "R7", "R6", "R9"];
    const vs = [...vsIn].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    const labels = [...new Set(vs.map((v) => FLAG_LABEL[v.id]))];
    const asks = [...new Set(vs.map((v) => ASK[v.id]))];
    const text = `Wait. ${EXPERT.first} would flag ${labels.join(" and ")}.`;
    pushMsg({ who: "tutor", tone: "stop", kind: "grounded", text, asks, details: vs.map((v) => v.msg), rules: [...new Set(vs.map((v) => v.id))], say: `${text} ${asks.join(" ")}` });
    vs.forEach((v) => log({ kind: "caught", rule: v.id, when }));
    announce(`Tutor stepped in: ${text}`);
  }

  function finish(text) {
    const caught = teach.log.filter((l) => l.caseId === caseId && l.kind === "caught").length;
    setTeach((t) => ({ ...t, saved: { ...t.saved, [caseId]: { caught } } }));
    pushMsg({ who: "tutor", tone: "good", kind: "grounded", text: caught ? `${text} We caught ${caught === 1 ? "1 input" : caught + " inputs"} before they reached the model.` : `${text} That's how ${EXPERT.first} would do it, and you did it on your own.` });
  }

  function save() {
    clearTimeout(watch.current);
    if (caseId === "rev" && !form.arr.trim()) { pushMsg({ who: "system", kind: "exact", text: "Crestline's ARR is empty. Enter it before saving." }); return; }
    const v = evaluate(caseId, form, isVerified);
    const blocking = v.filter((x) => x.ink);
    v.filter((x) => !x.ink).forEach((x) => pushMsg({ who: "tutor", kind: "general", text: `I'm not sure about this part. ${EXPERT.first} hasn't verified the rule, so I won't block you. Ask the deal team.` }));
    if (blocking.length) {
      setForm({ result: { ok: false, text: caseId === "memo" ? "Not queued. The tutor held the memo." : "Not saved. The tutor stopped this before the debt schedule ran." } });
      stop(blocking, "on save");
      return;
    }
    if (caseId === "rev") { setForm({ result: { ok: true, text: "Saved. Debt schedule running on adjusted EBITDA of $31.2M." } }); finish("Saved. Crestline is in at $110,000 ARR and the $4.0M relocation add-back is flagged for QoE."); announce("Inputs saved."); }
    if (caseId === "lbo") { setForm({ result: { ok: true, text: `IRR calculated: ${irrAt(form.capex)} over 5 years.` } }); finish(`The IRR runs on ${form.capex}% maintenance capex${form.escalated ? ", with the escalation queued" : ""}.`); announce("IRR calculated."); }
    if (caseId === "memo") { setForm({ result: { ok: true, text: "Queued for the partners · simulated. Nothing leaves this demo." } }); finish("Queued. Every flag from this deal is in Key Risks with its dollar impact."); announce("Memo queued for the partners, simulated."); }
  }

  function escalate() {
    if (num(form.capex) < 3.0) {
      setForm({ escalated: true, result: { ok: true, text: "Escalation queued for the deal team · simulated." } });
      pushMsg({ who: "tutor", tone: "good", kind: "grounded", text: `Good. That's what ${EXPERT.first} does when management's capex is below history and nothing explains it. Run the model now; the escalation travels with it.`, rules: ["R6"] });
    } else pushMsg({ who: "tutor", kind: "exact", text: `Your input of ${form.capex}% already matches the 4.0% history, so there's nothing to escalate.` });
  }

  function predict(opt) {
    const correct = opt === c.predict.answer;
    setTeach((t) => ({ ...t, preds: { ...t.preds, [caseId]: { opt, correct } } }));
    pushMsg({ who: "me", text: opt });
    pushMsg({ who: "tutor", tone: correct ? "good" : null, kind: "grounded", text: correct ? `Yes. Here's how ${EXPERT.first} put it:` : `${EXPERT.first} would go with “${c.predict.answer}”. Here's her reason:`, rules: [c.predict.rule] });
  }

  if (sel.verified === 0) return (
    <>
      <PageHead title="Teach: coach the next analyst" lede={`The tutor only teaches rules ${EXPERT.first} verified. None are verified yet.`}
        actions={<button className="btn capsule" onClick={fillDemo}>Load finished session</button>} />
      <Card title="Nothing to teach yet">
        <div className="row"><p className="c2">Finish the debrief and teach-back first, or load the finished demo session.</p><span className="spacer" />
          <button className="btn" onClick={() => go("debrief")}>Go to the debrief</button></div>
      </Card>
    </>
  );

  const locked = !!saved;
  const adj = form.addback === "accept" ? "$35.2M" : "$31.2M";
  const debt = form.addback === "accept" ? "$193.6M" : "$171.6M";
  const consequence = caseId === "rev"
    ? `Saves Crestline ARR ${form.arr.trim() ? usd(num(form.arr)) : "(empty)"}, adjusted EBITDA ${adj} and debt capacity ${debt} at 5.5×, then runs the debt schedule.`
    : caseId === "lbo" ? `Runs the debt schedule and 5-year IRR at ${form.capex || "?"}% maintenance capex (projected IRR ${irrAt(form.capex)}).`
    : `Queues the memo for the partners with ${Object.values(form.inc).filter(Boolean).length} Key Risks. Simulated: nothing leaves this demo.`;

  return (
    <>
      <PageHead title={`Teach: ${TRAINEE.first} works a deal ${EXPERT.first} never saw`}
        lede={`${TEACH_DEAL.code} is ${TEACH_DEAL.target}. The tutor watches ${TRAINEE.first}'s screen, asks her to predict ${EXPERT.first}'s call, and stops a bad input before it reaches the debt schedule or the IC memo.`}
        actions={<button className="btn" onClick={() => go("results")}>See {TRAINEE.first}'s results</button>} />
      <div className="row" style={{ padding: "0 12px 12px" }}>
        <div className="seg" role="tablist" aria-label="Deal stages">
          {CASES.map((x) => <button key={x.id} role="tab" aria-selected={x.id === caseId} onClick={() => setCaseId(x.id)}>
            {teach.saved[x.id] && <Check size={12} aria-label="done" style={{ marginRight: 4 }} />}{x.label}</button>)}
        </div>
        <span className="t-sec">Tutor speaks English. {EXPERT.first}'s words are translated from German{settings.quoteLang === "de" ? "; showing originals" : ""}.</span>
      </div>

      <div className="grid g-main">
        <Card title={`${TRAINEE.first}'s screen`} extra={<span className="t-sec">{c.stage}</span>}>
          <div className="stack">
            <div className="scr">
              <div className="scr-bar"><span>{TEACH_DEAL.code} data room</span><span>{caseId === "memo" ? "IC memo draft v3.docx" : "LBO model v3.xlsx"}, {TRAINEE.name}</span></div>
              {caseId === "memo" ? (
                <div className="scr-body">
                  <div className="scr-title">{TEACH_DEAL.code}: Investment Committee memo</div>
                  <div className="memo-sec"><h4>1. Deal thesis</h4><p>Practice management software for 2,400 dental clinics. 92% gross retention, pricing headroom and a fragmented add-on market.</p></div>
                  <div className="memo-sec"><h4>2. Key financials (diligenced)</h4><p>Adjusted EBITDA $31.2M after removing the disputed relocation add-back. Entry at 11.0×. Sponsor IRR {irrAt(teach.forms.lbo?.capex ?? "4.0")} over 5 years at the modeled capex.</p></div>
                  <div className="memo-sec"><h4>3. Key risks</h4>
                    {RISKS.map((r) => (
                      <label key={r.id} className="risk">
                        <input type="checkbox" checked={!!form.inc[r.id]} disabled={locked} onChange={() => setForm({ inc: { ...form.inc, [r.id]: !form.inc[r.id] }, result: null })} />
                        <span>{r.text}{r.required && <span style={{ display: "block", color: "var(--scr-text-2)" }}>Flagged during model inputs</span>}</span>
                      </label>))}
                  </div>
                  <div className="scr-actions">
                    <button className="btn capsule" disabled={locked} onClick={save}>Queue memo for the partners</button>
                    {saved && <button className="btn" onClick={reset}>Try again</button>}
                  </div>
                  <p className="t-sec" style={{ marginTop: 6 }}>{consequence}</p>
                  {form.result && <div className={"scr-msg " + (form.result.ok ? "good" : "bad")} role="status">{form.result.text}</div>}
                </div>
              ) : (
                <div className="wb">
                  <div className="wb-doc">
                    <div className="wb-h"><span>Data room</span><span>{form.opened.length} of {docs.length} opened</span></div>
                    <div className="doclist">
                      {docs.map((d) => <button key={d.id} aria-pressed={!!openDoc && openDoc.id === d.id} onClick={() => open(d.id)}>
                        <span>{d.name}</span>{form.opened.includes(d.id) && <span className="chg-tag" style={{ color: "var(--scr-text-2)" }}>Opened</span>}</button>)}
                    </div>
                    {openDoc ? <><div className="doc-name">{openDoc.name}</div>{openDoc.lines.map(([l, hl], i) => <div key={i} className={"doc-line" + (hl ? " hl" : "")}>{l}</div>)}</>
                      : <p style={{ color: "var(--scr-text-2)" }}>Open a file to read it.</p>}
                  </div>
                  <div className="wb-model">
                    <div className="wb-h"><span>Model inputs: {c.label}</span></div>
                    {caseId === "rev" ? <>
                      <div className="mrow"><label htmlFor="arr">ARR: Crestline Health ($)</label>
                        <input id="arr" inputMode="numeric" value={form.arr} disabled={locked} placeholder="$0" onChange={(e) => change("arr", e.target.value)} /></div>
                      <div className="mrow"><label htmlFor="ab">Add-back: relocation, one-time</label>
                        <select id="ab" value={form.addback} disabled={locked} onChange={(e) => change("addback", e.target.value)}>
                          <option value="accept">Accept $4.0M</option><option value="flag">Flag for QoE review</option></select>
                        <span className="sub">From management's bridge</span></div>
                      <div className="mrow"><span>Adjusted EBITDA</span><span className="v">{adj}</span></div>
                      <div className="mrow"><span>Debt capacity at 5.5×</span><span className="v">{debt}</span></div>
                    </> : <>
                      <div className="mrow"><span>Adjusted EBITDA</span><span className="v">$31.2M</span></div>
                      <div className="mrow"><label htmlFor="cx">Maintenance capex (% of revenue)</label>
                        <input id="cx" inputMode="decimal" value={form.capex} disabled={locked} onChange={(e) => change("capex", e.target.value)} />
                        <span className="sub">{form.capex === "1.6" ? "Prefilled from the management case" : "Edited by you"}{form.escalated ? ". Escalation queued · simulated" : ""}</span></div>
                      <div className="mrow"><span>Sponsor IRR, 5 years</span><span className="v">{locked ? irrAt(form.capex) : "Not run yet"}</span></div>
                    </>}
                    <div className="scr-actions">
                      <button className="btn capsule" disabled={locked} onClick={save}>{caseId === "rev" ? "Save inputs and run debt schedule" : "Run debt schedule and IRR"}</button>
                      {caseId === "lbo" && <button className="btn" disabled={locked || form.escalated} onClick={escalate}>Escalate capex assumption</button>}
                      {saved && <button className="btn" onClick={reset}>Try again</button>}
                    </div>
                    <p className="t-sec" style={{ marginTop: 6 }}>{consequence}</p>
                    {form.result && <div className={"scr-msg " + (form.result.ok ? "good" : "bad")} role="status">{form.result.text}</div>}
                  </div>
                </div>
              )}
            </div>
            <p className="t-sec">{caseId === "memo" ? "Controlled demo, so the tutor can hold the memo. In Word, the same check runs in an add-in before the memo is shared." : "Controlled demo workbench, so the tutor can hold the save. In the firm's Excel model, the same check runs in an add-in before the debt schedule refreshes."}</p>
          </div>
        </Card>

        <div className="stack" aria-label="Tutor">
          {!pred && !saved && (
            <section className="card agent" aria-label={`Predict ${EXPERT.first}'s call`}>
              <div className="agent-state"><MessageSquare size={16} aria-hidden /> Predict {EXPERT.first}'s call</div>
              <p className="agent-line">{c.predict.q}</p>
              <div className="row" style={{ marginTop: 12 }}>{c.predict.options.map((o) => <button key={o} className="btn compact" onClick={() => predict(o)}>{o}</button>)}</div>
            </section>)}
          <div className="msgs" ref={msgBox} aria-live="polite">
            {msgs.map((m) => (
              <div key={m.id} className={"msg arrive" + (m.tone ? " " + m.tone : "") + (m.who === "me" ? " me" : "")}>
                {m.who !== "me" && <div className="msg-h">
                  {m.tone === "stop" ? <span className="row" style={{ color: "var(--warning)" }}><Hand size={15} aria-hidden /> Tutor stepped in</span>
                    : m.who === "system" ? <span className="row"><FileText size={14} aria-hidden /> Model</span> : <span className="row" style={{ color: "var(--agent)" }}><Bot size={14} aria-hidden /> Tutor</span>}
                  <span className="spacer" />{m.kind && <AnswerType kind={m.kind} />}</div>}
                <p>{m.text}</p>
                {m.asks && m.asks.map((a) => <p key={a} className="strong">{a}</p>)}
                {m.details && <div className="stack x-tight">{m.details.map((d) => <p key={d} className="t-sec">{d}</p>)}</div>}
                {m.rules && m.rules.map((rid) => (
                  <div key={rid} className="stack tight">
                    {m.tone === "stop" && <span className="t-sec"><span className="strong" style={{ color: "var(--text)" }}>{EXPERT.first}'s rule:</span> {RULE[rid].text}</span>}
                    {ruleSources(rid).map((q) => <Quote key={q} id={q} />)}
                    {m.tone === "stop" && <>
                      <button className="btn compact" style={{ alignSelf: "flex-start" }} aria-expanded={!!openReplay[m.id + rid]} onClick={() => setOpenReplay((o) => ({ ...o, [m.id + rid]: !o[m.id + rid] }))}>
                        <Play size={13} aria-hidden /> {openReplay[m.id + rid] ? "Hide" : "Replay"} {EXPERT.first}'s moment</button>
                      {openReplay[m.id + rid] && <Replay t={RULE[rid].moment} field={STEPS.find((s) => s.n === RULE[rid].step).field} label={`${EXPERT.first}, ${DEAL.code}`} />}
                    </>}
                  </div>))}
              </div>))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ============================= RESULTS ================================ */
function ResultsPage() {
  const { teach, ruleEvidence, claimText, go, sel } = useApp();
  const handled = CASES.filter((c) => teach.saved[c.id]);
  const caught = teach.log.filter((l) => l.kind === "caught");
  const tested = new Set(handled.flatMap((c) => CASE_RULES[c.id]));
  const needed = new Set(caught.map((l) => l.rule));
  const rows = RULES.filter((r) => ruleEvidence(r.id) === "verified").map((r) => ({
    r, st: needed.has(r.id) ? "practice" : tested.has(r.id) ? "mastered" : "untested", n: caught.filter((l) => l.rule === r.id).length,
  }));
  const practice = [...rows.filter((x) => x.st === "practice"), ...rows.filter((x) => x.st === "untested")].slice(0, 4);
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  return (
    <>
      <PageHead title={`${TRAINEE.first}'s results`}
        lede={`What ${TRAINEE.first} can do on her own, where the tutor stepped in, and what to practice next. Only verified rules are scored.`}
        actions={<button className="btn capsule" onClick={() => go("teach")}>Back to coaching</button>} />
      {sel.handled === 0 && <div className="notice pending" role="status"><Clock size={16} aria-hidden /><span>No deal stages finished yet.</span></div>}
      <div className="stack">
        <div className="grid g3">
          <Card label="Stages handled"><p className="t-sec">{TEACH_DEAL.code} stages handled</p><p className="metric">{sel.handled} of {sel.casesTotal}</p>
            <div className="bar" style={{ marginTop: 8 }}><i style={{ width: pct(sel.handled, sel.casesTotal) + "%" }} /></div>
            <p className="t-meta" style={{ marginTop: 8 }}>{sel.own} without help from the tutor</p></Card>
          <Card label="Inputs caught"><p className="t-sec">Wrong inputs caught before saving</p><p className="metric">{sel.caught} {sel.caught === 1 ? "input" : "inputs"}</p>
            <p className="t-meta" style={{ marginTop: 8 }}>{caught.filter((l) => l.when === "before you save").length} while typing, {caught.filter((l) => l.when === "on save").length} at the save button</p></Card>
          <Card label="Predictions"><p className="t-sec">Predicted {EXPERT.first}'s call</p><p className="metric">{sel.predsRight} of {sel.predsTotal}</p>
            <div className="bar" style={{ marginTop: 8 }}><i style={{ width: pct(sel.predsRight, sel.predsTotal) + "%" }} /></div></Card>
        </div>
        <div className="grid g-wide">
          <Card title="Rule by rule">
            <table className="tbl">
              <thead><tr><th>Verified rule</th><th style={{ width: 140 }}>Status</th></tr></thead>
              <tbody>{rows.map(({ r, st, n }) => (
                <tr key={r.id}>
                  <td data-label="Rule"><div className="row" style={{ marginBottom: 4 }}><KindChip kind={r.kind} /><span className="t-sec">Step {r.step}</span></div>{claimText(r.id)}</td>
                  <td data-label="Status">{st === "mastered" ? <Badge tone="success" icon={Check}>Mastered</Badge> : st === "practice" ? <Badge tone="warning" icon={AlertTriangle}>Practice ({n} caught)</Badge> : <Badge>Not tested</Badge>}</td>
                </tr>))}
              </tbody>
            </table>
            {rows.length === 0 && <p className="empty">No verified rules yet.</p>}
          </Card>
          <Card title="Practice next">
            {practice.length === 0 && <p className="empty">Nothing left to practice from the verified rules.</p>}
            <ul>{practice.map(({ r }) => (
              <li key={r.id} className="list-row stack x-tight">
                <span className="strong">{PRACTICE[r.id]}</span>
                <span className="t-sec">Builds on: {claimText(r.id)}</span>
              </li>))}</ul>
          </Card>
        </div>
      </div>
    </>
  );
}

/* ========================= COMPARE (stretch) ========================== */
const COMPARE = [
  { n: 1, s: "Spread files by latest version date", t: "Spread files folder by folder", diff: true,
    toS: `${EXPERT2.first} works the bankers' folders in order. What does that miss?`, aS: "sb1",
    toT: `${EXPERT.first} sorts the data room by latest version date. Why go folder by folder?`, aT: "th1" },
  { n: 2, s: "Opened the GL detail before the bridge", t: "Opened the GL detail before the bridge" },
  { n: 3, s: "Cut the $1.2M consulting add-back to $0", t: "Cut the $1.2M consulting add-back to $0" },
  { n: 4, s: "Flagged the consulting line for QoE", t: "Flagged the consulting line for QoE" },
  { n: 5, s: "Meridian ARR at $260,000", t: "Meridian ARR at $260,000" },
  { n: 6, s: "Modeled 4.1% historical capex and escalated", t: "Kept management's 1.5% capex", diff: true,
    toS: `${EXPERT2.first} kept 1.5% because the new trucks are under warranty. Does a warranty change your view?`, aS: "sb2",
    toT: `${EXPERT.first} replaced management's 1.5% capex with the 4.1% history. Why did you keep 1.5%?`, aT: "th2" },
  { n: 7, s: "3 items in Key Risks", t: "2 items in Key Risks", diff: true, toS: null, toT: null },
];

function ComparePage() {
  const [asked, setAsked] = useState({});
  const [res, setRes] = useState({});
  const diffs = COMPARE.filter((r) => r.diff && r.toS);
  return (
    <>
      <PageHead title="Two experts, one task"
        lede={`${EXPERT2.name} (${EXPERT2.role.toLowerCase()}) worked the same ${DEAL.code} data room. The apprentice lines up both sessions step by step and asks each expert about the places they differ.`} />
      <div className="stack">
        <Card title="Step by step">
          <table className="tbl">
            <thead><tr><th style={{ width: 56 }}>Step</th><th>{EXPERT.first}</th><th>{EXPERT2.first}</th><th style={{ width: 200 }}>Match</th></tr></thead>
            <tbody>{COMPARE.map((r) => (
              <tr key={r.n} className={r.diff ? "diff" : ""}>
                <td data-label="Step" className="strong">{r.n}</td>
                <td data-label={EXPERT.first} className="fold">{r.s}</td>
                <td data-label={EXPERT2.first} className="fold">{r.t}</td>
                <td data-label="Match">{r.diff ? <Badge tone="pending" icon={Clock}>Different</Badge> : <Evidence level="external" label="Second expert agrees" />}</td>
              </tr>))}
            </tbody>
          </table>
        </Card>
        {diffs.map((r) => (
          <Card key={r.n} title={`Step ${r.n}: ${STEPS[r.n - 1].title.toLowerCase()}`}
            extra={!asked[r.n] ? <button className="btn compact" onClick={() => setAsked((a) => ({ ...a, [r.n]: true }))}><Volume2 size={13} aria-hidden /> Ask both experts</button>
              : res[r.n] ? <Badge icon={Check}>Decided</Badge> : <Awaiting>Awaiting a decision</Awaiting>}>
            {asked[r.n] ? (
              <div className="stack">
                <div className="grid g2">
                  <div className="stack tight"><span className="t-cap">Asked {EXPERT.first}</span><span className="strong">{r.toS}</span><Quote id={r.aS} /></div>
                  <div className="stack tight"><span className="t-cap">Asked {EXPERT2.first}</span><span className="strong">{r.toT}</span><Quote id={r.aT} /></div>
                </div>
                <div className="row">
                  <span className="t-sec">How should the Work Map read?</span>
                  <div className="seg" role="radiogroup" aria-label={`Resolution for step ${r.n}`}>
                    {[`Keep ${EXPERT.first}'s way`, "Keep both as valid", "Ask the deal team"].map((o) => (
                      <button key={o} role="radio" aria-checked={res[r.n] === o} onClick={() => setRes((x) => ({ ...x, [r.n]: o }))}>{o}</button>))}
                  </div>
                </div>
                {res[r.n] && <p className="t-sec">Recorded: {res[r.n]}. Both experts review this before it goes into the map.</p>}
              </div>
            ) : <p className="t-sec">Ask both experts why they differ. Their answers are recorded in their own words.</p>}
          </Card>))}
      </div>
    </>
  );
}

/* ======================= AGENT EXPORT (stretch) ======================= */
const STOP_TO = { R7: "Request the source from the bankers and mark the number unverified", R8: "Send to QoE review with the invoices", R3: "Send to the QoE team with the invoices attached", R5: "Send to legal" };

function buildExport(isVerified, claimText, ruleSources, quotes) {
  const ok = RULES.filter((r) => isVerified(r.id));
  const excluded = RULES.filter((r) => !isVerified(r.id)).map((r) => r.id);
  const json = {
    workflow: "LBO model inputs: from data room to IC memo", expert: EXPERT.name, evidence_level_included: "verified",
    note: "Only verified rules are included. Never act on anything not listed here.",
    steps: STEPS.map((s) => ({
      step: s.n, title: s.title,
      rules: s.rules.filter((id) => isVerified(id) && RULE[id].kind !== "guardrail").map((id) => ({ id, rule: claimText(id) })),
      guardrails: s.rules.filter((id) => isVerified(id) && RULE[id].kind === "guardrail").map((id) => ({ id, when: claimText(id), action: "HALT_DATA_ENTRY", escalate_to: STOP_TO[id] })),
      evidence: { screen_moment: fmt(s.t), expert_words: s.rules.filter(isVerified).flatMap((id) => ruleSources(id).map((q) => quotes[q]?.en)).filter(Boolean) },
    })),
    excluded_not_verified: excluded,
  };
  const md = [
    "# Agent instructions: LBO model inputs, from data room to IC memo",
    `Learned from ${EXPERT.name}. Follow the steps in order. When a guardrail applies, halt data entry and escalate the line item to a person. Never hardcode a management-adjusted number on the strength of anything not listed here.`,
    "",
    ...STEPS.flatMap((s) => {
      const rs = s.rules.filter((id) => isVerified(id));
      if (!rs.length) return [`## ${s.n}. ${s.title}`, "- Not verified yet. Hand this step to a person.", ""];
      return [`## ${s.n}. ${s.title}`, ...rs.map((id) => RULE[id].kind === "guardrail" ? `- HALT: ${claimText(id)} Escalation: ${STOP_TO[id]}.` : `- ${claimText(id)}`), ""];
    }),
    excluded.length ? `Left out because they aren't verified: ${excluded.join(", ")}.` : "",
  ].join("\n");
  return { json: JSON.stringify(json, null, 2), md, okN: ok.length, excluded };
}

function ExportPage() {
  const { isVerified, claimText, ruleSources, quotes, go, announce } = useApp();
  const [fmtSel, setFmt] = useState("md");
  const out = buildExport(isVerified, claimText, ruleSources, quotes);
  const text = fmtSel === "md" ? out.md : out.json;
  async function copy() { try { await navigator.clipboard.writeText(text); announce("Copied to the clipboard."); } catch { announce("Copy is blocked here. Select the text and copy it."); } }
  function download() {
    const blob = new Blob([text], { type: fmtSel === "md" ? "text/markdown" : "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = fmtSel === "md" ? "work-map-agent-instructions.md" : "work-map.json"; a.click();
    announce("Download started.");
  }
  return (
    <>
      <PageHead title="Export guardrails for an agent"
        lede={`Turn the Work Map into instructions an agent can load. It follows the same steps and halts exactly where ${EXPERT.first} would. Load it into the tutor's knowledge base and Procedures, or into any agent that takes routine steps.`}
        actions={<button className="btn capsule" onClick={download}><Download size={15} aria-hidden /> Download {fmtSel === "md" ? ".md" : ".json"}</button>} />
      {out.excluded.length > 0 && <div className="notice pending" role="status"><Clock size={16} aria-hidden /><span>{out.excluded.length} of {RULES.length} rules aren't verified and are left out. <button className="link" onClick={() => go("debrief")}>Verify them in the debrief</button></span></div>}
      <Card label="Export" title={`${out.okN} verified rules`} extra={
        <div className="row">
          <div className="seg" role="radiogroup" aria-label="Format">
            <button role="radio" aria-checked={fmtSel === "md"} onClick={() => setFmt("md")}>Agent instructions</button>
            <button role="radio" aria-checked={fmtSel === "json"} onClick={() => setFmt("json")}>Work Map JSON</button>
          </div>
          <button className="btn" onClick={copy}><Copy size={14} aria-hidden /> Copy</button>
        </div>}>
        <pre tabIndex={0} aria-label="Export preview" className="inset" style={{ margin: 0, maxHeight: 520, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace", fontSize: 12, lineHeight: "18px", color: "var(--text)" }}>{text}</pre>
      </Card>
    </>
  );
}

/* ========================= TRUST AND PRIVACY ========================== */
const ENTITIES = [
  ["PERSON", "Names of people"], ["US_SSN", "Social Security numbers"], ["COMPENSATION", "Salaries and bonuses (employee census)"],
  ["EMAIL_ADDRESS", "Email addresses"], ["PHONE_NUMBER", "Phone numbers"], ["US_BANK_NUMBER", "Bank account numbers"],
];

function TrustPage() {
  const { cap, settings, setSettings, struck, setStruck, ruleSources, quotes, askReset } = useApp();
  const used = [...new Set(RULES.flatMap((r) => ruleSources(r.id)).concat(cap.asked.map((a) => a.id)))].filter((q) => quotes[q]);
  const setR = (k) => setSettings((s) => ({ ...s, redact: { ...s.redact, [k]: !s.redact[k] } }));
  const sample = "Census row 214: Maria Gonzalez, SSN 412-55-0193, base salary $142,000, maria.gonzalez@atlasfleet.com, (312) 555-0147.";
  let red = sample;
  const R = settings.redact;
  if (R.PERSON) red = red.replace("Maria Gonzalez", "[PERSON]");
  if (R.US_SSN) red = red.replace("412-55-0193", "[SSN]");
  if (R.COMPENSATION) red = red.replace("$142,000", "[SALARY]");
  if (R.EMAIL_ADDRESS) red = red.replace("maria.gonzalez@atlasfleet.com", "[EMAIL]");
  if (R.PHONE_NUMBER) red = red.replace("(312) 555-0147", "[PHONE]");
  return (
    <>
      <PageHead title="Trust and privacy"
        lede={`${EXPERT.first} decides what's kept. She can go off the record at any time, strike her own words afterwards, and personal data from the data room is redacted before a frame leaves the browser. Settings on this page apply immediately.`} />
      <div className="grid g2" style={{ alignItems: "start" }}>
        <div className="stack">
          <Card title="Off the record">
            <p className="t-sec" style={{ marginBottom: 8 }}>Say “off the record”, or press the button on the capture page. Until she goes back on, no audio, frames or events are stored. Only the time span is kept, so the Work Map shows a gap rather than a silent edit.</p>
            {cap.offSegs.length === 0 && <p className="empty">No off-record segments in this session yet.</p>}
            <ul>{cap.offSegs.map((s, i) => (
              <li key={i} className="feed-item hatch" style={{ borderRadius: 8, padding: 8 }}><TimeLink t={s.from} /><span>Until {s.to != null ? fmt(s.to) : "now"}, started by {s.how}. Nothing stored.</span></li>))}</ul>
            {cap.suppressed > 0 && <p className="t-meta" style={{ marginTop: 8 }}>{cap.suppressed} screen {cap.suppressed === 1 ? "event was" : "events were"} dropped instead of stored.</p>}
          </Card>
          <Card title="Strike words from the record">
            <p className="t-sec" style={{ marginBottom: 8 }}>A struck quote disappears everywhere. A rule that relied only on it drops from verified to approved-without-source, and the tutor stops teaching it.</p>
            {used.length === 0 && <p className="empty">No recorded answers yet.</p>}
            {used.map((q) => (
              <div className="setting" key={q}>
                <span style={{ textDecoration: struck[q] ? "line-through" : "none", color: struck[q] ? "var(--text-2)" : "var(--text)" }}>“{quotes[q].en}”</span>
                <button className="btn compact" aria-pressed={!!struck[q]} onClick={() => setStruck((s) => ({ ...s, [q]: !s[q] }))}>{struck[q] ? "Restore" : "Strike"}</button>
              </div>))}
          </Card>
        </div>
        <div className="stack">
          <Card title="Personal data on screen">
            <p className="t-sec" style={{ marginBottom: 4 }}>Detected with Microsoft Presidio, plus a custom recognizer for compensation, on every frame and transcript line, before anything goes to a model.</p>
            {ENTITIES.map(([k, l]) => (
              <div className="setting" key={k}><span id={"lbl-" + k}>{l}</span>
                <button className="switch" role="switch" aria-checked={!!R[k]} aria-labelledby={"lbl-" + k} onClick={() => setR(k)} /></div>))}
            <div className="stack tight" style={{ marginTop: 12 }}>
              <span className="t-cap">Transcript line, as stored</span>
              <p className="inset">{red}</p>
              <span className="t-cap">Frame, as the vision model sees it</span>
              <Screen t={135} redact={R} />
            </div>
          </Card>
          <Card title="Appearance and language">
            <div className="setting"><span id="lbl-theme">Appearance</span>
              <div className="seg" role="radiogroup" aria-labelledby="lbl-theme">
                {[["system", "Match system"], ["light", "Light"], ["dark", "Dark"]].map(([v, l]) => <button key={v} role="radio" aria-checked={settings.theme === v} onClick={() => setSettings((s) => ({ ...s, theme: v }))}>{l}</button>)}
              </div></div>
            <p className="t-sec">Increased contrast follows your system setting.</p>
            <div className="setting"><label htmlFor="el">{EXPERT.first} speaks</label><select id="el" className="input" value={settings.expertLang} onChange={(e) => setSettings((s) => ({ ...s, expertLang: e.target.value }))}><option>German</option><option>English</option></select></div>
            <div className="setting"><label htmlFor="tl">Tutor speaks to {TRAINEE.first}</label><select id="tl" className="input" value={settings.tutorLang} onChange={(e) => setSettings((s) => ({ ...s, tutorLang: e.target.value }))}><option>English</option><option>German</option></select></div>
            <div className="setting"><span id="lbl-ql">Show {EXPERT.first}'s words</span>
              <div className="seg" role="radiogroup" aria-labelledby="lbl-ql">
                <button role="radio" aria-checked={settings.quoteLang === "en"} onClick={() => setSettings((s) => ({ ...s, quoteLang: "en" }))}>Translated</button>
                <button role="radio" aria-checked={settings.quoteLang === "de"} onClick={() => setSettings((s) => ({ ...s, quoteLang: "de" }))}>Original</button>
              </div></div>
          </Card>
          <Card title="Keeping and deleting">
            <div className="setting"><label htmlFor="ret">Delete recordings after</label>
              <select id="ret" className="input" value={settings.retention} onChange={(e) => setSettings((s) => ({ ...s, retention: e.target.value }))}>
                <option value="0">The Work Map is verified</option><option value="30">30 days</option><option value="90">90 days</option></select></div>
            <p className="t-sec" style={{ margin: "8px 0 12px" }}>The Work Map keeps events, short screen moments and verified quotes. Full video is never stored, and no file leaves the data room permissions of this deal.</p>
            <button className="btn" onClick={() => askReset("delete")}>Delete this session</button>
          </Card>
        </div>
      </div>
    </>
  );
}

function NotFoundPage() {
  const { go } = useApp();
  return <PageHead title="Page not found" lede="That page doesn't exist in this demo." actions={<button className="btn capsule" onClick={() => go("overview")}>Go to the overview</button>} />;
}

/* ============================== SHELL ================================= */
function NavList({ onPick }) {
  const { page, go, sel } = useApp();
  const Item = ({ id, label, top, extra }) => (
    <button className={"nav-item" + (top ? " top" : "")} aria-current={page === id ? "page" : undefined} onClick={() => { go(id); onPick?.(); }}>
      <span>{label}</span>{extra}
    </button>
  );
  return (
    <nav aria-label="Main" className="stack x-tight">
      <Item id="overview" label="Overview" top />
      <div className="nav-label"><span className={"nav-num" + (sel.captureDone ? " done" : "")} aria-hidden>1</span>Capture{sel.captureDone && <span className="sr">, completed</span>}</div>
      <Item id="capture" label="Live session" />
      <div className="nav-label"><span className={"nav-num" + (sel.signed ? " done" : "")} aria-hidden>2</span>Map{sel.signed && <span className="sr">, completed</span>}</div>
      <Item id="debrief" label="Debrief" extra={sel.awaiting.length > 0 && <Badge tone="pending" title={`${sel.awaiting.length} awaiting ${EXPERT.first}`}><span aria-hidden>{sel.awaiting.length}</span><span className="sr">{sel.awaiting.length} awaiting {EXPERT.first}</span></Badge>} />
      <Item id="map" label="Work Map" extra={<span className="t-sec">{sel.verified}/{sel.claimsTotal}</span>} />
      <div className="nav-label"><span className={"nav-num" + (sel.handled === sel.casesTotal ? " done" : "")} aria-hidden>3</span>Teach</div>
      <Item id="teach" label={`Coach ${TRAINEE.first}`} extra={<span className="t-sec">{sel.handled}/{sel.casesTotal}</span>} />
      <Item id="results" label="Results" />
      <div className="nav-label">More</div>
      <Item id="compare" label="Compare experts" top />
      <Item id="export" label="Agent export" top />
      <Item id="trust" label="Trust and privacy" top />
    </nav>
  );
}

function Sidebar() {
  const { voice, setVoice } = useApp();
  return (
    <aside className="sidenav" aria-label="Sidebar">
      <div className="brand"><span className="brand-mark" aria-hidden><ShieldCheck size={13} /></span>Apprentice</div>
      <div className="people stack x-tight">
        <span className="t-meta">{EXPERT.name}</span><span className="t-sec">Expert, senior partner</span>
        <span className="t-meta" style={{ marginTop: 4 }}>{TRAINEE.name}</span><span className="t-sec">Learning, first deal</span>
      </div>
      <NavList />
      <div className="side-foot">
        <button className="btn compact" aria-pressed={voice} onClick={() => setVoice((v) => !v)}>{voice ? <Volume2 size={13} aria-hidden /> : <VolumeX size={13} aria-hidden />} Voice preview</button>
        <span className="t-cap">Browser speech stands in for ElevenAgents.</span>
      </div>
    </aside>
  );
}

const DEMO_LABEL = "Demo data · fictional deals";

function PhoneSheet({ onClose }) {
  const head = useRef(null); const opener = useRef(null);
  useEffect(() => { opener.current = document.activeElement; head.current?.focus(); return () => opener.current?.focus?.(); }, []);
  return (
    <>
      <div className="sheet-scrim" onClick={onClose} />
      <div className="sheet stack" role="dialog" aria-modal="true" aria-labelledby="sheet-h" onKeyDown={(e) => e.key === "Escape" && onClose()}>
        <div className="row"><h2 id="sheet-h" className="t-card" tabIndex={-1} ref={head} style={{ outline: "none" }}>Go to</h2><span className="spacer" />
          <button className="dialog-close" onClick={onClose} aria-label="Close menu"><X size={16} aria-hidden /></button></div>
        <CommandBar onDone={onClose} />
        <NavList onPick={onClose} />
      </div>
    </>
  );
}

export default function App() {
  const [page, setPage] = useState("overview");
  const [cap, setCap] = useState(initCap);
  const [gaps, setGaps] = useState({});
  const [claims, setClaims] = useState({});
  const [signed, setSigned] = useState(false);
  const [struck, setStruck] = useState({});
  const [custom, setCustom] = useState({});
  const [mapStep, setMapStep] = useState(5);
  const [voice, setVoice] = useState(false);
  const [teach, setTeach] = useState({ log: [], saved: {}, preds: {}, forms: {}, msgs: {} });
  const [settings, setSettings] = useState({
    theme: "system", quoteLang: "en", expertLang: "German", tutorLang: "English", retention: "90",
    redact: { PERSON: true, US_SSN: true, COMPENSATION: true, EMAIL_ADDRESS: true, PHONE_NUMBER: true, US_BANK_NUMBER: true },
  });
  const [systemDark, setSystemDark] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  const [confirm, setConfirm] = useState(null);
  const [sheet, setSheet] = useState(false);
  const [live, setLive] = useState("");
  const firstRender = useRef(true);

  useEffect(() => {
    const m = window.matchMedia?.("(prefers-color-scheme: dark)"); if (!m) return;
    const f = (e) => setSystemDark(e.matches); m.addEventListener?.("change", f); return () => m.removeEventListener?.("change", f);
  }, []);
  // On navigation, move focus to the new page's heading.
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    const h = document.querySelector(".workspace h1"); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
    document.querySelector(".ws-scroll")?.scrollTo?.(0, 0); window.scrollTo?.(0, 0);
  }, [page]);

  const quotes = useMemo(() => ({ ...QUOTES, ...custom }), [custom]);
  const claimText = (id) => claims[id]?.text ?? (RULE[id].draftWrong ? RULE[id].draft : RULE[id].text);
  const ruleSources = (id) => { const c = claims[id], r = RULE[id]; if (c?.quote) return [c.quote]; return r.draftWrong ? [] : r.sources; };
  // Evidence: proposed (no confirmation) → verified (confirmed and still linked to her own words) or approved (confirmed, source struck).
  const ruleEvidence = (id) => !claims[id] ? "proposed" : ruleSources(id).some((q) => !struck[q] && quotes[q]) ? "verified" : "approved";
  const isVerified = (id) => ruleEvidence(id) === "verified";
  const sel = selectAll({ cap, gaps, claims, signed, teach, ruleEvidence });

  const go = useCallback((p) => setPage(p), []);
  const addQuote = (k, q) => setCustom((c) => ({ ...c, [k]: q }));
  const announce = (text) => { setLive(""); setTimeout(() => setLive(text), 30); };
  const resetAll = () => {
    setCap(initCap()); setGaps({}); setClaims({}); setSigned(false); setStruck({}); setCustom({});
    setTeach({ log: [], saved: {}, preds: {}, forms: {}, msgs: {} }); setMapStep(5); setPage("overview");
  };
  const fillDemo = () => {
    setCap((c) => (c.done ? c : runToEnd(initCap())));
    setGaps(Object.fromEntries(GAPS.map((g) => [g.id, "answered"])));
    setClaims(Object.fromEntries(RULES.map((r) => [r.id, r.draftWrong ? { status: "corrected", text: r.text, quote: r.correction } : { status: "confirmed", text: r.text }])));
    setSigned(true); setPage("map"); announce("Finished demo session loaded. 9 rules verified.");
  };
  const askReset = (kind = "reset") => setConfirm(kind);

  const ctx = {
    page, go, cap, setCap, gaps, setGaps, claims, setClaims, signed, setSigned, struck, setStruck, quotes, addQuote,
    claimText, ruleSources, ruleEvidence, isVerified, sel, mapStep, setMapStep, teach, setTeach, settings, setSettings,
    voice, setVoice, fillDemo, resetAll, askReset, announce,
  };
  const Page = { overview: OverviewPage, capture: CapturePage, debrief: DebriefPage, map: WorkMapPage, teach: TeachPage,
    results: ResultsPage, compare: ComparePage, export: ExportPage, trust: TrustPage }[page] || NotFoundPage;
  const dark = settings.theme === "dark" || (settings.theme === "system" && systemDark);

  return (
    <AppCtx.Provider value={ctx}>
      <style>{CSS}</style>
      <div className={"ap" + (dark ? " dark" : "")}>
        <Sidebar />
        <div className="col">
          <div className="toolbar" role="toolbar" aria-label="Toolbar">
            <CommandBar />
            <span className="spacer" />
            <div className="pill"><span className="demo-tag"><Info size={14} aria-hidden /> {DEMO_LABEL}</span></div>
            <AppearanceMenu />
          </div>
          <div className="topbar">
            <button className="pill-btn" style={{ minWidth: 44 }} aria-label="Open menu" aria-haspopup="dialog" onClick={() => setSheet(true)}><Menu size={18} aria-hidden /></button>
            <span className="brand" style={{ padding: 0 }}><span className="brand-mark" aria-hidden><ShieldCheck size={13} /></span>Apprentice</span>
            <span className="spacer" />
            <span className="t-meta"><Info size={13} aria-hidden style={{ verticalAlign: "-2px" }} /> {DEMO_LABEL}</span>
          </div>
          <main className="workspace" aria-label="Workspace">
            <div className="ws-scroll"><Page /></div>
          </main>
        </div>
        {sheet && <PhoneSheet onClose={() => setSheet(false)} />}
        {confirm && (
          <Dialog title={confirm === "delete" ? "Delete this session?" : "Start over?"} onClose={() => setConfirm(null)}
            actions={<>
              <button className="btn" onClick={() => setConfirm(null)}>Cancel</button>
              <button className="btn" onClick={() => { setConfirm(null); resetAll(); announce(confirm === "delete" ? "Session deleted. Demo data reset." : "Started over. Demo data reset."); }}>
                {confirm === "delete" ? "Delete session" : "Start over"}</button>
            </>}>
            Clears the capture, the debrief answers, all {RULES.length} rules and {TRAINEE.first}'s coaching. It's demo data, so nothing outside this tab changes.
          </Dialog>)}
        <div className="sr" role="status" aria-live="polite">{live}</div>
      </div>
    </AppCtx.Provider>
  );
}
