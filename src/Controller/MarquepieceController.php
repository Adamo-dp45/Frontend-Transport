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

#[Route('/marquepiece', name: 'marquepiece.')]
#[IsGranted('ROLE_USER')]
final class MarquepieceController extends AbstractController
{
    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler
    )
    {
    }

    #[Route('', name: 'index', methods: ['GET'])]
    #[IsGranted('MARQUEPIECE_VOIR')]
    public function index(): Response
    {
        try {
            $marquepieces = $this->api->collection('/api/marquepieces');
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        return $this->render('marquepiece/index.html.twig', [
            'marquepieces' => $marquepieces
        ]);
    }

    #[Route('/nouveau', name: 'new', methods: ['GET', 'POST'])]
    #[IsGranted('MARQUEPIECE_CREER')]
    public function new(Request $request): Response
    {
        $form = $this->createForm(LibelleFormType::class);
        $form->handleRequest($request);
        if($form->isSubmitted() && $form->isValid()) {
            try {
                $this->api->post('/api/marquepieces', [
                    'libelle' => $form->get('libelle')->getData()
                ]);
                $this->addFlash('success', 'La marque de pièce a été créée avec succès');
                return $this->redirectToRoute('marquepiece.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'marquepiece.new');
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('marquepiece/new.html.twig', [
            'form' => $form
        ]);
    }

    #[Route('/{id}/modifier', name: 'edit', methods: ['GET', 'POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('MARQUEPIECE_MODIFIER')]
    public function edit(int $id, Request $request): Response
    {
        try {
            $marquepiece = $this->api->item('/api/marquepieces/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'marquepiece.index');
            if($response) {
                return $response;
            }
        }

        $form = $this->createForm(LibelleFormType::class, $marquepiece);
        $form->handleRequest($request);
        if($form->isSubmitted() && $form->isValid()) {
            try {
                $this->api->patch('/api/marquepieces/' . $id, [
                    'libelle' => $form->get('libelle')->getData()
                ]);
                $this->addFlash('success', 'La marque de pièce a été modifiée avec succès');
                return $this->redirectToRoute('marquepiece.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'marquepiece.edit', ['id' => $id]);
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('marquepiece/edit.html.twig', [
            'form' => $form,
            'marquepiece' => $marquepiece
        ]);
    }

    #[Route('/{id}/supprimer', name: 'delete', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('MARQUEPIECE_SUPPRIMER')]
    public function delete(int $id, Request $request): Response
    {
        if($this->isCsrfTokenValid('delete_marquepiece', $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/marquepieces/' . $id . '/remove');
                $this->addFlash('success', 'La marque de pièce a été supprimée avec succès');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'marquepiece.index');
                if($response) {
                    return $response;
                }
            }
        }
        return $this->redirectToRoute('marquepiece.index');
    }
}