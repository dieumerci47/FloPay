// src/pages/admin/Dashboard.js
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiDashboard } from "../../services/adminApi";
import { useAdminAuth } from "../../context/AdminAuth";
import { StatCard, Panel, Spinner, StatusBadge, fmtMoney, fmtDateTime } from "../../components/admin/ui";
import { Wallet, Check, Clock, Cross, Building, ArrowRight, Receipt } from "../../components/admin/icons";

export default function Dashboard() {
  const { admin, isSuperAdmin } = useAdminAuth();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let active = true;
    apiDashboard()
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e.response?.data?.message || "Chargement impossible"))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  if (loading) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div>;
  if (error)   return <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-300">{error}</div>;

  const { overview, byMethod, byEstablishment, recentPayments } = data;
  const maxRev = Math.max(1, ...(byEstablishment || []).map((e) => e.revenue));

  return (
    <div className="space-y-7">
      {/* En-tête */}
      <header className="animate-fade-up">
        <p className="text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-gold/70">
          {isSuperAdmin ? "Supervision globale" : admin?.establishment?.name}
        </p>
        <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Bonjour, {admin?.fullName?.split(" ")[0]} 👋
        </h1>
        <p className="mt-1 text-[0.88rem] text-white/45">
          {isSuperAdmin
            ? "Vue d'ensemble des paiements de tous les établissements."
            : "Suivi des paiements de votre établissement."}
        </p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Wallet} accent="gold"  label="Recettes" value={fmtMoney(overview.revenue)} sub={`${overview.success} paiements validés`} delay={0} />
        <StatCard icon={Check}  accent="mint"  label="Validés"   value={overview.success} delay={60} />
        <StatCard icon={Clock}  accent="gold"  label="En attente" value={overview.pending} delay={120} />
        <StatCard icon={Cross}  accent="red"   label="Échoués"   value={overview.failed} delay={180} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Colonne gauche : établissements (super) ou méthodes */}
        <div className="space-y-5 lg:col-span-2">
          {isSuperAdmin && byEstablishment && (
            <Panel title="Recettes par établissement">
              <div className="divide-y divide-white/5">
                {byEstablishment.map((e) => (
                  <div key={e.id} className="flex items-center gap-4 px-5 py-3.5">
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-white/5 text-gold">
                      <Building className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="truncate text-[0.86rem] font-semibold text-white">{e.name}</p>
                        <p className="tabular flex-none font-mono text-[0.82rem] font-semibold text-gold">{fmtMoney(e.revenue)}</p>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
                          <div className="h-full rounded-full bg-gradient-to-r from-gold-600 to-gold" style={{ width: `${(e.revenue / maxRev) * 100}%` }} />
                        </div>
                        <span className="tabular w-12 flex-none text-right text-[0.7rem] text-white/40">{e.count} pmts</span>
                      </div>
                    </div>
                  </div>
                ))}
                {byEstablishment.length === 0 && <p className="px-5 py-6 text-center text-[0.85rem] text-white/40">Aucune donnée.</p>}
              </div>
            </Panel>
          )}

          {/* Derniers paiements */}
          <Panel
            title="Derniers paiements validés"
            action={<Link to="/admin/paiements" className="inline-flex items-center gap-1 text-[0.76rem] font-semibold text-gold hover:text-gold-300">Tout voir <ArrowRight className="h-3.5 w-3.5" /></Link>}
          >
            <div className="divide-y divide-white/5">
              {recentPayments.map((p) => (
                <div key={p.receiptNumber} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[0.86rem] font-semibold text-white">{p.student}</p>
                    <p className="truncate font-mono text-[0.72rem] text-white/40">{p.receiptNumber}{isSuperAdmin ? ` · ${p.establishment}` : ""}</p>
                  </div>
                  <div className="flex-none text-right">
                    <p className="tabular font-mono text-[0.82rem] font-semibold text-emerald-300">{fmtMoney(p.amount)}</p>
                    <p className="text-[0.68rem] text-white/35">{fmtDateTime(p.paidAt)}</p>
                  </div>
                </div>
              ))}
              {recentPayments.length === 0 && <p className="px-5 py-6 text-center text-[0.85rem] text-white/40">Aucun paiement validé pour le moment.</p>}
            </div>
          </Panel>
        </div>

        {/* Colonne droite : méthodes + raccourci vérif */}
        <div className="space-y-5">
          <Panel title="Par moyen de paiement">
            <div className="space-y-3 p-5">
              {byMethod.length === 0 && <p className="text-center text-[0.85rem] text-white/40">—</p>}
              {byMethod.map((m) => (
                <div key={m.method} className="rounded-xl border border-white/8 bg-ink-950/40 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[0.8rem] font-semibold text-white">{m.method} Mobile Money</span>
                    <StatusBadge status="SUCCESS" />
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="tabular font-mono text-lg font-bold text-white">{fmtMoney(m.revenue)}</span>
                    <span className="text-[0.74rem] text-white/40">{m.count} transactions</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Raccourci vérification */}
          <Link
            to="/admin/verifier"
            className="group flex items-center gap-4 rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/15 to-transparent p-5 transition hover:border-gold/60"
          >
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-gold text-ink-950 shadow-glow">
              <Receipt className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="font-display text-[0.95rem] font-bold text-white">Vérifier un reçu</p>
              <p className="text-[0.76rem] text-white/45">Contrôler un paiement par n° de reçu</p>
            </div>
            <ArrowRight className="h-5 w-5 text-gold transition group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}
