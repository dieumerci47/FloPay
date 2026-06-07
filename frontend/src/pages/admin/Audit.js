// src/pages/admin/Audit.js  (super admin)
import React, { useEffect, useState, useCallback } from "react";
import { apiAuditLogs } from "../../services/adminApi";
import { Panel, Spinner, fmtDateTime } from "../../components/admin/ui";

const ACTIONS = [
  { v: "", l: "Toutes les actions" },
  { v: "LOGIN", l: "Connexions" },
  { v: "LOGIN_FAILED", l: "Connexions échouées" },
  { v: "VERIFY_RECEIPT", l: "Vérifications de reçu" },
  { v: "SEARCH_MATRICULE", l: "Recherches matricule" },
  { v: "CREATE_ADMIN", l: "Création d'admin" },
  { v: "DISABLE_ADMIN", l: "Désactivations" },
  { v: "RESET_PASSWORD", l: "Réinit. mot de passe" },
];

const ACTION_STYLE = {
  LOGIN:           "bg-mint/15 text-emerald-300",
  LOGIN_FAILED:    "bg-red-500/15 text-red-300",
  VERIFY_RECEIPT:  "bg-gold/15 text-gold-300",
  SEARCH_MATRICULE:"bg-white/8 text-white/70",
  CREATE_ADMIN:    "bg-ink-600/40 text-sky-300",
  ENABLE_ADMIN:    "bg-mint/15 text-emerald-300",
  DISABLE_ADMIN:   "bg-red-500/15 text-red-300",
  RESET_PASSWORD:  "bg-gold/15 text-gold-300",
};

const PERIODS = [
  { v: "7", l: "7 derniers jours" },
  { v: "30", l: "30 derniers jours" },
  { v: "90", l: "90 derniers jours" },
  { v: "365", l: "12 derniers mois" },
  { v: "", l: "Tout l'historique" },
];

export default function Audit() {
  const [action, setAction] = useState("");
  const [period, setPeriod] = useState("30");
  const [page, setPage]     = useState(1);
  const [resp, setResp]     = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 30 };
    if (action) params.action = action;
    if (period) params.from = new Date(Date.now() - parseInt(period, 10) * 86400000).toISOString();
    apiAuditLogs(params).then(setResp).catch(() => setResp({ data: [], pagination: { totalPages: 1, page: 1, total: 0 } })).finally(() => setLoading(false));
  }, [page, action, period]);
  useEffect(() => { load(); }, [load]);

  const rows = resp?.data || [];
  const pg   = resp?.pagination || { totalPages: 1, page: 1, total: 0 };

  return (
    <div className="space-y-7">
      <header className="animate-fade-up flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-gold/70">Traçabilité</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Journal d'audit</h1>
          <p className="mt-1 text-[0.88rem] text-white/45">{pg.total} événement{pg.total > 1 ? "s" : ""} enregistré{pg.total > 1 ? "s" : ""}.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select value={period} onChange={(e) => { setPeriod(e.target.value); setPage(1); }}
            className="rounded-xl border border-white/10 bg-ink-900/50 px-3.5 py-2.5 text-[0.82rem] font-medium text-white/80 outline-none focus:border-gold/50">
            {PERIODS.map((p) => <option key={p.v} value={p.v} className="bg-ink-900">{p.l}</option>)}
          </select>
          <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}
            className="rounded-xl border border-white/10 bg-ink-900/50 px-3.5 py-2.5 text-[0.82rem] font-medium text-white/80 outline-none focus:border-gold/50">
            {ACTIONS.map((a) => <option key={a.v} value={a.v} className="bg-ink-900">{a.l}</option>)}
          </select>
        </div>
      </header>

      <Panel>
        {loading ? (
          <div className="flex justify-center py-16"><Spinner className="h-7 w-7" /></div>
        ) : rows.length === 0 ? (
          <p className="py-16 text-center text-[0.88rem] text-white/40">Aucun événement.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {rows.map((l) => (
              <div key={l.id} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-3">
                <span className={"rounded-md px-2 py-0.5 text-[0.68rem] font-bold tracking-wide " + (ACTION_STYLE[l.action] || "bg-white/8 text-white/60")}>
                  {l.action}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-[0.78rem] text-white/55">{l.target || "—"}</span>
                <span className="text-[0.78rem] text-white/70">{l.admin}</span>
                {l.ip && <span className="hidden font-mono text-[0.72rem] text-white/30 sm:inline">{l.ip}</span>}
                <span className="tabular w-32 flex-none text-right text-[0.74rem] text-white/40">{fmtDateTime(l.createdAt)}</span>
              </div>
            ))}
          </div>
        )}

        {pg.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/8 px-5 py-3 text-[0.8rem]">
            <span className="text-white/40">Page {pg.page} / {pg.totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                className="rounded-lg bg-white/5 px-3 py-1.5 font-semibold text-white/80 transition hover:bg-white/10 disabled:opacity-40">Précédent</button>
              <button disabled={page >= pg.totalPages} onClick={() => setPage((p) => p + 1)}
                className="rounded-lg bg-white/5 px-3 py-1.5 font-semibold text-white/80 transition hover:bg-white/10 disabled:opacity-40">Suivant</button>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
