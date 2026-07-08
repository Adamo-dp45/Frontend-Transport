<?php

namespace App\Controller;

use App\Domain\Helper\ApiExceptionHandlerHelper;
use App\Domain\Helper\ApiHelper;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/corbeille', name: 'corbeille.')]
#[IsGranted('ROLE_ADMIN')]
final class CorbeilleController extends AbstractController
{
    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler
    )
    {
    }

    #[Route('', name: 'index', methods: ['GET'])]
    public function index(Request $request): Response
    {
        $type = $request->query->get('type', '');
        try {
            $query = $type ? ['type' => $type] : [];
            $elements = $this->api->collection('/api/corbeille', $query);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }
        $types = [
            'approvisionnement' => 'Approvisionnements',
            'bagage' => 'Bagages',
            'car' => 'Véhicules',
            'courrier' => 'Courriers',
            'depannage' => 'Dépannages',
            'fournisseur' => 'Fournisseurs',
            'gare' => 'Gares',
            'ligne' => 'Lignes',
            'marque' => 'Marques véhicule',
            'marquepiece' => 'Marques pièce',
            'model' => 'Modèles pièce',
            'modelvehicule' => 'Modèles véhicule',
            'personnel' => 'Personnels',
            'piece' => 'Pièces',
            'role' => 'Rôles',
            'tarifbagage' => 'Tarifs bagage',
            'tarifcourrier' => 'Tarifs courrier',
            'ticket' => 'Tickets',
            'typepersonnel' => 'Types personnel',
            'typepiece' => 'Types pièce',
            'typevehicule' => 'Types véhicule',
            'voyage' => 'Voyages'
        ];

        return $this->render('corbeille/index.html.twig', [
            'elements' => $elements ?? [],
            'types' => $types,
            'type' => $type
        ]);
    }

    #[Route('/{type}/{id}/restaurer', name: 'restaurer', methods: ['POST'])]
    public function restaurer(string $type, int $id, Request $request): Response
    {
        try {
            $this->api->patch('/api/corbeille/' . $type . '/' . $id . '/restaurer');
            $this->addFlash('success', 'L\'élément a été restauré avec succès');
        } catch (ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'corbeille.index');
            if($response) {
                return $response;
            }
        }

        return $this->redirectToRoute('corbeille.index', [
            'type' => $request->request->get('type', '')
        ]);
    }

    #[Route('/restaurer', name: 'restaurer_tout', methods: ['POST'])]
    public function restaurerTout(Request $request): Response
    {
        $type = $request->request->get('type', '');
        try {
            $query = $type ? '?type=' . $type : '';
            $this->api->post('/api/corbeille/restaurer' . $query);
            $this->addFlash('success', 'Les éléments ont été restaurés avec succès');
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'corbeille.index');
            if($response) {
                return $response;
            }
        }

        return $this->redirectToRoute('corbeille.index', [
            'type' => $type
        ]);
    }

    #[Route('/{type}/{id}/supprimer', name: 'supprimer', methods: ['POST'])]
    public function supprimer(string $type, int $id, Request $request): Response
    {
        try {
            $this->api->delete('/api/corbeille/' . $type . '/' . $id);
            $this->addFlash('success', 'L\'élément a été supprimé définitivement');
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'corbeille.index');
            if($response) {
                return $response;
            }
        }

        return $this->redirectToRoute('corbeille.index', [
            'type' => $request->request->get('type', '')
        ]);
    }

    #[Route('/vider', name: 'vider', methods: ['POST'])]
    public function vider(Request $request): Response
    {
        $type = $request->request->get('type', '');
        try {
            $query = $type ? '?type=' . $type : '';
            $this->api->post('/api/corbeille/vider' . $query);
            $this->addFlash('success', 'La corbeille a été vidée avec succès');
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'corbeille.index');
            if($response) {
                return $response;
            }
        }

        return $this->redirectToRoute('corbeille.index', [
            'type' => $type
        ]);
    }
}
