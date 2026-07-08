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
    detaildepannages: Detaildepannage[]
    detailpersonnels: Detailpersonnel[]
    car: Car
    typepanne: Libelle
    couttotal: number
    statut: string
    createdAt: string
}