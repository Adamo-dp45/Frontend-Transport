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

#[Route('/approvisionnement', name: 'approvisionnement.')]
#[IsGranted('ROLE_USER')]
final class ApprovisionnementController extends AbstractController
{
    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler,
        private readonly TableHelper $tableHelper
    )
    {
    }

    #[Route('', name: 'index', methods: ['GET'])]
    #[IsGranted('APPROVISIONNEMENT_VOIR')]
    public function index(Request $request): Response
    {
        $data = $this->tableHelper->handleIndex('/api/approvisionnements',  $request->query->all(),
            [
                'fournisseur' => 'fournisseur.id',
                'date_from' => 'dateappro[after]',
                'date_to' => 'dateappro[before]'
            ],
            [
                'id',
                'dateappro',
                'createdAt'
            ]
            // Plus de chargement de TOUS les fournisseurs : le filtre est un autocomplete distant (RemoteCombobox → /search)
        );

        return $this->render('approvisionnement/index.html.twig', $data);
    }

    #[Route('/{id}', name: 'show', methods: ['GET'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('APPROVISIONNEMENT_VOIR')]
    public function show(int $id): Response
    {
        try {
            $approvisionnement = $this->api->item('/api/approvisionnements/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'approvisionnement.index');
            if($response) {
                return $response;
            }
        }

        return $this->render('approvisionnement/show.html.twig', [
            'approvisionnement' => $approvisionnement
        ]);
    }

    #[Route('/nouveau', name: 'new', methods: ['GET', 'POST'])]
    #[IsGranted('APPROVISIONNEMENT_CREER')]
    public function new(Request $request): Response
    {
        // ── ÉTAT PRÉCÉDENT (désactivé) — on chargeait toutes les pièces (et fournisseurs) pour les selects.
        //    Désormais : autocomplete distant (data-remote-select → /search), aucune liste chargée. ──
        // try {
        //     $pieces = $this->api->collection('/api/pieces');
        // } catch(ApiException $e) {
        //     $response = $this->apiExceptionHandler->handle($e, null, 'approvisionnement.index');
        //     if($response) { return $response; }
        // }

        if($request->isMethod('POST')) {
            $data = $request->request->all();
            // Construire les lignes de détail
            $details = [];
            $pieceIds = $data['detail_piece'] ?? [];
            $quantites = $data['detail_quantite'] ?? [];
            $prixUnitaires = $data['detail_prixunitaire'] ?? [];

            foreach($pieceIds as $i => $pieceId) {
                if(!empty($pieceId)) {
                    $details[] = [
                        'piece' => (int)$pieceId,
                        'quantite' => (int)$quantites[$i] ?? 0,
                        'prixunitaire'=> (int)$prixUnitaires[$i] ?? 0,
                    ];
                }
            }

            if(empty($details)) {
                $this->addFlash('error', 'Veuillez ajouter au moins une pièce');
            } else {
                $payload = [
                    'fournisseur' => (int)$data['fournisseur'] ?? '',
                    'details' => $details,
                ];

                try {
                    $this->api->post('/api/approvisionnements', $payload);
                    $this->addFlash('success', 'L\'approvisionnement a été enregistré avec succès');
                    return $this->redirectToRoute('approvisionnement.index');
                } catch(ApiException $e) {
                    $response = $this->apiExceptionHandler->handle($e, null, 'approvisionnement.new');
                    if($response) {
                        return $response;
                    }
                }
            }
        }

        return $this->render('approvisionnement/new.html.twig');
    }

    #[Route('/{id}/modifier', name: 'edit', methods: ['GET', 'POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('APPROVISIONNEMENT_MODIFIER')]
    public function edit(int $id, Request $request): Response
    {
        try {
            $approvisionnement = $this->api->item('/api/approvisionnements/' . $id);
            // ── ÉTAT PRÉCÉDENT (désactivé) — $pieces = collection('/api/pieces') : autocomplete distant, préselection via detail.piece ──
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'approvisionnement.index');
            if($response) {
                return $response;
            }
        }

        if($request->isMethod('POST')) {
            $data = $request->request->all();
            $details = [];
            $pieceIds = $data['detail_piece'] ?? [];
            $quantites = $data['detail_quantite'] ?? [];
            $prixUnitaires = $data['detail_prixunitaire'] ?? [];

            foreach($pieceIds as $i => $pieceId) {
                if(!empty($pieceId)) {
                    $details[] = [
                        'piece' => (int)$pieceId,
                        'quantite' => (int)$quantites[$i] ?? 0,
                        'prixunitaire'=> (int)$prixUnitaires[$i] ?? 0
                    ];
                }
            }

            if(empty($details)) {
                $this->addFlash('error', 'Veuillez ajouter au moins une pièce');
            } else {
                $payload = [
                    'fournisseur' => (int)$data['fournisseur'],
                    'details' => $details
                ];

                try {
                    $this->api->patch('/api/approvisionnements/' . $id, $payload);
                    $this->addFlash('success', 'L\'approvisionnement a été modifié avec succès');
                    return $this->redirectToRoute('approvisionnement.index');
                } catch(ApiException $e) {
                    $response = $this->apiExceptionHandler->handle($e, null, 'approvisionnement.edit', ['id' => $id]);
                    if($response) {
                        return $response;
                    }
                }
            }
        }

        return $this->render('approvisionnement/edit.html.twig', [
            'approvisionnement' => $approvisionnement,
        ]);
    }

    #[Route('/{id}/annuler', name: 'annuler', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('APPROVISIONNEMENT_MODIFIER')]
    public function annuler(int $id, Request $request): Response
    {
        if($this->isCsrfTokenValid('annuler_approvisionnement', $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/approvisionnements/' . $id . '/annuler');
                $this->addFlash('success', 'L\'approvisionnement a été annulé : le stock a été retiré');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'approvisionnement.index');
                if($response) {
                    return $response;
                }
            }
        }
        return $this->redirectToRoute('approvisionnement.index');
    }

    #[Route('/{id}/supprimer', name: 'delete', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('APPROVISIONNEMENT_SUPPRIMER')]
    public function delete(int $id, Request $request): Response
    {
        if($this->isCsrfTokenValid('delete_approvisionnement', $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/approvisionnements/' . $id . '/remove');
                $this->addFlash('success', 'L\'approvisionnement a été supprimé avec succès');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'approvisionnement.index');
                if($response) {
                    return $response;
                }
            }
        }
        return $this->redirectToRoute('approvisionnement.index');
    }
}