import { Fournisseur } from "./fournisseur.model"
import { Piece } from "./piece.model"

interface Detailapprovisionnement {
    quantite: number
    prixunitaire: number
    piece: Piece
    couttotal: number
}

export interface Approvisionnement {
    id: number
    dateappro: string
    fournisseur: Fournisseur
    detailapprovisionnements: Detailapprovisionnement[]
    /**
     * Coût total servi par l'API (28/09/2026), recomposé à chaque écriture depuis les lignes.
     *
     * À LIRE PLUTÔT QUE RESOMMER LES LIGNES : les tableaux le recalculaient en `quantite * prixunitaire`,
     * ce qui ignorait même le `couttotal` de la ligne — deux façons d'obtenir le même nombre, donc deux
     * façons de diverger. Nullable pour une ligne qu'un backfill n'aurait pas touchée.
     */
    couttotal?: number | null
    statut?: "VALIDE" | "ANNULE"
    createdAt: string
}