<?php

namespace App\Controller;

use App\Domain\Helper\ApiExceptionHandlerHelper;
use App\Domain\Helper\ApiHelper;
use App\Domain\Helper\TableHelper;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/ligne', name: 'ligne.')]
#[IsGranted('ROLE_USER')]
final class LigneController extends AbstractController
{
    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler
    )
    {
    }

    #[Route('', name: 'index', methods: ['GET'])]
    #[IsGranted('LIGNE_VOIR')]
    public function index(Request $request, TableHelper $tableHelper): Response
    {
        try {
            $data = $tableHelper->handleIndex('/api/lignes', $request->query->all(),
                [
                    'search' => 'libelle',
                    'code' => 'codeligne',
                ],
                [
                    'id',
                    'codeligne',
                    'libelle',
                    'createdAt',
                ]
            );
        } catch (ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if ($response) {
                return $response;
            }
        }

        return $this->render('ligne/index.html.twig', $data);
    }

    #[Route('/nouveau', name: 'new', methods: ['GET', 'POST'])]
    #[IsGranted('LIGNE_CREER')]
    public function new(Request $request): Response
    {
        if ($request->isMethod('GET')) {
            try {
                $gares = $this->api->collection('/api/gares');
            } catch (ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'ligne.index');
                if ($response) {
                    return $response;
                }
            }

            return $this->render('ligne/new.html.twig', [
                'gares' => $gares
            ]);
        }

        // POST : JSON { libelle, heuredepart, arrets: [{gare, ordre}] } (les prix sont gérés dans la grille tarifaire globale)
        try {
            $payload = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return $this->json(['detail' => 'Corps de requête JSON invalide'], 400);
        }

        try {
            $ligne = $this->api->post('/api/lignes', [
                'libelle' => $payload['libelle'] ?? null,
                'heuredepart' => $payload['heuredepart'] ?? null,
                'arrets' => $payload['arrets'] ?? [],
            ]);
            return $this->json(['created' => $ligne['id'] ?? null]);
        } catch (ApiException $e) {
            return $this->json(['detail' => $e->getMessage()], $e->getCode() ?: 422);
        }
    }

    #[Route('/{id}/modifier', name: 'edit', methods: ['GET', 'POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('LIGNE_MODIFIER')]
    public function edit(int $id, Request $request): Response
    {
        if ($request->isMethod('GET')) {
            try {
                $ligne = $this->api->item('/api/lignes/' . $id);
                $gares = $this->api->collection('/api/gares');
            } catch (ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'ligne.index');
                if ($response) {
                    return $response;
                }
            }

            return $this->render('ligne/edit.html.twig', [
                'ligne' => $ligne,
                'gares' => $gares
            ]);
        }

        // POST : même JSON que la création → PATCH /api/lignes/{id} (le LigneProcessor recrée les arrêts)
        try {
            $payload = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return $this->json(['detail' => 'Corps de requête JSON invalide'], 400);
        }

        try {
            $this->api->patch('/api/lignes/' . $id, [
                'libelle' => $payload['libelle'] ?? null,
                'heuredepart' => $payload['heuredepart'] ?? null,
                'arrets' => $payload['arrets'] ?? [],
            ]);
            return $this->json(['updated' => $id]);
        } catch (ApiException $e) {
            return $this->json(['detail' => $e->getMessage()], $e->getCode() ?: 422);
        }
    }

    #[Route('/{id}', name: 'show', methods: ['GET'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('LIGNE_VOIR')]
    public function show(int $id, Request $request, TableHelper $tableHelper): Response
    {
        try {
            $ligne = $this->api->item('/api/lignes/' . $id);
        } catch (ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'ligne.index');
            if ($response) {
                return $response;
            }
        }

        $voyages = $tableHelper->handleRelated(
            endpoint: '/api/voyages',
            queryParams: $request->query->all(),
            fixedFilters: ['ligne.id' => $id],
            allowedFilters: [],
            allowedSorts: [
                'id',
                'datedepartprevue',
                'placestotal',
                'createdAt'
            ],
            defaultPerPage: 25,
        );

        return $this->render('ligne/show.html.twig', [
            'ligne' => $ligne,
            'voyages' => $voyages['items'],
            'voyagesMeta' => $voyages['meta'],
            'voyagesParams' => $voyages['queryParams']
        ]);
    }

    #[Route('/{id}/supprimer', name: 'delete', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('LIGNE_SUPPRIMER')]
    public function delete(int $id, Request $request): Response
    {
        if ($this->isCsrfTokenValid('delete_ligne', $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/lignes/' . $id . '/remove');
                $this->addFlash('success', 'La ligne a été supprimée avec succès');
            } catch (ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'ligne.index');
                if ($response) {
                    return $response;
                }
            }
        }
        return $this->redirectToRoute('ligne.index');
    }
}
