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

#[Route('/modelvehicule', name: 'modelvehicule.')]
#[IsGranted('ROLE_USER')]
final class ModelvehiculeController extends AbstractController
{
    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler
    )
    {
    }

    #[Route('', name: 'index', methods: ['GET'])]
    #[IsGranted('MODELVEHICULE_VOIR')]
    public function index(): Response
    {
        try {
            $modelvehicules = $this->api->collection('/api/modelvehicules');
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        return $this->render('modelvehicule/index.html.twig', [
            'modelvehicules' => $modelvehicules
        ]);
    }

    #[Route('/nouveau', name: 'new', methods: ['GET', 'POST'])]
    #[IsGranted('MODELVEHICULE_CREER')]
    public function new(Request $request): Response
    {
        $form = $this->createForm(LibelleFormType::class);
        $form->handleRequest($request);
        if($form->isSubmitted() && $form->isValid()) {
            $payload = [
                'libelle' => $form->get('libelle')->getData()
            ];
            try {
                $this->api->post('/api/modelvehicules', $payload);
                $this->addFlash('success', 'Le modèle de véhicule a été crée avec succès');
                return $this->redirectToRoute('modelvehicule.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'modelvehicule.new');
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('modelvehicule/new.html.twig', [
            'form' => $form
        ]);
    }

    #[Route('/{id}/modifier', name: 'edit', methods: ['GET', 'POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('MODELVEHICULE_MODIFIER')]
    public function edit(int $id, Request $request): Response
    {
        try {
            $modelvehicule = $this->api->item('/api/modelvehicules/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'modelvehicule.index');
            if($response) {
                return $response;
            }
        }

        $form = $this->createForm(LibelleFormType::class, $modelvehicule);
        $form->handleRequest($request);
        if($form->isSubmitted() && $form->isValid()) {
            $payload = [
                'libelle' => $form->get('libelle')->getData()
            ];
            try {
                $this->api->patch('/api/modelvehicules/' . $id, $payload);
                $this->addFlash('success', 'Le modèle de véhicule a été modifié avec succès');
                return $this->redirectToRoute('modelvehicule.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'modelvehicule.edit', ['id' => $id]);
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('modelvehicule/edit.html.twig', [
            'form' => $form,
            'modelvehicule' => $modelvehicule
        ]);
    }

    #[Route('/{id}/supprimer', name: 'delete', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('MODELVEHICULE_SUPPRIMER')]
    public function delete(int $id, Request $request): Response
    {
        if($this->isCsrfTokenValid('delete_modelvehicule', $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/modelvehicules/' . $id . '/remove');
                $this->addFlash('success', 'Le modèle de véhicule a été supprimé avec succès');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'modelvehicule.index');
                if($response) {
                    return $response;
                }
            }
        }
        return $this->redirectToRoute('modelvehicule.index');
    }
}
