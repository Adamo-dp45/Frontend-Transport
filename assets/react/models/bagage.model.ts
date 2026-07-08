import { Gare } from "./gare.model"
import { Voyage } from "./voyage.model"

export interface Bagage {
    id: number
    codebagage: string
    // Identité du client : provient du billet rattaché (bagage.ticket), plus de champs propres au bagage.
    nature: string
    type?: string
    poids: string
    montant: number
    montantforce: boolean
    statut: string
    voyage?: Voyage
    ticket?: {
        id: number
        codeticket?: string
        nomclient?: string
        contactclient?: string
        gare?: Gare
        garedescente?: Gare
    }
    garedepart?: Gare
    garedescente?: Gare
    createdAt: string
}