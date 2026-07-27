/**
 * Impression d'un LOT de billets en autant de TÂCHES D'IMPRESSION que de billets.
 *
 * Pourquoi : un PDF unique de N pages part à l'imprimante comme UNE SEULE tâche. Or la plupart des
 * pilotes thermiques sont réglés pour couper « en fin de document » — les billets sortent alors
 * collés, coupés une seule fois à la fin. En envoyant un document PAR billet, la coupe de fin de
 * tâche s'applique à chacun, quel que soit le réglage du pilote.
 *
 * Chaque billet est chargé dans une iframe cachée (même origine) puis imprimé, séquentiellement :
 * pas de `window.open` en rafale, donc pas de blocage de pop-ups par le navigateur.
 *
 * Complément côté serveur : la hauteur de page des billets est CONSTANTE
 * (PdfService::TICKET_HAUTEUR_PT, 80 × 160 mm) pour tomber pile sur le point de coupe.
 */

/** Délai laissé au moteur d'impression avant de passer au billet suivant. */
const DELAI_ENTRE_TICKETS_MS = 800

/**
 * Imprime chaque billet l'un après l'autre. Résout quand tous ont été envoyés.
 * En cas d'échec sur un billet (iframe bloquée, PDF non rendu), on l'ouvre dans un onglet
 * pour que l'agent puisse l'imprimer à la main plutôt que de perdre le billet silencieusement.
 */
export async function printTicketsUnParUn(ids: number[]): Promise<void> {
    for (const id of ids) {
        await printPdfViaIframe(`/ticket/${id}/pdf`)
        await pause(DELAI_ENTRE_TICKETS_MS)
    }
}

function pause(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function printPdfViaIframe(url: string): Promise<void> {
    return new Promise<void>(resolve => {
        const iframe = document.createElement('iframe')
        iframe.setAttribute('aria-hidden', 'true')
        // Hors écran plutôt que display:none : un cadre masqué n'est pas toujours imprimable.
        iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;'
        iframe.src = url

        let termine = false
        const finir = () => {
            if (termine) return
            termine = true
            // On retire le cadre APRÈS l'impression : le retirer trop tôt annule la tâche.
            setTimeout(() => iframe.remove(), 60_000)
            resolve()
        }

        iframe.onload = () => {
            try {
                iframe.contentWindow?.focus()
                iframe.contentWindow?.print()
            } catch {
                // Impression programmée refusée (visionneuse PDF non pilotable) : repli manuel.
                window.open(url, '_blank')
            }
            finir()
        }

        iframe.onerror = () => {
            window.open(url, '_blank')
            finir()
        }

        document.body.appendChild(iframe)

        // Filet de sécurité : si l'iframe ne signale jamais son chargement, on n'immobilise pas la file.
        setTimeout(finir, 8_000)
    })
}
