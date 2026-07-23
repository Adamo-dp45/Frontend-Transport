import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
import { Button } from "../../../components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"
import { Badge } from "../../../components/ui/badge"
import { useMemo } from "react"
import { formatDate } from "../../../lib/functions"
import { ServerMeta, ServerTableFilter, useServerTable } from "../../hooks/useServerTable"
import { ServerDataTableColumnHeader } from "../../components/server/server-data-table-column-header"
import { ServerDataTable } from "../../components/server/server-data-table"
import { Reservation } from "../../models/reservation.model"
import { Voyage } from "../../models/voyage.model"

type Props = {
    reservations: Reservation[],
    meta: ServerMeta
    queryParams: Record<string, string>
    voyages: Voyage[]
    canEdit: boolean
    csrfConfirmer: string
    csrfEmettre: string
    csrfAnnuler: string
    userGareId: number | null   // gare de l'agent (null = central/admin) : seule la gare de MONTÉE agit
    isAdmin: boolean
}

const STATUT_LABELS: Record<string, string> = { EN_ATTENTE: "En attente", CONFIRMEE: "Payée", A_REGULARISER: "À régulariser", EXPIREE: "Expirée", ANNULEE: "Annulée" }
const STATUT_STYLES: Record<string, string> = {
    EN_ATTENTE: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    CONFIRMEE:  "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    A_REGULARISER: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
    EXPIREE:    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    ANNULEE:    "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
}

