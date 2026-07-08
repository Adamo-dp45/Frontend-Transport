<?php

namespace App\Controller;

use App\Controller\Trait\GareActionTrait;
use App\Domain\Helper\ApiExceptionHandlerHelper;
use App\Domain\Helper\ApiHelper;
use App\Domain\Helper\TableHelper;
use App\Domain\Service\PdfService;
use App\Entity\ApiUser;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\ParameterBag\ParameterBagInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/courrier', name: 'courrier.')]
#[IsGranted('ROLE_USER')]
final class CourrierController extends AbstractController
{
    use GareActionTrait;

    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler,
        private readonly TableHelper $tableHelper
    )
    {
    }

    #[Route('', name: 'index', methods: ['GET'])]
    #[IsGranted('COURRIER_VOIR')]
    public function index(Request $request): Response
    {
        /**
         * @var ApiUser
         */
        $user = $this->getUser();
        $canFilterGare = $user->getGare() === null;

        $allowedFilters = [
            'search' => 'codecourrier',
            'statut' => 'statut',
            'voyage' => 'voyage.id',
            'date_from' => 'createdAt[after]',
            'date_to' => 'createdAt[before]'
        ];
        $extras = [
            'gares' => [],
            'voyages' => $this->api->collection('/api/voyages?exists[datearriveereelle]=false'),
        ];
        if($canFilterGare) {
            $allowedFilters['garedepart'] = 'garedepart.id';
            $allowedFilters['garearrivee'] = 'garearrivee.id';
            $extras['gares'] = $this->api->collection('/api/gares');
        }

        $data = $this->tableHelper->handleIndex('/api/courriers', $request->query->all(),
            $allowedFilters,
            [
                'id',
                'codecourrier',
                'montant',
                'statut',
                'createdAt'
            ],
            $extras
        );

        return $this->render('courrier/index.html.twig', $data);
    }

    #[Route('/{id}', name: 'show', methods: ['GET'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('COURRIER_VOIR')]
    public function show(int $id): Response
    {
        try {
            $courrier = $this->api->item('/api/courriers/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'courrier.index');
            if ($response) return $response;
        }

        // Modifier / annuler / supprimer (EN_ATTENTE) = gare ÉMETTRICE (garedepart). Livrer = gare de
        // DESTINATION (garearrivee). Perdu = l'une ou l'autre. Admin / central : non restreints.
        $peutAgirDepart = $this->peutAgirSurGare($courrier['garedepart']['id'] ?? null);
        $peutAgirArrivee = $this->peutAgirSurGare($courrier['garearrivee']['id'] ?? null);

        return $this->render('courrier/show.html.twig', [
            'courrier' => $courrier,
            'peutAgirDepart' => $peutAgirDepart,
            'peutAgirArrivee' => $peutAgirArrivee,
            'peutAgir' => $peutAgirDepart || $peutAgirArrivee, // large (rétrocompat)
        ]);
    }

    #[Route('/nouveau', name: 'new', methods: ['GET', 'POST'])]
    #[IsGranted('COURRIER_CREER')]
    public function new(Request $request): Response
    {
        if ($request->isMethod('GET')) {
            try {
                $voyages = $this->api->collection('/api/voyages?exists[datearriveereelle]=false');
                $tarifcourriers = $this->api->collection('/api/tarifcourriers');
                $gares = $this->api->collection('/api/gares'); // destination : n'importe quelle gare de l'entreprise
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'courrier.index');
                if($response) {
                    return $response;
                }
            }

            /**
             * @var ApiUser
             */
            $user = $this->getUser();
            $userGare = $user->getGare();
            $voyageId = $request->query->getInt('voyage'); // raccourci depuis la liste des voyages

            return $this->render('courrier/new.html.twig', [
                'voyages' => $voyages,
                'tarifcourriers' => $tarifcourriers,
                'gares' => $gares,
                'userGareId' => $userGare['id'] ?? null,
                'userGareLibelle' => $userGare['libelle'] ?? null,
                'preselectVoyageId' => $voyageId ?: null
            ]);
        }

        // POST : JSON envoyé par le composant React CourrierForm
        try {
            $payload = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return $this->json(['detail' => 'Corps de requête JSON invalide'], 400);
        }

        try {
            $courrier = $this->api->post('/api/courriers', $this->buildPayload($payload));
            return $this->json(['created' => $courrier['id'] ?? null]);
        } catch (ApiException $e) {
            return $this->json(['detail' => $e->getMessage()], $e->getCode() ?: 422);
        }
    }

    #[Route('/arrets/{id}', name: 'arrets', methods: ['GET'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('COURRIER_VOIR')]
    public function arrets(int $id): JsonResponse
    {
        try {
            $voyage = $this->api->item('/api/voyages/' . $id);
            $ligneId = $voyage['ligne']['id'] ?? null;
            if (!$ligneId) {
                return $this->json(['arrets' => []]); // voyage non rattaché à une ligne
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
        } catch (ApiException $e) {
            return $this->json(['error' => $e->getMessage()], $e->getCode() ?: 500);
        }
    }

    #[Route('/{id}/modifier', name: 'edit', methods: ['GET', 'POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('COURRIER_MODIFIER')]
    public function edit(int $id, Request $request): Response
    {
        if ($request->isMethod('GET')) {
            try {
                $courrier = $this->api->item('/api/courriers/' . $id);
                $voyages = $this->api->collection('/api/voyages?exists[datearriveereelle]=false');
                $tarifcourriers = $this->api->collection('/api/tarifcourriers');
                $gares = $this->api->collection('/api/gares'); // destination : n'importe quelle gare de l'entreprise
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'courrier.index');
                if($response) {
                    return $response;
                }
            }

            /**
             * @var ApiUser
             */
            $user = $this->getUser();
            $userGare = $user->getGare();

            return $this->render('courrier/edit.html.twig', [
                'courrier' => $courrier,
                'voyages' => $voyages,
                'tarifcourriers' => $tarifcourriers,
                'gares' => $gares,
                'userGareId' => $userGare['id'] ?? null,
                'userGareLibelle' => $userGare['libelle'] ?? null
            ]);
        }

        // POST : JSON envoyé par le composant React CourrierForm
        try {
            $payload = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return $this->json(['detail' => 'Corps de requête JSON invalide'], 400);
        }

        try {
            $this->api->patch('/api/courriers/' . $id, $this->buildPayload($payload));
            return $this->json(['updated' => $id]);
        } catch (ApiException $e) {
            return $this->json(['detail' => $e->getMessage()], $e->getCode() ?: 422);
        }
    }

    #[Route('/{id}/livrer', name: 'livrer', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('COURRIER_MODIFIER')]
    public function livrer(int $id): Response
    {
        try {
            $this->api->patch('/api/courriers/' . $id . '/livrer');
            $this->addFlash('success', 'Le courrier a été marqué comme livré');
        } catch (ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'courrier.show', ['id' => $id]);
            if($response) {
                return $response;
            }
        }

        return $this->redirectToRoute('courrier.show', ['id' => $id]);
    }

    #[Route('/{id}/annuler', name: 'annuler', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('COURRIER_MODIFIER')]
    public function annuler(int $id): Response
    {
        try {
            $this->api->patch('/api/courriers/' . $id . '/annuler');
            $this->addFlash('success', 'Le courrier a été annulé');
        } catch (ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'courrier.show', ['id' => $id]);
            if($response) {
                return $response;
            }
        }

        return $this->redirectToRoute('courrier.show', ['id' => $id]);
    }

    #[Route('/{id}/perdu', name: 'perdu', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('COURRIER_MODIFIER')]
    public function perdu(int $id): Response
    {
        try {
            $this->api->patch('/api/courriers/' . $id . '/perdu');
            $this->addFlash('success', 'Le courrier a été déclaré perdu');
        } catch (ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'courrier.show', ['id' => $id]);
            if($response) {
                return $response;
            }
        }

        return $this->redirectToRoute('courrier.show', ['id' => $id]);
    }

    #[Route('/colis/{id}/perdu', name: 'colis.perdu', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('COURRIER_MODIFIER')]
    public function colisperdu(int $id, Request $request): Response
    {
        $courrierId = $request->request->get('courrier_id');
        try {
            $this->api->patch('/api/detailcourriers/' . $id . '/perdu');
            $this->addFlash('success', 'Le colis a été déclaré perdu');
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'courrier.show', ['id' => $courrierId]);
            if($response) {
                return $response;
            }
        }
        return $this->redirectToRoute('courrier.show', ['id' => $courrierId]);
    }

    #[Route('/{id}/print', name: 'print', methods: ['GET'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('COURRIER_VOIR')]
    public function print(int $id, PdfService $pdfService, ParameterBagInterface $params): Response
    {
        $courrier = null;
        $entreprise = null;
        try {
            $courrier = $this->api->item('/api/courriers/' . $id);
            $entreprise = $this->api->item('/api/me/entreprise');
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'courrier.show', ['id' => $id]);
            if($response) {
                return $response;
            }
        }

        // Garde d'impression : gares (départ + arrivée) saisies + gare créatrice (départ).
        // Empêche le contournement par URL directe (miroir du bouton).
        if (empty($courrier['garedepart']) || empty($courrier['garearrivee'])
            || !$this->peutAgirSurGare($courrier['garedepart']['id'] ?? null)
        ) {
            $this->addFlash('error', 'Ce courrier ne peut pas être imprimé (gares de départ et d\'arrivée requises, à votre gare d\'émission).');
            return $this->redirectToRoute('courrier.show', ['id' => $id]);
        }
        /*
            $logoBase64 = null;
            if(!empty($entreprise['image'])) { /*
                - On récupère l'image 'glide' depuis le backend et encodage base64
            *
                try {
                    $imageUrl = $entreprise['image']['contentUrl'];
                    $response = HttpClient::create()->request('GET', $params->get('api.endpoint') . '/media' . $imageUrl . '?w=400&h=400&fm=jpg&fit=crop');
                    $content = $response->getContent();
                    $mimeType = $response->getHeaders()['content-type'][0] ?? 'image/jpeg';
                    $logoBase64 = 'data:' . $mimeType . ';base64,' . base64_encode($content);
                } catch(\Throwable) {
                    $logoBase64 = null;
                }
            }
        */
        return $pdfService->generate(
            'mails/courrier/ticket.html.twig',
            [
                'courrier' => $courrier,
                'entreprise' => $entreprise,
                // 'logoBase64' => $logoBase64
            ],
            'courrier-' . ($courrier['codecourrier'] ?? $id) . date('YmdHis') . '.pdf'
        );
    }

    #[Route('/{id}/supprimer', name: 'delete', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('COURRIER_SUPPRIMER')]
    public function delete(int $id, Request $request): Response
    {
        if($this->isCsrfTokenValid('delete_courrier', $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/courriers/' . $id . '/remove');
                $this->addFlash('success', 'Le courrier a été supprimé avec succès');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'courrier.index');
                if($response) {
                    return $response;
                }
            }
        }
        return $this->redirectToRoute('courrier.index');
    }

    /**
     * Construit le payload API à partir du JSON envoyé par le composant React.
     * Les gares de départ/arrivée sont OBLIGATOIRES (destination du colis) ; le voyage reste optionnel.
     * La taxe de chaque colis est recalculée côté API via findTarifForValeur.
     */
    private function buildPayload(array $data): array
    {
        $details = array_map(fn($d) => [
            'id' => isset($d['id']) && $d['id'] !== '' && $d['id'] !== null ? (int) $d['id'] : null, // id du colis existant (édition) → réconciliation côté API
            'nature' => $d['nature'] ?? '',
            'designation' => $d['designation'] ?? '',
            'emballage' => !empty($d['emballage']) ? $d['emballage'] : null,
            'type' => $d['type'] ?? 'NORMAL',
            'poids' => isset($d['poids']) && $d['poids'] !== '' && $d['poids'] !== null ? (int) $d['poids'] : null,
            'valeur' => (int) ($d['valeur'] ?? 0),
        ], $data['details'] ?? []);

        return [
            'nomexpediteur' => $data['nomexpediteur'] ?? '',
            'contactexpediteur' => $data['contactexpediteur'] ?? '',
            'nomdestinataire' => $data['nomdestinataire'] ?? '',
            'contactdestinataire' => $data['contactdestinataire'] ?? '',
            'gareDepart' => !empty($data['gareDepart']) ? (int) $data['gareDepart'] : null,
            'gareArrivee' => !empty($data['gareArrivee']) ? (int) $data['gareArrivee'] : null,
            'voyage' => !empty($data['voyage']) ? (int) $data['voyage'] : null,
            'fraissuivi' => !empty($data['fraissuivi']) ? (int) $data['fraissuivi'] : null,
            'modepaiement' => $data['modepaiement'] ?? 'ENVOI',
            'details' => $details,
        ];
    }
}
