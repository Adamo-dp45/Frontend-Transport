import { useEffect, useMemo, useState } from "react"
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
import {
    AlertCircle,
    ArrowRight,
    CreditCard,
    Loader2,
    MapPin,
    Package,
    Plus,
    Trash2,
    Users,
} from "lucide-react"
import { flash } from "../../../elements/Alert"
import { visit } from "@hotwired/turbo"

interface VoyageRef {
    id: number
    codevoyage: string
    provenance: string
    destination: string
}

interface TarifCourrier {
    id: number
    libelle: string
    valeurmin: number
    valeurmax: number | null
    montanttaxe: number
}

interface ArretRef {
    id: number
    libelle: string
    ville?: string | null
    ordre: number
}

interface GareRef {
    id: number
    libelle: string
    ville?: string | null
}

interface DetailInitial {
    id?: number
    nature: string
    designation?: string | null
    emballage?: string | null
    type?: string | null
    poids?: number | null
    valeur: number
    tarifcourrier?: { id: number } | null
}

interface CourrierInitial {
    id: number
    nomexpediteur: string
    contactexpediteur: string
    nomdestinataire: string
    contactdestinataire: string
    voyage?: { id: number } | null
    garedepart?: { id: number } | null
    garearrivee?: { id: number } | null
    // modepaiement: string // paiement courrier désactivé (champ commenté côté entité Courrier)
    fraissuivi?: number | null
    detailcourriers?: DetailInitial[]
}

interface Props {
    voyages: VoyageRef[]
    tarifcourriers: TarifCourrier[]
    gares: GareRef[]                 // gares de l'entreprise : source du choix de la destination
    courrier?: CourrierInitial // présent => mode édition
    userGareId?: number | null       // si l'agent est rattaché à une gare, le départ y est forcé
    userGareLibelle?: string | null
    preselectVoyageId?: number       // voyage présélectionné (raccourci depuis la liste des voyages)
}

interface Colis {
    key: number
    id?: number | null // id du colis existant (édition) ; absent pour un nouveau colis
    nature: string
    designation: string
    emballage: string
    type: string
    poids: string
    tarifId: string
    valeur: string
}

const fmt = (n: number) => n.toLocaleString("fr-FR")

let colisSeq = 0
function emptyColis(): Colis {
    return {
        key: colisSeq++,
        nature: "",
        designation: "",
        emballage: "",
        type: "NORMAL",
        poids: "",
        tarifId: "",
        valeur: "",
    }
}

