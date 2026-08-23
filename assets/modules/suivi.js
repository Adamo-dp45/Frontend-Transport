// Suivi des cars de « Ma gare » — rafraîchissement en direct (JavaScript vanilla).
// Remplace le contenu de #suivi-cars-live par le fragment servi par data-suivi-url, toutes les
// POLL_MS, et à la demande via le bouton « Actualiser ». En pause quand l'onglet est masqué.
// Timer au niveau module : 'turbo:load' rejoue l'init à chaque navigation (le <body> est recréé)
// — on purge donc l'intervalle précédent.

const POLL_MS = 45000

let pollTimer = null

export const initSuiviLive = () => {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null }

    const container = document.getElementById('suivi-cars-live')
    if (!container) return
    const url = container.dataset.suiviUrl
    if (!url) return

    let inFlight = false

    /**
     * @param {boolean} manuel  déclenché par l'agent : on ignore l'onglet masqué (il vient de
     *                          cliquer, la page est donc bien visible) et on montre que ça tourne.
     */
    const refresh = async (manuel = false) => {
        if (inFlight) return
        if (!manuel && document.hidden) return

        inFlight = true
        const bouton = container.querySelector('[data-suivi-refresh]')
        if (manuel && bouton) {
            bouton.disabled = true
            bouton.querySelector('[data-suivi-icone]')?.classList.add('animate-spin')
        }

        try {
            const res = await fetch(url, { headers: { 'X-Requested-With': 'fetch' } })
            if (!res.ok) return
            const html = await res.text()
            // Le conteneur a pu disparaître (navigation) entre la requête et la réponse.
            const el = document.getElementById('suivi-cars-live')
            if (el) {
                el.innerHTML = html
                // Le fragment remplacé emporte l'ancien bouton : on recâble celui qui arrive.
                brancherBouton(el)
            }
        } catch (_) {
            // silencieux : le suivi ne doit jamais casser la page
        } finally {
            inFlight = false
            // Le bouton d'origine n'existe plus après remplacement ; ce rétablissement ne sert
            // qu'au cas d'échec, où le fragment n'a pas été remplacé.
            if (manuel && bouton?.isConnected) {
                bouton.disabled = false
                bouton.querySelector('[data-suivi-icone]')?.classList.remove('animate-spin')
            }
        }
    }

    const brancherBouton = (racine) => {
        racine.querySelector('[data-suivi-refresh]')?.addEventListener('click', () => refresh(true))
    }

    brancherBouton(container)
    pollTimer = setInterval(() => refresh(false), POLL_MS)
}
