import { Libelle } from "./libelle.model"

interface Image {
    contentUrl: string
}

export interface Personnel {
    id: number
    nom: string
    prenom: string
    contact: string
    code: string
    image: Image | null
    typepersonnel: Libelle
    voyagesCount: number
    depannagesCount: number
    statut?: string
}