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

#[Route('/model', name: 'model.')]
#[IsGranted('ROLE_USER')]
final class ModelController extends AbstractController
{
    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler
    )
    {
    }

    #[Route('', name: 'index', methods: ['GET'])]
    #[IsGranted('MODEL_VOIR')]
    public function index(): Response
    {
        try {
            $models = $this->api->collection('/api/models');
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        return $this->render('model/index.html.twig', [
            'models' => $models
        ]);
    }

    #[Route('/nouveau', name: 'new', methods: ['GET', 'POST'])]
    #[IsGranted('MODEL_CREER')]
    public function new(Request $request): Response
    {
        $form = $this->createForm(LibelleFormType::class);
        $form->handleRequest($request);
        if($form->isSubmitted() && $form->isValid()) {
            try {
                $this->api->post('/api/models', [
                    'libelle' => $form->get('libelle')->getData()
                ]);
                $this->addFlash('success', 'Le modèle a été créé avec succès');
                return $this->redirectToRoute('model.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'model.new');
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('model/new.html.twig', [
            'form' => $form
        ]);
    }

    #[Route('/{id}/modifier', name: 'edit', methods: ['GET', 'POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('MODEL_MODIFIER')]
    public function edit(int $id, Request $request): Response
    {
        try {
            $model = $this->api->item('/api/models/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'model.index');
            if($response) {
                return $response;
            }
        }

        $form = $this->createForm(LibelleFormType::class, $model);
        $form->handleRequest($request);
        if($form->isSubmitted() && $form->isValid()) {
            try {
                $this->api->patch('/api/models/' . $id, [
                    'libelle' => $form->get('libelle')->getData()
                ]);
                $this->addFlash('success', 'Le modèle a été modifié avec succès');
                return $this->redirectToRoute('model.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'model.edit', ['id' => $id]);
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('model/edit.html.twig', [
            'form' => $form,
            'model' => $model
        ]);
    }

    #[Route('/{id}/supprimer', name: 'delete', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('MODEL_SUPPRIMER')]
    public function delete(int $id, Request $request): Response
    {
        if($this->isCsrfTokenValid('delete_model', $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/models/' . $id . '/remove');
                $this->addFlash('success', 'Le modèle a été supprimé avec succès');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'model.index');
                if($response) {
                    return $response;
                }
            }
        }
        return $this->redirectToRoute('model.index');
    }
}