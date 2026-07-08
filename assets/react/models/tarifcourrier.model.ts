export interface Tarifcourrier {
    id: number
    libelle: string
    valeurmin: number
    valeurmax: number | null
    montanttaxe: number
}