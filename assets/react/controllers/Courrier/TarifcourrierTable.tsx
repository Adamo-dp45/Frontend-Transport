import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
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
import { Tarifcourrier } from "../../models/tarifcourrier.model"

type Props = {
    items: Tarifcourrier[]
    canEdit: boolean
    canDelete: boolean
    csrfDelete: string
}

function buildColumns(canEdit: boolean, canDelete: boolean, csrfDelete: string): ColumnDef<Tarifcourrier>[] {
    return [
        {
            accessorKey: "id",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Id" />
            )
        },
        {
            accessorKey: "libelle",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Libellé" />
            )
        },
        {
            id: "tranche",
            header: "Tranche de valeur",
            cell: ({ row }) => {
                const { valeurmin, valeurmax } = row.original
                return (
                    <div className="flex items-center gap-1.5 text-sm tabular-nums">
                        <span>{valeurmin.toLocaleString("fr-FR")} FCFA</span>
                        <span className="text-muted-foreground">→</span>
                        {valeurmax !== null && valeurmax !== undefined
                            ? <span>{valeurmax.toLocaleString("fr-FR")} FCFA</span>
                            : <Badge className="bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">Illimité</Badge>
                        } {/* On vérifie le 'undefined' vu que l'api ne renvoi pas le champ quand il est null */}
                    </div>
                )
            }
        },
        {
            accessorKey: "montanttaxe",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Taxe" />
            ),
            cell: ({ row }) => (
                <span className="tabular-nums font-semibold">
                    {row.original.montanttaxe.toLocaleString("fr-FR")} FCFA
                </span>
            )
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const tarif = row.original
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Ouvrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {canEdit && (
                                <DropdownMenuItem asChild>
                                    <a href={`/tarifcourrier/${tarif.id}/modifier`}>Modifier</a>
                                </DropdownMenuItem>
                            )}

                            {canEdit && canDelete && <DropdownMenuSeparator />}

                            {canDelete && (
                                <DropdownMenuItem asChild>
                                    <form
                                        method="POST"
                                        action={`/tarifcourrier/${tarif.id}/supprimer`}
                                        onSubmit={(e) => {
                                            if(!confirm("Supprimer ce tarif ?")) {
                                                e.preventDefault()
                                            }
                                        }}
                                    >
                                        <input type="hidden" name="_token" value={csrfDelete} />
                                        <button type="submit" className="w-full text-left text-red-600 focus:text-red-700">
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

export default function TarifcourrierTable({items, canEdit, canDelete, csrfDelete}: Props) {
    const columns = useMemo(
        () => buildColumns(canEdit, canDelete, csrfDelete),
        [canEdit, canDelete, csrfDelete]
    )

    return (
        <DataTable
            columns={columns}
            data={items}
            filterColumn="libelle"
            filterPlaceholder="Filtrer par libellé.."
        />
    )
}