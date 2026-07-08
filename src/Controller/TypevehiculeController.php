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

#[Route('/typevehicule', name: 'typevehicule.')]
#[IsGranted('ROLE_USER')]
final class TypevehiculeController extends AbstractController
{
    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler
    )
    {
    }

    #[Route('', name: 'index', methods: ['GET'])]
    #[IsGranted('TYPEVEHICULE_VOIR')]
    public function index(): Response
    {
        try {
            $typevehicules = $this->api->collection('/api/typevehicules');
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        return $this->render('typevehicule/index.html.twig', [
            'typevehicules' => $typevehicules
        ]);
    }

    #[Route('/nouveau', name: 'new', methods: ['GET', 'POST'])]
    #[IsGranted('TYPEVEHICULE_CREER')]
    public function new(Request $request): Response
    {
        $form = $this->createForm(LibelleFormType::class);
        $form->handleRequest($request);
        if($form->isSubmitted() && $form->isValid()) {
            $payload = [
                'libelle' => $form->get('libelle')->getData()
            ];
            try {
                $this->api->post('/api/typevehicules', $payload);
                $this->addFlash('success', 'Le type de véhicule a été crée avec succès');
                return $this->redirectToRoute('typevehicule.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'typevehicule.new');
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('typevehicule/new.html.twig', [
            'form' => $form
        ]);
    }

    #[Route('/{id}/modifier', name: 'edit', methods: ['GET', 'POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('TYPEVEHICULE_MODIFIER')]
    public function edit(int $id, Request $request): Response
    {
        try {
            $typevehicule = $this->api->item('/api/typevehicules/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'typevehicule.index');
            if($response) {
                return $response;
            }
        }
        $form = $this->createForm(LibelleFormType::class, $typevehicule);
        $form->handleRequest($request);
        if($form->isSubmitted() && $form->isValid()) {
            $payload = [
                'libelle' => $form->get('libelle')->getData()
            ];
            try {
                $this->api->patch('/api/typevehicules/' . $id, $payload);
                $this->addFlash('success', 'Le type de véhicule a été modifié avec succès');
                return $this->redirectToRoute('typevehicule.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'typevehicule.edit', ['id' => $id]);
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('typevehicule/edit.html.twig', [
            'form' => $form,
            'typevehicule' => $typevehicule
        ]);
    }

    #[Route('/{id}/supprimer', name: 'delete', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('TYPEVEHICULE_SUPPRIMER')]
    public function delete(int $id, Request $request): Response
    {
        if($this->isCsrfTokenValid('delete_typevehicule', $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/typevehicules/' . $id . '/remove');
                $this->addFlash('success', 'Le type de véhicule a été supprimé avec succès');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'typevehicule.index');
                if($response) {
                    return $response;
                }
            }
        }
        return $this->redirectToRoute('typevehicule.index');
    }
}
