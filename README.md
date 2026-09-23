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
    > **PROGRESSIVE WEB APP** (installable, PAS hors ligne) : `public/manifest.json`, `public/sw.js` et `public/images/{192,512}.png`, montés par le partiel `templates/partials/pwa.html.twig`
        > !! le partiel est inclus dans les DEUX gabarits racines. Le bloc ne vivait que dans `base.html.twig`, or la CONNEXION étend `app-base.html.twig` — c'est-à-dire la toute première page qu'on voit, celle où le navigateur propose naturellement d'installer : l'invite n'y apparaissait jamais. Dupliquer le bloc l'aurait fait diverger, d'où l'inclusion
        > !! chemins ABSOLUS, jamais relatifs. `./manifest.json` se résout par rapport à l'URL DE LA PAGE : sur `/voyages/12/modifier` il pointait vers `/voyages/12/manifest.json` → 404, donc aucun manifeste et aucune installation ailleurs que sur l'accueil. Même piège en pire pour le service worker, dont l'URL fixe le PÉRIMÈTRE — enregistré depuis `/voyages/12/sw.js` il ne couvrirait que cette branche. On passe par `asset()` (manifeste, icône) et `app.request.basePath` pour le worker, qui doit venir de la MÊME ORIGINE que la page (une URL de CDN serait refusée)
        > `sw.js` est VOLONTAIREMENT vide : un écouteur `fetch` qui ne répond rien laisse le réseau faire, mais suffit à rendre l'application installable. Conséquence assumée — hors réseau, l'application ne s'ouvre PAS. Le hors-ligne du terrain est traité là où il compte, dans `commercialflutter`. Ne JAMAIS mettre en cache les réponses d'API : ce sont des places de car et des recettes
        > !! en DEV derrière `php -S ... public/index.php`, le worker est servi en `text/html` (Symfony l'intercepte) et le navigateur REFUSE de l'enregistrer. Sous Apache, le `.htaccess` (`RewriteCond %{REQUEST_FILENAME} !-f`) le sert en fichier statique : rien à faire en production. Tester l'installation sur la vraie pile, pas sur le serveur intégré
        > RESTE À FAIRE : les icônes sont des IMAGES DE DÉMONSTRATION (une mascotte), pas la marque iTransport ; et il manque une variante `purpose: "maskable"` (marges de sécurité) sans laquelle Android encadre l'icône dans un rond blanc. Déclarer `maskable` sur les images actuelles les ferait rogner
    > RATTRAPAGE d'un passage non pointé : sur la FRISE DES HORAIRES de la fiche voyage (`voyage/show.html.twig`), chaque arrêt intermédiaire sans arrivée offre à un `ROLE_ADMIN` un dépliant « Passage non pointé — rattraper » (heure réelle + confirmation, `VoyageController::rattraperPassage`). Placé là et pas dans la barre d'actions : le trou se voit sur la frise, la réparation doit être au même endroit
        > Depuis la garde d'ordre côté API, une gare ne réceptionne plus tant qu'un arrêt en amont n'a pas été pointé — sans quoi une réception prématurée fermait ventes et réservations des gares survolées. Ce dépliant est la seule porte de sortie en cas d'oubli ; il ne réceptionne PAS les colis, la gare le fait elle-même (rappelé dans la confirmation et le message de succès)
    > Le module `Dépenses` (groupe de menu « Finances », nouveau) : CRUD `depense` + référentiel `typedepense`, page d'analyse `owner.stats.depenses` (`home/depenses.html.twig`). Règles et justifications au README du BK, module `Dépense` — ici seulement ce qui est propre au front
        > Un `ROLE_ADMIN_GARE` gère les charges de SA gare sans permission explicite : `DEPENSE` est dans la liste `$gareScoped` d'`ApiUser::hasPermission()`, MIROIR de `GareScopedEntities::ENTITIES` côté BK (les deux doivent rester d'accord). Il voit donc le menu « Finances » → « Dépense », mais pas « Type de dépense » (référentiel d'entreprise), et le bouton Supprimer lui reste masqué — la corbeille est `ROLE_ADMIN`
        > Le SÉLECTEUR D'IMPUTATION n'est rendu que pour qui peut imputer ailleurs que dans sa gare (`DepenseController::peutImputerLibrement`, miroir du `DepenseProcessor` du BK : admin ou utilisateur central sans gare). Pour un agent rattaché, le champ n'existe pas dans le formulaire et le serveur impute SA gare : lui montrer un sélecteur qu'il ne peut pas utiliser ne produirait qu'un refus incompris
        > Le JUSTIFICATIF suit le patron de `PieceController` : `ApiHelper::postMediaObject($file)` puis l'IRI dans la charge — la dépense reste du JSON pur. En ÉDITION, un champ fichier vide CONSERVE le justificatif existant au lieu de l'effacer
        > La suppression est gardée `ROLE_ADMIN` côté FT comme côté API (une sortie d'argent est un document) ; la confirmation affiche le MONTANT, pas « cette ligne »
        > !! trois pièges traversés en branchant le 3e poste du bénéfice :
            > le `map()` de `home/_entreprise.html.twig` FILTRE les clés — sans `depense: c.depense`, la nouvelle série n'atteignait jamais `chartCouts`, sans la moindre erreur
            > `HomeController` RE-NORMALISE les charges de stats dans des tableaux littéraux (2 endroits) : une clé oubliée + `strict_variables` = 500 sur le tableau de bord
            > le sous-titre du KPI « Bénéfice net » de `home/recettes.html.twig` énumérait les postes déduits : il devient faux à chaque ajout
        > La table des icônes de `home/_stats.html.twig` ne contenait PAS `wallet`, que le KPI « Bénéfice net » demandait déjà — il retombait en silence sur l'icône de graphique. Ajoutée, avec `expense` pour le poste des charges
        > !! en DEV, `php -S ... public/index.php` sert les assets en `text/html` (Symfony intercepte tout) et AUCUN composant React ne se monte. Utiliser `symfony serve`, ou un routeur qui rend `false` sur les fichiers existants. Même piège que le service worker, documenté plus haut
    > NUMÉRO DE DÉPART DU JOUR (`voyage.numerodepart`, attribué par le BK — cf. son README, module Exploitation) : « Départ 2 », le repère du guichet et du quai, à ne pas confondre avec `codevoyage` qui identifie le départ pour l'exploitation. Affiché là où l'on DÉSIGNE un départ — colonne « N° départ » du listing, badge de la fiche voyage, **sélecteurs** de vente / réservation / report (billet et réservation), bordereaux, manifeste, fiches billet et réservation, tableau de bord de gare, espace commercial. Volontairement ABSENT des tableaux de statistiques (`detailParVoyage` de la page agent) : un numéro sans sa journée n'y veut rien dire
        > !! LE BILLET THERMIQUE (`mails/ticket/thermalpdf.html.twig`) a été recalé sur le ticket de référence (`Backend-Transport/tools/ticket.jpg`) : la case face au siège portait le CODE VOYAGE, elle porte désormais « DÉPART 4 · SIÈGE 29 » — c'est ce que le passager cherche, et ce que l'agent lui annonce. Le code voyage a pris la ligne du VÉHICULE, dont l'affichage est CONSERVÉ EN COMMENTAIRE (billet ET souche) : le format d'impression se règle sur du papier, on ne supprime pas une ligne qu'on peut vouloir reprendre. L'immatriculation reste sur le bordereau chauffeur et la fiche du voyage — le passager ne la lisait pas, il monte dans le car qu'on lui désigne
        > Le type d'audit `VOYAGE_NUMERO_DEPART` (renumérotation d'un départ replanifié) est déclaré dans les DEUX tables de couleurs du journal : `home/activite.html.twig` et `voyage/show.html.twig`. Une table oubliée ne casse rien — le point tombe en gris — mais l'événement perd sa lecture
    > Plan des sièges : un siège déjà vendu par une gare AVAL est signalé en AMBRE POINTILLÉ (pastille `↓`) dans `PlanCar`, et rappelé par un flash à la sélection dans `TicketForm`. Le siège reste CLIQUABLE — la priorité amont est la règle, on prévient sans interdire. Cf. `Siege::$venduAval` côté API
    > Pour le guide — DEUX pages complémentaires, volontairement séparées :
        > `/aide` (`home/aide.html.twig`) : référence PAR TÂCHE (« comment vendre un billet », « réceptionner à ma gare »..), rubriques filtrées par permission
        > `/prise-en-main` (`home/demarrage.html.twig`) : parcours CHRONOLOGIQUE pour une compagnie qui démarre — paramétrage dans l'ordre des dépendances (villes → gares → lignes + durées de tronçon → tarifs → cars → personnels → équipe), puis SCÉNARIO d'un voyage de bout en bout à 3 acteurs (origine prépare · intermédiaire réceptionne · terminus clôture), le commercial à bord — **y compris la vente sans réseau** (préparer l'appareil, encaisser et imprimer hors couverture, suivre ce qui remonte) —, les imprévus (panne/changement de car, désistement, éviction, no-show, perdu, plan des sièges), le bilan de journée et les modules annexes
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