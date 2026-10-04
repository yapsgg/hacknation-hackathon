"use client"

/* eslint-disable react/no-unescaped-entities */

import { useState, useEffect, useRef, useMemo, useCallback, useSyncExternalStore, createContext, useContext } from "react";
import {
  MonitorUp, Play, Pause, FastForward, EyeOff, Check, X, PenLine, Download, Copy, RotateCcw, AlertTriangle,
  Lock, Square, Volume2, VolumeX, Keyboard, BookOpen, MessageSquare, Mic, Search, Hand, Bot, Database,
  UserCheck, ShieldCheck, Clock, Users, Menu, Sun, Moon, Monitor, ChevronDown, Info, FileText, Flag,
  ChevronLeft, ChevronRight, ArrowUpRight,
} from "lucide-react";
import {
  APPRENTICE_ACTIVITY,
  APPRENTICE_DEAL,
  APPRENTICE_END_T,
  APPRENTICE_EXPERT,
  APPRENTICE_GAPS,
  APPRENTICE_LIVE_BUDGET,
  APPRENTICE_QUOTES,
  APPRENTICE_RULE,
  APPRENTICE_RULES,
  APPRENTICE_SCRIPT,
  APPRENTICE_STEPS,
} from "@/lib/apprentice-demo";
import { evaluateQuestionSlot, QUESTION_GOVERNOR_POLICY } from "@/lib/question-governor";
import { LiveInterviewer } from "@/components/apprentice/live-interviewer";
import { usePathname } from "next/navigation";

import { sessionFetch } from "@/lib/session-client";
import { LIVE_POLICY, LiveSignalTracker, describeLiveEvent, liveCandidatesFromEvent, liveEventField } from "@/lib/live-capture";
import { useVoiceActivity } from "@/hooks/use-voice-activity";
import { encodeReadableJpeg } from "@/hooks/use-screen-capture";
import { ATLAS_FILES, BEACON_FILES, DocFace, fileById } from "./work-files";

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
.g-files{grid-template-columns:280px minmax(0,1fr);align-items:start}
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

