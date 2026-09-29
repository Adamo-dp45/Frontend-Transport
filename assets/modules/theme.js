/**
 * TROIS choix de thème : « système », « clair », « sombre ».
 *
 * Le système était absent, et c'est celui que tout le monde attend aujourd'hui : l'application
 * s'accordait au choix qu'on avait fait une fois, jamais à celui du téléphone ou du poste.
 *
 * LA FEUILLE DE STYLE NE CONNAÎT QUE LA CLASSE `.dark` (aucune règle `prefers-color-scheme`) : le mode
 * « système » se RÉSOUT donc ici, en lisant `matchMedia`, et l'on continue de poser ou d'ôter cette
 * seule classe. Réécrire le CSS en `@media` interdirait justement de forcer clair ou sombre.
 *
 * !! LE THÈME EST DÉJÀ APPLIQUÉ AVANT LE PREMIER PIXEL par `partials/theme-preload.html.twig`, qui
 * partage les deux constantes ci-dessous. Ce module ne fait que reprendre la main pour le bouton et
 * pour le suivi des changements système — il ne doit surtout pas être le premier à décider, sinon on
 * revoit l'éclair de thème clair que le préchargement supprime.
 */

/** Clé de stockage — la même que celle du script de préchargement. */
const CLE = 'theme'

/** Dans l'ordre du cycle du bouton. Le défaut est le PREMIER. */
const MODES = ['system', 'light', 'dark']

const LIBELLES = {
    system: 'Système',
    light: 'Clair',
    dark: 'Sombre',
}

const requeteSombre = () =>
    typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null

/**
 * Le mode choisi, ou « system » par défaut.
 *
 * Une valeur inconnue en stockage (un vieux 'auto', une saisie à la main) retombe sur le défaut plutôt
 * que de casser : le thème est un confort, il ne doit jamais empêcher la page de s'afficher.
 */
export const modeTheme = () => {
    let enregistre = null
    try {
        enregistre = localStorage.getItem(CLE)
    } catch {
        // Navigation privée, stockage bloqué : on se rabat sur le système, sans bruit.
    }

    return MODES.includes(enregistre) ? enregistre : MODES[0]
}

/** Le mode se résout en un booléen : « sombre, oui ou non ». */
export const estSombre = (mode = modeTheme()) => {
    if (mode === 'dark') return true
    if (mode === 'light') return false

    return requeteSombre()?.matches === true
}

export const initTheme = () => {
    const themeBtn = document.getElementById('themeBtn')
    const icones = {
        light: document.getElementById('sun-i'),
        dark: document.getElementById('moon-i'),
        system: document.getElementById('system-i'),
    }
    const themeLbl = document.getElementById('theme-lbl')

    const appliquer = (mode) => {
        document.documentElement.classList.toggle('dark', estSombre(mode))

        // L'icône affichée est celle du mode COURANT, pas de celui qu'un clic donnerait : le libellé
        // disait « Dark » quand on était en clair, ce qui laissait croire qu'on était en sombre.
        Object.entries(icones).forEach(([nom, icone]) => {
            if (icone) icone.style.display = nom === mode ? '' : 'none'
        })

        if (themeLbl) themeLbl.textContent = LIBELLES[mode]
        if (themeBtn) {
            themeBtn.setAttribute('title', `Thème : ${LIBELLES[mode]} — cliquer pour changer`)
            themeBtn.setAttribute('aria-label', `Thème : ${LIBELLES[mode]}`)
        }
    }

    const suivant = (mode) => MODES[(MODES.indexOf(mode) + 1) % MODES.length]

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const mode = suivant(modeTheme())
            try {
                localStorage.setItem(CLE, mode)
            } catch {
                // Stockage indisponible : le choix vaut pour la page courante, ce qui vaut mieux que rien.
            }
            appliquer(mode)
        })
    }

    /*
        EN MODE SYSTÈME, ON SUIT LE SYSTÈME EN DIRECT : basculer le thème du poste doit changer la page
        ouverte, sans rechargement. Sans cet écouteur, « système » n'aurait voulu dire que « le système
        au moment où j'ai ouvert la page », ce qui est une demi-promesse.
    */
    requeteSombre()?.addEventListener('change', () => {
        if (modeTheme() === 'system') appliquer('system')
    })

    // Le préchargement a déjà posé la classe ; cet appel synchronise l'icône et le libellé, et sert de
    // repli si le partiel n'est pas inclus dans un gabarit.
    appliquer(modeTheme())
}
