import { ColumnDef } from "@tanstack/react-table"
import { ExternalLink } from "lucide-react"
import { useMemo } from "react"
import { Badge } from "../../../components/ui/badge"
import { formatDate } from "../../../lib/functions"
import { ServerMeta, ServerTableFilter, useServerTable } from "../../hooks/useServerTable"
import { ServerDataTableColumnHeader } from "../../components/server/server-data-table-column-header"
import { ServerDataTable } from "../../components/server/server-data-table"

type Agent = { id: number; nom?: string | null; prenom?: string | null }

type Caisse = {
    id: number
    agent: Agent | null
    gare: { id: number; libelle: string } | null
    datedebut: string
    datefin: string | null
    fondsouverture: number
    montantcompte: number | null
    montanttheorique: number | null
    ecart: number | null
    motifecart: string | null
    statut: string
    ouvertureautomatique: boolean
    url: string
}

type Props = {
    caisses: Caisse[]
    meta: ServerMeta
    queryParams: Record<string, string>
    statuts: Record<string, string>
}

const STATUT_CFG: Record<string, { cls: string; label: string }> = {
    OUVERTE: { cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300", label: "Ouverte" },
    CLOTUREE: { cls: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300", label: "Clôturée" },
}

const fcfa = (valeur: number) => valeur.toLocaleString("fr-FR").replace(/ | /g, " ")

function buildColumns(
    getSortToggleUrl: (f: string) => string,
    getSortExplicitUrl: (f: string, dir: 'asc' | 'desc') => string,
    getSortState: (f: string) => 'asc' | 'desc' | false,
): ColumnDef<Caisse>[] {
    const sortUrls = (field: string) => ({
        toggle: getSortToggleUrl(field),
        asc: getSortExplicitUrl(field, 'asc'),
        desc: getSortExplicitUrl(field, 'desc'),
    })

    return [
        {
            id: 'agent',
            header: "Agent",
            cell: ({ row }) => {
                const agent = row.original.agent
                const nom = agent ? `${agent.prenom ?? ''} ${agent.nom ?? ''}`.trim() : ''
                return (
                    <div>
                        <div className="font-medium">{nom !== '' ? nom : '—'}</div>
                        <div className="text-muted-foreground text-sm">{row.original.gare?.libelle ?? '—'}</div>
                    </div>
                )
            },
        },
        {
            accessorKey: 'datedebut',
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Ouverture" sortUrls={sortUrls('datedebut')} sortState={getSortState('datedebut')} />
            ),
            cell: ({ row }) => (
                <div>
                    <span className="tabular-nums">{formatDate(row.original.datedebut)}</span>
                    {/* Une caisse ouverte par une vente signale un agent qui a commencé sans prendre
                        de fonds : ce n'est pas une faute, c'est ce qu'on cherche quand le tiroir ne
                        tombe pas juste le soir. */}
                    {row.original.ouvertureautomatique && (
                        <div className="text-muted-foreground text-xs">ouverte par une vente</div>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'datefin',
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Clôture" sortUrls={sortUrls('datefin')} sortState={getSortState('datefin')} />
            ),
            cell: ({ row }) => (
                <span className="tabular-nums">{row.original.datefin ? formatDate(row.original.datefin) : '—'}</span>
            ),
        },
        {
            id: 'montantcompte',
            header: () => <div className="text-right">Compté</div>,
            cell: ({ row }) => (
                <div className="text-right tabular-nums">
                    {row.original.montantcompte !== null ? fcfa(row.original.montantcompte) : '—'}
                </div>
            ),
        },
        {
            accessorKey: 'ecart',
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Écart" sortUrls={sortUrls('ecart')} sortState={getSortState('ecart')} />
            ),
            cell: ({ row }) => {
                const ecart = row.original.ecart
                if (ecart === null) return <div className="text-right text-muted-foreground">—</div>
                /* Un écart NUL se dit, il ne se tait pas : c'est lui qui atteste qu'on a compté.
                   Et un excédent n'est pas une bonne nouvelle — monnaie mal rendue, ou vente
                   encaissée sans être saisie. */
                if (ecart === 0) {
                    return <div className="text-right"><Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">juste</Badge></div>
                }
                const cls = ecart < 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-amber-600 dark:text-amber-400"
                /* ATTENDU NÉGATIF : il est sorti de cette caisse plus d'argent qu'il n'y est
                   entré, donc les remboursements ont été payés avec des espèces venues d'ailleurs
                   — que rien ne permet encore de saisir. L'écart ne mesure alors rien, et c'est
                   dans une LISTE qu'il faut le dire : c'est là qu'on compare les agents entre eux,
                   et une ligne fausse s'y lit comme les autres. */
                const inexploitable = (row.original.montanttheorique ?? 0) < 0
                return (
                    <div className="text-right">
                        <div className={`tabular-nums font-medium ${cls}`}>{ecart > 0 ? '+' : ''}{fcfa(ecart)}</div>
                        {inexploitable && (
                            <div className="text-amber-600 dark:text-amber-400 text-xs">non exploitable</div>
                        )}
                        {row.original.motifecart && (
                            <div className="text-muted-foreground text-xs truncate max-w-[240px]">{row.original.motifecart}</div>
                        )}
                    </div>
                )
            },
        },
        {
            accessorKey: 'statut',
            header: "Statut",
            cell: ({ row }) => {
                const cfg = STATUT_CFG[row.original.statut] ?? { cls: "bg-gray-100 text-gray-600", label: row.original.statut }
                return <Badge className={cfg.cls}>{cfg.label}</Badge>
            },
        },
        {
            id: 'actions',
            cell: ({ row }) => (
                <a href={row.original.url} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                    <ExternalLink className="h-3.5 w-3.5" /> Détail
                </a>
            ),
        },
    ]
}

export default function CaisseTable({ caisses, meta, queryParams, statuts }: Props) {
    const { getSortState, getSortToggleUrl, getSortExplicitUrl } = useServerTable(queryParams)
    const columns = useMemo(
        () => buildColumns(getSortToggleUrl, getSortExplicitUrl, getSortState),
        [queryParams]
    )

    /* Le filtre qu'on vient chercher ici est l'ÉCART, et il se lit par le TRI : cliquer sur la
       colonne met les manquants en tête. Un select à trois états demanderait deux paramètres
       distincts côté API ('ecart[lt]' et 'ecart[gt]'), pour le même résultat. */
    const filters: ServerTableFilter[] = useMemo(() => [
        {
            type: 'select',
            name: 'statut',
            label: 'Statut',
            options: Object.entries(statuts).map(([value, label]) => ({ value, label })),
        },
        {
            /* La PÉRIODE, et pas seulement pour filtrer l'écran : c'est elle que le bouton
               « Récapitulatif » reprend pour son PDF. Sans ce filtre, le bouton imprimait le mois
               en cours quoi qu'on regarde — un imprimé qui ne correspond pas au tableau d'où on
               l'a lancé est la meilleure façon de discuter deux chiffres différents en réunion. */
            type: 'date_range',
            name: 'date',
            label: 'Période',
        },
    ], [statuts])

    return (
        <ServerDataTable
            columns={columns}
            data={caisses}
            meta={meta}
            queryParams={queryParams}
            filters={filters}
        />
    )
}
