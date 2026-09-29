import { Fournisseur } from "./fournisseur.model"
import { Libelle } from "./libelle.model"

interface GareRef {
    id: number
    libelle: string
}

/**
 * Un justificatif est un document PRIVÉ côté API : `contentUrl` y vaut null, il se consulte par le
 * relais du front (`/depense/{id}/justificatif`). Ne JAMAIS s'en servir comme lien.
 */
interface MediaRef {
    contentUrl: string | null
    prive: boolean
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
