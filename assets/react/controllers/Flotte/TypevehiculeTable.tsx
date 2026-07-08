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
import { Libelle } from "../../models/libelle.model"

type Props = {
    typevehicules: Libelle[],
    canEdit: boolean,
    canDelete: boolean,
    csrfDelete: string
}

function buildColumns(canEdit: boolean, canDelete: boolean, csrfDelete: string): ColumnDef<Libelle>[] {
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
                <DataTableColumnHeader column={column} title="Libelle" />
            )
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const typevehicule = row.original
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {canEdit && (
                                <DropdownMenuItem asChild>
                                    <a href={`/typevehicule/${typevehicule.id}/modifier`}>Modifier</a>
                                </DropdownMenuItem>
                            )}

                            {canEdit && canDelete && <DropdownMenuSeparator />}

                            {canDelete && (
                                <DropdownMenuItem asChild>
                                    <form
                                        method="POST"
                                        action={`/typevehicule/${typevehicule.id}/supprimer`}
                                        onSubmit={(e) => {
                                            if(!confirm("Supprimer ce type de véhicule ?")) {
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

export default function TypevehiculeTable({typevehicules, canEdit, canDelete, csrfDelete}: Props) {
    const columns = useMemo(
        () => buildColumns(canEdit, canDelete, csrfDelete),
        [canEdit, canDelete, csrfDelete]
    )

    return <>
        <div className="space-y-2">
                <DataTable
                    columns={columns}
                    data={typevehicules}
                    filterColumn="libelle"
                    filterPlaceholder="Filtrer par libellé..."
                />
        </div>
    </>
}