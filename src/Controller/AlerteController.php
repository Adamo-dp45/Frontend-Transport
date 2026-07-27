<?php

namespace App\Controller;

use App\Domain\Helper\ApiHelper;
use App\Domain\Helper\TableHelper;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Centre de notifications (côté FT) : page de listing filtrable + endpoints JSON consommés par la
 * cloche du header (assets/modules/notifications.js). Simple proxy vers l'API : le ciblage
 * (audience) et l'ordonnancement sont décidés côté backend ; ici on n'ajoute que le lien « source »
 * (route de la fiche concernée) pour l'affichage.
 */
#[Route('/alertes', name: 'alerte.')]
#[IsGranted('ROLE_USER')]
final class AlerteController extends AbstractController
{
    /** Correspondance type de source → route FT de la fiche (et si elle attend un id). */
    private const SOURCE_ROUTES = [
        'VOYAGE' => ['voyage.show', true],
        'PIECE' => ['piece.show', true],
        'DEPANNAGE' => ['depannage.show', true],
        'COURRIER' => ['courrier.show', true],
        'BAGAGE' => ['bagage.show', true],
        'USER' => ['user.show', true],
        'RESERVATION' => ['reservation.index', false],
    ];

    public function __construct(
        private readonly ApiHelper $api,
        private readonly TableHelper $tableHelper,
    ) {
    }

    #[Route('', name: 'index', methods: ['GET'])]
    public function index(Request $request): Response
    {
        $data = $this->tableHelper->handleIndex(
            '/api/alertes',
            $request->query->all(),
            [
                'famille' => 'famille',
                'severite' => 'severite',
                'statut' => 'statut',
                'type' => 'type',
            ],
            ['id', 'createdAt', 'severite'],
            [
                'familles' => [
                    'EXPLOITATION' => 'Exploitation',
                    'RESERVATION' => 'Réservation & billetterie',
                    'STOCK_FLOTTE' => 'Stock & flotte',
                    'ANTIFRAUDE' => 'Anti-fraude & incidents',
                ],
                'severites' => [
                    'CRITIQUE' => 'Critique',
                    'AVERTISSEMENT' => 'Avertissement',
                    'INFO' => 'Info',
                ],
                'statuts' => [
                    'ACTIVE' => 'Active',
                    'LUE' => 'Lue',
                    'RESOLUE' => 'Résolue',
                ],
            ]
        );

        $data['items'] = $this->withSourceUrls($data['items']);

        return $this->render('alerte/index.html.twig', $data);
    }

    /** JSON pour le dropdown de la cloche : alertes ACTIVE récentes (ordre serveur). */
    #[Route('/recentes', name: 'recentes', methods: ['GET'])]
    public function recentes(): JsonResponse
    {
        try {
            $items = $this->api->get('/api/alertes/recentes');
        } catch (ApiException) {
            $items = [];
        }

        return new JsonResponse(['items' => $this->withSourceUrls(is_array($items) ? $items : [])]);
    }

    /** JSON pour le badge de la cloche (résumé : total + ventilations). */
    #[Route('/resume', name: 'resume', methods: ['GET'])]
    public function resume(): JsonResponse
    {
        try {
            $data = $this->api->get('/api/alertes/resume');
        } catch (ApiException) {
            $data = ['total' => 0, 'parSeverite' => [], 'parFamille' => []];
        }

        return new JsonResponse($data);
    }

    #[Route('/{id}/lire', name: 'lire', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    public function lire(int $id): JsonResponse
    {
        try {
            $this->api->patch('/api/alertes/' . $id . '/lire', []);
        } catch (ApiException $e) {
            return new JsonResponse(['ok' => false, 'error' => $e->getMessage()], 200);
        }

        return new JsonResponse(['ok' => true]);
    }

    #[Route('/lire-tout', name: 'lire_tout', methods: ['POST'])]
    public function lireTout(): JsonResponse
    {
        try {
            $data = $this->api->post('/api/alertes/lire-tout', []);
        } catch (ApiException) {
            return new JsonResponse(['ok' => false]);
        }

        return new JsonResponse(['ok' => true] + $data);
    }

    /**
     * Ajoute à chaque alerte l'URL de sa fiche source (sourceUrl), calculée côté serveur pour éviter
     * tout appel de route inexistante côté Twig/JS. null si le type n'est pas mappé.
     *
     * @param array<int, array<string, mixed>> $items
     * @return array<int, array<string, mixed>>
     */
    private function withSourceUrls(array $items): array
    {
        foreach ($items as &$item) {
            $item['sourceUrl'] = $this->sourceUrl($item['sourcetype'] ?? null, $item['sourceid'] ?? null);
        }

        return $items;
    }

    private function sourceUrl(?string $sourcetype, ?int $sourceid): ?string
    {
        if ($sourcetype === null || !isset(self::SOURCE_ROUTES[$sourcetype])) {
            return null;
        }

        [$route, $needsId] = self::SOURCE_ROUTES[$sourcetype];
        if ($needsId && $sourceid === null) {
            return null;
        }

        return $this->generateUrl($route, $needsId ? ['id' => $sourceid] : []);
    }
}
