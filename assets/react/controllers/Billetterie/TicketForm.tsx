import { useState, useEffect, useCallback } from "react";
import { cn } from "../../../lib/utils";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Checkbox } from "../../../components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../../components/ui/select";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "../../../components/ui/card";
import { Separator } from "../../../components/ui/separator";
import {
    AlertCircle,
    CheckCircle2,
    Loader2,
    Users,
    MapPin,
    Bus,
    Plus,
    Printer,
    Eye,
    ArrowRight,
} from "lucide-react";
import { flash } from "../../../elements/Alert"
import PlanCar from "./PlanCar"

/*
    interface CreatedTicket { -- Pour le post création sans redirection
        id: number
        codeticket: string
        siege: { numero: number }
        nomclient?: string | null
        prix: number
    }
*/
interface Voyage {
    "@id": string;
    id: number;
    provenance: string;
    destination: string;
    codevoyage: string;
    placestotal: number;
    car?: {
        id: number;
        matricule: string;
        nbrsiege: number;
        siegesGauche?: number;
        siegesDroite?: number;
    };
    datearriveereelle?: string | null;
    // Commercial à bord + position courante du car (le commercial vend depuis garecourante)
    commercial?: { id: number; nom?: string; prenom?: string } | null;
    garecourante?: { id: number; libelle: string; ville?: string } | null;
}

interface Siege {
    "@id": string;
    id: number;
    numero: number;
    rangee: number;
    colonne: number;
    cote: "GAUCHE" | "DROITE" | "ARRIERE" | "GRILLE";
    statut: "LIBRE" | "OCCUPE";
    // Occupant bloquant (si OCCUPE) → permet de « libérer » le siège pour le revendre
    occupantTicketId?: number | null;
    occupantNom?: string | null;
    occupantMontee?: string | null;
    occupantDescente?: string | null;
    // Siège revendu : porté par plusieurs billets sur le voyage (réutilisé sur des tronçons disjoints)
    revendu?: boolean;
    // Siège en conflit : ≥2 billets dont un évincé (priorité amont) → overlay d'alerte, cf. PlanCar
    conflit?: boolean;
}

interface SiegesResponse {
    siegesGauche: number;
    siegesDroite: number;
    sieges: Siege[];
    placesReservees?: number;       // réservations EN ATTENTE : place tenue le temps du paiement
    placesDisponibles?: number | null;
}

interface ClientInfo {
    nomclient: string;
    contactclient: string;
    fidelite?: boolean; // ce billet est une récompense de fidélité (voyage offert/réduit)
}

// Statut de fidélité résolu au guichet à partir du téléphone saisi (par siège)
interface FideliteLookup {
    loading: boolean;
    found: boolean;
    nom?: string;
    membre?: boolean;
    seuil?: number;
    progression?: number;
    recompenseDisponible?: boolean;
    recompensePourcentage?: number;
}

interface Gare {
    "@id": string
    id: number
    libelle: string
    ville: string
}

interface Arret {
    id: number
    libelle: string
    ville?: string | null
    ordre: number
}

interface BeneficiaireRef {
    id: number
    nom: string
    categorie: string
    contact?: string
}

interface TicketFormProps {
    voyages: Voyage[];
    gares: Gare[]
    beneficiaires: BeneficiaireRef[]
    preselectVoyageId?: number;
    userGareId?: number | null;       // si l'agent est rattaché à une gare, la montée y est forcée
    userGareLibelle?: string | null;
    currentUserId?: number | null;    // pour savoir si je suis le commercial du voyage sélectionné
}

// ─── Plan des sièges ──────────────────────────────────────────────────────────
// FUSION : le plan et le siège individuel proviennent désormais du composant PARTAGÉ
// './PlanCar' (mêmes 5 états, pastilles R/↻, légende adaptative, variantes dark) —
// consommé aussi par 'PlanCarReadonly' (fiche véhicule) et 'DesistementForm' (report).
/*
    function CreatedTicketsPanel({ -- Pour le post création sans redirection
        tickets,
        onNouvelleVente,
    }: {
        tickets: CreatedTicket[]
        onNouvelleVente: () => void
    }) {
        const [printingAll, setPrintingAll] = useState(false)

        const handlePrintAll = async () => {
            setPrintingAll(true)
            try {
                const res = await fetch("/ticket/batch/print", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids: tickets.map(t => t.id) }),
                })
                if (res.ok) {
                    const blob = await res.blob()
                    const url = URL.createObjectURL(blob)
                    window.open(url, "_blank")
                    setTimeout(() => URL.revokeObjectURL(url), 10_000)
                }
            } finally {
                setPrintingAll(false)
            }
        }

        return (
            <Card className="border-emerald-200 bg-emerald-50/50">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base text-emerald-700">
                            <CheckCircle2 className="h-5 w-5" />
                            {tickets.length > 1
                                ? `${tickets.length} tickets créés avec succès`
                                : "Ticket créé avec succès"}
                        </CardTitle>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onNouvelleVente}
                            className="gap-1.5 text-xs"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Nouvelle vente
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-2">
                    {/* Liste des tickets créés /}
                    {tickets.map((ticket) => (
                        <div
                            key={ticket.id}
                            className="flex items-center justify-between rounded-lg border border-emerald-200 bg-white px-4 py-3"
                        >
                            <div className="flex items-center gap-3">
                                {/* Badge siège /}
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
                                    {ticket.siege.numero}
                                </div>
                                <div>
                                    <p className="text-sm font-mono font-medium text-gray-700">
                                        {ticket.codeticket}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {ticket.nomclient ?? "Passager non renseigné"}
                                        {" · "}
                                        <span className="font-medium text-emerald-600">
                                            {ticket.prix.toLocaleString("fr-FR")} FCFA
                                        </span>
                                    </p>
                                </div>
                            </div>

                            {/* Actions par ticket /}
                            <div className="flex items-center gap-1.5">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 gap-1.5 text-xs"
                                    onClick={() =>
                                        window.open(`/ticket/${ticket.id}/pdf`, "_blank")
                                    }
                                >
                                    <Printer className="h-3.5 w-3.5" />
                                    Imprimer
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 gap-1.5 text-xs"
                                    asChild
                                >
                                    <a href={`/ticket/${ticket.id}`}>
                                        <Eye className="h-3.5 w-3.5" />
                                        Voir
                                    </a>
                                </Button>
                            </div>
                        </div>
                    ))}

                    {/* Actions globales si plusieurs tickets /}
                    {tickets.length > 1 && (
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-200">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handlePrintAll}
                                disabled={printingAll}
                                className="gap-1.5 text-xs"
                            >
                                {printingAll ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Printer className="h-3.5 w-3.5" />
                                )}
                                Tout imprimer ({tickets.length})
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        )
    }
*/
// (Vente rapide retirée : composant QuickConfirmDialog supprimé)



