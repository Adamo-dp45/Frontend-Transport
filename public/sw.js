/*
    SERVICE WORKER — volontairement VIDE, et c'est un choix, pas un oubli.

    'self' désigne le service worker : ce fichier tourne dans un worker séparé, il n'est PAS chargé
    dans la page. Ni 'document' ni 'window' n'y existent.

    Un écouteur 'fetch' qui ne répond rien laisse le navigateur faire sa requête normalement — le
    réseau reprend la main, exactement comme sans service worker. Il suffit en revanche à rendre
    l'application INSTALLABLE : c'est le minimum historiquement exigé par Chrome, sans écrire la
    moindre ligne de mise en cache.

    Conséquence à connaître : hors réseau, l'application ne s'ouvre PAS. Elle s'installe, elle ne
    fonctionne pas hors ligne. Le hors-ligne du terrain est traité là où il compte vraiment —
    l'application du commercial à bord (`commercialflutter`), qui vend et imprime sans couverture.

    Pour aller plus loin un jour : précacher la coque (page hors-ligne, CSS/JS du build) dans
    'install', puis servir depuis le cache dans 'fetch'. Ne JAMAIS mettre en cache les réponses
    d'API : ce sont des places de car et des recettes, un chiffre périmé ici se paie au guichet.
*/
self.addEventListener('fetch', () => {})
