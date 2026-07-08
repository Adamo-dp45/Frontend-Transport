export interface Client {
    id: number
    nom: string
    contact: string
    email?: string
    ticketsCount?: number
    fidelite?: boolean          // membre du programme de fidélité
    cartefidelite?: string | null
    createdAt: string
}
