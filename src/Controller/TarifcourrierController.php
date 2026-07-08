<?php

namespace App\Controller;

use App\Domain\Helper\ApiExceptionHandlerHelper;
use App\Domain\Helper\ApiHelper;
use App\Form\TarifcourrierFormType;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/tarifcourrier', name: 'tarifcourrier.')]
#[IsGranted('ROLE_USER')]
final class TarifcourrierController extends AbstractController
{
    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler
    )
    {
    }

    #[Route('', name: 'index', methods: ['GET'])]
    #[IsGranted('TARIFCOURRIER_VOIR')]
    public function index(): Response
    {
        try {
            $tarifcourriers = $this->api->collection('/api/tarifcourriers');
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        return $this->render('tarifcourrier/index.html.twig', [
            'tarifcourriers' => $tarifcourriers
        ]);
    }

    #[Route('/nouveau', name: 'new', methods: ['GET', 'POST'])]
    #[IsGranted('TARIFCOURRIER_CREER')]
    public function new(Request $request): Response
    {
        $form = $this->createForm(TarifcourrierFormType::class);
        $form->handleRequest($request);

        if($form->isSubmitted() && $form->isValid()) {
            $payload = [
                'libelle' => $form->get('libelle')->getData(),
                'valeurmin' => $form->get('valeurmin')->getData(),
                'valeurmax' => $form->get('valeurmax')->getData(),
                'montanttaxe' => $form->get('montanttaxe')->getData()
            ];
            try {
                $this->api->post('/api/tarifcourriers', $payload);
                $this->addFlash('success', 'Le tarif a été créé avec succès');
                return $this->redirectToRoute('tarifcourrier.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'tarifcourrier.new');
                if ($response) {
                    return $response;
                }
            }
        }

        return $this->render('tarifcourrier/new.html.twig', [
            'form' => $form,
        ]);
    }

    #[Route('/{id}/modifier', name: 'edit', methods: ['GET', 'POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('TARIFCOURRIER_MODIFIER')]
    public function edit(int $id, Request $request): Response
    {
        try {
            $tarif = $this->api->item('/api/tarifcourriers/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'tarifcourrier.index');
            if($response) {
                return $response;
            }
        }

        $form = $this->createForm(TarifcourrierFormType::class, [
            'libelle' => $tarif['libelle'],
            'valeurmin' => (int)$tarif['valeurmin'],
            'valeurmax' => isset($tarif['valeurmax']) ? (int)$tarif['valeurmax'] : null,
            'montanttaxe' => (int)$tarif['montanttaxe']
        ]);
        $form->handleRequest($request);

        if($form->isSubmitted() && $form->isValid()) {
            $payload = [
                'libelle' => $form->get('libelle')->getData(),
                'valeurmin' => $form->get('valeurmin')->getData(),
                'valeurmax' => $form->get('valeurmax')->getData(),
                'montanttaxe' => $form->get('montanttaxe')->getData()
            ];
            try {
                $this->api->patch('/api/tarifcourriers/' . $id, $payload);
                $this->addFlash('success', 'Le tarif a été modifié avec succès');
                return $this->redirectToRoute('tarifcourrier.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'tarifcourrier.edit', ['id' => $id]);
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('tarifcourrier/edit.html.twig', [
            'form' => $form,
            'tarif' => $tarif
        ]);
    }

    #[Route('/{id}/supprimer', name: 'delete', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('TARIFCOURRIER_SUPPRIMER')]
    public function delete(int $id, Request $request): Response
    {
        if($this->isCsrfTokenValid('delete_tarifcourrier', $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/tarifcourriers/' . $id . '/remove');
                $this->addFlash('success', 'Le tarif a été supprimé avec succès');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'tarifcourrier.index');
                if($response) {
                    return $response;
                }
            }
        }
        return $this->redirectToRoute('tarifcourrier.index');
    }
}
