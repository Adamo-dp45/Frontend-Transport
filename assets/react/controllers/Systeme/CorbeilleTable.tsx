import { MoreHorizontal, RotateCcw, Trash2, Inbox } from "lucide-react"
import { Button } from "../../../components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"
import { CorbeilleItem, CorbeilleParEntreprise, CorbeilleParType } from "../../models/corbeille.model"

const BASE = "/admin/systeme/corbeille"

type Props = {
    total: number
    parType: CorbeilleParType[]
    parEntreprise: CorbeilleParEntreprise[]
    items: CorbeilleItem[]
    filtreType: string | null
    filtreEntreprise: number | null
    csrf: string
}

export default function CorbeilleTable({ total, parType, parEntreprise, items, filtreType, filtreEntreprise, csrf }: Props) {
    // Construit une URL de liste en modifiant un seul filtre à la fois (l'autre est conservé).
    const urlAvec = (patch: { type?: string | null; entreprise?: number | null }): string => {
        const type = "type" in patch ? patch.type : filtreType
        const entreprise = "entreprise" in patch ? patch.entreprise : filtreEntreprise
        const params = new URLSearchParams()
        if (type) params.set("type", type)
        if (entreprise != null) params.set("entreprise", String(entreprise))
        const qs = params.toString()
        return qs ? `${BASE}?${qs}` : BASE
    }

    const confirmer = (message: string) => (e: React.FormEvent) => {
        if (!window.confirm(message)) {
            e.preventDefault()
        }
    }

    // Champs cachés (filtres courants + CSRF) portés par toutes les actions.
    const ChampsCaches = () => (
        <>
            {filtreType && <input type="hidden" name="type" value={filtreType} />}
            {filtreEntreprise != null && <input type="hidden" name="entreprise" value={String(filtreEntreprise)} />}
            <input type="hidden" name="_token" value={csrf} />
        </>
    )

    const chip = (actif: boolean) =>
        `inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${
            actif
                ? "border-primary bg-primary/10 text-primary font-medium"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
        }`

    return (
        <div className="space-y-5">
            {/* ── Filtres ── */}
            <div className="flex flex-wrap items-center gap-2">
                <a href={urlAvec({ type: null })} className={chip(!filtreType)}>
                    Tous <span className="opacity-60">({total})</span>
                </a>
                {parType.map((t) => (
                    <a key={t.type} href={urlAvec({ type: t.type })} className={chip(filtreType === t.type)}>
                        {t.typeLibelle} <span className="opacity-60">({t.count})</span>
                    </a>
                ))}

                <div className="ml-auto">
                    <select
                        value={filtreEntreprise != null ? String(filtreEntreprise) : ""}
                        onChange={(e) => {
                            window.location.href = urlAvec({ entreprise: e.target.value ? Number(e.target.value) : null })
                        }}
                        className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm"
                    >
                        <option value="">Toutes les entreprises</option>
                        {parEntreprise.map((en) => (
                            <option key={en.id} value={en.id}>
                                {en.libelle} ({en.count})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ── Actions globales ── */}
            {items.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 px-4 py-3">
                    <span className="text-sm text-muted-foreground">
                        {items.length} élément(s) affiché(s){filtreType || filtreEntreprise != null ? " pour ce filtre" : ""}.
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                        <form method="POST" action={`${BASE}/restaurer-tout`} onSubmit={confirmer("Restaurer tous les éléments correspondant au filtre courant ?")}>
                            <ChampsCaches />
                            <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                                <RotateCcw className="size-4" /> Tout restaurer
                            </button>
                        </form>
                        <form method="POST" action={`${BASE}/vider`} onSubmit={confirmer("Supprimer DÉFINITIVEMENT tous les éléments correspondant au filtre courant ? Cette action est irréversible.")}>
                            <ChampsCaches />
                            <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                                <Trash2 className="size-4" /> Tout vider
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Tableau ── */}
            {items.length === 0 ? (
                <div className="card flex flex-col items-center gap-3 p-12 text-center">
                    <Inbox className="size-10 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">La corbeille est vide pour ce filtre.</p>
                </div>
            ) : (
                <div className="card overflow-hidden p-0">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b text-left text-muted-foreground">
                                <th className="px-4 py-3 font-medium">Type</th>
                                <th className="px-4 py-3 font-medium">Élément</th>
                                <th className="px-4 py-3 font-medium">Entreprise</th>
                                <th className="px-4 py-3 font-medium">Supprimé le</th>
                                <th className="px-4 py-3 font-medium">Par</th>
                                <th className="px-4 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <tr key={`${item.type}-${item.id}`} className="border-b last:border-0 hover:bg-muted/20">
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                            {item.typeLibelle}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="font-medium">{item.libelle}</span>
                                        <span className="ml-1 font-mono text-xs text-muted-foreground">#{item.id}</span>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">{item.entreprise ?? "—"}</td>
                                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{item.deletedAt ?? "—"}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{item.deletedBy ?? "—"}</td>
                                    <td className="px-4 py-3 text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Actions</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild>
                                                    <form
                                                        method="POST"
                                                        action={`${BASE}/${item.type}/${item.id}/restaurer`}
                                                        onSubmit={confirmer(`Restaurer « ${item.libelle} » ?`)}
                                                    >
                                                        <ChampsCaches />
                                                        <button type="submit" className="flex w-full items-center gap-2 text-left text-emerald-600 focus:text-emerald-700">
                                                            <RotateCcw className="h-4 w-4" /> Restaurer
                                                        </button>
                                                    </form>
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem asChild>
                                                    <form
                                                        method="POST"
                                                        action={`${BASE}/${item.type}/${item.id}/supprimer`}
                                                        onSubmit={confirmer(`Supprimer DÉFINITIVEMENT « ${item.libelle} » ? Cette action est irréversible.`)}
                                                    >
                                                        <ChampsCaches />
                                                        <button type="submit" className="flex w-full items-center gap-2 text-left text-red-600 focus:text-red-700">
                                                            <Trash2 className="h-4 w-4" /> Supprimer définitivement
                                                        </button>
                                                    </form>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
