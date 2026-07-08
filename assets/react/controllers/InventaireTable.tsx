import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
import { Button } from "../../components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu"
import { formatDate } from "../../lib/functions"
import { Badge } from "../../components/ui/badge"
import { ServerMeta, ServerTableFilter, useServerTable } from "../hooks/useServerTable"
import { ServerDataTableColumnHeader } from "../components/server/server-data-table-column-header"
import { useMemo } from "react"
import { ServerDataTable } from "../components/server/server-data-table"
import { Inventaire } from "../models/inventaire.model"

type Props = {
    inventaires: Inventaire[]
    meta: ServerMeta
    queryParams: Record<string, string>
    typesmouvement: string[]
    typesreference: string[]
}

function BadgeType({ type }: { type: string }) {
    const cfg: Record<string, string> = {
        ENTREE: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
        SORTIE: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
    }

    return (
        <Badge className={`${cfg[type] ?? "bg-gray-100 text-gray-600"}`}>
            {type === "ENTREE" ? "↑ Entrée" : "↓ Sortie"}
        </Badge>
    )
}

function BadgeRef({ refe }: { refe: string }) {
    const cfg: Record<string, string> = {
        APPROVISIONNEMENT: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
        DEPANNAGE: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
        AJUSTEMENT: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
    }
    const labels: Record<string, string> = {
        APPROVISIONNEMENT: "Approvisionnement",
        DEPANNAGE: "Dépannage",
        AJUSTEMENT: "Ajustement"
    }

    return (
        <Badge className={`${cfg[refe] ?? "bg-gray-100 text-gray-600"}`}>
            {labels[refe] ?? refe}
        </Badge>
    )
}

function buildColumns(
    getSortToggleUrl: (f: string) => string,
    getSortExplicitUrl: (f: string, dir: 'asc' | 'desc') => string,
    getSortState: (f: string) => 'asc' | 'desc' | false,
): ColumnDef<Inventaire>[] {

    const sortUrls = (field: string) => ({
        toggle: getSortToggleUrl(field),
        asc: getSortExplicitUrl(field, 'asc'),
        desc: getSortExplicitUrl(field, 'desc')
    })

    return [
        {
            accessorKey: 'id',
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Id" sortUrls={sortUrls('id')} sortState={getSortState('id')} />
            )
        },
        {
            accessorKey: 'datemouvement',
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Date de mouvement" sortUrls={sortUrls('datemouvement')} sortState={getSortState('datemouvement')} />
            ),
            cell: ({ row }) => (
                <span className="tabular-nums">
                    {formatDate(row.original.datemouvement)}
                </span>
            )
        },
        {
            accessorKey: 'typemouvement',
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Type de mouvement" sortUrls={sortUrls('typemouvement')} sortState={getSortState('typemouvement')} />
            ),
            cell: ({ row }) => <BadgeType type={row.original.typemouvement} />
        },
        /*
            {
                id: "piece",
                header: "Pièce",
                accessorFn: (row) => row.piece?.libelle ?? "",
                cell: ({ row }) =>
                    row.original.piece
                    ? <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">{row.original.piece.libelle}</Badge>
                    : <span className="text-muted-foreground">Aucun</span>
            },
        */
        {
            id: "pieceName",
            header: "Pièce",
            cell: ({ row }) => <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">{row.original.pieceName}</Badge>
        },
        {
            accessorKey: "quantite",
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Quantité" sortUrls={sortUrls('quantite')} sortState={getSortState('quantite')} />
            ),
            cell: ({ row }) => {
                const q = row.original.quantite
                const type = row.original.typemouvement
                return (
                    <span className={`tabular-nums font-bold ${type === "ENTREE" ? "text-green-600" : "text-red-600"}`}>
                        {type === "ENTREE" ? "+" : "-"}{q}
                    </span>
                )
            }
        },
        {
            id: 'referencetype',
            header: 'Origine',
            cell: ({ row }) => <BadgeRef refe={row.original.referencetype} />,
        },
        {
            accessorKey: "createdAt",
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Date de création"
                    sortUrls={sortUrls('createdAt')} sortState={getSortState('createdAt')} />
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
                const inventaire = row.original
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
                                    <a href={`/inventaire/${inventaire.id}`}>Voir</a>
                                </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            }
        }
    ]
}

export default function InventaireTable({inventaires, meta, queryParams, typesmouvement, typesreference}: Props) {
    /*
        const pieceOptions = [...new Map(
            inventaires
                .filter(p => p.piece)
                .map(p => [p.piece!.id, p.piece!])
            ).values()].map(m => ({
            label: m.libelle,
            value: m.libelle
        }))
        return <>
            <div className="space-y-2">
                <DataTable
                    columns={columns}
                    data={inventaires}
                    selectFilters={[
                        { column: "piece", title: "Pièce", options: pieceOptions },
                        {
                            column: "typemouvement",
                            title: "Type de mouvement",
                            options: [
                                { label: "↑ Entrée", value: "ENTREE" },
                                { label: "↓ Sortie", value: "SORTIE" },
                            ]
                        },
                        {
                            column: "reference_type",
                            title: "Origine",
                            options: [
                                { label: "Approvisionnement", value: "APPROVISIONNEMENT" },
                                { label: "Dépannage", value: "DEPANNAGE" },
                                { label: "Ajustement", value: "AJUSTEMENT" },
                            ]
                        }
                    ]}
                />
            </div>
        </>
    */
    const { getSortState, getSortToggleUrl, getSortExplicitUrl } = useServerTable(queryParams)
    const columns = useMemo(
        () => buildColumns(getSortToggleUrl, getSortExplicitUrl, getSortState),
        [queryParams]
    )
    const mouvementLabels: Record<string, string> = {
        ENTREE: '↑ Entrée',
        SORTIE: '↓ Sortie'
    }
    const referenceLabels: Record<string, string> = {
        APPROVISIONNEMENT: 'Approvisionnement',
        DEPANNAGE: 'Dépannage',
        AJUSTEMENT: 'Ajustement',
    }
    const filters: ServerTableFilter[] = useMemo(() => [
        {
            type: 'remote',
            name: 'piece',
            label: 'Pièce',
            placeholder: 'Rechercher une pièce…',
            resource: 'pieces',
        },
        {
            type: 'select',
            name: 'typemouvement',
            label: 'Type de mouvement',
            options: typesmouvement.map((t) => ({
                value: t,
                label: mouvementLabels[t] ?? t,
            })),
        },
        {
            type: 'select',
            name: 'reference_type',
            label: 'Origine',
            options: typesreference.map((t) => ({
                value: t,
                label: referenceLabels[t] ?? t,
            })),
        },
        {
            type: 'date_range',
            name: 'date',
            label: 'Période',
        },
    ], [typesmouvement, typesreference])

    return (
        <ServerDataTable
            columns={columns}
            data={inventaires}
            meta={meta}
            queryParams={queryParams}
            filters={filters}
        />
    )
}