import { ColumnDef, RowSelectionState } from "@tanstack/react-table"
import { Loader2, MoreHorizontal, Printer } from "lucide-react"
import { Button } from "../../../components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"
import { useMemo, useState } from "react"
import { Badge } from "../../../components/ui/badge"
import { formatDate } from "../../../lib/functions"
import { Checkbox } from "../../../components/ui/checkbox"
import { ServerMeta, ServerTableFilter, useServerTable } from "../../hooks/useServerTable"
import { ServerDataTableColumnHeader } from "../../components/server/server-data-table-column-header"
import { ServerDataTable } from "../../components/server/server-data-table"
import { Ticket } from "../../models/ticket.model"
import { Voyage } from "../../models/voyage.model"
import { Gare } from "../../models/gare.model"

type Props = {
    tickets: Ticket[],
    meta: ServerMeta
    queryParams: Record<string, string>
    voyages: Voyage[]
    gares: Gare[]
    canEdit: boolean,
    canDelete: boolean,
    csrfDelete: string
    userGareId: number | null   // gare de l'agent (null = central/admin sans gare)
    isAdmin: boolean
    currentUserId: number | null // pour reconnaître les billets vendus à bord par CET utilisateur (commercial)
}

function buildColumns(
    getSortToggleUrl: (f: string) => string,
    getSortExplicitUrl: (f: string, dir: 'asc' | 'desc') => string,
    getSortState: (f: string) => 'asc' | 'desc' | false,
    canEdit: boolean,
    canDelete: boolean,
    csrfDelete: string,
    userGareId: number | null,
    isAdmin: boolean,
    currentUserId: number | null
): ColumnDef<Ticket>[] {

    const sortUrls = (field: string) => ({
        toggle: getSortToggleUrl(field),
        asc:    getSortExplicitUrl(field, 'asc'),
        desc:   getSortExplicitUrl(field, 'desc'),
    })

    return [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={ table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate") }
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Tout sélectionner"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Sélectionner la ligne"
                    onClick={(e) => e.stopPropagation()}
                />
            ),
            enableSorting: false,
            enableHiding: false
        },
        {
            accessorKey: "id",
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Id" sortUrls={sortUrls('id')} sortState={getSortState('id')} />
            ),
        },
        {
            accessorKey: "codeticket",
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Code du ticket" sortUrls={sortUrls('codeticket')} sortState={getSortState('codeticket')} />
            )
        },
        {
            accessorKey: "siege",
            header: "N° de place",
            cell: ({ row }) => (
                <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-sm tabular-nums">
                    {row.original.siege.numero}
                </span>
            ),
        },
        {
            accessorKey: "nomclient",
            header: "Nom du client"
        },
        {
            accessorKey: "contactclient",
            header: "Contact du client"
        },
        {
            id: "trajet",
            header: "trajet",
            //  accessorFn: (row) => `${row.gare.libelle} → ${row.garedescente.libelle}`,
            cell: ({ row }) => (
                <span className="text-sm">
                    <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {row.original.gare.libelle}
                    </Badge>
                    <span className="mx-1.5 text-muted-foreground">→</span>
                    <Badge className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                        {row.original.garedescente.libelle}
                    </Badge>
                </span>
            )
        },
        {
            id: "gareemettrice",
            header: "Gare émettrice",
            // gare de montée = gare qui a émis/vendu le billet (forcée à la gare de l'agent)
            accessorFn: (row) => row.gare?.libelle ?? "",
            cell: ({ row }) => (
                <span className="inline-flex items-center gap-1 text-sm">
                    <svg className="h-3.5 w-3.5 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-3"/></svg>
                    {row.original.gare?.libelle ?? "—"}
                </span>
            )
        },
        {
            id: "voyage",
            header: "Voyage",
            accessorFn: (row) => row.voyage?.codevoyage ?? "",
            cell: ({ row }) =>
                row.original.voyage
                ? <Badge variant="secondary">{row.original.voyage.codevoyage}</Badge>
                : <span className="text-muted-foreground">Aucun</span>
                /*
                    const dt = row.original.voyage.datedepartprevue
                        ? new Date(row.original.voyage.datedepartprevue).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
                        : null
                    return (
                        <div>
                            <p className="font-medium text-sm">{row.original.voyage.provenance} → {row.original.voyage.destination}</p>
                            {dt && <p className="text-xs text-muted-foreground">{dt}</p>}
                        </div>
                    )
                */
        },
        {
            id: "statut",
            header: "Statut",
            accessorFn: (row) => row.statut,
            cell: ({ row }) => {
                const s = row.original.statut
                const styles: Record<string, string> = {
                    VALIDE:  "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
                    REPORTE: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
                    ANNULE:  "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
                }
                const labels: Record<string, string> = { VALIDE: "Valide", REPORTE: "Reporté", ANNULE: "Annulé" }
                return (
                    <div className="flex flex-col gap-0.5 items-start">
                        <Badge className={styles[s] ?? ""}>{labels[s] ?? s}</Badge>
                        {/*
                            ÉVINCÉ : le billet est VALIDE mais son siège a été repris à la gare amont
                            (surbooking assumé). Le passager ne montera pas → la gare émettrice doit le
                            reloger. Signalé même sur un billet valide, c'est justement le cas piège.
                        */}
                        {row.original.evince && s === "VALIDE" && (
                            <Badge
                                className="bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                title="Siège repris par la gare amont (priorité amont). Ce passager ne montera pas : à reloger sur un autre départ."
                            >
                                ⚠ Évincé
                            </Badge>
                        )}
                        {row.original.fideliteRecompense && (
                            <Badge className="bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">🎁 Fidélité</Badge>
                        )}
                        {row.original.ticketOrigine && (
                            <a href={`/ticket/${row.original.ticketOrigine.id}`} className="text-[11px] text-muted-foreground hover:underline">
                                ← {row.original.ticketOrigine.codeticket}
                            </a>
                        )}
                    </div>
                )
            },
        },
        {
            accessorKey: "prix",
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Prix" sortUrls={sortUrls('prix')} sortState={getSortState('prix')} />
            ),
            cell: ({ row }) => {
                const t = row.original
                const remise = t.remise ?? 0
                if (remise > 0) {
                    const tarif = t.prix + remise
                    return (
                        <div className="leading-tight">
                            <span className="tabular-nums font-semibold">{t.prix.toLocaleString("fr-FR")} FCFA</span>
                            <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0.5 text-[10px] font-medium align-middle">
                                remise −{remise.toLocaleString("fr-FR")}
                            </span>
                            <span className="block text-xs text-muted-foreground line-through tabular-nums">{tarif.toLocaleString("fr-FR")} FCFA</span>
                        </div>
                    )
                }
                return <span className="tabular-nums font-semibold">{t.prix.toLocaleString("fr-FR")} FCFA</span>
            }
        },
        {
            accessorKey: "createdAt",
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Date de création" sortUrls={sortUrls('createdAt')} sortState={getSortState('createdAt')} />
            ),
            cell: ({ row }) => (
                <span>
                    {formatDate(row.original.createdAt)}
                </span>
            )
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const ticket = row.original
                // peutGare : actions de GARE (désister/rembourser, supprimer du livre) réservées à la gare
                // émettrice. Admin / central (sans gare) : non restreints.
                const peutGare = isAdmin || userGareId == null || ticket.gare?.id === userGareId
                // Le vendeur à bord : la gare de montée du billet n'est pas sa gare d'attache.
                const estCommercial = ticket.commercial != null && ticket.commercial.id === currentUserId
                // peutAgir : actions du VENDEUR (imprimer, corriger l'identité), ouvertes AUSSI au commercial.
                const peutAgir = peutGare || estCommercial
                return (
                    <div className="flex gap-2 items-center">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <a href={`/ticket/${ticket.id}`}>Voir</a>
                                </DropdownMenuItem>

                                {canEdit && peutAgir && <DropdownMenuSeparator />}

                                {canEdit && peutAgir && !ticket.voyage?.datearriveereelle && (
                                    <DropdownMenuItem asChild>
                                        <a href={`/ticket/${ticket.id}/modifier`}>Modifier</a>
                                    </DropdownMenuItem>
                                )}

                                {/* Désister (remboursement) : action de GARE, pas ouverte au commercial */}
                                {canEdit && peutGare && ticket.statut === "VALIDE" && !ticket.voyage?.datearriveereelle && (
                                    <DropdownMenuItem asChild>
                                        <a href={`/ticket/${ticket.id}/desister`} className="text-orange-600 focus:text-orange-700">Désister</a>
                                    </DropdownMenuItem>
                                )}

                                {canDelete && peutGare && <DropdownMenuSeparator />}

                                {/* Supprimer (retrait du livre) : action de GARE, pas ouverte au commercial */}
                                {canDelete && peutGare && (
                                    <DropdownMenuItem asChild>
                                        <form
                                            method="POST"
                                            action={`/ticket/${ticket.id}/supprimer`}
                                            onSubmit={(e) => {
                                                if(!confirm("Supprimer ce ticket ?")) {
                                                    e.preventDefault()
                                                }
                                            }}
                                        >
                                            <input type="hidden" name="_token" value={csrfDelete} />
                                            <button
                                                type="submit"
                                                className="w-full text-left text-red-600 focus:text-red-700"
                                            >
                                                Supprimer
                                            </button>
                                        </form>
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {/* Impression : réservée à la gare créatrice (émettrice). Cf. spec gardes de gare. */}
                        {peutAgir && (
                            <a href={`/ticket/${ticket.id}/pdf`} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                                <Printer className="h-3.5 w-3.5" />
                            </a>
                        )}
                    </div>
                )
            },
        },
    ]
}

