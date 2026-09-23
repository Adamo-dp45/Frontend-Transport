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
import { useMemo, useState } from "react"
import { DeleteDialog } from "../../components/delete-dialog"
import { Libelle } from "../../models/libelle.model"

type Props = {
    typedepenses: Libelle[],
    canEdit: boolean,
    canDelete: boolean,
    csrfDelete: string
}
function buildColumns(
    canEdit: boolean,
    canDelete: boolean,
    onDeleteClick: (type: Libelle) => void
): ColumnDef<Libelle>[] {
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
                const typedepense = row.original
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
                                    <a href={`/typedepense/${typedepense.id}/modifier`}>
                                        Modifier
                                    </a>
                                </DropdownMenuItem>
                            )}

                            {/* Rien au-dessus sans 'canEdit' : le trait ouvrait alors le menu tout seul. */}
                            {canEdit && canDelete && <DropdownMenuSeparator />}

                            {canDelete && (
                               <DropdownMenuItem
                                   className="text-red-600 focus:text-red-700"
                                   onSelect={() => onDeleteClick(typedepense)}
                               >
                                   Supprimer
                               </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            }
        }
    ]
}

export default function TypedepenseTable({typedepenses, canEdit, canDelete, csrfDelete}: Props) {
    const [deleteTarget, setDeleteTarget] = useState<Libelle | null>(null)
    const handleConfirmDelete = () => {
        if(!deleteTarget) return
        const form = document.createElement("form")
        form.method = "POST"
        form.action = `/typedepense/${deleteTarget.id}/supprimer`

        const csrfInput = document.createElement("input")
        csrfInput.type = "hidden"
        csrfInput.name = "_token"
        csrfInput.value = csrfDelete
        form.appendChild(csrfInput)

        document.body.appendChild(form)
        form.requestSubmit() /*
            - Va déclencher un vrai événement 'submit' ce qui permet à 'turbo' d'intercepter la requête par rapport à 'form.submit()'
        */
        setDeleteTarget(null)
    }

    const columns = useMemo(
        () => buildColumns(canEdit, canDelete, setDeleteTarget),
        [canEdit, canDelete, csrfDelete]
    )

    return <>
        <div className="space-y-2">
            <DataTable
                columns={columns}
                data={typedepenses}
                filterColumn="libelle"
                filterPlaceholder="Filtrer par libellé..."
            />
            <DeleteDialog
                open={deleteTarget !== null}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                onConfirm={handleConfirmDelete}
                dataName={deleteTarget?.libelle}
            />
        </div>
    </>
}