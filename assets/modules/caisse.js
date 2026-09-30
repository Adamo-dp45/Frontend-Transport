// Grille de dénominations du comptage de caisse (JavaScript vanilla).
//
// Une aide à compter, rien de plus : l'agent saisit combien il a de billets de 5 000, de pièces de
// 100, et le TOTAL se met à jour. Le détail ne quitte JAMAIS le navigateur — seul le total part au
// serveur. Le stocker donnerait à relire un décompte de billets que personne ne pourra vérifier.
//
// !! LE MONTANT ATTENDU N'EST NULLE PART DANS CE MODULE, et ne doit pas y entrer : le comptage est
// AVEUGLE. À qui connaît le théorique, il suffit de le recopier pour n'avoir jamais d'écart.

export const initCaisse = () => {
    const bloc = document.querySelector('[data-caisse-cloture]')
    if (!bloc) return

    const total = bloc.querySelector('[data-caisse-total]')
    const coupures = bloc.querySelectorAll('[data-coupure]')
    if (!total || coupures.length === 0) return

    // L'agent a saisi le total à la main : la grille ne le réécrit plus par-dessus. Sans ce
    // drapeau, remplir une ligne après coup effacerait un total qu'on venait de taper.
    let saisiALaMain = false

    const recalculer = () => {
        if (saisiALaMain) return

        let somme = 0
        coupures.forEach((champ) => {
            const nombre = parseInt(champ.value, 10)
            if (Number.isFinite(nombre) && nombre > 0) {
                somme += nombre * parseInt(champ.dataset.coupure, 10)
            }
        })
        total.value = somme > 0 ? String(somme) : ''
    }

    coupures.forEach((champ) => champ.addEventListener('input', recalculer))

    total.addEventListener('input', () => {
        // On ne redevient « automatique » que si l'agent vide le champ : il repart de la grille.
        saisiALaMain = total.value.trim() !== ''
    })
}
