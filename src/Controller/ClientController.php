<?php

namespace App\Controller;

use App\Domain\Helper\ApiExceptionHandlerHelper;
use App\Domain\Helper\ApiHelper;
use App\Domain\Helper\TableHelper;
use App\Form\ClientFormType;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/client', name: 'client.')]
#[IsGranted('ROLE_USER')]
final class ClientController extends AbstractController
{
    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler
    )
    {
    }

    #[Route('', name: 'index', methods: ['GET'])]
    #[IsGranted('CLIENT_VOIR')]
    public function index(Request $request, TableHelper $tableHelper): Response
    {
        try {
            $data = $tableHelper->handleIndex('/api/clients', $request->query->all(),
                [
                    'search' => 'nom',
                    'tel' => 'contact'
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

        return $this->render('client/index.html.twig', $data);
    }

    #[Route('/{id}', name: 'show', methods: ['GET'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('CLIENT_VOIR')]
    public function show(int $id, TableHelper $tableHelper, Request $request): Response
    {
        try {
            $client = $this->api->item('/api/clients/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'client.index');
            if($response) {
                return $response;
            }
        }

        $tickets = $tableHelper->handleRelated(
            endpoint: '/api/tickets',
            queryParams: $request->query->all(),
            fixedFilters: ['client.id' => $id],
            allowedSorts: [
                'id',
                'codeticket',
                'prix',
                'createdAt'
            ],
            defaultPerPage: 10,
        );

        // État de fidélité (non bloquant : la fiche reste affichable si l'appel échoue)
        $fidelite = null;
        try {
            $fidelite = $this->api->get('/api/clients/' . $id . '/fidelite');
        } catch(ApiException) {
        }

        return $this->render('client/show.html.twig', [
            'client' => $client,
            'fidelite' => $fidelite,
            'tickets' => $tickets['items'],
            'meta' => $tickets['meta'],
            'queryParams' => $tickets['queryParams']
        ]);
    }

    #[Route('/{id}/adherer', name: 'adherer', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('CLIENT_MODIFIER')]
    public function adherer(int $id, Request $request): Response
    {
        if($this->isCsrfTokenValid('adherer_fidelite', $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/clients/' . $id . '/adherer');
                $this->addFlash('success', 'Le client a adhéré au programme de fidélité');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'client.show', ['id' => $id]);
                if($response) {
                    return $response;
                }
            }
        }
        return $this->redirectToRoute('client.show', ['id' => $id]);
    }

    #[Route('/{id}/resilier', name: 'resilier', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('CLIENT_MODIFIER')]
    public function resilier(int $id, Request $request): Response
    {
        if($this->isCsrfTokenValid('resilier_fidelite', $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/clients/' . $id . '/resilier');
                $this->addFlash('success', 'L\'adhésion fidélité du client a été résiliée');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'client.show', ['id' => $id]);
                if($response) {
                    return $response;
                }
            }
        }
        return $this->redirectToRoute('client.show', ['id' => $id]);
    }

    #[Route('/nouveau', name: 'new', methods: ['GET', 'POST'])]
    #[IsGranted('CLIENT_CREER')]
    public function new(Request $request): Response
    {
        $form = $this->createForm(ClientFormType::class);
        $form->handleRequest($request);

        if($form->isSubmitted() && $form->isValid()) {
            $payload = [
                'nom' => $form->get('nom')->getData(),
                'contact' => $form->get('contact')->getData(),
                'email' => $form->get('email')->getData()
            ];
            try {
                $this->api->post('/api/clients', $payload);
                $this->addFlash('success', 'Le client a été créé avec succès');
                return $this->redirectToRoute('client.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'client.new');
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('client/new.html.twig', [
            'form' => $form
        ]);
    }

    #[Route('/{id}/modifier', name: 'edit', methods: ['GET', 'POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('CLIENT_MODIFIER')]
    public function edit(int $id, Request $request): Response
    {
        try {
            $client = $this->api->item('/api/clients/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'client.index');
            if($response) {
                return $response;
            }
        }

        $form = $this->createForm(ClientFormType::class, $client);
        $form->handleRequest($request);

        if($form->isSubmitted() && $form->isValid()) {
            $payload = [
                'nom' => $form->get('nom')->getData(),
                'contact' => $form->get('contact')->getData(),
                'email' => $form->get('email')->getData()
            ];
            try {
                $this->api->patch('/api/clients/' . $id, $payload);
                $this->addFlash('success', 'Le client a été modifié avec succès');
                return $this->redirectToRoute('client.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'client.edit', ['id' => $id]);
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('client/edit.html.twig', [
            'form' => $form,
            'client' => $client
        ]);
    }

    #[Route('/{id}/supprimer', name: 'delete', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('CLIENT_SUPPRIMER')]
    public function delete(int $id, Request $request): Response
    {
        if($this->isCsrfTokenValid('delete_client', $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/clients/' . $id . '/remove');
                $this->addFlash('success', 'Le client a été supprimé avec succès');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'client.index');
                if($response) {
                    return $response;
                }
            }
        }
        return $this->redirectToRoute('client.index');
    }
}
