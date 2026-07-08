import { Permission } from "./permission.model"

export interface Role {
    id: number
    name: string
    description?: string
    typerole: string
    permissions: Permission[]
    // null = rôle entreprise (visible partout) ; sinon rôle propre à cette gare
    gare?: { id: number; libelle: string; ville?: string } | null
}