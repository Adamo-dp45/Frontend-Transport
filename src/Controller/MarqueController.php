<?php

namespace App\Controller;

use App\Domain\Helper\ApiExceptionHandlerHelper;
use App\Domain\Helper\ApiHelper;
use App\Form\LibelleFormType;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/marque', name: 'marque.')]
#[IsGranted('ROLE_USER')]
final class MarqueController extends AbstractController
{
    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler
    )
    {
    }

    #[Route('', name: 'index', methods: ['GET'])]
    #[IsGranted('MARQUE_VOIR')]
    public function index(): Response
    {
        try {
            $marques = $this->api->collection('/api/marques');
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        return $this->render('marque/index.html.twig', [
            'marques' => $marques
        ]);
    }

    #[Route('/{id}', name: 'show', methods: ['GET'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('MARQUE_VOIR')]
    public function show(int $id): Response
    {
        try {
            $marque = $this->api->item('/api/marques/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'marque.index');
            if($response) {
                return $response;
            }
        }

        return $this->render('marque/show.html.twig', [
            'marque' => $marque
        ]);
    }

    #[Route('/nouveau', name: 'new', methods: ['GET', 'POST'])]
    #[IsGranted('MARQUE_CREER')]
    public function new(Request $request): Response
    {
        $form = $this->createForm(LibelleFormType::class);
        $form->handleRequest($request);
        if($form->isSubmitted() && $form->isValid()) {
            $payload = [
                'libelle' => $form->get('libelle')->getData()
            ];

            try {
                $this->api->post('/api/marques', $payload);
                $this->addFlash('success', 'La marque a été crée avec succès');
                return $this->redirectToRoute('marque.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'marque.new');
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('marque/new.html.twig', [
            'form' => $form
        ]);
    }

    #[Route('/{id}/modifier', name: 'edit', methods: ['GET', 'POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('MARQUE_MODIFIER')]
    public function edit(int $id, Request $request): Response
    {
        try {
            $marque = $this->api->item('/api/marques/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'marque.index');
            if($response) {
                return $response;
            }
        }

        $form = $this->createForm(LibelleFormType::class, $marque);
        $form->handleRequest($request);
        if($form->isSubmitted() && $form->isValid()) {
            $payload = [
                'libelle' => $form->get('libelle')->getData()
            ];

            try {
                $this->api->patch('/api/marques/' . $id, $payload);
                $this->addFlash('success', 'La marque a été modifié avec succès');
                return $this->redirectToRoute('marque.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'marque.edit', ['id' => $id]);
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('marque/edit.html.twig', [
            'form' => $form,
            'marque' => $marque
        ]);
    }

    #[Route('/{id}/supprimer', name: 'delete', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('MARQUE_SUPPRIMER')]
    public function delete(int $id, Request $request): Response
    {
        if($this->isCsrfTokenValid('delete_marque', $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/marques/' . $id . '/remove');
                $this->addFlash('success', 'La marque a été supprimé avec succès');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'marque.index');
                if($response) {
                    return $response;
                }
            }
        }
        return $this->redirectToRoute('marque.index');
    }
}