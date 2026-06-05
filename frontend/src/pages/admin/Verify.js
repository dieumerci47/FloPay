// src/pages/admin/Verify.js
import React, { useState, useRef } from "react";
import { apiVerifyReceipt, apiSearchMatricule } from "../../services/adminApi";
import { Panel, Spinner, StatusBadge, fmtMoney, fmtDate } from "../../components/admin/ui";
import { Receipt, Search, Check, Cross, ArrowRight } from "../../components/admin/icons";

const MODES = [
  { key: "receipt",   label: "N° de reçu",  placeholder: "PAIE_20260604_XXXX" },
  { key: "matricule", label: "Matricule",   placeholder: "Matricule étudiant" },
];

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="text-[0.78rem] text-white/40">{label}</span>
      <span className="text-right text-[0.86rem] font-semibold text-white">{value || "—"}</span>
    </div>
  );
}

export default function Verify() {
  const [mode, setMode]       = useState("receipt");
  const [query, setQuery]     = useState("");
  const [state, setState]     = useState({ loading: false, error: null, data: null, kind: null });
  const inputRef = useRef(null);

  const reset = () => setState({ loading: false, error: null, data: null, kind: null });

  const submit = async (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setState({ loading: true, error: null, data: null, kind: null });
    try {
      if (mode === "receipt") {
        const data = await apiVerifyReceipt(q);
        setState({ loading: false, error: null, data, kind: "receipt" });
      } else {
        const data = await apiSearchMatricule(q);
        setState({ loading: false, error: null, data, kind: "matricule" });
      }
    } catch (err) {
      const status = err.response?.status;
      const msg =
        status === 404 ? "Aucun résultat ne correspond à cette référence."
        : status === 403 ? "Cette référence n'appartient pas à votre établissement."
        : err.response?.data?.message || "Vérification impossible pour le moment.";
      setState({ loading: false, error: msg, data: null, kind: null });
    }
  };

  const { loading, error, data, kind } = state;
  const paid =
    kind === "receipt" ? data?.status === "SUCCESS" :
    kind === "matricule" ? data?.paymentStatus === "PAYÉ" : false;

  return (
    <div className="space-y-7">
      <header className="animate-fade-up">
        <p className="text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-gold/70">Contrôle</p>
        <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Vérification de paiement</h1>
        <p className="mt-1 text-[0.88rem] text-white/45">Confirmez qu'un paiement a bien été reçu avant validation administrative.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recherche */}
        <div className="lg:col-span-2">
          <Panel className="animate-fade-up" title="Rechercher">
            <form onSubmit={submit} className="p-5">
              {/* Sélecteur de mode */}
              <div className="mb-4 grid grid-cols-2 gap-1.5 rounded-xl bg-ink-950/60 p-1">
                {MODES.map((m) => (
                  <button
                    key={m.key} type="button"
                    onClick={() => { setMode(m.key); reset(); setQuery(""); inputRef.current?.focus(); }}
                    className={"rounded-lg py-2 text-[0.8rem] font-semibold transition " +
                      (mode === m.key ? "bg-gold text-ink-950 shadow" : "text-white/55 hover:text-white")}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-950/60 px-3.5 focus-within:border-gold/60 focus-within:ring-2 focus-within:ring-gold/20">
                {mode === "receipt" ? <Receipt className="h-4 w-4 flex-none text-white/35" /> : <Search className="h-4 w-4 flex-none text-white/35" />}
                <input
                  ref={inputRef} autoFocus value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={MODES.find((m) => m.key === mode).placeholder}
                  className="w-full bg-transparent py-3 font-mono text-[0.88rem] text-white placeholder-white/25 outline-none"
                />
              </div>

              <button
                type="submit" disabled={loading || !query.trim()}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 font-display text-[0.9rem] font-bold text-ink-950 shadow-glow transition hover:bg-gold-400 disabled:opacity-50"
              >
                {loading ? <Spinner className="h-4 w-4 border-ink-950/30 border-t-ink-950" /> : <>Vérifier <ArrowRight className="h-4 w-4" /></>}
              </button>

              <p className="mt-3 text-[0.72rem] text-white/30">Chaque vérification est enregistrée dans le journal d'audit.</p>
            </form>
          </Panel>
        </div>

        {/* Résultat */}
        <div className="lg:col-span-3">
          {!data && !error && !loading && (
            <div className="flex h-full min-h-[20rem] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-ink-900/30 p-10 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-white/30"><Receipt className="h-7 w-7" /></span>
              <p className="mt-4 text-[0.9rem] font-semibold text-white/60">En attente d'une référence</p>
              <p className="mt-1 max-w-xs text-[0.8rem] text-white/35">Saisissez un numéro de reçu ou un matricule pour afficher le statut du paiement.</p>
            </div>
          )}

          {loading && (
            <div className="flex h-full min-h-[20rem] items-center justify-center rounded-2xl border border-white/8 bg-ink-900/40">
              <Spinner className="h-8 w-8" />
            </div>
          )}

          {error && (
            <div className="flex h-full min-h-[20rem] flex-col items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/5 p-10 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 text-red-300"><Cross className="h-7 w-7" /></span>
              <p className="mt-4 font-display text-lg font-bold text-white">Introuvable</p>
              <p className="mt-1 max-w-xs text-[0.84rem] text-white/45">{error}</p>
            </div>
          )}

          {data && (
            <div className="animate-fade-up overflow-hidden rounded-2xl border border-white/8 bg-ink-900/50 shadow-card">
              {/* Verdict */}
              <div className={"flex items-center gap-4 px-6 py-5 " + (paid ? "bg-mint/15" : "bg-red-500/10")}>
                <span className={"flex h-14 w-14 flex-none items-center justify-center rounded-full text-white " + (paid ? "bg-mint" : "bg-red-500")}>
                  {paid ? <Check className="h-7 w-7" /> : <Cross className="h-7 w-7" />}
                </span>
                <div>
                  <p className={"font-display text-xl font-extrabold " + (paid ? "text-emerald-300" : "text-red-300")}>
                    {paid ? "PAYÉ" : "NON PAYÉ"}
                  </p>
                  <p className="text-[0.8rem] text-white/50">
                    {kind === "receipt"
                      ? <>Reçu <span className="font-mono">{data.receiptNumber}</span></>
                      : <>Matricule <span className="font-mono">{data.student?.matricule}</span></>}
                  </p>
                </div>
              </div>

              <div className="p-6">
                {/* Montant (mode reçu) */}
                {kind === "receipt" && (
                  <div className="mb-5 rounded-xl border border-white/8 bg-ink-950/50 px-5 py-4 text-center">
                    <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-white/40">Montant</p>
                    <p className="tabular mt-1 font-display text-3xl font-extrabold text-white">{fmtMoney(data.amount)}</p>
                    <p className="mt-0.5 text-[0.78rem] text-white/40">Année académique {data.academicYear}</p>
                  </div>
                )}

                {/* Identité étudiant */}
                <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wider text-white/35">Étudiant</p>
                <div className="divide-y divide-white/5">
                  {kind === "receipt" ? (
                    <>
                      <InfoRow label="Nom complet" value={data.student.fullName} />
                      <InfoRow label="Matricule" value={<span className="font-mono">{data.student.matricule}</span>} />
                      <InfoRow label="Établissement" value={data.student.establishment} />
                      <InfoRow label="Parcours" value={data.student.program} />
                      <InfoRow label="Niveau" value={data.student.level} />
                    </>
                  ) : (
                    <>
                      <InfoRow label="Nom complet" value={data.student.fullName} />
                      <InfoRow label="Matricule" value={<span className="font-mono">{data.student.matricule}</span>} />
                      <InfoRow label="Établissement" value={data.student.establishment} />
                      <InfoRow label="Parcours" value={data.student.program} />
                      <InfoRow label="Niveau" value={data.student.level} />
                      <InfoRow label="Téléphone" value={data.student.phone} />
                    </>
                  )}
                </div>

                {/* Détails paiement */}
                {kind === "receipt" ? (
                  <>
                    <p className="mb-1 mt-5 text-[0.7rem] font-semibold uppercase tracking-wider text-white/35">Paiement</p>
                    <div className="divide-y divide-white/5">
                      <InfoRow label="Statut" value={<StatusBadge status={data.status} />} />
                      <InfoRow label="Moyen" value={`${data.paymentMethod} Mobile Money`} />
                      <InfoRow label="Date de paiement" value={fmtDate(data.paidAt)} />
                      <InfoRow label="Référence" value={<span className="font-mono">{data.receiptNumber}</span>} />
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mb-1 mt-5 text-[0.7rem] font-semibold uppercase tracking-wider text-white/35">
                      Historique des paiements ({data.allPayments.length})
                    </p>
                    <div className="divide-y divide-white/5">
                      {data.allPayments.length === 0 && <p className="py-3 text-[0.82rem] text-white/40">Aucun paiement enregistré.</p>}
                      {data.allPayments.map((p) => (
                        <div key={p.receiptNumber} className="flex items-center justify-between gap-3 py-2.5">
                          <div className="min-w-0">
                            <p className="truncate font-mono text-[0.78rem] text-white/70">{p.receiptNumber}</p>
                            <p className="text-[0.7rem] text-white/35">{p.niveau} · {p.academicYear}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="tabular font-mono text-[0.82rem] font-semibold text-white">{fmtMoney(p.amount)}</span>
                            <StatusBadge status={p.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
