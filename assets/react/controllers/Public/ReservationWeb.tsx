import { ReactNode, useEffect, useState } from "react"

type Props = { base: string }

type Ville = { id: number; nom: string }
type Gare = { id: number; libelle: string; ville?: string | null }
type Destination = { gare: Gare; montant: number }
// Aligné sur DepartPubliqueDto (BK) — structure PLATE : voyageId / codevoyage / datedepartprevue au 1er niveau
type Trajet = { voyageId: number; codevoyage: string; datedepartprevue: string; datearriveeprevue?: string | null; placesDisponibles: number; montant: number | null }
type Reservation = {
    code: string; statut: string; etatpaiement: string; montant: number | null; dateexpiration?: string | null
    montee?: string | null; descente?: string | null; codevoyage?: string | null; datedepartprevue?: string | null
    paiement?: { reference: string; url: string | null; estSimule: boolean } | null
}

type Step = "ville" | "gare" | "destination" | "depart" | "form" | "paiement" | "billet"
const NAV: Step[] = ["ville", "gare", "destination", "depart", "form"]
const QUESTION: Record<string, string> = {
    ville: "Où partez-vous ?", gare: "Votre gare de départ", destination: "Votre destination",
    depart: "Choisissez votre départ", form: "Vos informations",
}

async function getJson<T>(url: string): Promise<T> {
    const r = await fetch(url, { headers: { Accept: "application/json" } })
    if (!r.ok) { let m = "Une erreur est survenue"; try { m = (await r.json()).error ?? m } catch { /**/ } throw new Error(m) }
    return r.json()
}
async function postJson<T>(url: string, body: unknown): Promise<T> {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) })
    const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error((d as { error?: string }).error ?? "Une erreur est survenue"); return d as T
}
const money = (n: number | null | undefined) => (n == null ? "—" : `${n.toLocaleString("fr-FR")} FCFA`)
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
function fmtDate(iso?: string | null) {
    if (!iso) return { jour: "—", heure: "" }
    try { const d = new Date(iso); return { jour: cap(d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })), heure: d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) } }
    catch { return { jour: iso, heure: "" } }
}
const STATUT: Record<string, { label: string; cls: string }> = {
    EN_ATTENTE: { label: "En attente", cls: "text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400" },
    CONFIRMEE: { label: "Payée", cls: "text-green-700 bg-green-50 dark:bg-green-950/40 dark:text-green-400" },
    EXPIREE: { label: "Expirée", cls: "text-muted-foreground bg-muted" },
    ANNULEE: { label: "Annulée", cls: "text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400" },
}

