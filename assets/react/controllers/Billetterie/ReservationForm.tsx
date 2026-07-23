import { useState, useEffect } from "react"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Label } from "../../../components/ui/label"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../../components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card"
import { Loader2, CheckCircle2, MapPin, ArrowRight } from "lucide-react"
import { flash } from "../../../elements/Alert"

/* Sert /api/voyages/reservables : la liste est DÉJÀ filtrée et triée côté serveur (gare de l'agent,
   avancement du car, durées d'arrêt). Rien à re-décider ici. */
interface VoyageRef {
    id: number
    provenance: string
    destination: string
    codevoyage: string
    /** Passage du car à la gare de l'agent — l'heure qui compte au guichet. Null si l'agent n'a pas de gare. */
    heurepassage?: string | null
    datedepartprevue?: string | null
    enRoute?: boolean
}

interface Arret {
    id: number
    libelle: string
    ville?: string | null
    ordre: number
}

/** "2026-07-20T15:20:00+00:00" -> "20/07 15:20" */
function formatHeure(iso: string): string {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ""
    return d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
}

interface Props {
    voyages: VoyageRef[]
    userGareId?: number | null
    userGareLibelle?: string | null
}

export default function ReservationForm({ voyages, userGareId, userGareLibelle }: Props) {
    const [voyageId, setVoyageId] = useState<string>("")
    const [arrets, setArrets] = useState<Arret[]>([])
    const [monteeId, setMonteeId] = useState<string>("")
    const [descenteId, setDescenteId] = useState<string>("")
    const [unitPrice, setUnitPrice] = useState<number | null>(null)
    const [tarifManquant, setTarifManquant] = useState(false)
    const [nomclient, setNomclient] = useState("")
    const [contactclient, setContactclient] = useState("")
    const [submitting, setSubmitting] = useState(false)

    const selectedVoyage = voyages.find((v) => String(v.id) === voyageId)

    // Charger les arrêts de la ligne du voyage
    useEffect(() => {
        if (!voyageId) {
            setArrets([]); setMonteeId(""); setDescenteId("")
            return
        }
        fetch(`/reservation/arrets/${voyageId}`)
            .then((r) => r.json())
            .then((d) => {
                const list: Arret[] = d.arrets ?? []
                setArrets(list)
                setDescenteId("")
                // Montée forcée à la gare de l'agent si rattaché à une gare desservie par la ligne
                if (userGareId) {
                    const onLigne = list.some((a) => a.id === userGareId)
                    setMonteeId(onLigne ? String(userGareId) : "")
                } else {
                    setMonteeId("")
                }
            })
            .catch(() => setArrets([]))
    }, [voyageId, userGareId])

    // Charger le tarif du tronçon
    useEffect(() => {
        if (!voyageId || !monteeId || !descenteId) {
            setUnitPrice(null); setTarifManquant(false)
            return
        }
        let cancelled = false
        fetch(`/reservation/tarif?montee=${monteeId}&descente=${descenteId}`)
            .then((r) => r.json())
            .then((d) => {
                if (cancelled) return
                const montant = d.montant == null ? null : Number(d.montant)
                setUnitPrice(montant)
                setTarifManquant(montant === null)
            })
            .catch(() => { if (!cancelled) { setUnitPrice(null); setTarifManquant(false) } })
        return () => { cancelled = true }
    }, [voyageId, monteeId, descenteId])

    const monteeOrdre = arrets.find((a) => String(a.id) === monteeId)?.ordre ?? -1
    const descenteOptions = arrets.filter((a) => a.ordre > monteeOrdre)

    const handleSubmit = async () => {
        if (!voyageId) { flash("Sélectionnez un voyage.", 'error'); return }
        if (!monteeId) { flash("Sélectionnez la gare de montée.", 'error'); return }
        if (!descenteId) { flash("Sélectionnez la gare de descente.", 'error'); return }

        setSubmitting(true)
        try {
            const res = await fetch("/reservation/creer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    voyage: `/api/voyages/${voyageId}`,
                    gare: `/api/gares/${monteeId}`,
                    garedescente: `/api/gares/${descenteId}`,
                    nomclient: nomclient || null,
                    contactclient: contactclient || null,
                }),
            })
            const data = await res.json()
            if (!res.ok) {
                flash(data.detail ?? "Erreur lors de la réservation.", 'error', 5)
                return
            }
            window.location.href = `/reservation/${data.id}`
        } catch {
            flash("Erreur réseau. Veuillez réessayer.", 'error')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <MapPin className="h-4 w-4 text-blue-500" />
                        Voyage &amp; trajet
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="voyage">Voyage</Label>
                        <Select value={voyageId} onValueChange={setVoyageId}>
                            <SelectTrigger id="voyage" className="w-full"><SelectValue placeholder="Choisir un voyage…" /></SelectTrigger>
                            <SelectContent>
                                {voyages.map((v) => (
                                    <SelectItem key={v.id} value={String(v.id)}>
                                        <span className="font-mono text-xs text-gray-500 mr-2">{v.codevoyage}</span>
                                        {v.provenance} → {v.destination}
                                        {/* Heure de passage à VOTRE gare, pas le départ du voyage :
                                            sur un car déjà en route, c'est la seule qui a du sens. */}
                                        {v.heurepassage && (
                                            <span className="ml-2 text-xs tabular-nums text-muted-foreground">
                                                {formatHeure(v.heurepassage)}
                                            </span>
                                        )}
                                        {v.enRoute && (
                                            <span className="ml-2 text-xs text-amber-600">en route</span>
                                        )}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="montee">
                                Gare de montée
                                {userGareId && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(votre gare)</span>}
                            </Label>
                            <Select value={monteeId} onValueChange={(v) => { setMonteeId(v); setDescenteId("") }} disabled={arrets.length === 0 || !!userGareId}>
                                <SelectTrigger id="montee" className="w-full"><SelectValue placeholder={arrets.length ? "Gare de montée…" : "Sélectionnez un voyage"} /></SelectTrigger>
                                <SelectContent>
                                    {arrets.map((a) => (
                                        <SelectItem key={a.id} value={String(a.id)}>{a.libelle}{a.ville && <span className="ml-2 text-xs text-gray-400">· {a.ville}</span>}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="descente">Gare de descente</Label>
                            <Select value={descenteId} onValueChange={setDescenteId} disabled={!monteeId}>
                                <SelectTrigger id="descente" className="w-full"><SelectValue placeholder={monteeId ? "Gare de descente…" : "Choisir la montée d'abord"} /></SelectTrigger>
                                <SelectContent>
                                    {descenteOptions.map((a) => (
                                        <SelectItem key={a.id} value={String(a.id)}>{a.libelle}{a.ville && <span className="ml-2 text-xs text-gray-400">· {a.ville}</span>}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {userGareId && voyageId && arrets.length > 0 && !arrets.some((a) => a.id === userGareId) && (
                        <p className="text-sm text-amber-700">Votre gare{userGareLibelle ? ` (${userGareLibelle})` : ""} n'est pas desservie par ce voyage.</p>
                    )}
                    {tarifManquant && (
                        <p className="text-sm text-red-700">Aucun tarif défini pour ce trajet : réservation impossible.</p>
                    )}
                    {/* Tarif du trajet — présentation dédiée et lisible (identique à la vente de billet) */}
                    {unitPrice !== null && monteeId && descenteId && (
                        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700/80 dark:text-emerald-400/80">Tarif du trajet</p>
                                <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium truncate">
                                    <span className="truncate">{arrets.find((a) => String(a.id) === monteeId)?.libelle ?? "Départ"}</span>
                                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                                    <span className="truncate">{arrets.find((a) => String(a.id) === descenteId)?.libelle ?? "Arrivée"}</span>
                                </p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-2xl font-bold leading-none tabular-nums text-emerald-700 dark:text-emerald-400">{unitPrice.toLocaleString("fr-FR")}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">FCFA / place</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Client (optionnel mais recommandé)</CardTitle></CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="nom">Nom du client</Label>
                            <Input id="nom" placeholder="Nom complet" value={nomclient} onChange={(e) => setNomclient(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="contact">Téléphone</Label>
                            <Input id="contact" placeholder="Téléphone" value={contactclient} onChange={(e) => setContactclient(e.target.value)} />
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Le siège sera attribué à la confirmation (après affectation du car).</p>
                </CardContent>
            </Card>

            <div className="flex items-center justify-end gap-3">
                <a href="/reservation" className="btn btn-secondary">Annuler</a>
                <Button type="button" onClick={handleSubmit} disabled={submitting || tarifManquant} className="bg-blue-600 hover:bg-blue-700 text-white">
                    {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Réservation…</> : <><CheckCircle2 className="mr-2 h-4 w-4" />Réserver la place</>}
                </Button>
            </div>
        </div>
    )
}
