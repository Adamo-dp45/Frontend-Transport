import { cn } from "../../../lib/utils"

/**
 * Plan des sièges d'un véhicule. Composant UNIQUE et partagé par tous les écrans :
 *  - billetterie (`TicketForm`)        → vente, mode interactif complet (5 états + libération/revente)
 *  - désistement (`DesistementForm`)   → report, sélection d'un siège sur le voyage cible
 *  - fiche véhicule (`PlanCarReadonly`) → lecture seule
 *
 * Quatre états de siège : libre, sélectionné, occupé (barré, éventuellement libérable via la pastille
 * `↻`) et revendu (violet). Les fonctionnalités s'éteignent par les props : sans `onLiberer` aucun
 * siège n'est libérable, `readonly` fige tout (fiche véhicule).
 *
 * Il n'y a PLUS de repère « réservé » par siège : une réservation retient une PLACE, jamais un siège
 * précis. Marquer des sièges arbitraires laissait croire à une réservation nominative.
 *
 * Ce plan répond à UNE question : qui est assis AU POINT DE MONTÉE demandé (priorité à la gare amont).
 * Il ne dit RIEN de la suite du trajet — un siège libre ici peut être vendu plus loin. C'est la
 * CAPACITÉ du tronçon, calculée côté API et affichée par le TicketForm, qui arbitre la vente.
 */
export interface SiegePlan {
    "@id"?: string
    id: number
    numero: number
    rangee: number
    colonne: number
    cote: "GAUCHE" | "DROITE" | "ARRIERE" | "GRILLE"
    statut: "LIBRE" | "OCCUPE"
    // Occupant bloquant (si OCCUPE) → permet de « libérer » le siège pour le revendre (billetterie)
    occupantTicketId?: number | null
    occupantNom?: string | null
    occupantMontee?: string | null
    occupantDescente?: string | null
    // Siège revendu : porté par plusieurs billets sur le voyage (réutilisé sur des tronçons disjoints)
    revendu?: boolean
    /*
        Siège EN CONFLIT : porté par ≥2 billets dont l'un est ÉVINCÉ par la priorité amont (un passager
        reste à quai). Distinct de 'revendu' (tous voyagent). ATTENTION : ce repère est GLOBAL au voyage,
        alors que ce plan est vu par TRONÇON — sur un tronçon aval, le siège peut être légitimement libre
        ou occupé par un passager qui, lui, voyage. On le rend donc en OVERLAY discret (pastille d'angle),
        SANS toucher à la couleur d'occupation : il informe « une éviction existe sur ce voyage » sans
        jamais mentir sur la vendabilité du tronçon affiché.
    */
    conflit?: boolean
}

// Générique sur le type de siège : chaque écran garde SON type (le 'Siege' riche du TicketForm, le
// 'SiegePlan & @id' du désistement, le 'SiegePlan' nu de la fiche) → callbacks typés sans cast.
interface PlanCarProps<T extends SiegePlan> {
    sieges: T[]
    siegesGauche: number
    siegesDroite: number
    selectedIds?: Set<number>
    onToggle?: (siege: T) => void
    onLiberer?: (siege: T) => void
    readonly?: boolean
    /** Affiche la légende des états sous le plan. Désactivée pour la fiche véhicule. */
    showLegend?: boolean
}

// Dimensions (px)
const SIEGE_W = 44
const SIEGE_H = 44
const GAP = 6

