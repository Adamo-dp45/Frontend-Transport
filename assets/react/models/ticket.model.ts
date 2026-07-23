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
    /*
        ÉVINCÉ par la priorité amont : à sa gare de montée, le siège est déjà pris par un passager monté
        plus tôt → ce billet, bien que VALIDE, ne montera pas. DÉRIVÉ à la lecture par l'API (jamais
        stocké) : n'est fiable que sur la ressource /api/tickets. Cf. Ticket::isEvince côté backend.
    */
    evince?: boolean
    // Commercial (vendeur à bord) ayant émis ce billet, si vente en route (id seul exposé sur read:Ticket)
    commercial?: { id: number } | null
}
