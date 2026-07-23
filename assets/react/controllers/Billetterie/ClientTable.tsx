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
import { Client } from "../../models/client.model"

type Props = {
    clients: Client[],
    meta: ServerMeta
    queryParams: Record<string, string>
    canEdit: boolean,
    canDelete: boolean,
    csrfDelete: string
    csrfAdherer: string
    csrfResilier: string
}

function buildColumns(
    getSortToggleUrl: (f: string) => string,
    getSortExplicitUrl: (f: string, dir: 'asc' | 'desc') => string,
    getSortState: (f: string) => 'asc' | 'desc' | false,
    canEdit: boolean,
    canDelete: boolean,
    csrfDelete: string,
    csrfAdherer: string,
    csrfResilier: string
): ColumnDef<Client>[] {

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
            accessorKey: "nom",
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Nom" sortUrls={sortUrls('nom')} sortState={getSortState('nom')} />
            ),
            cell: ({ row }) => (
                <span className="font-medium">{row.original.nom}</span>
            )
        },
        {
            accessorKey: "contact",
            header: 'Téléphone',
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
            accessorKey: "ticketsCount",
            header: 'Billets',
            cell: ({ row }) => (
                <span className="tabular-nums font-medium">{row.original.ticketsCount ?? 0}</span>
            )
        },
        {
            accessorKey: "bagagesCount",
            header: 'Bagages',
            cell: ({ row }) => (
                <span className="tabular-nums font-medium">{row.original.bagagesCount ?? 0}</span>
            )
        },
        {
            accessorKey: "fidelite",
            header: 'Fidélité',
            cell: ({ row }) => (
                row.original.fidelite
                    ? <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">Membre</span>
                    : <span className="text-muted-foreground text-xs">—</span>
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
                const client = row.original
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
                                <a href={`/client/${client.id}`}>Voir</a>
                            </DropdownMenuItem>

                            {canEdit && <DropdownMenuSeparator />}

                            {canEdit && (
                                <DropdownMenuItem asChild>
                                    <a href={`/client/${client.id}/modifier`}>Modifier</a>
                                </DropdownMenuItem>
                            )}

                            {/* Fidélité : adhésion si non-membre, résiliation sinon */}
                            {canEdit && !client.fidelite && (
                                <DropdownMenuItem asChild>
                                    <form
                                        method="POST"
                                        action={`/client/${client.id}/adherer`}
                                        onSubmit={(e) => {
                                            if(!confirm("Faire adhérer ce client au programme de fidélité ?")) {
                                                e.preventDefault()
                                            }
                                        }}
                                    >
                                        <input type="hidden" name="_token" value={csrfAdherer} />
                                        <button type="submit" className="w-full text-left text-primary">
                                            Adhérer à la fidélité
                                        </button>
                                    </form>
                                </DropdownMenuItem>
                            )}

                            {canEdit && client.fidelite && (
                                <DropdownMenuItem asChild>
                                    <form
                                        method="POST"
                                        action={`/client/${client.id}/resilier`}
                                        onSubmit={(e) => {
                                            if(!confirm("Résilier l'adhésion fidélité de ce client ?")) {
                                                e.preventDefault()
                                            }
                                        }}
                                    >
                                        <input type="hidden" name="_token" value={csrfResilier} />
                                        <button type="submit" className="w-full text-left">
                                            Résilier la fidélité
                                        </button>
                                    </form>
                                </DropdownMenuItem>
                            )}

                            {canEdit && canDelete && <DropdownMenuSeparator />}

                            {canDelete && (
                                <DropdownMenuItem asChild>
                                    <form
                                        method="POST"
                                        action={`/client/${client.id}/supprimer`}
                                        onSubmit={(e) => {
                                            if(!confirm("Supprimer ce client ?")) {
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

export default function ClientTable({clients, meta, queryParams, canEdit, canDelete, csrfDelete, csrfAdherer, csrfResilier}: Props) {
    const { getSortState, getSortToggleUrl, getSortExplicitUrl } = useServerTable(queryParams)
    const columns = useMemo(
        () => buildColumns(getSortToggleUrl, getSortExplicitUrl, getSortState, canEdit, canDelete, csrfDelete, csrfAdherer, csrfResilier),
        [queryParams, canEdit, canDelete, csrfDelete, csrfAdherer, csrfResilier]
    )

    const filters: ServerTableFilter[] = useMemo(() => [
        {
            type: 'text',
            name: 'search',
            label: 'Nom',
            placeholder: 'Nom du client..'
        },
        {
            type: 'text',
            name: 'tel',
            label: 'Téléphone',
            placeholder: 'Numéro..'
        }
    ], [])

    return (
        <ServerDataTable
            columns={columns}
            data={clients}
            meta={meta}
            queryParams={queryParams}
            filters={filters}
        />
    )
}
