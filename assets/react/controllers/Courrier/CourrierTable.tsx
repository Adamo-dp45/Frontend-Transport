import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
import { Button } from "../../../components/ui/button"
import { useMemo } from "react"
import { Badge } from "../../../components/ui/badge"
import { ServerMeta, ServerTableFilter, useServerTable } from "../../hooks/useServerTable"
import { ServerDataTableColumnHeader } from "../../components/server/server-data-table-column-header"
import { formatDate } from "../../../lib/functions"
import { ServerDataTable } from "../../components/server/server-data-table"
import { Courrier } from "../../models/courrier.model"
import { Gare } from "../../models/gare.model"
import { Voyage } from "../../models/voyage.model"

type Props = {
    items: Courrier[]
    meta: ServerMeta
    queryParams: Record<string, string>
    gares: Gare[]
    voyages: Voyage[]
    canEdit: boolean
    canDelete: boolean
    csrfDelete: string
    userGareId: number | null
    isAdmin: boolean
}

const statutConfig: Record<string, { label: string; cls: string }> = {
    EN_ATTENTE: { label: 'En attente', cls: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
    EN_TRANSIT: { label: 'En transit', cls: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
    RECEPTIONNE: { label: 'Réceptionné', cls: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300' },
    LIVRE: { label: 'Livré', cls: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' },
    ANNULE: { label: 'Annulé', cls: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300' },
    PERDU: { label: 'Perdu', cls: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300' }
}

// paiementConfig désactivé (modepaiement non affiché — paiement toujours à l'envoi) :
// const paiementConfig: Record<string, { label: string; cls: string }> = {
//     ENVOI: { label: 'À l\'envoi', cls: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' },
//     RECEPTION: { label: 'À la réception', cls: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300' }
// }

function buildColumns(
    getSortToggleUrl: (f: string) => string,
    getSortExplicitUrl: (f: string, dir: 'asc' | 'desc') => string,
    getSortState: (f: string) => 'asc' | 'desc' | false,
    canEdit: boolean,
    canDelete: boolean,
    csrfDelete: string,
    userGareId: number | null,
    isAdmin: boolean
): ColumnDef<Courrier>[]
{
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
            )
        },
        {
            accessorKey: "codecourrier",
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Code" sortUrls={sortUrls('codecourrier')} sortState={getSortState('codecourrier')} />
            )
        },
        {
            id: "expediteur",
            header: "Expéditeur",
            accessorFn: (row) => row.nomexpediteur,
            cell: ({ row }) => (
                <div>
                    <p className="font-medium">{row.original.nomexpediteur}</p>
                    <p className="text-xs text-muted-foreground">{row.original.contactexpediteur}</p>
                </div>
            )
        },
        {
            id: "destinataire",
            header: "Destinataire",
            accessorFn: (row) => row.nomdestinataire,
            cell: ({ row }) => (
                <div>
                    <p className="font-medium">{row.original.nomdestinataire}</p>
                    <p className="text-xs text-muted-foreground">{row.original.contactdestinataire}</p>
                </div>
            )
        },
        {
            id: "itineraire",
            header: "Itinéraire",
            cell: ({ row }) => {
                const { garedepart, garearrivee } = row.original
                if (!garedepart || !garearrivee) {
                    return <span className="text-muted-foreground text-xs">Non défini</span>
                }
                return (
                    <div className="text-sm">
                        <span className="font-medium">{garedepart.libelle}</span>
                        <span className="text-muted-foreground mx-1">→</span>
                        <span className="font-medium">{garearrivee.libelle}</span>
                    </div>
                )
            }
        },
        {
            id: "voyage",
            header: "Voyage",
            cell: ({ row }) => row.original.voyage
                ? <span className="font-mono text-xs font-semibold">{row.original.voyage.codevoyage}</span>
                : <span className="text-muted-foreground text-xs">Aucun</span>
        },
        {
            id: "nbcolis",
            header: "Colis",
            cell: ({ row }) => (
                <span className="tabular-nums font-medium">
                    {row.original.detailcourriersCount ?? 0}
                </span>
            ),
        },
        {
            accessorKey: "montant",
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Montant" sortUrls={sortUrls('montant')} sortState={getSortState('montant')} />
            ),
            cell: ({ row }) => (
                <span className="tabular-nums font-semibold">
                    {row.original.montant.toLocaleString("fr-FR")} FCFA
                </span>
            ),
        },
        {
            accessorKey: "statut",
            header: "Statut",
            cell: ({ row }) => {
                const cfg = statutConfig[row.original.statut] ?? { label: row.original.statut, cls: "bg-gray-100 text-gray-700" }
                return <Badge className={cfg.cls}>{cfg.label}</Badge>
            },
        },
        /* Colonne « Paiement » désactivée (paiement toujours à l'envoi dans ce déploiement) :
        {
            accessorKey: "modepaiement",
            header: "Paiement",
            cell: ({ row }) => {
                const cfg = paiementConfig[row.original.modepaiement] ?? { label: row.original.modepaiement, cls: "bg-gray-100 text-gray-700" }
                return <Badge className={cfg.cls}>{cfg.label}</Badge>
            },
        },
        */
        {
            accessorKey: "createdAt",
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Date création" sortUrls={sortUrls('createdAt')} sortState={getSortState('createdAt')} />
            ),
            cell: ({ row }) => (
                <span className="tabular-nums text-sm">{formatDate(row.original.createdAt)}</span>
            ),
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const courrier = row.original
                // Qui agit : la gare ÉMETTRICE (garedepart) tant que le courrier est EN_ATTENTE (modifier /
                // annuler / supprimer), la gare de DESTINATION (garearrivee) à l'arrivée (livrer, perdu).
                // Admin / central (sans gare) : non restreints.
                const peutAgirDepart = isAdmin || userGareId == null || courrier.garedepart?.id === userGareId
                const peutAgirArrivee = isAdmin || userGareId == null || courrier.garearrivee?.id === userGareId
                const editable = canEdit && courrier.statut === 'EN_ATTENTE' && peutAgirDepart
                const deletable = canDelete && courrier.statut === 'EN_ATTENTE' && peutAgirDepart
                const livrable = canEdit && courrier.statut === 'RECEPTIONNE' && peutAgirArrivee
                const annulable = canEdit && courrier.statut === 'EN_ATTENTE' && peutAgirDepart
                const perduable = canEdit && courrier.statut === 'EN_TRANSIT' && peutAgirArrivee // perte : gare de destination uniquement
                // Reçu : gares (départ + arrivée) saisies + gare créatrice (départ). Cf. spec gardes de gare.
                const imprimable = !!courrier.garedepart && !!courrier.garearrivee && peutAgirDepart

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
                                <a href={`/courrier/${courrier.id}`}>Voir</a>
                            </DropdownMenuItem>

                            {editable && <DropdownMenuSeparator />}
                            {editable && (
                                <DropdownMenuItem asChild>
                                    <a href={`/courrier/${courrier.id}/modifier`}>Modifier</a>
                                </DropdownMenuItem>
                            )}

                            {livrable && <DropdownMenuSeparator />}
                            {livrable && (
                                <DropdownMenuItem asChild>
                                    <form
                                        method="POST"
                                        action={`/courrier/${courrier.id}/livrer`}
                                        onSubmit={(e) => {
                                            if(!confirm("Confirmer la livraison de ce courrier ?")) {
                                                e.preventDefault()
                                            }
                                        }}
                                    >
                                        <button type="submit" className="w-full text-left text-green-600 focus:text-green-700">
                                            Confirmer la livraison
                                        </button>
                                    </form>
                                </DropdownMenuItem>
                            )}

                            {imprimable && <DropdownMenuSeparator />}
                            {imprimable && (
                                <DropdownMenuItem asChild>
                                    <a href={`/courrier/${courrier.id}/print`} target="_blank">
                                        Imprimer le reçu
                                    </a>
                                </DropdownMenuItem>
                            )}

                            {perduable && <DropdownMenuSeparator />}
                            {perduable && (
                                <DropdownMenuItem asChild>
                                    <form
                                        method="POST"
                                        action={`/courrier/${courrier.id}/perdu`}
                                        onSubmit={(e) => {
                                            if(!confirm("Déclarer ce courrier comme perdu ?")) {
                                                e.preventDefault()
                                            }
                                        }}
                                    >
                                        <button type="submit" className="w-full text-left text-orange-600 focus:text-orange-700">
                                            Déclarer perdu
                                        </button>
                                    </form>
                                </DropdownMenuItem>
                            )}

                            {annulable && <DropdownMenuSeparator />}
                            {annulable && (
                                <DropdownMenuItem asChild>
                                    <form
                                        method="POST"
                                        action={`/courrier/${courrier.id}/annuler`}
                                        onSubmit={(e) => {
                                            if(!confirm("Annuler ce courrier ?")) {
                                                e.preventDefault()
                                            }
                                        }}
                                    >
                                        <button type="submit" className="w-full text-left text-red-600 focus:text-red-700">
                                            Annuler
                                        </button>
                                    </form>
                                </DropdownMenuItem>
                            )}

                            {deletable && <DropdownMenuSeparator />}
                            {deletable && (
                                <DropdownMenuItem asChild>
                                    <form
                                        method="POST"
                                        action={`/courrier/${courrier.id}/supprimer`}
                                        onSubmit={(e) => {
                                            if (!confirm("Supprimer ce courrier ?")) {
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
            }
        }
    ]
}

export default function CourrierTable({
    items,
    meta,
    queryParams,
    gares,
    voyages,
    canEdit,
    canDelete,
    csrfDelete,
    userGareId,
    isAdmin
}: Props)
{
    const { getSortState, getSortToggleUrl, getSortExplicitUrl } = useServerTable(queryParams)
    const columns = useMemo(
        () => buildColumns(getSortToggleUrl, getSortExplicitUrl, getSortState, canEdit, canDelete, csrfDelete, userGareId, isAdmin),
        [queryParams, canEdit, canDelete, csrfDelete, userGareId, isAdmin]
    )
    const filters: ServerTableFilter[] = useMemo(() => {
        const list: ServerTableFilter[] = [
            {
                type: 'text',
                name: 'search',
                label: 'Recherche',
                placeholder: 'CRR..',
            },
            {
                type: 'select',
                name: 'statut',
                label: 'Statut',
                options: Object.entries(statutConfig).map(([value, { label }]) => ({ value, label })),
            },
            {
                type: 'select',
                name: 'voyage',
                label: 'Voyage',
                options: voyages.map((v) => ({ value: `${v.id}`, label: `${v.codevoyage} : ${v.provenance} → ${v.destination}` })),
            },
        ]

        // Filtres par gare : réservés à l'admin entreprise / un utilisateur central sans gare.
        // Un agent rattaché à une gare ne voit déjà que les courriers de sa gare (scope backend).
        if(isAdmin || userGareId == null) {
            list.push(
                {
                    type: 'select',
                    name: 'garedepart',
                    label: 'Gare de départ',
                    options: gares.map((g) => ({ value: `${g.id}`, label: `${g.libelle} (${g.ville})` })),
                },
                {
                    type: 'select',
                    name: 'garearrivee',
                    label: 'Gare d\'arrivée',
                    options: gares.map((g) => ({ value: `${g.id}`, label: `${g.libelle} (${g.ville})` })),
                },
            )
        }

        list.push({
            type: 'date_range',
            name: 'date',
            label: 'Période',
        })

        return list
    }, [gares, voyages, isAdmin, userGareId])

    return (
        <ServerDataTable
            columns={columns}
            data={items}
            meta={meta}
            queryParams={queryParams}
            filters={filters}
        />
    )
}