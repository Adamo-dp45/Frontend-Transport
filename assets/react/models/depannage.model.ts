import { Car } from "./car.model"
import { Detailpersonnel } from "./detailpersonnel.model"
import { Libelle } from "./libelle.model"
import { Piece } from "./piece.model"

interface Detaildepannage{
    quantite: number
    piece: Piece
    prixunitaire: number
}

export interface Depannage {
    id: number
    datedepannage: string
    lieudepannage: string
    description: string
    // Listes complètes : uniquement sur la FICHE (groupe 'read:Depannage:item').
    detaildepannages?: Detaildepannage[]
    detailpersonnels?: Detailpersonnel[]
    // Agrégats fournis par l'API pour la LISTE (COUNT + SUM côté base) — le client n'additionne plus rien.
    detailpersonnelsCount: number
    detaildepannagesCount: number
    piecesQuantiteTotale: number
    car: Car
    typepanne: Libelle
    couttotal: number
    statut: string
    createdAt: string
}