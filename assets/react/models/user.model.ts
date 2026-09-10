import { Gare } from "./gare.model"

export interface User {
    id: number
    email: string
    nom: string
    prenom: string
    fileUrl?: string
    statut: string
    roles: string[]
    founder?: boolean // clé réellement sérialisée (accesseur 'isFounder()' → propriété 'founder')
    /*
        Le LECTEUR peut-il gérer cet utilisateur (modifier, suspendre) ? Décidé par le SERVEUR
        (UserManagementGuard, posé par UserProvider) : hiérarchie, périmètre de gare et
        interdiction de se gérer soi-même. Le front en tenait un miroir qui a divergé.
    */
    gerable?: boolean
    gare: Gare | null
}