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
// import { exportToPDF, exportToExcel, printTable } from "../../../lib/export"

type Props = {
    marques: Libelle[],
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
                const marque = row.original
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
                                    <a href={`/marque/${marque.id}/modifier`}>Modifier</a>
                                </DropdownMenuItem>
                            )}

                            {canEdit && canDelete && <DropdownMenuSeparator />}

                            {canDelete && (
                                <DropdownMenuItem asChild>
                                    <form
                                        method="POST"
                                        action={`/marque/${marque.id}/supprimer`}
                                        onSubmit={(e) => {
                                            if(!confirm("Supprimer cette marque ?")) {
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

const EXPORT_COLUMNS = [
    { header: 'ID', accessor: 'id' },
    { header: 'Libellé', accessor: 'libelle' }
]

export default function MarqueTable({marques, canEdit, canDelete, csrfDelete}: Props) {
    const columns = useMemo(
        () => buildColumns(canEdit, canDelete, csrfDelete),
        [canEdit, canDelete, csrfDelete]
    ) /*
        const tableRef = useRef<Table<Marque> | null>(null) -- Pour l'export de toutes les données
        const getExportData = () => tableRef.current ? tableRef.current.getFilteredRowModel().rows.map(r => r.original) : marques
    */
    return <>
        <div className="space-y-2">
            {/*
                <div className="flex justify-end gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportToExcel(marques, EXPORT_COLUMNS, 'marques')}
                    > {/* exportToExcel(getExportData(), EXPORT_COLUMNS, 'marques') -- Pour l'export de toutes les données /}
                        <Sheet className="mr-2 h-4 w-4 text-green-600" />
                        Excel
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportToPDF(marques, EXPORT_COLUMNS, 'marques')}
                    >
                        <FileText className="mr-2 h-4 w-4 text-red-600" />
                        PDF
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => printTable(marques, EXPORT_COLUMNS, 'Liste des marques')}
                    >
                        <Printer className="mr-2 h-4 w-4 text-gray-600" />
                        Imprimer
                    </Button>
                </div>
            */}
            <DataTable
                columns={columns}
                data={marques}
                filterColumn="libelle"
                filterPlaceholder="Filtrer par libellé..."
            /> {/* onTableReady={(t) => { tableRef.current = t }} -- Pour l'export de toutes les données */}
            {/*
                -- Si on veut définir un affichage personnalisé dans le 'data-table'
                renderView={(rows, sorting, setSorting) => (
                    <div>
                        <div className="flex gap-2 pb-4"> -- Si on veut faire du tri 'sorting, setSorting)'
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSorting([{ id: "id", desc: !sorting[0]?.desc }])}
                            >
                                Date {sorting[0]?.id === "id" ? (sorting[0].desc ? "↓" : "↑") : "↕"}
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
                            {rows.map((m) => (
                                <div key={m.id} className="rounded-lg border p-4 space-y-2 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        {m.libelle}
                                    </div>
                                    <p className="font-semibold">ddd</p>
                                    <p >
                                        dd
                                    </p>
                                    <p className="text-xs text-muted-foreground">dd</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            */}
        </div>
    </>
}