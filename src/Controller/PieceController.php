<?php

namespace App\Controller;

use App\Domain\Helper\ApiExceptionHandlerHelper;
use App\Domain\Helper\ApiHelper;
use App\Domain\Helper\TableHelper;
use App\Form\PieceAjustementFormType;
use App\Form\PieceEditFormType;
use App\Form\PieceFormType;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/piece', name: 'piece.')]
#[IsGranted('ROLE_USER')]
final class PieceController extends AbstractController
{
    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler,
        private readonly TableHelper $tableHelper
    )
    {
    }

    #[Route('', name: 'index', methods: ['GET'])]
    #[IsGranted('PIECE_VOIR')]
    public function index(Request $request): Response
    {
        $data = $this->tableHelper->handleIndex('/api/pieces',  $request->query->all(),
            [
                'search' => 'libelle',
                'typepiece' => 'typepiece.id',
                'marque' => 'marquepiece.id',
                'model' => 'model.id'
            ],
            [
                'id',
                'libelle',
                'prixunitaire',
                'createdAt'
            ],
            [
                'typepieces' => $this->api->collection('/api/typepieces'),
                'marquepieces' => $this->api->collection('/api/marquepieces'),
                'models' => $this->api->collection('/api/models')
            ]
        );

        return $this->render('piece/index.html.twig', array_merge($data,
            []
        ));
    }

    private function loadRefs(): array
    {
        try {
            return [
                'types' => $this->api->collection('/api/typepieces'),
                'marques' => $this->api->collection('/api/marquepieces'),
                'modeles' => $this->api->collection('/api/models')
            ];
        } catch(ApiException $e) { /*
            - Si ce n'est pas obligé on peut laisser sinon utiliser l'exception
        */
            return [
                'types' => [],
                'marques' => [],
                'modeles' => []
            ];
        }
    }

    #[Route('/{id}', name: 'show', methods: ['GET'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('PIECE_VOIR')]
    public function show(int $id): Response
    {
        try {
            $piece = $this->api->item('/api/pieces/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'piece.index');
            if($response) {
                return $response;
            }
        }

        return $this->render('piece/show.html.twig', [
            'piece' => $piece
        ]);
    }

    #[Route('/nouveau', name: 'new', methods: ['GET', 'POST'])]
    #[IsGranted('PIECE_CREER')]
    public function new(Request $request): Response
    {
        $refs = $this->loadRefs();
        $form = $this->createForm(PieceFormType::class, null, $refs);
        $form->handleRequest($request);

        if($form->isSubmitted() && $form->isValid()) {
            /**
             * @var UploadedFile|null
             */
            $file = $form->get('imageFile')->getData();
            $mediaObject = null;
            if($file) {
                try {
                    $mediaObject = $this->api->postMediaObject($file);
                } catch(ApiException $e) {
                    $response = $this->apiExceptionHandler->handle($e, null, 'piece.new');
                    if($response) {
                        return $response;
                    }
                }
            }

            $payload = [
                'libelle' => $form->get('libelle')->getData(),
                'stockinitial'=> $form->get('stockinitial')->getData(),
                'prixunitaire'=> $form->get('prixunitaire')->getData(),
                'image' => $mediaObject['@id'] ?? null
            ];

            $marquepiece = $form->get('marquepiece')->getData();
            if($marquepiece) {
                $payload['marquepiece'] = '/api/marquepieces/' . $marquepiece;
            }
            $typepiece = $form->get('typepiece')->getData();
            if($typepiece) {
                $payload['typepiece'] = '/api/typepieces/' . $typepiece;
            }
            $model = $form->get('model')->getData();
            if($model) {
                $payload['model'] = '/api/models/' . $model;
            }

            try {
                $this->api->post('/api/pieces', $payload);
                $this->addFlash('success', 'La pièce a été créée avec succès');
                return $this->redirectToRoute('piece.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'piece.new');
                if($response) {
                    return $response;
                }
            }
        }
        return $this->render('piece/new.html.twig', [
            'form' => $form
        ]);
    }

    #[Route('/{id}/modifier', name: 'edit', methods: ['GET', 'POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('PIECE_MODIFIER')]
    public function edit(int $id, Request $request): Response
    {
        $refs = $this->loadRefs();
        try {
            $piece = $this->api->item('/api/pieces/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'piece.index');
            if($response) {
                return $response;
            }
        }

        $data = array_merge($piece ?? [], [
            'typepiece' => isset($piece['typepiece']) ? $piece['typepiece']['id'] : null,
            'marquepiece' => isset($piece['marquepiece']) ? $piece['marquepiece']['id'] : null,
            'model' => isset($piece['model']) ? $piece['model']['id'] : null
        ]); /*
            - On extrait les 'id' depuis les 'iri'
        */
        $form = $this->createForm(PieceEditFormType::class, $data, $refs);
        $form->handleRequest($request);

        if($form->isSubmitted() && $form->isValid()) {
            $mediaObjectIri = $piece['image']['@id'] ?? null;
            /** @var UploadedFile|null $file */
            $file = $form->get('imageFile')->getData();
            if($file) {
                try {
                    $mediaObject = $this->api->postMediaObject($file);
                    $mediaObjectIri = $mediaObject['@id'] ?? null;
                } catch(ApiException $e) {
                    $response = $this->apiExceptionHandler->handle($e, $form, 'piece.edit', ['id' => $id]);
                    if($response) {
                        return $response;
                    }
                }
            }

            $payload = [
                'libelle' => $form->get('libelle')->getData(),
                'prixunitaire'=> $form->get('prixunitaire')->getData(),
                'image' => $mediaObjectIri
            ];

            $marquepiece = $form->get('marquepiece')->getData();
            if($marquepiece) {
                $payload['marquepiece'] = '/api/marquepieces/' . $marquepiece;
            }
            $typepiece = $form->get('typepiece')->getData();
            if($typepiece) {
                $payload['typepiece'] = '/api/typepieces/' . $typepiece;
            }
            $model = $form->get('model')->getData();
            if($model) {
                $payload['model'] = '/api/models/' . $model;
            }

            try {
                $this->api->patch('/api/pieces/' . $id, $payload);
                $this->addFlash('success', 'La pièce a été modifiée avec succès');
                return $this->redirectToRoute('piece.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'piece.edit', ['id' => $id]);
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('piece/edit.html.twig', [
            'form' => $form,
            'piece' => $piece
        ]);
    }

    #[Route('/{id}/ajustement', name: 'ajustement', methods: ['GET', 'POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('PIECE_MODIFIER')]
    public function ajuster(int $id, Request $request): Response
    {
        try {
            $piece = $this->api->item('/api/pieces/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'piece.index');
            if($response) {
                return $response;
            }
        }

        $form = $this->createForm(PieceAjustementFormType::class);
        $form->handleRequest($request);

        if($form->isSubmitted() && $form->isValid()) {
            $payload = [
                'quantite' => $form->get('quantite')->getData(),
                'motif' => $form->get('motif')->getData()
            ];
            try {
                $this->api->patch('/api/pieces/' . $id . '/ajuster', $payload);
                $this->addFlash('success', 'Le stock a été ajusté avec succès');
                return $this->redirectToRoute('piece.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'piece.index');
                if($response) {
                    return $response;
                }
            }
        }
        return $this->render('piece/ajustement.html.twig', [
            'form' => $form,
            'piece' => $piece
        ]);
    }

    #[Route('/{id}/supprimer', name: 'delete', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('PIECE_SUPPRIMER')]
    public function delete(int $id, Request $request): Response
    {
        if($this->isCsrfTokenValid('delete_piece', $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/pieces/' . $id . '/remove');
                $this->addFlash('success', 'La pièce a été supprimée avec succès');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'piece.index');
                if($response) {
                    return $response;
                }
            }
        }
        return $this->redirectToRoute('piece.index');
    }
}