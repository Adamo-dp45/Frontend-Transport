import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"
import { ColumnDef } from "@tanstack/react-table"
import { AlertTriangleIcon, MoreHorizontal } from "lucide-react"
import { Button } from "../../../components/ui/button"
import { useMemo } from "react"
import { Badge } from "../../../components/ui/badge"
import { ServerMeta, ServerTableFilter, useServerTable } from "../../hooks/useServerTable"
import { ServerDataTableColumnHeader } from "../../components/server/server-data-table-column-header"
import { formatDate } from "../../../lib/functions"
import { ServerDataTable } from "../../components/server/server-data-table"
import { Piece } from "../../models/piece.model"
import { Libelle } from "../../models/libelle.model"

type Props = {
    pieces: Piece[]
    meta: ServerMeta
    queryParams: Record<string, string> /*
        - Le type 'Record' qui permet de créer un objet avec des clés et des valeurs typées
    */
    typepieces: Libelle[]
    marquepieces: Libelle[]
    models: Libelle[]
    apiUrl: string
    canEdit: boolean
    canDelete: boolean
    csrfDelete: string
}

const SEUIL_STOCK = 5

function buildColumns(
    getSortToggleUrl: (f: string) => string,
    getSortExplicitUrl: (f: string, dir: 'asc' | 'desc') => string,
    getSortState: (f: string) => 'asc' | 'desc' | false,
    apiUrl: string,
    canEdit: boolean,
    canDelete: boolean,
    csrfDelete: string
): ColumnDef<Piece>[] {

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
            ),
        },
        {
            accessorKey: 'libelle',
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Libellé" sortUrls={sortUrls('libelle')} sortState={getSortState('libelle')} />
            ),
        },
        {
            accessorKey: "prixunitaire",
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Prix unitaire" sortUrls={sortUrls('prixunitaire')} sortState={getSortState('prixunitaire')} />
            ),
            cell: ({ row }) => (
                <span className="tabular-nums font-medium">
                    {row.original.prixunitaire.toLocaleString("fr-FR")} FCFA
                </span>
            )
        },
        {
            accessorKey: "stockinitial",
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Stock" sortUrls={sortUrls('stockinitial')} sortState={getSortState('stockinitial')} />
            ),
            cell: ({ row }) => {
                const stock = row.original.stockinitial
                const bas = stock <= SEUIL_STOCK
                return (
                    <div className="flex items-center gap-1.5">
                        <span className={`font-semibold tabular-nums ${bas ? "text-red-600" : "text-foreground"}`}>
                            {stock}
                        </span>
                        {bas && <AlertTriangleIcon className="h-3.5 w-3.5 text-red-500" />}
                    </div>
                )
            },
        },
        {
            accessorFn: (row) => row.typepiece?.libelle ?? "",
            id: "typepiece",
            header: "Type de pièce",
            cell: ({ row }) =>
                row.original.typepiece
                ? <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">{row.original.typepiece.libelle}</Badge>
                : <span className="text-muted-foreground">Aucun</span>
        },
        {
            accessorFn: (row) => row.marquepiece?.libelle ?? "",
            id: "marquepiece",
            header: "Marque",
            cell: ({ row }) =>
                row.original.marquepiece
                ? <Badge className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">{row.original.marquepiece.libelle}</Badge>
                : <span className="text-muted-foreground">Aucun</span>
        },
        {
            accessorFn: (row) => row.model?.libelle ?? "",
            id: "model",
            header: "Modèle",
            cell: ({ row }) =>
                row.original.model
                ? <Badge className="bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">{row.original.model.libelle}</Badge>
                : <span className="text-muted-foreground">Aucun</span>
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
            id: "image",
            header: "",
            cell: ({ row }) => {
                const p = row.original
                const imageUrl = p.image?.contentUrl
                return (
                    <div className="flex items-center justify-center">
                        {p.image ? (
                            <img
                                src={`${apiUrl}/media${imageUrl}?w=400&h=400&fm=jpg&fit=crop`}
                                alt={p.libelle}
                                className="h-8 w-8 rounded-full object-cover shrink-0"
                            />
                        ) : (
                            <span className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                                <svg className="w-4 h-4 text-muted-foreground/40" viewBox="0 0 24 24"
                                    fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                                    <circle cx="8.5" cy="8.5" r="1.5"/>
                                    <path d="m21 15-5-5L5 21"/>
                                </svg>
                            </span>
                        )}
                    </div>
                )
            },
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const piece = row.original
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
                                <a href={`/piece/${piece.id}`}>Voir</a>
                            </DropdownMenuItem>

                            {canEdit && <DropdownMenuSeparator />}

                            {canEdit && <DropdownMenuItem asChild>
                                <a href={`/piece/${piece.id}/ajustement`}>Ajuster le stock</a>
                            </DropdownMenuItem>}

                            {canEdit && <DropdownMenuSeparator />}

                            {canEdit && (
                                <DropdownMenuItem asChild>
                                    <a href={`/piece/${piece.id}/modifier`}>Modifier</a>
                                </DropdownMenuItem>
                            )}

                            {canEdit && canDelete && <DropdownMenuSeparator />}

                            {canDelete && (
                                <DropdownMenuItem asChild>
                                    <form
                                        method="POST"
                                        action={`/piece/${piece.id}/supprimer`}
                                        onSubmit={(e) => {
                                            if(!confirm("Supprimer cette pièce ?")) {
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

export default function PieceTable({
    pieces,
    meta,
    queryParams,
    typepieces,
    marquepieces,
    models,
    apiUrl,
    canEdit,
    canDelete,
    csrfDelete
}: Props) {

    const { getSortState, getSortToggleUrl, getSortExplicitUrl } = useServerTable(queryParams)
    const columns = useMemo(() =>
        buildColumns(getSortToggleUrl, getSortExplicitUrl, getSortState, apiUrl, canEdit, canDelete, csrfDelete),
        [queryParams, apiUrl, canEdit, canDelete, csrfDelete]
    ) /*
        - Si la 'queryParams' change le hook recalcule ses fonctions
    */
    const filters: ServerTableFilter[] = useMemo(() => [
        {
            type: 'text',
            name: 'search',
            label: 'Recherche',
            placeholder: 'Nom de la pièce…',
        },
        {
            type: 'select',
            name: 'typepiece',
            label: 'Type de pièce',
            options: typepieces.map((t) => ({ value: `${t.id}`, label: t.libelle })),
        },
        {
            type: 'select',
            name: 'marque',
            label: 'Marque',
            options: marquepieces.map((m) => ({ value: `${m.id}`, label: m.libelle })),
        },
        {
            type: 'select',
            name: 'model',
            label: 'Modèle',
            options: models.map((m) => ({ value: `${m.id}`, label: m.libelle })),
        },
    ], [typepieces, marquepieces, models])
    /*
        const typeOptions = [...new Map(
            pieces
                .filter(p => p.typepiece)
                .map(p => [p.typepiece!.id, p.typepiece!]) -- Si on change la clé du 'id' par 'libelle' on garantis qu'un même libellé n'apparaît qu'une seule fois dans les options
            ).values()].map(t => ({
            label: t.libelle,
            value: t.libelle
        }))

        Dans 'DataTable'..
            selectFilters={[
                { column: "typepiece", title: "Type de pièce", options: typeOptions },
                ..
            ]}
    */
    return (
        <ServerDataTable
            columns={columns}
            data={pieces}
            meta={meta}
            queryParams={queryParams}
            filters={filters}
        />
    )
}