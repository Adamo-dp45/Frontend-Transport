import { Libelle } from "./libelle.model"

interface Image {
    contentUrl: string
}

export interface Piece {
    id: number
    libelle: string
    image: Image | null
    stockinitial: number
    prixunitaire: number
    typepiece: Libelle | null
    marquepiece: Libelle | null
    model: Libelle | null
    createdAt: string
}