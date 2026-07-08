### FT-Transport

- Le frontend de l'application de compagnie de transport mutli-entreprise en architecture séparé
    > Frontend - Symfony, Twig, React UX, Shadcn, tailwind v4
        > Dans l'application symfony consomme l'api et envoi les résultats à twig et react pour affichés les données
        > On a un `EntityBase` qui contient createdAt, updatedAt et deletedAt et qui se fait étendre par les autres entités sauf les `Detail..` et `User`, plusieurs entités de l'application sont liées à l'entreprise avec `identreprise` qui est un int sauf le `User` qui est un `ManyToOne` ensuite pour récupérer un enregistrement on vérifie si son `identreprise` corrspond à l'entreprise de l'utilisateur

- **Imprtant**
    > Pour l'authentification on a utiliser le système d'authenticator de symfony `ApiAuthenticator` qui intercepte la requête et connecte l'utilisateur, ensuite on a crée un provider `ApiUserProvider` qui à chaque requête suivante `refreshUser()` et `ApiUser` qui est hydraté et mis dans le token symfony pour représenter l'utilisateur
        > On a géré le flux des appels api dans `ApiClientService` pour l'authentification et `ApiHelper` pour charger les ressources
        > !! `AuthenticationExceptionListener` qui permet que n'importe quel appel api expiré redirige proprement vers le login sans qu'on ai à gérer ça à la main dans chaque controller
        > Pour gérer la persistance on a utiliser le `remember me` de symfony en activant le `RememberMeBadge` dans `ApiAuthenticator` et dans `security.yaml` ce qui crée un cookie persistant séparé du cookie de session, si le browser revient symfony relit ce cookie, retrouve l'utilisateur via `loadUserByIdentifier()` de `ApiUserProvider` et reconstruit la session, pour que le `loadUserByIdentifier()` puisse reconstruire l'utilisateur depuis l'api avec le `refresh token` on l'a stocker dans un cookie persistant dans le `onAuthenticationSuccess()` de `ApiAuthenticator`
        > On met à jour le cookie à chaque refresh quand `refreshToken()` réussit sinon il ne sera jamais renouvelé, vu que `ApiClientService` n'a pas accès à la `Response` on a crée `RefreshTokenCookieSubscriber` qui écoute la réponse et met à jour le cookie si un nouveau refresh token est disponible en session
        > Pour supprimer le cookie lors de la déconnexion `LogoutListener`
    > Pour gérer les filtres côté serveur on a crée `TableHelper` et `TableQueryBuilder`
    > !! éviter de passer `api_url` dans les controller pour les vues on l'a fait globalement dans `twig.yaml`
    > !! ne pas surcharger les `select` on a `SearchController`, `tom-select-remote.js` et `remote-combobox.tsx`
    > !! autoriser le bypass du `ROLE_ADMIN_GARE` on.. `ApiUser::hasPermission()` puis `PermissionVoter`
    > On a utiliser le système de cache natif de symfony `CacheInterface`
    > !! les icônes `lucide.dev` et `claude`
    > Pour le guide
        > On peut le faire à la première connexion de façon interactif via du javascript
            > On a `Driver.js` léger et fonctionne sur n'importe quel élément du dom
            > !! `Shepherd.js` complet et supporte react
            > !! `Intro.js` classique
        > !! avec une page `/aide` qui contient des sections par module, captures d'écran, descriptions..

- **Git**
    > git push -u origin main

- **Production**
    > La 1ère
        > git clone .. .
        > Pour le `.env..` on peut `cp .env .env.local`
        > composer install --no-dev --optimize-autoloader
        > composer dump-env prod
            > On.. supprimer le `.env.local` et utilisé `.env.local.php` qui est plus optimisé
        > composer require symfony/apache-pack
        > php bin/console cache:clear --env=prod
        > php bin/console cache:warmup --env=prod
    > Les prochaines
        > npm run build : En local
        > git pull origin main
        > composer install --no-dev --optimize-autoloader
        > php bin/console cache:clear --env=prod
        > php bin/console cache:warmup --env=prod