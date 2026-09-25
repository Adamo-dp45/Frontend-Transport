<?php

namespace App\Controller;

use App\Domain\Helper\ApiExceptionHandlerHelper;
use App\Domain\Helper\ApiHelper;
use App\Domain\Helper\TableHelper;
use App\Form\VoyageAffectationCarFormType;
use App\Form\VoyageAffectationPersonnelFormType;
use App\Form\VoyageclotureFormType;
use App\Form\VoyageEditFormType;
use App\Form\VoyageFormType;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/voyage', name: 'voyage.')]
#[IsGranted('ROLE_USER')]
final class VoyageController extends AbstractController
{
    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler,
        private readonly TableHelper $tableHelper
    )
    {
    }

    #[Route('', name: 'index', methods: ['GET'])]
    #[IsGranted('VOYAGE_VOIR')]
    public function index(Request $request): Response
    {
        $data = $this->tableHelper->handleIndex('/api/voyages',  $request->query->all(),
            [
                'search' => 'codevoyage',
                'ligne' => 'ligne.id',
                'car' => 'car.id',
                'date_from' => 'datedepartprevue[after]',
                'date_to' => 'datedepartprevue[before]',
            ],
            [
                'id',
                'provenance',
                'destination',
                'datedepartprevue',
                'placestotal',
                'createdAt'
            ]
            // Plus de chargement de TOUTES les lignes/cars : filtres ligne+véhicule en autocomplete distant (RemoteCombobox → /search)
        );

        return $this->render('voyage/index.html.twig', $data);
    }

    #[Route('/{id}', name: 'show', methods: ['GET'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('VOYAGE_VOIR')]
    public function show(int $id): Response
    {
        try {
            $voyage = $this->api->item('/api/voyages/' . $id);
            $tickets = $this->api->collection('/api/tickets', [
                // Le filtre API est 'voyage.id' (pas 'voyage') : sinon le param est IGNORÉ et on
                // récupère TOUS les billets.
                'voyage.id' => $id,
                'statut' => 'VALIDE',
                'itemsPerPage' => 500
            ]); /*
                - Cette liste sert le TABLEAU « billets émis ». Elle reste bornée par le périmètre de
                  gare, et c'est voulu : une liste nominative de passagers n'a pas à s'ouvrir parce
                  qu'on ouvre des totaux. Les CHIFFRES, eux, ne viennent plus d'ici (cf. ci-dessous)
            */
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'voyage.index');
            if($response) {
                return $response;
            }
        }

        /*
            LES CHIFFRES DU DÉPART VIENNENT DU SERVEUR, plus d'une addition faite ici.

            Cette page composait sa recette et son remplissage en additionnant les collections d'API
            ('/api/tickets?voyage.id=', '/api/bagages?voyage.id=', '/api/reservations?voyage.id='). Or
            'GareScopeExtension' filtre ces collections : le MÊME départ affichait 38 000 FCFA au chef
            d'Adjamé et 30 000 au chef de Korhogo, l'écart étant une réservation payée Adjamé → Bouaké
            dont aucune des deux gares n'est Korhogo. Deux personnes ne lisaient pas le même départ, et
            rien ne le signalait.

            Les règles se dupliquaient par la même occasion : on comptait ici les bagages PERDU hors
            recette et on oubliait les frais de suivi d'un courrier, quand les repositories faisaient
            l'inverse. Tout cela vit désormais dans 'VoyageResultatService' côté API, servi HORS
            périmètre de gare et verrouillé par 'tests/Api/ResultatVoyageTest.php'.
        */
        $r = [];
        try {
            $r = $this->api->item('/api/voyages/' . $id . '/resultat');
        } catch(ApiException) {
            // La fiche reste affichable sans ses totaux plutôt que de tomber sur un 500.
        }

        $recette = (int) ($r['recette'] ?? 0);
        $totalDepenses = $r['depenses'] ?? null;
        /*
            NULL et non 0 : sans 'DEPENSE_VOIR', l'API répond « je ne te le dis pas ». Un zéro ferait
            lire un résultat égal à la recette, c'est-à-dire un chiffre faux. L'écran masque le bloc.
        */
        $depensesLisibles = $totalDepenses !== null;

        $nbrTickets = count($tickets);

        // ── Arrêts de la ligne ─────────────────────────────────────────────
        // Toujours nécessaires ici : ils portent l'avancement du commercial et la détection d'une gare
        // en amont de la provenance. L'occupation, elle, ne se calcule plus à partir d'eux.
        $ordreParGare = [];
        $arrets = [];
        try {
            if(!empty($voyage['ligne']['id'])) {
                $ligne = $this->api->item('/api/lignes/' . $voyage['ligne']['id']);
                foreach($ligne['arrets'] ?? [] as $a) {
                    $ordreParGare[$a['gare']['id']] = $a['ordre'];
                    $arrets[] = ['id' => $a['gare']['id'], 'libelle' => $a['gare']['libelle'], 'ordre' => $a['ordre']];
                }
                usort($arrets, fn($x, $y) => $x['ordre'] <=> $y['ordre']);
            }
        } catch(ApiException) {
            // ligne indisponible : l'écran se passe de l'avancement
        }

        // Départ partiel : la gare de l'agent est-elle EN AMONT de la provenance effective du voyage ?
        // Si oui, elle n'intervient pas dessus (ni exploitation car/personnel, ni réception).
        $gareEnAmont = false;
        $userGare = $this->getUser()?->getGare();
        $userGareId = $userGare['id'] ?? null;
        $provenanceId = $voyage['gareprovenance']['id'] ?? ($voyage['ligne']['gareorigine']['id'] ?? null);
        if($userGareId !== null && $provenanceId !== null
            && isset($ordreParGare[$userGareId], $ordreParGare[$provenanceId])
            && $ordreParGare[$userGareId] < $ordreParGare[$provenanceId]) {
            $gareEnAmont = true;
        }

        /*
            Les tronçons arrivent calculés par 'CapaciteService', l'autorité de la capacité — la règle
            que le README désigne comme la plus facile à faire régresser (on compte des SIÈGES sur des
            intervalles, et un billet évincé n'occupe rien). On ne fait ici que renommer les clés pour
            le gabarit, qui parle d'« occupees ».
        */
        $segments = array_map(
            static fn (array $t): array => [
                'depart' => $t['depart'],
                'arrivee' => $t['arrivee'],
                'occupees' => $t['occupation'],
                'taux' => $t['taux'],
            ],
            $r['troncons'] ?? []
        );

        // Journal d'activité du voyage (qui a fait quoi : changement de car, commercial, réception…)
        $activites = [];
        try {
            $activites = $this->api->collection('/api/activites', [
                'cibletype' => 'Voyage',
                'cibleid' => $id,
                'order[createdAt]' => 'desc',
                'itemsPerPage' => 30
            ]);
        } catch(ApiException) {
            // pas bloquant
        }

        return $this->render('voyage/show.html.twig', [
            'voyage' => $voyage,
            'recette' => $recette,
            'recette_billets' => (int) ($r['billets'] ?? 0),
            'recette_reservations' => (int) ($r['reservations'] ?? 0),
            'recette_courriers' => (int) ($r['courriers'] ?? 0),
            'recette_bagages' => (int) ($r['bagages'] ?? 0),
            'depenses_voyage' => $r['lignesDepenses'] ?? [],
            'total_depenses_voyage' => (int) ($totalDepenses ?? 0),
            'depenses_lisibles' => $depensesLisibles,
            'resultat_voyage' => $r['resultat'] ?? null,
            'nbr_tickets' => $nbrTickets,
            'taux_remplissage' => (int) ($r['tauxRemplissage'] ?? 0),
            'places_occupees' => (int) ($r['picOccupation'] ?? 0),
            'places_restantes' => (int) ($r['placesRestantes'] ?? 0),
            'segments' => $segments,
            'arrets' => $arrets,
            'activites' => $activites,
            'gareEnAmont' => $gareEnAmont
        ]);
    }

    #[Route('/{id}/manifeste', name: 'manifeste', methods: ['GET'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('VOYAGE_VOIR')]
    public function manifeste(int $id): Response
    {
        try {
            $manifeste = $this->api->item('/api/voyages/' . $id . '/manifeste');
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'voyage.show', ['id' => $id]);
            if($response) {
                return $response;
            }
        }

        return $this->render('voyage/manifeste.html.twig', [
            'm' => $manifeste,
        ]);
    }

    #[Route('/nouveau', name: 'new', methods: ['GET', 'POST'])]
    #[IsGranted('VOYAGE_CREER')]
    public function new(Request $request): Response
    {
        // ── ÉTAT PRÉCÉDENT (désactivé) — on chargeait TOUTES les lignes + cars disponibles pour les selects ──
        // try {
        //     $lignes = $this->api->collection('/api/lignes');
        //     $cars = $this->api->get('/api/cars', ['etat' => 'DISPONIBLE']);
        // } catch(ApiException $e) {
        //     $response = $this->apiExceptionHandler->handle($e, null, 'voyage.index');
        //     if($response) {
        //         return $response;
        //     }
        // }

        // Ligne et car sont désormais des autocompletes distants (RemoteChoiceType → /search) : aucune liste chargée.
        $form = $this->createForm(VoyageFormType::class);
        $form->handleRequest($request);

        if($form->isSubmitted() && $form->isValid()) {
            // provenance/destination sont dérivés de la ligne côté backend (VoyageProcessor)
            $payload = [
                'datedepartprevue' => $form->get('datedepartprevue')->getData()?->format('Y-m-d\TH:i:s.v\Z'),
                'datearriveeprevue' => $form->get('datearriveeprevue')->getData()?->format('Y-m-d\TH:i:s.v\Z'),
                'ligne' => '/api/lignes/' . $form->get('ligne')->getData()
            ];

            $carId = $form->get('car')->getData();
            if($carId) {
                $payload['car'] = '/api/cars/' . $carId;
            }

            $placesprevues = $form->get('placesprevues')->getData();
            $payload['placesprevues'] = $placesprevues !== null ? (int) $placesprevues : null;

            try {
                $this->api->post('/api/voyages', $payload);
                $this->addFlash('success', 'Le voyage a été créé avec succès');
                return $this->redirectToRoute('voyage.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'voyage.new');
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('voyage/new.html.twig', [
            'form' => $form
        ]);
    }

    #[Route('/{id}/modifier', name: 'edit', methods: ['GET', 'POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('VOYAGE_MODIFIER')]
    public function edit(int $id, Request $request): Response
    {
        try {
            $voyage = $this->api->item('/api/voyages/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'voyage.index');
            if($response) {
                return $response;
            }
        }
        // ── ÉTAT PRÉCÉDENT (désactivé) — on chargeait tous les cars DISPONIBLE + on injectait le car
        //    courant (souvent EN_VOYAGE, absent de la liste). Désormais : autocomplete distant, on ne
        //    garde que l'id + le libellé du car courant pour préselectionner le champ. ──
        // $cars = $this->api->get('/api/cars', ['etat' => 'DISPONIBLE']);
        // if(!empty($voyage['car'])) {
        //     $currentCarId = $voyage['car']['id'];
        //     $alreadyInList = array_filter($cars['member'], fn($c) => $c['id'] === $currentCarId);
        //     if(empty($alreadyInList)) { array_unshift($cars['member'], $voyage['car']); }
        // }

        // Libellé du car courant (read:Voyage embarque id + matricule + marque)
        $initialCarLabel = null;
        if (!empty($voyage['car'])) {
            $initialCarLabel = ($voyage['car']['matricule'] ?? '#' . $voyage['car']['id'])
                . ' (' . ($voyage['car']['marque']['libelle'] ?? '-') . ')';
        }

        $defaultData = [ /*
            - Pré-remplissage ; provenance/destination dérivent de la ligne (non éditables)
        */
            'datedepartprevue' => new \DateTimeImmutable($voyage['datedepartprevue']),
            'datearriveeprevue' => !empty($voyage['datearriveeprevue']) ? new \DateTimeImmutable($voyage['datearriveeprevue']) : null,
            'car' => $voyage['car']['id'] ?? null,
            'placesprevues' => $voyage['placesprevues'] ?? null
        ];

        $form = $this->createForm(VoyageEditFormType::class, $defaultData, [
            'initial_car' => $voyage['car']['id'] ?? null,
            'initial_car_label' => $initialCarLabel,
        ]);
        $form->handleRequest($request);

        if($form->isSubmitted() && $form->isValid()) {
            $payload = [
                'datedepartprevue' => $form->get('datedepartprevue')->getData()?->format('Y-m-d\TH:i:s.v\Z'),
                'datearriveeprevue' => $form->get('datearriveeprevue')->getData()?->format('Y-m-d\TH:i:s.v\Z')
            ];
            $carId = $form->get('car')->getData();
            if($carId) {
                $payload['car'] = '/api/cars/' . $carId;
            } /* - Ou..
                if(!empty($data['car'])) {
                    $payload['car'] = '/api/cars/' . (int) $data['car'];
                } else {
                    $payload['car'] = null;
                }
            */
            $placesprevues = $form->get('placesprevues')->getData();
            $payload['placesprevues'] = $placesprevues !== null ? (int) $placesprevues : null;

            try {
                $this->api->patch('/api/voyages/' . $id, $payload);
                $this->addFlash('success', 'Le voyage a été modifié avec succès');
                return $this->redirectToRoute('voyage.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'voyage.edit', ['id' => $id]);
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('voyage/edit.html.twig', [
            'form' => $form,
            'voyage' => $voyage
        ]);
    }

    #[Route('/{id}/cloturer', name: 'cloturer', methods: ['GET', 'POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('VOYAGE_MODIFIER')]
    public function cloturer(int $id, Request $request): Response
    {
        try {
            $voyage = $this->api->item('/api/voyages/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'voyage.index');
            if($response) {
                return $response;
            }
        } /*
            - On a vérifié si le voyage est terminé au niveau du backend
        */
        $form = $this->createForm(VoyageclotureFormType::class);
        $form->handleRequest($request);

        if($form->isSubmitted() && $form->isValid()) {
            $payload = [
                'datearriveereelle' => $form->get('datearriveereelle')->getData()?->format('Y-m-d\TH:i:s.v\Z')
            ];
            try {
                $this->api->patch('/api/voyages/' . $id . '/cloturer', $payload); // route dédiée de clôture
                $this->addFlash('success', 'Le voyage a été clôturé avec succès');
                return $this->redirectToRoute('voyage.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'voyage.cloturer', ['id' => $id]);
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('voyage/cloture.html.twig', [
            'form' => $form,
            'voyage' => $voyage
        ]);
    }

    #[Route('/{id}/receptionner', name: 'receptionner', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('ROLE_USER')]
    public function receptionner(int $id, Request $request): Response
    {
        if($this->isCsrfTokenValid('receptionner_voyage', $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/voyages/' . $id . '/receptionner');
                $this->addFlash('success', 'Voyage réceptionné à votre gare : les courriers et bagages qui y descendent ont été mis à jour');
            } catch (ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'voyage.show', ['id' => $id]);
                if ($response) {
                    return $response;
                }
            }
        }
        return $this->redirectToRoute('voyage.show', ['id' => $id]);
    }

    /**
     * Un administrateur consigne le passage d'une gare que personne n'a pointée.
     *
     * La réception exige que les arrêts en amont aient été pointés — sans quoi une gare en aval, en
     * réceptionnant trop tôt, ferme les ventes et les réservations de celles qu'elle survole. Reste
     * l'oubli : cette action est la seule porte de sortie, et elle demande l'HEURE RÉELLE du passage
     * parce que c'est précisément le trou qu'on répare.
     *
     * Elle ne réceptionne PAS les colis : la gare le fera elle-même (cf. `RattraperPassageProcessor`).
     */
    #[Route('/{id}/rattraper-passage', name: 'rattraper_passage', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('ROLE_ADMIN')]
    public function rattraperPassage(int $id, Request $request): Response
    {
        if ($this->isCsrfTokenValid('voyage_rattraper_passage', $request->request->get('_token'))) {
            $gareId = (int) $request->request->get('gare');
            $arrivee = (string) $request->request->get('arrivee');

            try {
                $this->api->patch('/api/voyages/' . $id . '/rattraper-passage', [
                    'gare' => '/api/gares/' . $gareId,
                    // 'datetime-local' rend « 2026-09-21T14:30 » : l'API attend une date complète.
                    'arrivee' => $arrivee === '' ? null : (new \DateTimeImmutable($arrivee))->format(DATE_ATOM),
                ]);
                $this->addFlash('success', 'Passage consigné : les gares suivantes peuvent réceptionner. Les colis de cette gare restent à réceptionner par elle.');
            } catch (ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'voyage.show', ['id' => $id]);
                if ($response) {
                    return $response;
                }
            }
        }

        return $this->redirectToRoute('voyage.show', ['id' => $id]);
    }

    #[Route('/{id}/repartir', name: 'repartir', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('ROLE_USER')]
    public function repartir(int $id, Request $request): Response
    {
        if($this->isCsrfTokenValid('repartir_voyage', $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/voyages/' . $id . '/repartir');
                $this->addFlash('success', 'Départ du car de votre gare enregistré');
            } catch (ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'voyage.show', ['id' => $id]);
                if ($response) {
                    return $response;
                }
            }
        }
        return $this->redirectToRoute('voyage.show', ['id' => $id]);
    }

    #[Route('/{id}/demarrer', name: 'demarrer', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('VOYAGE_MODIFIER')]
    public function demarrer(int $id, Request $request): Response
    {
        if ($this->isCsrfTokenValid('demarrer_voyage', $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/voyages/' . $id . '/demarrer');
                $this->addFlash('success', 'Voyage démarré : les colis passent en transit et les bagages sont embarqués');
            } catch (ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'voyage.show', ['id' => $id]);
                if ($response) {
                    return $response;
                }
            }
        }
        return $this->redirectToRoute('voyage.show', ['id' => $id]);
    }

    /**
     * Page d'affectation du commercial à bord. GET : formulaire (select des users). POST : affecte
     * (commercial = id user) ou retire (vide).
     */
    #[Route('/{id}/commercial', name: 'commercial', methods: ['GET', 'POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('VOYAGE_MODIFIER')]
    public function commercial(int $id, Request $request): Response
    {
        if($request->isMethod('POST')) {
            if($this->isCsrfTokenValid('voyage_commercial', $request->request->get('_token'))) {
                $commercialId = $request->request->get('commercial');
                try {
                    $this->api->patch('/api/voyages/' . $id . '/commercial', [
                        'commercial' => $commercialId ? '/api/users/' . (int) $commercialId : null,
                    ]);
                    $this->addFlash('success', $commercialId ? 'Commercial affecté au voyage' : 'Commercial retiré du voyage');
                    return $this->redirectToRoute('voyage.show', ['id' => $id]);
                } catch (ApiException $e) {
                    $response = $this->apiExceptionHandler->handle($e, null, 'voyage.commercial', ['id' => $id]);
                    if($response) {
                        return $response;
                    }
                }
            }
            return $this->redirectToRoute('voyage.show', ['id' => $id]);
        }

        // GET : formulaire
        $users = [];
        try {
            $voyage = $this->api->item('/api/voyages/' . $id);
        } catch (ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'voyage.index');
            if($response) {
                return $response;
            }
        }
        try {
            // Sonde de permission (USER_VOIR) uniquement : le select commercial est un autocomplete
            // distant (tom-select → /search), on ne charge donc plus TOUS les utilisateurs.
            $users = $this->api->collection('/api/users?itemsPerPage=1'); // vide si pas la permission → garde du template
        } catch (ApiException) {
            // pas bloquant
        }

        return $this->render('voyage/commercial.html.twig', [
            'voyage' => $voyage,
            'users' => $users
        ]);
    }

    /**
     * Le commercial à bord fait avancer la position du car à la gare 'gare'.
     */
    #[Route('/{id}/avancer', name: 'avancer', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('ROLE_USER')]
    public function avancer(int $id, Request $request): Response
    {
        if($this->isCsrfTokenValid('voyage_avancer', $request->request->get('_token'))) {
            $gareId = $request->request->get('gare');
            try {
                $this->api->patch('/api/voyages/' . $id . '/avancer', [
                    'gare' => '/api/gares/' . (int) $gareId,
                ]);
                $this->addFlash('success', 'Position du car mise à jour');
            } catch (ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'voyage.show', ['id' => $id]);
                if($response) {
                    return $response;
                }
            }
        }
        return $this->redirectToRoute('voyage.show', ['id' => $id]);
    }

    #[Route('/{id}/car', name: 'affect.car', methods: ['GET', 'POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('VOYAGE_MODIFIER')]
    public function car(int $id, Request $request): Response
    {
        try {
            $voyage = $this->api->item('/api/voyages/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'voyage.index');
            if($response) {
                return $response;
            }
        }
        // ── ÉTAT PRÉCÉDENT (désactivé) — $cars = get('/api/cars', ['etat'=>'DISPONIBLE']) : autocomplete distant ──

        // Préselection du car courant (si déjà affecté) — read:Voyage embarque id/matricule/marque
        $initialCarLabel = !empty($voyage['car'])
            ? (($voyage['car']['matricule'] ?? '#' . $voyage['car']['id']) . ' (' . ($voyage['car']['marque']['libelle'] ?? '-') . ')')
            : null;

        $form = $this->createForm(VoyageAffectationCarFormType::class, null, [
            'initial_car' => $voyage['car']['id'] ?? null,
            'initial_car_label' => $initialCarLabel,
        ]);
        $form->handleRequest($request);

        if($form->isSubmitted() && $form->isValid()) {
            $payload = ['car' => '/api/cars/' . $form->get('car')->getData()];
            try {
                $this->api->patch('/api/voyages/' . $id . '/car', $payload);
                $this->addFlash('success', 'Le véhicule a été affecté avec succès');
                return $this->redirectToRoute('voyage.show', ['id' => $id]);
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'voyage.index');
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('voyage/car.html.twig', [
            'form' => $form,
            'voyage' => $voyage
        ]);
    }

    #[Route('/{id}/personnel', name: 'affect.personnel', methods: ['GET', 'POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('VOYAGE_MODIFIER')]
    public function personnel(int $id, Request $request): Response
    {
        try {
            $voyage = $this->api->item('/api/voyages/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'voyage.index');
            if($response) {
                return $response;
            }
        }
        // ── ÉTAT PRÉCÉDENT (désactivé) — $personnels = collection('/api/personnels', ['statut'=>'ACTIF']) : autocomplete distant ──

        $form = $this->createForm(VoyageAffectationPersonnelFormType::class);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $payload = [
                // (int) : l'autocomplete distant renvoie une string, or l'input API attend un int
                'personnel' => (int) $form->get('personnel')->getData(),
                'motif' => $form->get('motif')->getData()
            ];
            try {
                $this->api->patch('/api/voyages/' . $id . '/personnel', $payload);
                $this->addFlash('success', 'Le personnel a été affecté avec succès');
                return $this->redirectToRoute('voyage.show', ['id' => $id]);
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'voyage.index');
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('voyage/personnel.html.twig', [
            'form' => $form,
            'voyage' => $voyage
        ]);
    }

    #[Route('/{id}/supprimer', name: 'delete', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('VOYAGE_SUPPRIMER')]
    public function delete(int $id, Request $request): Response
    {
        if($this->isCsrfTokenValid('delete_voyage', $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/voyages/' . $id . '/remove');
                $this->addFlash('success', 'Le voyage a été supprimé avec succès');
            } catch (ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'voyage.index');
                if($response) {
                    return $response;
                }
            }
        }
        return $this->redirectToRoute('voyage.index');
    }
}