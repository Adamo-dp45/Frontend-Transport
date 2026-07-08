export interface Gare {
    id: number
    chefgare: string
    ville: string
    libelle: string
    contact1: string
    contact2?: string,
    statut: 'ACTIF' | 'SUSPENDU',
    datecreation?: string
}