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
import { formatDate } from "../../../lib/functions"
import { Car } from "../../models/car.model"

type Props = {
    cars: Car[],
    canEdit: boolean,
    canDelete: boolean,
    csrfDelete: string
}

const etatConfig: Record<string, { label: string; cls: string }> = {
    DISPONIBLE: { label: "Disponible", cls: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" },
    EN_VOYAGE: { label: "En mission", cls: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300" },
    EN_PANNE: { label: "En panne", cls: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" },
    EN_MAINTENANCE: { label: "En maintenance", cls: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300" }
}

function buildColumns(canEdit: boolean, canDelete: boolean, csrfDelete: string): ColumnDef<Car>[] {
    return [
        {
            accessorKey: "id",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Id" />
            )
        },
        {
            accessorKey: "matricule",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Immatriculation" />
            )
        },
        {
            accessorKey: "nbrsiege",
            header: 'Nombre de sièges'
        },
        {
            accessorFn: (row) => row.marque?.libelle ?? "",
            id: "marque",
            header: "Marque",
            cell: ({ row }) =>
                row.original.marque
                ? <Badge className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">{row.original.marque.libelle}</Badge>
                : <span className="text-muted-foreground">Aucune</span>
        },
        {
            accessorFn: (row) => row.typevehicule?.libelle ?? "",
            id: "typevehicule",
            header: "Type véhicule",
            cell: ({ row }) =>
                row.original.typevehicule
                ? <Badge className="bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300">{row.original.typevehicule.libelle}</Badge>
                : <span className="text-muted-foreground">Aucun</span>
        },
        {
            accessorFn: (row) => row.modelvehicule?.libelle ?? "",
            id: "modelvehicule",
            header: "Modèle véhicule",
            cell: ({ row }) =>
                row.original.modelvehicule
                ? <Badge className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300">{row.original.modelvehicule.libelle}</Badge>
                : <span className="text-muted-foreground">Aucun</span>
        },
        {
            accessorKey: "datearrivee",
            header: "Date d'arrivée",
            cell: ({ row }) => formatDate(row.original.datearrivee)
        },
        {
            accessorKey: "etat",
            /* filterFn: 'arrIncludes', -- ou 'equals' permettrait aussi à 'TanStack' de savoir que la colonne est filtrable */
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Etat" />
            ),
            cell: ({ row }) => {
                const cfg = etatConfig[row.original.etat] ?? { label: row.original.etat, cls: "bg-gray-100 text-gray-700" }
                return (
                    <Badge className={`${cfg.cls}`}>{cfg.label}</Badge>
                )
            }
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const car = row.original
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
                                <a href={`/car/${car.id}`}>Voir</a>
                            </DropdownMenuItem>

                            {canEdit && <DropdownMenuSeparator />}

                            {canEdit && (
                                <DropdownMenuItem asChild>
                                    <a href={`/car/${car.id}/modifier`}>Modifier</a>
                                </DropdownMenuItem>
                            )}

                            {canEdit && canDelete && <DropdownMenuSeparator />}

                            {canDelete && (
                                <DropdownMenuItem asChild>
                                    <form
                                        method="POST"
                                        action={`/car/${car.id}/supprimer`}
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
            }
        }
    ]
}

export default function CarTable({cars, canEdit, canDelete, csrfDelete}: Props) {
    const columns = useMemo(
        () => buildColumns(canEdit, canDelete, csrfDelete),
        [canEdit, canDelete, csrfDelete]
    )

    const etatOptions = Object.entries(etatConfig).map(([value, { label }]) => ({
        label,
        value
    }))

    const marqueOptions = [...new Map( /*
            - On a choisi ici les marques qui sont liées
        */
        cars
            .filter(c => c.marque)
            .map(c => [c.marque!.id, c.marque!])
        ).values()].map(m => ({
        label: m.libelle,
        value: m.libelle
    }))

    const typevehiculeOptions = [...new Map(
        cars
            .filter(c => c.typevehicule)
            .map(c => [c.typevehicule!.id, c.typevehicule!])
        ).values()].map(m => ({
        label: m.libelle,
        value: m.libelle
    }))

    const modelvehiculeOptions = [...new Map(
        cars
            .filter(c => c.modelvehicule)
            .map(c => [c.modelvehicule!.id, c.modelvehicule!])
        ).values()].map(m => ({
        label: m.libelle,
        value: m.libelle
    }))

    return <>
        <div className="space-y-2">
            <DataTable
                columns={columns}
                data={cars}
                filterColumn="matricule"
                filterPlaceholder="Filtrer par immatriculation.."
                selectFilters={[
                    { column: "marque", title: "Marque véhicule", options: marqueOptions },
                    { column: "typevehicule", title: "Type véhicule", options: typevehiculeOptions },
                    { column: "modelvehicule", title: "Modèle véhicule", options: modelvehiculeOptions },
                    { column: "etat", title: "État", options: etatOptions }
                ]}
            />
        </div>
    </>
}