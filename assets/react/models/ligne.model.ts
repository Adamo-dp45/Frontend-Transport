export interface GareRef {
    id: number
    libelle: string
    ville?: string
}

export interface Arret {
    id?: number
    gare: GareRef
    ordre: number
}

export interface Ligne {
    id: number
    codeligne: string
    libelle: string | null
    gareorigine: GareRef
    gareterminus: GareRef
    arrets: Arret[]
    voyagesCount: number
}
