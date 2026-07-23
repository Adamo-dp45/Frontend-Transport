<?php

namespace App\Controller;

use App\Domain\Helper\ApiExceptionHandlerHelper;
use App\Domain\Helper\ApiHelper;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Espace du COMMERCIAL à bord : il gère ses voyages en cours (position du car, avancement, vente) depuis
 * une page dédiée, sans passer par la page d'administration du voyage.
 */
#[Route('/mon-espace', name: 'commercial.')]
#[IsGranted('ROLE_USER')]
final class CommercialController extends AbstractController
{
    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler
    )
    {
    }

    #[Route('', name: 'me', methods: ['GET'])]
    public function me(): Response
    {
        $voyages = [];
        try {
            $data = $this->api->item('/api/voyages/me/commercial');
            $voyages = $data['voyages'] ?? [];
        } catch (ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'home');
            if ($response) {
                return $response;
            }
        }

        return $this->render('commercial/me.html.twig', [
            'voyages' => $voyages,
        ]);
    }

    #[Route('/{id}/avancer', name: 'avancer', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    public function avancer(int $id, Request $request): Response
    {
        if ($this->isCsrfTokenValid('commercial_avancer', $request->request->get('_token'))) {
            $gareId = (int) $request->request->get('gare');
            try {
                $this->api->patch('/api/voyages/' . $id . '/avancer', [
                    'gare' => '/api/gares/' . $gareId,
                ]);
                $this->addFlash('success', 'Position du car mise à jour');
            } catch (ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'commercial.me');
                if ($response) {
                    return $response;
                }
            }
        }

        return $this->redirectToRoute('commercial.me');
    }

    #[Route('/{id}/repartir', name: 'repartir', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    public function repartir(int $id, Request $request): Response
    {
        if ($this->isCsrfTokenValid('commercial_repartir', $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/voyages/' . $id . '/repartir');
                $this->addFlash('success', 'Départ du car enregistré');
            } catch (ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'commercial.me');
                if ($response) {
                    return $response;
                }
            }
        }

        return $this->redirectToRoute('commercial.me');
    }
}
