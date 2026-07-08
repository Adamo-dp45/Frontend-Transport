import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
import { useMemo } from "react"
import { Button } from "../../../components/ui/button"
import { Badge } from "../../../components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"
import { formatDate } from "../../../lib/functions"
import { ServerMeta, ServerTableFilter, useServerTable } from "../../hooks/useServerTable"
import { ServerDataTableColumnHeader } from "../../components/server/server-data-table-column-header"
import { ServerDataTable } from "../../components/server/server-data-table"
import { Beneficiaire } from "../../models/beneficiaire.model"

type Props = {
    beneficiaires: Beneficiaire[]
    meta: ServerMeta
    queryParams: Record<string, string>
    canEdit: boolean
    canDelete: boolean
    csrfDelete: string
}

const CATEGORIES: Record<string, string> = {
    ETUDIANT: "Étudiant",
    ENFANT: "Enfant",
    TROISIEME_AGE: "3e âge",
    PERSONNEL: "Personnel",
    MILITAIRE: "Militaire",
    PARTENAIRE: "Partenaire",
    AUTRE: "Autre",
}

function buildColumns(
    getSortToggleUrl: (f: string) => string,
    getSortExplicitUrl: (f: string, dir: 'asc' | 'desc') => string,
    getSortState: (f: string) => 'asc' | 'desc' | false,
    canEdit: boolean,
    canDelete: boolean,
    csrfDelete: string
): ColumnDef<Beneficiaire>[] {
    const sortUrls = (field: string) => ({
        toggle: getSortToggleUrl(field),
        asc: getSortExplicitUrl(field, 'asc'),
        desc: getSortExplicitUrl(field, 'desc'),
    })

    return [
        {
            accessorKey: "id",
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Id" sortUrls={sortUrls('id')} sortState={getSortState('id')} />
            ),
        },
        {
            accessorKey: "nom",
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Nom" sortUrls={sortUrls('nom')} sortState={getSortState('nom')} />
            ),
        },
        {
            accessorKey: "categorie",
            header: "Catégorie",
            cell: ({ row }) => (
                <Badge variant="secondary">{CATEGORIES[row.original.categorie] ?? row.original.categorie}</Badge>
            ),
        },
        {
            accessorKey: "contact",
            header: "Contact",
            cell: ({ row }) => row.original.contact
                ? <span>{row.original.contact}</span>
                : <span className="text-muted-foreground">—</span>,
        },
        {
            accessorKey: "createdAt",
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Date de création" sortUrls={sortUrls('createdAt')} sortState={getSortState('createdAt')} />
            ),
            cell: ({ row }) => <span>{formatDate(row.original.createdAt)}</span>,
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const b = row.original
                if (!canEdit && !canDelete) return null
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
                                    <a href={`/beneficiaire/${b.id}/modifier`}>Modifier</a>
                                </DropdownMenuItem>
                            )}
                            {canEdit && canDelete && <DropdownMenuSeparator />}
                            {canDelete && (
                                <DropdownMenuItem asChild>
                                    <form
                                        method="POST"
                                        action={`/beneficiaire/${b.id}/supprimer`}
                                        onSubmit={(e) => { if (!confirm("Supprimer ce bénéficiaire ?")) e.preventDefault() }}
                                    >
                                        <input type="hidden" name="_token" value={csrfDelete} />
                                        <button type="submit" className="w-full text-left text-red-600 focus:text-red-700">Supprimer</button>
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

export default function BeneficiaireTable({ beneficiaires, meta, queryParams, canEdit, canDelete, csrfDelete }: Props) {
    const { getSortState, getSortToggleUrl, getSortExplicitUrl } = useServerTable(queryParams)
    const columns = useMemo(
        () => buildColumns(getSortToggleUrl, getSortExplicitUrl, getSortState, canEdit, canDelete, csrfDelete),
        [queryParams, canEdit, canDelete, csrfDelete]
    )
    const filters: ServerTableFilter[] = useMemo(() => [
        { type: 'text', name: 'search', label: 'Nom', placeholder: 'Rechercher un bénéficiaire…' },
        {
            type: 'select',
            name: 'categorie',
            label: 'Catégorie',
            options: Object.entries(CATEGORIES).map(([value, label]) => ({ value, label })),
        },
    ], [])

    return (
        <ServerDataTable
            columns={columns}
            data={beneficiaires}
            meta={meta}
            queryParams={queryParams}
            filters={filters}
        />
    )
}