// ─── Siège individuel ─────────────────────────────────────────────────────────
function SiegeCell({
    siege,
    selected,
    readonly,
    onSelect,
    onLiberer,
}: {
    siege: SiegePlan
    selected: boolean
    readonly: boolean
    // Callbacks SANS argument : c'est 'PlanCar' (générique) qui capture le siège typé 'T' et le
    // transmet. 'SiegeCell' n'a besoin que de savoir « clic sélection » vs « clic libération ».
    onSelect?: () => void
    onLiberer?: () => void
}) {
    const isOccupe = siege.statut === "OCCUPE"
    // Un siège occupé reste cliquable pour être LIBÉRÉ (le passager descend en route) puis revendu
    const liberable = !readonly && isOccupe && !!siege.occupantTicketId && !!onLiberer
    // Siège déjà revendu (réutilisé sur ≥2 tronçons) → signalé par une COULEUR (violet)
    const revendu = !!siege.revendu
    // Siège en CONFLIT (un billet évincé sur le voyage) → OVERLAY seul, jamais la couleur : le repère
    // est global au voyage et ne doit pas contredire l'occupation du tronçon affiché (cf. SiegePlan).
    const conflit = !!siege.conflit

    return (
        <button
            type="button"
            disabled={readonly || (isOccupe && !liberable)}
            onClick={() => {
                if (readonly) return
                if (liberable) onLiberer!()
                else if (!isOccupe) onSelect?.()
            }}
            title={
                (liberable
                        ? `Siège ${siege.numero} — occupé par ${siege.occupantNom ?? "passager"} (${siege.occupantMontee ?? "?"} → ${siege.occupantDescente ?? "?"}). Cliquer pour libérer.`
                        : `Siège ${siege.numero} — ${siege.statut}`)
                    + (revendu ? " · déjà revendu" : "")
                    + (conflit ? " · conflit : un billet évincé sur ce voyage (passager à reloger)" : "")
            }
            className={cn(
                // rounded-t-lg / rounded-b-sm : dossier (haut arrondi) + assise (bas plus carré) → forme de siège
                "relative flex items-center justify-center rounded-t-lg rounded-b-sm border-2 text-xs font-bold transition-all duration-150 select-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                // Sélection (toujours bleu, prioritaire)
                !isOccupe && selected && (readonly
                    ? "border-blue-500 bg-blue-500 text-white"
                    : "cursor-pointer border-blue-500 bg-blue-500 text-white shadow-md shadow-blue-200 scale-105 dark:shadow-none"),
                // ── REVENDU → violet (occupé non libérable / libérable / libre) ──
                revendu && isOccupe && !liberable &&
                    "cursor-not-allowed border-violet-300 bg-violet-100 text-violet-500 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-400",
                revendu && liberable &&
                    "cursor-pointer border-violet-300 bg-violet-100 text-violet-600 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-600 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-300 dark:hover:border-amber-500 dark:hover:bg-amber-950 dark:hover:text-amber-300",
                revendu && !isOccupe && !selected && (readonly
                    ? "border-violet-400 bg-violet-100 text-violet-700 dark:border-violet-600 dark:bg-violet-950 dark:text-violet-300"
                    : "cursor-pointer border-violet-400 bg-violet-100 text-violet-700 hover:border-violet-500 hover:bg-violet-200 hover:scale-105 dark:border-violet-600 dark:bg-violet-950 dark:text-violet-300 dark:hover:border-violet-500 dark:hover:bg-violet-900"),
                // ── NON revendu (comportement normal) ──
                !revendu && isOccupe && !liberable &&
                    "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500",
                !revendu && liberable &&
                    "cursor-pointer border-gray-200 bg-gray-100 text-gray-400 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500 dark:hover:border-amber-500 dark:hover:bg-amber-950 dark:hover:text-amber-300",
                !revendu && !isOccupe && !selected && (readonly
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : "cursor-pointer border-emerald-300 bg-emerald-50 text-emerald-700 hover:border-emerald-500 hover:bg-emerald-100 hover:scale-105 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:border-emerald-600 dark:hover:bg-emerald-900")
            )}
            style={{ width: SIEGE_W, height: SIEGE_H }}
        >
            {siege.numero}
            {isOccupe && (
                <span className="absolute inset-0 flex items-center justify-center">
                    <span className={cn("h-0.5 w-3/4 rotate-45 rounded", revendu ? "bg-violet-400" : "bg-gray-400")} />
                </span>
            )}
            {liberable && (
                <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold leading-none text-white shadow-sm" aria-hidden>
                    ↻
                </span>
            )}
            {/*
                OVERLAY de conflit — pastille d'angle GAUCHE (le ↻ de libération occupe l'angle droit ;
                les deux peuvent coexister sur un tronçon aval où le siège est libérable ici mais évincé
                plus haut). N'altère PAS la couleur du siège : simple alerte « éviction sur ce voyage ».
            */}
            {conflit && (
                <span className="absolute -top-1.5 -left-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold leading-none text-white shadow-sm ring-1 ring-white dark:ring-gray-900" aria-hidden>
                    !
                </span>
            )}
        </button>
    )
}

