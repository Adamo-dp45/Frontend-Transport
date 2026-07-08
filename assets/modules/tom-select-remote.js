import TomSelect from 'tom-select' /*
    - Pour le css on l'a importé dans 'app.css' à causde de 'tailwind'
*/
/**
 * Permet d'initialiser 'tomselect' avec recherche distante sur un élément select
 *
 * @param {string|HTMLElement} selector
 * @param {string} resource
 * @param {object} options
 */
export function initRemoteSelect(selector, resource, options = {}) {
    const elements = typeof selector === 'string' ? document.querySelectorAll(selector) : [selector]
    elements.forEach(el => {
        if(!el || el.tomselect) {
            return /*
                - Il est déjà initialisé
            */
        }
        const preloadValue = el.dataset.value ?? null
        const preloadLabel = el.dataset.label ?? null
        new TomSelect(el, {
            valueField: 'value',
            labelField: 'label',
            searchField: 'label',
            placeholder: el.getAttribute('placeholder') ?? '-- Rechercher --',
            minChars: 0, /*
                - '0' pour permettre le chargement sans saisie
            */
            loadThrottle: 300,
            preload: true, // Pour charge dès l'initialisation
            shouldLoad: (q) => true, // Pour autoriser le chargement même avec 'q' vide
            options: preloadValue && preloadLabel ? [{ value: preloadValue, label: preloadLabel }] : [], /*
                - Les option pré-chargées pour la valeur initiale pour 'edit'
            */
            items: preloadValue ? [preloadValue] : [],
            load(q, callback) {
                if(q.length > 0 && q.length < 2) { /*
                        - Ne vas charger que si 'q' est vide 'preload' ou '>=2' caractères
                    */
                    return callback()
                }
                fetch(`/search?resource=${resource}&q=${encodeURIComponent(q)}&limit=20`)
                    .then(r => r.json())
                    .then(data => callback(data))
                    .catch(() => callback())
            },
            render: {
                no_results: () => '<div class="no-results">Aucun résultat</div>',
                loading: () => '<div class="no-results">Recherche…</div>'
            },
            plugins : {
                remove_button : {title: 'Supprimer'}
            },
            ...options
        })
    })
}

/**
 * Va parcourir tous les '[data-remote-select]' du dom et les initialisés
 */
export function initRemoteSelects() {
    document.querySelectorAll('[data-remote-select]').forEach(el => {
        const resource = el.dataset.remoteSelect
        if(resource) {
            initRemoteSelect(el, resource)
        }
    })
}