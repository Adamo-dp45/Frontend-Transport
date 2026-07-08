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

#[Route('/typepanne', name: 'typepanne.')]
#[IsGranted('ROLE_USER')]
final class TypepanneController extends AbstractController
{
    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler
    )
    {
    }

    #[Route('', name: 'index', methods: ['GET'])]
    #[IsGranted('TYPEPANNE_VOIR')]
    public function index(): Response
    {
        try {
            $typepannes = $this->api->collection('/api/typepannes');
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        return $this->render('typepanne/index.html.twig', [
            'typepannes' => $typepannes
        ]);
    }

    #[Route('/nouveau', name: 'new', methods: ['GET', 'POST'])]
    #[IsGranted('TYPEPANNE_CREER')]
    public function new(Request $request): Response
    {
        $form = $this->createForm(LibelleFormType::class);
        $form->handleRequest($request);
        if($form->isSubmitted() && $form->isValid()) {
            $payload = [
                'libelle' => $form->get('libelle')->getData()
            ];
            try {
                $this->api->post('/api/typepannes', $payload);
                $this->addFlash('success', 'Le type de panne a été crée avec succès');
                return $this->redirectToRoute('typepanne.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'typepanne.new');
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('typepanne/new.html.twig', [
            'form' => $form
        ]);
    }

    #[Route('/{id}/modifier', name: 'edit', methods: ['GET', 'POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('TYPEPANNE_MODIFIER')]
    public function edit(int $id, Request $request): Response
    {
        try {
            $typepanne = $this->api->item('/api/typepannes/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'typepanne.index');
            if($response) {
                return $response;
            }
        }
        $form = $this->createForm(LibelleFormType::class, $typepanne);
        $form->handleRequest($request);
        if($form->isSubmitted() && $form->isValid()) {
            $payload = [
                'libelle' => $form->get('libelle')->getData()
            ];
            try {
                $this->api->patch('/api/typepannes/' . $id, $payload);
                $this->addFlash('success', 'Le type de panne a été modifié avec succès');
                return $this->redirectToRoute('typepanne.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'typepanne.edit', ['id' => $id]);
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('typepanne/edit.html.twig', [
            'form' => $form,
            'typepanne' => $typepanne
        ]);
    }

    #[Route('/{id}/supprimer', name: 'delete', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('TYPEPANNE_SUPPRIMER')]
    public function delete(int $id, Request $request): Response
    {
        if($this->isCsrfTokenValid('delete_typepanne', $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/typepannes/' . $id . '/remove');
                $this->addFlash('success', 'Le type de panne a été supprimé avec succès');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'typepanne.index');
                if($response) {
                    return $response;
                }
            }
        }
        return $this->redirectToRoute('typepanne.index');
    }
}