// ─── Plan du car — DESSIN (silhouette de véhicule) ────────────────────────────
// Le plan prend la forme d'un bus : coque au nez arrondi, poste de conduite (volant + siège
// chauffeur à gauche, porte à droite), roues sur les flancs, et banquette arrière (rangée du fond
// qui remplit l'allée) rendue en bloc continu. La banquette vient de l'API ('cote' = ARRIERE, posé
// par le back depuis le marqueur « B: » du plan) : aucun calcul ici. Le COULOIR reste un simple
// espace vide entre les colonnes (aucun champ dédié).
export default function PlanCar<T extends SiegePlan>({
    sieges,
    siegesGauche,
    siegesDroite,
    selectedIds = new Set(),
    onToggle,
    onLiberer,
    readonly = false,
    showLegend = true,
}: PlanCarProps<T>) {
    const byRangee = sieges.reduce<Record<number, T[]>>((acc, s) => {
        (acc[s.rangee] ??= []).push(s)
        return acc
    }, {})
    const rangees = Object.keys(byRangee).map(Number).sort((a, b) => a - b)

    // Colonne ABSOLUE : grilles (colonne déjà absolue) + anciens sièges DROITE (décalés après la gauche).
    // Les trous (couloir OU place manquante) restent de simples vides — non distingués, comme demandé.
    const absCol = (s: SiegePlan) => (s.cote === "DROITE" ? (siegesGauche || 0) + 1 + s.colonne : s.colonne)
    const maxCol = Math.max(1, ...sieges.map(absCol))

    // BANQUETTE : donnée par l'API ('cote' = ARRIERE), que le backend déduit du marqueur « B: » saisi
    // dans le plan du car. AUCUN calcul ici : c'est une notion métier, elle appartient à l'API — tout
    // autre consommateur (Next, Flutter, React Native) lit la même information sans la redécouvrir.
    const estBanquette = (seats: T[]) => seats.some((s) => s.cote === "ARRIERE")
    const rangeesGrille = rangees.filter((r) => !estBanquette(byRangee[r]))
    const rangeesBanquette = rangees.filter((r) => estBanquette(byRangee[r]))

    // Légende ADAPTATIVE : seuls les états réellement présents (la fiche véhicule ne montre pas
    // « sélectionné », un plan sans revente ne montre pas « revendu »…).
    const hasOccupe = sieges.some((s) => s.statut === "OCCUPE")
    const hasRevendu = sieges.some((s) => !!s.revendu)
    const hasConflit = sieges.some((s) => !!s.conflit)

    const renderSeat = (s: T) => (
        <SiegeCell
            key={s.id}
            siege={s}
            selected={selectedIds.has(s.id)}
            readonly={readonly}
            onSelect={onToggle ? () => onToggle(s) : undefined}
            onLiberer={onLiberer ? () => onLiberer(s) : undefined}
        />
    )

    // Une rangée rendue en grille : chaque siège à sa colonne absolue ; les trous (couloir / place
    // manquante) sont de simples vides. Partagée par les rangées normales ET la banquette.
    const renderRangee = (rangee: number) => (
        <div key={rangee} className="flex justify-center" style={{ gap: GAP }}>
            {Array.from({ length: maxCol }, (_, i) => {
                const s = byRangee[rangee].find((x) => absCol(x) === i + 1)
                return s ? renderSeat(s) : <div key={`e-${rangee}-${i}`} style={{ width: SIEGE_W, height: SIEGE_H }} />
            })}
        </div>
    )

    return (
        <div className="overflow-x-auto px-2 pt-2 pb-2">
            <div className="mx-auto w-fit">
                {/* COQUE : nez arrondi en haut, arrière moins arrondi ('relative' pour ancrer les roues) */}
                <div className="relative rounded-t-[2.75rem] rounded-b-3xl border-2 border-border bg-card px-3 pb-3 pt-2 shadow-sm">
                    {/* Roues (repères sur les flancs) */}
                    <span aria-hidden className="absolute -left-[7px] top-[22%] h-9 w-1.5 rounded-full bg-muted-foreground/40" />
                    <span aria-hidden className="absolute -left-[7px] bottom-[15%] h-9 w-1.5 rounded-full bg-muted-foreground/40" />
                    <span aria-hidden className="absolute -right-[7px] top-[22%] h-9 w-1.5 rounded-full bg-muted-foreground/40" />
                    <span aria-hidden className="absolute -right-[7px] bottom-[15%] h-9 w-1.5 rounded-full bg-muted-foreground/40" />

                    {/* POSTE DE CONDUITE : volant + siège chauffeur (gauche), porte avant (droite) */}
                    <div className="mb-1 flex items-center justify-between rounded-t-[1.75rem] bg-muted/50 px-4 py-2">
                        <div className="flex items-center gap-2">
                            <svg viewBox="0 0 24 24" className="size-5 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden>
                                <circle cx="12" cy="12" r="9" />
                                <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
                                <path d="M12 9.8V3.2M10.1 13.1 4.6 16.8M13.9 13.1 19.4 16.8" strokeLinecap="round" />
                            </svg>
                            <span aria-hidden title="Chauffeur" className="size-6 rounded-t-md rounded-b-sm border-2 border-border bg-muted" />
                        </div>
                        <span title="Porte avant" className="h-7 w-2 rounded-sm border border-border bg-background" />
                    </div>
                    {/* Pare-brise / séparation cabine */}
                    <div className="mb-2 border-t border-dashed border-border" />

                    {/* RANGÉES : grille centrée ; le couloir est la colonne vide */}
                    <div className="flex flex-col" style={{ gap: GAP }}>
                        {rangeesGrille.map(renderRangee)}
                    </div>

                    {/* BANQUETTE : la/les rangée(s) pleine(s) du fond, en bloc continu (état par place conservé) */}
                    {rangeesBanquette.length > 0 && (
                        <div className="mt-1.5 mx-auto flex w-fit flex-col rounded-md rounded-b-2xl border-2 border-border bg-muted/40 p-1.5" style={{ gap: GAP }}>
                            {rangeesBanquette.map(renderRangee)}
                        </div>
                    )}
                </div>
            </div>

            {/* Légende adaptative — masquable (fiche véhicule) */}
            {showLegend && (
                <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3">
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Légende des sièges</p>
                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-foreground">
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block size-4 shrink-0 rounded-t-md rounded-b-sm border-2 border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950" />
                            {readonly ? "Disponible" : "Libre"}
                        </span>
                        {!readonly && (
                            <span className="flex items-center gap-1.5">
                                <span className="inline-block size-4 shrink-0 rounded-t-md rounded-b-sm border-2 border-blue-500 bg-blue-500" />
                                Sélectionné
                            </span>
                        )}
                        {hasOccupe && (
                            <span className="flex items-center gap-1.5">
                                <span className="relative inline-block size-4 shrink-0 rounded-t-md rounded-b-sm border-2 border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800">
                                    {!readonly && onLiberer && (
                                        <span className="absolute -top-1.5 -right-1.5 flex size-3 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold leading-none text-white" aria-hidden>↻</span>
                                    )}
                                </span>
                                {!readonly && onLiberer
                                    ? <span>Occupé <span className="text-muted-foreground">· cliquer pour libérer en route</span></span>
                                    : <span>Occupé</span>}
                            </span>
                        )}
                        {hasRevendu && (
                            <span className="flex items-center gap-1.5">
                                <span className="inline-block size-4 shrink-0 rounded-t-md rounded-b-sm border-2 border-violet-400 bg-violet-100 dark:border-violet-600 dark:bg-violet-950" />
                                Revendu
                            </span>
                        )}
                        {hasConflit && (
                            <span className="flex items-center gap-1.5">
                                <span className="relative inline-block size-4 shrink-0 rounded-t-md rounded-b-sm border-2 border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800">
                                    <span className="absolute -top-1.5 -left-1.5 flex size-3 items-center justify-center rounded-full bg-rose-600 text-[8px] font-bold leading-none text-white ring-1 ring-white dark:ring-gray-900" aria-hidden>!</span>
                                </span>
                                <span>Conflit <span className="text-muted-foreground">· un billet évincé (à reloger)</span></span>
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

/*
// ─── Plan du car (ANCIENNE grille — conservée en référence, remplacée par le dessin ci-dessus) ─
export default function PlanCar<T extends SiegePlan>({
    sieges,
    siegesGauche,
    siegesDroite,
    selectedIds = new Set(),
    onToggle,
    onLiberer,
    readonly = false,
    showLegend = true,
}: PlanCarProps<T>) {
    const byRangee = sieges.reduce<Record<number, T[]>>((acc, s) => {
        (acc[s.rangee] ??= []).push(s)
        return acc
    }, {})

    const rangees = Object.keys(byRangee)
        .map(Number)
        .sort((a, b) => a - b)

    // Rendu UNIFIÉ en grille : chaque siège à sa colonne ABSOLUE. Grilles (cote 'GRILLE') + anciens sièges
    // GAUCHE/DROITE (colonne par côté → colonne absolue calculée) rendus par le même chemin. Le couloir
    // (colonne vide de la grille) reste rendu comme un simple vide, sans champ dédié côté modèle.
    const absCol = (s: SiegePlan) => (s.cote === "DROITE" ? (siegesGauche || 0) + 1 + s.colonne : s.colonne)
    const maxCol = Math.max(1, ...sieges.map(absCol))

    // Légende ADAPTATIVE : on n'affiche que les états réellement présents (la fiche véhicule en lecture
    // seule ne montre ni « sélectionné » ni « réservé »…).
    const hasOccupe = sieges.some((s) => s.statut === "OCCUPE")
    const hasRevendu = sieges.some((s) => !!s.revendu)

    return (
        // px-2/pt-2 : réservent la place des pastilles d'angle des sièges (`-top-1.5`, `-right-1.5`) qui,
        // sans marge, étaient rognées par 'overflow-x-auto' (première rangée + colonne de droite).
        <div className="overflow-x-auto px-2 pt-2 pb-2">
            {/* Rangées — grille unifiée (chaque siège à sa colonne absolue, trous = vides) *}
            <div className="flex flex-col" style={{ gap: GAP }}>
                {rangees.map((rangee) => {
                    const seats = byRangee[rangee]
                    return (
                        <div key={rangee} className="flex items-center" style={{ gap: GAP }}>
                            <div className="w-7 text-right text-[10px] font-semibold text-gray-400">
                                {rangee}
                            </div>
                            <div className="flex" style={{ gap: GAP }}>
                                {Array.from({ length: maxCol }, (_, i) => {
                                    const s = seats.find((x) => absCol(x) === i + 1)
                                    return s ? (
                                        <SiegeCell
                                            key={s.id}
                                            siege={s}
                                            selected={selectedIds.has(s.id)}
                                            readonly={readonly}
                                            onSelect={onToggle ? () => onToggle(s) : undefined}
                                            onLiberer={onLiberer ? () => onLiberer(s) : undefined}
                                        />
                                    ) : (
                                        <div key={`e-${rangee}-${i}`} style={{ width: SIEGE_W, height: SIEGE_H }} />
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Légende adaptative (style TicketForm) — masquable (fiche véhicule) *}
            {showLegend && (
            <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Légende des sièges</p>
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-foreground">
                    <span className="flex items-center gap-1.5">
                        <span className="inline-block size-4 shrink-0 rounded border-2 border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950" />
                        {readonly ? "Disponible" : "Libre"}
                    </span>
                    {!readonly && (
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block size-4 shrink-0 rounded border-2 border-blue-500 bg-blue-500" />
                            Sélectionné
                        </span>
                    )}
                    {hasOccupe && (
                        <span className="flex items-center gap-1.5">
                            <span className="relative inline-block size-4 shrink-0 rounded border-2 border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800">
                                {!readonly && onLiberer && (
                                    <span className="absolute -top-1.5 -right-1.5 flex size-3 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold leading-none text-white" aria-hidden>↻</span>
                                )}
                            </span>
                            {!readonly && onLiberer
                                ? <span>Occupé <span className="text-muted-foreground">· cliquer pour libérer en route</span></span>
                                : <span>Occupé</span>}
                        </span>
                    )}
                    {hasRevendu && (
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block size-4 shrink-0 rounded border-2 border-violet-400 bg-violet-100 dark:border-violet-600 dark:bg-violet-950" />
                            Revendu
                        </span>
                    )}
                </div>
            </div>
            )}
        </div>
    )
}
*/