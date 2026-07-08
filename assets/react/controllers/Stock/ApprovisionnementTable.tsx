import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
import { Button } from "../../../components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"
import { useMemo } from "react"
import { formatDate } from "../../../lib/functions"
import { Badge } from "../../../components/ui/badge"
import { ServerMeta, ServerTableFilter, useServerTable } from "../../hooks/useServerTable"
import { ServerDataTableColumnHeader } from "../../components/server/server-data-table-column-header"
import { ServerDataTable } from "../../components/server/server-data-table"
import { Approvisionnement } from "../../models/approvisionnement.model"

type Props = {
    approvisionnements: Approvisionnement[],
    meta: ServerMeta
    queryParams: Record<string, string>
    canEdit: boolean,
    canDelete: boolean,
    csrfDelete: string
    csrfAnnuler: string
}

function buildColumns(
    getSortToggleUrl: (f: string) => string,
    getSortExplicitUrl: (f: string, dir: 'asc' | 'desc') => string,
    getSortState: (f: string) => 'asc' | 'desc' | false,
    canEdit: boolean,
    canDelete: boolean,
    csrfDelete: string,
    csrfAnnuler: string
): ColumnDef<Approvisionnement>[]{

    const sortUrls = (field: string) => ({
        toggle: getSortToggleUrl(field),
        asc: getSortExplicitUrl(field, 'asc'),
        desc: getSortExplicitUrl(field, 'desc')
    })

    return [
        {
            accessorKey: "id",
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Id" sortUrls={sortUrls('id')} sortState={getSortState('id')} />
            )
        },
        {
            accessorKey: "dateappro",
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Date d'approvisionnement" sortUrls={sortUrls('dateappro')} sortState={getSortState('dateappro')} />
            ),
            cell: ({ row }) => (
                <span className="font-medium tabular-nums">
                    {formatDate(row.original.dateappro)}
                </span>
            )
        },
        {
            id: "fournisseur",
            header: "Fournisseur",
            accessorFn: (row) => row.fournisseur?.libelle ?? "",
            cell: ({ row }) =>
                row.original.fournisseur
                ? <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">{row.original.fournisseur.libelle}</Badge>
                : <span className="text-muted-foreground">Aucun</span>
        },
        {
            id: "nbpieces",
            header: "Nbre de pièces",
            cell: ({ row }) => {
                const total = row.original.detailapprovisionnements.reduce((sum, d) => sum + d.quantite, 0)
                return <span className="tabular-nums font-medium">{total}</span>
            },
        },
        {
            id: "couttotal",
            header: "Coût total",
            cell: ({ row }) => {
                const total = row.original.detailapprovisionnements.reduce((sum, d) => sum + (d.quantite * d.prixunitaire), 0)
                return <span className="tabular-nums font-semibold">{total.toLocaleString("fr-FR")} FCFA</span>
            },
        },
        {
            id: 'statut',
            header: '',
            cell: ({ row }) => row.original.statut === 'ANNULE'
                ? <Badge className="bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">Annulé</Badge>
                : null
        },
        {
            accessorKey: "createdAt",
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Date de création" sortUrls={sortUrls('createdAt')} sortState={getSortState('createdAt')} />
            ),
            cell: ({ row }) => (
                <span className="font-medium tabular-nums">
                    {formatDate(row.original.createdAt)}
                </span>
            )
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const approvisionnement = row.original
                const annule = approvisionnement.statut === 'ANNULE'
                const editable = canEdit && !annule
                const annulable = canEdit && !annule
                const deletable = canDelete

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                                <a href={`/approvisionnement/${approvisionnement.id}`}>Voir</a>
                            </DropdownMenuItem>

                            {editable && <DropdownMenuSeparator />}
                            {editable && (
                                <DropdownMenuItem asChild>
                                    <a href={`/approvisionnement/${approvisionnement.id}/modifier`}>Modifier</a>
                                </DropdownMenuItem>
                            )}

                            {annulable && <DropdownMenuSeparator />}
                            {annulable && (
                                <DropdownMenuItem asChild>
                                    <form
                                        method="POST"
                                        action={`/approvisionnement/${approvisionnement.id}/annuler`}
                                        onSubmit={(e) => {
                                            if(!confirm("Annuler cet approvisionnement ? Les pièces entrées seront retirées du stock.")) {
                                                e.preventDefault()
                                            }
                                        }}
                                    >
                                        <input type="hidden" name="_token" value={csrfAnnuler} />
                                        <button
                                            type="submit"
                                            className="w-full text-left text-orange-600 focus:text-orange-700"
                                        >
                                            Annuler
                                        </button>
                                    </form>
                                </DropdownMenuItem>
                            )}

                            {deletable && <DropdownMenuSeparator />}
                            {deletable && (
                                <DropdownMenuItem asChild>
                                    <form
                                        method="POST"
                                        action={`/approvisionnement/${approvisionnement.id}/supprimer`}
                                        onSubmit={(e) => {
                                            if(!confirm("Supprimer cet approvisionnement ?")) {
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
                )
            },
        }
    ]
}

export default function ApprovisionnementTable({
    approvisionnements,
    meta,
    queryParams,
    canEdit,
    canDelete,
    csrfDelete,
    csrfAnnuler
}: Props) {

    const { getSortState, getSortToggleUrl, getSortExplicitUrl } = useServerTable(queryParams)
    const columns = useMemo(
        () => buildColumns(getSortToggleUrl, getSortExplicitUrl, getSortState, canEdit, canDelete, csrfDelete, csrfAnnuler),
        [queryParams, canEdit, canDelete, csrfDelete, csrfAnnuler]
    )
    const filters: ServerTableFilter[] = useMemo(() => [
        {
            type: 'remote',
            name: 'fournisseur',
            label: 'Fournisseur',
            placeholder: 'Rechercher un fournisseur…',
            resource: 'fournisseurs',
        },
        {
            type: 'date_range',
            name: 'date',
            label: 'Période',
        },
    ], [])

    return (
        <ServerDataTable
            columns={columns}
            data={approvisionnements}
            meta={meta}
            queryParams={queryParams}
            filters={filters}
        />
    )
}