export default function ReservationWeb({ base }: Props) {
    const [mode, setMode] = useState<"booking" | "history">("booking")
    const [step, setStep] = useState<Step>("ville")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [villes, setVilles] = useState<Ville[]>([])
    const [ville, setVille] = useState<Ville | null>(null)
    const [gares, setGares] = useState<Gare[]>([])
    const [gare, setGare] = useState<Gare | null>(null)
    const [destinations, setDestinations] = useState<Destination[]>([])
    const [destination, setDestination] = useState<Destination | null>(null)
    const [trajets, setTrajets] = useState<Trajet[]>([])
    const [trajet, setTrajet] = useState<Trajet | null>(null)
    const [nom, setNom] = useState(""); const [contact, setContact] = useState(""); const [busy, setBusy] = useState(false)
    const [reservation, setReservation] = useState<Reservation | null>(null)

    const load = async <T,>(url: string, set: (v: T) => void) => {
        setLoading(true); setError(null); try { set(await getJson<T>(url)) } catch (e) { setError((e as Error).message) } finally { setLoading(false) }
    }
    useEffect(() => { load<Ville[]>(`${base}/api/villes`, setVilles) }, [base])
    useEffect(() => {
        const p = new URLSearchParams(window.location.search); const code = p.get("code"); const c = sessionStorage.getItem("wc_contact")
        if (code && c) { setContact(c); getJson<Reservation>(`${base}/api/suivi?code=${encodeURIComponent(code)}&contact=${encodeURIComponent(c)}`).then(r => { setReservation(r); setStep("billet") }).catch(() => { /**/ }) }
    }, [base])

    const stepIndex = NAV.indexOf(step)
    const chooseVille = (v: Ville) => { setVille(v); setGare(null); setDestination(null); setTrajet(null); setStep("gare"); load<Gare[]>(`${base}/api/gares?ville=${v.id}`, setGares) }
    const chooseGare = (g: Gare) => { setGare(g); setDestination(null); setTrajet(null); setStep("destination"); load<Destination[]>(`${base}/api/destinations?gare=${g.id}`, setDestinations) }
    const chooseDest = (d: Destination) => { setDestination(d); setTrajet(null); setStep("depart"); load<Trajet[]>(`${base}/api/departs?provenance=${gare!.id}&destination=${d.gare.id}`, setTrajets) }
    const goto = (s: Step) => { if (NAV.indexOf(s) <= stepIndex && stepIndex >= 0) setStep(s) }
    const back = () => { if (stepIndex > 0) setStep(NAV[stepIndex - 1]) }

    const creer = async () => {
        if (!trajet || !gare || !destination) return
        setBusy(true); setError(null)
        try {
            const r = await postJson<Reservation>(`${base}/api/reservations`, { nom: nom.trim(), contact: contact.trim(), voyage: trajet.voyageId, montee: gare.id, descente: destination.gare.id, returnUrl: `${window.location.origin}${base}?code={code}` })
            sessionStorage.setItem("wc_contact", contact.trim()); setReservation(r)
            if (r.paiement?.estSimule || !r.paiement?.url) setStep("paiement"); else window.location.href = r.paiement.url
        } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
    }
    const payer = async () => {
        if (!reservation?.paiement) return
        setBusy(true); setError(null)
        try { await postJson(`${base}/api/webhook`, { reference: reservation.paiement.reference, status: "SUCCESS" }); const r = await getJson<Reservation>(`${base}/api/suivi?code=${encodeURIComponent(reservation.code)}&contact=${encodeURIComponent(contact.trim())}`); setReservation(r); setStep("billet") }
        catch (e) { setError((e as Error).message) } finally { setBusy(false) }
    }

    if (mode === "history") return <Historique base={base} onClose={() => setMode("booking")} />
    if (step === "paiement" && reservation) return <Paiement r={reservation} busy={busy} error={error} onPay={payer} />
    if (step === "billet" && reservation) return <Billet base={base} r={reservation} contact={contact} onNew={() => (window.location.href = base)} />

    const trail = [ville && { k: "ville" as Step, l: ville.nom }, gare && { k: "gare" as Step, l: gare.libelle }, destination && { k: "destination" as Step, l: destination.gare.libelle }, trajet && { k: "depart" as Step, l: fmtDate(trajet.datedepartprevue).heure }].filter(Boolean) as { k: Step; l: string }[]

    return (
        <div>
            {step === "ville" && (
                <div className="mb-7 flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-[1.5rem] leading-tight font-semibold tracking-tight">Réservez votre trajet</h1>
                        <p className="text-sm text-muted-foreground mt-1.5">Payez en ligne, retirez votre billet à la gare.</p>
                    </div>
                    <button onClick={() => setMode("history")} className="mt-1 shrink-0 text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">Mes réservations</button>
                </div>
            )}

            {step !== "ville" && (
                <div className="flex items-center gap-1 mb-5">
                    {NAV.map((s, i) => <span key={s} className={`h-[3px] flex-1 rounded-full ${i <= stepIndex ? "bg-foreground" : "bg-border"}`} />)}
                </div>
            )}
            {stepIndex > 0 && (
                <div className="flex items-center justify-between mb-4 -mt-1">
                    <button onClick={back} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><Chevron className="size-3.5 rotate-180" /> Retour</button>
                    <span className="text-xs text-muted-foreground">Étape {stepIndex + 1} / {NAV.length}</span>
                </div>
            )}

            {trail.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 mb-4 text-sm text-muted-foreground">
                    {trail.map((t, i) => <span key={t.k} className="inline-flex items-center gap-1.5">{i > 0 && <span className="opacity-40">/</span>}<button onClick={() => goto(t.k)} className="hover:text-foreground hover:underline underline-offset-2">{t.l}</button></span>)}
                </div>
            )}

            <div key={step} className="wc-in">
                {stepIndex >= 0 && <h2 className="text-lg font-semibold tracking-tight mb-3.5">{QUESTION[step]}</h2>}
                {error && <Alert msg={error} />}
                {loading ? <Skeleton /> : (<>
                    {step === "ville" && <List empty="Aucune ville disponible.">{villes.map(v => <Row key={v.id} icon={<Pin />} title={v.nom} onClick={() => chooseVille(v)} />)}</List>}
                    {step === "gare" && <List empty="Aucune gare dans cette ville.">{gares.map(g => <Row key={g.id} icon={<Station />} title={g.libelle} subtitle={g.ville ?? undefined} onClick={() => chooseGare(g)} />)}</List>}
                    {step === "destination" && <List empty="Aucune destination desservie.">{destinations.map(d => <Row key={d.gare.id} icon={<Route />} title={d.gare.libelle} subtitle={d.gare.ville ?? undefined} right={money(d.montant)} onClick={() => chooseDest(d)} />)}</List>}
                    {step === "depart" && <List empty="Aucun départ disponible sur ce trajet pour le moment. Essayez un autre trajet, ou revenez plus tard : de nouveaux départs sont ajoutés régulièrement.">{trajets.map(t => { const dt = fmtDate(t.datedepartprevue); return <Row key={t.voyageId} icon={<Clock />} title={`${dt.jour} · ${dt.heure}`} subtitle={<Places n={t.placesDisponibles} />} right={money(t.montant)} onClick={() => { setTrajet(t); setStep("form") }} />})}</List>}
                    {step === "form" && trajet && gare && destination && <Form gare={gare} destination={destination} trajet={trajet} nom={nom} setNom={setNom} contact={contact} setContact={setContact} busy={busy} onSubmit={creer} />}
                </>)}
            </div>
        </div>
    )
}

