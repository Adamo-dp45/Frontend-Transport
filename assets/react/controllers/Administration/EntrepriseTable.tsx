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
import { formatDate } from "../../../lib/functions"
import { Badge } from "../../../components/ui/badge"
import { Entreprise } from "../../models/entreprise.model"

type Props = {
    entreprises: Entreprise[]
}

function buildColumns(): ColumnDef<Entreprise>[] {
    return [
        {
            accessorKey: "id",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Id" />
            )
        },
        {
            accessorKey: "libelle",
            header: "Libellé"
        },
        {
            accessorKey: "contact1",
            header: "Contact 1"
        },
        {
            accessorKey: "contact2",
            header: "Contact 2"
        },
        {
            accessorKey: "adresse",
            header: "Adresse"
        },
        {
            accessorKey: "email",
            header: "Email"
        },
        {
            accessorKey: "sigle",
            header: "Sigle"
        },
        /*
            {
                id: "logo",
                header: "",
                cell: ({ row }) => {
                    const e = row.original
                    return (
                        <div className="flex items-center justify-center">
                            {e.image ? (
                                <img
                                    src={e.image}
                                    alt={e.sigle}
                                    className="h-8 w-8 rounded object-contain"
                                />
                            ) : (
                                <div className="h-8 w-8 rounded bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                    {e.sigle.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                    )
                },
            }
        */
        {
            accessorKey: "statut",
            header: "Statut",
            cell: ({ row }) => {
                const actif = row.original.statut === 'ACTIF'
                return (
                    <Badge className={actif ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                    }>
                        {actif ? 'Active' : 'Suspendue'}
                    </Badge>
                )
            }
        },
        {
            accessorKey: "createdAt",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Date de création" />
            ),
            cell: ({ row }) => (
                <span>
                    {formatDate(row.original.createdAt)}
                </span>
            )
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const entreprise = row.original
                const action = entreprise.statut === 'ACTIF' ? 'désactiver' : 'réactiver'
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
                                <a href={`/admin/entreprises/${entreprise.id}`}>Voir</a>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <form
                                    method="POST"
                                    action={`/admin/entreprises/${entreprise.id}/desactiver`}
                                    onSubmit={(e) => {
                                        if(!confirm(`Voulez-vous ${action} cette entreprise ?`)) {
                                            e.preventDefault()
                                        }
                                    }}
                                >
                                    <button
                                        type="submit"
                                        className={`w-full text-left ${entreprise.statut === 'ACTIF'
                                            ? 'text-orange-600 focus:text-orange-700'
                                            : 'text-green-600 focus:text-green-700'
                                        }`}
                                    >
                                        {entreprise.statut === 'ACTIF' ? 'Désactiver' : 'Réactiver'}
                                    </button>
                                </form>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ]
}

export default function EntrepriseTable({entreprises}: Props) {
    const columns = useMemo(
        () => buildColumns(),
        []
    )

    return <>
        <div className="space-y-2">
            <DataTable
                columns={columns}
                data={entreprises}
                filterColumn="libelle"
                filterPlaceholder="Filtrer par libellé..."
            />
        </div>
    </>
}