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
    // Collections COMPLÈTES : uniquement sur la FICHE (/api/voyages/{id}, groupe 'read:Voyage:item').
    // Absentes de la LISTE, qui reçoit les compteurs ci-dessous — d'où l'optionnalité.
    detailpersonnels?: Detailpersonnel[]
    courriers?: Ref[]
    bagages?: Ref[]
    placestotal: number,
    // Compteurs calculés en COUNT SQL côté API (aucune collection hydratée)
    ticketsCount: number // nb de billets actifs vendus (remplace 'placesoccupees')
    courriersCount: number
    bagagesCount: number
    detailpersonnelsCount: number
    createdAt: string
    // Commercial à bord + position courante du car
    commercial?: { id: number; nom?: string; prenom?: string } | null
    garecourante?: { id: number; libelle: string } | null
    // Provenance RÉELLE (origine effective) : la gare intermédiaire pour un départ partiel, sinon = origine ligne
    gareprovenance?: { id: number; libelle: string } | null
    // Ids des gares de la route EFFECTIVE (provenance → terminus, dans l'ordre). Une gare en amont de la
    // provenance (départ partiel) n'y figure PAS → aucune action d'exploitation/réception possible.
    routeeffectiveids?: number[]
    // Passages réels (arrivée / départ par gare) — léger, exposé AUSSI en liste : pilote la disparition
    // des boutons « Réceptionner » (arrivée déjà marquée) et « Le car repart » (départ déjà marqué).
    passages?: { gare?: { id: number }; arriveeReelle: string | null; departReelle: string | null }[]
}
