import { ColumnDef } from "@tanstack/react-table"
import { ExternalLink } from "lucide-react"
import { useMemo } from "react"
import { Badge } from "../../components/ui/badge"
import { formatDate } from "../../lib/functions"
import { ServerMeta, ServerTableFilter, useServerTable } from "../hooks/useServerTable"
import { ServerDataTableColumnHeader } from "../components/server/server-data-table-column-header"
import { ServerDataTable } from "../components/server/server-data-table"

type Alerte = {
    id: number
    type: string
    severite: string
    portee: string
    famille: string
    idgare: number | null
    titre: string
    message: string
    sourcetype: string | null
    sourceid: number | null
    sourceUrl: string | null
    statut: string
    createdAt: string
}

type Props = {
    alertes: Alerte[]
    meta: ServerMeta
    queryParams: Record<string, string>
    familles: Record<string, string>
    severites: Record<string, string>
    statuts: Record<string, string>
}

const SEVERITE_CFG: Record<string, { cls: string; label: string }> = {
    CRITIQUE: { cls: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300", label: "Critique" },
    AVERTISSEMENT: { cls: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300", label: "Avertissement" },
    INFO: { cls: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300", label: "Info" },
}

const STATUT_CFG: Record<string, { cls: string; label: string }> = {
    ACTIVE: { cls: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300", label: "Active" },
    LUE: { cls: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300", label: "Lue" },
    RESOLUE: { cls: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300", label: "Résolue" },
}

const FAMILLE_LABELS: Record<string, string> = {
    EXPLOITATION: "Exploitation",
    RESERVATION: "Réservation",
    STOCK_FLOTTE: "Stock & flotte",
    ANTIFRAUDE: "Anti-fraude",
}

function buildColumns(
    getSortToggleUrl: (f: string) => string,
    getSortExplicitUrl: (f: string, dir: 'asc' | 'desc') => string,
    getSortState: (f: string) => 'asc' | 'desc' | false,
): ColumnDef<Alerte>[] {
    const sortUrls = (field: string) => ({
        toggle: getSortToggleUrl(field),
        asc: getSortExplicitUrl(field, 'asc'),
        desc: getSortExplicitUrl(field, 'desc'),
    })

    return [
        {
            accessorKey: 'severite',
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Sévérité" sortUrls={sortUrls('severite')} sortState={getSortState('severite')} />
            ),
            cell: ({ row }) => {
                const cfg = SEVERITE_CFG[row.original.severite] ?? { cls: "bg-gray-100 text-gray-600", label: row.original.severite }
                return <Badge className={cfg.cls}>{cfg.label}</Badge>
            },
        },
        {
            id: 'titre',
            header: "Alerte",
            cell: ({ row }) => (
                <div className="max-w-[420px]">
                    <div className="font-medium">{row.original.titre}</div>
                    <div className="text-muted-foreground text-sm truncate">{row.original.message}</div>
                </div>
            ),
        },
        {
            id: 'famille',
            header: "Famille",
            cell: ({ row }) => (
                <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {FAMILLE_LABELS[row.original.famille] ?? row.original.famille}
                </Badge>
            ),
        },
        {
            accessorKey: 'statut',
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Statut" sortUrls={sortUrls('statut')} sortState={getSortState('statut')} />
            ),
            cell: ({ row }) => {
                const cfg = STATUT_CFG[row.original.statut] ?? { cls: "bg-gray-100 text-gray-600", label: row.original.statut }
                return <Badge className={cfg.cls}>{cfg.label}</Badge>
            },
        },
        {
            accessorKey: 'createdAt',
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Détectée le" sortUrls={sortUrls('createdAt')} sortState={getSortState('createdAt')} />
            ),
            cell: ({ row }) => <span className="tabular-nums">{formatDate(row.original.createdAt)}</span>,
        },
        {
            id: 'actions',
            cell: ({ row }) => (
                row.original.sourceUrl
                    ? (
                        <a href={row.original.sourceUrl} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                            <ExternalLink className="h-3.5 w-3.5" /> Voir
                        </a>
                    )
                    : <span className="text-muted-foreground text-sm">—</span>
            ),
        },
    ]
}

export default function AlerteTable({ alertes, meta, queryParams, familles, severites, statuts }: Props) {
    const { getSortState, getSortToggleUrl, getSortExplicitUrl } = useServerTable(queryParams)
    const columns = useMemo(
        () => buildColumns(getSortToggleUrl, getSortExplicitUrl, getSortState),
        [queryParams]
    )

    const toOptions = (map: Record<string, string>): { value: string; label: string }[] =>
        Object.entries(map).map(([value, label]) => ({ value, label }))

    const filters: ServerTableFilter[] = useMemo(() => [
        { type: 'select', name: 'severite', label: 'Sévérité', options: toOptions(severites) },
        { type: 'select', name: 'famille', label: 'Famille', options: toOptions(familles) },
        { type: 'select', name: 'statut', label: 'Statut', options: toOptions(statuts) },
    ], [familles, severites, statuts])

    return (
        <ServerDataTable
            columns={columns}
            data={alertes}
            meta={meta}
            queryParams={queryParams}
            filters={filters}
        />
    )
}
