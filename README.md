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
    > !! l'INSCRIPTION n'est plus publique : elle vit dans `EntrepriseController::new` (`/admin/entreprises/nouvelle`, `ROLE_SUPER_ADMIN`), bouton « Nouvelle compagnie » sur le listing des entreprises. `RegisterController`, `templates/register/` et le lien « S'inscrire » de la connexion sont supprimés — l'API `POST /api/register` exige elle aussi `ROLE_SUPER_ADMIN`
        > La case « j'accepte les conditions » a sauté du `RegisterFormType` : ce n'est plus le futur utilisateur qui remplit le formulaire mais l'exploitant. Et le champ portant `IsTrue`, le garder sans l'afficher rendait le formulaire insoumettable
        > Le tout premier super admin se crée en console côté BK (`app:creer-super-admin`)
    > On a utiliser le système de cache natif de symfony `CacheInterface`
    > !! les icônes `lucide.dev` et `claude`
    > Pour le guide — DEUX pages complémentaires, volontairement séparées :
        > `/aide` (`home/aide.html.twig`) : référence PAR TÂCHE (« comment vendre un billet », « réceptionner à ma gare »..), rubriques filtrées par permission
        > `/prise-en-main` (`home/demarrage.html.twig`) : parcours CHRONOLOGIQUE pour une compagnie qui démarre — paramétrage dans l'ordre des dépendances (villes → gares → lignes + durées de tronçon → tarifs → cars → personnels → équipe), puis SCÉNARIO d'un voyage de bout en bout à 3 acteurs (origine prépare · intermédiaire réceptionne · terminus clôture), le commercial à bord, les imprévus (panne/changement de car, désistement, éviction, no-show, perdu, plan des sièges), le bilan de journée et les modules annexes
        > !! on pourrait y ajouter une visite interactive à la première connexion via du javascript (`Driver.js` léger, `Shepherd.js` supporte react, `Intro.js` classique) et des captures d'écran

- **Les tests** (`phpunit`, `make test`)
    > Tests UNITAIRES purs : ni base, ni noyau à démarrer (la suite tourne en ~0,1 s). Le FT n'ayant pas de base, il n'y a rien à isoler — ce qui mérite d'être testé ici, c'est la logique qu'il porte LUI-MÊME
    > `ApiUser::hasPermission()` et `PermissionVoter` : le front REJOUE la décision du `PermissionVoter` du BK pour masquer un bouton plutôt que de laisser l'utilisateur buter sur un 403. Les deux implémentations étant DUPLIQUÉES, elles doivent rester d'accord — d'où des tests des deux côtés
        > !! le cas sensible est `ROLE_ADMIN_GARE`, dont le bypass est VOLONTAIREMENT partiel : total, il ouvrirait au chef de gare les écrans de configuration entreprise (tarifs, lignes, flotte) que le serveur lui refuserait ensuite
    > `TableQueryBuilder` : les LISTES BLANCHES de filtres et de tri (un champ non déclaré ne doit jamais partir à l'API) et la pagination (une taille de page aberrante ferait charger toute la table)

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