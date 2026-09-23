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

#[Route('/typedepense', name: 'typedepense.')]
#[IsGranted('ROLE_USER')]
final class TypedepenseController extends AbstractController
{
    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler
    )
    {
    }

    #[Route('', name: 'index', methods: ['GET'])]
    #[IsGranted('TYPEDEPENSE_VOIR')]
    public function index(): Response
    {
        try {
            $typedepenses = $this->api->collection('/api/typedepenses');
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        return $this->render('typedepense/index.html.twig', [
            'typedepenses' => $typedepenses
        ]);
    }

    #[Route('/nouveau', name: 'new', methods: ['GET', 'POST'])]
    #[IsGranted('TYPEDEPENSE_CREER')]
    public function new(Request $request): Response
    {
        $form = $this->createForm(LibelleFormType::class);
        $form->handleRequest($request);

        if($form->isSubmitted() && $form->isValid()) {
            try {
                $this->api->post('/api/typedepenses', [
                    'libelle' => $form->get('libelle')->getData()
                ]);
                $this->addFlash('success', 'Le type de dépense a été créé avec succès');
                return $this->redirectToRoute('typedepense.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'typedepense.new');
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('typedepense/new.html.twig', [
            'form' => $form
        ]);
    }

    #[Route('/{id}/modifier', name: 'edit', methods: ['GET', 'POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('TYPEDEPENSE_MODIFIER')]
    public function edit(int $id, Request $request): Response
    {
        try {
            $type = $this->api->item('/api/typedepenses/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'typedepense.index');
            if($response) {
                return $response;
            }
        }

        $form = $this->createForm(LibelleFormType::class, $type);
        $form->handleRequest($request);

        if($form->isSubmitted() && $form->isValid()) {
            try {
                $this->api->patch('/api/typedepenses/' . $id, [
                    'libelle' => $form->get('libelle')->getData()
                ]);
                $this->addFlash('success', 'Le type de dépense a été modifié avec succès');
                return $this->redirectToRoute('typedepense.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'typedepense.edit', ['id' => $id]);
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('typedepense/edit.html.twig', [
            'form' => $form,
            'typedepense' => $type
        ]);
    }

    #[Route('/{id}/supprimer', name: 'delete', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('TYPEDEPENSE_SUPPRIMER')]
    public function delete(int $id, Request $request): Response
    {
        if($this->isCsrfTokenValid('delete_typedepense', $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/typedepenses/' . $id . '/remove');
                $this->addFlash('success', 'Le type de dépense a été supprimé avec succès');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'typedepense.index');
                if($response) {
                    return $response;
                }
            }
        }

        return $this->redirectToRoute('typedepense.index');
    }
}
