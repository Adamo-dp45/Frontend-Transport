import { Gare } from "./gare.model"

export interface User {
    id: number
    email: string
    nom: string
    prenom: string
    fileUrl?: string
    statut: string
    roles: string[]
    isFounder?: boolean
    gare: Gare | null
}