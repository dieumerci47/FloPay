// src/components/admin/icons.js — icônes inline (stroke currentColor)
import React from "react";

const base = {
  viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round",
};

export const Gauge = (p) => (<svg {...base} {...p}><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="m13.4 12.6 3.6-3.6"/><path d="M3.5 18a9 9 0 1 1 17 0"/></svg>);
export const Shield = (p) => (<svg {...base} {...p}><path d="M12 3 5 6v5c0 4.5 3 8 7 9 4-1 7-4.5 7-9V6l-7-3Z"/><path d="m9.5 12 1.8 1.8L15 10"/></svg>);
export const Receipt = (p) => (<svg {...base} {...p}><path d="M5 3v18l2-1 2 1 2-1 2 1 2-1 2 1V3l-2 1-2-1-2 1-2-1-2 1-2-1Z"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>);
export const Wallet = (p) => (<svg {...base} {...p}><path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1H5a2 2 0 0 0 0 4h14v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/><circle cx="16.5" cy="14" r="1.2" fill="currentColor" stroke="none"/></svg>);
export const Users = (p) => (<svg {...base} {...p}><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.5a3 3 0 0 1 0 5M22 20a5.5 5.5 0 0 0-4-5.3"/></svg>);
export const ScrollText = (p) => (<svg {...base} {...p}><path d="M5 4h11a2 2 0 0 1 2 2v12a2 2 0 0 0 2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 0-2-2Z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>);
export const Search = (p) => (<svg {...base} {...p}><circle cx="11" cy="11" r="7"/><path d="m21 21-4-4"/></svg>);
export const Logout = (p) => (<svg {...base} {...p}><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M10 17 5 12l5-5M5 12h12"/></svg>);
export const Check = (p) => (<svg {...base} strokeWidth="2.4" {...p}><path d="m20 6-11 11-5-5"/></svg>);
export const Cross = (p) => (<svg {...base} strokeWidth="2.4" {...p}><path d="M18 6 6 18M6 6l12 12"/></svg>);
export const Clock = (p) => (<svg {...base} {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>);
export const Plus = (p) => (<svg {...base} strokeWidth="2.2" {...p}><path d="M12 5v14M5 12h14"/></svg>);
export const Lock = (p) => (<svg {...base} {...p}><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>);
export const Mail = (p) => (<svg {...base} {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>);
export const ArrowRight = (p) => (<svg {...base} strokeWidth="2" {...p}><path d="M5 12h14M13 6l6 6-6 6"/></svg>);
export const Building = (p) => (<svg {...base} {...p}><path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16"/><path d="M15 9h4a1 1 0 0 1 1 1v11M3 21h18"/><path d="M8 8h2M8 12h2M8 16h2"/></svg>);
export const Download = (p) => (<svg {...base} {...p}><path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>);

// Marque FloPay (carte) — reprend le logo du parcours étudiant
export const Mark = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#06141f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="2" y="5" width="20" height="14" rx="2.5" />
    <line x1="2" y1="10" x2="22" y2="10" />
    <circle cx="7" cy="15" r="1.4" fill="#06141f" stroke="none" />
  </svg>
);
