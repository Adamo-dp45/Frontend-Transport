export interface Client {
    id: number
    nom: string
    contact: string
    email?: string
    ticketsCount?: number
    bagagesCount?: number       // nb de bagages actifs du client (via ses billets)
    fidelite?: boolean          // membre du programme de fidélité
    cartefidelite?: string | null
    createdAt: string
}
