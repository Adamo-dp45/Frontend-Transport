import { Gare } from "./gare.model"
import { Siege } from "./siege.model"
import { Voyage } from "./voyage.model"

export type TicketStatut = "VALIDE" | "REPORTE" | "ANNULE"

export interface Ticket {
    id: number
    siege: Siege
    nomclient?: string
    contactclient?: string
    prix: number // prix NET payé (tarif - remise)
    remise?: number // montant de la remise (FCFA), 0 si aucune
    codeticket: string
    voyage: Voyage
    createdAt: string
    gare: Gare
    garedescente: Gare
    statut: TicketStatut
    // Renseigné sur un billet issu d'un REPORT : pointe vers le billet désisté d'origine
    ticketOrigine?: { id: number; codeticket: string } | null
    // Billet émis comme récompense de fidélité (carte à tampons)
    fideliteRecompense?: boolean
}
