export type CorbeilleItem = {
    type: string
    typeLibelle: string
    id: number
    libelle: string
    identreprise: number | null
    entreprise: string | null
    deletedAt: string | null
    deletedBy: string | null
}

export type CorbeilleParType = {
    type: string
    typeLibelle: string
    count: number
}

export type CorbeilleParEntreprise = {
    id: number
    libelle: string
    count: number
}
