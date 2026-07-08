import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
import { Button } from "../../../components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"
import { useMemo } from "react"
import { formatDate } from "../../../lib/functions"
import { ServerMeta, useServerTable } from "../../hooks/useServerTable"
import { ServerDataTableColumnHeader } from "../../components/server/server-data-table-column-header"
import { ServerDataTable } from "../../components/server/server-data-table"
import { Approvisionnement } from "../../models/approvisionnement.model"

type Props = {
    approvisionnements: Approvisionnement[],
    meta: ServerMeta
    queryParams: Record<string, string>
    canEdit: boolean,
    canDelete: boolean
}

function buildColumns(
    getSortToggleUrl: (f: string) => string,
    getSortExplicitUrl: (f: string, dir: 'asc' | 'desc') => string,
    getSortState: (f: string) => 'asc' | 'desc' | false
): ColumnDef<Approvisionnement>[]
{
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
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        }
    ]
}

export default function FournisseurApprovisionnementTable({
    approvisionnements,
    meta,
    queryParams
}: Props) {
    const { getSortState, getSortToggleUrl, getSortExplicitUrl } = useServerTable(queryParams)
    const columns = useMemo(
        () => buildColumns(getSortToggleUrl, getSortExplicitUrl, getSortState),
        [queryParams]
    )

    return (
        <ServerDataTable
            columns={columns}
            data={approvisionnements}
            meta={meta}
            queryParams={queryParams}
        />
    )
}