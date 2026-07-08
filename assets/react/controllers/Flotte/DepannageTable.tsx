import { ColumnDef } from "@tanstack/react-table"
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
import { Badge } from "../../../components/ui/badge"
import { formatDate } from "../../../lib/functions"
import { MoreHorizontal } from "lucide-react"
import { ServerMeta, ServerTableFilter, useServerTable } from "../../hooks/useServerTable"
import { ServerDataTableColumnHeader } from "../../components/server/server-data-table-column-header"
import { ServerDataTable } from "../../components/server/server-data-table"
import { Depannage } from "../../models/depannage.model"

type Props = {
    depannages: Depannage[]
    meta: ServerMeta
    queryParams: Record<string, string>
    canEdit: boolean
    canDelete: boolean
    csrfDelete: string
    csrfAnnuler: string
}

const statut = (statut: string) => {
    const cfg: Record<string, string> = {
        'EN COURS': 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
        CLOTURE: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
        ANNULE: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    }
    const labels: Record<string, string> = {
        'EN COURS': 'En cours',
        CLOTURE: 'Clôturé',
        ANNULE: 'Annulé',
    }

    return (
        <Badge className={`${cfg[statut] ?? "bg-gray-100 text-gray-600"}`}>
            {labels[statut] ?? statut}
        </Badge>
    )
}

function buildColumns(
    getSortToggleUrl: (f: string) => string,
    getSortExplicitUrl: (f: string, dir: 'asc' | 'desc') => string,
    getSortState: (f: string) => 'asc' | 'desc' | false,
    canEdit: boolean,
    canDelete: boolean,
    csrfDelete: string,
    csrfAnnuler: string
): ColumnDef<Depannage>[] {

    const sortUrls = (field: string) => ({
        toggle: getSortToggleUrl(field),
        asc: getSortExplicitUrl(field, 'asc'),
        desc: getSortExplicitUrl(field, 'desc'),
    })

    return [
        {
            accessorKey: 'id',
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Id" sortUrls={sortUrls('id')} sortState={getSortState('id')} />
            ),
        },
        {
            accessorKey: 'datedepannage',
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Date" sortUrls={sortUrls('datedepannage')} sortState={getSortState('datedepannage')} />
            ),
            cell: ({ row }) => (
                <span className="tabular-nums font-semibold">
                    {formatDate(row.original.datedepannage)}
                </span>
            ),
        },
        {
            accessorKey: 'lieudepannage',
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Lieu" sortUrls={sortUrls('lieudepannage')} sortState={getSortState('lieudepannage')} />
            ),
        },
        {
            accessorFn: (row) => row.typepanne?.libelle ?? "", // Pas null normalement
            id: "typepanne",
            header: "Type de panne",
            cell: ({ row }) =>
                row.original.typepanne
                ? <Badge className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">{row.original.typepanne.libelle}</Badge>
                : <span className="text-muted-foreground">Aucun</span>
        },
        {
            accessorFn: (row) => row.car?.matricule ?? "",
            id: "car",
            header: "Car",
            cell: ({ row }) =>
                row.original.car
                ? <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">{row.original.car.matricule}</Badge>
                : <span className="text-muted-foreground">Aucun</span>
        },
        {
            accessorKey: "couttotal",
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Coût total" sortUrls={sortUrls('couttotal')} sortState={getSortState('couttotal')} />
            ),
            cell: ({ row }) => (
                <span className="tabular-nums font-semibold">
                    {(row.original.couttotal ?? 0).toLocaleString("fr-FR")} FCFA {/* N'est pas null normalement */}
                </span>
            )
        },
        {
            id: "nbpieces",
            header: "Nombre de pièces",
            cell: ({ row }) => {
                const total = row.original.detaildepannages.reduce((sum, d) => sum + d.quantite, 0)
                return <span className="tabular-nums font-medium">{total}</span>
            }
        },
        {
            id: "nbpersonnels",
            header: "Nombre de personnels",
            cell: ({ row }) => {
                return <span className="tabular-nums font-medium">{row.original.detailpersonnels.length}</span>
            }
        },
        {
            id: "statut",
            header: "Statut",
            cell: ({ row }) => {
                return statut(row.original.statut)
            }
        },
        {
            accessorKey: 'createdAt',
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Date de création" sortUrls={sortUrls('createdAt')} sortState={getSortState('createdAt')} />
            ),
            cell: ({ row }) => (
                <span>
                    {formatDate(row.original.createdAt)}
                </span>
            ),
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const depannage = row.original
                const enCours = depannage.statut == 'EN COURS'
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
                                <a href={`/depannage/${depannage.id}`}>Voir</a>
                            </DropdownMenuItem>

                            {enCours && canEdit && <>
                                {canEdit && <DropdownMenuSeparator />}
                                <DropdownMenuItem asChild>
                                    <a href={`/depannage/${depannage.id}/affecter/personnel`}>Affecté du personnel</a>
                                </DropdownMenuItem>
                                {canEdit && <DropdownMenuSeparator />}
                                {canEdit && (
                                    <DropdownMenuItem asChild>
                                        <a href={`/depannage/${depannage.id}/modifier`}>Modifier</a>
                                    </DropdownMenuItem>
                                )}
                                {canEdit && <DropdownMenuSeparator />}
                                {canEdit && (
                                    <DropdownMenuItem asChild>
                                        <form
                                            method="POST"
                                            action={`/depannage/${depannage.id}/cloturer`}
                                            onSubmit={(e) => {
                                                if(!confirm("Clôturer ce dépannage ?")) {
                                                    e.preventDefault()
                                                }
                                            }}
                                        >
                                            <button
                                                type="submit"
                                                className="w-full text-left text-orange-600 focus:text-orange-700"
                                            >
                                                Clôturer le dépannage
                                            </button>
                                        </form>
                                    </DropdownMenuItem>
                                )}
                                {canEdit && <DropdownMenuSeparator />}
                                {canEdit && (
                                    <DropdownMenuItem asChild>
                                        <form
                                            method="POST"
                                            action={`/depannage/${depannage.id}/annuler`}
                                            onSubmit={(e) => {
                                                if(!confirm("Annuler ce dépannage ? Le stock des pièces sera restauré.")) {
                                                    e.preventDefault()
                                                }
                                            }}
                                        >
                                            <input type="hidden" name="_token" value={csrfAnnuler} />
                                            <button
                                                type="submit"
                                                className="w-full text-left text-orange-600 focus:text-orange-700"
                                            >
                                                Annuler le dépannage
                                            </button>
                                        </form>
                                    </DropdownMenuItem>
                                )}
                            </>}

                            {canDelete && <DropdownMenuSeparator />}
                            {canDelete && (
                                <DropdownMenuItem asChild>
                                    <form
                                        method="POST"
                                        action={`/depannage/${depannage.id}/supprimer`}
                                        onSubmit={(e) => {
                                            if(!confirm("Supprimer ce dépannage ?")) {
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
            }
        }
    ]
}

export default function DepannageTable({
    depannages,
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
            type: 'text',
            name: 'search',
            label: 'Lieu',
            placeholder: 'Lieu de dépannage…',
        },
        {
            type: 'remote',
            name: 'car',
            label: 'Véhicule',
            placeholder: 'Rechercher un véhicule…',
            resource: 'cars',
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
            data={depannages}
            meta={meta}
            queryParams={queryParams}
            filters={filters}
        />
    )
}