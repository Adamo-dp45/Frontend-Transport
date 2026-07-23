<?php

namespace App\Controller\Api;

use App\Domain\Helper\ApiHelper;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

final class SearchController extends AbstractController
{
    private const RESOURCES = [
        'fournisseurs' => ['search' => 'libelle', 'label' => 'libelle'],
        'pieces' => ['search' => 'libelle', 'label' => 'libelle'],
        'cars' => ['search' => 'matricule', 'label' => 'matricule'],
        'voyages' => ['search' => 'provenance', 'label' => 'codevoyage'],
        'gares' => ['search' => 'libelle', 'label' => 'libelle'],
        'personnels' => ['search' => 'nom', 'label' => 'nom'],
        'lignes' => ['search' => 'libelle', 'label' => 'libelle'],
        'users' => ['search' => 'nom', 'label' => 'nom']
    ];

    public function __construct(
        private readonly ApiHelper $api
    )
    {
    }

    #[Route('/search', name: 'app_search')]
    #[IsGranted('ROLE_USER')]
    public function index(Request $request): JsonResponse
    {
        $resource = $request->query->getString('resource');
        $q = $request->query->getString('q', '');
        $limit = min((int)$request->query->get('limit', 20), 50);

        // Cas spécial : recherche d'un billet VALIDE (rattachement d'un bagage) — par nom OU code.
        if ($resource === 'tickets') {
            return $this->searchTickets($q, $limit);
        }

        // Cas spécial : lignes dont MA gare est l'ORIGINE (création de voyage = planification, réservée
        // à l'origine). Admin/central → toutes les lignes.
        if ($resource === 'lignes_origine') {
            return $this->searchLignesOrigine($q, $limit);
        }

        // Cas spécial : seulement les cars DISPONIBLES (affectation à un voyage/dépannage).
        if ($resource === 'cars_disponibles') {
            return $this->searchCarsDisponibles($q, $limit);
        }

        if(!isset(self::RESOURCES[$resource])) {
            return $this->json(['error' => 'Ressource non autorisée'], 403);
        }
        $config = self::RESOURCES[$resource];

        /*
            if(!$this->isGranted($config['permission'])) {
                return $this->json(['error' => 'Accès refusé'], 403);
            }
        */

        if($q !== '' && mb_strlen($q) < 2) {
            return $this->json([]);
        }

        try {
            $params = http_build_query([
                $config['search'] => $q ?: null, /*
                    - 'null' pour n'envoyer le filtre que si 'q' est vide
                */
                'itemsPerPage' => $limit,
                'page' => 1
            ]);
            $items = $this->api->collection("/api/{$resource}?{$params}");
            $results = array_map(function ($item) use ($config, $resource) { /*
                - On normalise en '{ value, label, raw }'
            */
                $label = $item[$config['label']] ?? "#{$item['id']}";

                // Enrichissement du label des PIÈCES : on affiche le stock courant (comme l'ancien
                // select), utile en appro/dépannage pour repérer une pièce en rupture.
                if ($resource === 'pieces') {
                    $stock = $item['stockactuel'] ?? $item['stockinitial'] ?? null;
                    if ($stock !== null) {
                        $label .= ' (stock : ' . $stock . ')';
                    }
                }

                return [
                    'value' => (string)$item['id'],
                    'label' => $label,
                    'raw' => $item // Les données complètes si besoin côté client
                ];
            }, $items);
            return $this->json($results);
        } catch(ApiException $e) {
            return $this->json(['error' => $e->getMessage()], $e->getCode() ?: 500);
        }
    }

