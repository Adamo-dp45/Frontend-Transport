import { Car } from "./car.model"
import { Detailpersonnel } from "./detailpersonnel.model"

interface Ref {
    id: number
    motif: string
}

interface LigneRef {
    id: number
    codeligne: string
    libelle: string | null
    gareorigine?: { id: number; libelle: string }
    gareterminus?: { id: number; libelle: string }
}

export interface Voyage {
    id: number
    codevoyage: string
    provenance: string
    destination: string
    datedepartprevue: string       // départ prévu
    datearriveeprevue: string | null  // arrivée prévue
    datedepartreelle: string | null   // départ réel (« le car a bougé »)
    datearriveereelle: string | null  // arrivée réelle = clôture
    ligne: LigneRef
    car: Car | null
    detailpersonnels: Detailpersonnel[]
    courriers: Ref[]
    bagages: Ref[]
    placestotal: number,
    ticketsCount: number // nb de billets actifs vendus (compté à la volée côté API ; remplace 'placesoccupees')
    createdAt: string
    // Commercial à bord + position courante du car
    commercial?: { id: number; nom?: string; prenom?: string } | null
    garecourante?: { id: number; libelle: string } | null
    // Provenance RÉELLE (origine effective) : la gare intermédiaire pour un départ partiel, sinon = origine ligne
    gareprovenance?: { id: number; libelle: string } | null
    // Ids des gares de la route EFFECTIVE (provenance → terminus, dans l'ordre). Une gare en amont de la
    // provenance (départ partiel) n'y figure PAS → aucune action d'exploitation/réception possible.
    routeeffectiveids?: number[]
}
