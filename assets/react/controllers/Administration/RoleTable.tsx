import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, ShieldCheck } from "lucide-react"
import { Button } from "../../../components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"
import { useMemo } from "react"
import { Role } from "../../models/role.model"
import { Gare } from "../../models/gare.model"
import { ServerMeta, ServerTableFilter, useServerTable } from "../../hooks/useServerTable"
import { ServerDataTableColumnHeader } from "../../components/server/server-data-table-column-header"
import { ServerDataTable } from "../../components/server/server-data-table"

type Props = {
    roles: Role[],
    meta: ServerMeta
    queryParams: Record<string, string>
    gares: Gare[]
    canEdit: boolean,
    canDelete: boolean,
    csrfDelete: string,
    // Filtre gare réservé aux utilisateurs NON liés à une gare (admin entreprise ou utilisateur central)
    canFilterGare?: boolean
}

const typeroleVariant: Record<string, string> = {
    Administration: "bg-red-100 text-red-800",
    Exploitation: "bg-blue-100 text-blue-800",
    Billetterie: "bg-green-100 text-green-800",
    Maintenance: "bg-orange-100 text-orange-800",
    RH: "bg-purple-100 text-purple-800"
}

function buildColumns(
    getSortToggleUrl: (f: string) => string,
    getSortExplicitUrl: (f: string, dir: 'asc' | 'desc') => string,
    getSortState: (f: string) => 'asc' | 'desc' | false,
    canEdit: boolean,
    canDelete: boolean,
    csrfDelete: string
): ColumnDef<Role>[] {

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
            accessorKey: "name",
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Nom du rôle" sortUrls={sortUrls('name')} sortState={getSortState('name')} />
            )
        },
        {
            accessorKey: "typerole",
            header: "Type",
            cell: ({ row }) => {
                const type = row.original.typerole
                const cls = typeroleVariant[type] ?? typeroleVariant["AUTRE"]
                return (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
                        {type}
                    </span>
                )
            },
        },
        {
            accessorKey: "description",
            header: "Description",
            cell: ({ row }) =>
                row.original.description
                    ? <span className="text-sm line-clamp-1">{row.original.description}</span>
                    : <span className="text-muted-foreground text-sm">-</span>
        },
        {
            id: "gare",
            header: "Gare",
            cell: ({ row }) => {
                const gare = row.original.gare
                if (!gare) {
                    return <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-xs font-medium">Entreprise</span>
                }
                return <span className="text-sm">{gare.libelle}{gare.ville ? ` - ${gare.ville}` : ""}</span>
            },
        },
        {
            accessorKey: "permissions",
            header: "Permissions",
            cell: ({ row }) => {
                const perms = row.original.permissions ?? []
                if (perms.length === 0) {
                    return <span className="text-muted-foreground text-xs">Aucune permission</span>
                }
                // Grouper par entité
                const grouped = perms.reduce<Record<string, string[]>>((acc, p) => {
                    if (!acc[p.entity]) acc[p.entity] = []
                    acc[p.entity].push(p.action)
                    return acc
                }, {})

                const entries = Object.entries(grouped)
                const visible = entries.slice(0, 3)
                const hidden  = entries.length - 3

                return (
                    <div className="flex flex-wrap gap-1">
                        {visible.map(([entity, actions]) => (
                            <span
                                key={entity}
                                title={`${entity}: ${actions.join(", ")}`}
                                className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium"
                            >
                                <ShieldCheck className="h-3 w-3" />
                                {entity}
                                <span className="opacity-60">({actions.length})</span>
                            </span>
                        ))}
                        {hidden > 0 && (
                            <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-xs">
                                +{hidden} autres
                            </span>
                        )}
                    </div>
                )
            },
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const role = row.original
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
                                <a href={`/admin/roles/${role.id}`}>Voir</a>
                            </DropdownMenuItem>

                            {canEdit && <DropdownMenuSeparator />}

                            {canEdit && (
                                <DropdownMenuItem asChild>
                                    <a href={`/admin/roles/${role.id}/modifier`}>Modifier</a>
                                </DropdownMenuItem>
                            )}

                            {canEdit && canDelete && <DropdownMenuSeparator />}

                            {canDelete && (
                                <DropdownMenuItem asChild>
                                    <form
                                        method="POST"
                                        action={`/admin/roles/${role.id}/supprimer`}
                                        onSubmit={(e) => {
                                            if(!confirm("Supprimer ce rôle ?")) {
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

export default function RoleTable({roles, meta, queryParams, gares, canEdit, canDelete, csrfDelete, canFilterGare = false}: Props) {
    const { getSortState, getSortToggleUrl, getSortExplicitUrl } = useServerTable(queryParams)
    const columns = useMemo(
        () => buildColumns(getSortToggleUrl, getSortExplicitUrl, getSortState, canEdit, canDelete, csrfDelete),
        [queryParams, canEdit, canDelete, csrfDelete]
    )

    const filters: ServerTableFilter[] = useMemo(() => {
        const list: ServerTableFilter[] = [
            {
                type: 'text',
                name: 'search',
                label: 'Nom',
                placeholder: 'Nom du rôle..'
            }
        ]

        // Filtre par gare : réservé à l'admin entreprise / un utilisateur central sans gare.
        if (canFilterGare) {
            list.push({
                type: 'select',
                name: 'gare',
                label: 'Gare',
                options: gares.map((g) => ({ value: `${g.id}`, label: g.ville ? `${g.libelle} - ${g.ville}` : g.libelle })),
            })
        }

        return list
    }, [gares, canFilterGare])

    return (
        <ServerDataTable
            columns={columns}
            data={roles}
            meta={meta}
            queryParams={queryParams}
            filters={filters}
        />
    )
}
