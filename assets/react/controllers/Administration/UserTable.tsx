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
import { useMemo } from "react"
import { ServerMeta, ServerTableFilter, useServerTable } from "../../hooks/useServerTable"
import { ServerDataTableColumnHeader } from "../../components/server/server-data-table-column-header"
import { ServerDataTable } from "../../components/server/server-data-table"
import { Badge } from "../../../components/ui/badge"
import { User } from "../../models/user.model"

type Props = {
    users: User[]
    meta: ServerMeta
    queryParams: Record<string, string>
    canEdit: boolean
    currentUserId: number // Pour empêcher l'auto suspension
    currentUserGareId: number | null // gare de l'acteur (périmètre)
    isAdmin: boolean // ROLE_ADMIN entreprise
    csrfDelete: string
    apiUrl: string
    isSuperAdmin: boolean
    canSuspend: boolean // peut suspendre : ROLE_ADMIN / SUPER / ADMIN_GARE (pas un simple USER_MODIFIER)
    // currentUserRoles: string[]
    canPromouvoirAdminGare: boolean // true si ROLE_ADMIN
    csrfPromouvoirAdminGare: string
    currentUserIsFounder?: boolean
    canFilterGare?: boolean // filtre gare visible seulement pour l'admin entreprise
    gares?: { id: number; libelle: string; ville?: string }[]
}

/**
 * Périmètre de gestion (édition / suspension) — miroir frontend du UserManagementGuard backend.
 * super admin : tout ; admin entreprise : admins de gare + utilisateurs ; admin de gare / utilisateur :
 * uniquement les utilisateurs SIMPLES de SA gare. Jamais soi-même, ni le fondateur, ni un admin entreprise.
 */
function canManageUser(
    target: User,
    currentUserId: number,
    isSuperAdmin: boolean,
    currentIsAdmin: boolean,
    currentUserGareId: number | null
): boolean {
    if (target.id === currentUserId) return false
    // Un super administrateur ne peut être ni suspendu ni modifié par autrui (même par un autre super admin) :
    // miroir frontend du UserManagementGuard backend.
    if (target.roles.includes('ROLE_SUPER_ADMIN')) return false
    if (isSuperAdmin) return true
    if (target.isFounder) return false
    if (target.roles.includes('ROLE_ADMIN')) return false
    if (currentIsAdmin) return true
    // Acteur non-admin rattaché à une gare : utilisateurs simples de SA gare uniquement
    if (currentUserGareId) {
        if (target.roles.includes('ROLE_ADMIN_GARE')) return false
        return !!target.gare && target.gare.id === currentUserGareId
    }
    // Utilisateur central sans gare (avec permissions sur User) : gère tout le monde restant
    return true
}

