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
import { ServerDataTable } from "../../components/server/server-data-table"
import { ServerDataTableColumnHeader } from "../../components/server/server-data-table-column-header"
import { ServerMeta, ServerTableFilter, useServerTable } from "../../hooks/useServerTable"
import { formatDate } from "../../../lib/functions"
import { Depense } from "../../models/depense.model"
import { Libelle } from "../../models/libelle.model"

type Props = {
    depenses: Depense[]
    meta: ServerMeta
    queryParams: Record<string, string>
    types: Libelle[]
    gares: Libelle[]
    canEdit: boolean
    canDelete: boolean
    csrfDelete: string
}

const MODES: Record<string, string> = {
    ESPECES: "Espèces",
    MOBILE_MONEY: "Mobile Money",
    VIREMENT: "Virement",
    CHEQUE: "Chèque",
}

function buildColumns(
    getSortToggleUrl: (f: string) => string,
    getSortExplicitUrl: (f: string, dir: 'asc' | 'desc') => string,
    getSortState: (f: string) => 'asc' | 'desc' | false,
    canEdit: boolean,
    canDelete: boolean,
    csrfDelete: string
): ColumnDef<Depense>[] {

    const sortUrls = (field: string) => ({
        toggle: getSortToggleUrl(field),
        asc: getSortExplicitUrl(field, 'asc'),
        desc: getSortExplicitUrl(field, 'desc')
    })

    return [
        {
            accessorKey: 'datedepense',
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Date" sortUrls={sortUrls('datedepense')} sortState={getSortState('datedepense')} />
            ),
            cell: ({ row }) => (
                <span className="tabular-nums">{formatDate(row.original.datedepense)}</span>
            ),
        },
        {
            accessorFn: (row) => row.typedepense?.libelle ?? "",
            id: "poste",
            header: "Poste",
        },
        {
            accessorKey: 'libelle',
            header: 'Objet',
            cell: ({ row }) => row.original.libelle
                ? <span>{row.original.libelle}</span>
                : <span className="text-muted-foreground">—</span>
        },
        {
            // La PORTÉE se lit d'un coup d'œil : une charge de siège n'est imputée à aucune gare.
            accessorFn: (row) => row.gare?.libelle ?? "Siège",
            id: "imputation",
            header: "Imputation",
            cell: ({ row }) => row.original.gare
                ? <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">{row.original.gare.libelle}</Badge>
                : <Badge className="bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">Siège</Badge>
        },
        {
            accessorFn: (row) => row.beneficiaire ?? row.fournisseur?.libelle ?? "",
            id: "beneficiaire",
            header: "Bénéficiaire",
            cell: ({ row }) => {
                const nom = row.original.beneficiaire ?? row.original.fournisseur?.libelle
                return nom ? <span>{nom}</span> : <span className="text-muted-foreground">—</span>
            }
        },
        {
            accessorKey: 'modereglement',
            header: 'Règlement',
            cell: ({ row }) => (
                <span className="text-xs text-muted-foreground">
                    {MODES[row.original.modereglement] ?? row.original.modereglement}
                </span>
            )
        },
        {
            accessorKey: 'montant',
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Montant" sortUrls={sortUrls('montant')} sortState={getSortState('montant')} />
            ),
            cell: ({ row }) => (
                <span className="tabular-nums font-medium">
                    {row.original.montant.toLocaleString('fr-FR')} <span className="text-xs font-normal text-muted-foreground">FCFA</span>
                </span>
            ),
        },
        {
            id: "justificatif",
            header: "Justificatif",
            cell: ({ row }) => row.original.justificatif
                ? <a href={row.original.justificatif.contentUrl} target="_blank" rel="noopener" className="text-primary hover:underline text-sm">Voir</a>
                : <span className="text-muted-foreground">—</span>
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const depense = row.original
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Ouvrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                                <a href={`/depense/${depense.id}`}>Voir</a>
                            </DropdownMenuItem>

                            {canEdit && <DropdownMenuSeparator />}
                            {canEdit && (
                                <DropdownMenuItem asChild>
                                    <a href={`/depense/${depense.id}/modifier`}>Modifier</a>
                                </DropdownMenuItem>
                            )}

                            {canDelete && <DropdownMenuSeparator />}
                            {canDelete && (
                                <DropdownMenuItem asChild>
                                    <form
                                        method="POST"
                                        action={`/depense/${depense.id}/supprimer`}
                                        onSubmit={(e) => {
                                            // Le montant dans la question : on ne confirme pas une ligne de tableau,
                                            // on confirme une somme qui va sortir du bénéfice.
                                            if(!confirm(`Mettre à la corbeille la dépense de ${depense.montant.toLocaleString('fr-FR')} FCFA ?`)) {
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
        }
    ]
}

export default function DepenseTable({
    depenses,
    meta,
    queryParams,
    types,
    gares,
    canEdit,
    canDelete,
    csrfDelete
}: Props) {

    const { getSortState, getSortToggleUrl, getSortExplicitUrl } = useServerTable(queryParams)
    const columns = useMemo(
        () => buildColumns(getSortToggleUrl, getSortExplicitUrl, getSortState, canEdit, canDelete, csrfDelete),
        [queryParams, canEdit, canDelete, csrfDelete]
    )

    const filters: ServerTableFilter[] = useMemo(() => {
        const liste: ServerTableFilter[] = [
            {
                type: 'text',
                name: 'search',
                label: 'Objet',
                placeholder: 'Rechercher…',
            },
            {
                type: 'select',
                name: 'typedepense',
                label: 'Poste',
                options: types.map(t => ({ label: t.libelle, value: String(t.id) })),
            },
            {
                type: 'select',
                name: 'mode',
                label: 'Règlement',
                options: Object.entries(MODES).map(([value, label]) => ({ label, value })),
            },
            {
                type: 'date_range',
                name: 'date',
                label: 'Période',
            },
        ]

        // Le filtre de gare n'a de sens que pour qui en voit plusieurs : un agent rattaché ne reçoit
        // que sa propre gare, et la liste arrive vide.
        if(gares.length > 0) {
            liste.splice(2, 0, {
                type: 'select',
                name: 'gare',
                label: 'Gare',
                options: gares.map(g => ({ label: g.libelle, value: String(g.id) })),
            })
        }

        return liste
    }, [types, gares])

    return (
        <ServerDataTable
            columns={columns}
            data={depenses}
            meta={meta}
            queryParams={queryParams}
            filters={filters}
        />
    )
}
