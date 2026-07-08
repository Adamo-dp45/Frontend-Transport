<?php

namespace App\Controller;

use App\Domain\Helper\ApiExceptionHandlerHelper;
use App\Domain\Helper\ApiHelper;
use App\Domain\Helper\TableHelper;
use App\Form\VilleFormType;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/ville', name: 'ville.')]
#[IsGranted('ROLE_USER')]
final class VilleController extends AbstractController
{
    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler
    )
    {
    }

    #[Route('', name: 'index', methods: ['GET'])]
    #[IsGranted('VILLE_VOIR')]
    public function index(Request $request, TableHelper $tableHelper): Response
    {
        try {
            $data = $tableHelper->handleIndex('/api/villes', $request->query->all(),
                [
                    'search' => 'nom'
                ],
                [
                    'id',
                    'nom',
                    'createdAt'
                ]
            );
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        return $this->render('ville/index.html.twig', $data);
    }

    #[Route('/nouveau', name: 'new', methods: ['GET', 'POST'])]
    #[IsGranted('VILLE_CREER')]
    public function new(Request $request): Response
    {
        $form = $this->createForm(VilleFormType::class);
        $form->handleRequest($request);

        if($form->isSubmitted() && $form->isValid()) {
            try {
                $this->api->post('/api/villes', ['nom' => $form->get('nom')->getData()]);
                $this->addFlash('success', 'La ville a été créée avec succès');
                return $this->redirectToRoute('ville.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'ville.new');
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('ville/new.html.twig', [
            'form' => $form
        ]);
    }

    #[Route('/{id}/modifier', name: 'edit', methods: ['GET', 'POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('VILLE_MODIFIER')]
    public function edit(int $id, Request $request): Response
    {
        try {
            $ville = $this->api->item('/api/villes/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'ville.index');
            if($response) {
                return $response;
            }
        }

        $form = $this->createForm(VilleFormType::class, $ville);
        $form->handleRequest($request);

        if($form->isSubmitted() && $form->isValid()) {
            try {
                $this->api->patch('/api/villes/' . $id, ['nom' => $form->get('nom')->getData()]);
                $this->addFlash('success', 'La ville a été modifiée avec succès');
                return $this->redirectToRoute('ville.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'ville.edit', ['id' => $id]);
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('ville/edit.html.twig', [
            'form' => $form,
            'ville' => $ville
        ]);
    }

    #[Route('/{id}/supprimer', name: 'delete', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('VILLE_SUPPRIMER')]
    public function delete(int $id, Request $request): Response
    {
        if($this->isCsrfTokenValid('delete_ville', $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/villes/' . $id . '/remove');
                $this->addFlash('success', 'La ville a été supprimée avec succès');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'ville.index');
                if($response) {
                    return $response;
                }
            }
        }
        return $this->redirectToRoute('ville.index');
    }
}
