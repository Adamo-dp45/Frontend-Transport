export function formatDate(d: string | null): string {
    if(d == null) {
        return ''
    }
    return new Date(d).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    })
}

/**
 * Vignette Glide d'une image affichée dans une PASTILLE DE TABLEAU (32 px à l'écran, `h-8 w-8`).
 *
 * 64 px et non 400 : c'est le double de la taille affichée, pour rester net sur un écran haute densité,
 * et environ 40 fois moins de pixels que le 400×400 demandé jusqu'ici pour une pastille de 32 px.
 * JPEG qualité 75 plutôt que WebP, pourtant plus léger : Glide passe par GD, et rien ne garantit que
 * celui de l'hébergeur sache écrire du WebP — sans lui, l'image répondrait en erreur.
 *
 * Les trois tableaux qui l'affichent (personnel, pièces, utilisateurs) passent par ici, pour que le
 * format ne diverge pas de l'un à l'autre.
 */
export function vignetteTableau(apiUrl: string, chemin: string): string {
    return `${apiUrl}/media${chemin}?w=64&h=64&fit=crop&fm=jpg&q=75`
}