/* ---------- rendered work files: workbook and PDF ---------- */
.file-face{border:1px solid var(--scr-line);border-radius:6px;overflow:hidden;background:#fff;color:#1a1d21}
.ap.dark .file-face{background:#1c1f24;color:#e8eaed;border-color:#3c424a}
.xl-chrome{display:flex;align-items:center;gap:8px;padding:4px 8px;background:#217346;color:#fff;font-size:11px;font-weight:600}
.xl-formula{display:grid;grid-template-columns:52px minmax(0,1fr);border-bottom:1px solid #d0d7de;background:#f6f8fa;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px}
.ap.dark .xl-formula{background:#25282e;border-color:#3c424a}
.xl-name{padding:4px 6px;border-right:1px solid #d0d7de;color:#57606a;font-weight:600}
.ap.dark .xl-name{border-color:#3c424a;color:#9aa3ad}
.xl-fx{padding:4px 8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.xl-wrap{overflow:auto;max-height:420px}
.xl{border-collapse:collapse;width:max-content;min-width:100%;font-size:11px;line-height:14px;font-variant-numeric:tabular-nums}
.xl th,.xl td{border:1px solid #d0d7de;padding:3px 6px;white-space:nowrap}
.ap.dark .xl th,.ap.dark .xl td{border-color:#3c424a}
.xl th{background:#f3f4f6;color:#57606a;font-weight:600;text-align:center;position:sticky;top:0}
.ap.dark .xl th{background:#2a2e34;color:#b3bbc4}
.xl .rn{background:#f3f4f6;color:#57606a;text-align:right;width:28px;position:sticky;left:0}
.ap.dark .xl .rn{background:#2a2e34;color:#b3bbc4}
.xl td.num{text-align:right;font-variant-numeric:tabular-nums}
.xl tr.hl td{background:#fff4cc}
.ap.dark .xl tr.hl td{background:#3a3218}
.xl tr.total td{font-weight:700;border-top:2px solid #1a1d21}
.ap.dark .xl tr.total td{border-top-color:#e8eaed}
.xl-tabs{display:flex;gap:2px;padding:4px 6px;background:#f3f4f6;border-top:1px solid #d0d7de;overflow:auto}
.ap.dark .xl-tabs{background:#25282e;border-color:#3c424a}
.xl-tabs button{height:22px;padding:0 10px;border-radius:4px 4px 0 0;border:1px solid transparent;font-size:11px;color:#1a1d21}
.ap.dark .xl-tabs button{color:#e8eaed}
.xl-tabs button[aria-selected="true"]{background:#fff;border-color:#d0d7de;border-bottom-color:#fff;font-weight:600}
.ap.dark .xl-tabs button[aria-selected="true"]{background:#1c1f24;border-color:#3c424a;border-bottom-color:#1c1f24}
.pdf-page{background:#fff;color:#1a1d21;padding:16px 18px 20px;min-height:280px;box-shadow:inset 0 0 0 1px #e6e8eb}
.ap.dark .pdf-page{background:#f4f1ea;color:#1a1d21}
.pdf-banner{display:flex;justify-content:space-between;gap:8px;font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:#8a3b12;border-bottom:2px solid #1a1d21;padding-bottom:6px;margin-bottom:10px;font-weight:700}
.pdf-title{font-size:15px;line-height:20px;font-weight:700;margin-bottom:2px}
.pdf-sub{font-size:11px;color:#3d4450;margin-bottom:10px}
.pdf-meta{display:grid;grid-template-columns:110px minmax(0,1fr);gap:2px 8px;font-size:11px;margin-bottom:12px}
.pdf-meta dt{color:#5c6570;font-weight:600}
.pdf-clause{margin:0 0 8px;font-size:11.5px;line-height:16px}
.pdf-clause strong{font-weight:700}
.pdf-clause.hl{background:#fff4cc;padding:4px 6px;border-left:3px solid #8a3b12}
.pdf-foot{display:flex;justify-content:space-between;margin-top:14px;padding-top:6px;border-top:1px solid #c8ccd2;font-size:9px;color:#5c6570}
.file-list{display:flex;flex-direction:column;gap:2px}
.file-list button{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 8px;width:100%;text-align:left;padding:8px;border-radius:8px}
.file-list button:hover{background:var(--card-2)}
.file-list button[aria-pressed="true"]{background:var(--action-wash);color:var(--action)}
.file-ext{font-size:10px;font-weight:700;letter-spacing:.04em;padding:1px 5px;border-radius:3px;background:var(--card-2);color:var(--text-2)}
.file-ext.xlsx{background:#e5f4ea;color:#0d5c2e}
.file-ext.pdf{background:#fde8e6;color:#8a221c}
.file-ext.docx{background:#e7f0fb;color:#0b4f8a}
.scr.compact .xl-wrap{max-height:220px}
.scr.compact .pdf-page{min-height:0;padding:12px}

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
  .g-main,.g-wide,.g-map,.g-ov,.g-files{grid-template-columns:minmax(0,1fr)}
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
const EXPERT = APPRENTICE_EXPERT;
const TRAINEE = { name: "Priya Shah", first: "Priya", role: "Analyst, first deal" };
const DEAL = APPRENTICE_DEAL;
const TEACH_DEAL = { code: "Project Beacon", target: "a dental practice software company" };

/* --------------------- the expert's own words -------------------------- */
// Every rule and step links back to one of these. de = what she said, en = tutor language.
const QUOTES = APPRENTICE_QUOTES;

/* ------------------------- rules (pencil -> ink) ------------------------ */
// kind: step | judgment | guardrail. moment = screen time in seconds.
const RULES = APPRENTICE_RULES;
const RULE = APPRENTICE_RULE;
const STEPS = APPRENTICE_STEPS;

/* ------------------------- debrief gaps -------------------------------- */
const GAPS = APPRENTICE_GAPS;

/* --------------------- capture script (demo session) ------------------- */
const END_T = APPRENTICE_END_T;
const LIVE_BUDGET = APPRENTICE_LIVE_BUDGET;

// What the expert is doing. The agent never speaks over any of these.
const ACTIVITY = APPRENTICE_ACTIVITY;

const SCRIPT = APPRENTICE_SCRIPT;

/* -------------- teach: Project Beacon, a deal she never saw ------------ */
const CASES = [
  { id: "rev", label: "Revenue and add-backs", stage: "Contract validation and QoE scrubbing",
    intro: `${TEACH_DEAL.code} is a deal ${EXPERT.first} never saw. Spread Crestline Health's ARR and the relocation add-back into the model, then save to run the debt schedule. I'll stay quiet unless you're about to save something she'd stop.`,
    predict: { q: "Crestline has an $80,000 MSA and a $110,000 software agreement. What's Crestline's ARR?", options: ["$190,000", "$110,000", "$80,000"], answer: "$110,000", rule: "acme-amendment-language" } },
  { id: "lbo", label: "LBO assumptions", stage: "Running the LBO and value creation plan",
    intro: "Revenue and EBITDA are scrubbed. Now link them to the LBO and enter maintenance capex before the model calculates IRR.",
    predict: { q: "Management says 1.6% maintenance capex. History averages 4.0%. What would Sabine put in the model?", options: ["1.6%, management's number", "4.0%, and ask why"], answer: "4.0%, and ask why", rule: "capex-below-average" } },
];

const TEACH_DOCS = {
  rev: ["arr", "msa", "sw25", "bridge", "gl"].map((id) => BEACON_FILES.find((f) => f.id === id)),
  lbo: ["plan", "far", "deck"].map((id) => BEACON_FILES.find((f) => f.id === id)),
};

/* =========================== helpers ================================== */
const fmt = (s) => {
  const v = Math.max(0, Math.floor(s));
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
};
const GOVERNOR_REASON = {
  slot_granted: "slot granted",
  expert_speaking: "expert speaking",
  expert_active: "keyboard or pointer active",
  document_scrolling: "document scrolling",
  cooldown: "45-second cooldown",
  question_budget: "live question budget reached",
  no_recent_trigger: "waiting for a recent trigger",
  guardrail_candidate_required: "guardrail question required",
  no_useful_question: "no useful anchored question",
};
const GOVERNOR_TRIGGER = {
  value_committed: "value committed",
  doc_closed: "document closed",
  amendment_opened: "amendment opened",
  addback_accepted: "add-back accepted",
};
/* ======================= capture engine ===============================
   Deterministic and pure: stepCap(state, dt) -> state.
   Rules enforced here:
   - every screen change becomes a timestamped event
   - a question is asked only if (a) a relevant event queued it and
     (b) the shared Governor grants a slot from voice, interaction, scroll,
         cooldown, budget and recent-trigger signals
   - off the record: no events, no transcript, no questions
   In production, replace SCRIPT with vision-model events and ACTIVITY
   with keyboard/mouse activity + Scribe v2 Realtime voice activity.
====================================================================== */
function initCap() {
  return {
    t: 0, running: false, speed: 8, ei: 0, events: [], transcript: [], asked: [], deferred: [], dropped: [],
    queue: [], dyn: [], pending: null, askingUntil: 0, agent: "idle", agentLine: "", holdReason: "",
    governor: { reason: "Waiting for a trigger", trigger: null, score: null },
    off: false, offSegs: [], suppressed: 0, redacted: 0, done: false, interruptions: 0,
    live: null, liveSig: null, vision: null,
  };
}

function signalsAt(cap, t) {
  const s = { typing: false, reading: false, speaking: false, agent: false };
  let lastEnd = 0; let lastVoiceEnd = 0; let lastInteractionEnd = 0;
  const all = [...ACTIVITY, ...cap.dyn.map((d) => ({ ...d, type: "speaking" }))];
  for (const a of all) {
    if (t >= a.from && t < a.to) {
      s[a.type] = true; lastEnd = t;
      if (a.type === "speaking") lastVoiceEnd = t;
      if (a.type === "typing" || a.type === "reading") lastInteractionEnd = t;
    } else if (a.to <= t) {
      lastEnd = Math.max(lastEnd, a.to);
      if (a.type === "speaking") lastVoiceEnd = Math.max(lastVoiceEnd, a.to);
      if (a.type === "typing" || a.type === "reading") lastInteractionEnd = Math.max(lastInteractionEnd, a.to);
    }
  }
  if (t < cap.askingUntil) { s.agent = true; lastEnd = t; }
  return {
    ...s,
    quiet: Math.max(0, t - lastEnd),
    voiceSilenceFor: Math.max(0, t - lastVoiceEnd),
    interactionIdleFor: Math.max(0, t - lastInteractionEnd),
    active: s.typing || s.reading || s.speaking || s.agent,
  };
}

// Asks the shared Question Governor for a slot and updates the agent state. Used by both the recorded
// session and live capture; only the signals differ.
function governQueue(c, t, sig, live = false) {
  if (c.done) { /* keep */ }
  else if (c.off) c.agent = "off";
  else if (t < c.askingUntil) c.agent = "asking";
  else if (c.pending) c.agent = "listening";
  else if (c.queue.length) {
    const triggerCandidate = c.queue.reduce((latest, item) => item.eventT > latest.eventT ? item : latest);
    const decision = evaluateQuestionSlot({
      now: t,
      sessionElapsed: t,
      voiceSilenceFor: sig.voiceSilenceFor,
      interactionIdleFor: sig.interactionIdleFor,
      docScrolling: sig.reading,
      lastQuestionAt: c.asked.at(-1)?.t ?? null,
      questionTimes: c.asked.map((item) => item.t),
      guardrailQuestionAsked: c.asked.some((item) => item.type === "guardrail"),
      trigger: { type: triggerCandidate.trigger, at: triggerCandidate.eventT },
    }, c.queue.map((item) => ({
      id: item.id,
      text: item.q,
      anchor: item.anchor,
      kind: item.type === "guardrail" ? "guardrail" : "decision_reason",
      revealValue: item.revealValue,
      onScreenAnchor: item.onScreenAnchor,
      novelty: item.novelty,
      screenAnswerablePenalty: item.screenAnswerablePenalty,
    })));
    c.governor = {
      reason: decision.reason,
      trigger: triggerCandidate.trigger,
      score: decision.granted ? decision.score : null,
    };
    if (decision.granted) {
      const selected = c.queue.findIndex((item) => item.id === decision.candidate.id);
      const [k] = c.queue.splice(selected, 1);
      if (sig.active) c.interruptions++; // never happens by construction; kept as a metric
      c.asked.push({ id: k.id, step: k.step, q: k.q, type: k.type, t, eventT: k.eventT, eventText: k.eventText, quiet: sig.quiet, voiceSilenceFor: sig.voiceSilenceFor, interactionIdleFor: sig.interactionIdleFor, alts: k.alts, governorScore: decision.score, trigger: k.trigger });
      c.transcript.push({ t, who: "agent", text: k.q });
      c.agent = "asking"; c.agentLine = k.q; c.askingUntil = t + 2.5;
      if (!live) {
        // The recorded session simulates the expert answering; live capture hears the real answer instead.
        c.dyn.push({ from: t + 2.5, to: t + 8 });
        c.pending = { at: t + 8, quote: k.id };
      }
    } else if (["expert_speaking", "expert_active", "document_scrolling"].includes(decision.reason)) {
      c.agent = "holding";
      c.holdReason = decision.reason === "expert_speaking" ? "talking" : decision.reason === "document_scrolling" ? "reading" : "typing";
    } else c.agent = "waiting";
  } else c.agent = "listening";
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
    c.events.push({ t: e.t, kind: "screen", text: e.text, field: e.field, raw: e.event });
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

  governQueue(c, t, signalsAt(c, t));

  c.t = t;
  return c;
}

function runToEnd(cap) {
  let c = { ...cap, running: false };
  let guard = 0;
  while (!c.done && guard++ < 5000) c = stepCap(c, 0.5);
  return c;
}

/* Live capture: the same Governor, fed by the microphone level, screen change and redacted vision
   events instead of the recorded script. Nothing here is simulated. */
const LIVE_QUEUE_MAX_AGE_S = 90;
const LIVE_EVENTS_MAX = 490; // /api/apprentice/state accepts at most 500 events

function liveStep(prev, now, snap) {
  if (prev.done || !prev.live?.startedAt) return prev;
  const c = { ...prev, asked: [...prev.asked], transcript: [...prev.transcript],
    queue: prev.queue.filter((item) => now - item.eventT <= LIVE_QUEUE_MAX_AGE_S) };
  const agentSpeaking = now < c.askingUntil;
  const sig = {
    typing: false, reading: snap.docScrolling, speaking: snap.speaking, agent: agentSpeaking,
    moving: false, screenActive: snap.screenActive,
    voiceSilenceFor: snap.voiceSilenceFor, interactionIdleFor: snap.interactionIdleFor,
    quiet: Math.min(snap.voiceSilenceFor, snap.interactionIdleFor),
    active: snap.speaking || snap.docScrolling || agentSpeaking,
  };
  c.t = now;
  c.liveSig = sig;
  governQueue(c, now, sig, true);
  return c;
}

function ingestVisionEvents(prev, events) {
  if (!events.length || prev.done) return prev;
  const c = { ...prev, events: [...prev.events], queue: [...prev.queue] };
  const askedTexts = new Set(c.asked.map((a) => a.q));
  for (const ev of events) {
    if (c.off) { c.suppressed++; continue; }
    // Local "screen changed" notes are shown but never become Work Map evidence.
    c.events.push({ t: ev.t, kind: "screen", text: ev.local ? ev.object : describeLiveEvent(ev), field: ev.local ? null : liveEventField(ev), raw: ev.local ? undefined : ev, live: true });
    if (ev.local) continue;
    for (const cand of liveCandidatesFromEvent(ev, askedTexts)) {
      // The Governor's "recent trigger" window runs from when the event was detected, not from the frame time,
      // because vision takes seconds to answer. The frame time stays on the event as evidence.
      if (!c.queue.some((q) => q.id === cand.id)) c.queue.push({ ...cand, eventT: Math.max(cand.eventT, c.t), alts: [] });
    }
  }
  c.events = c.events.slice(-LIVE_EVENTS_MAX);
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
const VDR_ROWS = ATLAS_FILES.map((file) => [file.name, file.folder, file.dateLabel, file.sort]);

// What was on Sabine's screen in the canonical seeded session.
function screenAt(t) {
  if (t < 8) return { view: "index", sorted: true };
  if (t < 40) return { view: "work", label: "Adjusted EBITDA bridge",
    doc: fileById("a-bridge"), sheet: "Bridge",
    rows: [
      { key: "addback", label: "Add-back: relocation", v: "$4.0M", sub: "From management's bridge" },
      { key: "ebitda", label: "Adjusted EBITDA", v: "$23.85M", calc: true },
    ] };
  if (t < 118) return { view: "work", label: "Top-20 contracts",
    doc: t < 64 ? fileById("a-msa") : fileById("a-amd"),
    rows: [
      { key: "arr", label: "ARR: Acme", v: t >= 95.4 ? "$110,000" : t >= 88.2 ? "$190,000" : "–", sub: t >= 95.4 ? "Amendment 2 replaces Order Form #1" : "Awaiting validation" },
      { key: "arrtop", label: "Top-20 customer ARR", v: t >= 95.4 ? "$13.55M" : "$13.63M", calc: true },
    ] };
  if (t < 160) return { view: "work", label: "Management add-backs",
    doc: t < 150.3 ? fileById("a-addbacks") : fileById("a-reloc"),
    rows: [
      { key: "addback", label: "Relocation add-back", v: "$4.0M", sub: t >= 150.3 ? "Flagged for QoE review" : "Management case" },
      { key: "qoe", label: "QoE status", v: t >= 150.3 ? "Flagged" : "–" },
    ] };
  return { view: "work", label: "LBO assumptions",
    doc: fileById("a-capex"),
    rows: [
      { key: "capex", label: "Maintenance capex, % of revenue", v: t >= 199.6 ? "4.1%" : "1.8%", sub: t >= 199.6 ? "Historical average; QoE escalation required" : "Management forecast" },
      { key: "qoe", label: "Commit status", v: t >= 205.6 ? "Held for review" : "Not saved" },
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
    <div className={"scr" + (compact ? " compact" : "")} role="group" aria-label={`${EXPERT.first}'s screen at ${fmt(t)}${changed ? ", changed: " + changed : ""}`}>
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
            <DocFace key={s.doc.id + (s.sheet || "")} file={s.doc} initialSheet={s.sheet} redactPerson={!!r.PERSON} />
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
  ["landing", "Home"], ["overview", "Overview"], ["files", "Source files"], ["capture", "Capture: live session"], ["debrief", "Debrief"], ["map", "Work Map"],
  ["teach", `Coach ${TRAINEE.first}`], ["results", "Results"], ["export", "Agent export"], ["trust", "Trust and privacy"],
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

/* Browser speech remains the no-key fallback for scripted questions. */
// Prefer the ElevenLabs voice (same as the live Interviewer) so the spoken
// debrief and capture fallback are not the browser's robotic voice. Falls back
// to speechSynthesis when the key is missing or synthesis fails.
let ttsUnavailable = false;
let ttsAudio = null;
function browserSpeak(text) {
  try {
    if (!window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.rate = 0.98;
    window.speechSynthesis.speak(u);
  } catch { /* ignore */ }
}
function speakText(on, text) {
  if (!on || !text || typeof window === "undefined") return;
  if (ttsUnavailable) { browserSpeak(text); return; }
  let sessionId = null;
  try { sessionId = window.localStorage.getItem("apprentice-session-id"); } catch { /* ignore */ }
  if (!sessionId) {
    // The landing can be the first screen, before the app claims an id.
    try { sessionId = window.crypto.randomUUID(); window.localStorage.setItem("apprentice-session-id", sessionId); } catch { /* ignore */ }
  }
  if (!sessionId) { browserSpeak(text); return; }
  sessionFetch(sessionId, "/api/tts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, text }),
  })
    .then(async (res) => {
      if (res.status === 503) { ttsUnavailable = true; browserSpeak(text); return; }
      if (!res.ok) { browserSpeak(text); return; }
      const blob = await res.blob();
      if (!blob.size) { browserSpeak(text); return; }
      try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
      try { ttsAudio?.pause(); } catch { /* ignore */ }
      ttsAudio = new Audio(URL.createObjectURL(blob));
      await ttsAudio.play().catch(() => browserSpeak(text));
    })
    .catch(() => browserSpeak(text));
}

/* ============================== TEACH ================================= */
const CASE_RULES = {
  rev: ["acme-amendment-language", "relocation-recurrence"],
  lbo: ["capex-below-average"],
};
const FLAG_LABEL = {
  "acme-amendment-language": "this ARR total",
  "relocation-recurrence": "the relocation add-back",
  "capex-below-average": "this capex assumption",
};
const ASK = {
  "acme-amendment-language": "Does the new software agreement add to the original, or replace it?",
  "relocation-recurrence": "What historical invoices would you check before accepting that $4M as truly non-recurring?",
  "capex-below-average": "Why would this company suddenly need less capital to maintain its equipment after the buyout?",
};
const blankForm = (id) => ({
  rev: { arr: "", addback: "accept", opened: [], open: "arr", result: null },
  lbo: { capex: "1.6", opened: [], open: "plan", escalated: false, result: null },
}[id]);
const num = (v) => Number(String(v).replace(/[^0-9.]/g, ""));
const usd = (n) => "$" + Math.round(n).toLocaleString("en-US");
const irrAt = (capex) => { const x = num(capex); return isNaN(x) ? "–" : (26.8 - (x - 1.6) * 2.2).toFixed(1) + "%"; };

// Judges a trainee decision. Only ink (confirmed) rules can block.
function evaluate(caseId, f, isVerified) {
  const v = [];
  const add = (id, msg) => v.push({ id, msg, ink: isVerified(id) });
  if (caseId === "rev") {
    if (f.arr.trim() && !f.opened.includes("sw25")) add("acme-amendment-language", "That ARR came from management's schedule. You haven't opened the 2025 software agreement behind it.");
    if (f.arr.trim() && num(f.arr) !== 110000) add("acme-amendment-language", num(f.arr) === 190000
      ? "You added both contracts. §1.2 of the 2025 agreement replaces the MSA, so Crestline's ARR is $110,000, not $190,000."
      : `Check §1.2 of the 2025 agreement. It decides whether ${usd(num(f.arr))} is right.`);
    if (f.addback === "accept") add("relocation-recurrence", "Relocation costs show up in the GL in 2022, 2023 and 2024, with the same vendor every year. The $4.0M isn't proven one-time.");
  }
  if (caseId === "lbo") {
    if (num(f.capex) < 3.0 && !f.escalated) add("capex-below-average", `${f.capex}% is less than half of the 4.0% history, and nothing in the data room explains the drop.`);
  }
  return v;
}


/* ============================= RESULTS ================================ */
const PRACTICE = {
  "acme-amendment-language": "A customer with an MSA and two amendments, only one of which supersedes",
  "customer-3-add-on": "An add-on that explicitly remains in addition to the original order form",
  "relocation-recurrence": "A one-time IT migration that also shows up in last year's GL",
  "legal-fee-recurrence": "A legal-fee add-back with the same pattern in prior years",
  "capex-below-average": "A management case where capex falls because of a claimed equipment lease",
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
      how: `Requires ${QUESTION_GOVERNOR_POLICY.minVoiceSilence} s of voice silence, ${QUESTION_GOVERNOR_POLICY.minInteractionIdle} s of interaction idle, no scrolling and a recent trigger.`,
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
      how: "Off the record by voice or button; transcript redaction is server-side when Presidio is configured.",
      ev: `${S.offSegs} off-record ${S.offSegs === 1 ? "segment" : "segments"}, ${S.redacted} synthetic items redacted` },
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
  const { cap, setCap, settings, go, voice, sel, announce, getApprenticeSessionId } = useApp();
  const [tab, setTab] = useState("questions");
  const [stream, setStream] = useState(null);
  const [shareMsg, setShareMsg] = useState(null);
  const [open, setOpen] = useState(null);
  const [liveVoiceConnected, setLiveVoiceConnected] = useState(false);
  const videoRef = useRef(null);
  const capRef = useRef(cap);

  useEffect(() => {
    capRef.current = cap;
  }, [cap]);

  useEffect(() => {
    if (!cap.running) return;
    const id = setInterval(() => setCap((c) => (c.running ? stepCap(c, 0.1 * c.speed) : c)), 100);
    return () => clearInterval(id);
  }, [cap.running, setCap]);

  const asked = cap.asked;
  const said = useRef(asked.length);
  useEffect(() => {
    if (asked.length > said.current && !liveVoiceConnected) speakText(voice, asked[asked.length - 1].q);
    said.current = asked.length;
  }, [asked, liveVoiceConnected, voice]);
  useEffect(() => { if (cap.done) announce("Capture finished. The debrief is ready."); }, [cap.done]); // eslint-disable-line

  useEffect(() => { if (videoRef.current && stream) videoRef.current.srcObject = stream; }, [stream]);

  // ---- live capture: real screen, real microphone level, optional redacted vision ----
  const sessionId = getApprenticeSessionId();
  const visionOn = process.env.NEXT_PUBLIC_ENABLE_VISION === "true";
  const trackerRef = useRef(new LiveSignalTracker());
  const liveNow = () => ((performance.now() - (capRef.current.live?.startedAt ?? performance.now())) / 1000);
  const voiceActivity = useVoiceActivity({
    onSpeech: () => { if (capRef.current.live?.startedAt && !capRef.current.off) trackerRef.current.noteVoice(liveNow()); },
  });
  const liveRunning = !!cap.live?.startedAt && !cap.done;

  useEffect(() => {
    if (!liveRunning) return;
    const id = setInterval(() => {
      const now = liveNow();
      setCap((c) => liveStep(c, now, trackerRef.current.snapshot(now)));
    }, 500);
    return () => clearInterval(id);
  }, [liveRunning]); // eslint-disable-line

  useLiveSampler({
    stream, videoRef, capRef, trackerRef, sessionId, visionOn, active: liveRunning,
    onEvents: (events) => setCap((c) => ingestVisionEvents(c, events)),
    onVision: (patch) => setCap((c) => (c.live ? { ...c, vision: { ...c.vision, ...patch(c.vision) } } : c)),
  });

  function releaseMedia() {
    stream?.getTracks().forEach((tr) => tr.stop());
    setStream(null);
    voiceActivity.stop();
  }
  async function startLive() {
    setShareMsg(null);
    let display;
    try {
      display = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 2 }, audio: false });
    } catch {
      setShareMsg({ tone: "critical", text: "Screen sharing was refused or is unavailable here. Use the recorded session, or open the app in Chrome on your own domain." });
      return;
    }
    // Without the microphone the Governor could not tell when the expert is talking, so fail closed.
    const micOk = await voiceActivity.start();
    if (!micOk) {
      display.getTracks().forEach((tr) => tr.stop());
      setShareMsg({ tone: "critical", text: "Live capture needs the microphone level to know when the expert is talking. Allow microphone access, or use the recorded session." });
      return;
    }
    display.getVideoTracks()[0].onended = () => { setStream(null); voiceActivity.stop(); };
    trackerRef.current = new LiveSignalTracker();
    setStream(display);
    setTab("events");
    setCap({ ...initCap(), live: { startedAt: performance.now() },
      vision: { enabled: visionOn, calls: 0, events: 0, errors: 0, totalLatencyMs: 0, lastLatencyMs: null, redactions: 0, provider: null, disabled: null } });
    setShareMsg({ tone: "agent", text: visionOn
      ? "Live capture is on. Frames go to the server-side redactor first; only the redacted image reaches the vision model, and nothing is stored."
      : "Live capture is on without vision: screen change and microphone level are measured locally, but no questions can be generated until vision is configured." });
  }
  function endLive() {
    releaseMedia();
    setCap((c) => ({ ...c, done: true, running: false, agent: "done", agentLine: `Thanks, ${EXPERT.first}. I have a few open questions for the debrief.` }));
  }
  function switchToRecorded() {
    releaseMedia();
    setShareMsg(null);
    setCap(initCap());
  }

  const sig = cap.live && cap.liveSig ? cap.liveSig : signalsAt(cap, cap.t);
  const spanT = cap.live ? Math.max(END_T, cap.t) : END_T;
  const pause = sig.voiceSilenceFor >= QUESTION_GOVERNOR_POLICY.minVoiceSilence &&
    sig.interactionIdleFor >= QUESTION_GOVERNOR_POLICY.minInteractionIdle &&
    !sig.reading && !sig.agent && !cap.off && !cap.done && cap.t > 0;
  const gateProgress = Math.min(
    1,
    sig.voiceSilenceFor / QUESTION_GOVERNOR_POLICY.minVoiceSilence,
    sig.interactionIdleFor / QUESTION_GOVERNOR_POLICY.minInteractionIdle
  );
  const state = {
    idle: [Bot, "Ready"], listening: [Mic, cap.pending ? `Listening to ${EXPERT.first}'s answer` : "Listening"],
    waiting: [Clock, "Waiting for a natural pause"], asking: [MessageSquare, "Asking"],
    holding: [Hand, `Holding a question while ${EXPERT.first} is ${cap.holdReason}`], off: [EyeOff, "Off the record"], done: [Check, "Task finished"],
  }[cap.agent];
  const StateIcon = state[0];
  const latestScreenEvent = [...cap.events].reverse().find((event) => event.kind === "screen");
  const liveScreenState = {
    state_summary: latestScreenEvent?.text || (stream ? "A live screen is shared; only local frame changes are available." : "The recorded synthetic session is ready."),
    recent_events: cap.events.slice(-8).map((event) => event.raw || { t: event.t, type: event.kind, object: event.text }),
    current_doc: latestScreenEvent?.raw?.object || null,
    elapsed_s: Number(cap.t.toFixed(1)),
  };
  const liveSlot = cap.agent === "asking" ? (cap.asked.at(-1) || null) : null;

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
              {liveRunning ? <button className="btn compact" onClick={endLive}><Square size={13} aria-hidden /> End live capture</button>
                : <button className="btn compact" disabled={cap.done} onClick={() => void startLive()}><MonitorUp size={13} aria-hidden /> Start live capture</button>}
              <button className={"btn compact"} aria-pressed={cap.off} disabled={cap.done || cap.t === 0} onClick={() => setCap((c) => toggleOff(c))}>
                <EyeOff size={13} aria-hidden /> {cap.off ? "Go back on the record" : "Go off the record"}</button>
            </div>}>
            <div className="stack">
              <div className="row">
                <button className="btn" disabled={cap.done || !!cap.live} onClick={() => setCap((c) => ({ ...c, running: !c.running }))}>
                  {cap.running ? <><Pause size={14} aria-hidden /> Pause demo</> : <><Play size={14} aria-hidden /> {cap.t > 0 ? "Resume demo" : "Play demo session"}</>}</button>
                <div className="seg" role="radiogroup" aria-label="Playback speed">
                  {[4, 8, 16].map((s) => <button key={s} role="radio" aria-checked={cap.speed === s} onClick={() => setCap((c) => ({ ...c, speed: s }))}>{s}×</button>)}
                </div>
                <button className="btn" disabled={cap.done || !!cap.live} onClick={() => setCap((c) => runToEnd(c))}><FastForward size={14} aria-hidden /> Skip to end</button>
                <button className="btn" onClick={switchToRecorded}><RotateCcw size={14} aria-hidden /> {cap.live ? "Use the recorded session" : "Restart"}</button>
              </div>
              {stream ? <video ref={videoRef} autoPlay muted playsInline style={{ width: "100%", borderRadius: 8, border: "1px solid var(--line)" }} />
                : <Screen t={cap.t} off={cap.off} redact={settings.redact} />}
              <div>
                <div className="row"><span className="t-sec">Session time</span><TimeLink t={cap.t} /><span className="spacer" />
                  <span className="t-sec">{cap.live ? "live capture" : `${fmt(END_T)} total`}</span></div>
                <div className="scrub" aria-hidden>
                  <div className="scrub-track" /><div className="scrub-fill" style={{ width: `${Math.min(100, (cap.t / spanT) * 100)}%` }} />
                  {cap.offSegs.map((s, i) => <div key={i} className="scrub-off" style={{ left: `${(s.from / spanT) * 100}%`, width: `${(((s.to ?? cap.t) - s.from) / spanT) * 100}%` }} />)}
                  {cap.asked.map((a) => <div key={a.id} className={"scrub-q" + (a.type === "guardrail" ? " g" : "")} style={{ left: `${(a.t / spanT) * 100}%` }} />)}
                </div>
              </div>
              <div className="signals" aria-label="Activity signals">
                {cap.live
                  ? <div className={"signal" + (sig.screenActive ? " on" : "")}><span className="row strong"><MonitorUp size={13} aria-hidden /> Screen</span><span className="t-sec">{sig.screenActive ? "Changing, so the apprentice waits" : "Screen still"}</span></div>
                  : <div className={"signal" + (sig.typing ? " on" : "")}><span className="row strong"><Keyboard size={13} aria-hidden /> Typing</span><span className="t-sec">{sig.typing ? "Active, so the apprentice waits" : "Keyboard idle"}</span></div>}
                <div className={"signal" + (sig.reading ? " on" : "")}><span className="row strong"><BookOpen size={13} aria-hidden /> Reading</span><span className="t-sec">{sig.reading ? "Scrolling or reading" : "No reading detected"}</span></div>
                <div className={"signal" + (sig.speaking || sig.agent ? " on" : "")}><span className="row strong"><Mic size={13} aria-hidden /> Talking</span><span className="t-sec">{sig.agent ? "Apprentice speaking" : sig.speaking ? `${EXPERT.first} is talking` : "Silence"}</span></div>
                <div className={"signal" + (pause ? " pause" : "")}><span className="strong">{pause ? "Natural pause" : "Quiet time"}</span>
                  <span className="t-meta">voice {sig.voiceSilenceFor.toFixed(1)}/{QUESTION_GOVERNOR_POLICY.minVoiceSilence} s · input {sig.interactionIdleFor.toFixed(1)}/{QUESTION_GOVERNOR_POLICY.minInteractionIdle} s</span>
                  <div className="meter-bar"><i style={{ width: `${gateProgress * 100}%` }} /><s style={{ left: "100%" }} /></div></div>
              </div>
              {cap.live ? <LiveStatus cap={cap} voice={voiceActivity} visionOn={visionOn} />
                : <p className="t-sec">The recorded session feeds seeded keyboard, document-scroll and voice-silence signals into the production Question Governor. Start live capture to feed it your real microphone level, screen changes and redacted vision events instead; the gate is the same.</p>}
            </div>
          </Card>
        </div>

        <div className="stack">
          <LiveInterviewer
            sessionId={getApprenticeSessionId()}
            elapsedSeconds={cap.t}
            questionCount={cap.asked.length}
            offRecord={cap.off}
            slot={liveSlot}
            screenState={liveScreenState}
            onConnectionChange={setLiveVoiceConnected}
            onOffRecordChange={(active) => setCap((current) => current.off === active ? current : toggleOff(current, "voice command"))}
          />
          <section className={"card agent" + (cap.off ? " hatch" : "")} aria-live="polite" aria-label="Apprentice">
            <div className="agent-state" style={cap.off ? { color: "var(--text)" } : null}><StateIcon size={16} aria-hidden /> {state[1]}</div>
            {cap.agent === "asking" && <p className="agent-line">“{cap.agentLine}”</p>}
            {cap.agent === "idle" && <p className="t-sec" style={{ marginTop: 8 }}>Play the recorded session, or start live capture.</p>}
            {cap.agent === "done" && <p className="agent-line">{cap.agentLine}</p>}
            {cap.agent === "off" && <p className="t-sec" style={{ marginTop: 8 }}>Nothing is heard, seen or stored until {EXPERT.first} goes back on the record. Only the time span is kept.</p>}
            {(cap.agent === "holding" || cap.agent === "waiting") && cap.queue[0] && <p className="t-sec" style={{ marginTop: 8 }}>Held: “{cap.queue[0].q}”</p>}
            {cap.queue[0] && <p className="t-cap" style={{ marginTop: 8 }}>Governor: {GOVERNOR_REASON[cap.governor.reason] || cap.governor.reason}{cap.governor.trigger ? ` · trigger: ${GOVERNOR_TRIGGER[cap.governor.trigger]}` : ""}</p>}
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
                      <span className="t-sec">Governor gate opened</span>{isNew && <span className="new-tag badge">New</span>}</div>
                    <span className="strong">{a.q}</span>
                    <span className="t-sec">Triggered by: {a.eventText} at {fmt(a.eventT)}</span>
                    <button className="link" style={{ alignSelf: "flex-start" }} aria-expanded={open === a.id} onClick={() => setOpen(open === a.id ? null : a.id)}>{open === a.id ? "Hide reasoning" : "Why this question"}</button>
                    {open === a.id && <div className="inset stack x-tight t-sec">
                      <span>Governor score: {a.governorScore != null ? a.governorScore.toFixed(2) : "saved before scoring"} · trigger: {GOVERNOR_TRIGGER[a.trigger] || "legacy demo trigger"}.</span>
                      <span>Chosen because it asks for a reason or a limit the screen can't show after the voice, activity, scroll, cooldown and budget gates opened.</span>
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

function LiveStatus({ cap, voice, visionOn }) {
  const v = cap.vision || {};
  const avg = v.calls - v.errors > 0 ? Math.round(v.totalLatencyMs / (v.calls - v.errors)) : null;
  return (
    <div className="inset stack tight" aria-label="Live capture status">
      <div className="row"><strong>Live capture</strong><span className="spacer" />
        <span className="t-cap">{cap.done ? "ended" : cap.live.startedAt ? "running" : "interrupted by a reload; start a new live capture"}</span></div>
      <div className="row t-sec">
        <Mic size={13} aria-hidden /> Microphone level (measured here, never recorded or sent)
        <div className="meter-bar" style={{ flex: 1 }}><i style={{ width: `${Math.round(voice.level * 100)}%` }} /></div>
      </div>
      {voice.error && <p className="t-sec" style={{ color: "var(--critical)" }}>{voice.error}</p>}
      <p className="t-sec">
        {!visionOn && "Vision is off (NEXT_PUBLIC_ENABLE_VISION is not true). No screen events and so no live questions."}
        {visionOn && v.disabled && `Vision stopped: ${v.disabled}`}
        {visionOn && !v.disabled && `Vision: ${v.calls} frames sent through the redactor, ${v.events} events, ${v.errors} errors${avg != null ? `, ${avg} ms average round trip` : ""}${v.provider ? `, redactor ${v.provider}` : ""}. Frames are not stored.${v.lastError ? ` Last error: ${v.lastError}` : ""}`}
      </p>
    </div>
  );
}

/* Live sampling: every 2 s compare a tiny grayscale copy of the shared screen with the previous one.
   A change feeds the Governor's interaction signal. With vision on, a readable frame is also sent to
   /api/vision/extract, which redacts it server-side before the vision model sees it and stores nothing.
   Nothing leaves the browser except through that route. */
function useLiveSampler({ stream, videoRef, capRef, trackerRef, sessionId, visionOn, active, onEvents, onVision }) {
  const cbRef = useRef({ onEvents, onVision });
  useEffect(() => { cbRef.current = { onEvents, onVision }; });
  useEffect(() => {
    if (!stream || !active) return;
    let previous = null; let inflight = false; let lastVisionAt = -Infinity; let disabled = false; let lastLocalAt = -Infinity;
    const canvas = document.createElement("canvas");
    const out = document.createElement("canvas");
    const nowS = () => (performance.now() - (capRef.current.live?.startedAt ?? performance.now())) / 1000;
    const id = setInterval(() => {
      const v = videoRef.current;
      if (!v || !v.videoWidth) return;
      canvas.width = 48; canvas.height = 27;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.drawImage(v, 0, 0, canvas.width, canvas.height);
      const current = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let diff = 0;
      if (previous) {
        let delta = 0;
        for (let i = 0; i < current.length; i += 4) {
          delta += Math.abs(current[i] - previous[i]) + Math.abs(current[i + 1] - previous[i + 1]) + Math.abs(current[i + 2] - previous[i + 2]);
        }
        diff = delta / (canvas.width * canvas.height * 3 * 255);
      }
      previous = new Uint8ClampedArray(current);
      if (diff < LIVE_POLICY.screenChangeThreshold) return;
      const now = nowS();
      const off = capRef.current.off;
      if (!off) trackerRef.current.noteScreenChange(now);
      if (off) return;
      if (!visionOn) {
        if (now - lastLocalAt >= 10) {
          lastLocalAt = now;
          cbRef.current.onEvents([{ t: Number(now.toFixed(2)), type: "navigation", object: "Screen changed (vision is off; nothing was read)", confidence: 1, source: "app", local: true }]);
        }
        return;
      }
      if (inflight || disabled || now - lastVisionAt < LIVE_POLICY.visionMinIntervalS) return;
      const ratio = v.videoHeight / v.videoWidth || 9 / 16;
      out.width = 960; out.height = Math.max(1, Math.round(960 * ratio));
      out.getContext("2d")?.drawImage(v, 0, 0, out.width, out.height);
      const dataUrl = encodeReadableJpeg(out);
      const recent = capRef.current.events.filter((e) => e.raw).slice(-3).map((e) => `${e.raw.type}:${e.raw.object}`).join("; ");
      inflight = true; lastVisionAt = now;
      const started = performance.now();
      const t = Number(now.toFixed(2));
      sessionFetch(sessionId, "/api/vision/extract", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, frame_id: `live_${Math.round(now * 10)}`, t, data_url: dataUrl, previous_state: recent || undefined }),
      }).then(async (res) => {
        const latency = Math.round(performance.now() - started);
        const body = await res.json().catch(() => ({}));
        if (res.status === 503) {
          disabled = true;
          const why = `not configured${body.missing?.length ? " (" + body.missing.join(", ") + ")" : ""}`;
          cbRef.current.onVision((p) => ({ calls: (p?.calls || 0) + 1, errors: (p?.errors || 0) + 1, disabled: why }));
          return;
        }
        if (!res.ok) throw new Error(body.error || `status ${res.status}`);
        cbRef.current.onVision((p) => ({
          calls: (p?.calls || 0) + 1, events: (p?.events || 0) + (body.events?.length || 0),
          totalLatencyMs: (p?.totalLatencyMs || 0) + latency, lastLatencyMs: latency,
          redactions: (p?.redactions || 0) + (body.redaction?.redactions || 0), provider: body.redaction?.provider || p?.provider || null,
        }));
        // The frame may have been captured on the record and answered after the expert went off it.
        if (!capRef.current.off && body.events?.length) cbRef.current.onEvents(body.events);
      }).catch((err) => {
        cbRef.current.onVision((p) => ({ calls: (p?.calls || 0) + 1, errors: (p?.errors || 0) + 1, lastError: String(err?.message || err).slice(0, 140) }));
      }).finally(() => { inflight = false; });
    }, 2000);
    return () => clearInterval(id);
  }, [stream, active, visionOn, sessionId]); // eslint-disable-line
}

/* ============================= DEBRIEF ================================ */
function DebriefPage() {
  const { cap, setCap, gaps, setGaps, claims, setClaims, signed, buildWorkMap, workMapStatus, addQuote, ruleEvidence, claimText, ruleSources, go, voice, sel, announce } = useApp();
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
  async function signOff() {
    const built = await buildWorkMap();
    if (built) announce(`Teach-back confirmed. ${sel.claimsTotal} rules are verified and the Work Map was compiled.`);
    else announce("The Work Map could not be compiled. Review the session and try again.");
  }

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
                  <button className="btn capsule" disabled={!allClaims || workMapStatus === "building"} onClick={signOff} style={{ alignSelf: "flex-start" }}>{workMapStatus === "building" ? "Building Work Map…" : `Confirm teach-back as ${EXPERT.first}`}</button>
                  {workMapStatus === "error" && <p className="t-sec" role="status">Work Map build failed. The teach-back remains unsigned so it is safe to retry.</p>}
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
  const { signed, workMap, cap, ruleEvidence, claimText, ruleSources, go, mapStep, setMapStep, sel } = useApp();
  const mapSteps = STEPS.map((step) => {
    const built = workMap?.steps?.find((item) => item.id === step.n);
    return built ? {
      ...step,
      title: built.title,
      t: built.screen_moment?.t ?? step.t,
      decision: built.decision ?? step.decision,
      buildStatus: built.status,
    } : step;
  });
  const sel2 = mapSteps.find((s) => s.n === mapStep) || mapSteps[0];
  const stepVerified = (s) => s.rules.every((id) => ruleEvidence(id) === "verified");
  const guards = RULES.filter((r) => r.kind === "guardrail");
  const judg = mapSteps.filter((s) => s.judgment);
  const jump = (t) => { let best = mapSteps[0]; mapSteps.forEach((s) => { if (s.t <= t) best = s; }); setMapStep(best.n); };
  const selRules = sel2.rules.map((id) => RULE[id]);
  const reasonRules = selRules.filter((r) => r.kind !== "guardrail");
  const guardRules = selRules.filter((r) => r.kind === "guardrail");
  const scr = screenAt(sel2.t);

  return (
    <>
      <PageHead title="Work Map: from data room to IC memo"
        lede={`${mapSteps.length} steps, ${judg.length} judgment calls and ${guards.length} guardrails. Every step links to its moment on ${EXPERT.first}'s screen and to her own words.`}
        actions={<button className="btn capsule" onClick={() => go("teach")}>Teach this to {TRAINEE.first}</button>} />
      {!signed && <div className="notice pending" role="status"><Clock size={16} aria-hidden /><span>Draft: {sel.claimsTotal - sel.verified} of {sel.claimsTotal} rules aren't verified yet, and the tutor won't teach them. <button className="link" onClick={() => go("debrief")}>Finish the debrief</button></span></div>}
      {workMap && <div className="notice success inline" role="status"><Database size={16} aria-hidden /><span>Compiled from {cap.events.filter((event) => event.raw).length} captured events. {workMap.correction_count || 0} expert corrections are included.</span></div>}

      <div className="stack">
        <Card title="Session timeline" extra={<div className="row t-sec"><span>Square: judgment call</span><span>Dashed: proposed</span><span>Solid: verified</span></div>}>
          <div className="track">
            <div className="track-line" />
            {[0, 60, 120, 180, END_T].map((t) => <span key={t} className="track-tick" style={{ left: `${(t / END_T) * 100}%` }}>{fmt(t)}</span>)}
            {mapSteps.map((s) => (
              <button key={s.n} className={"track-m" + (stepVerified(s) ? " verified" : "") + (s.judgment ? " judg" : "")} aria-current={s.n === sel2.n ? "step" : undefined}
                style={{ left: `${(s.t / END_T) * 100}%` }} onClick={() => setMapStep(s.n)}
                aria-label={`Step ${s.n}: ${s.title}, ${fmt(s.t)}, ${stepVerified(s) ? "verified" : "proposed"}${s.judgment ? ", judgment call" : ""}`}>{s.n}</button>))}
          </div>
        </Card>

        <div className="grid g-map">
          <Card title="Steps">
            <ol className="steps">
              {mapSteps.map((s) => {
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
              <div className="row"><h2 className="t-decision">Step {sel2.n} of {mapSteps.length}: {sel2.title.toLowerCase()}</h2><span className="spacer" />
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
                <button className="btn compact" disabled={sel2.n === mapSteps.length} onClick={() => setMapStep(sel2.n + 1)}>Next step</button>
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
  const { teach, setTeach, isVerified, sel, fillDemo, go, voice, ruleSources, announce } = useApp();
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
    const order = ["acme-amendment-language", "relocation-recurrence", "capex-below-average"];
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
    v.filter((x) => !x.ink).forEach(() => pushMsg({ who: "tutor", kind: "general", text: `I'm not sure about this part. ${EXPERT.first} hasn't verified the rule, so I won't block you. Ask the deal team.` }));
    if (blocking.length) {
      setForm({ result: { ok: false, text: "Not saved. The tutor stopped this before the debt schedule ran." } });
      stop(blocking, "on save");
      return;
    }
    if (caseId === "rev") { setForm({ result: { ok: true, text: "Saved. Debt schedule running on adjusted EBITDA of $31.2M." } }); finish("Saved. Crestline is in at $110,000 ARR and the $4.0M relocation add-back is flagged for QoE."); announce("Inputs saved."); }
    if (caseId === "lbo") { setForm({ result: { ok: true, text: `IRR calculated: ${irrAt(form.capex)} over 5 years.` } }); finish(`The IRR runs on ${form.capex}% maintenance capex${form.escalated ? ", with the escalation queued" : ""}.`); announce("IRR calculated."); }
  }

  function escalate() {
    if (num(form.capex) < 3.0) {
      setForm({ escalated: true, result: { ok: true, text: "Escalation queued for the deal team · simulated." } });
      pushMsg({ who: "tutor", tone: "good", kind: "grounded", text: `Good. That's what ${EXPERT.first} does when management's capex is below history and nothing explains it. Run the model now; the escalation travels with it.`, rules: ["capex-below-average"] });
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
    : `Runs the debt schedule and 5-year IRR at ${form.capex || "?"}% maintenance capex (projected IRR ${irrAt(form.capex)}).`;

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
        <span className="t-sec">Tutor and expert evidence use English in this seeded demo.</span>
      </div>

      <div className="grid g-main">
        <Card title={`${TRAINEE.first}'s screen`} extra={<span className="t-sec">{c.stage}</span>}>
          <div className="stack">
            <div className="scr">
              <div className="scr-bar"><span>{TEACH_DEAL.code} data room</span><span>LBO model v3.xlsx, {TRAINEE.name}</span></div>
                <div className="wb">
                  <div className="wb-doc">
                    <div className="wb-h"><span>Data room</span><span>{form.opened.length} of {docs.length} opened</span></div>
                    <div className="doclist">
                      {docs.map((d) => <button key={d.id} aria-pressed={!!openDoc && openDoc.id === d.id} onClick={() => open(d.id)}>
                        <span>{d.name}</span>{form.opened.includes(d.id) && <span className="chg-tag" style={{ color: "var(--scr-text-2)" }}>Opened</span>}</button>)}
                    </div>
                    {openDoc ? <DocFace key={openDoc.id} file={openDoc} />
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
            </div>
            <p className="t-sec">Controlled demo workbench, so the tutor can hold the save. In the firm's Excel model, the same check runs in an add-in before the debt schedule refreshes.</p>
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

/* ======================= AGENT EXPORT (stretch) ======================= */
const STOP_TO = {
  "acme-amendment-language": "Send unclear contract language to legal",
  "customer-3-add-on": "Verify the add-on language before summing fees",
  "relocation-recurrence": "Send to QoE review with the invoices",
  "legal-fee-recurrence": "Send to QoE review with prior-year invoices",
  "capex-below-average": "Request support or escalate to QoE",
};

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

function useSystemReadiness() {
  const [readiness, setReadiness] = useState(null);
  const [readinessError, setReadinessError] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/system/readiness", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Readiness check failed");
        return response.json();
      })
      .then((payload) => { if (active) setReadiness(payload); })
      .catch(() => { if (active) setReadinessError(true); });
    return () => { active = false; };
  }, []);
  return { readiness, readinessError };
}

function TrustPage() {
  const { cap, settings, setSettings, struck, setStruck, ruleSources, quotes, askReset } = useApp();
  const { readiness, readinessError } = useSystemReadiness();
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
        lede={`${EXPERT.first} decides what's kept. She can go off the record at any time and strike her own words afterwards. Transcript redaction and frame handling have different readiness levels, shown below.`} />
      <Card title="Runtime truth" extra={readiness && <Badge tone={readiness.sensitive_data_ready ? "verified" : "pending"}>{readiness.sensitive_data_ready ? "Sensitive data ready" : "Synthetic data only"}</Badge>}>
        {readinessError && <p className="notice critical">The readiness endpoint could not be checked. Treat this run as synthetic-only.</p>}
        {!readiness && !readinessError && <p className="empty">Checking configured services…</p>}
        {readiness && <div className="stack tight">
          <p className="t-sec">The workflow logic is operational with fictional data. Sensitive-data use remains blocked until every production boundary is implemented and verified.</p>
          <div className="grid g2">
            {Object.entries(readiness.capabilities).map(([name, capability]) => (
              <div className="inset" key={name}>
                <div className="row"><strong>{name.replaceAll("_", " ")}</strong><span className="spacer" /><Badge tone={capability.state === "live" ? "verified" : capability.state === "demo" ? "pending" : "critical"}>{capability.state}</Badge></div>
                <p className="t-sec" style={{ marginTop: 4 }}>{capability.detail}</p>
              </div>
            ))}
          </div>
          {readiness.blockers.length > 0 && <details><summary className="link">Why sensitive data is blocked</summary><ul>{readiness.blockers.map((blocker) => <li className="t-sec" key={blocker}>{blocker}</li>)}</ul></details>}
        </div>}
      </Card>
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
            <p className="t-sec" style={{ marginBottom: 4 }}>This control previews the intended masking policy. The hosted Presidio boundary currently applies to transcript text only. Server-side frame redaction and vision extraction are not implemented, so Apprentice screen-share frames stay local.</p>
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
            <p className="t-sec" style={{ margin: "8px 0 12px" }}>The Apprentice page does not upload full video or shared-screen frames. The separate Deal Desk can retain sampled frames only after explicit opt-in. Data-room permission integration is not implemented.</p>
            <button className="btn" onClick={() => askReset("delete")}>Delete this session</button>
          </Card>
        </div>
      </div>
    </>
  );
}

/* ====================================================================
   LANDING PAGE STYLESHEET, built from DESIGN.md (v2). Scoped to .lp2 and
   only loaded on the landing page, so the dashboard keeps its own system.
==================================================================== */
const LP_CSS = `
.lp2{
  --page:#FDFCFC; --white:#FFFFFF; --cream:#F5F3F1;
  --g25:#FBFAF9; --g50:#FAF8F8; --g100:#F5F3F1; --g200:#EBE8E4; --g300:#D7D2CC; --g400:#A59F97;
  --g500:#777169; --g600:#59544F; --g700:#44403B; --g800:#292524; --g900:#1C1917; --n100:#E5E5E5;
  --frame:rgba(0,0,0,.05); --card-ring:rgba(0,0,0,.075); --icon-ring:rgba(0,0,0,.10);
  --focus:#2B7FFF;
  --code-keyword:#F41A2F; --code-ident:#0A59D2; --code-value:#052F70;
  --shadow-pill:0 0 1px rgba(0,0,0,.4),0 1px 1px rgba(0,0,0,.04),0 2px 4px rgba(0,0,0,.04);
  --shadow-bubble:0 0 0 .5px rgba(0,0,0,.08),0 1.677px 3.354px rgba(0,0,0,.04);
  --ring-card:inset 0 0 0 .5px rgba(0,0,0,.075); --ring-icon:inset 0 0 0 .5px rgba(0,0,0,.10); --ring-demo:inset 0 0 0 .5px #EBE8E4;
  --ease:cubic-bezier(.4,0,.2,1);
  --container-max:81.5rem; --og:20px;
  --px-d:1rem; --px-s:.5rem;
  --py-xs:1rem; --py-sm:1.5rem; --py-d:5rem; --py-xl:7.5rem;
  background:var(--page); color:#000; font-family:Inter,system-ui,sans-serif; -webkit-font-smoothing:antialiased;
  min-height:100vh; overflow-x:hidden; overflow-x:clip; color-scheme:light;
}
@media (min-width:640px){ .lp2{--og:40px; --py-sm:2.5rem; --py-d:7.5rem; --py-xl:10rem} }
@media (min-width:768px){ .lp2{--px-d:3rem; --px-s:1rem} }
@media (min-width:1280px){ .lp2{--og:64px} }
.lp2 *{box-sizing:border-box}
:where(.lp2) :is(h1,h2,h3,h4,p,ul,ol,figure,dl,dd,blockquote){margin:0}
:where(.lp2) :is(ul,ol){list-style:none;padding:0}
:where(.lp2) button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer;text-align:inherit}
.lp2 :focus-visible{outline:1.5px solid var(--focus);outline-offset:2px}
.l-sr{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}

/* ---- type ---- */
.l-display{font-family:var(--font-sans),Geist,'Inter Tight',Inter,system-ui,sans-serif;font-weight:300;text-wrap:balance}
.t6{font-size:36px;line-height:42px;letter-spacing:-.02em}
.t5{font-size:30px;line-height:36px}
.t4{font-size:26px;line-height:32px}
@media (min-width:640px){ .t6{font-size:48px;line-height:52px} .t5{font-size:36px;line-height:42px} .t4{font-size:32px;line-height:36px} }
.tb{font-size:16px;line-height:24px;letter-spacing:.01em}
.tsm{font-size:15px;line-height:22px;letter-spacing:.01em}
.txs{font-size:14px;line-height:21px;letter-spacing:.01em}
.txs-t{font-size:14px;line-height:18px;letter-spacing:.01em}
.lp2 p{text-wrap:pretty}
.mu{color:var(--g500)}
.fw5{font-weight:500}

/* ---- layout ---- */
.l-container{width:calc(min(100%, var(--container-max)) - 2*var(--og));margin-inline:auto;position:relative}
.l-framed{border-inline:1px solid var(--frame)}
.l-rule{position:absolute;top:0;left:-100vw;right:-100vw;height:1px;background:var(--frame);pointer-events:none}
.l-dot{position:absolute;z-index:20;width:20px;height:20px;display:flex;align-items:center;justify-content:center;border-radius:9999px;pointer-events:none}
.l-dot::before{content:"";width:2px;height:2px;border-radius:9999px;background:#000}
.l-dot.tl{left:0;top:0;transform:translate(-50%,-50%)} .l-dot.tr{right:0;top:0;transform:translate(50%,-50%)}
.l-dot.bl{left:0;bottom:0;transform:translate(-50%,50%)} .l-dot.br{right:0;bottom:0;transform:translate(50%,50%)}
.px-d{padding-inline:var(--px-d)} .px-s{padding-inline:var(--px-s)}
.pt-xl{padding-top:var(--py-xl)} .pt-d{padding-top:var(--py-d)} .pt-sm{padding-top:var(--py-sm)}
.pb-sm{padding-bottom:var(--py-sm)} .pb-d{padding-bottom:var(--py-d)} .pb-xs{padding-bottom:var(--py-xs)}

/* ---- title block: 12-col, 6/6 at lg ---- */
.l-title{display:flex;flex-direction:column;position:relative}
.l-title .head{order:1}
.l-title .lead{order:2;margin-top:32px;max-width:42rem;display:flex;flex-direction:column}
.l-title .cta{order:3;margin-top:32px;display:flex;flex-wrap:wrap;gap:8px}
.l-eyebrow{font-size:15px;line-height:22px;letter-spacing:.01em;font-weight:500;color:var(--g500);margin-bottom:28px}
@media (min-width:1024px){
  .l-title{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));column-gap:48px;grid-template-rows:auto 1fr}
  .l-title .head{grid-column:1/span 6;grid-row:1}
  .l-title .cta{grid-column:1/span 6;grid-row:2}
  .l-title .lead{grid-column:7/span 6;grid-row:1/span 2;margin-top:0}
  .l-title .right-btn{position:absolute;right:0;top:0;margin-top:0}
}
.l-title .right-btn{margin-top:32px}

/* ---- buttons: all pills ---- */
.l-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border-radius:9999px;white-space:nowrap;font-family:Inter,system-ui,sans-serif;font-weight:400;line-height:1;
  transition:background-color .15s var(--ease),color .15s var(--ease),box-shadow .15s var(--ease),border-color .15s var(--ease)}
.l-btn:active{transform:scale(.98)}
.l-p{background:#000;color:#fff}
.l-s{background:#fff;color:#000;box-shadow:var(--shadow-pill)}
@media (hover:hover){ .l-p:hover{background:#44403B} .l-s:hover{background:var(--g25)} }
.h8{height:32px;padding:0 12px;font-size:13px} .h9{height:36px;padding:0 14px;font-size:14px}
.h10{height:40px;padding:0 16px;font-size:15px} .h11{height:44px;padding:0 20px;font-size:16px}
.l-ibtn{width:40px;height:40px;padding:0} .l-ibtn.sm{width:32px;height:32px}
.l-line1{display:inline}
@media (min-width:640px){ .l-line1{white-space:nowrap} }
.l-p:disabled{background:var(--g400);cursor:default}

/* ---- announcement bar + sheet notches ---- */
.l-ann{position:relative;z-index:50;display:flex;align-items:center;justify-content:center;gap:16px;height:48px;padding:8px 16px;background:var(--cream)}
.l-ann .notch{position:absolute;bottom:-20px;width:20px;height:22px;color:var(--cream);pointer-events:none}
.l-ann .notch.l{left:0} .l-ann .notch.r{right:0;transform:scaleX(-1)}
.l-ann .msg{color:var(--g600)} .l-ann .msg b{font-weight:400;color:#000}
.l-ann .more{display:none}
@media (min-width:768px){ .l-ann .more{display:inline} }

/* ---- main nav + sticky header ---- */
.l-nav{position:relative;z-index:50;display:flex;align-items:center;height:64px;column-gap:28px}
@media (min-width:1280px){ .l-nav{column-gap:36px} }
.l-logo{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 12px;margin:0 -12px;border-radius:9999px;font-family:var(--font-sans),Geist,Inter,sans-serif;font-weight:500;font-size:17px;letter-spacing:-.01em}
.l-mark{width:20px;height:20px;border-radius:6px;background:#000;color:#fff;display:grid;place-items:center}
.l-links{display:none}
@media (min-width:1024px){ .l-links{display:flex} }
.l-links button{display:block;height:36px;padding:8px 12px;border-radius:9999px;font-size:14px;line-height:20px;transition:background-color .15s var(--ease)}
@media (hover:hover){ .l-links button:hover{background:rgba(41,37,36,.05)} }
.l-nav-right{margin-left:auto;display:flex;gap:8px;align-items:center}
.l-burger{display:inline-flex;width:36px;height:36px;align-items:center;justify-content:center;border-radius:9999px}
@media (min-width:1024px){ .l-burger{display:none} }
.l-hide-sm{display:none} @media (min-width:640px){ .l-hide-sm{display:inline-flex} }
.l-menu{position:absolute;right:0;top:60px;z-index:60;min-width:220px;padding:6px;border-radius:24px;background:#fff;box-shadow:var(--shadow-pill),var(--ring-card);animation:l-pop .15s var(--ease)}
.l-menu button{display:flex;width:100%;height:40px;align-items:center;padding:0 14px;border-radius:9999px;font-size:14px}
.l-menu button:hover,.l-menu button:focus{background:rgba(41,37,36,.05);outline:none}
.l-menu button:focus-visible{outline:1.5px solid var(--focus);outline-offset:-2px}
@keyframes l-pop{from{opacity:0;transform:translateY(-4px) scale(.98)}to{opacity:1;transform:none}}
.l-sticky{position:fixed;top:0;left:0;right:0;z-index:9998;height:64px;background:#fff;display:flex;align-items:center;visibility:hidden;transform:translateY(-100%);transition:transform .3s var(--ease),visibility .3s}
.l-sticky.on{visibility:visible;transform:translateY(0)}
.l-skip{position:absolute;left:16px;top:8px;z-index:9999;transform:translateY(-200%)}
.l-skip:focus{transform:none}

/* ---- hero demo panel ---- */
.l-panel-wrap{position:relative;isolation:isolate;width:100%;margin-top:80px}
@media (min-width:848px){ .l-panel-wrap{margin-top:64px} }
.l-panel{position:relative;isolation:isolate;margin-inline:-1px;background:var(--cream);border-radius:24px;display:grid;column-gap:64px;padding:0 16px;
  grid-template-columns:minmax(0,1fr) auto;grid-template-rows:auto 1fr auto;min-height:558px}
@media (min-width:640px){ .l-panel{padding:0 32px} }
@media (min-width:848px){ .l-panel{grid-template-columns:auto minmax(0,1fr);height:558px} }
@media (min-width:1024px){ .l-panel{grid-template-columns:minmax(0,1fr) auto minmax(0,1fr)} }
.l-ring{position:absolute;inset:0;z-index:30;border-radius:inherit;pointer-events:none;box-shadow:var(--ring-card)}
.l-rail{position:absolute;left:0;width:100%;bottom:100%;z-index:40}
.l-rail-in{position:relative;overflow:hidden;border-radius:24px 24px 0 0;background:var(--cream);padding:6px 6px 20px;transform:translateY(20px)}
.l-rail-tint{position:absolute;inset:0;background:rgba(0,0,0,.01)}
.l-rail-seam{position:absolute;left:0;right:0;bottom:0;height:20px;background:var(--cream)}
.l-rail-ring{position:absolute;left:0;right:0;top:0;bottom:-1px;border-radius:24px 24px 0 0;border:.5px solid var(--card-ring);border-bottom:0;pointer-events:none}
.l-tabs{position:relative;z-index:1;display:grid;grid-auto-columns:minmax(0,1fr);grid-auto-flow:column;height:44px}
.l-tab{position:relative;isolation:isolate;display:flex;align-items:center;justify-content:center;gap:6px;border-radius:14px;color:var(--g700);font-size:16px;line-height:24px;letter-spacing:.01em}
.l-tab .hov{position:absolute;inset:0;z-index:-10;border-radius:14px;background:var(--g200);opacity:0;transition:opacity .15s var(--ease)}
.l-tab .act{position:absolute;inset:2px;z-index:-10;border-radius:14px;background:#fff;box-shadow:var(--shadow-pill);opacity:0;
  transition:inset .3s cubic-bezier(.16,1,.3,1),opacity .3s cubic-bezier(.16,1,.3,1)}
.l-tab[aria-selected="true"]{color:#000}
.l-tab[aria-selected="true"] .act{inset:0;opacity:1}
@media (hover:hover){ .l-tab:hover{color:#000} .l-tab:hover .hov{opacity:1} }
.l-tab .lbl{display:none} @media (min-width:640px){ .l-tab .lbl{display:inline} }
.l-tdot{width:12px;height:12px;border-radius:9999px;overflow:hidden;position:relative;flex:none}
.l-content{grid-column:1/-1;grid-row:2;display:flex;align-items:center;justify-content:center;padding:40px 0 24px;min-width:0;animation:l-fade 1s ease}
@keyframes l-fade{from{opacity:0}to{opacity:1}}
.l-pnav{grid-row:3;grid-column:1;align-self:center;padding-bottom:24px;min-width:0}
.l-pcta{grid-row:3;grid-column:2;justify-self:end;align-self:center;padding-bottom:24px}
@media (min-width:1024px){ .l-pnav{grid-column:2} .l-pcta{grid-column:3} }
.l-seg{display:flex;flex-wrap:wrap;border-radius:9999px}
.l-seg button{position:relative;isolation:isolate;height:40px;padding:0 16px;border-radius:9999px;color:var(--g700);font-size:16px;line-height:24px;letter-spacing:.01em}
.l-seg button::before{content:"";position:absolute;inset:0;z-index:-10;border-radius:9999px;background:var(--g200);opacity:0;transition:opacity .15s var(--ease)}
@media (hover:hover){ .l-seg button:hover{color:#000} .l-seg button:hover::before{opacity:1} }
@media (max-width:847px){ .l-pnav .l-seg{display:none} }

/* orb carousel */
.l-carousel{position:relative;width:calc(100% + 48px);margin:0 -24px;overflow:hidden;padding-top:4px}
.l-orbs{position:relative;height:256px}
.l-orb{position:absolute;left:50%;top:0;width:256px;height:256px;border-radius:9999px;transform-origin:center top;transition:transform 360ms ease,opacity 360ms ease}
.l-orb .art{position:absolute;inset:0;border-radius:9999px;overflow:hidden;isolation:isolate;box-shadow:inset 0 0 0 .5px rgba(0,0,0,.01)}
.l-orb .hring{position:absolute;inset:-4px;border-radius:9999px;border:4px solid var(--g200);opacity:0;transform:scale(.985);transition:opacity .2s var(--ease),transform .2s var(--ease);pointer-events:none}
@media (hover:hover){ .l-orb:hover .hring{opacity:1;transform:scale(1)} }
.l-orb:focus-visible{outline-offset:6px}
.l-play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:48px;height:48px;border-radius:9999px;background:#fff;display:grid;place-items:center;color:#000;box-shadow:var(--shadow-pill);z-index:5}
@media (hover:hover){ .l-play:hover{color:var(--g600)} }
.l-efade{position:absolute;top:0;bottom:0;width:176px;z-index:10;pointer-events:none;display:none}
.l-efade.l{left:0;background:linear-gradient(to right,var(--cream),transparent)} .l-efade.r{right:0;background:linear-gradient(to left,var(--cream),transparent)}
@media (min-width:768px){ .l-efade{display:block} }
.l-caps{display:grid;grid-template-columns:40px minmax(0,1fr) 40px;align-items:center;gap:16px;margin:36px auto 0;max-width:340px;text-align:center}
@media (min-width:768px){ .l-caps{grid-template-columns:minmax(0,1fr) 40px minmax(0,260px) 40px minmax(0,1fr);max-width:900px} }
.l-caps .side{display:none}
@media (min-width:768px){ .l-caps .side{display:block} }
.l-caps .side .tt{color:var(--g500)} .l-caps .side .dd{color:var(--g400)}

/* demo cards */
.l-demo{position:relative;width:100%;max-width:640px;background:#fff;border-radius:24px;box-shadow:var(--ring-demo)}
.l-demo .body{padding:20px 24px}
.l-demo .foot{display:flex;align-items:center;gap:8px;padding:0 12px 12px 24px}
.l-row{display:flex;justify-content:space-between;gap:16px;padding:10px 0;border-bottom:1px solid var(--g200);font-size:15px;line-height:22px}
.l-row:last-child{border-bottom:0}
.l-chip{display:inline-flex;align-items:center;gap:4px;height:24px;padding:0 10px;border-radius:9999px;background:var(--cream);font-size:12px;line-height:12px;font-weight:500;color:#000}
.l-chat{width:100%;max-width:37rem;display:flex;flex-direction:column}
.l-bub{align-self:flex-start;max-width:30rem;background:#fff;color:#000;border-radius:20px;padding:10px 14px;box-shadow:var(--shadow-bubble);font-size:14px;line-height:20px;font-weight:500;margin-top:8px}
.l-bub.last{border-radius:7px 22px 22px 22px}
.l-bub.me{align-self:flex-end;background:transparent;box-shadow:inset 0 0 0 1px rgba(0,0,0,.15);border-radius:9999px}
.l-typing{display:inline-flex;gap:4px;padding:14px;background:#fff;border-radius:20px;box-shadow:var(--shadow-bubble);margin-top:8px;align-self:flex-start}
.l-typing i{width:6px;height:6px;border-radius:9999px;background:var(--g500);animation:typing-dot-bounce 1.24s var(--ease) infinite}
.l-typing i:nth-child(2){animation-delay:.12s} .l-typing i:nth-child(3){animation-delay:.24s}
@keyframes typing-dot-bounce{0%,58%,100%{opacity:.6;transform:translateY(0)}28%{opacity:.6;transform:translateY(-3px)}}

/* art + noise */
.l-noise{position:absolute;inset:0;z-index:1;mix-blend-mode:overlay;opacity:.35;pointer-events:none;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 .9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");background-size:256px}
.orb-1{background:radial-gradient(circle at 35% 30%,#FFD2A8,transparent 40%),radial-gradient(circle at 60% 70%,#E2401C,transparent 60%),#F27A1A}
.orb-2{background:radial-gradient(circle at 30% 30%,#E9B7F0,transparent 45%),radial-gradient(circle at 70% 60%,#7C8BF5,transparent 55%),#B98CE6}
.orb-3{background:radial-gradient(circle at 40% 30%,#C8D9CC,transparent 50%),#9DB3A5}
.orb-4{background:radial-gradient(circle at 35% 35%,#8E6A5E,transparent 50%),radial-gradient(circle at 70% 70%,#C07A70,transparent 55%),#4A3530}
.art-fill{position:absolute;inset:0}

/* tool wall */
.l-wall{display:grid;width:fit-content;margin:0 auto;grid-template-columns:repeat(2,minmax(0,148px));gap:24px 20px}
@media (min-width:640px){ .l-wall{grid-template-columns:repeat(4,minmax(0,148px));column-gap:56px;row-gap:32px} }
.l-wall li{height:26px;display:flex;align-items:center;justify-content:center;font-family:var(--font-sans),Geist,Inter,sans-serif;font-weight:500;font-size:16px;letter-spacing:-.01em;color:rgba(0,0,0,.3);white-space:nowrap;transition:color .15s var(--ease)}
@media (hover:hover){ .l-wall li:hover{color:#000} }

/* product duo */
.l-duo{display:grid;grid-template-columns:minmax(0,1fr);row-gap:16px}
.l-duo .cap{max-width:16rem}
.l-duo .bg,.l-duo .dring{display:none}
.l-duo .cap h3{font-size:16px;line-height:24px;letter-spacing:.01em;font-weight:500}
.l-duo .cap p{margin-top:16px}
.l-shot{position:relative;background:var(--cream);border-radius:24px;padding:36px 24px 0;overflow:hidden;box-shadow:var(--ring-card)}
.l-frame{border:.5px solid var(--card-ring);border-bottom:0;border-radius:16px 16px 0 0;background:#fff;overflow:hidden;min-height:220px}
.l-frame-bar{display:flex;justify-content:space-between;gap:8px;padding:10px 16px;border-bottom:1px solid var(--g200);font-size:12px;line-height:16px;color:var(--g500)}
.l-frame .rows{padding:8px 16px 24px}
.l-docline{padding:8px 12px;margin-top:8px;border-left:2px solid #000;background:var(--g50);font-size:14px;line-height:21px}
@media (min-width:768px){
  .l-duo{grid-template-columns:2fr 1fr 2fr;row-gap:44px;padding:12px 32px 0;border-radius:0 0 24px 24px;overflow:hidden;isolation:isolate}
  .l-duo .cap.a{grid-column:1;grid-row:1} .l-duo .cap.b{grid-column:3;grid-row:1}
  .l-duo .bg{display:block;grid-column:1/-1;grid-row:2;background:var(--cream);border-radius:24px;height:440px}
  .l-duo .dring{display:block;grid-column:1/-1;grid-row:2;border-radius:24px;box-shadow:var(--ring-card);z-index:50;pointer-events:none}
  .l-shot{grid-row:2;background:transparent;box-shadow:none;border-radius:0;padding:36px 0 0;height:440px;transition:all .5s var(--ease);
    -webkit-mask-size:200% 100%;mask-size:200% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}
  .l-shot .l-frame{height:100%}
  .l-shot.a{grid-column:1/3;margin-left:32px;-webkit-mask-image:linear-gradient(to right,#fff 75%,transparent 83.33%);mask-image:linear-gradient(to right,#fff 75%,transparent 83.33%)}
  .l-shot.b{grid-column:2/4;margin-right:32px;-webkit-mask-image:linear-gradient(to left,#fff 75%,transparent 83.33%);mask-image:linear-gradient(to left,#fff 75%,transparent 83.33%)}
  .l-shot.a.front{z-index:1;transform:translateY(0);-webkit-mask-position:50% 0;mask-position:50% 0}
  .l-shot.a.back{z-index:0;transform:translateY(12px);-webkit-mask-position:100% 0;mask-position:100% 0}
  .l-shot.b.front{z-index:1;transform:translateY(0);-webkit-mask-position:50% 0;mask-position:50% 0}
  .l-shot.b.back{z-index:0;transform:translateY(12px);-webkit-mask-position:0 0;mask-position:0 0}
}

/* bento cards */
.l-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:16px}
.l-c4{grid-column:span 12} @media (min-width:640px){ .l-c4{grid-column:span 6} } @media (min-width:1024px){ .l-c4{grid-column:span 4} }
.l-card{position:relative;isolation:isolate;height:100%}
.l-card-in{position:relative;isolation:isolate;height:100%;overflow:hidden;border-radius:24px;background:var(--cream)}
.l-card-col{position:relative;display:flex;flex-direction:column;justify-content:space-between;height:100%;min-height:248px;padding:20px 20px 24px}
@media (min-width:640px){ .l-card-col{padding:28px 28px 32px} }
.l-ico{width:40px;height:40px;border-radius:10px;box-shadow:var(--ring-icon);display:flex;align-items:center;justify-content:center;margin-bottom:64px}
.l-card h3{font-size:15px;line-height:22px;letter-spacing:.01em;color:var(--g500)}
.l-card h3 button{display:inline-flex;align-items:center;gap:6px}
.l-card h3 .arr{opacity:0;transition:opacity .15s var(--ease)}
@media (hover:hover){ .l-card:hover h3 .arr{opacity:1} }
.l-card h3 .cover{position:absolute;inset:0;z-index:10;border-radius:24px}
.l-card .desc{margin-top:18px;font-size:15px;line-height:22px;letter-spacing:.01em;color:#000}
.l-card-ring{position:absolute;inset:0;z-index:30;border-radius:24px;pointer-events:none;box-shadow:var(--ring-card)}

/* safety cards: scroll-snap below lg, 3-up at lg */
.l-snap{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding-bottom:4px}
.l-snap::-webkit-scrollbar{display:none}
.l-snap > *{flex:none;width:min(370px,85%);scroll-snap-align:start}
@media (min-width:1024px){ .l-snap{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));overflow:visible} .l-snap > *{width:auto} }
.l-safe .l-card-col{min-height:449px;padding-top:32px;justify-content:flex-start}
.l-safe .art{width:202px;height:202px;margin:16px auto 48px}
@media (min-width:640px){ .l-safe .art{margin:32px auto 56px} }
@media (min-width:1280px){ .l-safe .art{margin:48px auto 72px} }
.l-safe h3{font-size:16px;line-height:24px;color:#000}
.l-safe .desc{color:var(--g500)}

/* CTA band */
.l-band{border-block:1px solid var(--frame)}
.l-band-in{display:flex;flex-direction:column;gap:32px 64px;padding:72px 16px}
@media (min-width:768px){ .l-band-in{padding:72px 48px} }
@media (min-width:1024px){ .l-band-in{flex-direction:row;align-items:flex-end} }
.l-band-in .t4{flex:auto;margin:auto 0;text-align:center}
@media (min-width:1024px){ .l-band-in .t4{text-align:left} }
.l-band-in .btns{display:flex;flex-wrap:wrap;justify-content:center;gap:12px 8px}

/* footer */
.l-foot{margin-top:64px;padding-bottom:128px;display:grid;grid-template-columns:minmax(0,1fr);gap:64px 24px}
@media (min-width:1024px){ .l-foot{grid-template-columns:repeat(4,minmax(0,1fr))} }
.l-foot-groups{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:40px 16px}
@media (min-width:640px){ .l-foot-groups{grid-template-columns:repeat(3,minmax(0,1fr));column-gap:24px} }
@media (min-width:1024px){ .l-foot-groups{grid-column:span 3} }
.l-foot h4{font-size:14px;line-height:21px;letter-spacing:.01em;font-weight:400;color:var(--g500)}
.l-foot ul{margin-top:3px}
.l-foot li button{display:flex;align-items:center;height:28px;padding:0 6px;margin:0 -6px;border-radius:4px;font-size:14px;color:var(--g700);transition:color .15s var(--ease)}
@media (hover:hover){ .l-foot li button:hover{color:#000} }

/* floating voice pill */
.l-voice{position:fixed;bottom:16px;left:16px;right:16px;z-index:50;display:flex;justify-content:center;pointer-events:none}
@media (min-width:640px){ .l-voice{justify-content:flex-end} }
.l-voice button{pointer-events:auto;position:relative;isolation:isolate;display:flex;align-items:center;height:48px;padding:0 20px 0 48px;border-radius:28px;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.15);font-size:15px}
@media (min-width:640px){ .l-voice button{height:56px;padding-left:56px} }
.l-voice .vorb{position:absolute;left:10px;top:50%;width:28px;height:28px;margin-top:-14px;border-radius:9999px;overflow:hidden;
  background:radial-gradient(circle at 30% 30%,#8FD3FF,transparent 50%),radial-gradient(circle at 70% 70%,#2FBF8F,transparent 55%),#2A7BD8}
@media (min-width:640px){ .l-voice .vorb{width:36px;height:36px;margin-top:-18px;left:10px} }

/* ---- Redline: type accents ---- */
.x-red{background-image:linear-gradient(#F41A2F,#F41A2F);background-repeat:no-repeat;background-size:100% 2px;background-position:0 94%;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.x-b{font-weight:500;color:#000}
.x-hl{background:linear-gradient(transparent 45%,#FFE3A3 45%);padding:0 2px;color:#000}
.x-num{font-variant-numeric:tabular-nums}
.l-mark svg{display:block}

/* ---- Redline: colour frames built from the orb gradients ---- */
.g-sky{background:radial-gradient(circle at 30% 30%,#8FD3FF,transparent 50%),radial-gradient(circle at 70% 70%,#2FBF8F,transparent 55%),#2A7BD8}
.g-dawn{background:radial-gradient(circle at 15% 25%,#FFD2A8,transparent 40%),radial-gradient(circle at 85% 75%,#B98CE6,transparent 55%),radial-gradient(circle at 55% 50%,#F27A1A,transparent 60%),#E9A6C8}
.g-sunset{background:radial-gradient(circle at 12% 18%,#FFD2A8,transparent 38%),radial-gradient(circle at 88% 22%,#F27A1A,transparent 45%),radial-gradient(circle at 70% 95%,#7C8BF5,transparent 50%),radial-gradient(circle at 25% 85%,#E9B7F0,transparent 45%),#F0A98C}
.x-frame{position:relative;isolation:isolate;overflow:hidden;border-radius:24px;box-shadow:var(--ring-card);height:100%}
.x-frame > .art-fill{z-index:0} .x-frame > .l-noise{z-index:1}
.x-frame > .x-in{position:relative;z-index:2;display:flex;flex-direction:column;height:100%;padding:16px}
.x-float{background:#fff;border-radius:16px;box-shadow:var(--shadow-bubble);padding:18px 20px;margin-top:auto}
.x-float h3{font-size:16px;line-height:24px;font-weight:500;color:#000}
.x-float p{margin-top:6px}
.x-float h3 button{display:inline-flex;align-items:center;gap:6px}
.x-float h3 .arr{opacity:0;transition:opacity .15s var(--ease)}
@media (hover:hover){ .x-frame:hover .x-float h3 .arr{opacity:1} }
.x-float h3 .cover{position:absolute;inset:0;z-index:10;border-radius:24px}
.x-chip{align-self:flex-start;display:inline-flex;align-items:center;gap:6px;min-height:28px;padding:4px 12px;border-radius:14px;background:rgba(255,255,255,.9);font-size:13px;line-height:18px;font-weight:500;color:#000;box-shadow:var(--shadow-pill)}
.x-orb{position:relative;display:block;width:36px;height:36px;border-radius:9999px;overflow:hidden;isolation:isolate;flex:none}
.x-stat{font-family:var(--font-sans),Geist,Inter,sans-serif;font-weight:300;font-size:56px;line-height:56px;letter-spacing:-.02em;color:#000;margin-bottom:10px}
.x-tall{min-height:340px} .x-taller{min-height:380px}

/* ---- Redline: what it catches ---- */
.x-catch{position:relative;isolation:isolate;overflow:hidden;border-radius:24px;box-shadow:var(--ring-card);padding:16px}
@media (min-width:768px){ .x-catch{padding:40px} }
.x-catch > .art-fill{z-index:0} .x-catch > .l-noise{z-index:1}
.x-catch-in{position:relative;z-index:2;display:grid;grid-template-columns:minmax(0,1fr);gap:16px}
@media (min-width:900px){ .x-catch-in{grid-template-columns:minmax(0,1.05fr) minmax(0,1fr)} }
.x-win{background:#fff;border-radius:16px;box-shadow:var(--shadow-bubble);overflow:hidden}
.x-win-bar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:12px 16px;border-bottom:1px solid var(--g200);font-size:12px;line-height:16px;color:var(--g500)}
.x-win-bar b{font-weight:500;color:#000;font-size:13px}
.x-win .rows{padding:4px 16px 12px}
.x-mrow{display:grid;grid-template-columns:22px minmax(0,1fr) auto;align-items:center;gap:10px;padding:12px 0;border-bottom:1px solid var(--g200);font-size:14px;line-height:20px}
.x-mrow:last-child{border-bottom:0}
.x-mrow .vals{display:flex;align-items:center;gap:8px;white-space:nowrap}
@media (max-width:640px){ .x-mrow{grid-template-columns:22px minmax(0,1fr);row-gap:6px} .x-mrow .vals{grid-column:2} }
.x-was{color:var(--g500);text-decoration:line-through;text-decoration-color:#F41A2F;text-decoration-thickness:2px}
.x-fix{display:inline-flex;align-items:center;height:24px;padding:0 9px;border-radius:9999px;background:#FDE8EA;color:#B3121F;font-weight:500;font-size:13px}
.x-n{width:22px;height:22px;border-radius:9999px;display:grid;place-items:center;font-size:11px;font-weight:500;color:#fff;background:#000}
.x-n.sum{background:var(--g300);color:#000}
.x-note{grid-column:2/-1;margin-top:-4px;font-size:12px;line-height:16px;color:var(--g500)}
.x-doc{display:grid;grid-template-columns:22px minmax(0,1fr);gap:10px;padding:12px 0;border-bottom:1px solid var(--g200)}
.x-doc:last-child{border-bottom:0}
.x-doc .src{font-size:12px;line-height:16px;color:var(--g500)}
.x-doc .src b{font-weight:500;color:var(--g700)}
.x-doc .q{margin-top:4px;padding:6px 10px;border-left:2px solid #000;background:var(--g50);font-size:14px;line-height:21px}
.x-tutor{grid-column:1/-1;display:flex;flex-wrap:wrap;align-items:center;gap:10px}
.x-tutor .l-bub{margin-top:0;max-width:none;flex:1;min-width:240px;font-weight:400;font-size:15px;line-height:22px;padding:12px 16px;border-radius:7px 22px 22px 22px}
.x-tutor .l-bub b{font-weight:500}
.x-block{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:9999px;background:#000;color:#fff;font-size:13px}
.x-block i{width:8px;height:8px;border-radius:9999px;background:#F41A2F}
.x-delta{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 10px;margin-bottom:14px}
.x-delta .from{font-size:18px;line-height:24px;color:var(--g500);text-decoration:line-through;text-decoration-color:#F41A2F;text-decoration-thickness:2px}
.x-delta .to{font-family:var(--font-sans),Geist,Inter,sans-serif;font-weight:400;font-size:34px;line-height:38px;letter-spacing:-.02em;color:#000}
.x-delta .arrow{color:var(--g400);font-size:16px}
.x-src{margin-top:12px;padding-top:12px;border-top:1px solid var(--g200);font-size:12px;line-height:16px;color:var(--g500)}
.x-src b{font-weight:500;color:var(--g700)}

/* ---- Redline: proof flow, why-now list, faq ---- */
.x-flow{position:relative;isolation:isolate;overflow:hidden;display:grid;grid-template-columns:minmax(0,1fr);gap:12px;border-radius:24px;padding:16px;box-shadow:var(--ring-card)}
@media (min-width:900px){ .x-flow{grid-template-columns:repeat(4,minmax(0,1fr));padding:24px} }
.x-flow > .art-fill{z-index:0} .x-flow > .l-noise{z-index:1}
.x-flow > .x-chip,.x-flow > .x-step{position:relative;z-index:2}
.x-flow > .x-chip{grid-column:1/-1}
.x-step{background:#fff;border-radius:16px;box-shadow:var(--ring-demo);padding:20px;display:flex;flex-direction:column;min-height:190px}
.x-step .lbl{font-size:12px;color:var(--g500)}
.x-step h3{font-size:16px;line-height:24px;font-weight:500;margin-top:40px}
.x-step p{margin-top:6px}
.x-step.warn{box-shadow:inset 0 0 0 1px #F27A1A}
.x-step.dark{background:#000;color:#fff} .x-step.dark .lbl,.x-step.dark .mu{color:var(--g400)}
.x-quote{margin-top:12px;padding:8px 12px;border-left:2px solid #000;background:var(--g50);font-size:14px;line-height:21px}
.x-list{display:grid;grid-template-columns:minmax(0,1fr);border-top:1px solid var(--g200);margin-top:56px}
@media (min-width:768px){ .x-list{grid-template-columns:repeat(2,minmax(0,1fr));column-gap:48px} }
.x-item{display:grid;grid-template-columns:40px minmax(0,1fr);gap:8px;padding:28px 0;border-bottom:1px solid var(--g200)}
.x-item h3{font-size:16px;line-height:24px;font-weight:500}
.x-item p{margin-top:8px}
.x-faq{border-top:1px solid var(--g200);margin-top:40px}
.x-faq details{border-bottom:1px solid var(--g200);padding:22px 0}
.x-faq summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;gap:24px;font-family:var(--font-sans),Geist,Inter,sans-serif;font-weight:400;font-size:20px;line-height:28px;letter-spacing:-.01em}
.x-faq summary::-webkit-details-marker{display:none}
.x-faq summary::after{content:"+";color:var(--g400);font-weight:300}
.x-faq details[open] summary::after{content:"–"}
.x-faq details p{margin-top:12px;max-width:44rem}
.x-cluster{display:flex;justify-content:center}
.x-cluster .x-orb{width:44px;height:44px;margin-left:-10px;box-shadow:0 0 0 3px var(--page)}
.x-cluster .x-orb:first-child{margin-left:0}

/* ---- Redline: trust carousel ---- */
.x-car{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding-bottom:4px}
.x-car::-webkit-scrollbar{display:none}
.x-car > .l-card{flex:none;width:min(360px,85%);scroll-snap-align:start}
.x-car .l-card-col{min-height:470px}
.x-halo{position:relative;width:202px;height:202px;margin:12px auto 36px}
.x-halo .glow{position:absolute;inset:14px;border-radius:9999px;overflow:hidden;isolation:isolate;opacity:.5}
.lp2 .x-halo .art{position:absolute;inset:0;margin:0;width:202px;height:202px}
.x-tmeta{display:flex;justify-content:space-between;align-items:center}
.x-tmeta .x-chip{box-shadow:var(--ring-icon)}
.x-tmeta .k{font-size:12px;color:var(--g400)}
.x-car-ctl{display:flex;gap:8px;align-items:center}
.x-car-foot{display:flex;align-items:center;gap:16px;margin-top:24px;padding:0 8px}
.x-prog{flex:1;height:2px;background:var(--g200);border-radius:2px;position:relative;overflow:hidden}
.x-prog i{position:absolute;left:0;top:0;bottom:0;background:#000;border-radius:2px;transition:width .3s var(--ease)}
.x-count{font-size:14px;color:var(--g500);font-variant-numeric:tabular-nums}
.x-count b{color:#000;font-weight:500}

@media (prefers-reduced-motion: reduce){
  .lp2 *,.lp2 *::before,.lp2 *::after{animation:none!important;transition-duration:0s!important}
}
`;

/* ============================== LANDING (DESIGN.md) =================== */
const LP_TABS = [
  { id: "capture", label: "Capture", dot: "orb-1", cta: ["Open capture", "capture"], links: [["Live session", "capture"], ["Trust and privacy", "trust"]] },
  { id: "map", label: "Map", dot: "orb-2", cta: ["Open the Work Map", "map"], links: [["Debrief", "debrief"], ["Work Map", "map"], ["Agent export", "export"]] },
  { id: "teach", label: "Teach", dot: "orb-3", cta: ["Open coach", "teach"], links: [["Coaching", "teach"], ["Results", "results"]] },
];
// One orb per live question from the captured session (demo data).
const LP_MOMENTS = [
  { orb: "orb-1", t: "01:35", title: "Acme ARR", q: "You changed Acme from $190,000 to $110,000. Why not add both contracts?" },
  { orb: "orb-2", t: "02:30", title: "Relocation add-back", q: "What made the $4 million relocation add-back look recurring?" },
  { orb: "orb-3", t: "03:19", title: "Capex history", q: "When capex is below history, when do you stop and escalate?" },
  { orb: "orb-4", t: "03:25", title: "Before saving", q: "What must be escalated before these inputs can be committed?" },
];
const ORB_SLOTS = { 0: ["0rem", "0rem", 1, 1, 3], 1: ["19.404rem", "1.702rem", 0.787, 0.8, 2], 2: ["33.362rem", "3.404rem", 0.567, 0.5, 1], 3: ["43.121rem", "4.085rem", 0.426, 0, 0] };

// Redline brand mark: one red line, the edit a partner makes on a junior's model.
function RedlineMark({ size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden><path d="M5 10.5h10" stroke="#F41A2F" strokeWidth="2.4" strokeLinecap="round" /></svg>;
}

function Notch({ side }) {
  return (
    <svg viewBox="0 0 20 22" className={"notch " + side} aria-hidden>
      <path d="M20 2C8.954 2 0 10.954 0 22V0H20V2Z" fill="currentColor" />
      <path d="M20 2H20.25V22.25H0V22H-.25C-.25 10.816 8.816 1.75 20 1.75V2Z" stroke="black" strokeOpacity=".1" strokeWidth=".5" fill="none" />
    </svg>
  );
}
const Dots = ({ c = ["tl", "tr"] }) => c.map((k) => <span key={k} className={"l-dot " + k} aria-hidden />);
const Mark = () => <span className="l-mark" aria-hidden><RedlineMark /></span>;

function OrbCarousel() {
  const [a, setA] = useState(0);
  const n = LP_MOMENTS.length;
  const slot = (i) => { let d = (i - a + n) % n; if (d > n / 2) d -= n; return d; };
  const step = (d) => setA((x) => (x + d + n) % n);
  const cur = LP_MOMENTS[a], prev = LP_MOMENTS[(a - 1 + n) % n], next = LP_MOMENTS[(a + 1) % n];
  const say = () => speakText(true, cur.q);
  return (
    <div className="l-carousel" aria-roledescription="carousel" aria-label="Questions Redline asked">
      <div className="l-orbs">
        {LP_MOMENTS.map((m, i) => {
          const d = slot(i); const [x, y, s, o, z] = ORB_SLOTS[Math.min(3, Math.abs(d))];
          const sign = d < 0 ? "-" : "+";
          const style = { transform: `translateX(calc(-50% ${sign} ${x})) translateY(${y}) scale(${s})`, opacity: o, zIndex: z };
          const center = d === 0;
          return (
            <div key={m.title} className="l-orb" style={style} aria-hidden={!center && Math.abs(d) > 1}>
              <div className="art"><div className={"art-fill " + m.orb} /><div className="l-noise" /></div>
              {!center && Math.abs(d) <= 1 && <button className="art" style={{ background: "transparent" }} aria-label={`Show: ${m.title}`} onClick={() => setA(i)} />}
              <span className="hring" aria-hidden />
              {center && <button className="l-play" onClick={say} aria-label={`Play the question: ${m.q}`}><Play size={18} fill="currentColor" aria-hidden /></button>}
            </div>);
        })}
        <div className="l-efade l" aria-hidden /><div className="l-efade r" aria-hidden />
      </div>
      <div className="l-caps">
        <div className="side" aria-hidden><p className="tb tt">{prev.title}</p><p className="txs dd" style={{ marginTop: 6 }}>{prev.q}</p></div>
        <button className="l-btn l-s l-ibtn" aria-label="Previous" onClick={() => step(-1)}><ChevronLeft size={16} aria-hidden /></button>
        <div aria-live="polite">
          <p className="tb" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{cur.title}<span className="mu txs">{cur.t}</span></p>
          <p className="txs" style={{ marginTop: 6 }}>{cur.q}</p>
        </div>
        <button className="l-btn l-s l-ibtn" aria-label="Next" onClick={() => step(1)}><ChevronRight size={16} aria-hidden /></button>
        <div className="side" aria-hidden><p className="tb tt">{next.title}</p><p className="txs dd" style={{ marginTop: 6 }}>{next.q}</p></div>
      </div>
    </div>
  );
}

const MAP_DEMO_RULE = RULE["acme-amendment-language"];
const MAP_DEMO_STOP = RULE["relocation-recurrence"];
const MAP_DEMO_STEP = STEPS.find((step) => step.n === MAP_DEMO_RULE.step);

function MapDemo() {
  return (
    <div className="l-demo">
      <div className="body">
        <div className="row" style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
          <p className="tsm mu">Step {MAP_DEMO_STEP.n} of {STEPS.length}: {MAP_DEMO_STEP.title}</p>
          <span className="l-chip"><Check size={12} aria-hidden /> Verified by {EXPERT.first}</span>
        </div>
        <p className="tb" style={{ marginTop: 16 }}>{MAP_DEMO_RULE.text}</p>
        <p className="tsm" style={{ marginTop: 12, color: "var(--g700)" }}>“{QUOTES["q-acme"].en}”</p>
        <p className="txs mu" style={{ marginTop: 4 }}>{EXPERT.first}, live question at {fmt(QUOTES["q-acme"].t)}</p>
      </div>
      <div style={{ borderTop: "1px solid var(--g200)", padding: "16px 24px", display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Hand size={16} aria-hidden style={{ marginTop: 3, flex: "none" }} />
        <div><p className="tsm">Stop point</p><p className="tsm mu">{MAP_DEMO_STOP.text}</p></div>
      </div>
    </div>
  );
}

function TeachDemo() {
  const [phase, setPhase] = useState("idle");
  const t = useRef(null);
  useEffect(() => () => clearTimeout(t.current), []);
  function save() {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setPhase("shown"); return; }
    setPhase("typing"); t.current = setTimeout(() => setPhase("shown"), 1200);
  }
  return (
    <div className="l-chat">
      <div className="l-demo">
        <div className="body" style={{ paddingBottom: 8 }}>
          <p className="txs mu">{TEACH_DEAL.code}, model inputs entered by {TRAINEE.first}</p>
          <div className="l-row"><span>ARR: Crestline Health</span><span>$190,000</span></div>
          <div className="l-row"><span>Add-back: relocation, one-time</span><span>Accept $4.0M</span></div>
        </div>
        <div className="foot">
          <span className="txs mu">Then runs the debt schedule at 5.5×</span><span style={{ flex: 1 }} />
          {phase === "idle"
            ? <button className="l-btn l-p h9" onClick={save}>Save inputs</button>
            : <button className="l-btn l-s h9" onClick={() => setPhase("idle")}><RotateCcw size={14} aria-hidden /> Reset</button>}
        </div>
      </div>
      <div aria-live="polite" style={{ display: "flex", flexDirection: "column", minHeight: 132 }}>
        {phase === "typing" && <span className="l-typing" aria-label="Tutor is typing"><i /><i /><i /></span>}
        {phase === "shown" && <>
          <p className="l-bub me">Save inputs</p>
          <p className="l-bub">Wait. {EXPERT.first} would flag this ARR total and the relocation add-back.</p>
          <p className="l-bub last">Does the new software agreement add to the original, or replace it?</p>
        </>}
        {phase === "idle" && <p className="txs mu" style={{ marginTop: 16, textAlign: "center" }}>Press Save to see the tutor step in.</p>}
      </div>
    </div>
  );
}

function HeroPanel() {
  const { go } = useApp();
  const [tab, setTab] = useState("capture");
  const refs = useRef({});
  const cur = LP_TABS.find((x) => x.id === tab);
  function key(e) {
    const i = LP_TABS.findIndex((x) => x.id === tab); let j = null;
    if (e.key === "ArrowRight") j = (i + 1) % 3; if (e.key === "ArrowLeft") j = (i + 2) % 3;
    if (e.key === "Home") j = 0; if (e.key === "End") j = 2;
    if (j != null) { e.preventDefault(); setTab(LP_TABS[j].id); refs.current[LP_TABS[j].id]?.focus(); }
  }
  return (
    <div className="l-panel-wrap">
      <div className="l-panel" id="how">
        <div className="l-ring" aria-hidden />
        <div className="l-rail">
          <div className="l-rail-in">
            <div className="l-rail-tint" aria-hidden /><div className="l-rail-seam" aria-hidden /><div className="l-rail-ring" aria-hidden />
            <div className="l-tabs" role="tablist" aria-label="How it works" onKeyDown={key}>
              {LP_TABS.map((x) => (
                <button key={x.id} ref={(el) => (refs.current[x.id] = el)} role="tab" id={"lt-" + x.id} aria-controls="lt-panel" aria-label={x.label}
                  aria-selected={tab === x.id} tabIndex={tab === x.id ? 0 : -1} className="l-tab" onClick={() => setTab(x.id)}>
                  <span className="l-tdot" aria-hidden><span className={"art-fill " + x.dot} /></span><span className="lbl">{x.label}</span>
                  <span className="hov" aria-hidden /><span className="act" aria-hidden />
                </button>))}
            </div>
          </div>
        </div>
        <div className="l-content" key={tab} id="lt-panel" role="tabpanel" aria-labelledby={"lt-" + tab}>
          {tab === "capture" && <OrbCarousel />}
          {tab === "map" && <MapDemo />}
          {tab === "teach" && <TeachDemo />}
        </div>
        <nav className="l-pnav" aria-label={`${cur.label} in the dashboard`}>
          <div className="l-seg">{cur.links.map(([l, p]) => <button key={l} onClick={() => go(p)}>{l}</button>)}</div>
        </nav>
        <div className="l-pcta"><button className="l-btn l-p h10" onClick={() => go(cur.cta[1])}>{cur.cta[0]}</button></div>
      </div>
    </div>
  );
}

const Orb = ({ k }) => <span className="x-orb" aria-hidden><span className={"art-fill " + k} /><span className="l-noise" /></span>;

// A colour panel cut from the orb gradients, with a white card for the words.
function ColorFrame({ orb, chip, className = "", children }) {
  return (
    <div className={"x-frame " + className}>
      <div className={"art-fill " + orb} aria-hidden /><div className="l-noise" aria-hidden />
      <div className="x-in">{chip && <span className="x-chip">{chip}</span>}<div className="x-float">{children}</div></div>
    </div>
  );
}

// What it catches: the model and the data room side by side, numbered so each
// wrong input points at the document that disproves it (Project Beacon, demo data).
const CATCH_ROWS = [
  { n: "1", label: "ARR: Crestline Health", was: "$190,000", fix: "$110,000" },
  { n: "2", label: "Add-back: relocation, “one-time”", was: "$4.0M", fix: "Escalate to QoE" },
  { n: "3", label: "Maintenance capex, % of revenue", was: "1.6%", fix: "4.0%" },
];
const CATCH_DOCS = [
  { n: "1", src: "2025 Software Agreement", where: "§1.2", q: <>This Agreement <span className="x-hl">supersedes and replaces</span> the Master Services Agreement dated 9 February 2023.</> },
  { n: "2", src: "General ledger", where: "Relocation and facility moves", q: <span className="x-num"><span className="x-hl">2022 $1.4M</span> · <span className="x-hl">2023 $1.9M</span> · <span className="x-hl">2024 $1.6M</span></span> },
  { n: "3", src: "Capex schedule", where: "2021–2024", q: <>Maintenance capex averaged <span className="x-hl">4.0% of revenue</span>.</> },
];

function CatchFrame() {
  return (
    <div className="x-catch">
      <div className="art-fill g-sunset" aria-hidden /><div className="l-noise" aria-hidden />
      <div className="x-catch-in">
        <div className="x-win">
          <div className="x-win-bar"><b>LBO model v3.xlsx</b><span className="l-chip">Management case</span></div>
          <div className="rows">
            {CATCH_ROWS.map((r) => (
              <div key={r.n} className="x-mrow"><span className="x-n" aria-hidden>{r.n}</span><span>{r.label}</span>
                <span className="vals x-num"><span className="x-was"><span className="l-sr">Entered </span>{r.was}</span><span className="x-fix"><span className="l-sr">Should be </span>{r.fix}</span></span></div>))}
            <div className="x-mrow"><span className="x-n sum" aria-hidden>=</span><span className="x-b">Sponsor IRR, 5 years</span>
              <span className="vals x-num"><span className="x-was">{irrAt("1.6")}</span><span className="x-fix">{irrAt("4.0")}</span></span>
              <span className="x-note">At historical capex, the IRR falls 5.3 points.</span></div>
          </div>
        </div>
        <div className="x-win">
          <div className="x-win-bar"><b>{TEACH_DEAL.code} data room</b><span className="l-chip">Primary sources</span></div>
          <div className="rows">
            {CATCH_DOCS.map((d) => (
              <div key={d.n} className="x-doc"><span className="x-n" aria-hidden>{d.n}</span>
                <div><p className="src"><b>{d.src}</b> · {d.where}</p><p className="q">{d.q}</p></div></div>))}
          </div>
        </div>
        <div className="x-tutor">
          <span className="x-block"><i aria-hidden />Save blocked</span>
          <p className="l-bub"><b>Redline:</b> Wait. {EXPERT.first} would flag this ARR total and the relocation add-back. Does the new agreement add to the original, or replace it?</p>
        </div>
      </div>
    </div>
  );
}

const LP_CATCH = [
  { icon: Copy, orb: "orb-1", chip: "01 · Double-counted ARR", from: "$190,000", to: "$110,000", title: "One contract, counted twice",
    text: <>An $80k MSA plus the $110k agreement that <span className="x-b">replaces</span> it.</>, src: "2025 Agreement §1.2" },
  { icon: RotateCcw, orb: "orb-2", chip: "02 · Recurring “one-time” cost", from: "$4.0M add-back", to: "Escalate", title: "The same cost, every year",
    text: <>Relocation booked in <span className="x-b">2022, 2023 and 2024</span>. Not one-time.</>, src: "General ledger, 2022–2024" },
  { icon: AlertTriangle, orb: "orb-4", chip: "03 · Capex below history", from: "1.6%", to: "4.0%", title: <>IRR falls <span className="x-red">5.3 points</span></>,
    text: <>At historical capex, 26.8% becomes <span className="x-b x-num">21.5%</span>.</>, src: "Capex schedule, 2021–2024" },
];

const TRUST_CARDS = [
  { orb: "orb-1", tag: "Capture", art: "circles", title: "Off the record at any time", text: "Say “off the record” or press a button. Capture pauses and that span is deleted. Only the time span is kept." },
  { orb: "orb-2", tag: "Storage", art: "lattice", title: "Redacted before storage", text: "Transcripts are redacted before they are saved, never after." },
  { orb: "g-sky", tag: "Storage", art: "frame", title: "Screen frames stay local", text: "Shared-screen frames are not uploaded. The Deal Desk keeps sampled frames only after the partner opts in." },
  { orb: "orb-3", tag: "Teach", art: "cone", title: "Only verified rules are taught", text: "Anything the partner hasn't confirmed in the debrief never reaches the tutor." },
  { orb: "orb-4", tag: "Audit", art: "ledger", title: "Every deletion leaves a receipt", text: "Off-record windows and review decisions are written to an audit log, so you can show what was removed." },
  { orb: "orb-1", tag: "Readiness", art: "sandbox", title: "Fictional deals until it's ready", text: "Redline runs on synthetic deals only until the privacy readiness check passes." },
];
const cardStep = (el) => { const c = el?.firstElementChild; return c ? c.getBoundingClientRect().width + 16 : 0; };

function TrustSection() {
  const { go } = useApp();
  const car = useRef(null);
  const [last, setLast] = useState(1);
  const n = TRUST_CARDS.length;
  const update = useCallback(() => {
    const el = car.current; const step = cardStep(el); if (!step) return;
    const visible = Math.max(1, Math.round(el.clientWidth / step));
    setLast(Math.min(n, Math.round(el.scrollLeft / step) + visible));
  }, [n]);
  useEffect(() => { update(); window.addEventListener("resize", update); return () => window.removeEventListener("resize", update); }, [update]);
  const move = (d) => car.current?.scrollBy({ left: d * cardStep(car.current), behavior: prefersReducedMotion() ? "auto" : "smooth" });
  const pad = (x) => String(x).padStart(2, "0");
  return (
    <>
      <section className="l-container l-framed px-d pt-xl pb-sm" id="trust">
        <div className="l-rule" aria-hidden /><Dots />
        <div className="l-title">
          <div className="head"><p className="l-eyebrow">Trust</p><h2 className="l-display t5" style={{ maxWidth: "32rem" }}>The partner decides <span style={{ display: "table" }}><span className="x-b">what's kept</span></span></h2></div>
          <div className="right-btn x-car-ctl">
            <button className="l-btn l-s l-ibtn" aria-label="Previous trust principle" onClick={() => move(-1)}><ChevronLeft size={16} aria-hidden /></button>
            <button className="l-btn l-s l-ibtn" aria-label="Next trust principle" onClick={() => move(1)}><ChevronRight size={16} aria-hidden /></button>
            <button className="l-btn l-s h11" onClick={() => go("trust")}>See trust and privacy</button>
          </div>
        </div>
      </section>
      <section className="l-container l-framed px-s pb-d">
        <div className="x-car" ref={car} onScroll={update} tabIndex={0} aria-label="Trust principles">
          {TRUST_CARDS.map((c, i) => (
            <div key={c.title} className="l-card l-safe"><div className="l-card-in"><div className="l-card-col">
              <div className="x-tmeta"><span className="x-chip">{c.tag}</span><span className="k x-num">{pad(i + 1)} / {pad(n)}</span></div>
              <div className="x-halo"><div className="glow" aria-hidden><div className={"art-fill " + c.orb} /><div className="l-noise" /></div><LineArt kind={c.art} /></div>
              <h3>{c.title}</h3><p className="desc">{c.text}</p>
            </div></div><div className="l-card-ring" aria-hidden /></div>))}
        </div>
        <div className="x-car-foot" aria-hidden>
          <div className="x-prog"><i style={{ width: `${Math.max((100 * last) / n, 8)}%` }} /></div>
          <span className="x-count"><b>{pad(last)}</b> / {pad(n)}</span>
        </div>
      </section>
    </>
  );
}

function LineArt({ kind }) {
  const s = { fill: "none", stroke: "#000", strokeWidth: 1 }; const d = { ...s, strokeDasharray: "2 3", opacity: 0.5 };
  if (kind === "circles") return (
    <svg className="art" viewBox="0 0 202 202" aria-hidden>
      {[90, 70, 50, 30].map((r) => <circle key={r} cx="101" cy="101" r={r} {...s} />)}
      <line x1="11" y1="101" x2="191" y2="101" {...d} /><line x1="101" y1="11" x2="101" y2="191" {...d} />
      <line x1="40" y1="162" x2="162" y2="40" {...s} />
    </svg>);
  if (kind === "lattice") return (
    <svg className="art" viewBox="0 0 202 202" aria-hidden>
      {[0, 1, 2].map((i) => [0, 1, 2].map((j) => <rect key={i + "-" + j} x={31 + i * 46} y={31 + j * 46} width="46" height="46" {...(i === 1 && j === 1 ? { ...s, fill: "#000" } : s)} />))}
      <path d="M31 31 L61 11 L199 11 L169 31" {...d} /><path d="M169 31 L199 11 L199 149 L169 169" {...d} />
    </svg>);
  if (kind === "frame") return (
    <svg className="art" viewBox="0 0 202 202" aria-hidden>
      <rect x="36" y="51" width="130" height="100" rx="6" {...s} /><rect x="48" y="63" width="106" height="64" {...s} />
      <line x1="36" y1="139" x2="166" y2="139" {...s} /><circle cx="101" cy="95" r="14" {...d} />
      <line x1="26" y1="171" x2="176" y2="31" {...s} strokeWidth="1.5" />
    </svg>);
  if (kind === "ledger") return (
    <svg className="art" viewBox="0 0 202 202" aria-hidden>
      <rect x="46" y="31" width="110" height="140" rx="4" {...s} />
      {[61, 109].map((y) => <line key={y} x1="62" y1={y} x2="140" y2={y} {...s} />)}
      <line x1="62" y1="133" x2="110" y2="133" {...s} /><line x1="62" y1="85" x2="140" y2="85" {...s} stroke="#F41A2F" strokeWidth="2" />
      <circle cx="146" cy="151" r="16" {...s} fill="#fff" /><path d="M139 151 l5 5 l10 -11" {...s} strokeWidth="1.5" />
    </svg>);
  if (kind === "sandbox") return (
    <svg className="art" viewBox="0 0 202 202" aria-hidden>
      <path d="M101 31 L166 66 L166 136 L101 171 L36 136 L36 66 Z" {...s} /><path d="M36 66 L101 101 L166 66" {...s} />
      <line x1="101" y1="101" x2="101" y2="171" {...s} /><path d="M101 31 L101 101" {...d} /><path d="M36 136 L101 101 L166 136" {...d} />
    </svg>);
  return (
    <svg className="art" viewBox="0 0 202 202" aria-hidden>
      <ellipse cx="101" cy="160" rx="70" ry="18" {...s} /><path d="M31 160 L101 30 L171 160" {...s} />
      <line x1="101" y1="30" x2="101" y2="160" {...d} /><line x1="20" y1="160" x2="190" y2="160" {...d} />
      <path d="M86 92 l10 10 l20 -22" {...s} strokeWidth="1.5" />
    </svg>);
}

function Landing2() {
  const { go, fillDemo } = useApp();
  const [stuck, setStuck] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(null); const burger = useRef(null);
  useEffect(() => {
    const f = () => setStuck(window.scrollY >= 450); f();
    window.addEventListener("scroll", f, { passive: true }); return () => window.removeEventListener("scroll", f);
  }, []);
  useEffect(() => { if (menu) menuRef.current?.querySelector("button")?.focus(); }, [menu]);
  const jump = (id) => { setMenu(false); document.getElementById(id)?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" }); };
  const anchors = [["The problem", "problem"], ["How it works", "how"], ["What it catches", "catch"], ["Why now", "now"], ["Trust", "trust"]];

  return (
    <div className="lp2">
      <button className="l-btn l-p h9 l-skip" onClick={() => { const m = document.getElementById("lp-main"); m?.focus(); }}>Skip to content</button>

      <div className="l-ann" role="note">
        <p className="txs-t msg"><b>Demo data · fictional deals.</b><span className="more"> Built for the Hack-Nation × ElevenLabs AI Apprentice challenge.</span></p>
        <button className="l-btn l-s h8" onClick={fillDemo}>See the finished demo</button>
        <Notch side="l" /><Notch side="r" />
      </div>

      <header className="l-container l-nav">
        <button className="l-logo" onClick={() => window.scrollTo({ top: 0 })} aria-label="Redline, back to top"><Mark />Redline</button>
        <nav aria-label="On this page"><ul className="l-links">{anchors.map(([l, id]) => <li key={id}><button onClick={() => jump(id)}>{l}</button></li>)}</ul></nav>
        <div className="l-nav-right" style={{ position: "relative" }}>
          <button className="l-btn l-s h9 l-hide-sm" onClick={fillDemo}>See the demo</button>
          <button className="l-btn l-p h9" onClick={() => go("overview")}>Open dashboard</button>
          <button ref={burger} className="l-burger" aria-label="Menu" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>{menu ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}</button>
          {menu && <div className="l-menu" role="menu" ref={menuRef} onKeyDown={(e) => {
            const items = [...menuRef.current.querySelectorAll("button")]; const i = items.indexOf(document.activeElement);
            if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length].focus(); }
            if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
            if (e.key === "Escape") { setMenu(false); burger.current.focus(); }
          }}>{anchors.map(([l, id]) => <button key={id} role="menuitem" onClick={() => jump(id)}>{l}</button>)}</div>}
        </div>
      </header>

      <div className={"l-sticky" + (stuck ? " on" : "")} aria-hidden={!stuck}>
        <div className="l-container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}><Mark /><span className="txs mu l-hide-sm">Demo data · fictional deals</span></span>
          <span style={{ display: "flex", gap: 8 }}>
            <button className="l-btn l-s h9" tabIndex={stuck ? 0 : -1} onClick={fillDemo}>See the demo</button>
            <button className="l-btn l-p h9" tabIndex={stuck ? 0 : -1} onClick={() => go("overview")}>Open dashboard</button>
          </span>
        </div>
      </div>

      <main id="lp-main" tabIndex={-1} style={{ outline: "none" }}>
        {/* Hero (not framed) */}
        <section className="l-container pt-d pb-sm">
          <div className="l-title">
            <div className="head"><h1 className="l-display t6" style={{ maxWidth: "36rem" }}><span className="l-line1">Partner-grade <span className="x-red">skepticism</span></span> <span style={{ display: "table" }}>for every analyst</span></h1></div>
            <div className="cta">
              <button className="l-btn l-p h11" onClick={() => go("overview")}>Open the dashboard</button>
              <button className="l-btn l-s h11" onClick={fillDemo}>See the finished demo</button>
            </div>
            <div className="lead">
              <p className="tb"><span className="x-b">Redline</span> learns how a senior partner challenges management's numbers, then <span className="x-b">stops junior analysts before an unverified one reaches the model.</span></p>
              <p className="txs mu" style={{ marginTop: 16 }}>Capture the partner once. Every analyst after that gets the same thirty-second catch.</p>
            </div>
          </div>
        </section>
        <section className="l-container pb-d" aria-label="How it works"><HeroPanel /></section>

        {/* Built with */}
        <section className="l-container pb-sm">
          <p className="tb mu" style={{ textAlign: "center" }}>Built with</p>
        </section>
        <section className="l-container l-framed pt-sm pb-sm">
          <div className="l-rule" aria-hidden /><Dots />
          <ul className="l-wall" aria-label="Built with">{["ElevenAgents", "Gemini vision", "Microsoft Presidio", "Supabase"].map((b) => <li key={b}>{b}</li>)}</ul>
        </section>

        {/* The problem */}
        <section className="l-container l-framed px-d pt-xl pb-sm" id="problem">
          <div className="l-rule" aria-hidden /><Dots />
          <p className="l-eyebrow">The problem</p>
          <h2 className="l-display t5" style={{ maxWidth: "54rem" }}>A partner can spot a broken LBO assumption in <span className="x-b">thirty seconds</span>, but never has <span className="x-red">thirty minutes</span> to explain why.</h2>
          <p className="tb mu" style={{ marginTop: 24, maxWidth: "40rem" }}>So juniors learn the firm's rules by breaking them, <span className="x-b">one redline at a time.</span></p>
        </section>
        <section className="l-container l-framed px-s pt-sm pb-sm">
          <div className="l-grid">
            {[["orb-1", "The partner", "30 sec", "To spot it", "Sees the $190,000 ARR is two contracts, where one replaces the other."],
              ["orb-2", "The time it takes", "30 min", "To explain it", "The amendment, the invoices, the capex history. Time a partner rarely has mid-deal."],
              ["orb-4", "The junior", "1 redline", "At a time", "How the rules reach juniors today: after the mistake is already in the model."]].map(([orb, chip, stat, h, d]) => (
              <div key={stat} className="l-c4"><ColorFrame orb={orb} chip={chip} className="x-tall">
                <p className="x-stat">{stat}</p><h3>{h}</h3><p className="tsm mu">{d}</p>
              </ColorFrame></div>))}
          </div>
        </section>

        {/* What it catches */}
        <section className="l-container l-framed px-d pt-xl pb-sm" id="catch">
          <div className="l-rule" aria-hidden /><Dots />
          <div className="l-title">
            <div className="head"><p className="l-eyebrow">What it catches</p><h2 className="l-display t5" style={{ maxWidth: "48rem" }}>Fine in the model, <span style={{ display: "table" }}><span className="x-red">wrong in the documents</span></span></h2></div>
            <div className="lead"><p className="tb mu">Every number on the left looks reasonable in a spreadsheet. <span className="x-b">Every one is contradicted by a document</span> already sitting in the data room.</p></div>
          </div>
        </section>
        <section className="l-container l-framed px-s pt-sm pb-xs"><CatchFrame /></section>
        <section className="l-container l-framed px-s pt-sm pb-sm">
          <div className="l-grid">
            {LP_CATCH.map((c) => (
              <div key={c.chip} className="l-c4"><ColorFrame orb={c.orb} className="x-taller" chip={<><c.icon size={14} aria-hidden />{c.chip}</>}>
                <div className="x-delta x-num"><span className="from">{c.from}</span><span className="arrow" aria-hidden>→</span><span className="to">{c.to}</span></div>
                <h3><button onClick={() => go("teach")}>{c.title}<ArrowUpRight size={12} className="arr" aria-hidden /><span className="cover" aria-hidden /></button></h3>
                <p className="tsm mu">{c.text}</p>
                <p className="x-src">Source · <b>{c.src}</b></p>
              </ColorFrame></div>))}
          </div>
        </section>

        {/* Proof: the case the partner never showed */}
        <section className="l-container l-framed px-d pt-xl pb-sm" id="proof">
          <div className="l-rule" aria-hidden /><Dots />
          <div className="l-title">
            <div className="head"><p className="l-eyebrow">Proof it teaches judgment</p><h2 className="l-display t5" style={{ maxWidth: "34rem" }}>It catches the case <span style={{ display: "table" }}>the partner <span className="x-red">never showed</span></span></h2></div>
            <div className="lead"><p className="tb mu">A junior who memorizes “amendments replace” would get Customer 3 wrong. The tutor teaches the reading, not the answer.</p></div>
          </div>
        </section>
        <section className="l-container l-framed px-s pt-sm pb-sm">
          <div className="x-flow">
            <div className="art-fill g-dawn" aria-hidden /><div className="l-noise" aria-hidden />
            <span className="x-chip">Customer 3 · a case the partner never showed</span>
            <div className="x-step"><p className="lbl">01 · Partner session</p><h3>Crestline: the agreement replaces the MSA</h3><p className="txs mu">ARR set to $110,000, not $190,000.</p></div>
            <div className="x-step"><p className="lbl">02 · Verified rule</p><h3>Read the language before summing</h3><div className="x-quote">“supersedes and replaces” vs “in addition to”</div></div>
            <div className="x-step warn"><p className="lbl">03 · New case, never shown</p><h3>Customer 3 add-on</h3><p className="txs mu">$120k order form plus a $45k add-on that is “in addition to” it.</p></div>
            <div className="x-step dark"><p className="lbl">04 · Tutor</p><h3>Add them: <span className="x-num" style={{ fontSize: 22 }}>$165,000</span></h3><p className="txs mu">Blocked until the junior reads the add-on, not just the rule.</p></div>
          </div>
        </section>

        {/* Why now */}
        <section className="l-container l-framed px-d pt-xl pb-d" id="now">
          <div className="l-rule" aria-hidden /><Dots />
          <div className="l-title">
            <div className="head"><p className="l-eyebrow">Why now</p><h2 className="l-display t5" style={{ maxWidth: "34rem" }}>The partner's thirty seconds <span style={{ display: "table" }}>can finally be captured</span></h2></div>
            <div className="lead"><p className="tb mu">How juniors learn changed, and so did what software can see and hear.</p></div>
          </div>
          <div className="x-list">
            {[["orb-1", "Learning by osmosis stopped", "Hybrid deal teams mean juniors rarely sit beside a partner during a QoE scrub. The “wait, check that” moment doesn't reach them."],
              ["orb-2", "Every class starts from zero", "Analyst programs typically run about two years, so firms re-teach the same lessons to each new class, usually after the mistake."],
              ["orb-3", "AI speeds up typing, not doubt", "Tools now spread a data room in minutes, which moves unchecked management numbers into the model faster."],
              ["g-sky", "Voice and vision went real-time", "An agent can now follow a screen, wait for a natural pause and ask one question. Capturing a partner mid-task is finally practical."]].map(([orb, h, d]) => (
              <div key={h} className="x-item"><Orb k={orb} /><div><h3>{h}</h3><p className="tsm mu">{d}</p></div></div>))}
          </div>
        </section>

        {/* Why not just */}
        <section className="l-container l-framed px-d pt-xl pb-sm">
          <div className="l-rule" aria-hidden /><Dots />
          <p className="l-eyebrow">Why not just…</p>
          <h2 className="l-display t5" style={{ maxWidth: "40rem" }}>Training that happens <span style={{ display: "table" }}>inside the work</span></h2>
        </section>
        <section className="l-container l-framed px-s pt-sm pb-sm">
          <div className="l-grid">
            {[["…a training deck?", "Taught once, months early", "Covers the rule before the deal. Nothing checks the model when it matters."],
              ["…a general AI copilot?", "Knows finance, not your firm", "It has no idea how your partners scrub, and no partner signs off on what it says."]].map(([q, h, d]) => (
              <div key={q} className="l-c4"><div className="l-card"><div className="l-card-in"><div className="l-card-col">
                <p className="tb" style={{ marginBottom: 64 }}>{q}</p>
                <div style={{ marginTop: "auto" }}><h3>{h}</h3><p className="desc">{d}</p></div>
              </div></div><div className="l-card-ring" aria-hidden /></div></div>))}
            <div className="l-c4"><ColorFrame orb="orb-1" chip="Redline" className="x-tall" >
              <h3>Your partner's rules, at the save button</h3><p className="tsm mu">Learned from your own partners, verified by them, and applied before an input is committed.</p>
            </ColorFrame></div>
          </div>
        </section>

        <TrustSection />

        {/* Who it's for + FAQ */}
        <section className="l-container l-framed px-d pt-xl pb-d">
          <div className="l-rule" aria-hidden /><Dots />
          <p className="l-eyebrow">Who it's for</p>
          <h2 className="l-display t5" style={{ maxWidth: "40rem" }}>Teams where one missed clause <span style={{ display: "table" }} className="x-b">moves the price</span></h2>
          <div className="l-grid" style={{ marginTop: 48 }}>
            {[["orb-2", "PE deal teams", "Ramp each analyst class on the firm's own rules within a deal cycle."],
              ["g-sky", "QoE and diligence advisers", "Keep partner judgment consistent across every engagement team."],
              ["orb-3", "Talent and onboarding leads", "Training that checks real work, not quiz answers."]].map(([orb, h, d]) => (
              <div key={h} className="l-c4"><ColorFrame orb={orb} chip="For" className="x-tall"><h3>{h}</h3><p className="tsm mu">{d}</p></ColorFrame></div>))}
          </div>
          <div className="x-faq">
            {[["Does the partner have to change how they work?", "No. They do a normal scrub. Redline asks one short question at natural pauses, a handful of times per session."],
              ["Where does our deal data go?", "Transcripts are redacted before storage, off-the-record spans are deleted, and the demo runs on fictional deals only."],
              ["What if the tutor gets a rule wrong?", "It only teaches rules the partner verified in the debrief, and each rule links back to the partner's own words."],
              ["Does it work with our Excel models?", "Today it runs in a sandbox deal desk. Working inside existing templates is on the roadmap."]].map(([q, a], i) => (
              <details key={q} open={i === 0}><summary>{q}</summary><p className="tsm mu">{a}</p></details>))}
          </div>
        </section>

        {/* CTA band */}
        <div className="l-band">
          <div className="l-container l-framed l-band-in">
            <Dots c={["tl", "tr", "bl", "br"]} />
            <div style={{ flex: "auto", display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>
              <div className="x-cluster" aria-hidden>{["orb-1", "orb-2", "g-sky", "orb-3", "orb-4"].map((k) => <Orb key={k} k={k} />)}</div>
              <p className="l-display t4" style={{ textAlign: "center" }}>Give every analyst the partner's <span className="x-red">thirty seconds</span>.</p>
            </div>
            <div className="btns">
              <button className="l-btn l-s h11" onClick={fillDemo}>See the finished demo</button>
              <button className="l-btn l-p h11" onClick={() => go("overview")}>Open the dashboard</button>
            </div>
          </div>
        </div>
      </main>

      <footer className="l-container l-foot">
        <div><button className="l-logo" onClick={() => window.scrollTo({ top: 0 })}><Mark />Redline</button>
          <p className="txs mu" style={{ marginTop: 14, maxWidth: "18rem" }}>Demo data · fictional deals. Hack-Nation × ElevenLabs, 7th Global AI Hackathon, Challenge 01.</p></div>
        <ul className="l-foot-groups">
          {[["Capture", [["Overview", "overview"], ["Live session", "capture"]]],
            ["Map", [["Debrief", "debrief"], ["Work Map", "map"], ["Agent export", "export"]]],
            ["Teach", [["Coach", "teach"], ["Results", "results"], ["Trust and privacy", "trust"]]]].map(([h, ls]) => (
            <li key={h}><h4>{h}</h4><ul>{ls.map(([l, p]) => <li key={l}><button onClick={() => go(p)}>{l}</button></li>)}</ul></li>))}
        </ul>
      </footer>

      <div className="l-voice">
        <button onClick={() => speakText(true, LP_MOMENTS[0].q)}
          aria-label="Hear a question Redline asked (browser voice preview)">
          <span className="vorb" aria-hidden><span className="l-noise" /></span>Hear Redline
        </button>
      </div>
    </div>
  );
}

// OS colour scheme as an external store: server and first client render agree (light), then it follows the OS.
const DARK_QUERY = "(prefers-color-scheme: dark)";
const subscribeSystemDark = (notify) => {
  const m = window.matchMedia?.(DARK_QUERY);
  m?.addEventListener?.("change", notify);
  return () => m?.removeEventListener?.("change", notify);
};
const getSystemDark = () => !!window.matchMedia?.(DARK_QUERY).matches;
const getSystemDarkServer = () => false;

function FilesPage() {
  const [deal, setDeal] = useState(DEAL.code);
  const files = deal === DEAL.code ? ATLAS_FILES : BEACON_FILES;
  const folders = [...new Set(files.map((file) => file.folder))];
  const [openId, setOpenId] = useState(files[0].id);
  const current = files.find((file) => file.id === openId) ?? files[0];
  return (
    <>
      <PageHead title="Source files" lede={`Working set behind ${DEAL.code} and ${TEACH_DEAL.code}. Spreadsheets open as workbooks. Contracts open as the PDF page the analyst actually reads. The room still holds 1,240 files. These are the ones the demo uses.`} />
      <div className="row" style={{ padding: "0 12px 12px" }}>
        <div className="seg" role="tablist" aria-label="Deal">
          {[DEAL.code, TEACH_DEAL.code].map((name) => (
            <button key={name} role="tab" aria-selected={deal === name} onClick={() => { setDeal(name); setOpenId((name === DEAL.code ? ATLAS_FILES : BEACON_FILES)[0].id); }}>{name}</button>
          ))}
        </div>
        <span className="t-sec">{files.length} files in this working set</span>
      </div>
      <div className="grid g-files">
        <Card title="Data room" extra={<span className="t-sec">{current.folder}</span>}>
          <div className="stack">
            {folders.map((folder) => (
              <div key={folder}>
                <div className="t-cap" style={{ margin: "4px 0" }}>{folder}</div>
                <div className="file-list">
                  {files.filter((file) => file.folder === folder).map((file) => (
                    <button key={file.id} type="button" aria-pressed={file.id === current.id} onClick={() => setOpenId(file.id)}>
                      <span>
                        <span className="strong" style={{ display: "block" }}>{file.name}</span>
                        <span className="t-sec">{file.dateLabel} · {file.used}</span>
                      </span>
                      <span className={"file-ext " + file.kind}>{file.kind === "xlsx" ? "XLSX" : "PDF"}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card title={current.name} extra={<span className="t-sec">{current.used}</span>}>
          <DocFace key={current.id} file={current} />
          <p className="t-sec" style={{ marginTop: 8 }}>Synthetic demo files. Figures match the model inputs on Capture and Coach.</p>
        </Card>
      </div>
    </>
  );
}

function NotFoundPage() {
  const { go } = useApp();
  return <PageHead title="Page not found" lede="That page doesn't exist in this demo." actions={<button className="btn capsule" onClick={() => go("overview")}>Go to the overview</button>} />;
}

/* ============================== SHELL ================================= */
function NavItem({ id, label, top, extra, page, go, onPick }) {
  return (
    <button className={"nav-item" + (top ? " top" : "")} aria-current={page === id ? "page" : undefined} onClick={() => { go(id); onPick?.(); }}>
      <span>{label}</span>{extra}
    </button>
  );
}

function NavList({ onPick }) {
  const { page, go, sel } = useApp();
  const itemProps = { page, go, onPick };
  return (
    <nav aria-label="Main" className="stack x-tight">
      <NavItem {...itemProps} id="overview" label="Overview" top />
      <NavItem {...itemProps} id="files" label="Source files" top />
      <div className="nav-label"><span className={"nav-num" + (sel.captureDone ? " done" : "")} aria-hidden>1</span>Capture{sel.captureDone && <span className="sr">, completed</span>}</div>
      <NavItem {...itemProps} id="capture" label="Live session" />
      <div className="nav-label"><span className={"nav-num" + (sel.signed ? " done" : "")} aria-hidden>2</span>Map{sel.signed && <span className="sr">, completed</span>}</div>
      <NavItem {...itemProps} id="debrief" label="Debrief" extra={sel.awaiting.length > 0 && <Badge tone="pending" title={`${sel.awaiting.length} awaiting ${EXPERT.first}`}><span aria-hidden>{sel.awaiting.length}</span><span className="sr">{sel.awaiting.length} awaiting {EXPERT.first}</span></Badge>} />
      <NavItem {...itemProps} id="map" label="Work Map" extra={<span className="t-sec">{sel.verified}/{sel.claimsTotal}</span>} />
      <div className="nav-label"><span className={"nav-num" + (sel.handled === sel.casesTotal ? " done" : "")} aria-hidden>3</span>Teach</div>
      <NavItem {...itemProps} id="teach" label={`Coach ${TRAINEE.first}`} extra={<span className="t-sec">{sel.handled}/{sel.casesTotal}</span>} />
      <NavItem {...itemProps} id="results" label="Results" />
      <div className="nav-label">More</div>
      <NavItem {...itemProps} id="export" label="Agent export" top />
      <NavItem {...itemProps} id="trust" label="Trust and privacy" top />
    </nav>
  );
}

function Sidebar() {
  const { voice, setVoice, saveStatus, go } = useApp();
  return (
    <aside className="sidenav" aria-label="Sidebar">
      <button className="brand" style={{ textAlign: "left", borderRadius: 8 }} onClick={() => go("landing")} aria-label="Redline home"><span className="brand-mark" aria-hidden><RedlineMark size={16} /></span>Redline</button>
      <div className="people stack x-tight">
        <span className="t-meta">{EXPERT.name}</span><span className="t-sec">Expert, senior partner</span>
        <span className="t-meta" style={{ marginTop: 4 }}>{TRAINEE.name}</span><span className="t-sec">Learning, first deal</span>
      </div>
      <NavList />
      <div className="side-foot">
        <button className="btn compact" aria-pressed={voice} onClick={() => setVoice((v) => !v)}>{voice ? <Volume2 size={13} aria-hidden /> : <VolumeX size={13} aria-hidden />} Voice preview</button>
        <span className="t-cap">Browser speech is the fallback; the live Interviewer is on Capture.</span>
        <span className="t-cap" role="status">{saveStatus}</span>
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
  const [page, setPage] = useState("landing");
  const [cap, setCap] = useState(initCap);
  const [gaps, setGaps] = useState({});
  const [claims, setClaims] = useState({});
  const [signed, setSigned] = useState(false);
  const [workMap, setWorkMap] = useState(null);
  const [workMapStatus, setWorkMapStatus] = useState("idle");
  const [struck, setStruck] = useState({});
  const [custom, setCustom] = useState({});
  const [mapStep, setMapStep] = useState(5);
  const [voice, setVoice] = useState(false);
  const [teach, setTeach] = useState({ log: [], saved: {}, preds: {}, forms: {}, msgs: {} });
  const [settings, setSettings] = useState({
    theme: "system", quoteLang: "en", expertLang: "English", tutorLang: "English", retention: "90",
    redact: { PERSON: true, US_SSN: true, COMPENSATION: true, EMAIL_ADDRESS: true, PHONE_NUMBER: true, US_BANK_NUMBER: true },
  });
  const systemDark = useSyncExternalStore(subscribeSystemDark, getSystemDark, getSystemDarkServer);
  const [confirm, setConfirm] = useState(null);
  const [sheet, setSheet] = useState(false);
  const [live, setLive] = useState("");
  const [stateReady, setStateReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Restoring session…");
  const firstRender = useRef(true);
  const apprenticeSessionId = useRef(null);

  const getApprenticeSessionId = useCallback(() => {
    if (apprenticeSessionId.current) return apprenticeSessionId.current;
    const storageKey = "apprentice-session-id";
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) apprenticeSessionId.current = stored;
      else {
        apprenticeSessionId.current = window.crypto.randomUUID();
        window.localStorage.setItem(storageKey, apprenticeSessionId.current);
      }
    } catch {
      apprenticeSessionId.current = window.crypto.randomUUID();
    }
    return apprenticeSessionId.current;
  }, []);


  const pathname = usePathname();
  const atRoot = pathname === "/";
  const restoreState = useCallback((state) => {
    if (!state || state.version !== 1) return false;
    // At the site root always show the landing, even for a returning browser
    // with saved state, so nobody is dropped straight into the dashboard.
    setPage(atRoot ? "landing" : state.page || "overview");
    setCap({ ...initCap(), ...(state.cap || {}), running: false });
    setGaps(state.gaps || {});
    setClaims(state.claims || {});
    setSigned(!!state.signed);
    setWorkMap(state.workMap || null);
    setWorkMapStatus(state.workMap ? "ready" : "idle");
    setStruck(state.struck || {});
    setCustom(state.custom || {});
    setMapStep(Number.isInteger(state.mapStep) ? state.mapStep : 1);
    setTeach({ log: [], saved: {}, preds: {}, forms: {}, msgs: {}, ...(state.teach || {}) });
    setSettings((current) => ({ ...current, ...(state.settings || {}) }));
    return true;
  }, [atRoot]);

  useEffect(() => {
    let cancelled = false;
    const sessionId = getApprenticeSessionId();
    const storageKey = `apprentice-state:${sessionId}`;

    async function restore() {
      let restored = false;
      try {
        const local = window.localStorage.getItem(storageKey);
        if (local) restored = restoreState(JSON.parse(local));
      } catch { /* ignore invalid local demo state */ }

      try {
        const response = await sessionFetch(sessionId, `/api/apprentice/state?session_id=${encodeURIComponent(sessionId)}`);
        if (response.ok) {
          const payload = await response.json();
          if (!cancelled && payload.state) restored = restoreState(payload.state);
          if (!cancelled) setSaveStatus(payload.store === "supabase" ? "Synced to Supabase" : restored ? "Restored locally" : "Ready · memory fallback");
        } else if (!cancelled) {
          setSaveStatus(restored ? "Restored locally" : "Ready · local only");
        }
      } catch {
        if (!cancelled) setSaveStatus(restored ? "Restored locally" : "Ready · local only");
      } finally {
        if (!cancelled) setStateReady(true);
      }
    }

    void restore();
    return () => { cancelled = true; };
  }, [getApprenticeSessionId, restoreState]);
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

  const persistedState = useMemo(() => ({
    version: 1,
    page,
    // startedAt is a performance.now() reading and means nothing after a reload.
    cap: { ...cap, running: false, live: cap.live ? { startedAt: null } : null, liveSig: null },
    gaps,
    claims,
    signed,
    workMap,
    struck,
    custom,
    mapStep,
    teach,
    settings,
  }), [page, cap, gaps, claims, signed, workMap, struck, custom, mapStep, teach, settings]);

  useEffect(() => {
    if (!stateReady) return;
    const sessionId = getApprenticeSessionId();
    const storageKey = `apprentice-state:${sessionId}`;
    const serialized = JSON.stringify(persistedState);
    window.localStorage.setItem(storageKey, serialized);

    const timer = window.setTimeout(async () => {
      setSaveStatus("Saving…");
      try {
        const response = await sessionFetch(sessionId, `/api/apprentice/state?session_id=${encodeURIComponent(sessionId)}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ state: persistedState }),
        });
        const payload = response.ok ? await response.json() : null;
        setSaveStatus(payload?.store === "supabase" ? "Synced to Supabase" : "Saved locally");
      } catch {
        setSaveStatus("Saved locally");
      }
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [getApprenticeSessionId, persistedState, stateReady]);

  const go = useCallback((p) => setPage(p), []);
  const addQuote = (k, q) => setCustom((c) => ({ ...c, [k]: q }));
  const announce = (text) => { setLive(""); setTimeout(() => setLive(text), 30); };
  const buildWorkMap = async () => {
    setWorkMapStatus("building");
    const correctionsByStep = new Map();
    RULES.forEach((rule) => {
      const claim = claims[rule.id];
      if (claim?.status === "corrected") correctionsByStep.set(rule.step, { step_id: rule.step, text: claim.text });
    });
    const answers = [
      ...cap.asked.map((item) => ({ id: item.id, step_id: item.step, asked_t: item.t, answer: quotes[item.id]?.en })).filter((item) => item.step && item.answer),
      ...GAPS.filter((gap) => gaps[gap.id] === "answered").map((gap) => ({ id: gap.id, step_id: gap.step, asked_t: quotes[gap.id]?.t ?? END_T, answer: quotes[gap.id]?.en })).filter((item) => item.answer),
    ];
    try {
      const sessionId = getApprenticeSessionId();
      const response = await sessionFetch(sessionId, "/api/work-map", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          expert: EXPERT.name,
          events: cap.events.map((event) => event.raw).filter(Boolean),
          answers,
          gaps: GAPS.map((gap) => ({ id: gap.id, step_id: gap.step, question: gap.q, risk: gap.risk, status: gaps[gap.id] === "answered" ? "closed" : "open" })),
          corrections: [...correctionsByStep.values()],
          confirmed_step_ids: STEPS.map((step) => step.n),
          confirmed_by_expert: true,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.work_map) throw new Error(payload.error || "Work Map build failed");
      setWorkMap(payload.work_map);
      setSigned(true);
      setWorkMapStatus("ready");
      return true;
    } catch {
      setWorkMapStatus("error");
      return false;
    }
  };
  const resetAll = () => {
    setCap(initCap()); setGaps({}); setClaims({}); setSigned(false); setWorkMap(null); setWorkMapStatus("idle"); setStruck({}); setCustom({});
    setTeach({ log: [], saved: {}, preds: {}, forms: {}, msgs: {} }); setMapStep(5); setPage("overview");
    const sessionId = getApprenticeSessionId();
    window.localStorage.removeItem(`apprentice-state:${sessionId}`);
    void sessionFetch(sessionId, `/api/apprentice/state?session_id=${encodeURIComponent(sessionId)}`, { method: "DELETE" });
  };
  const fillDemo = () => {
    setCap((c) => (c.done ? c : runToEnd(initCap())));
    setGaps(Object.fromEntries(GAPS.map((g) => [g.id, "answered"])));
    setClaims(Object.fromEntries(RULES.map((r) => [r.id, r.draftWrong ? { status: "corrected", text: r.text, quote: r.correction } : { status: "confirmed", text: r.text }])));
    setSigned(true); setWorkMap(null); setWorkMapStatus("idle"); setPage("map"); announce(`Finished demo session loaded. ${RULES.length} canonical rules verified.`);
  };
  const askReset = (kind = "reset") => setConfirm(kind);

  const ctx = {
    page, go, cap, setCap, gaps, setGaps, claims, setClaims, signed, setSigned, workMap, buildWorkMap, workMapStatus, struck, setStruck, quotes, addQuote,
    claimText, ruleSources, ruleEvidence, isVerified, sel, mapStep, setMapStep, teach, setTeach, settings, setSettings,
    voice, setVoice, fillDemo, resetAll, askReset, announce, saveStatus,
    getApprenticeSessionId,
  };
  const Page = { overview: OverviewPage, files: FilesPage, capture: CapturePage, debrief: DebriefPage, map: WorkMapPage, teach: TeachPage,
    results: ResultsPage, export: ExportPage, trust: TrustPage }[page] || NotFoundPage;
  const dark = settings.theme === "dark" || (settings.theme === "system" && systemDark);

  if (page === "landing") return (
    <AppCtx.Provider value={ctx}>
      <style>{LP_CSS}</style>
      <Landing2 />
      <div className="l-sr" role="status" aria-live="polite">{live}</div>
    </AppCtx.Provider>
  );

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
            <button className="pill-btn" style={{ minWidth: 44 }} aria-label="Home" onClick={() => go("landing")}><ShieldCheck size={16} aria-hidden /></button>
            <button className="pill-btn" style={{ minWidth: 44 }} aria-label="Open menu" aria-haspopup="dialog" onClick={() => setSheet(true)}><Menu size={18} aria-hidden /></button>
            <span className="brand" style={{ padding: 0 }}><span className="brand-mark" aria-hidden><RedlineMark size={16} /></span>Redline</span>
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