    /**
     * Recherche des billets VALIDE par nom du client OU code du billet (les billets pouvant être
     * anonymes, on supporte les deux). Renvoie un label riche + le billet complet en 'raw' pour que
     * le formulaire bagage en dérive provenance/destination/identité.
     */
    private function searchTickets(string $q, int $limit): JsonResponse
    {
        if ($q !== '' && mb_strlen($q) < 2) {
            return $this->json([]);
        }

        // Un agent de gare rattache un bagage à SES billets = ceux émis à sa gare (gare de montée) MAIS
        // AUSSI ceux qu'il a vendus À BORD comme commercial (gare de montée = position du car, ≠ sa gare
        // d'attache). Sans ce second périmètre, le vendeur à bord ne pouvait pas rattacher un bagage à un
        // billet vendu en route. Admin / central → tous les billets (aucun filtre).
        $user = $this->getUser();
        $gare = $user?->getGare();
        $estLarge = $this->isGranted('ROLE_ADMIN') || $this->isGranted('ROLE_SUPER_ADMIN') || $gare === null;
        $portees = $estLarge
            ? [[]]
            : [['gare.id' => $gare['id']], ['commercial.id' => $user->getId()]];

        try {
            // Fusion par id sur les deux périmètres × (nom, code) — un billet peut matcher plusieurs fois.
            $parId = [];
            foreach ($portees as $filtre) {
                foreach ($this->api->collection('/api/tickets?' . http_build_query(array_merge([
                    'statut' => 'VALIDE',
                    'nomclient' => $q ?: null,
                    'itemsPerPage' => $limit,
                    'page' => 1,
                ], $filtre))) as $t) {
                    $parId[$t['id']] = $t;
                }
                if (mb_strlen($q) >= 2) {
                    foreach ($this->api->collection('/api/tickets?' . http_build_query(array_merge([
                        'statut' => 'VALIDE',
                        'codeticket' => $q,
                        'itemsPerPage' => $limit,
                        'page' => 1,
                    ], $filtre))) as $t) {
                        $parId[$t['id']] = $t;
                    }
                }
            }

            $results = array_map(function ($t) {
                $depart = $t['gare']['libelle'] ?? '?';
                $descente = $t['garedescente']['libelle'] ?? 'terminus';
                $nom = $t['nomclient'] ?? 'Client anonyme';
                return [
                    'value' => (string)$t['id'],
                    'label' => sprintf('%s · %s (%s → %s)', $t['codeticket'] ?? "#{$t['id']}", $nom, $depart, $descente),
                    'raw' => $t,
                ];
            }, array_values($parId));

            return $this->json(array_slice($results, 0, $limit));
        } catch (ApiException $e) {
            return $this->json(['error' => $e->getMessage()], $e->getCode() ?: 500);
        }
    }

    /**
     * Lignes dont MA gare est l'ORIGINE — pour le select ligne de la CRÉATION de voyage (doctrine :
     * seule la gare d'origine planifie un voyage). Un agent de gare (non-admin) ne voit que ses lignes
     * d'origine ; un admin ou un utilisateur central voit toutes les lignes.
     */
    private function searchLignesOrigine(string $q, int $limit): JsonResponse
    {
        if ($q !== '' && mb_strlen($q) < 2) {
            return $this->json([]);
        }

        $params = [
            'libelle' => $q ?: null,
            'itemsPerPage' => $limit,
            'page' => 1,
        ];

        // La BK scope déjà /api/lignes aux lignes qui desservent ma gare (arrêt = ma gare). On garde
        // toutes ces lignes (une gare peut lancer un DÉPART PARTIEL depuis sa position, pas seulement
        // si elle est l'origine), MAIS on retire les lignes où ma gare est le TERMINUS (elle ne lance
        // pas de départ, elle clôture). Admin/central → toutes les lignes.
        $gare = $this->getUser()?->getGare();
        $estAdmin = $this->isGranted('ROLE_ADMIN') || $this->isGranted('ROLE_SUPER_ADMIN');

        try {
            $lignes = $this->api->collection('/api/lignes?' . http_build_query($params));
            $results = [];
            foreach ($lignes as $l) {
                if ($gare && !$estAdmin && (($l['gareterminus']['id'] ?? null) === $gare['id'])) {
                    continue; // ma gare est le terminus de cette ligne → pas de départ possible
                }
                $code = $l['codeligne'] ?? "#{$l['id']}";
                $results[] = [
                    'value' => (string)$l['id'],
                    'label' => ($l['libelle'] ?? $code) . ' (' . $code . ')',
                    'raw' => $l,
                ];
            }
            return $this->json($results);
        } catch (ApiException $e) {
            return $this->json(['error' => $e->getMessage()], $e->getCode() ?: 500);
        }
    }

    /**
     * Cars DISPONIBLES uniquement — pour l'affectation d'un car à un voyage/dépannage (on ne propose
     * pas un car en voyage ou en panne). Le car COURANT d'un voyage (souvent EN_VOYAGE) reste affiché
     * via la préselection data-value/data-label du select, pas via cette recherche.
     */
    private function searchCarsDisponibles(string $q, int $limit): JsonResponse
    {
        if ($q !== '' && mb_strlen($q) < 2) {
            return $this->json([]);
        }
        try {
            $cars = $this->api->collection('/api/cars?' . http_build_query([
                'etat' => 'DISPONIBLE',
                'matricule' => $q ?: null,
                'itemsPerPage' => $limit,
                'page' => 1,
            ]));
            $results = array_map(function ($c) {
                $mat = $c['matricule'] ?? "#{$c['id']}";
                $marque = $c['marque']['libelle'] ?? null;
                return [
                    'value' => (string)$c['id'],
                    'label' => $marque ? "$mat ($marque)" : $mat,
                    'raw' => $c,
                ];
            }, $cars);
            return $this->json($results);
        } catch (ApiException $e) {
            return $this->json(['error' => $e->getMessage()], $e->getCode() ?: 500);
        }
    }
}
