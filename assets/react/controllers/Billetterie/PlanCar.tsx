import { cn } from "../../../lib/utils"

/**
 * Plan des sièges d'un véhicule. Composant partagé :
 *  - billetterie / désistement → mode interactif (sélection des sièges libres)
 *  - fiche véhicule            → mode lecture seule (readonly)
 *
 * Contrat de props inchangé (consommé par PlanCarReadonly et DesistementForm).
 * Stylé avec les tokens de thème (card / muted / border) + variantes dark, comme la billetterie.
 */
export interface SiegePlan {
    id: number
    numero: number
    rangee: number
    colonne: number
    cote: "GAUCHE" | "DROITE" | "ARRIERE" | "GRILLE"
    statut: "LIBRE" | "OCCUPE"
}

interface PlanCarProps {
    sieges: SiegePlan[]
    siegesGauche: number
    siegesDroite: number
    selectedIds?: Set<number>
    onToggle?: (siege: SiegePlan) => void
    readonly?: boolean
}

// Dimensions (px)
const SEAT = 40
const GAP = 6

// ─── Siège ──────────────────────────────────────────────────────────────────
function Seat({
    siege,
    selected,
    readonly,
    onToggle,
}: {
    siege: SiegePlan
    selected: boolean
    readonly: boolean
    onToggle?: (s: SiegePlan) => void
}) {
    const occupe = siege.statut === "OCCUPE"
    const clickable = !readonly && !occupe

    return (
        <button
            type="button"
            disabled={occupe || readonly}
            onClick={() => clickable && onToggle?.(siege)}
            title={`Siège ${siege.numero} — ${occupe ? "Occupé" : selected ? "Sélectionné" : "Libre"}`}
            className={cn(
                "relative flex items-center justify-center rounded-md border-2 text-xs font-bold tabular-nums transition-all duration-150 select-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                occupe &&
                    "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500",
                !occupe && selected &&
                    "cursor-pointer border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-200 dark:border-blue-500 dark:bg-blue-500 dark:shadow-none",
                !occupe && !selected && clickable &&
                    "cursor-pointer border-emerald-300 bg-emerald-50 text-emerald-700 hover:border-emerald-500 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:border-emerald-600 dark:hover:bg-emerald-900",
                !occupe && !selected && readonly &&
                    "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
            )}
            style={{ width: SEAT, height: SEAT }}
        >
            {siege.numero}
            {occupe && (
                <span className="absolute inset-0 flex items-center justify-center">
                    <span className="h-0.5 w-3/4 rotate-45 rounded bg-gray-400 dark:bg-gray-500" />
                </span>
            )}
        </button>
    )
}

function LegendItem({ className, label }: { className: string; label: string }) {
    return (
        <span className="flex items-center gap-1.5">
            <span className={cn("inline-block h-4 w-4 rounded border-2", className)} />
            {label}
        </span>
    )
}

// ─── Plan ───────────────────────────────────────────────────────────────────
export default function PlanCar({
    sieges,
    siegesGauche,
    siegesDroite,
    selectedIds = new Set(),
    onToggle,
    readonly = false,
}: PlanCarProps) {
    // Regroupement par rangée (ordonnée)
    const byRangee = sieges.reduce<Record<number, SiegePlan[]>>((acc, s) => {
        (acc[s.rangee] ??= []).push(s)
        return acc
    }, {})
    const rangees = Object.keys(byRangee).map(Number).sort((a, b) => a - b)

    // Rendu UNIFIÉ en grille : chaque siège à sa colonne ABSOLUE. Les plans sont désormais des grilles
    // (cote 'GRILLE', colonne déjà absolue) ; on gère aussi les anciens sièges GAUCHE/DROITE (colonne par
    // côté) via une colonne absolue calculée — pas besoin de re-générer les cars existants.
    const absCol = (s: SiegePlan) => (s.cote === "DROITE" ? (siegesGauche || 0) + 1 + s.colonne : s.colonne)
    const maxCol = Math.max(1, ...sieges.map(absCol))

    return (
        <div className="w-full overflow-x-auto text-center">
            <div className="mx-auto inline-block min-w-min rounded-2xl border bg-card p-4 text-left text-card-foreground shadow-sm">
                {/* Avant du véhicule */}
                <div className="mb-3 flex items-center justify-between rounded-lg bg-muted px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    <span>Avant</span>
                    <span className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-current opacity-70" aria-hidden>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    </span>
                </div>

                {/* Rangées — grille unifiée (chaque siège à sa colonne absolue, trous = vides) */}
                <div className="flex flex-col" style={{ gap: GAP }}>
                    {rangees.map((rangee) => {
                        const seats = byRangee[rangee]
                        return (
                            <div key={rangee} className="flex items-center" style={{ gap: GAP }}>
                                <div className="w-6 text-right text-[10px] font-semibold text-muted-foreground">{rangee}</div>
                                <div className="flex" style={{ gap: GAP }}>
                                    {Array.from({ length: maxCol }, (_, i) => {
                                        const s = seats.find((x) => absCol(x) === i + 1)
                                        return s ? (
                                            <Seat key={s.id} siege={s} selected={selectedIds.has(s.id)} readonly={readonly} onToggle={onToggle} />
                                        ) : (
                                            <div key={`e-${rangee}-${i}`} style={{ width: SEAT, height: SEAT }} />
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Arrière du véhicule */}
                <div className="mt-3 rounded-lg bg-muted/60 px-3 py-1 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Arrière
                </div>
            </div>

            {/* Légende */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-foreground">
                <LegendItem className="border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950" label={readonly ? "Disponible" : "Libre"} />
                {!readonly && <LegendItem className="border-blue-500 bg-blue-500" label="Sélectionné" />}
                <LegendItem className="border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800" label="Occupé" />
            </div>
        </div>
    )
}
