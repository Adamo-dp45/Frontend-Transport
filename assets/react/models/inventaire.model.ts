export interface Inventaire {
    id: number
    typemouvement: string // ENTREE | SORTIE
    quantite: number
    datemouvement: string
    referencetype: string // APPROVISIONNEMENT | DEPANNAGE | AJUSTEMENT
    // piece: Piece
    createdAt: string
    pieceName: string,
    createdByNom?: string,
    createdByPrenom?: string
}