export default function TicketTable({tickets, meta, queryParams, voyages, gares, canEdit, canDelete, csrfDelete, userGareId, isAdmin, currentUserId}: Props) {

    const { getSortState, getSortToggleUrl, getSortExplicitUrl } = useServerTable(queryParams)
    const columns = useMemo(
        () => buildColumns(getSortToggleUrl, getSortExplicitUrl, getSortState, canEdit, canDelete, csrfDelete, userGareId, isAdmin, currentUserId),
        [queryParams, canEdit, canDelete, csrfDelete, userGareId, isAdmin, currentUserId]
    )
    const filters: ServerTableFilter[] = useMemo(() => {
        const list: ServerTableFilter[] = [
            {
                type: 'text',
                name: 'search',
                label: 'Code du ticket',
                placeholder: 'TKT-..'
            },
            {
                type: 'select',
                name: 'voyage',
                label: 'Voyage',
                options: voyages.map(v => ({ value: String(v.id), label: `${v.codevoyage} : ${v.provenance} → ${v.destination}` }))
            },
            {
                type: 'select',
                name: 'statut',
                label: 'Statut',
                options: [
                    { value: 'VALIDE', label: 'Valide' },
                    { value: 'REPORTE', label: 'Reporté' },
                    { value: 'ANNULE', label: 'Annulé' },
                ]
            }
        ]
        // Filtre par gare émettrice : réservé à l'admin entreprise / un utilisateur central sans gare.
        // Un agent rattaché à une gare ne voit déjà que les billets de sa gare (scope backend) → inutile.
        if (isAdmin || userGareId == null) {
            list.push({
                type: 'select',
                name: 'gare',
                label: 'Gare émettrice',
                options: gares.map(g => ({ value: String(g.id), label: g.libelle }))
            })
        }
        return list
    }, [voyages, gares, isAdmin, userGareId])
    /*
        const columns = useMemo(
            () => buildColumns(canEdit, canDelete),
            [canEdit, canDelete]
        )

        const voyageOptions = [...new Map(
            tickets
                .filter(c => c.voyage)
                .map(c => [c.voyage!.id, c.voyage!])
            ).values()].map(m => ({
            label: m.codevoyage,
            value: m.codevoyage
        }))
    */
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
    const [printing, setPrinting] = useState(false)
    const [printError, setPrintError] = useState<string | null>(null)

    const selectedIds = Object.keys(rowSelection) /*
        - Les 'ids' des tickets sélectionnés
    */
        .filter((key) => rowSelection[key])
        .map((key) => tickets[parseInt(key)]?.id)
        .filter(Boolean) as number[]

    const selectedCount = selectedIds.length

    const handleBatchPrint = async () => { /*
            - L'impression par lot
        */
        if(selectedCount === 0) return
        setPrinting(true)
        setPrintError(null)

        try {
            const res = await fetch("/ticket/batch/print", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: selectedIds }),
            })

            if(!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.detail ?? "Erreur lors de la génération du PDF")
            }

            const blob = await res.blob() /*
                - On ouvre le pdf dans un nouvel onglet
            */
            const url = URL.createObjectURL(blob)
            window.open(url, "_blank")
            setTimeout(() => URL.revokeObjectURL(url), 10_000) /*
                - On libère l'url après ouverture et on réinitialise la sélection après impression
            */
            setRowSelection({})
        } catch (err) {
            setPrintError(err instanceof Error ? err.message : "Erreur inconnue")
        } finally {
            setPrinting(false)
        }
    }

    const handleSelectAll = () => { /*
            - Le 'tout selectionner' et 'tout deselectionner'
        */
        if(selectedCount === tickets.length) {
            setRowSelection({})
        } else {
            const all: RowSelectionState = {}
            tickets.forEach((_, i) => { all[String(i)] = true })
            setRowSelection(all)
        }
    }

    return <>
        <div className="space-y-2">
            {selectedCount > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-blue-700">
                            {selectedCount} ticket{selectedCount > 1 ? "s" : ""} sélectionné{selectedCount > 1 ? "s" : ""}
                        </span>
                        <button
                            type="button"
                            onClick={() => setRowSelection({})}
                            className="text-xs text-blue-500 hover:text-blue-700 underline underline-offset-2"
                        >
                            Désélectionner tout
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            onClick={handleBatchPrint}
                            disabled={printing}
                            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                        >
                            {printing ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Génération…
                                </>
                            ) : (
                                <>
                                    <Printer className="h-3.5 w-3.5" />
                                    Imprimer {selectedCount > 1 ? `les ${selectedCount} tickets` : "le ticket"}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {printError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                    {printError}
                </div>
            )}

            <div className="flex items-center justify-end">
                <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                    {selectedCount === tickets.length && tickets.length > 0
                        ? "Désélectionner tout"
                        : "Sélectionner tout"}
                </button>
            </div>

            <ServerDataTable
                columns={columns}
                data={tickets}
                meta={meta}
                queryParams={queryParams}
                filters={filters}

                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
            />
        </div>
    </>
}