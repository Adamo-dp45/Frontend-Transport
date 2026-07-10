import { useState, useEffect, useCallback } from "react"
import { Badge } from "../../../components/ui/badge"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Label } from "../../../components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../../components/ui/select"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "../../../components/ui/card"
import { AlertCircle, Bus, CheckCircle2, Loader2, RefreshCw, Ban, MapPin } from "lucide-react"
import PlanCar, { SiegePlan } from "./PlanCar"

interface TicketRef {
    id: number
    codeticket: string
    prix: number
    nomclient?: string | null
    contactclient?: string | null
    gare: { id: number; libelle: string }
    garedescente: { id: number; libelle: string }
    voyage: { id: number; codevoyage: string; provenance: string; destination: string; datedepartprevue: string }
}

interface VoyageCible {
    id: number
    codevoyage: string
    provenance: string
    destination: string
    datedepartprevue: string
    car?: { matricule: string } | null
}

interface SiegesResponse {
    siegesGauche: number
    siegesDroite: number
    sieges: (SiegePlan & { "@id": string })[]
}

interface DesistementFormProps {
    ticket: TicketRef
    voyagesCible: VoyageCible[]
}

type Mode = "REPORT" | "ANNULATION"

export default function DesistementForm({ ticket, voyagesCible }: DesistementFormProps) {
    const [mode, setMode] = useState<Mode>("REPORT")
    const [voyageCibleId, setVoyageCibleId] = useState<string>("")
    const [siegesData, setSiegesData] = useState<SiegesResponse | null>(null)
    const [loadingSieges, setLoadingSieges] = useState(false)
    const [selectedSiege, setSelectedSiege] = useState<(SiegePlan & { "@id": string }) | null>(null)
    const [motif, setMotif] = useState<string>("")
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const trajet = `${ticket.gare.libelle} → ${ticket.garedescente.libelle}`

    // Charger le plan des sièges du voyage cible, sur le MÊME tronçon que le billet d'origine
    const loadSieges = useCallback(async (id: string) => {
        setLoadingSieges(true)
        setSiegesData(null)
        setSelectedSiege(null)
        try {
            const res = await fetch(`/ticket/sieges/${id}?montee=${ticket.gare.id}&descente=${ticket.garedescente.id}`)
            if (!res.ok) throw new Error("Erreur réseau")
            setSiegesData(await res.json())
        } catch {
            setError("Impossible de charger le plan des sièges du voyage de report.")
        } finally {
            setLoadingSieges(false)
        }
    }, [ticket.gare.id, ticket.garedescente.id])

    useEffect(() => {
        if (mode === "REPORT" && voyageCibleId) loadSieges(voyageCibleId)
    }, [mode, voyageCibleId, loadSieges])

    const selectedVoyage = voyagesCible.find((v) => String(v.id) === voyageCibleId)

    const toggleSiege = (siege: SiegePlan) => {
        const s = siege as SiegePlan & { "@id": string }
        setSelectedSiege((prev) => (prev?.id === s.id ? null : s))
    }

    const handleSubmit = async () => {
        setError(null)

        if (mode === "REPORT") {
            if (!voyageCibleId) {
                setError("Veuillez choisir un voyage de report.")
                return
            }
            if (!selectedSiege) {
                setError("Veuillez sélectionner un siège sur le voyage de report.")
                return
            }
        }

        // Annulation = remboursement : le motif est obligatoire (traçabilité anti-détournement).
        if (mode === "ANNULATION" && !motif.trim()) {
            setError("Le motif est obligatoire pour annuler un billet (remboursement).")
            return
        }

        const body: Record<string, unknown> = { mode, motif: motif.trim() || null }
        if (mode === "REPORT") {
            body.voyage = `/api/voyages/${voyageCibleId}`
            body.siege = selectedSiege!["@id"]
        }

        setSubmitting(true)
        try {
            const res = await fetch(`/ticket/${ticket.id}/desister`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            })
            const data = await res.json()
            if (!res.ok) {
                setError(data.error ?? data.detail ?? "Erreur lors du désistement.")
                return
            }
            // Report → on ouvre le nouveau billet ; annulation → on revient sur le billet annulé
            window.location.href = `/ticket/${data.id ?? ticket.id}`
        } catch {
            setError("Erreur réseau. Veuillez réessayer.")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Rappel du billet d'origine */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <MapPin className="h-4 w-4 text-blue-500" />
                        Billet à désister
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {/* Trajet du voyage (provenance → destination) */}
                    <div className="flex flex-wrap items-center gap-2 text-base font-medium">
                        <span>{ticket.voyage.provenance}</span>
                        <span className="text-muted-foreground">→</span>
                        <span>{ticket.voyage.destination}</span>
                        <span className="text-xs font-normal text-muted-foreground">· Voyage {ticket.voyage.codevoyage}</span>
                    </div>
                    {/* Détail du billet : tronçon (montée → descente), prix, client */}
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge variant="outline" className="font-mono">{ticket.codeticket}</Badge>
                        <span className="text-xs text-muted-foreground">Tronçon :</span>
                        <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">{ticket.gare.libelle}</Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">{ticket.garedescente.libelle}</Badge>
                        <Badge variant="outline" className="border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300">
                            {ticket.prix.toLocaleString("fr-FR")} FCFA
                        </Badge>
                        {ticket.nomclient && <span className="text-muted-foreground">· {ticket.nomclient}</span>}
                    </div>
                </CardContent>
            </Card>

            {/* Choix du mode */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                    type="button"
                    onClick={() => setMode("REPORT")}
                    className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition ${
                        mode === "REPORT" ? "border-blue-500 bg-blue-50" : "border-muted hover:border-blue-200"
                    }`}
                >
                    <RefreshCw className="mt-0.5 h-5 w-5 text-blue-500 shrink-0" />
                    <span>
                        <span className="block font-medium">Reporter</span>
                        <span className="block text-xs text-muted-foreground">
                            Vers un autre voyage de la même ligne — même tronçon et même prix.
                        </span>
                    </span>
                </button>
                <button
                    type="button"
                    onClick={() => setMode("ANNULATION")}
                    className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition ${
                        mode === "ANNULATION" ? "border-red-500 bg-red-50" : "border-muted hover:border-red-200"
                    }`}
                >
                    <Ban className="mt-0.5 h-5 w-5 text-red-500 shrink-0" />
                    <span>
                        <span className="block font-medium">Annuler</span>
                        <span className="block text-xs text-muted-foreground">
                            Annulation avec remboursement intégral ({ticket.prix.toLocaleString("fr-FR")} FCFA).
                        </span>
                    </span>
                </button>
            </div>

            {/* REPORT : choix du voyage + siège */}
            {mode === "REPORT" && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Bus className="h-4 w-4 text-blue-500" />
                            Voyage de report
                        </CardTitle>
                        <CardDescription>
                            Seuls les voyages ouverts de la même ligne sont proposés. Le tronçon ({trajet}) et le prix sont conservés.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="voyageCible">Voyage</Label>
                            <Select value={voyageCibleId} onValueChange={setVoyageCibleId}>
                                <SelectTrigger id="voyageCible" className="w-full">
                                    <SelectValue placeholder={voyagesCible.length ? "Choisir un voyage…" : "Aucun autre voyage disponible sur cette ligne"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {voyagesCible.map((v) => (
                                        <SelectItem key={v.id} value={String(v.id)}>
                                            <span className="font-mono text-xs text-gray-500 mr-2">{v.codevoyage}</span>
                                            {new Date(v.datedepartprevue).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                            <span className="ml-2 text-xs text-gray-400">· {v.car?.matricule ?? "Aucun car"}</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedVoyage && !selectedVoyage.car && (
                            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                Ce voyage n'a pas encore de véhicule affecté : aucun siège n'est disponible.
                            </div>
                        )}

                        {voyageCibleId && (
                            loadingSieges ? (
                                <div className="flex items-center justify-center py-12 text-gray-400">
                                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                    Chargement du plan…
                                </div>
                            ) : siegesData && siegesData.sieges.length > 0 ? (
                                <div>
                                    <PlanCar
                                        sieges={siegesData.sieges}
                                        siegesGauche={siegesData.siegesGauche}
                                        siegesDroite={siegesData.siegesDroite}
                                        selectedIds={new Set(selectedSiege ? [selectedSiege.id] : [])}
                                        onToggle={toggleSiege}
                                    />
                                    {selectedSiege && (
                                        <p className="mt-3 text-center text-sm text-blue-700">
                                            Siège sélectionné : <span className="font-semibold">n° {selectedSiege.numero}</span>
                                        </p>
                                    )}
                                </div>
                            ) : siegesData ? (
                                <p className="py-6 text-center text-sm text-gray-400">Aucun siège disponible pour ce voyage.</p>
                            ) : null
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Motif + confirmation */}
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <div className="space-y-1.5">
                        <Label htmlFor="motif">
                            Motif {mode === "ANNULATION"
                                ? <span className="font-normal text-red-600">(obligatoire)</span>
                                : <span className="font-normal text-muted-foreground">(optionnel)</span>}
                        </Label>
                        <Input
                            id="motif"
                            value={motif}
                            onChange={(e) => setMotif(e.target.value)}
                            placeholder="Ex : empêchement du client, changement d'horaire…"
                        />
                    </div>
                    <div className="flex items-center justify-end gap-3">
                        <a href={`/ticket/${ticket.id}`} className="btn btn-secondary">Annuler</a>
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={submitting}
                            className={mode === "ANNULATION" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}
                        >
                            {submitting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Traitement…</>
                            ) : mode === "REPORT" ? (
                                <><CheckCircle2 className="mr-2 h-4 w-4" /> Confirmer le report</>
                            ) : (
                                <><Ban className="mr-2 h-4 w-4" /> Confirmer l'annulation</>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
