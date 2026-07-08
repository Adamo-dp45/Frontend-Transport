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
    typepieces: Libelle[],
    canEdit: boolean,
    canDelete: boolean,
    csrfDelete: string
}
/*
    const columns: ColumnDef<Marque>[] = [
        {
            accessorKey: "id",
            header: "Id",
        }
        ..
    ]

    type Ref = {
        id: number
        [key: string]: any
    }
*/
/**
 * Pour avoir accès au props
 */
function buildColumns(
    canEdit: boolean,
    canDelete: boolean,
    onDeleteClick: (piece: Libelle) => void
): ColumnDef<Libelle>[] {
    return [
        {
            accessorKey: "id", /*
                - 'accessorKey' indique à 'react-table' quelle propriété de l'objet utiliser pour cette colonne, permet à 'TanStack' de gérer le tri, filtre..
                - 'id' sert uniquement à identifier la colonne ex: 'nbr de pièces'
            */
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Id" />
            ) /*
                - 'enableHiding: true' permet de cacher sur mobile
            */
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
                const typepiece = row.original
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
                                    <a href={`/typepiece/${typepiece.id}/modifier`}>
                                        Modifier
                                    </a>
                                </DropdownMenuItem>
                            )}

                            {canDelete && <DropdownMenuSeparator />}

                            {canDelete && (
                                /*
                                    <DropdownMenuItem asChild>
                                        <form
                                            method="POST"
                                            action={`/typepiece/${typepiece.id}/supprimer`}
                                            onSubmit={(e) => {
                                                if(!confirm("Supprimer ce type de pièce ?")) {
                                                    e.preventDefault()
                                                }
                                            }}
                                        >
                                            <button
                                                type="submit"
                                                className="w-full text-left text-red-600 focus:text-red-700"
                                            >
                                                {/* <Trash2 className="h-4 w-4" /> /}
                                                Supprimer
                                            </button>
                                        </form>
                                    </DropdownMenuItem>
                                */
                               <DropdownMenuItem
                                   className="text-red-600 focus:text-red-700"
                                   onSelect={() => onDeleteClick(typepiece)}
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

export default function TypepieceTable({typepieces, canEdit, canDelete, csrfDelete}: Props) {
    const [deleteTarget, setDeleteTarget] = useState<Libelle | null>(null)
    const handleConfirmDelete = () => {
        if(!deleteTarget) return
        const form = document.createElement("form")
        form.method = "POST"
        form.action = `/typepiece/${deleteTarget.id}/supprimer`

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

    const columns = useMemo( /*
            - Pour éviter de recréer le tableau à chaque render
        */
        () => buildColumns(canEdit, canDelete, setDeleteTarget),
        [canEdit, canDelete, csrfDelete]
    )

    return <>
        <div className="space-y-2">
            <DataTable
                columns={columns}
                data={typepieces}
                filterColumn="libelle"
                filterPlaceholder="Filtrer par libellé..."
            /> {/*
                    filterableColumns={[
                        { columnId: "id", placeholder: "Filtrer par id..."},
                        { columnId: "libelle", placeholder: "Filtrer par libellé..."}
                    ]}
            */}
            <DeleteDialog
                open={deleteTarget !== null}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                onConfirm={handleConfirmDelete}
                dataName={deleteTarget?.libelle}
            />
        </div>
    </>
}