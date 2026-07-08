import { Fournisseur } from "./fournisseur.model"
import { Piece } from "./piece.model"

interface Detailapprovisionnement {
    quantite: number
    prixunitaire: number
    piece: Piece
    couttotal: number
}

export interface Approvisionnement {
    id: number
    dateappro: string
    fournisseur: Fournisseur
    detailapprovisionnements: Detailapprovisionnement[]
    statut?: "VALIDE" | "ANNULE"
    createdAt: string
}