<?php

namespace App\Controller;

use App\Domain\Helper\ApiExceptionHandlerHelper;
use App\Domain\Helper\ApiHelper;
use App\Domain\Helper\TableHelper;
use App\Form\FournisseurFormType;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/fournisseur', name: 'fournisseur.')]
#[IsGranted('ROLE_USER')]
final class FournisseurController extends AbstractController
{
    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler
    )
    {
    }

    #[Route('', name: 'index', methods: ['GET'])]
    #[IsGranted('FOURNISSEUR_VOIR')]
    public function index(Request $request, TableHelper $tableHelper): Response
    {
        try {
            $data = $tableHelper->handleIndex('/api/fournisseurs', $request->query->all(),
                [
                    'search' => 'libelle',
                    'contact' => 'contact'
                ],
                [
                    'id',
                    'libelle',
                    'createdAt'
                ]
            );
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        return $this->render('fournisseur/index.html.twig', $data);
    }

    #[Route('/{id}', name: 'show', methods: ['GET'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('FOURNISSEUR_VOIR')]
    public function show(int $id, TableHelper $tableHelper, Request $request): Response
    {
        try {
            $fournisseur = $this->api->item('/api/fournisseurs/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'fournisseur.index');
            if($response) {
                return $response;
            }
        }

        $approvisionnements = $tableHelper->handleRelated(
            endpoint: '/api/approvisionnements',
            queryParams: $request->query->all(),
            fixedFilters: ['fournisseur.id' => $id],
            allowedSorts: [
                'id',
                'dateappro',
                'createdAt'
            ],
            defaultPerPage: 10,
        );

        return $this->render('fournisseur/show.html.twig', [
            'fournisseur' => $fournisseur,
            'approvisionnements' => $approvisionnements['items'],
            'meta' => $approvisionnements['meta'],
            'queryParams' => $approvisionnements['queryParams']
        ]);
    }

    #[Route('/nouveau', name: 'new', methods: ['GET', 'POST'])]
    #[IsGranted('FOURNISSEUR_CREER')]
    public function new(Request $request): Response
    {
        $form = $this->createForm(FournisseurFormType::class);
        $form->handleRequest($request);

        if($form->isSubmitted() && $form->isValid()) {
            /*
                if($form->get('save')->isClicked()) {
                    return $this->redirectToRoute('fournisseur.new');
                }
            */
            $payload = [
                'libelle' => $form->get('libelle')->getData(),
                'contact' => $form->get('contact')->getData(),
                'email' => $form->get('email')->getData(),
                'adresse' => $form->get('adresse')->getData(),
                'pays' => $form->get('pays')->getData()
            ];
            try {
                $this->api->post('/api/fournisseurs', $payload);
                $this->addFlash('success', 'Le fournisseur a été créé avec succès');
                return $this->redirectToRoute('fournisseur.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'fournisseur.new');
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('fournisseur/new.html.twig', [
            'form' => $form
        ]);
    }

    #[Route('/{id}/modifier', name: 'edit', methods: ['GET', 'POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('FOURNISSEUR_MODIFIER')]
    public function edit(int $id, Request $request): Response
    {
        try {
            $fournisseur = $this->api->item('/api/fournisseurs/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'fournisseur.index');
            if($response) {
                return $response;
            }
        }

        $form = $this->createForm(FournisseurFormType::class, $fournisseur);
        $form->handleRequest($request);

        if($form->isSubmitted() && $form->isValid()) {
            $payload = [
                'libelle' => $form->get('libelle')->getData(),
                'contact' => $form->get('contact')->getData(),
                'email' => $form->get('email')->getData(),
                'adresse' => $form->get('adresse')->getData(),
                'pays' => $form->get('pays')->getData()
            ];
            try {
                $this->api->patch('/api/fournisseurs/' . $id, $payload);
                $this->addFlash('success', 'Le fournisseur a été modifié avec succès');
                return $this->redirectToRoute('fournisseur.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'fournisseur.edit', ['id' => $id]);
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('fournisseur/edit.html.twig', [
            'form' => $form,
            'fournisseur' => $fournisseur
        ]);
    }

    #[Route('/{id}/supprimer', name: 'delete', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('FOURNISSEUR_SUPPRIMER')]
    public function delete(int $id, Request $request): Response
    {
        if($this->isCsrfTokenValid('delete_fournisseur', $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/fournisseurs/' . $id . '/remove');
                $this->addFlash('success', 'Le fournisseur a été supprimé avec succès');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'fournisseur.index');
                if($response) {
                    return $response;
                }
            }
        }
        return $this->redirectToRoute('fournisseur.index');
    }
}
