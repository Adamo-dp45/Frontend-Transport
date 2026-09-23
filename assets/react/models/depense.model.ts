import { Fournisseur } from "./fournisseur.model"
import { Libelle } from "./libelle.model"

interface GareRef {
    id: number
    libelle: string
}

interface MediaRef {
    contentUrl: string
}

export type Modereglement = "ESPECES" | "MOBILE_MONEY" | "VIREMENT" | "CHEQUE"

export interface Depense {
    id: number
    datedepense: string
    montant: number
    typedepense: Libelle
    /** null = charge du SIÈGE : elle n'est imputée à aucune gare (loyer, salaires de la direction). */
    gare: GareRef | null
    /** Dérivée de `gare` côté API — jamais stockée, donc jamais divergente. */
    portee: "GARE" | "ENTREPRISE"
    modereglement: Modereglement
    beneficiaire: string | null
    fournisseur: Fournisseur | null
    justificatif: MediaRef | null
    libelle: string | null
    /** Crochet des frais de route : rempli, il rattache la charge à un départ. */
    voyage: { id: number; codevoyage: string } | null
    createdAt: string
}