function buildColumns(
    getSortToggleUrl: (f: string) => string,
    getSortExplicitUrl: (f: string, dir: 'asc' | 'desc') => string,
    getSortState: (f: string) => 'asc' | 'desc' | false,
    canEdit: boolean,
    currentUserId: number,
    currentUserGareId: number | null,
    currentIsAdmin: boolean,
    csrfDelete: string,
    apiUrl: string,
    isSuperAdmin: boolean,
    canSuspend: boolean,
    // currentUserRoles: string[],
    canPromouvoirAdminGare: boolean,
    csrfPromouvoirAdminGare: string,
    currentUserIsFounder?: boolean
): ColumnDef<User>[] {

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
            accessorKey: "email",
            header: "Email"
        },
        {
            accessorKey: "nom",
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Nom" sortUrls={sortUrls('nom')} sortState={getSortState('nom')} />
            )
        },
        {
            accessorKey: "prenom",
            header: ({ column }) => (
                <ServerDataTableColumnHeader column={column} title="Prenom" sortUrls={sortUrls('prenom')} sortState={getSortState('prenom')} />
            )
        },
        {
            accessorKey: "statut",
            header: "Statut",
            cell: ({ row }) => {
                const statut = row.original.statut
                const cls = statut === 'ACTIF' ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                return (
                    <Badge className={cls}>
                        {statut === 'ACTIF' ? 'Actif' : 'Suspendu'}
                    </Badge>
                )
            }
        },
        {
            id: 'role',
            header: 'Rôle',
            cell: ({ row }) => {
                const isFounder = row.original.isFounder
                const isAdmin = row.original.roles.includes('ROLE_ADMIN')
                const isAdminGare = row.original.roles.includes('ROLE_ADMIN_GARE')
                const isSuperAdmin = row.original.roles.includes('ROLE_SUPER_ADMIN')
                if(isFounder) {
                    return <Badge className="bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
                        👑 Fondateur
                    </Badge>
                }
                if(isAdminGare) {
                    return <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">Admin de gare</Badge>
                }
                if(isSuperAdmin) {
                    return <Badge className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300">Super admin</Badge>
                }
                return isAdmin
                    ? <Badge className="bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">Admin</Badge>
                    : <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">Utilisateur</Badge>
            }
        },
        {
            id: 'gare',
            header: 'Gare',
            cell: ({ row }) => {
                const gare = row.original.gare
                if(!gare) {
                    return <span className="text-muted-foreground text-xs">Aucune</span>
                }
                return <span className="text-sm">{gare.libelle}{gare.ville ? ` - ${gare.ville}` : ''}</span>
            }
        },
        {
            id: "fileUrl",
            header: "",
            cell: ({ row }) => {
                const user = row.original
                const initiales = `${user.prenom.charAt(0)}${user.nom.charAt(0)}`.toUpperCase()
                return (
                    <div className="flex items-center justify-center">
                        {user.fileUrl ? (
                            <img
                                src={`${apiUrl}/media${user.fileUrl}?w=400&h=400&fm=jpg&fit=crop`}
                                alt={`${user.prenom} ${user.nom}`}
                                className="h-8 w-8 rounded-full object-cover shrink-0"
                            />
                        ) : (
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                                {initiales}
                            </div>
                        )}
                    </div>
                )
            }
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const user = row.original
                const isAdmin = user.roles.includes('ROLE_ADMIN')
                const isSelf = user.id === currentUserId
                const isAdminGare = user.roles.includes('ROLE_ADMIN_GARE')
                const hasGare = !!user.gare
                // Périmètre de gestion aligné sur le backend (hiérarchie + périmètre gare)
                const allowed = canManageUser(user, currentUserId, isSuperAdmin, currentIsAdmin, currentUserGareId)
                const editable = allowed && canEdit && !isSuperAdmin // modification (USER_MODIFIER)
                const suspendable = allowed && canSuspend                // suspension : admins entreprise/super/admin de gare uniquement
                const promouvable = currentUserIsFounder && !isSelf && !user.isFounder && !isAdminGare && (isAdmin || !hasGare) /*
                    - On ne peut pas promouvoir en administrateur entreprise si ce n'est pas le fondateur qui agit, si c'est soi même, si la cible est le fondateur, si elle est administrateur de gare, ou si elle est encore liée à une gare (il faut d'abord lui retirer sa gare). Le '(isAdmin || !hasGare)' laisse la rétrogradation possible pour un admin existant
                */
                const peutAdminGare = canPromouvoirAdminGare && !isSelf && !user.isFounder && !isAdmin /*
                    - On.. gare si ce n'est pas un administrateur d'entreprise qui agit, si.. et si l'utilisateur est administrateur entreprise
                */
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
                                <a href={`/admin/utilisateurs/${user.id}`}>Voir</a>
                            </DropdownMenuItem>

                            {editable &&<DropdownMenuSeparator />}
                            {editable &&(
                                <DropdownMenuItem asChild>
                                    <a href={`/admin/utilisateurs/${user.id}/modifier`}>Modifier</a>
                                </DropdownMenuItem>
                            )}

                            {suspendable && <DropdownMenuSeparator />}
                            {suspendable && (
                                <DropdownMenuItem asChild>
                                    <form
                                        method="POST"
                                        action={`/admin/utilisateurs/${user.id}/suspendre`}
                                        onSubmit={(e) => {
                                            const action = user.statut === 'ACTIF' ? 'suspendre' : 'réactiver'
                                            if (!confirm(`Voulez-vous ${action} cet utilisateur ?`)) {
                                                e.preventDefault()
                                            }
                                        }}
                                    >
                                        <input type="hidden" name="_token" value={csrfDelete} />
                                        <button
                                            type="submit"
                                            className={`w-full text-left ${user.statut === 'ACTIF' ? 'text-orange-600 focus:text-orange-700' : 'text-green-600 focus:text-green-700'}`}
                                        >
                                            {user.statut === 'ACTIF' ? 'Suspendre' : 'Réactiver'}
                                        </button>
                                    </form>
                                </DropdownMenuItem>
                            )}

                            {peutAdminGare && <DropdownMenuSeparator />}
                            {peutAdminGare && (
                                <DropdownMenuItem asChild>
                                    {!isAdminGare && !hasGare ? (
                                        <button type="button" disabled title="L'utilisateur doit être lié à une gare" className="w-full text-left text-muted-foreground opacity-50 cursor-not-allowed">
                                            Nommer admin de gare
                                        </button>
                                    ) : (
                                        <form method="post" action={`/admin/utilisateurs/${user.id}/promouvoir/gare`}
                                            onSubmit={(e) => {
                                                const action = isAdminGare ? 'révoquer comme administrateur de gare' : 'nommer administrateur de gare'
                                                if(!confirm(`Voulez-vous ${action} cet utilisateur ?`)) {
                                                    e.preventDefault()
                                                }
                                            }}
                                        >
                                            <input type="hidden" name="_token" value={csrfPromouvoirAdminGare} />
                                            <button type="submit" className={`w-full text-left ${isAdminGare ? 'text-orange-600' : 'text-green-600'}`}>
                                                {isAdminGare ? 'Révoquer admin de gare' : 'Nommer admin de gare'}
                                            </button>
                                        </form>
                                    )}
                                </DropdownMenuItem>
                            )}

                            {promouvable && <DropdownMenuSeparator />}
                            {promouvable && (
                                <DropdownMenuItem asChild>
                                    <form
                                        method="POST"
                                        action={`/admin/utilisateurs/${user.id}/promouvoir`}
                                        onSubmit={(e) => {
                                            const isAdmin = user.roles.includes('ROLE_ADMIN')
                                            const action = isAdmin ? 'rétrograder en utilisateur standard' : 'promouvoir en administrateur'
                                            if(!confirm(`Voulez-vous ${action} cet utilisateur ?`)) {
                                                e.preventDefault()
                                            }
                                        }}
                                    >
                                        <button
                                            type="submit"
                                            className={`w-full text-left ${user.roles.includes('ROLE_ADMIN')
                                                ? 'text-muted-foreground focus:text-foreground'
                                                : 'text-blue-600 focus:text-blue-700'
                                            }`}
                                        >
                                            {user.roles.includes('ROLE_ADMIN')
                                                ? 'Rétrograder en utilisateur'
                                                : 'Promouvoir en administrateur'
                                            }
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

export default function UserTable({
    users,
    meta,
    queryParams,
    canEdit,
    currentUserId,
    currentUserGareId,
    isAdmin,
    csrfDelete,
    apiUrl,
    isSuperAdmin,
    canSuspend,
    currentUserIsFounder,
    canPromouvoirAdminGare,
    csrfPromouvoirAdminGare,
    canFilterGare = false,
    gares = []
}: Props)
{
    const { getSortState, getSortToggleUrl, getSortExplicitUrl } = useServerTable(queryParams)
    const columns = useMemo(
        () => buildColumns(getSortToggleUrl, getSortExplicitUrl, getSortState, canEdit, currentUserId, currentUserGareId, isAdmin, csrfDelete, apiUrl, isSuperAdmin, canSuspend, canPromouvoirAdminGare, csrfPromouvoirAdminGare, currentUserIsFounder),
        [queryParams, canEdit, currentUserId, currentUserGareId, isAdmin, csrfDelete, apiUrl, isSuperAdmin, canSuspend, canPromouvoirAdminGare, csrfPromouvoirAdminGare, currentUserIsFounder]
    )

    const filters: ServerTableFilter[] = useMemo(() => {
        const base: ServerTableFilter[] = [
            {
                type: 'text',
                name: 'search',
                label: 'Nom',
                placeholder: 'Filtrer par nom..',
            },
            {
                type: 'text',
                name: 'email',
                label: 'Email',
                placeholder: 'Filtrer par email..'
            },
            {
                type: 'select',
                name: 'statut',
                label: 'Statut',
                options: [
                    { value: 'ACTIF',    label: 'Actif' },
                    { value: 'SUSPENDU', label: 'Suspendu' }
                ]
            }
        ]
        // Filtre gare : réservé à l'administrateur d'entreprise
        if (canFilterGare && gares.length > 0) {
            base.push({
                type: 'select',
                name: 'gare',
                label: 'Gare',
                options: gares.map((g) => ({
                    value: `${g.id}`,
                    label: g.ville ? `${g.libelle} - ${g.ville}` : g.libelle,
                })),
            })
        }
        return base
    }, [canFilterGare, gares])

    return (
        <ServerDataTable
            columns={columns}
            data={users}
            meta={meta}
            queryParams={queryParams}
            filters={filters}
        />
    )
}