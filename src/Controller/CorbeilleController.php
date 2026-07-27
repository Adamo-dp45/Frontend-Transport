<?php

namespace App\Controller;

use App\Domain\Helper\ApiExceptionHandlerHelper;
use App\Domain\Helper\ApiHelper;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * CORBEILLE (super admin) : vue et gestion multi-entreprises des enregistrements soft-deletés.
 * Proxifie l'API `/api/corbeille` ; les actions destructives passent par des POST CSRF (comme le
 * reste du FT), puis redirigent en conservant les filtres courants (type / entreprise).
 */
#[Route('/admin/systeme/corbeille', name: 'admin.systeme.corbeille.')]
#[IsGranted('ROLE_SUPER_ADMIN')]
final class CorbeilleController extends AbstractController
{
    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler,
    ) {
    }

    #[Route('', name: 'index', methods: ['GET'])]
    public function index(Request $request): Response
    {
        [$type, $entreprise] = $this->filtres($request);

        $query = [];
        if ($type !== null) {
            $query['type'] = $type;
        }
        if ($entreprise !== null) {
            $query['entreprise'] = $entreprise;
        }

        $data = ['total' => 0, 'parType' => [], 'parEntreprise' => [], 'items' => []];
        try {
            $data = $this->api->item('/api/corbeille', $query) ?? $data;
        } catch (ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'admin.systeme.index');
            if ($response) {
                return $response;
            }
        }

        return $this->render('systeme/corbeille.html.twig', [
            'total' => $data['total'] ?? 0,
            'parType' => $data['parType'] ?? [],
            'parEntreprise' => $data['parEntreprise'] ?? [],
            'items' => $data['items'] ?? [],
            'filtreType' => $type,
            'filtreEntreprise' => $entreprise,
        ]);
    }

    #[Route('/{type}/{id}/restaurer', name: 'restaurer', methods: ['POST'], requirements: ['type' => '[a-z]+', 'id' => Requirement::DIGITS])]
    public function restaurer(string $type, int $id, Request $request): Response
    {
        if ($this->isCsrfTokenValid('corbeille', (string) $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/corbeille/' . $type . '/' . $id . '/restaurer');
                $this->addFlash('success', 'Élément restauré avec succès.');
            } catch (ApiException $e) {
                $this->addFlash('danger', $e->getMessage());
            }
        }

        return $this->retour($request);
    }

    #[Route('/{type}/{id}/supprimer', name: 'supprimer', methods: ['POST'], requirements: ['type' => '[a-z]+', 'id' => Requirement::DIGITS])]
    public function supprimer(string $type, int $id, Request $request): Response
    {
        if ($this->isCsrfTokenValid('corbeille', (string) $request->request->get('_token'))) {
            try {
                $this->api->delete('/api/corbeille/' . $type . '/' . $id);
                $this->addFlash('success', 'Élément supprimé définitivement.');
            } catch (ApiException $e) {
                $this->addFlash('danger', $e->getMessage());
            }
        }

        return $this->retour($request);
    }

    #[Route('/restaurer-tout', name: 'restaurer_tout', methods: ['POST'])]
    public function restaurerTout(Request $request): Response
    {
        $this->actionLot($request, '/api/corbeille/restaurer-tout', 'restauré(s)');

        return $this->retour($request);
    }

    #[Route('/vider', name: 'vider', methods: ['POST'])]
    public function vider(Request $request): Response
    {
        $this->actionLot($request, '/api/corbeille/vider', 'supprimé(s) définitivement');

        return $this->retour($request);
    }

    /**
     * Appelle une action de LOT (restaurer-tout / vider) en portant les filtres courants (type /
     * entreprise), transmis en champs cachés du formulaire puis relayés en query à l'API.
     */
    private function actionLot(Request $request, string $endpoint, string $verbe): void
    {
        if (!$this->isCsrfTokenValid('corbeille', (string) $request->request->get('_token'))) {
            return;
        }

        [$type, $entreprise] = $this->filtres($request);
        $query = [];
        if ($type !== null) {
            $query['type'] = $type;
        }
        if ($entreprise !== null) {
            $query['entreprise'] = $entreprise;
        }
        $suffixe = $query ? ('?' . http_build_query($query)) : '';

        try {
            $reponse = $this->api->post($endpoint . $suffixe);
            $this->addFlash('success', $reponse['message'] ?? ('Éléments ' . $verbe . '.'));
        } catch (ApiException $e) {
            $this->addFlash('danger', $e->getMessage());
        }
    }

    /** Lit les filtres depuis la query (GET) OU le corps (POST des actions). */
    private function filtres(Request $request): array
    {
        $type = trim((string) ($request->query->get('type') ?? $request->request->get('type') ?? ''));
        $entrepriseRaw = $request->query->get('entreprise') ?? $request->request->get('entreprise');

        return [
            $type !== '' ? $type : null,
            ($entrepriseRaw !== null && $entrepriseRaw !== '') ? (int) $entrepriseRaw : null,
        ];
    }

    /** Redirige vers la liste en conservant les filtres courants. */
    private function retour(Request $request): Response
    {
        [$type, $entreprise] = $this->filtres($request);
        $params = [];
        if ($type !== null) {
            $params['type'] = $type;
        }
        if ($entreprise !== null) {
            $params['entreprise'] = $entreprise;
        }

        return $this->redirectToRoute('admin.systeme.corbeille.index', $params);
    }
}
