module.exports = {
    plugins: {
        /*
            PLUS DE 'postcss-preset-env' (29/09/2026). Réglé en « stage 1 » et placé AVANT Tailwind, il
            réécrivait chaque ':is()' en listes de sélecteurs lestées de faux identifiants — 18 333
            ':not(#\#)' dans le CSS — pour émuler la spécificité de ':is()' dans des navigateurs qui ne le
            connaissent pas. Or Tailwind v4 exige déjà des navigateurs récents (Chrome 111, Safari 16.4,
            Firefox 128 : '@property', 'color-mix', 'oklch', couches de cascade), qui ont tous ':is()'. Le
            polyfill ne servait donc aucun navigateur capable d'afficher l'application, et il coûtait du
            poids et 8 avertissements par build. Tailwind v4 fait lui-même, par Lightning CSS, le travail
            utile restant (imbrication, préfixes).
            RETRAIT MESURÉ, pas supposé : styles calculés de 1 647 éléments (connexion + fiches dépense,
            dépannage, voyage), en clair ET en sombre, identiques avant et après. Cf. README, section THÈME.

            !! 'autoprefixer' A SUIVI, et pas par choix (30/09/2026). Il n'a JAMAIS été déclaré dans
            'package.json' : il arrivait comme dépendance TRANSITIVE de 'postcss-preset-env'. Le
            'npm uninstall postcss-preset-env' que le README recommandait l'a donc emporté avec lui,
            en laissant cette configuration réclamer un plugin absent — « Loading PostCSS
            "autoprefixer" plugin failed », 12 erreurs par build, et pas une seule feuille de style
            compilée. Le bon geste est de RETIRER la ligne, pas de réinstaller le paquet : le
            commentaire ci-dessus le dit déjà, Tailwind v4 fait les préfixes par Lightning CSS.
        */
        "@tailwindcss/postcss": {}
    },
};
