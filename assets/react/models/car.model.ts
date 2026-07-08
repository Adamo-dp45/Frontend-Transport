import { Libelle } from "./libelle.model"

export interface Car {
    id: number
    matricule: string
    nbrsiege: number
    datearrivee: string | null
    etat: string
    marque: Libelle | null
    typevehicule: Libelle | null
    modelvehicule: Libelle | null
}