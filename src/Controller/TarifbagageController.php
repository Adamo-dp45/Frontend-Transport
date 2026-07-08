<?php

namespace App\Controller;

use App\Domain\Helper\ApiExceptionHandlerHelper;
use App\Domain\Helper\ApiHelper;
use App\Form\TarifbagageFormType;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/tarifbagage', name: 'tarifbagage.')]
#[IsGranted('ROLE_USER')]
final class TarifbagageController extends AbstractController
{
    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler
    )
    {
    }

    #[Route('', name: 'index', methods: ['GET'])]
    #[IsGranted('TARIFBAGAGE_VOIR')]
    public function index(): Response
    {
        try {
            $tarifbagages = $this->api->collection('/api/tarifbagages');
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        return $this->render('tarifbagage/index.html.twig', [
            'tarifbagages' => $tarifbagages
        ]);
    }

    #[Route('/nouveau', name: 'new', methods: ['GET', 'POST'])]
    #[IsGranted('TARIFBAGAGE_CREER')]
    public function new(Request $request): Response
    {
        $form = $this->createForm(TarifbagageFormType::class);
        $form->handleRequest($request);

        if($form->isSubmitted() && $form->isValid()) {
            $payload = [
                'libelle' => $form->get('libelle')->getData(),
                'poidsmin' => $form->get('poidsmin')->getData(),
                'poidsmax' => $form->get('poidsmax')->getData(),
                'montant' => $form->get('montant')->getData()
            ];

            try {
                $this->api->post('/api/tarifbagages', $payload);
                $this->addFlash('success', 'Le tarif a été créé avec succès');
                return $this->redirectToRoute('tarifbagage.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'tarifbagage.new');
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('tarifbagage/new.html.twig', [
            'form' => $form,
        ]);
    }

    #[Route('/{id}/modifier', name: 'edit', methods: ['GET', 'POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('TARIFBAGAGE_MODIFIER')]
    public function edit(int $id, Request $request): Response
    {
        try {
            $tarif = $this->api->item('/api/tarifbagages/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'tarifbagage.index');
            if($response) {
                return $response;
            }
        }

        $form = $this->createForm(TarifbagageFormType::class, [
            'libelle' => $tarif['libelle'],
            'poidsmin' => (int)$tarif['poidsmin'],
            'poidsmax' => isset($tarif['poidsmax']) ? (int)$tarif['poidsmax'] : null,
            'montant' => (int)$tarif['montant']
        ]);
        $form->handleRequest($request);

        if($form->isSubmitted() && $form->isValid()) {
            $payload = [
                'libelle' => $form->get('libelle')->getData(),
                'poidsmin' => $form->get('poidsmin')->getData(),
                'poidsmax' => $form->get('poidsmax')->getData(),
                'montant' => $form->get('montant')->getData()
            ];
            try {
                $this->api->patch('/api/tarifbagages/' . $id, $payload);
                $this->addFlash('success', 'Le tarif a été modifié avec succès');
                return $this->redirectToRoute('tarifbagage.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'tarifbagage.edit', ['id' => $id]);
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('tarifbagage/edit.html.twig', [
            'form' => $form,
            'tarif' => $tarif
        ]);
    }

    #[Route('/{id}/supprimer', name: 'delete', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('TARIFBAGAGE_SUPPRIMER')]
    public function delete(int $id, Request $request): Response
    {
        if($this->isCsrfTokenValid('delete_tarifbagage', $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/tarifbagages/' . $id . '/remove');
                $this->addFlash('success', 'Le tarif a été supprimé avec succès');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'tarifbagage.index');
                if($response) {
                    return $response;
                }
            }
        }
        return $this->redirectToRoute('tarifbagage.index');
    }
}
