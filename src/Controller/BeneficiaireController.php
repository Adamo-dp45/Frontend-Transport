<?php

namespace App\Controller;

use App\Domain\Helper\ApiExceptionHandlerHelper;
use App\Domain\Helper\ApiHelper;
use App\Domain\Helper\TableHelper;
use App\Form\BeneficiaireFormType;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/beneficiaire', name: 'beneficiaire.')]
#[IsGranted('ROLE_USER')]
final class BeneficiaireController extends AbstractController
{
    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler,
        private readonly TableHelper $tableHelper
    )
    {
    }

    #[Route('', name: 'index', methods: ['GET'])]
    #[IsGranted('BENEFICIAIRE_VOIR')]
    public function index(Request $request): Response
    {
        $data = $this->tableHelper->handleIndex('/api/beneficiaires', $request->query->all(),
            [
                'search' => 'nom',
                'categorie' => 'categorie',
            ],
            [
                'id',
                'nom',
                'createdAt'
            ]
        );

        return $this->render('beneficiaire/index.html.twig', $data);
    }

    #[Route('/nouveau', name: 'new', methods: ['GET', 'POST'])]
    #[IsGranted('BENEFICIAIRE_CREER')]
    public function new(Request $request): Response
    {
        $form = $this->createForm(BeneficiaireFormType::class);
        $form->handleRequest($request);
        if($form->isSubmitted() && $form->isValid()) {
            try {
                $this->api->post('/api/beneficiaires', [
                    'nom' => $form->get('nom')->getData(),
                    'categorie' => $form->get('categorie')->getData(),
                    'contact' => $form->get('contact')->getData()
                ]);
                $this->addFlash('success', 'Le bénéficiaire a été créé avec succès');
                return $this->redirectToRoute('beneficiaire.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'beneficiaire.new');
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('beneficiaire/new.html.twig', [
            'form' => $form
        ]);
    }

    #[Route('/{id}/modifier', name: 'edit', methods: ['GET', 'POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('BENEFICIAIRE_MODIFIER')]
    public function edit(int $id, Request $request): Response
    {
        try {
            $beneficiaire = $this->api->item('/api/beneficiaires/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'beneficiaire.index');
            if($response) {
                return $response;
            }
        }

        $form = $this->createForm(BeneficiaireFormType::class, $beneficiaire);
        $form->handleRequest($request);
        if($form->isSubmitted() && $form->isValid()) {
            try {
                $this->api->patch('/api/beneficiaires/' . $id, [
                    'nom' => $form->get('nom')->getData(),
                    'categorie' => $form->get('categorie')->getData(),
                    'contact' => $form->get('contact')->getData()
                ]);
                $this->addFlash('success', 'Le bénéficiaire a été modifié avec succès');
                return $this->redirectToRoute('beneficiaire.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'beneficiaire.edit', ['id' => $id]);
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('beneficiaire/edit.html.twig', [
            'form' => $form,
            'beneficiaire' => $beneficiaire
        ]);
    }

    #[Route('/{id}/supprimer', name: 'delete', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('BENEFICIAIRE_SUPPRIMER')]
    public function delete(int $id, Request $request): Response
    {
        if($this->isCsrfTokenValid('delete_beneficiaire', $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/beneficiaires/' . $id . '/remove');
                $this->addFlash('success', 'Le bénéficiaire a été supprimé avec succès');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'beneficiaire.index');
                if($response) {
                    return $response;
                }
            }
        }
        return $this->redirectToRoute('beneficiaire.index');
    }
}
