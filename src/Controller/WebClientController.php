<?php

namespace App\Controller;

// ESPACE WEB-CLIENT — DÉSACTIVÉ (mis en commentaire, volontairement pas supprimé).
//
// La réservation client passe désormais par les applications MOBILES (resanative / resaflutter).
// Elles consomment DIRECTEMENT l'API publique du back-end ('/api/reservation/*', PUBLIC_ACCESS,
// scopée par '?slug='). Ce contrôleur n'en était qu'un second consommateur, en proxy web.
//
// L'API publique côté back-end reste EN SERVICE : c'est celle du mobile. Seule cette façade web
// est neutralisée. Plus aucune route 'webclient.*' n'existe tant que ceci est commenté, et c'est
// sans effet de bord : seuls templates/webclient/index.html.twig et base.html.twig les
// référencent, et ils ne sont rendus que d'ici (vérifié sur tout le projet, hors build compilé).
//
// POUR RÉACTIVER : retirer le préfixe '// ' des lignes ci-dessous et supprimer la coquille vide en
// fin de fichier. Le composant React assets/react/controllers/Public/ReservationWeb.tsx et les
// templates templates/webclient/ ont été laissés INTACTS — ils redeviennent atteignables aussitôt.
//
// Commenté ligne à ligne et non en bloc /* */ : le code contient des docblocks, dont le premier
// '*/' aurait refermé le bloc en laissant la suite active.
//
//
// namespace App\Controller;
//
// use App\Domain\Helper\ApiHelper;
// use App\Domain\Service\PdfService;
// use App\Security\Exception\ApiException;
// use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
// use Symfony\Component\HttpFoundation\JsonResponse;
// use Symfony\Component\HttpFoundation\Request;
// use Symfony\Component\HttpFoundation\Response;
// use Symfony\Component\Routing\Attribute\Route;
//
// /**
//  * ESPACE WEB-CLIENT (public, hors authentification agent) : un client réserve directement sur le web,
//  * en consommant la MÊME API publique BK que le futur mobile (opérations API Platform `/api/reservation/*`,
//  * `PUBLIC_ACCESS`, scopées par `?slug=`). Ce contrôleur PROXIFIE cette API (via ApiHelper, sans token)
//  * et rend des pages autonomes. Le bon/billet est rendu ICI (front) — jamais par le back.
//  * Aucune route n'est protégée par #[IsGranted] → accès anonyme (firewall FT `main` lazy).
//  */
// #[Route('/reserver/{slug}', name: 'webclient.', requirements: ['slug' => '[a-z0-9-]+'])]
// final class WebClientController extends AbstractController
// {
//     private const API = '/api/reservation';
//
//     public function __construct(
//         private readonly ApiHelper $api,
//         private readonly PdfService $pdf
//     )
//     {
//     }
//
//     /** Page d'accueil + tunnel de réservation (SPA React). */
//     #[Route('', name: 'index', methods: ['GET'])]
//     public function index(string $slug): Response
//     {
//         try {
//             $compagnie = $this->api->item(self::API . '/compagnie', ['slug' => $slug]);
//         } catch (ApiException) {
//             throw $this->createNotFoundException('Compagnie introuvable');
//         }
//
//         return $this->render('webclient/index.html.twig', [
//             'compagnie' => $compagnie,
//             'slug' => $slug,
//         ]);
//     }
//
//     // -- Proxys JSON du tunnel (consommés par le composant React) -- //
//
//     #[Route('/api/villes', name: 'villes', methods: ['GET'])]
//     public function villes(string $slug): JsonResponse
//     {
//         return $this->proxyList(self::API . '/villes', ['slug' => $slug]);
//     }
//
//     #[Route('/api/gares', name: 'gares', methods: ['GET'])]
//     public function gares(string $slug, Request $request): JsonResponse
//     {
//         return $this->proxyList(self::API . '/gares', ['slug' => $slug, 'ville' => $request->query->get('ville')]);
//     }
//
//     #[Route('/api/destinations', name: 'destinations', methods: ['GET'])]
//     public function destinations(string $slug, Request $request): JsonResponse
//     {
//         return $this->proxyList(self::API . '/destinations', ['slug' => $slug, 'gare' => $request->query->get('gare')]);
//     }
//
//     #[Route('/api/departs', name: 'departs', methods: ['GET'])]
//     public function departs(string $slug, Request $request): JsonResponse
//     {
//         return $this->proxyList(self::API . '/departs', [
//             'slug' => $slug,
//             'provenance' => $request->query->get('provenance'),
//             'destination' => $request->query->get('destination'),
//         ]);
//     }
//
//     /** Crée la réservation invité + initie le paiement (renvoie le bloc paiement). */
//     #[Route('/api/reservations', name: 'reservation_create', methods: ['POST'])]
//     public function createReservation(string $slug, Request $request): JsonResponse
//     {
//         $payload = json_decode($request->getContent(), true);
//         if (!is_array($payload)) {
//             return $this->json(['error' => 'Requête invalide'], 400);
//         }
//         try {
//             $data = $this->api->post(self::API . '/reservations?slug=' . rawurlencode($slug), $payload, ['Content-Type' => 'application/ld+json']);
//         } catch (ApiException $e) {
//             return $this->json(['error' => $e->getMessage()], $this->statut($e));
//         }
//
//         return $this->json($data, 201);
//     }
//
//     /** Webhook de paiement (utilisé par le front en mode SIMULÉ ; le vrai prestataire appelle le BK directement). */
//     #[Route('/api/webhook', name: 'webhook', methods: ['POST'])]
//     public function webhook(string $slug, Request $request): JsonResponse
//     {
//         $payload = json_decode($request->getContent(), true);
//         try {
//             $this->api->post(self::API . '/paiement/webhook', is_array($payload) ? $payload : [], ['Content-Type' => 'application/ld+json']);
//         } catch (ApiException $e) {
//             return $this->json(['error' => $e->getMessage()], $this->statut($e));
//         }
//
//         return $this->json(['ok' => true]);
//     }
//
//     /** Historique des réservations d'un client (par téléphone). */
//     #[Route('/api/historique', name: 'historique', methods: ['GET'])]
//     public function historique(string $slug, Request $request): JsonResponse
//     {
//         return $this->proxyList(self::API . '/historique', ['slug' => $slug, 'contact' => $request->query->get('contact')]);
//     }
//
//     #[Route('/api/suivi', name: 'suivi', methods: ['GET'])]
//     public function suivi(string $slug, Request $request): JsonResponse
//     {
//         try {
//             $data = $this->api->item(self::API . '/suivi', [
//                 'slug' => $slug,
//                 'code' => $request->query->get('code'),
//                 'contact' => $request->query->get('contact'),
//             ]);
//         } catch (ApiException $e) {
//             return $this->json(['error' => $e->getMessage()], $this->statut($e));
//         }
//
//         return $this->json($data);
//     }
//
//     /** Bon de réservation (PDF) — généré CÔTÉ FRONT (PdfService). Nécessite code + téléphone. */
//     #[Route('/bon', name: 'bon', methods: ['GET'])]
//     public function bon(string $slug, Request $request): Response
//     {
//         try {
//             $reservation = $this->api->item(self::API . '/suivi', [
//                 'slug' => $slug,
//                 'code' => $request->query->get('code'),
//                 'contact' => $request->query->get('contact'),
//             ]);
//             $compagnie = $this->api->item(self::API . '/compagnie', ['slug' => $slug]);
//         } catch (ApiException) {
//             throw $this->createNotFoundException('Réservation introuvable');
//         }
//
//         if (($reservation['etatpaiement'] ?? null) !== 'PAYE') {
//             throw $this->createNotFoundException('Le bon n\'est disponible qu\'après le paiement');
//         }
//
//         return $this->pdf->download(
//             'webclient/bon.html.twig',
//             ['reservation' => $reservation, 'compagnie' => $compagnie],
//             'bon-' . ($reservation['code'] ?? 'reservation') . '.pdf'
//         );
//     }
//
//     private function proxyList(string $endpoint, array $query): JsonResponse
//     {
//         try {
//             return $this->json($this->api->collection($endpoint, array_filter($query, fn($v) => $v !== null && $v !== '')));
//         } catch (ApiException $e) {
//             return $this->json(['error' => $e->getMessage()], $this->statut($e));
//         }
//     }
//
//     private function statut(ApiException $e): int
//     {
//         $code = $e->getCode();
//         return ($code >= 400 && $code < 600) ? $code : 502;
//     }
// }

/**
 * Coquille volontairement VIDE. Le chargeur PSR-4 de Symfony (services.yaml importe tout
 * "../src/") exige que ce fichier déclare bien la classe WebClientController : un fichier sans
 * classe casse la construction du conteneur. Sans route ni méthode, elle n'expose rien.
 */
class WebClientController
{
}