// ─── Composant principal ──────────────────────────────────────────────────────

export default function TicketForm({
    voyages,
    gares,
    beneficiaires,
    preselectVoyageId,
    userGareId,
    userGareLibelle,
    currentUserId,
}: TicketFormProps) {
    const [voyageId, setVoyageId] = useState<string>(
        preselectVoyageId ? String(preselectVoyageId) : ""
    );
    const [siegesData, setSiegesData] = useState<SiegesResponse | null>(null);
    const [loadingSieges, setLoadingSieges] = useState(false);
    const [selectedSieges, setSelectedSieges] = useState<Siege[]>([]);
    const [clientInfos, setClientInfos] = useState<Record<number, ClientInfo>>(
        {}
    );
    const [submitting, setSubmitting] = useState(false);
    // Erreurs migrées vers flash() (alerte flottante) — état inline conservé en commentaire :
    // const [flashError, setFlashError] = useState<string | null>(null);
    const [flashSuccess, setFlashSuccess] = useState<string | null>(null);
    // Statut de fidélité par siège, résolu via le téléphone saisi (lookup au guichet)
    const [fideliteBySeat, setFideliteBySeat] = useState<Record<number, FideliteLookup>>({});

    // Libération d'un siège occupé (le passager descend en route) pour le revendre
    const [liberCible, setLiberCible] = useState<Siege | null>(null);
    const [liberLoading, setLiberLoading] = useState(false);

    // Remise (une seule pour la vente, appliquée à chaque billet — même tronçon donc même tarif)
    const [remiseType, setRemiseType] = useState<"MONTANT" | "POURCENTAGE">("MONTANT");
    const [remiseValeur, setRemiseValeur] = useState<string>("");
    const [beneficiaireId, setBeneficiaireId] = useState<string>("");
    const remiseNum = parseInt(remiseValeur) || 0;

    const selectedVoyage = voyages.find((v) => String(v.id) === voyageId);
    // Suis-je le commercial (vendeur à bord) de ce voyage ? Si oui, je vends depuis la position
    // courante du car (garecourante), pas depuis une gare fixe.
    const estCommercial = !!currentUserId && selectedVoyage?.commercial?.id === currentUserId;
    const garecourante = selectedVoyage?.garecourante ?? null;


    // Gares de montée / descente issues des arrêts de la ligne du voyage
    const [monteeId, setMonteeId] = useState<string>("")
    const [descenteId, setDescenteId] = useState<string>("")
    const [arrets, setArrets] = useState<Arret[]>([])
    const [unitPrice, setUnitPrice] = useState<number | null>(null) // prix d'un ticket sur le tronçon
    const [tarifManquant, setTarifManquant] = useState(false) // tronçon choisi mais aucun tarif dans la grille
    // Estimation du montant déduit par billet (le backend recalcule et fait foi)
    const remiseParBillet = remiseNum > 0 && unitPrice !== null
        ? (remiseType === "POURCENTAGE"
            ? Math.round(unitPrice * Math.min(remiseNum, 100) / 100)
            : Math.min(remiseNum, unitPrice))
        : 0;
    /*
        const [createdTickets, setCreatedTickets] = useState<CreatedTicket[]>([]) -- Pour le post création sans redirection, pour l'utiliser on supprime toute la logique de redirection/window.open dans 'handleSubmit'
        const handleNouvelleVente = () => {
            setCreatedTickets([])
            setSelectedSieges([])
            setClientInfos({})
            // Garder le voyage sélectionné pour enchaîner les ventes rapidement
            // Garder gareId et voyageId pour enchaîner rapidement
        }
    */


    // ── Charger les sièges ────────────────────────────────────────────────────
    const loadSieges = useCallback(async (id: string, montee: string, descente: string) => {
        setLoadingSieges(true);
        setSiegesData(null);
        setSelectedSieges([]);
        setClientInfos({});
        // setFlashError(null);
        setFlashSuccess(null);
        try {
            const res = await fetch(`/ticket/sieges/${id}?montee=${montee}&descente=${descente}`);
            if (!res.ok) throw new Error("Erreur réseau");
            const data: SiegesResponse = await res.json();
            setSiegesData(data);
        } catch {
            // setFlashError("Impossible de charger le plan des sièges.");
            flash("Impossible de charger le plan des sièges.", 'error', 5);
        } finally {
            setLoadingSieges(false);
        }
    }, []);

    /*
    useEffect(() => {
        if (voyageId) loadSieges(voyageId);
    }, [voyageId, loadSieges]);
    */
    // Après — ne charge que si voyage ET gare sont sélectionnés sinon le plan se charge uniquement quand les deux sont sélectionnés. L'inconvénient : si l'agent change de voyage après avoir déjà sélectionné une gare, le plan se recharge immédiatement — ce qui est le comportement souhaité. Donc les deux approches sont valides
    // Charger les arrêts de la ligne du voyage (pour les sélecteurs montée/descente)
    useEffect(() => {
        if (!voyageId) {
            setArrets([]);
            setMonteeId("");
            setDescenteId("");
            return;
        }
        fetch(`/ticket/arrets/${voyageId}`)
            .then((r) => r.json())
            .then((d) => {
                const list: Arret[] = d.arrets ?? [];
                setArrets(list);
                setDescenteId("");
                // Commercial à bord : la montée est forcée à la POSITION COURANTE du car (garecourante)
                if (estCommercial && garecourante) {
                    const onLigne = list.some((a) => a.id === garecourante.id);
                    setMonteeId(onLigne ? String(garecourante.id) : "");
                }
                // Sinon, agent rattaché à une gare : la montée est forcée à SA gare
                else if (userGareId) {
                    const onLigne = list.some((a) => a.id === userGareId);
                    setMonteeId(onLigne ? String(userGareId) : "");
                } else {
                    setMonteeId("");
                }
            })
            .catch(() => setArrets([]));
    }, [voyageId, userGareId, estCommercial, garecourante?.id]);

    // Charger le plan des sièges pour le tronçon montée → descente
    useEffect(() => {
        if (voyageId && monteeId && descenteId) loadSieges(voyageId, monteeId, descenteId);
    }, [voyageId, monteeId, descenteId, loadSieges]);

    // Charger le prix unitaire du tronçon depuis la grille tarifaire globale
    useEffect(() => {
        if (!voyageId || !monteeId || !descenteId) {
            setUnitPrice(null);
            setTarifManquant(false);
            return;
        }
        let cancelled = false;
        setTarifManquant(false);
        fetch(`/ticket/tarif?montee=${monteeId}&descente=${descenteId}`)
            .then((r) => r.json())
            .then((d) => {
                if (cancelled) return;
                const montant = d.montant === null || d.montant === undefined ? null : Number(d.montant);
                setUnitPrice(montant);
                setTarifManquant(montant === null); // tronçon valide mais pas de tarif → on prévient tout de suite
            })
            .catch(() => { if (!cancelled) { setUnitPrice(null); setTarifManquant(false); } });
        return () => { cancelled = true; };
    }, [voyageId, monteeId, descenteId]);

    // Options de descente : uniquement les arrêts situés APRÈS la montée
    const monteeOrdre = arrets.find((a) => String(a.id) === monteeId)?.ordre ?? -1;
    const descenteOptions = arrets.filter((a) => a.ordre > monteeOrdre);
    const userGareOnLigne = !userGareId || arrets.some((a) => a.id === userGareId);

    // ── Sélection siège ───────────────────────────────────────────────────────
    const toggleSiege = (siege: Siege) => {
        setSelectedSieges((prev) => {
            const exists = prev.find((s) => s.id === siege.id);
            if (exists) {
                setClientInfos((ci) => {
                    const next = { ...ci };
                    delete next[siege.id];
                    return next;
                });
                return prev.filter((s) => s.id !== siege.id);
            }
            /*
                Garde de CAPACITÉ : on ne vend pas plus de places qu'il n'y a de sièges à bord AU MOMENT
                où le passager monte. Les ventes des gares en aval ne comptent pas — l'amont est
                prioritaire — mais des places peuvent être tenues sans siège attribué (réservations
                payées). Sans cette garde, l'agent saisirait des passagers pour se faire refuser la vente.
            */
            if (placesRestantes !== null && prev.length >= placesRestantes) {
                flash(
                    placesRestantes === 0
                        ? "Le car est complet au départ de cette gare."
                        : `Il ne reste que ${placesRestantes} place(s) au départ de cette gare.`,
                    'error'
                );
                return prev;
            }
            setClientInfos((ci) => ({
                ...ci,
                [siege.id]: { nomclient: "", contactclient: "" },
            }));
            return [...prev, siege];
        });
    };

    // Clic sur un siège occupé → ouvre la confirmation de libération (revente)
    const handleLibererSiege = (siege: Siege) => {
        if (!siege.occupantTicketId) return;
        setLiberCible(siege);
    };

    // Confirme : enregistre que l'occupant descend à la gare de montée courante → le siège se dégrise
    const confirmLibererSiege = async () => {
        if (!liberCible?.occupantTicketId || !monteeId) return;
        setLiberLoading(true);
        try {
            const res = await fetch("/ticket/siege/liberer", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    ticket: String(liberCible.occupantTicketId),
                    gare: monteeId,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.error) {
                throw new Error(data.error || "Libération impossible");
            }
            setLiberCible(null);
            await loadSieges(voyageId, monteeId, descenteId);
            setFlashSuccess("Siège libéré : vous pouvez le revendre.");
        } catch (e: any) {
            setLiberCible(null);
            // setFlashError(e?.message || "Libération du siège impossible.");
            flash(e?.message || "Libération du siège impossible.", 'error');
        } finally {
            setLiberLoading(false);
        }
    };

    const updateClientInfo = (
        siegeId: number,
        field: "nomclient" | "contactclient",
        value: string
    ) => {
        setClientInfos((prev) => ({
            ...prev,
            [siegeId]: { ...prev[siegeId], [field]: value },
        }));
    };

    const toggleFideliteSeat = (siegeId: number, value: boolean) => {
        setClientInfos((prev) => ({
            ...prev,
            [siegeId]: { ...prev[siegeId], fidelite: value },
        }));
    };

    // Signature des téléphones saisis (par siège) : ne relance le lookup que si un CONTACT change
    // (pas sur la saisie du nom ni le cochage de la récompense).
    const fideliteContactsSig = selectedSieges
        .map((s) => `${s.id}:${(clientInfos[s.id]?.contactclient ?? "").trim()}`)
        .join("|");

    // Lookup fidélité au guichet (debounce 400 ms) : résout le statut du client par téléphone et
    // gère le décochage automatique si plus aucune récompense n'est disponible.
    useEffect(() => {
        const timer = setTimeout(() => {
            selectedSieges.forEach((s) => {
                const contact = (clientInfos[s.id]?.contactclient ?? "").trim();
                if (!contact) {
                    setFideliteBySeat((prev) => {
                        if (!(s.id in prev)) return prev;
                        const next = { ...prev };
                        delete next[s.id];
                        return next;
                    });
                    return;
                }
                setFideliteBySeat((prev) => ({ ...prev, [s.id]: { ...prev[s.id], loading: true, found: prev[s.id]?.found ?? false } }));
                fetch(`/ticket/fidelite?contact=${encodeURIComponent(contact)}`)
                    .then((r) => r.json())
                    .then((d) => {
                        if (!d.found) {
                            setFideliteBySeat((prev) => ({ ...prev, [s.id]: { loading: false, found: false } }));
                            if (clientInfos[s.id]?.fidelite) toggleFideliteSeat(s.id, false);
                            return;
                        }
                        const st = d.statut ?? {};
                        setFideliteBySeat((prev) => ({ ...prev, [s.id]: {
                            loading: false,
                            found: true,
                            nom: d.client?.nom,
                            membre: st.membre,
                            seuil: st.seuil,
                            progression: st.progression,
                            recompenseDisponible: st.recompenseDisponible,
                            recompensePourcentage: st.recompensePourcentage,
                        } }));
                        // Plus de récompense disponible → on décoche par sécurité
                        if (!st.recompenseDisponible && clientInfos[s.id]?.fidelite) toggleFideliteSeat(s.id, false);
                    })
                    .catch(() => setFideliteBySeat((prev) => ({ ...prev, [s.id]: { loading: false, found: false } })));
            });
        }, 400);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fideliteContactsSig]);

    // ── Soumission ────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        // setFlashError(null);
        setFlashSuccess(null);

        if (!voyageId) {
            // setFlashError("Veuillez sélectionner un voyage.");
            flash("Veuillez sélectionner un voyage.", 'error');
            return;
        }

        if(!monteeId) {
            // setFlashError("Veuillez sélectionner une gare de montée.")
            flash("Veuillez sélectionner une gare de montée.", 'error');
            return
        }

        if(!descenteId) {
            // setFlashError("Veuillez sélectionner une gare de descente.")
            flash("Veuillez sélectionner une gare de descente.", 'error');
            return
        }

        if (selectedSieges.length === 0) {
            // setFlashError("Veuillez sélectionner au moins un siège.");
            flash("Veuillez sélectionner au moins un siège.", 'error');
            return;
        }

        // ── ÉTAT PRÉCÉDENT (désactivé) — le bénéficiaire était OBLIGATOIRE pour une remise ──
        // On autorise désormais une remise SANS bénéficiaire (bénéficiaire nullable côté backend aussi).
        // if (remiseNum > 0 && !beneficiaireId) {
        //     flash("Sélectionnez un bénéficiaire pour appliquer la remise.", 'error', 5);
        //     return;
        // }

        // nomclient et contactclient sont optionnels — pas de validation requise
        const tickets = selectedSieges.map((s) => ({
            voyage: `/api/voyages/${voyageId}`,
            siege: s["@id"],  // IRI : /api/sieges/{id}
            gare: `/api/gares/${monteeId}`,         // montée
            garedescente: `/api/gares/${descenteId}`, // descente
            nomclient: clientInfos[s.id]?.nomclient || null,
            contactclient: clientInfos[s.id]?.contactclient || null,
            // Remise unique appliquée à chaque billet (même tronçon = même tarif)
            remisetype: remiseNum > 0 ? remiseType : null,
            remisevaleur: remiseNum > 0 ? remiseNum : null,
            beneficiaire: remiseNum > 0 && beneficiaireId ? `/api/beneficiaires/${beneficiaireId}` : null,
            // Récompense fidélité (par siège) — exclusive de la remise manuelle, validée côté backend.
            // Doublement garde-fou : on n'envoie le flag que si le lookup a confirmé une récompense dispo.
            fideliteRecompense: (clientInfos[s.id]?.fidelite ?? false) && (fideliteBySeat[s.id]?.recompenseDisponible ?? false),
        }));

        setSubmitting(true);
        try {
            const res = await fetch("/ticket/nouveau", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tickets }),
            });

            const data = await res.json();

            if (!res.ok) {
                // setFlashError(data.detail ?? "Erreur lors de la création.");
                flash(data.detail ?? "Erreur lors de la création.", 'error');
                return;
            }

            // Erreurs partielles (certains tickets ont échoué)
            if (data.errors?.length > 0) {
                // setFlashError(data.errors.join(" | "));
                flash(data.errors.join(" | "), 'error');
            }

            if(data.created?.length > 0) {
                if(data.created.length === 1) {
                    // Rediriger vers le ticket créé
                    // window.location.href = `/ticket/${data.created[0]}`; // window.location.href = `/ticket/${data.created[0]}/pdf`;
                    window.open(`/ticket/${data.created[0]}/pdf`, `_blank`)
                    await loadSieges(voyageId, monteeId, descenteId);
                } else {

                    const res = await fetch("/ticket/batch/print", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ ids: data.created }),
                    })

                    if(res.ok) {
                        const blob = await res.blob()
                        const url  = URL.createObjectURL(blob)
                        window.open(url, "_blank")
                        setTimeout(() => URL.revokeObjectURL(url), 10_000)
                    } else {
                        // setFlashError("Erreur lors de la génération du PDF groupé.")
                        flash("Erreur lors de la génération du PDF groupé.", 'error');
                    }

                    /*
                    // Vente groupée → ouvrir chaque PDF dans un nouvel onglet
                    // Petit délai entre chaque ouverture pour éviter le blocage popup des navigateurs
                    data.created.forEach((id: number, index: number) => {
                        setTimeout(() => {
                            window.open(`/ticket/${id}/pdf`, `_blank`);
                        }, index * 300);
                    });
                    */
                    /* Recharger le plan après l'ouverture des onglets
                        setFlashSuccess(
                            `${data.created.length} ticket(s) créé(s). Si les onglets n'ont pas ouvert, ` +
                            `imprimez-les depuis la liste des tickets.`
                        );
                     */

                    flash(`${data.created.length} ticket(s) créé(s). Si les onglets n'ont pas ouvert, ` + `imprimez-les depuis la liste des tickets.`, 'success'); // Vu que certains navigateurs bloquent 'window.open' si ce n'est pas déclenché directement par un clic utilisateur

                    await loadSieges(voyageId, monteeId, descenteId);
                }
            }

            /*
                if (data.created?.length > 0) { -- Post création sans redirection
                    // Charger les détails de chaque ticket créé
                    const details = await Promise.all(
                        data.created.map((id: number) =>
                            fetch(`/ticket/${id}/json`).then(r => r.json())
                        )
                    )
                    // setCreatedTickets(details) // ❌ Écrase les tickets précédents
                    // ✅ Accumule
                    setCreatedTickets(prev => [...prev, ...details])
                    // Recharger le plan pour refléter les nouveaux sièges occupés
                    await loadSieges(voyageId)
                    // Réinitialiser la sélection
                    setSelectedSieges([])
                    setClientInfos({})
                }
            */
        } catch {
            // setFlashError("Erreur réseau. Veuillez réessayer.");
            flash("Erreur réseau. Veuillez réessayer.", 'error');
        } finally {
            setSubmitting(false);
        }
    };

    /*
        Places restantes PAR TRONÇON = la CAPACITÉ renvoyée par l'API, pas le nombre de sièges libres
        du plan. Depuis qu'une réservation PAYÉE tient une place, les deux peuvent diverger : la place
        est retenue sans qu'un siège précis soit attribué (on réserve une PLACE, pas un siège). Compter
        les sièges verts laisserait donc croire à des places vendables qui n'existent plus — l'agent
        sélectionnerait un siège pour se faire refuser la vente au dernier moment.
    */
    const siegesLibres = siegesData
        ? siegesData.sieges.filter((s) => s.statut === "LIBRE").length
        : null;
    const placesRestantes = siegesData
        ? (siegesData.placesDisponibles ?? siegesLibres)
        : null;
    // Des sièges paraissent libres alors que la capacité est épuisée (réservations payées non émises)
    /*
        Plan et capacité comptent désormais la même chose : les SIÈGES occupés au point de montée. Ils
        coïncident donc, sauf pour les réservations — elles tiennent une place sans qu'aucun siège leur
        soit attribué. L'écart vaut exactement ce nombre-là.
    */
    const placesSansSiegeAttribue = placesRestantes !== null && siegesLibres !== null
        && siegesLibres > placesRestantes;

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Flash messages */}
            {/* Erreurs désormais affichées via flash() (alerte flottante) — affichage inline conservé en commentaire :
            {flashError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{flashError}</span>
                </div>
            )}
            */}
            {flashSuccess && (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{flashSuccess}</span>
                </div>
            )}


            {/* Panneau post-création
                {createdTickets.length > 0 && (
                    <CreatedTicketsPanel
                        tickets={createdTickets}
                        onNouvelleVente={handleNouvelleVente}
                    />
                )}
            */}


            {/* Sélection voyage + gare côte à côte */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <MapPin className="h-4 w-4 text-blue-500" />
                        Voyage &amp; Gare
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Voyage */}
                    <div className="space-y-1.5">
                        <Label htmlFor="voyage">Voyage</Label>
                        <Select value={voyageId} onValueChange={setVoyageId}>
                            <SelectTrigger id="voyage" className="w-full">
                                <SelectValue placeholder="Choisir un voyage…" />
                            </SelectTrigger>
                            <SelectContent>
                                {voyages.map((v) => (
                                    <SelectItem key={v.id} value={String(v.id)}>
                                        <span className="font-mono text-xs text-gray-500 mr-2">
                                            {v.codevoyage}
                                        </span>
                                        {v.provenance} → {v.destination}
                                        <span className="ml-2 text-xs text-gray-400">
                                            ({v.placestotal} places)
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Gares de montée / descente côte à côte */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {/* Gare de montée */}
                        <div className="space-y-1.5">
                            <Label htmlFor="montee">
                                Gare de montée
                                {estCommercial ? (
                                    <span className="ml-1.5 text-xs font-normal text-violet-600">(position du car{garecourante ? ` : ${garecourante.libelle}` : ""})</span>
                                ) : userGareId && (
                                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">(votre gare)</span>
                                )}
                            </Label>
                            <Select
                                value={monteeId}
                                onValueChange={(v) => { setMonteeId(v); setDescenteId("") }}
                                disabled={arrets.length === 0 || !!userGareId || estCommercial}
                            >
                                <SelectTrigger id="montee" className="w-full">
                                    <SelectValue placeholder={arrets.length ? "Gare de montée…" : "Sélectionnez un voyage"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {arrets.map((a) => (
                                        <SelectItem key={a.id} value={String(a.id)}>
                                            {a.libelle}
                                            {a.ville && (
                                                <span className="ml-2 text-xs text-gray-400">· {a.ville}</span>
                                            )}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Gare de descente */}
                        <div className="space-y-1.5">
                            <Label htmlFor="descente">Gare de descente</Label>
                            <Select value={descenteId} onValueChange={setDescenteId} disabled={!monteeId}>
                                <SelectTrigger id="descente" className="w-full">
                                    <SelectValue placeholder={monteeId ? "Gare de descente…" : "Choisir la montée d'abord"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {descenteOptions.map((a) => (
                                        <SelectItem key={a.id} value={String(a.id)}>
                                            {a.libelle}
                                            {a.ville && (
                                                <span className="ml-2 text-xs text-gray-400">· {a.ville}</span>
                                            )}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {userGareId && voyageId && arrets.length > 0 && !userGareOnLigne && (
                        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            Votre gare{userGareLibelle ? ` (${userGareLibelle})` : ""} n'est pas desservie par ce voyage : vous ne pouvez pas y vendre de tickets.
                        </div>
                    )}

                    {tarifManquant && (
                        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            Aucun tarif défini pour ce trajet dans la grille tarifaire : la vente est impossible. Ajoutez le tarif correspondant avant de vendre.
                        </div>
                    )}

                    {/* Badges info voyage */}
                    {selectedVoyage && (
                        <div className="flex flex-wrap gap-2 text-sm">
                            <Badge variant="outline" className="gap-1">
                                <Bus className="h-3 w-3" />
                                {selectedVoyage.car?.matricule ?? "Aucun car"}
                            </Badge>
                            <Badge variant="outline" className="gap-1">
                                <Users className="h-3 w-3" />
                                {selectedVoyage.placestotal} places
                            </Badge>
                            {/* « au départ de cette gare » et non « sur ce tronçon » : la disponibilité se
                                juge au point de montée, les ventes des gares en aval n'y entrent pas. */}
                            {placesRestantes !== null && (
                                <Badge variant={placesRestantes === 0 ? "destructive" : "secondary"}>
                                    {placesRestantes === 0 ? "Complet au départ de cette gare" : `${placesRestantes} place(s) au départ de cette gare`}
                                </Badge>
                            )}
                            {/* Sans ce repère le plan ment : des sièges paraissent libres alors qu'une
                                réservation en tient déjà la place, sans siège attribué. */}
                            {placesSansSiegeAttribue && (
                                <Badge variant="outline" className="gap-1 border-violet-300 text-violet-700 dark:border-violet-700 dark:text-violet-400">
                                    {(siegesLibres ?? 0) - (placesRestantes ?? 0)} place(s) tenue(s) par des réservations
                                </Badge>
                            )}
                            {/* Réservations impayées : elles tiennent leur place le temps du paiement,
                                puis la libèrent automatiquement à l'échéance. */}
                            {!!siegesData?.placesReservees && siegesData.placesReservees > 0 && (
                                <Badge variant="outline" className="gap-1 border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400">
                                    {siegesData.placesReservees} réservation(s) en attente de paiement
                                </Badge>
                            )}
                            {selectedVoyage.datearriveereelle && (
                                <Badge variant="destructive" className="gap-1">
                                    Voyage clôturé
                                </Badge>
                            )}
                        </div>
                    )}

                    {/* Tarif du trajet — présentation dédiée et lisible */}
                    {unitPrice !== null && monteeId && descenteId && !selectedVoyage?.datearriveereelle && (
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
                                <p className="mt-0.5 text-xs text-muted-foreground">FCFA / billet</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Ajouter */}
            {voyageId && selectedVoyage?.datearriveereelle && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    Ce voyage est clôturé. La vente de tickets est impossible.
                </div>
            )}

            {/*
            // ✅ — déjà correct en fait, mais l'ordre dans le JSX pose problème
            // Le message "voyage clôturé" et "sélectionnez une gare" peuvent s'afficher ensemble
            // Ajouter une condition exclusive :
            */}
            {voyageId && !selectedVoyage?.datearriveereelle && (!monteeId || !descenteId) && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    Veuillez sélectionner la gare de montée et la gare de descente avant de choisir un siège.
                </div>
            )}
        {/* Plan + formulaires passagers côte à côte */}
        {/* Plan du car */}
            {voyageId && monteeId && descenteId && !selectedVoyage?.datearriveereelle && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

                    {/* Plan du véhicule */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Bus className="h-4 w-4 text-blue-500" />
                                Plan du véhicule
                            </CardTitle>
                            <CardDescription>
                                Cliquez sur les sièges disponibles pour les sélectionner.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingSieges ? (
                                <div className="flex items-center justify-center py-12 text-gray-400">
                                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                    Chargement du plan…
                                </div>
                            ) : siegesData && siegesData.sieges.length > 0 ? (
                                <PlanCar
                                    sieges={siegesData.sieges}
                                    siegesGauche={siegesData.siegesGauche}
                                    siegesDroite={siegesData.siegesDroite}
                                    selectedIds={new Set(selectedSieges.map((s) => s.id))}
                                    // PlanCar est générique : depuis 'sieges' (Siege[]) il infère T=Siege,
                                    // donc onToggle/onLiberer attendent un 'Siege' → handlers passés tels quels.
                                    onToggle={toggleSiege}
                                    onLiberer={handleLibererSiege}
                                />
                            ) : siegesData ? (
                                <p className="text-sm text-gray-400 py-6 text-center">
                                    Aucun siège configuré pour ce véhicule.
                                </p>
                            ) : null}
                        </CardContent>
                    </Card>

                    {/* Formulaires passagers */}
                    {(
                        <div className="flex flex-col gap-4">
                            {selectedSieges.length > 0 ? (
                                <Card className="flex-1">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="flex items-center gap-2 text-base">
                                            <Users className="h-4 w-4 text-blue-500" />
                                            Informations passagers
                                            <Badge className="ml-1">
                                                {selectedSieges.length} siège(s)
                                            </Badge>
                                        </CardTitle>
                                        <CardDescription>
                                            Ces informations sont optionnelles et peuvent être
                                            renseignées plus tard.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {selectedSieges.map((siege, idx) => (
                                            <div key={siege.id}>
                                                {idx > 0 && <Separator className="mb-4" />}
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                                                            {siege.numero}
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-700">
                                                            Siège {siege.numero}
                                                            <span className="ml-1.5 text-xs font-normal text-gray-400">
                                                                Rangée {siege.rangee}
                                                                {siege.cote === "GAUCHE" && " · Gauche"}
                                                                {siege.cote === "DROITE" && " · Droite"}
                                                            </span>
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pl-9">
                                                        <div className="space-y-1.5">
                                                            <Label
                                                                htmlFor={`nom-${siege.id}`}
                                                                className="text-gray-600"
                                                            >
                                                                Nom du client{" "}
                                                                <span className="text-gray-400 font-normal">
                                                                    (optionnel)
                                                                </span>
                                                            </Label>
                                                            <Input
                                                                id={`nom-${siege.id}`}
                                                                placeholder="Nom complet"
                                                                value={clientInfos[siege.id]?.nomclient ?? ""}
                                                                onChange={(e) =>
                                                                    updateClientInfo(siege.id, "nomclient", e.target.value)
                                                                }
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label
                                                                htmlFor={`contact-${siege.id}`}
                                                                className="text-gray-600"
                                                            >
                                                                Contact{" "}
                                                                <span className="text-gray-400 font-normal">
                                                                    (optionnel)
                                                                </span>
                                                            </Label>
                                                            <Input
                                                                id={`contact-${siege.id}`}
                                                                placeholder="Téléphone ou email"
                                                                value={clientInfos[siege.id]?.contactclient ?? ""}
                                                                onChange={(e) =>
                                                                    updateClientInfo(siege.id, "contactclient", e.target.value)
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                    {(() => {
                                                        const fid = fideliteBySeat[siege.id];
                                                        const dispo = !!fid?.recompenseDisponible;
                                                        return (
                                                            <div className="pl-9 space-y-1">
                                                                {/* Statut fidélité résolu en direct depuis le téléphone saisi */}
                                                                {fid?.loading && (
                                                                    <p className="text-xs text-muted-foreground">Vérification de la fidélité…</p>
                                                                )}
                                                                {fid && !fid.loading && fid.found && fid.membre && (
                                                                    dispo ? (
                                                                        <p className="text-xs text-green-600">
                                                                            🎁 {fid.nom ?? "Membre"} · récompense disponible
                                                                            {" "}({fid.recompensePourcentage === 100 ? "voyage offert" : `−${fid.recompensePourcentage}%`})
                                                                        </p>
                                                                    ) : (
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {fid.nom ?? "Membre"} · {fid.progression}/{fid.seuil} tampons (pas encore de récompense)
                                                                        </p>
                                                                    )
                                                                )}
                                                                {fid && !fid.loading && fid.found && !fid.membre && (
                                                                    <p className="text-xs text-muted-foreground">Client non-membre de la fidélité.</p>
                                                                )}

                                                                <label className={cn("flex items-center gap-2 text-sm", dispo ? "text-gray-600 cursor-pointer" : "text-gray-300 cursor-not-allowed")}>
                                                                    <Checkbox
                                                                        checked={(clientInfos[siege.id]?.fidelite ?? false) && dispo}
                                                                        disabled={!dispo}
                                                                        onCheckedChange={(v) => toggleFideliteSeat(siege.id, !!v)}
                                                                    />
                                                                    <span>
                                                                        Utiliser la récompense fidélité
                                                                        {!dispo && (
                                                                            <span className="text-gray-400 font-normal"> (aucune récompense disponible pour ce numéro)</span>
                                                                        )}
                                                                    </span>
                                                                </label>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            ) : (
                                <Card className="flex-1 border-dashed">
                                    <CardContent className="flex items-center justify-center py-12">
                                        <p className="text-sm text-gray-400 text-center">
                                            Sélectionnez des sièges sur le plan<br />
                                            pour renseigner les informations passagers.
                                        </p>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Remise + bénéficiaire (optionnel) */}
                            {selectedSieges.length > 0 && (
                                <div className="rounded-xl border bg-card p-4 space-y-3">
                                    <p className="text-sm font-medium">Remise (optionnel)</p>
                                    {/* Ancienne version (balises natives) — conservée en commentaire :
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label className="text-xs text-muted-foreground">Type</label>
                                            <select value={remiseType} onChange={(e) => setRemiseType(e.target.value as "MONTANT" | "POURCENTAGE")} className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                                                <option value="MONTANT">Montant (FCFA)</option>
                                                <option value="POURCENTAGE">Pourcentage (%)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs text-muted-foreground">Valeur</label>
                                            <input type="number" min="0" value={remiseValeur} onChange={(e) => setRemiseValeur(e.target.value)} placeholder="0" className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-muted-foreground">Bénéficiaire</label>
                                            <select value={beneficiaireId} onChange={(e) => setBeneficiaireId(e.target.value)} className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                                                <option value="">— Aucun —</option>
                                            </select>
                                        </div>
                                    </div>
                                    */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="space-y-1.5">
                                            <Label>Type</Label>
                                            <Select value={remiseType} onValueChange={(v) => setRemiseType(v as "MONTANT" | "POURCENTAGE")}>
                                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="MONTANT">Montant (FCFA)</SelectItem>
                                                    <SelectItem value="POURCENTAGE">Pourcentage (%)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label>{remiseType === "POURCENTAGE" ? "Valeur (%)" : "Valeur (FCFA)"}</Label>
                                            <Input
                                                type="number" min="0" value={remiseValeur}
                                                onChange={(e) => setRemiseValeur(e.target.value)}
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            {/* ÉTAT PRÉCÉDENT : <Label>Bénéficiaire {remiseNum > 0 && <span className="text-red-500">*</span>}</Label> — obligatoire pour la remise */}
                                            <Label>Bénéficiaire <span className="text-xs font-normal text-muted-foreground">(optionnel)</span></Label>
                                            <Select value={beneficiaireId} onValueChange={setBeneficiaireId}>
                                                <SelectTrigger className="w-full"><SelectValue placeholder="— Aucun —" /></SelectTrigger>
                                                <SelectContent>
                                                    {beneficiaires.map((b) => (
                                                        <SelectItem key={b.id} value={String(b.id)}>
                                                            {b.nom} ({b.categorie}) ({b.contact ? b.contact : ''})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        {/* Lien masqué pour un agent rattaché à une gare : il n'a pas le droit de créer un bénéficiaire */}
                                        {!userGareId ? (
                                            <a href="/beneficiaire/nouveau" target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                                                + Nouveau bénéficiaire
                                            </a>
                                        ) : <span />}
                                        {remiseParBillet > 0 && (
                                            <span className="text-xs text-muted-foreground">
                                                Remise : −{remiseParBillet.toLocaleString("fr-FR")} FCFA / billet
                                            </span>
                                        )}
                                    </div>
                                    {/* ÉTAT PRÉCÉDENT (désactivé) — bénéficiaire obligatoire pour la remise :
                                    {remiseNum > 0 && !beneficiaireId && (
                                        <p className="text-xs text-red-600">Un bénéficiaire est obligatoire pour appliquer la remise.</p>
                                    )}
                                    */}
                                </div>
                            )}

                            {/* Barre de confirmation intégrée dans la colonne droite */}
                            {selectedSieges.length > 0 && (
                                <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-5 py-4">
                                    <div className="text-sm text-blue-700">
                                        <span className="font-semibold">{selectedSieges.length}</span>{" "}
                                        ticket(s) à créer
                                        {selectedVoyage?.car && (
                                            <span className="text-blue-400 ml-1.5">
                                                · {selectedVoyage.car.matricule}
                                            </span>
                                        )}
                                        {unitPrice !== null && (
                                            <span className="block text-blue-500 mt-0.5">
                                                {(unitPrice - remiseParBillet).toLocaleString("fr-FR")} FCFA × {selectedSieges.length} ={" "}
                                                <span className="font-semibold">
                                                    {((unitPrice - remiseParBillet) * selectedSieges.length).toLocaleString("fr-FR")} FCFA
                                                </span>
                                                {remiseParBillet > 0 && <span className="ml-1 text-blue-400">(remise incluse)</span>}
                                            </span>
                                        )}
                                    </div>
                                    <Button
                                        type="button"
                                        onClick={handleSubmit}
                                        disabled={submitting}
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Création…
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                                Confirmer{" "}
                                                {selectedSieges.length > 1 ? "les tickets" : "le ticket"}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Modale : libérer un siège occupé (passager descendu en route) pour le revendre */}
            {liberCible && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                    onClick={() => !liberLoading && setLiberCible(null)}
                >
                    <div
                        className="w-full max-w-md rounded-xl border bg-card p-5 text-card-foreground shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="mb-1 text-lg font-semibold">
                            Libérer le siège {liberCible.numero} ?
                        </h3>
                        <p className="mb-4 text-sm text-muted-foreground">
                            Ce siège est occupé par{" "}
                            <strong className="text-foreground">{liberCible.occupantNom ?? "un passager"}</strong>{" "}
                            ({liberCible.occupantMontee ?? "?"} → {liberCible.occupantDescente ?? "?"}). En confirmant,
                            vous enregistrez que ce passager descend à{" "}
                            <strong className="text-foreground">
                                {arrets.find((a) => String(a.id) === monteeId)?.libelle ?? userGareLibelle ?? "cette gare"}
                            </strong>{" "}
                            : le siège se libère pour être revendu. Le billet d'origine et son prix restent inchangés.
                        </p>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setLiberCible(null)} disabled={liberLoading}>
                                Annuler
                            </Button>
                            <Button onClick={confirmLibererSiege} disabled={liberLoading}>
                                {liberLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Libérer le siège"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
