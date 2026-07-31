// Suivi des cars de « Ma gare » — rafraîchissement en direct (JavaScript vanilla).
// Remplace le contenu de #suivi-cars-live par le fragment servi par data-suivi-url, toutes les
// POLL_MS. En pause quand l'onglet est masqué. Timer au niveau module : 'turbo:load' rejoue l'init
// à chaque navigation (le <body> est recréé) — on purge donc l'intervalle précédent.

const POLL_MS = 45000

let pollTimer = null

export const initSuiviLive = () => {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null }

    const container = document.getElementById('suivi-cars-live')
    if (!container) return
    const url = container.dataset.suiviUrl
    if (!url) return

    let inFlight = false
    const refresh = async () => {
        if (document.hidden || inFlight) return
        inFlight = true
        try {
            const res = await fetch(url, { headers: { 'X-Requested-With': 'fetch' } })
            if (!res.ok) return
            const html = await res.text()
            // Le conteneur a pu disparaître (navigation) entre la requête et la réponse.
            const el = document.getElementById('suivi-cars-live')
            if (el) el.innerHTML = html
        } catch (_) {
            // silencieux : le suivi ne doit jamais casser la page
        } finally {
            inFlight = false
        }
    }

    pollTimer = setInterval(refresh, POLL_MS)
}
