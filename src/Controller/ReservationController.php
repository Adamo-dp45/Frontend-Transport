<?php

namespace App\Controller;

use App\Controller\Trait\GareActionTrait;
use App\Domain\Helper\ApiExceptionHandlerHelper;
use App\Domain\Helper\ApiHelper;
use App\Domain\Helper\TableHelper;
use App\Form\ParametreReservationFormType;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[IsGranted('ROLE_USER')]
final class ReservationController extends AbstractController
{
    use GareActionTrait;

    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler
    )
    {
    }

    #[Route('/reservation', name: 'reservation.index', methods: ['GET'])]
    #[IsGranted('RESERVATION_VOIR')]
    public function index(Request $request, TableHelper $tableHelper): Response
    {
        try {
            $data = $tableHelper->handleIndex('/api/reservations', $request->query->all(),
                [
                    'search' => 'code',
                    'voyage' => 'voyage.id',
                    'statut' => 'statut',
                ],
                ['id', 'code', 'createdAt'],
                [
                    'voyages' => $this->api->collection('/api/voyages?exists[datearriveereelle]=false'),
                ]
            );
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        return $this->render('reservation/index.html.twig', $data);
    }

    #[Route('/reservation/config', name: 'reser.config', methods: ['GET', 'POST'])]
    #[IsGranted('ROLE_ADMIN')]
    public function config(Request $request): Response
    {
        try {
            $parametre = $this->api->item('/api/me/parametre-reservation');
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'reservation.index');
            if($response) {
                return $response;
            }
        }

        $form = $this->createForm(ParametreReservationFormType::class, $parametre);
        $form->handleRequest($request);

        if($form->isSubmitted() && $form->isValid()) {
            try {
                $this->api->patch('/api/me/parametre-reservation', [
                    'delaiPresentationMinutes' => (int) $form->get('delaiPresentationMinutes')->getData(),
                    'delaiPaiementMinutes' => (int) $form->get('delaiPaiementMinutes')->getData(),
                    'penaliteType' => $form->get('penaliteType')->getData(),
                    'penaliteValeur' => (int) $form->get('penaliteValeur')->getData(),
                    'fenetreRegularisationJours' => (int) $form->get('fenetreRegularisationJours')->getData(),
                ]);
                $this->addFlash('success', 'Les paramètres de réservation ont été mis à jour');
                return $this->redirectToRoute('reser.config');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'reser.config');
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('reservation/config.html.twig', [
            'form' => $form,
            'parametre' => $parametre
        ]);
    }

    #[Route('/reservation/nouveau', name: 'reservation.new', methods: ['GET'])]
    #[IsGranted('RESERVATION_CREER')]
    public function new(Request $request): Response
    {
        try {
            /*
                La RÉSERVABILITÉ est décidée par le back-end (/voyages/reservables) : elle dépend de la
                gare de l'agent, de l'avancement réel du car et des durées de trajet par arrêt.

                Elle était reconstituée ici avec des filtres ('datedepartprevue[after]',
                'exists[datedepartreelle]'). Cette copie de la règle est devenue fausse dès que les
                deux se sont affinées : un car parti d'Abidjan reste réservable au départ de Bouaké, où
                il n'est pas encore passé, et l'échéance de Bouaké est bien plus tardive que celle de
                l'origine. Le formulaire masquait donc des départs que l'API accepte.
            */
            $voyages = $this->api->collection('/api/voyages/reservables');
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'reservation.index');
            if($response) {
                return $response;
            }
        }

        $userGare = $this->getUser()->getGare();

        return $this->render('reservation/new.html.twig', [
            'voyages' => $voyages,
            'userGareId' => $userGare['id'] ?? null,
            'userGareLibelle' => $userGare['libelle'] ?? null,
        ]);
    }

    #[Route('/reservation/creer', name: 'reservation.create', methods: ['POST'])]
    #[IsGranted('RESERVATION_CREER')]
    public function create(Request $request): JsonResponse
    {
        try {
            $payload = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);
        } catch(\JsonException) {
            return $this->json(['detail' => 'Corps JSON invalide'], 400);
        }

        if(empty($payload['voyage']) || empty($payload['gare']) || empty($payload['garedescente'])) {
            return $this->json(['detail' => 'Voyage, gare de montée et de descente obligatoires'], 422);
        }

        try {
            $reservation = $this->api->post('/api/reservations', [
                'voyage' => $payload['voyage'],
                'gare' => $payload['gare'],
                'garedescente' => $payload['garedescente'],
                'nomclient' => $payload['nomclient'] ?? null,
                'contactclient' => $payload['contactclient'] ?? null,
                'source' => 'GUICHET',
            ]);
            return $this->json(['id' => $reservation['id'], 'code' => $reservation['code'] ?? null]);
        } catch(ApiException $e) {
            return $this->json(['detail' => $e->getMessage()], $e->getCode() ?: 422);
        }
    }

    #[Route('/reservation/{id}', name: 'reservation.show', methods: ['GET'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('RESERVATION_VOIR')]
    public function show(int $id): Response
    {
        try {
            $reservation = $this->api->item('/api/reservations/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'reservation.index');
            if($response) {
                return $response;
            }
        }

        /*
            Départs de report : la liste vient du BACK-END, qui soumet chaque départ au calcul de
            régularisation lui-même — elle ne peut donc pas proposer ce que le report refusera.

            Elle était reconstituée ici, et divergeait dans les deux sens : filtrée sur la ligne
            d'origine (or n'importe quelle ligne desservant le tronçon convient) et sur l'heure de
            départ du voyage (or c'est le passage à la gare du client qui compte, bien plus tardif
            pour une montée en aval).
        */
        $reportVoyages = [];
        if (($reservation['statut'] ?? null) === 'A_REGULARISER') {
            try {
                foreach ($this->api->collection('/api/reservations/' . $id . '/reports') as $v) {
                    $heure = $v['heurepassage'] ?? $v['datedepartprevue'] ?? null;
                    $reportVoyages[] = [
                        'id' => $v['voyageId'],
                        'codevoyage' => $v['codevoyage'] ?? ('#' . $v['voyageId']),
                        'datedepartprevue' => $heure ? (new \DateTimeImmutable($heure))->format('d/m/Y H:i') : '—',
                        'car' => $v['car'] ?? null,
                        'enRoute' => $v['enRoute'] ?? false,
                    ];
                }
            } catch (ApiException) {
                // liste des reports optionnelle : on n'échoue pas la page si l'appel plante
            }
        }

        // Seule la gare de MONTÉE agit sur la réservation (la descente ne fait que la voir).
        $peutAgir = $this->peutAgirSurGare($reservation['gare']['id'] ?? null);

        return $this->render('reservation/show.html.twig', [
            'reservation' => $reservation,
            'reportVoyages' => $reportVoyages,
            'peutAgir' => $peutAgir,
        ]);
    }

    #[Route('/reservation/{id}/regularisation-apercu', name: 'reservation.regularisation_apercu', methods: ['GET'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('RESERVATION_VOIR')]
    public function regularisationApercu(int $id, Request $request): JsonResponse
    {
        $voyage = (int) $request->query->get('voyage');
        if ($voyage <= 0) {
            return $this->json(['possible' => false, 'message' => 'Choisissez un départ de report.']);
        }
        try {
            $apercu = $this->api->item('/api/reservations/' . $id . '/regularisation?voyage=' . $voyage);
            return $this->json($apercu);
        } catch (ApiException $e) {
            return $this->json(['possible' => false, 'message' => $e->getMessage()], $e->getCode() ?: 400);
        }
    }

    #[Route('/reservation/{id}/regulariser', name: 'reservation.regulariser', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('RESERVATION_MODIFIER')]
    public function regulariser(int $id, Request $request): Response
    {
        if ($this->isCsrfTokenValid('regulariser_reservation', $request->request->get('_token'))) {
            $voyage = (int) $request->request->get('voyage');
            if ($voyage <= 0) {
                $this->addFlash('danger', 'Sélectionnez un départ de report.');
                return $this->redirectToRoute('reservation.show', ['id' => $id]);
            }
            try {
                $this->api->patch('/api/reservations/' . $id . '/regulariser?voyage=' . $voyage);
                $this->addFlash('success', 'Réservation régularisée : billet émis sur le nouveau départ.');
            } catch (ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'reservation.show', ['id' => $id]);
                if ($response) {
                    return $response;
                }
            }
        }
        return $this->redirectToRoute('reservation.show', ['id' => $id]);
    }

    #[Route('/reservation/{id}/confirmer', name: 'reservation.confirmer', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('RESERVATION_MODIFIER')]
    public function confirmer(int $id, Request $request): Response
    {
        if($this->isCsrfTokenValid('confirmer_reservation', $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/reservations/' . $id . '/confirmer');
                $this->addFlash('success', 'Paiement encaissé : la réservation est payée. Émettez le billet pour attribuer un siège.');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'reservation.show', ['id' => $id]);
                if($response) {
                    return $response;
                }
            }
        }
        return $this->redirectToRoute('reservation.show', ['id' => $id]);
    }

    #[Route('/reservation/{id}/emettre-billet', name: 'reservation.emettre_billet', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('RESERVATION_MODIFIER')]
    public function emettreBillet(int $id, Request $request): Response
    {
        if($this->isCsrfTokenValid('emettre_billet_reservation', $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/reservations/' . $id . '/emettre-billet');
                $this->addFlash('success', 'Billet émis : un siège a été attribué au client');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'reservation.show', ['id' => $id]);
                if($response) {
                    return $response;
                }
            }
        }
        return $this->redirectToRoute('reservation.show', ['id' => $id]);
    }

    #[Route('/reservation/{id}/annuler', name: 'reservation.annuler', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('RESERVATION_MODIFIER')]
    public function annuler(int $id, Request $request): Response
    {
        if($this->isCsrfTokenValid('annuler_reservation', $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/reservations/' . $id . '/annuler');
                $this->addFlash('success', 'Réservation annulée');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'reservation.show', ['id' => $id]);
                if($response) {
                    return $response;
                }
            }
        }
        return $this->redirectToRoute('reservation.show', ['id' => $id]);
    }

    // -- Proxys pour le formulaire (arrêts de la ligne + tarif du tronçon) -- //

    #[Route('/reservation/arrets/{id}', name: 'reservation.arrets', methods: ['GET'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('RESERVATION_CREER')]
    public function arrets(int $id): JsonResponse
    {
        try {
            $voyage = $this->api->item('/api/voyages/' . $id);
            $ligneId = $voyage['ligne']['id'] ?? null;
            if(!$ligneId) {
                return $this->json(['arrets' => []]);
            }
            $ligne = $this->api->item('/api/lignes/' . $ligneId);
            $arrets = array_map(fn($a) => [
                'id' => $a['gare']['id'],
                'libelle' => $a['gare']['libelle'],
                'ville' => $a['gare']['ville'] ?? null,
                'ordre' => $a['ordre'],
            ], $ligne['arrets'] ?? []);
            usort($arrets, fn($x, $y) => $x['ordre'] <=> $y['ordre']);
            return $this->json(['arrets' => $arrets]);
        } catch(ApiException $e) {
            return $this->json(['error' => $e->getMessage()], $e->getCode() ?: 500);
        }
    }

    #[Route('/reservation/tarif', name: 'reservation.tarif', methods: ['GET'])]
    #[IsGranted('RESERVATION_CREER')]
    public function tarif(Request $request): JsonResponse
    {
        $montee = $request->query->get('montee');
        $descente = $request->query->get('descente');
        if(!$montee || !$descente) {
            return $this->json(['montant' => null]);
        }
        try {
            $tarifs = $this->api->collection('/api/tarifs', [
                'garedepart.id' => $montee,
                'garearrivee.id' => $descente,
            ]);
            return $this->json(['montant' => $tarifs[0]['montant'] ?? null]);
        } catch(ApiException $e) {
            return $this->json(['montant' => null, 'error' => $e->getMessage()], $e->getCode() ?: 500);
        }
    }
}