function buildColumns(
    getSortToggleUrl: (f: string) => string,
    getSortExplicitUrl: (f: string, dir: 'asc' | 'desc') => string,
    getSortState: (f: string) => 'asc' | 'desc' | false,
    canEdit: boolean,
    csrfConfirmer: string,
    csrfEmettre: string,
    csrfAnnuler: string,
    userGareId: number | null,
    isAdmin: boolean
): ColumnDef<Reservation>[] {

    const sortUrls = (field: string) => ({
        toggle: getSortToggleUrl(field),
        asc: getSortExplicitUrl(field, 'asc'),
        desc: getSortExplicitUrl(field, 'desc'),
    })

    return [
        {
            accessorKey: "code",
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Code" sortUrls={sortUrls('code')} sortState={getSortState('code')} />
            ),
            cell: ({ row }) => <span className="font-medium">{row.original.code}</span>
        },
        {
            id: "client",
            header: "Client",
            cell: ({ row }) => (
                <div className="text-sm leading-tight">
                    <span className="font-medium">{row.original.nomclient ?? "—"}</span>
                    {row.original.contactclient && <span className="block text-xs text-muted-foreground">{row.original.contactclient}</span>}
                </div>
            )
        },
        {
            id: "trajet",
            header: "Trajet",
            cell: ({ row }) => (
                <span className="text-sm">{row.original.gare?.libelle ?? '—'} → {row.original.garedescente?.libelle ?? '—'}</span>
            )
        },
        {
            id: "voyage",
            header: "Voyage",
            cell: ({ row }) => <span className="tabular-nums text-sm">{row.original.voyage?.codevoyage ?? '—'}</span>
        },
        {
            accessorKey: "prix",
            header: "Prix",
            cell: ({ row }) => <span className="tabular-nums font-semibold">{row.original.prix.toLocaleString("fr-FR")} FCFA</span>
        },
        {
            accessorKey: "statut",
            header: "Statut",
            cell: ({ row }) => {
                const s = row.original.statut
                return (
                    <div className="flex flex-col gap-0.5 items-start">
                        <Badge className={STATUT_STYLES[s] ?? ""}>{STATUT_LABELS[s] ?? s}</Badge>
                        {row.original.ticket ? (
                            <a href={`/ticket/${row.original.ticket.id}`} className="text-[11px] text-primary hover:underline">
                                → {row.original.ticket.codeticket}
                            </a>
                        ) : row.original.statut === "CONFIRMEE" ? (
                            <span className="text-[11px] text-muted-foreground">billet à émettre</span>
                        ) : row.original.statut === "A_REGULARISER" && (
                            <span className="text-[11px] text-orange-600 dark:text-orange-400">report + pénalité</span>
                        )}
                    </div>
                )
            }
        },
        {
            accessorKey: "dateexpiration",
            header: "Échéance",
            /*
                L'échéance change de NATURE au paiement (cf. ReservationConfirmationService) :
                 - EN_ATTENTE : limite de PAIEMENT (passé ce délai, la réservation est perdue) ;
                 - CONFIRMEE  : limite de PRÉSENTATION au guichet (au-delà → no-show à régulariser).
                Elle était masquée pour les payées, alors que c'est justement l'heure à laquelle le
                client perd sa place tenue : on l'affiche avec sa signification.
            */
            cell: ({ row }) => {
                const { statut, dateexpiration, ticket } = row.original
                /*
                    Billet émis = réservation terminée : plus aucune échéance ne court. On l'affichait
                    quand même, et après une régularisation (report sur un autre départ) 'dateexpiration'
                    pointe encore sur l'ANCIEN départ → on aurait montré une date passée trompeuse.
                */
                if (ticket || !dateexpiration || (statut !== "EN_ATTENTE" && statut !== "CONFIRMEE")) {
                    return <span className="text-muted-foreground">—</span>
                }
                return (
                    <div className="leading-tight">
                        <span className="text-sm tabular-nums">{formatDate(dateexpiration)}</span>
                        <span className="block text-[11px] text-muted-foreground">
                            {statut === "EN_ATTENTE" ? "paiement" : "présentation"}
                        </span>
                    </div>
                )
            }
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const r = row.original
                const enAttente = r.statut === "EN_ATTENTE"
                const aEmettre = r.statut === "CONFIRMEE" && !r.ticket
                // Seule la gare de MONTÉE agit (confirme/émet/annule) ; la descente ne fait que voir.
                const peutAgir = isAdmin || userGareId == null || r.gare?.id === userGareId
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Ouvrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                                <a href={`/reservation/${r.id}`}>Voir</a>
                            </DropdownMenuItem>

                            {canEdit && enAttente && peutAgir && <DropdownMenuSeparator />}

                            {canEdit && enAttente && peutAgir && (
                                <DropdownMenuItem asChild>
                                    <form
                                        method="POST"
                                        action={`/reservation/${r.id}/confirmer`}
                                        onSubmit={(e) => {
                                            if(!confirm("Encaisser le paiement ? La place sera payée ; le siège/billet s'émet ensuite.")) {
                                                e.preventDefault()
                                            }
                                        }}
                                    >
                                        <input type="hidden" name="_token" value={csrfConfirmer} />
                                        <button type="submit" className="w-full text-left text-green-600 focus:text-green-700 font-medium">
                                            Encaisser (payer)
                                        </button>
                                    </form>
                                </DropdownMenuItem>
                            )}

                            {canEdit && aEmettre && peutAgir && (
                                <DropdownMenuItem asChild>
                                    <form
                                        method="POST"
                                        action={`/reservation/${r.id}/emettre-billet`}
                                        onSubmit={(e) => {
                                            if(!confirm("Émettre le billet ? Un siège libre sera attribué au client (car requis).")) {
                                                e.preventDefault()
                                            }
                                        }}
                                    >
                                        <input type="hidden" name="_token" value={csrfEmettre} />
                                        <button type="submit" className="w-full text-left text-primary focus:text-primary font-medium">
                                            Émettre le billet
                                        </button>
                                    </form>
                                </DropdownMenuItem>
                            )}

                            {canEdit && enAttente && peutAgir && (
                                <DropdownMenuItem asChild>
                                    <form
                                        method="POST"
                                        action={`/reservation/${r.id}/annuler`}
                                        onSubmit={(e) => {
                                            if(!confirm("Annuler cette réservation ?")) {
                                                e.preventDefault()
                                            }
                                        }}
                                    >
                                        <input type="hidden" name="_token" value={csrfAnnuler} />
                                        <button type="submit" className="w-full text-left text-red-600 focus:text-red-700">
                                            Annuler
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

export default function ReservationTable({ reservations, meta, queryParams, voyages, canEdit, csrfConfirmer, csrfEmettre, csrfAnnuler, userGareId, isAdmin }: Props) {
    const { getSortState, getSortToggleUrl, getSortExplicitUrl } = useServerTable(queryParams)
    const columns = useMemo(
        () => buildColumns(getSortToggleUrl, getSortExplicitUrl, getSortState, canEdit, csrfConfirmer, csrfEmettre, csrfAnnuler, userGareId, isAdmin),
        [queryParams, canEdit, csrfConfirmer, csrfEmettre, csrfAnnuler, userGareId, isAdmin]
    )

    const filters: ServerTableFilter[] = useMemo(() => [
        { type: 'text', name: 'search', label: 'Code', placeholder: 'RES-..' },
        {
            type: 'select', name: 'voyage', label: 'Voyage',
            options: voyages.map(v => ({ value: String(v.id), label: `${v.codevoyage} : ${v.provenance} → ${v.destination}` }))
        },
        {
            type: 'select', name: 'statut', label: 'Statut',
            options: [
                { value: 'EN_ATTENTE', label: 'En attente' },
                { value: 'CONFIRMEE', label: 'Confirmée' },
                { value: 'A_REGULARISER', label: 'À régulariser' },
                { value: 'EXPIREE', label: 'Expirée' },
                { value: 'ANNULEE', label: 'Annulée' },
            ]
        },
    ], [voyages])

    return (
        <ServerDataTable
            columns={columns}
            data={reservations}
            meta={meta}
            queryParams={queryParams}
            filters={filters}
        />
    )
}
