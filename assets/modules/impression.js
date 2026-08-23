// Impression d'un document SANS quitter la page, pour les liens des gabarits Twig.
//
// Les reçus (billet, bagage, courrier, bordereau) s'ouvraient dans un ONGLET : l'agent devait le
// fermer pour revenir à sa fiche ou à sa liste, et perdait au passage ses filtres et sa pagination.
// Le document est donc chargé dans une iframe hors écran, puis envoyé à l'imprimante — pas de
// navigation, et pas de blocage de pop-up (l'appel part d'un clic de l'utilisateur).
//
// Pendant de 'lib/printTickets.ts', qui rend le même service aux tableaux React. Suppose une
// réponse « Content-Disposition: inline », ce que produit PdfService.
//
// Usage : <a href="…" data-imprimer>Imprimer</a> — l'attribut suffit, la délégation fait le reste.

/** Délai laissé au moteur d'impression avant de retirer le cadre. */
const DELAI_RETRAIT_MS = 60000

const imprimerDepuisUrl = (url) => {
    const iframe = document.createElement('iframe')
    iframe.setAttribute('aria-hidden', 'true')
    // Hors écran plutôt que display:none : un cadre masqué n'est pas toujours imprimable.
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;'
    iframe.src = url

    const secours = () => window.open(url, '_blank')

    iframe.onload = () => {
        try {
            iframe.contentWindow?.focus()
            iframe.contentWindow?.print()
        } catch (_) {
            // Visionneuse PDF non pilotable : on retombe sur l'onglet plutôt que de ne rien faire.
            secours()
        }
        setTimeout(() => iframe.remove(), DELAI_RETRAIT_MS)
    }

    iframe.onerror = () => {
        secours()
        iframe.remove()
    }

    document.body.appendChild(iframe)
}

export const initImpression = () => {
    // Délégation sur le document : les fiches rechargées par Turbo n'ont rien à rebrancher, et les
    // fragments insérés après coup (suivi, tableaux) en profitent aussi.
    document.addEventListener('click', (e) => {
        const lien = e.target instanceof Element ? e.target.closest('[data-imprimer]') : null
        if (!lien) return

        const url = lien.getAttribute('href')
        if (!url || url === '#') return

        e.preventDefault()
        imprimerDepuisUrl(url)
    })
}