export default function CourrierForm({ voyages, tarifcourriers, gares, courrier, userGareId, userGareLibelle, preselectVoyageId }: Props)
{
    const isEdit = !!courrier
    const [nomexpediteur, setNomexpediteur] = useState(courrier?.nomexpediteur ?? "")
    const [contactexpediteur, setContactexpediteur] = useState(courrier?.contactexpediteur ?? "")
    const [nomdestinataire, setNomdestinataire] = useState(courrier?.nomdestinataire ?? "")
    const [contactdestinataire, setContactdestinataire] = useState(courrier?.contactdestinataire ?? "")

    const [voyageId, setVoyageId] = useState<string>(
        courrier?.voyage?.id ? String(courrier.voyage.id) : (preselectVoyageId ? String(preselectVoyageId) : "")
    )
    // Gare de départ : gare existante (édition), sinon gare de l'agent (forcée) ; vide pour un central.
    const [gareDepartId, setGareDepartId] = useState<string>(
        courrier?.garedepart?.id ? String(courrier.garedepart.id) : (userGareId ? String(userGareId) : "")
    )
    const [gareArriveeId, setGareArriveeId] = useState<string>(courrier?.garearrivee?.id ? String(courrier.garearrivee.id) : "")
    const [arrets, setArrets] = useState<ArretRef[]>([]) // arrêts de la ligne du voyage choisi (contrôle de compatibilité)

    // modepaiement désactivé (paiement commenté côté entité Courrier) — n'est plus lu ni envoyé :
    // const [modepaiement, setModepaiement] = useState(courrier?.modepaiement ?? "ENVOI")
    // const modepaiement = courrier?.modepaiement ?? "ENVOI"
    const [fraissuivi, setFraissuivi] = useState(courrier?.fraissuivi != null ? String(courrier.fraissuivi) : "")

    const [colis, setColis] = useState<Colis[]>(() => {
        const initial = courrier?.detailcourriers ?? []
        if (initial.length === 0) return [emptyColis()]
        return initial.map((d) => ({
            key: colisSeq++,
            id: d.id ?? null,
            nature: d.nature ?? "",
            designation: d.designation ?? "",
            emballage: d.emballage ?? "",
            type: d.type ?? "NORMAL",
            poids: d.poids != null ? String(d.poids) : "",
            tarifId: d.tarifcourrier?.id ? String(d.tarifcourrier.id) : "",
            valeur: d.valeur != null ? String(d.valeur) : "",
        }))
    })

    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Charger les arrêts de la ligne du voyage choisi (sert UNIQUEMENT à contrôler la compatibilité
    // voyage ↔ itinéraire du colis : les gares restent choisies indépendamment du voyage).
    useEffect(() => {
        if (!voyageId) {
            setArrets([])
            return
        }
        let cancelled = false
        fetch(`/courrier/arrets/${voyageId}`)
            .then((r) => r.json())
            .then((d) => {
                if (!cancelled) setArrets(d.arrets ?? [])
            })
            .catch(() => {
                if (!cancelled) setArrets([])
            })
        return () => {
            cancelled = true
        }
    }, [voyageId])

    const onVoyageChange = (v: string) => {
        // Le voyage est optionnel et n'impacte plus les gares (« none » = aucun voyage).
        setVoyageId(v === "none" ? "" : v)
    }

    // Gare d'arrivée : toutes les gares de l'entreprise, sauf la gare de départ.
    const arriveeOptions = gares.filter((g) => String(g.id) !== gareDepartId)

    // Libellé de la gare de départ (affichage lecture seule pour un agent rattaché à une gare).
    const gareDepartLibelle =
        gares.find((g) => String(g.id) === gareDepartId)?.libelle ?? userGareLibelle ?? ""

    // Compatibilité : si un voyage est choisi, ses arrêts doivent desservir départ ET arrivée, dans l'ordre.
    const arretOrdre = (id: string) => arrets.find((a) => String(a.id) === id)?.ordre
    const voyageIncompatible =
        !!voyageId &&
        arrets.length > 0 &&
        !!gareDepartId &&
        !!gareArriveeId &&
        (() => {
            const od = arretOrdre(gareDepartId)
            const oa = arretOrdre(gareArriveeId)
            return od === undefined || oa === undefined || od >= oa
        })()

    const tarifById = useMemo(() => {
        const m = new Map<string, TarifCourrier>()
        tarifcourriers.forEach((t) => m.set(String(t.id), t))
        return m
    }, [tarifcourriers])

    const taxeColis = (c: Colis): number => tarifById.get(c.tarifId)?.montanttaxe ?? 0
    const totalTaxe = colis.reduce((sum, c) => sum + (c.tarifId ? taxeColis(c) : 0), 0)

    const valeurInvalide = (c: Colis): boolean => {
        const t = tarifById.get(c.tarifId)
        if (!t || c.valeur === "") return false
        const v = Number(c.valeur)
        return v < t.valeurmin || (t.valeurmax != null && v > t.valeurmax)
    }

    const updateColis = (key: number, patch: Partial<Colis>) => {
        setColis((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)))
    }

    const onTrancheChange = (key: number, tarifId: string) => {
        const t = tarifById.get(tarifId)
        setColis((prev) =>
            prev.map((c) => {
                if (c.key !== key) return c
                // Pré-remplir avec la valeur min de la tranche si vide
                const valeur = c.valeur === "" && t ? String(t.valeurmin) : c.valeur
                return { ...c, tarifId, valeur }
            })
        )
    }

    const addColis = () => setColis((prev) => [...prev, emptyColis()])
    const removeColis = (key: number) =>
        setColis((prev) => (prev.length > 1 ? prev.filter((c) => c.key !== key) : prev))

    const handleSubmit = async () => {
        setError(null)

        if (!nomexpediteur.trim() || !contactexpediteur.trim()) {
            setError("Le nom et le contact de l'expéditeur sont obligatoires.")
            return
        }
        if (!nomdestinataire.trim() || !contactdestinataire.trim()) {
            setError("Le nom et le contact du destinataire sont obligatoires.")
            return
        }
        if (!gareDepartId) {
            setError("La gare de départ est obligatoire.")
            return
        }
        if (!gareArriveeId) {
            setError("La gare d'arrivée est obligatoire.")
            return
        }
        if (gareDepartId === gareArriveeId) {
            setError("La gare de départ et la gare d'arrivée doivent être différentes.")
            return
        }
        if (voyageIncompatible) {
            setError("Le voyage choisi ne dessert pas ce trajet. Choisissez-en un autre ou retirez-le.")
            return
        }

        const validColis = colis.filter((c) => c.nature.trim() && c.tarifId && c.valeur !== "")
        if (validColis.length === 0) {
            setError("Ajoutez au moins un colis (nature, tranche tarifaire et valeur).")
            return
        }
        if (colis.some(valeurInvalide)) {
            setError("Une ou plusieurs valeurs de colis ne correspondent pas à la tranche tarifaire choisie.")
            return
        }

        const payload = {
            nomexpediteur: nomexpediteur.trim(),
            contactexpediteur: contactexpediteur.trim(),
            nomdestinataire: nomdestinataire.trim(),
            contactdestinataire: contactdestinataire.trim(),
            voyage: voyageId || null,
            gareDepart: gareDepartId || null,
            gareArrivee: gareArriveeId || null,
            // modepaiement, // paiement courrier désactivé (champ commenté côté entité Courrier)
            fraissuivi: fraissuivi ? Number(fraissuivi) : null,
            details: validColis.map((c) => ({
                id: c.id ?? null, // renvoyé pour les colis existants → réconciliation par id (conserve le statut, ex. PERDU)
                nature: c.nature.trim(),
                designation: c.designation.trim(),
                emballage: c.emballage.trim() || null,
                type: c.type,
                poids: c.poids ? Number(c.poids) : null,
                valeur: Number(c.valeur),
            })),
        }

        const url = isEdit ? `/courrier/${courrier!.id}/modifier` : "/courrier/nouveau"

        setSubmitting(true)
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })
            const data = await res.json()
            if (!res.ok) {
                setError(data.detail ?? "Erreur lors de l'enregistrement du courrier.")
                return
            }
            // flash('Le courrier a été enregistré avec succès', 'success')
            visit(isEdit ? `/courrier/${courrier!.id}` : `/courrier`)
            // window.location.href = isEdit ? `/courrier/${courrier!.id}` : "/courrier"
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

            {/* Expéditeur & destinataire */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Users className="h-4 w-4 text-blue-500" />
                        Expéditeur & destinataire
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="nomexpediteur">Nom expéditeur</Label>
                            <Input id="nomexpediteur" value={nomexpediteur} onChange={(e) => setNomexpediteur(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="contactexpediteur">Contact expéditeur</Label>
                            <Input id="contactexpediteur" value={contactexpediteur} onChange={(e) => setContactexpediteur(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="nomdestinataire">Nom destinataire</Label>
                            <Input id="nomdestinataire" value={nomdestinataire} onChange={(e) => setNomdestinataire(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="contactdestinataire">Contact destinataire</Label>
                            <Input id="contactdestinataire" value={contactdestinataire} onChange={(e) => setContactdestinataire(e.target.value)} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Itinéraire */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <MapPin className="h-4 w-4 text-blue-500" />
                        Itinéraire
                    </CardTitle>
                    <CardDescription>
                        La gare de départ et la gare d'arrivée sont obligatoires. Le voyage (car qui transporte le colis)
                        est facultatif : vous pourrez l'affecter plus tard.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="garedepart">
                                Gare de départ
                                {userGareId && (
                                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">(votre gare)</span>
                                )}
                            </Label>
                            {userGareId ? (
                                <Input id="garedepart" value={gareDepartLibelle} disabled readOnly />
                            ) : (
                                <Select
                                    value={gareDepartId}
                                    onValueChange={(v) => { setGareDepartId(v); if (v === gareArriveeId) setGareArriveeId("") }}
                                >
                                    <SelectTrigger id="garedepart" className="w-full">
                                        <SelectValue placeholder="Gare de départ…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {gares.map((g) => (
                                            <SelectItem key={g.id} value={String(g.id)}>
                                                {g.libelle}
                                                {g.ville && <span className="ml-2 text-xs text-gray-400">· {g.ville}</span>}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="garearrivee">Gare d'arrivée</Label>
                            <Select
                                value={gareArriveeId}
                                onValueChange={setGareArriveeId}
                                disabled={!gareDepartId}
                            >
                                <SelectTrigger id="garearrivee" className="w-full">
                                    <SelectValue placeholder={gareDepartId ? "Gare d'arrivée…" : "Choisissez la gare de départ d'abord"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {arriveeOptions.map((g) => (
                                        <SelectItem key={g.id} value={String(g.id)}>
                                            {g.libelle}
                                            {g.ville && <span className="ml-2 text-xs text-gray-400">· {g.ville}</span>}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="voyage">Voyage (optionnel)</Label>
                        <Select value={voyageId || "none"} onValueChange={onVoyageChange}>
                            <SelectTrigger id="voyage" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">— Aucun voyage —</SelectItem>
                                {voyages.map((v) => (
                                    <SelectItem key={v.id} value={String(v.id)}>
                                        <span className="font-mono text-xs text-gray-500 mr-2">{v.codevoyage}</span>
                                        {v.provenance} → {v.destination}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {voyageIncompatible && (
                        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            Le voyage choisi ne dessert pas ce trajet : les gares de départ et d'arrivée doivent être des
                            arrêts de sa ligne, dans l'ordre. Choisissez un autre voyage ou laissez « Aucun voyage ».
                        </div>
                    )}

                    {!voyageId && (
                        <p className="text-xs text-muted-foreground">
                            Sans voyage, le courrier est enregistré <strong>en attente</strong> ; vous pourrez lui affecter
                            un voyage plus tard (sa destination est déjà connue).
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Paiement */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <CreditCard className="h-4 w-4 text-blue-500" />
                        Paiement
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-4">
                        {/* Mode de paiement désactivé (paiement toujours à l'envoi dans ce déploiement) :
                        <div className="space-y-1.5">
                            <Label htmlFor="modepaiement">Mode de paiement</Label>
                            <Select value={modepaiement} onValueChange={setModepaiement}>
                                <SelectTrigger id="modepaiement" className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ENVOI">Payé à l'envoi</SelectItem>
                                    <SelectItem value="RECEPTION">Payé à la réception</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        */}
                        <div className="space-y-1.5">
                            <Label htmlFor="fraissuivi">Frais de suivi SMS (FCFA)</Label>
                            <Input
                                id="fraissuivi"
                                type="number"
                                min={0}
                                placeholder="Ex : 100"
                                value={fraissuivi}
                                onChange={(e) => setFraissuivi(e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Colis */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Package className="h-4 w-4 text-blue-500" />
                            Colis
                        </CardTitle>
                        <Button type="button" variant="secondary" size="sm" onClick={addColis} className="gap-1.5">
                            <Plus className="h-4 w-4" /> Ajouter un colis
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {colis.map((c, idx) => {
                        const t = tarifById.get(c.tarifId)
                        const invalide = valeurInvalide(c)
                        return (
                            <div key={c.key} className="rounded-lg border bg-card p-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700">Colis {idx + 1}</span>
                                    {colis.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0 text-red-600"
                                            onClick={() => removeColis(c.key)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <div className="space-y-1.5">
                                        <Label>Nature</Label>
                                        <Input
                                            placeholder="Ex : Électronique"
                                            value={c.nature}
                                            onChange={(e) => updateColis(c.key, { nature: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Désignation</Label>
                                        <Input
                                            placeholder="Ex : Capteur"
                                            value={c.designation}
                                            onChange={(e) => updateColis(c.key, { designation: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Emballage</Label>
                                        <Input
                                            placeholder="Ex : Sachet"
                                            value={c.emballage}
                                            onChange={(e) => updateColis(c.key, { emballage: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Type</Label>
                                        <Select value={c.type} onValueChange={(v) => updateColis(c.key, { type: v })}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="NORMAL">Normal</SelectItem>
                                                <SelectItem value="FRAGILE">Fragile</SelectItem>
                                                <SelectItem value="VOLUMINEUX">Volumineux</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Poids (kg)</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            step="0.1"
                                            placeholder="Optionnel"
                                            value={c.poids}
                                            onChange={(e) => updateColis(c.key, { poids: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Tranche tarifaire</Label>
                                        <Select value={c.tarifId} onValueChange={(v) => onTrancheChange(c.key, v)}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Choisir une tranche…" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {tarifcourriers.map((tc) => (
                                                    <SelectItem key={tc.id} value={String(tc.id)}>
                                                        {tc.libelle} · {fmt(tc.valeurmin)} → {tc.valeurmax != null ? fmt(tc.valeurmax) : "∞"}
                                                        <span className="ml-1 text-xs text-gray-400">(taxe {fmt(tc.montanttaxe)})</span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Valeur (FCFA)</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            value={c.valeur}
                                            onChange={(e) => updateColis(c.key, { valeur: e.target.value })}
                                            className={invalide ? "border-red-500" : ""}
                                        />
                                        {t && (
                                            <p className={`text-xs ${invalide ? "text-red-600" : "text-muted-foreground"}`}>
                                                Tranche : {fmt(t.valeurmin)} → {t.valeurmax != null ? fmt(t.valeurmax) : "illimité"}
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Taxe</Label>
                                        <div className="flex h-9 items-center text-sm font-semibold tabular-nums">
                                            {c.tarifId ? `${fmt(taxeColis(c))} FCFA` : "—"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}

                    <div className="flex items-center justify-end gap-2 border-t pt-3 text-sm">
                        <span className="text-muted-foreground">Total taxe :</span>
                        <span className="font-bold tabular-nums">{fmt(totalTaxe)} FCFA</span>
                    </div>
                </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
                <a href="/courrier" className="btn btn-secondary">Annuler</a>
                <Button type="button" onClick={handleSubmit} disabled={submitting} className="gap-2">
                    {submitting ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Enregistrement…
                        </>
                    ) : (
                        <>
                            <ArrowRight className="h-4 w-4" />
                            {isEdit ? "Enregistrer" : "Créer le courrier"}
                        </>
                    )}
                </Button>
            </div>
        </div>
    )
}
