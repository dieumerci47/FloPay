// src/pages/admin/Payments.js
import React, { useEffect, useState, useCallback } from "react";
import { apiPayments, apiEstablishments, apiExportPayments } from "../../services/adminApi";
import { useAdminAuth } from "../../context/AdminAuth";
import { Panel, Spinner, StatusBadge, Button, fmtMoney, fmtDate } from "../../components/admin/ui";
import { Search, Download } from "../../components/admin/icons";

const STATUSES = [
  { v: "", l: "Tous statuts" },
  { v: "SUCCESS", l: "Payé" },
  { v: "PENDING", l: "En attente" },
  { v: "FAILED", l: "Échoué" },
  { v: "CANCELLED", l: "Annulé" },
];
const METHODS = [{ v: "", l: "Tous moyens" }, { v: "MTN", l: "MTN" }, { v: "AIRTEL", l: "Airtel" }];

// Année académique courante (rentrée en septembre, mois index 8)
function currentAcademicYear() {
  const now = new Date();
  const y = now.getFullYear();
  const start = now.getMonth() >= 8 ? y : y - 1;
  return `${start}-${start + 1}`;
}
const ACADEMIC_YEARS = (() => {
  const [start] = currentAcademicYear().split("-").map(Number);
  const list = Array.from({ length: 4 }, (_, i) => {
    const s = start - i;
    return { v: `${s}-${s + 1}`, l: `${s}-${s + 1}` };
  });
  return [...list, { v: "", l: "Toutes les années" }];
})();

export default function Payments() {
  const { isSuperAdmin } = useAdminAuth();
  const [filters, setFilters] = useState({ search: "", status: "", method: "", establishmentId: "", academicYear: currentAcademicYear() });
  const [page, setPage]       = useState(1);
  const [resp, setResp]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [establishments, setEstablishments] = useState([]);

  const handleExport = async () => {
    setExporting(true);
    const params = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    try { await apiExportPayments(params); } catch (e) { /* silencieux */ } finally { setExporting(false); }
  };

  useEffect(() => {
    if (isSuperAdmin) apiEstablishments().then(setEstablishments).catch(() => {});
  }, [isSuperAdmin]);

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 15 };
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    apiPayments(params)
      .then(setResp)
      .catch(() => setResp({ data: [], pagination: { total: 0, totalPages: 1, page: 1 } }))
      .finally(() => setLoading(false));
  }, [page, filters]);

  // Debounce sur la recherche + déclenchement sur filtres/page
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const setFilter = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };

  const rows = resp?.data || [];
  const pg   = resp?.pagination || { total: 0, totalPages: 1, page: 1 };

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-gold/70">Transactions</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Paiements</h1>
          <p className="mt-1 text-[0.88rem] text-white/45">{pg.total} paiement{pg.total > 1 ? "s" : ""} {isSuperAdmin ? "au total" : "dans votre établissement"}.</p>
        </div>
        <Button variant="ghost" onClick={handleExport} loading={exporting} disabled={pg.total === 0}>
          <Download className="h-4 w-4" /> Exporter en CSV
        </Button>
      </header>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-[16rem] flex-1 items-center gap-2 rounded-xl border border-white/10 bg-ink-900/50 px-3.5">
          <Search className="h-4 w-4 flex-none text-white/35" />
          <input
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            placeholder="Reçu, matricule ou nom…"
            className="w-full bg-transparent py-2.5 text-[0.86rem] text-white placeholder-white/25 outline-none"
          />
        </div>
        {isSuperAdmin && (
          <Select value={filters.establishmentId} onChange={(v) => setFilter("establishmentId", v)}
            options={[{ v: "", l: "Tous établissements" }, ...establishments.map((e) => ({ v: e.id, l: e.code }))]} />
        )}
        <Select value={filters.academicYear} onChange={(v) => setFilter("academicYear", v)} options={ACADEMIC_YEARS} />
        <Select value={filters.status} onChange={(v) => setFilter("status", v)} options={STATUSES} />
        <Select value={filters.method} onChange={(v) => setFilter("method", v)} options={METHODS} />
      </div>

      {/* Table */}
      <Panel>
        {loading ? (
          <div className="flex justify-center py-20"><Spinner className="h-7 w-7" /></div>
        ) : rows.length === 0 ? (
          <p className="py-16 text-center text-[0.88rem] text-white/40">Aucun paiement ne correspond à ces critères.</p>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-[0.84rem]">
                <thead>
                  <tr className="border-b border-white/8 text-[0.68rem] uppercase tracking-wider text-white/35">
                    <th className="px-5 py-3 font-semibold">Étudiant</th>
                    <th className="px-3 py-3 font-semibold">Reçu</th>
                    {isSuperAdmin && <th className="px-3 py-3 font-semibold">Étab.</th>}
                    <th className="px-3 py-3 font-semibold">Niveau</th>
                    <th className="px-3 py-3 text-right font-semibold">Montant</th>
                    <th className="px-3 py-3 font-semibold">Moyen</th>
                    <th className="px-3 py-3 font-semibold">Statut</th>
                    <th className="px-5 py-3 text-right font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rows.map((p) => (
                    <tr key={p.id} className="transition hover:bg-white/[0.03]">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-white">{p.student}</p>
                        <p className="font-mono text-[0.72rem] text-white/40">{p.matricule}</p>
                      </td>
                      <td className="px-3 py-3 font-mono text-[0.76rem] text-white/55">{p.receiptNumber}</td>
                      {isSuperAdmin && <td className="px-3 py-3 text-white/60">{p.establishment}</td>}
                      <td className="px-3 py-3 text-white/60">{p.level}</td>
                      <td className="tabular px-3 py-3 text-right font-mono font-semibold text-white">{fmtMoney(p.amount)}</td>
                      <td className="px-3 py-3 text-white/60">{p.method}</td>
                      <td className="px-3 py-3"><StatusBadge status={p.status} /></td>
                      <td className="px-5 py-3 text-right text-white/45">{fmtDate(p.paidAt || p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="divide-y divide-white/5 md:hidden">
              {rows.map((p) => (
                <div key={p.id} className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{p.student}</p>
                      <p className="truncate font-mono text-[0.72rem] text-white/40">{p.receiptNumber}</p>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[0.78rem]">
                    <span className="text-white/45">{p.level} · {p.method}{isSuperAdmin ? ` · ${p.establishment}` : ""}</span>
                    <span className="tabular font-mono font-semibold text-white">{fmtMoney(p.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {pg.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/8 px-5 py-3 text-[0.8rem]">
            <span className="text-white/40">Page {pg.page} / {pg.totalPages}</span>
            <div className="flex gap-2">
              <PagerBtn disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Précédent</PagerBtn>
              <PagerBtn disabled={page >= pg.totalPages} onClick={() => setPage((p) => p + 1)}>Suivant</PagerBtn>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-white/10 bg-ink-900/50 px-3 py-2.5 text-[0.82rem] font-medium text-white/80 outline-none focus:border-gold/50"
    >
      {options.map((o) => <option key={o.v} value={o.v} className="bg-ink-900">{o.l}</option>)}
    </select>
  );
}

function PagerBtn({ children, ...rest }) {
  return (
    <button
      {...rest}
      className="rounded-lg bg-white/5 px-3 py-1.5 font-semibold text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
