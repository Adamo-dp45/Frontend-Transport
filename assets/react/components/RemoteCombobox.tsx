import * as React from "react"
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react"
import { cn } from "../../lib/utils"
import { Button } from "../../components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover"
import {
    Command,
    CommandEmpty,
    CommandInput,
    CommandItem,
    CommandList,
} from "../../components/ui/command"

export type RemoteOption = { value: string; label: string; raw?: Record<string, unknown> }

type Props = {
    /** Ressource du SearchController (ex. "pieces", "cars", "lignes", "fournisseurs", "personnels"…). */
    resource: string
    /** Id sélectionné (string) ou null. */
    value: string | null
    /** Appelé au choix : (id|null, option complète). */
    onChange: (value: string | null, option?: RemoteOption) => void
    /** Libellé pré-sélectionné (édition / filtre actif) — évite un aller-retour réseau pour l'afficher. */
    initialLabel?: string | null
    placeholder?: string
    searchPlaceholder?: string
    emptyText?: string
    disabled?: boolean
    /** Affiche une croix pour vider la sélection. */
    clearable?: boolean
    className?: string
    /** Nb minimal de caractères avant recherche (défaut 2) ; q vide = préchargement. */
    minChars?: number
    align?: "start" | "center" | "end"
    id?: string
}

/**
 * Combobox à recherche DISTANTE — équivalent React de `tom-select-remote.js`. Interroge le même
 * endpoint `/search?resource=&q=` (voir SearchController) : préchargement à l'ouverture, recherche
 * serveur débouncée, aucune liste complète chargée en mémoire. Pour un select simple (une valeur).
 */
export function RemoteCombobox({
    resource,
    value,
    onChange,
    initialLabel = null,
    placeholder = "Rechercher…",
    searchPlaceholder = "Tapez pour rechercher…",
    emptyText = "Aucun résultat",
    disabled = false,
    clearable = false,
    className,
    minChars = 2,
    align = "start",
    id,
}: Props) {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")
    const [options, setOptions] = React.useState<RemoteOption[]>([])
    const [loading, setLoading] = React.useState(false)
    // Libellé affiché sur le bouton : on retient le dernier connu (initial ou choisi).
    const [selectedLabel, setSelectedLabel] = React.useState<string | null>(initialLabel)

    const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
    const reqIdRef = React.useRef(0)

    React.useEffect(() => {
        if (initialLabel != null) setSelectedLabel(initialLabel)
    }, [initialLabel])

    // Si on a une valeur mais pas encore de libellé, on tente de le résoudre via un préchargement.
    React.useEffect(() => {
        if (!value) { setSelectedLabel(null); return }
        if (selectedLabel) return
        let cancelled = false
        fetchOptions("").then((opts) => {
            if (cancelled) return
            const found = opts.find((o) => o.value === value)
            if (found) setSelectedLabel(found.label)
        })
        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value])

    const fetchOptions = async (q: string): Promise<RemoteOption[]> => {
        const url = `/search?resource=${encodeURIComponent(resource)}&q=${encodeURIComponent(q)}&limit=20`
        try {
            const r = await fetch(url, { headers: { Accept: "application/json" } })
            const data = await r.json()
            return Array.isArray(data) ? (data as RemoteOption[]) : []
        } catch {
            return []
        }
    }

    const runSearch = (q: string) => {
        // q vide = préchargement autorisé ; entre 1 et minChars-1 → on n'appelle pas.
        if (q.length > 0 && q.length < minChars) { setOptions([]); setLoading(false); return }
        const rid = ++reqIdRef.current
        setLoading(true)
        fetchOptions(q).then((opts) => {
            if (rid !== reqIdRef.current) return // réponse périmée (course)
            setOptions(opts)
            setLoading(false)
        })
    }

    // Préchargement à l'ouverture.
    React.useEffect(() => {
        if (open) { setQuery(""); runSearch("") }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    const onInput = (q: string) => {
        setQuery(q)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => runSearch(q), 300)
    }

    const choose = (opt: RemoteOption) => {
        setSelectedLabel(opt.label)
        onChange(opt.value, opt)
        setOpen(false)
    }

    const clear = (e: React.MouseEvent) => {
        e.stopPropagation()
        setSelectedLabel(null)
        onChange(null)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            {/* Conteneur relatif : la croix « effacer » est un VRAI bouton posé PAR-DESSUS le trigger
                (et non un <svg> imbriqué dans le bouton, qui ne recevait pas le clic). */}
            <div className={cn("relative", className)}>
                <PopoverTrigger asChild>
                    <Button
                        id={id}
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        disabled={disabled}
                        className={cn(
                            "w-full justify-between font-normal",
                            clearable && value ? "pr-14" : "pr-9",
                            !selectedLabel && "text-muted-foreground"
                        )}
                    >
                        <span className="truncate">{selectedLabel ?? placeholder}</span>
                        <ChevronsUpDown className="absolute right-3 size-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                {clearable && value && !disabled && (
                    <button
                        type="button"
                        aria-label="Effacer la sélection"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={clear}
                        className="absolute right-8 top-1/2 z-10 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                        <X className="size-4" />
                    </button>
                )}
            </div>
            <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align={align}>
                {/* shouldFilter=false : c'est le serveur qui filtre */}
                <Command shouldFilter={false}>
                    <CommandInput value={query} onValueChange={onInput} placeholder={searchPlaceholder} />
                    <CommandList>
                        {loading ? (
                            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                                <Loader2 className="size-4 animate-spin" /> Recherche…
                            </div>
                        ) : (
                            <>
                                {options.length === 0 && (
                                    <CommandEmpty>
                                        {query.length > 0 && query.length < minChars
                                            ? `Tapez au moins ${minChars} caractères`
                                            : emptyText}
                                    </CommandEmpty>
                                )}
                                {options.map((opt) => (
                                    <CommandItem key={opt.value} value={opt.value} onSelect={() => choose(opt)}>
                                        <Check className={cn("size-4", value === opt.value ? "opacity-100" : "opacity-0")} />
                                        <span className="truncate">{opt.label}</span>
                                    </CommandItem>
                                ))}
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