/* ─────────── Vues terminales / historique ─────────── */
function Paiement({ r, busy, error, onPay }: { r: Reservation; busy: boolean; error: string | null; onPay: () => void }) {
    return (
        <div className="wc-in max-w-sm mx-auto">
            <div className="wc-hair rounded-2xl p-6 text-center bg-card">
                <p className="text-sm text-muted-foreground">Réservation</p>
                <p className="font-mono font-semibold tracking-wide">{r.code}</p>
                <div className="my-6"><p className="text-xs text-muted-foreground uppercase tracking-wide">Montant</p><p className="text-3xl font-semibold tabular-nums mt-1">{money(r.montant)}</p></div>
                {error && <Alert msg={error} />}
                <Cta onClick={onPay} busy={busy} label="Payer maintenant" busyLabel="Traitement…" />
                <p className="mt-3 text-[11px] text-muted-foreground">Paiement Mobile Money · mode démonstration (aucun débit réel).</p>
            </div>
        </div>
    )
}

function Billet({ base, r, contact, onNew }: { base: string; r: Reservation; contact: string; onNew: () => void }) {
    const dt = fmtDate(r.datedepartprevue); const paye = r.etatpaiement === "PAYE"; const st = STATUT[r.statut] ?? STATUT.EN_ATTENTE
    return (
        <div className="wc-in max-w-sm mx-auto">
            <div className="text-center mb-5">
                <span className="mx-auto mb-3 inline-flex size-11 items-center justify-center rounded-full border border-border">{paye ? <Check /> : <Dots />}</span>
                <h2 className="text-xl font-semibold tracking-tight">{paye ? "Réservation confirmée" : "Paiement en attente"}</h2>
                <p className="text-sm text-muted-foreground mt-1">Présentez votre bon à la gare pour retirer votre billet.</p>
            </div>
            <div className="wc-hair rounded-2xl overflow-hidden bg-card">
                <div className="px-5 pt-5 pb-4 flex items-start justify-between">
                    <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Bon de réservation</p><p className="text-2xl font-semibold tracking-widest mt-0.5">{r.code}</p></div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${st.cls}`}>{st.label}</span>
                </div>
                <div className="wc-notch mx-5"></div>
                <div className="p-5">
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Départ</p><p className="font-medium truncate">{r.montee ?? "—"}</p></div>
                        <ArrowRight />
                        <div className="min-w-0 text-right"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Arrivée</p><p className="font-medium truncate">{r.descente ?? "—"}</p></div>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm border-t border-border pt-4">
                        <Info l="Départ prévu" v={`${dt.jour} · ${dt.heure}`} />
                        <Info l="Montant" v={money(r.montant)} r strong />
                        <Info l="Voyage" v={r.codevoyage ?? "—"} mono />
                        <Info l="Passager" v={contact} r />
                    </dl>
                </div>
            </div>
            <div className="mt-4 space-y-2.5">
                {paye && <a href={`${base}/bon?code=${encodeURIComponent(r.code)}&contact=${encodeURIComponent(contact)}`} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-foreground text-background text-base font-medium hover:opacity-90 transition-opacity"><Download /> Télécharger le bon (PDF)</a>}
                <button onClick={onNew} className="flex h-11 w-full items-center justify-center rounded-xl wc-hair text-sm font-medium hover:bg-muted transition-colors">Nouvelle réservation</button>
            </div>
        </div>
    )
}

function Historique({ base, onClose }: { base: string; onClose: () => void }) {
    const [contact, setContact] = useState(sessionStorage.getItem("wc_contact") ?? "")
    const [list, setList] = useState<Reservation[] | null>(null)
    const [sel, setSel] = useState<Reservation | null>(null)
    const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null)

    const chercher = async () => {
        if (contact.trim().length < 6) return
        setBusy(true); setError(null)
        try { setList(await getJson<Reservation[]>(`${base}/api/historique?contact=${encodeURIComponent(contact.trim())}`)) }
        catch (e) { setError((e as Error).message) } finally { setBusy(false) }
    }
    if (sel) return <div><button onClick={() => setSel(null)} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><Chevron className="size-3.5 rotate-180" /> Retour</button><Billet base={base} r={sel} contact={contact.trim()} onNew={onClose} /></div>

    return (
        <div className="wc-in">
            <div className="mb-6 flex items-start justify-between gap-4">
                <div><h1 className="text-[1.5rem] leading-tight font-semibold tracking-tight">Mes réservations</h1><p className="text-sm text-muted-foreground mt-1.5">Retrouvez-les avec votre numéro de téléphone.</p></div>
                <button onClick={onClose} className="mt-1 shrink-0 text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">Réserver</button>
            </div>
            <div className="flex gap-2 mb-5">
                <div className="relative flex-1"><span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"><Phone /></span><input value={contact} onChange={e => setContact(e.target.value)} onKeyDown={e => e.key === "Enter" && chercher()} className="input w-full pl-9" placeholder="Votre téléphone" inputMode="tel" /></div>
                <button onClick={chercher} disabled={busy || contact.trim().length < 6} className="rounded-xl bg-foreground text-background px-4 text-sm font-medium hover:opacity-90 disabled:opacity-50">{busy ? "…" : "Voir"}</button>
            </div>
            {error && <Alert msg={error} />}
            {list !== null && (list.length === 0
                ? <div className="wc-hair rounded-xl py-10 text-center text-sm text-muted-foreground">Aucune réservation trouvée pour ce numéro.</div>
                : <div className="space-y-2.5">{list.map(r => { const dt = fmtDate(r.datedepartprevue); const st = STATUT[r.statut] ?? STATUT.EN_ATTENTE; return (
                    <button key={r.code} onClick={() => setSel(r)} className="wc-hair wc-tap w-full rounded-xl px-4 py-3 text-left flex items-center justify-between gap-3">
                        <span className="min-w-0"><span className="flex items-center gap-2"><span className="font-mono font-medium">{r.code}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${st.cls}`}>{st.label}</span></span><span className="block text-xs text-muted-foreground mt-1 truncate">{r.montee ?? "—"} → {r.descente ?? "—"} · {dt.jour}</span></span>
                        <span className="text-sm font-semibold tabular-nums shrink-0">{money(r.montant)}</span>
                    </button>)})}</div>)}
        </div>
    )
}

