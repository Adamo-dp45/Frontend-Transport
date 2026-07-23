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
import { Bagage } from "../../models/bagage.model"

type Props = {
    bagages: Bagage[]
    meta: ServerMeta
    queryParams: Record<string, string>
    urlPrefix: string // isole la pagination/tri de cette table de celle des billets (même page)
}

const STATUT_LABELS: Record<string, string> = {
    ENREGISTRE: "Enregistré",
    EMBARQUE: "Embarqué",
    LIVRE: "Livré",
    PERDU: "Perdu",
}
const STATUT_STYLES: Record<string, string> = {
    ENREGISTRE: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    EMBARQUE: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    LIVRE: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    PERDU: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
}

function buildColumns(
    getSortToggleUrl: (f: string) => string,
    getSortExplicitUrl: (f: string, dir: 'asc' | 'desc') => string,
    getSortState: (f: string) => 'asc' | 'desc' | false,
): ColumnDef<Bagage>[] {

    const sortUrls = (field: string) => ({
        toggle: getSortToggleUrl(field),
        asc: getSortExplicitUrl(field, 'asc'),
        desc: getSortExplicitUrl(field, 'desc'),
    })

    return [
        {
            accessorKey: "codebagage",
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Code" sortUrls={sortUrls('codebagage')} sortState={getSortState('codebagage')} />
            ),
            cell: ({ row }) => (
                <span className="font-medium">{row.original.codebagage}</span>
            )
        },
        {
            id: "nature",
            header: "Nature",
            cell: ({ row }) => (
                <span className="text-sm">
                    {row.original.nature}
                    {row.original.type && <span className="ml-1 text-xs text-muted-foreground">· {row.original.type}</span>}
                </span>
            )
        },
        {
            id: "trajet",
            header: "Trajet",
            cell: ({ row }) => (
                <span className="text-sm">
                    {row.original.garedepart?.libelle ?? '—'} → {row.original.garedescente?.libelle ?? '—'}
                </span>
            )
        },
        {
            accessorKey: "poids",
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Poids" sortUrls={sortUrls('poids')} sortState={getSortState('poids')} />
            ),
            cell: ({ row }) => (
                <span className="tabular-nums">{row.original.poids} kg</span>
            )
        },
        {
            accessorKey: "montant",
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Montant" sortUrls={sortUrls('montant')} sortState={getSortState('montant')} />
            ),
            cell: ({ row }) => (
                <span className="tabular-nums font-semibold">{row.original.montant.toLocaleString("fr-FR")} FCFA</span>
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
            cell: ({ row }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Ouvrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                            <a href={`/bagage/${row.original.id}`}>Voir</a>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        }
    ]
}

export default function ClientBagagesTable({ bagages, meta, queryParams, urlPrefix }: Props) {
    const { getSortState, getSortToggleUrl, getSortExplicitUrl } = useServerTable(queryParams, urlPrefix)
    const columns = useMemo(
        () => buildColumns(getSortToggleUrl, getSortExplicitUrl, getSortState),
        [queryParams]
    )

    return (
        <ServerDataTable
            columns={columns}
            data={bagages}
            meta={meta}
            queryParams={queryParams}
            urlPrefix={urlPrefix}
        />
    )
}
