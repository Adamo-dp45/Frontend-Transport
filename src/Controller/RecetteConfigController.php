<?php

namespace App\Controller;

use App\Domain\Helper\ApiExceptionHandlerHelper;
use App\Domain\Helper\ApiHelper;
use App\Form\ConfigRecetteFormType;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Configuration de la RECETTE / chiffre d'affaires, séparée de l'entreprise — comme remise/fidélité.
 * Permet à chaque compagnie d'inclure ou non les courriers dans son CA.
 */
#[Route('/admin/recette', name: 'admin.recette.')]
#[IsGranted('ROLE_ADMIN')]
final class RecetteConfigController extends AbstractController
{
    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler
    )
    {
    }

    #[Route('', name: 'config', methods: ['GET', 'POST'])]
    public function config(Request $request): Response
    {
        $config = ['courriershorsca' => false];
        try {
            $config = $this->api->item('/api/me/config-recette');
        } catch (ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'home');
            if ($response) {
                return $response;
            }
        }

        $form = $this->createForm(ConfigRecetteFormType::class, ['courriershorsca' => (bool) ($config['courriershorsca'] ?? false)]);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $payload = ['courriershorsca' => (bool) $form->get('courriershorsca')->getData()];
            try {
                $this->api->patch('/api/me/config-recette', $payload);
                $this->addFlash('success', 'La configuration de la recette a été mise à jour');
                return $this->redirectToRoute('admin.recette.config');
            } catch (ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'admin.recette.config');
                if ($response) {
                    return $response;
                }
            }
        }

        return $this->render('recette/config.html.twig', [
            'form' => $form,
            'config' => $config,
        ]);
    }
}
