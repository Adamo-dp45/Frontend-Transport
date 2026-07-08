import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, FileText, MoreHorizontal, Sheet } from "lucide-react"
import { DataTable } from "../../components/data-table"
import { Button } from "../../../components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"
import { DataTableColumnHeader } from "../../components/data-table-column-header"
import { useMemo } from "react"
import { Badge } from "../../../components/ui/badge"
import { Personnel } from "../../models/personnel.model"

type Props = {
    personnels: Personnel[],
    apiUrl: string,
    canEdit: boolean,
    canDelete: boolean,
    csrfDelete: string
}

function buildColumns(canEdit: boolean, canDelete: boolean, csrfDelete: string, apiUrl: string): ColumnDef<Personnel>[] {
    return [
        {
            accessorKey: "id",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Id" />
            )
        },
        {
            accessorKey: "nom",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Nom" />
            )
        },
        {
            accessorKey: "prenom",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Prenom" />
            )
        },
        {
            accessorKey: "contact",
            header: 'Contact'
        },
        {
            accessorKey: "code",
            header: 'Code',
            cell: ({ row }) => (
                <span className="font-mono bg-muted px-2 py-0.5 rounded-lg">
                    {row.original.code}
                </span>
            ),
        },
        {
            accessorFn: (row) => row.typepersonnel?.libelle ?? "",
            id: "typepersonnel",
            header: "Type de personnel",
            cell: ({ row }) =>
                row.original.typepersonnel
                ? <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">{row.original.typepersonnel.libelle}</Badge>
                : <span className="text-muted-foreground">Aucun</span>
        },
        {
            accessorKey: 'statut',
            header: 'Statut',
            cell: ({ row }) => {
                const actif = row.original.statut === 'ACTIF'
                return (
                    <Badge className={actif
                        ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                        : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                    }>
                        {actif ? 'Actif' : 'Suspendu'}
                    </Badge>
                )
            }
        },
        {
            id: "nbvoyages",
            header: "Nbr de voyages",
            cell: ({ row }) => {
                return <span className="tabular-nums font-medium">{row.original.voyagesCount}</span>
            }
        },
        {
            id: "nbdepannages",
            header: "Nbr de dépannages",
            cell: ({ row }) => {
                return <span className="tabular-nums font-medium">{row.original.depannagesCount}</span>
            }
        },
        {
            id: "image",
            header: "",
            cell: ({ row }) => {
                const p = row.original
                const imageUrl = p.image?.contentUrl
                const initiales = `${p.prenom.charAt(0)}${p.nom.charAt(0)}`.toUpperCase()
                return (
                    <div className="flex items-center justify-center">
                        {p.image ? (
                            <img
                                src={`${apiUrl}/media${imageUrl}?w=400&h=400&fm=jpg&fit=crop`}
                                alt={`${p.prenom} ${p.nom}`}
                                className="h-8 w-8 rounded-full object-cover shrink-0"
                            />
                        ) : (
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                                {initiales}
                            </div>
                        )}
                    </div>
                )
            },
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const personnel = row.original
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
                                <a href={`/personnel/${personnel.id}`}>Voir</a>
                            </DropdownMenuItem>

                            {canEdit && <DropdownMenuSeparator />}
                            {canEdit && (
                                <DropdownMenuItem asChild>
                                    <a href={`/personnel/${personnel.id}/modifier`}>Modifier</a>
                                </DropdownMenuItem>
                            )}

                            {canEdit && <DropdownMenuSeparator />}
                            {canEdit && (
                                <DropdownMenuItem asChild>
                                    <form method="post" action={`/personnel/${personnel.id}/suspendre`} onSubmit={(e) => {
                                            const action = personnel.statut === 'ACTIF' ? 'suspendre' : 'réactiver'
                                            if(!confirm(`Voulez-vous ${action} ce personnel ?`)) {
                                                e.preventDefault()
                                            }
                                        }}
                                    >
                                        <button
                                            type="submit"
                                            className={`w-full text-left ${personnel.statut === 'ACTIF'
                                                ? 'text-orange-600 focus:text-orange-700'
                                                : 'text-green-600 focus:text-green-700'
                                            }`}
                                        >
                                            {personnel.statut === 'ACTIF' ? 'Suspendre' : 'Réactiver'}
                                        </button>
                                    </form>
                                </DropdownMenuItem>
                            )}

                            {canDelete && <DropdownMenuSeparator />}
                            {canDelete && (
                                <DropdownMenuItem asChild>
                                    <form
                                        method="POST"
                                        action={`/personnel/${personnel.id}/supprimer`}
                                        onSubmit={(e) => {
                                            if(!confirm("Supprimer ce personnel ?")) {
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

export default function PersonnelTable({personnels, canEdit, canDelete, csrfDelete, apiUrl}: Props) {
    const columns = useMemo( /*
            - Pour éviter de recréer le tableau à chaque render
        */
        () => buildColumns(canEdit, canDelete, csrfDelete, apiUrl),
        [canEdit, canDelete, csrfDelete, apiUrl]
    )

    const typeOptions = [...new Map(
        personnels
            .filter(p => p.typepersonnel)
            .map(p => [p.typepersonnel!.id, p.typepersonnel!])
        ).values()].map(m => ({
        label: m.libelle,
        value: m.libelle
    }))

    return <>
        <div className="space-y-2">
            <DataTable
                columns={columns}
                data={personnels}
                filterColumn="nom"
                filterPlaceholder="Filtrer par nombre de siège..."
                selectFilters={[
                    { column: "typepersonnel", title: "Type de personnel", options: typeOptions }
                ]}
            />
        </div>
    </>
}