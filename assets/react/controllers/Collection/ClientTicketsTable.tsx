import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
import { Button } from "../../../components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"
import { Badge } from "../../../components/ui/badge"
import { useMemo } from "react"
import { formatDate } from "../../../lib/functions"
import { ServerMeta, useServerTable } from "../../hooks/useServerTable"
import { ServerDataTableColumnHeader } from "../../components/server/server-data-table-column-header"
import { ServerDataTable } from "../../components/server/server-data-table"
import { Ticket } from "../../models/ticket.model"

type Props = {
    tickets: Ticket[],
    meta: ServerMeta
    queryParams: Record<string, string>
}

const STATUT_LABELS: Record<string, string> = { VALIDE: "Valide", REPORTE: "Reporté", ANNULE: "Annulé" }
const STATUT_STYLES: Record<string, string> = {
    VALIDE: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    REPORTE: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    ANNULE: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
}

function buildColumns(
    getSortToggleUrl: (f: string) => string,
    getSortExplicitUrl: (f: string, dir: 'asc' | 'desc') => string,
    getSortState: (f: string) => 'asc' | 'desc' | false
): ColumnDef<Ticket>[]{

    const sortUrls = (field: string) => ({
        toggle: getSortToggleUrl(field),
        asc: getSortExplicitUrl(field, 'asc'),
        desc: getSortExplicitUrl(field, 'desc')
    })

    return [
        {
            accessorKey: "codeticket",
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Code" sortUrls={sortUrls('codeticket')} sortState={getSortState('codeticket')} />
            ),
            cell: ({ row }) => (
                <span className="font-medium">{row.original.codeticket}</span>
            )
        },
        {
            id: "trajet",
            header: "Trajet",
            cell: ({ row }) => (
                <span className="text-sm">
                    {row.original.gare?.libelle ?? '—'} → {row.original.garedescente?.libelle ?? '—'}
                </span>
            )
        },
        {
            id: "voyage",
            header: "Voyage",
            cell: ({ row }) => (
                <span className="tabular-nums text-sm">{row.original.voyage?.codevoyage ?? '—'}</span>
            )
        },
        {
            accessorKey: "prix",
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Prix" sortUrls={sortUrls('prix')} sortState={getSortState('prix')} />
            ),
            cell: ({ row }) => (
                <span className="tabular-nums font-semibold">{row.original.prix.toLocaleString("fr-FR")} FCFA</span>
            )
        },
        {
            accessorKey: "statut",
            header: "Statut",
            cell: ({ row }) => {
                const s = row.original.statut
                return <Badge className={STATUT_STYLES[s] ?? ""}>{STATUT_LABELS[s] ?? s}</Badge>
            }
        },
        {
            accessorKey: "createdAt",
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Date" sortUrls={sortUrls('createdAt')} sortState={getSortState('createdAt')} />
            ),
            cell: ({ row }) => (
                <span className="font-medium tabular-nums">{formatDate(row.original.createdAt)}</span>
            )
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const ticket = row.original
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Ouvrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                                <a href={`/ticket/${ticket.id}`}>Voir</a>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        }
    ]
}

export default function ClientTicketsTable({ tickets, meta, queryParams }: Props) {
    const { getSortState, getSortToggleUrl, getSortExplicitUrl } = useServerTable(queryParams)
    const columns = useMemo(
        () => buildColumns(getSortToggleUrl, getSortExplicitUrl, getSortState),
        [queryParams]
    )

    return (
        <ServerDataTable
            columns={columns}
            data={tickets}
            meta={meta}
            queryParams={queryParams}
        />
    )
}
