import { Gare } from "./gare.model"
import { Voyage } from "./voyage.model"

export type ReservationStatut = "EN_ATTENTE" | "CONFIRMEE" | "A_REGULARISER" | "EXPIREE" | "ANNULEE"

export interface Reservation {
    id: number
    code: string
    nomclient?: string | null
    contactclient?: string | null
    prix: number
    statut: ReservationStatut
    dateexpiration: string
    source: "GUICHET" | "MOBILE"
    etatpaiement: string
    voyage: Voyage
    gare: Gare
    garedescente: Gare
    ticket?: { id: number; codeticket: string } | null
    createdAt: string
}
