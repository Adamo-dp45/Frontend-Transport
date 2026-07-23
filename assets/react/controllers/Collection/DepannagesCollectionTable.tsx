import { ColumnDef } from "@tanstack/react-table"
import { useMemo } from "react"
import { Badge } from "../../../components/ui/badge"
import { formatDate } from "../../../lib/functions"
import { ServerMeta, useServerTable } from "../../hooks/useServerTable"
import { ServerDataTableColumnHeader } from "../../components/server/server-data-table-column-header"
import { ServerDataTable } from "../../components/server/server-data-table"
import { Depannage } from "../../models/depannage.model"

type Props = {
    depannages: Depannage[]
    meta: ServerMeta
    queryParams: Record<string, string>
    urlPrefix: string
}

const statut = (statut: string) => {
    const cfg: Record<string, string> = {
        'EN COURS': 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
        CLOTURE: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
    }

    return (
        <Badge className={`${cfg[statut] ?? "bg-gray-100 text-gray-600"}`}>
            {statut === "CLOTURE" ? "Clôturer" : "En cours"}
        </Badge>
    )
}

function buildColumns(
    getSortToggleUrl: (f: string) => string,
    getSortExplicitUrl: (f: string, dir: 'asc' | 'desc') => string,
    getSortState: (f: string) => 'asc' | 'desc' | false
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
                // Quantité totale agrégée par l'API (SUM) : plus de collection à sommer côté client
                return <span className="tabular-nums font-medium">{row.original.piecesQuantiteTotale ?? 0}</span>
            }
        },
        {
            id: "nbpersonnels",
            header: "Nombre de personnels",
            cell: ({ row }) => {
                return <span className="tabular-nums font-medium">{row.original.detailpersonnelsCount ?? 0}</span>
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
            id: 'actions',
            header: '',
            cell: ({ row }) => (
                <a href={`/depannage/${row.original.id}`} className="text-xs text-primary hover:underline">Voir</a>
            )
        }
    ]
}

export default function DepannageTable({
    depannages,
    meta,
    queryParams,
    urlPrefix
}: Props) {
    const { getSortState, getSortToggleUrl, getSortExplicitUrl } = useServerTable(queryParams, urlPrefix)
    const columns = useMemo(
        () => buildColumns(getSortToggleUrl, getSortExplicitUrl, getSortState),
        [queryParams]
    )

    return (
        <ServerDataTable
            columns={columns}
            data={depannages}
            meta={meta}
            queryParams={queryParams}
            urlPrefix={urlPrefix}
        />
    )
}