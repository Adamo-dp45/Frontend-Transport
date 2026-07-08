<?php

namespace App\Controller;

use App\Domain\Helper\ApiHelper;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Création rapide « inline » des ressources simples (libellé seul) depuis une modale,
 * sans quitter le formulaire courant. Renvoie du JSON ({id, libelle}) pour que le
 * front injecte et présélectionne l'option dans le select.
 */
#[Route('/quick-create', name: 'quick_create.')]
#[IsGranted('ROLE_USER')]
final class QuickCreateController extends AbstractController
{
    /**
     * Liste blanche : clé de ressource => [endpoint API, permission, champ (défaut "libelle")].
     * La modale envoie toujours "libelle" ; on le mappe sur le vrai champ de la ressource.
     */
    private const MAP = [
        // Stock / pièces
        'typepiece'     => ['path' => '/api/typepieces',     'permission' => 'TYPEPIECE_CREER'],
        'marquepiece'   => ['path' => '/api/marquepieces',   'permission' => 'MARQUEPIECE_CREER'],
        'model'         => ['path' => '/api/models',         'permission' => 'MODEL_CREER'],
        // Flotte / véhicules
        'marque'        => ['path' => '/api/marques',        'permission' => 'MARQUE_CREER'],
        'typevehicule'  => ['path' => '/api/typevehicules',  'permission' => 'TYPEVEHICULE_CREER'],
        'modelvehicule' => ['path' => '/api/modelvehicules', 'permission' => 'MODELVEHICULE_CREER'],
        // Personnel / RH
        'typepersonnel' => ['path' => '/api/typepersonnels', 'permission' => 'TYPEPERSONNEL_CREER'],
        // Exploitation — la ville se crée avec "nom"
        'ville'         => ['path' => '/api/villes',         'permission' => 'VILLE_CREER', 'field' => 'nom'],
    ];

    public function __construct(
        private readonly ApiHelper $api
    )
    {
    }

    #[Route('/{resource}', name: 'create', methods: ['POST'], requirements: ['resource' => '[a-z]+'])]
    public function create(string $resource, Request $request): JsonResponse
    {
        if (!isset(self::MAP[$resource])) {
            return $this->json(['error' => 'Ressource inconnue'], 404);
        }
        $cfg = self::MAP[$resource];

        if (!$this->isGranted($cfg['permission'])) {
            return $this->json(['error' => 'Vous n\'avez pas la permission de créer cette ressource'], 403);
        }
        if (!$this->isCsrfTokenValid('quick_create', (string) $request->request->get('_token'))) {
            return $this->json(['error' => 'Jeton de sécurité invalide, rechargez la page'], 400);
        }

        $libelle = trim((string) $request->request->get('libelle', ''));
        if ($libelle === '') {
            return $this->json(['error' => 'Le libellé est obligatoire'], 422);
        }

        $field = $cfg['field'] ?? 'libelle';
        try {
            $created = $this->api->post($cfg['path'], [$field => $libelle]);
            return $this->json([
                'id' => $created['id'],
                'libelle' => $created[$field] ?? $libelle,
            ], 201);
        } catch (ApiException $e) {
            return $this->json(['error' => $e->getMessage()], $e->getCode() ?: 422);
        }
    }
}
