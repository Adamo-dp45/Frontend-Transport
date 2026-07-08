import { GareRef } from "./ligne.model"

export interface Tarif {
    id: number
    garedepart: GareRef
    garearrivee: GareRef
    montant: number
}
