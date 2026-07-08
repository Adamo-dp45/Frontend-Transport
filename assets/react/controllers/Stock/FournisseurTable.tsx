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
import { ServerMeta, ServerTableFilter, useServerTable } from "../../hooks/useServerTable"
import { ServerDataTableColumnHeader } from "../../components/server/server-data-table-column-header"
import { ServerDataTable } from "../../components/server/server-data-table"
import { Fournisseur } from "../../models/fournisseur.model"

type Props = {
    fournisseurs: Fournisseur[],
    meta: ServerMeta
    queryParams: Record<string, string>
    canEdit: boolean,
    canDelete: boolean,
    csrfDelete: string
}

function buildColumns(
    getSortToggleUrl: (f: string) => string,
    getSortExplicitUrl: (f: string, dir: 'asc' | 'desc') => string,
    getSortState: (f: string) => 'asc' | 'desc' | false,
    canEdit: boolean,
    canDelete: boolean,
    csrfDelete: string
): ColumnDef<Fournisseur>[] {

    const sortUrls = (field: string) => ({
        toggle: getSortToggleUrl(field),
        asc:    getSortExplicitUrl(field, 'asc'),
        desc:   getSortExplicitUrl(field, 'desc'),
    })

    return [
        {
            accessorKey: "id",
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Id" sortUrls={sortUrls('id')} sortState={getSortState('id')} />
            )
        },
        {
            accessorKey: "libelle",
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Libellé" sortUrls={sortUrls('libelle')} sortState={getSortState('libelle')} />
            ),
            cell: ({ row }) => (
                <span className="font-medium">{row.original.libelle}</span>
            )
        },
        {
            accessorKey: "contact",
            header: 'Contact',
            cell: ({ row }) => (
                row.original.contact
                    ? <a href={`tel:${row.original.contact}`} className="text-primary hover:underline">{row.original.contact}</a>
                    : <span className="text-muted-foreground">—</span>
            )
        },
        {
            accessorKey: "email",
            header: 'Email',
            cell: ({ row }) => (
                row.original.email
                    ? <a href={`mailto:${row.original.email}`} className="text-primary hover:underline">{row.original.email}</a>
                    : <span className="text-muted-foreground">—</span>
            )
        },
        {
            accessorKey: "pays",
            header: 'Pays',
            cell: ({ row }) => (
                row.original.pays ?? <span className="text-muted-foreground">—</span>
            )
        },
        {
            accessorKey: "createdAt",
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Date de création" sortUrls={sortUrls('createdAt')} sortState={getSortState('createdAt')} />
            ),
            cell: ({ row }) => (
                <span>{formatDate(row.original.createdAt)}</span>
            )
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const fournisseur = row.original
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Ouvrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                                <a href={`/fournisseur/${fournisseur.id}`}>Voir</a>
                            </DropdownMenuItem>

                            {canEdit && <DropdownMenuSeparator />}

                            {canEdit && (
                                <DropdownMenuItem asChild>
                                    <a href={`/fournisseur/${fournisseur.id}/modifier`}>Modifier</a>
                                </DropdownMenuItem>
                            )}

                            {canEdit && canDelete && <DropdownMenuSeparator />}

                            {canDelete && (
                                <DropdownMenuItem asChild>
                                    <form
                                        method="POST"
                                        action={`/fournisseur/${fournisseur.id}/supprimer`}
                                        onSubmit={(e) => {
                                            if(!confirm("Supprimer ce fournisseur ?")) {
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
        },
    ]
}

export default function FournisseurTable({fournisseurs, meta, queryParams, canEdit, canDelete, csrfDelete}: Props) {
    const { getSortState, getSortToggleUrl, getSortExplicitUrl } = useServerTable(queryParams)
    const columns = useMemo(
        () => buildColumns(getSortToggleUrl, getSortExplicitUrl, getSortState, canEdit, canDelete, csrfDelete),
        [queryParams, canEdit, canDelete, csrfDelete]
    )

    const filters: ServerTableFilter[] = useMemo(() => [
        {
            type: 'text',
            name: 'search',
            label: 'Libellé',
            placeholder: 'Libellé du fournisseur..'
        },
        {
            type: 'text',
            name: 'contact',
            label: 'Contact',
            placeholder: 'Téléphone..'
        }
    ], [])

    return (
        <ServerDataTable
            columns={columns}
            data={fournisseurs}
            meta={meta}
            queryParams={queryParams}
            filters={filters}
        />
    )
}
