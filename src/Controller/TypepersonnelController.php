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

#[Route('/typepersonnel', name: 'typepersonnel.')]
#[IsGranted('ROLE_USER')]
final class TypepersonnelController extends AbstractController
{
    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler
    )
    {
    }

    #[Route('', name: 'index', methods: ['GET'])]
    #[IsGranted('TYPEPERSONNEL_VOIR')]
    public function index(): Response
    {
        try {
            $typepersonnels = $this->api->collection('/api/typepersonnels');
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        return $this->render('typepersonnel/index.html.twig', [
            'typepersonnels' => $typepersonnels
        ]);
    }

    #[Route('/{id}', name: 'show', methods: ['GET'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('TYPEPERSONNEL_VOIR')]
    public function show(int $id): Response
    {
        try {
            $typepersonnel = $this->api->item('/api/typepersonnels/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'typepersonnel.index');
            if($response) {
                return $response;
            }
        }

        return $this->render('typepersonnel/show.html.twig', [
            'typepersonnel' => $typepersonnel
        ]);
    }

    #[Route('/nouveau', name: 'new', methods: ['GET', 'POST'])]
    #[IsGranted('TYPEPERSONNEL_CREER')]
    public function new(Request $request): Response
    {
        $form = $this->createForm(LibelleFormType::class, null, [
            'attr' => [
                'placeholder' => 'ex: Chauffeur, Mécanicien, Agent de bord..'
            ]
        ]);
        $form->handleRequest($request);

        if($form->isSubmitted() && $form->isValid()) {
            $payload = [
                'libelle' => $form->get('libelle')->getData(),
            ];

            try {
                $this->api->post('/api/typepersonnels', $payload);
                $this->addFlash('success', 'Le type de personnel a été créé avec succès');
                return $this->redirectToRoute('typepersonnel.index');
            } catch (ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'typepersonnel.new');
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('typepersonnel/new.html.twig', [
            'form' => $form
        ]);
    }

    #[Route('/{id}/modifier', name: 'edit', methods: ['GET', 'POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('TYPEPERSONNEL_MODIFIER')]
    public function edit(int $id, Request $request): Response
    {
        try {
            $typepersonnel = $this->api->item('/api/typepersonnels/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'typepersonnel.index');
            if($response) {
                return $response;
            }
        }

        $form = $this->createForm(LibelleFormType::class, $typepersonnel);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $payload = [
                'libelle' => $form->get('libelle')->getData(),
            ];

            try {
                $this->api->patch('/api/typepersonnels/' . $id, $payload);
                $this->addFlash('success', 'Le type de personnel a été modifié avec succès');
                return $this->redirectToRoute('typepersonnel.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'typepersonnel.edit', ['id' => $id]);
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('typepersonnel/edit.html.twig', [
            'form' => $form,
            'typepersonnel' => $typepersonnel
        ]);
    }

    #[Route('/{id}/supprimer', name: 'delete', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('TYPEPERSONNEL_SUPPRIMER')]
    public function delete(int $id, Request $request): Response
    {
        if($this->isCsrfTokenValid('delete_typepersonnel', $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/typepersonnels/' . $id . '/remove');
                $this->addFlash('success', 'Le type de personnel a été supprimé avec succès');
            } catch (ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'typepersonnel.index');
                if($response) {
                    return $response;
                }
            }
        }
        return $this->redirectToRoute('typepersonnel.index');
    }
}