/* ─────────── Sous-composants ─────────── */
function Form({ gare, destination, trajet, nom, setNom, contact, setContact, busy, onSubmit }: { gare: Gare; destination: Destination; trajet: Trajet; nom: string; setNom: (v: string) => void; contact: string; setContact: (v: string) => void; busy: boolean; onSubmit: () => void }) {
    const dt = fmtDate(trajet.datedepartprevue); const valid = nom.trim().length > 1 && contact.trim().length >= 6
    return (
        <div>
            <div className="wc-hair rounded-xl p-4 mb-5 bg-muted/40">
                <div className="flex items-center gap-2 text-sm font-medium"><span className="truncate">{gare.libelle}</span><ArrowRight className="size-4 shrink-0 text-muted-foreground" /><span className="truncate">{destination.gare.libelle}</span></div>
                <div className="mt-1.5 flex items-center justify-between text-sm"><span className="text-muted-foreground">{dt.jour} · {dt.heure}</span><span className="font-semibold tabular-nums">{money(trajet.montant)}</span></div>
            </div>
            <div className="space-y-3.5">
                <Field label="Nom complet" icon={<User />}><input value={nom} onChange={e => setNom(e.target.value)} className="input w-full pl-9" placeholder="Votre nom et prénom" autoComplete="name" /></Field>
                <Field label="Téléphone" icon={<Phone />}><input value={contact} onChange={e => setContact(e.target.value)} className="input w-full pl-9" placeholder="Ex. 07 00 00 00 00" inputMode="tel" autoComplete="tel" /></Field>
            </div>
            <div className="mt-5"><Cta onClick={onSubmit} busy={busy} disabled={!valid} label={`Continuer · ${money(trajet.montant)}`} busyLabel="Un instant…" /></div>
            <p className="mt-3 text-center text-xs text-muted-foreground">Votre place est tenue jusqu'à l'échéance indiquée après paiement.</p>
        </div>
    )
}
function Cta({ onClick, busy, disabled, label, busyLabel }: { onClick: () => void; busy: boolean; disabled?: boolean; label: string; busyLabel: string }) {
    return <button onClick={onClick} disabled={busy || disabled} className="flex h-12 w-full items-center justify-center rounded-xl bg-foreground text-background text-base font-medium hover:opacity-90 transition-opacity disabled:opacity-50">{busy ? <span className="inline-flex items-center gap-2"><Spinner /> {busyLabel}</span> : label}</button>
}
function List({ children, empty }: { children: ReactNode; empty: string }) {
    const arr = (Array.isArray(children) ? children : [children]).filter(Boolean)
    if (arr.length === 0) return <div className="wc-hair rounded-xl py-10 text-center text-sm text-muted-foreground px-6">{empty}</div>
    return <div className="space-y-2">{children}</div>
}
function Row({ icon, title, subtitle, right, onClick }: { icon: ReactNode; title: string; subtitle?: ReactNode; right?: ReactNode; onClick: () => void }) {
    return (
        <button onClick={onClick} className="wc-hair wc-tap w-full flex items-center gap-3 rounded-xl px-4 py-3.5 text-left">
            <span className="text-muted-foreground shrink-0">{icon}</span>
            <span className="min-w-0 flex-1"><span className="block font-medium leading-tight truncate">{title}</span>{subtitle != null && <span className="block text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</span>}</span>
            {right && <span className="text-sm font-semibold tabular-nums shrink-0">{right}</span>}
            <Chevron className="size-4 text-muted-foreground/60 shrink-0" />
        </button>
    )
}
function Places({ n }: { n: number }) { return <span className={n <= 5 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"}>{n <= 5 ? `Plus que ${n} place${n > 1 ? "s" : ""}` : `${n} places disponibles`}</span> }
function Skeleton() { return <div className="space-y-2">{[0, 1, 2, 3].map(i => <div key={i} className="wc-hair flex items-center gap-3 rounded-xl px-4 py-3.5"><span className="wc-skel size-5 shrink-0 rounded" /><span className="flex-1 space-y-2"><span className="wc-skel block h-3 w-1/2 rounded" /><span className="wc-skel block h-2.5 w-1/3 rounded" /></span></div>)}</div> }
function Alert({ msg }: { msg: string }) { return <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">{msg}</div> }
function Field({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) { return <div><label className="block text-sm font-medium mb-1.5">{label}</label><div className="relative"><span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>{children}</div></div> }
function Info({ l, v, r, strong, mono }: { l: string; v: string; r?: boolean; strong?: boolean; mono?: boolean }) { return <div className={r ? "text-right" : ""}><dt className="text-xs text-muted-foreground">{l}</dt><dd className={`${strong ? "font-semibold" : "font-medium"} ${mono ? "font-mono text-xs" : ""} truncate`}>{v}</dd></div> }

/* ─────────── Icônes (line, sobres) ─────────── */
const Chevron = ({ className = "size-4" }: { className?: string }) => <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" /></svg>
const ArrowRight = ({ className = "size-5 text-muted-foreground shrink-0" }: { className?: string }) => <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m0 0-6-6m6 6-6 6" /></svg>
const Pin = () => <svg className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10c0 7-7.5 11-7.5 11S4.5 17 4.5 10a7.5 7.5 0 0 1 15 0Z" /></svg>
const Station = () => <svg className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 6v6m8-6v6M4 11h16M6 16h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2Zm1 4 1-4m9 4-1-4" /></svg>
const Route = () => <svg className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 0h8.5a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7H18m0 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /></svg>
const Clock = () => <svg className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
const User = () => <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a7.5 7.5 0 0 1 15 0" /></svg>
const Phone = () => <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
const Download = () => <svg className="size-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v13m0 0 4-4m-4 4-4-4M4 21h16" /></svg>
const Check = () => <svg className="size-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" /></svg>
const Dots = () => <svg className="size-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
const Spinner = () => <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" /></svg>
