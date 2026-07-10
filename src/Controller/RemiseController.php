<?php

namespace App\Controller;

use App\Domain\Helper\ApiExceptionHandlerHelper;
use App\Domain\Helper\ApiHelper;
use App\Form\ConfigRemiseFormType;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Configuration des REMISES (plafond anti-abus), séparée de l'entreprise — comme la fidélité.
 */
#[Route('/admin/remise', name: 'admin.remise.')]
#[IsGranted('ROLE_ADMIN')]
final class RemiseController extends AbstractController
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
        $config = ['maxpourcentage' => null];
        try {
            $config = $this->api->item('/api/me/config-remise');
        } catch (ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'home');
            if ($response) {
                return $response;
            }
        }

        $form = $this->createForm(ConfigRemiseFormType::class, ['maxpourcentage' => $config['maxpourcentage'] ?? null]);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $payload = ['maxpourcentage' => $form->get('maxpourcentage')->getData()];
            try {
                $this->api->patch('/api/me/config-remise', $payload);
                $this->addFlash('success', 'La configuration des remises a été mise à jour');
                return $this->redirectToRoute('admin.remise.config');
            } catch (ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'admin.remise.config');
                if ($response) {
                    return $response;
                }
            }
        }

        return $this->render('remise/config.html.twig', [
            'form' => $form,
            'config' => $config,
        ]);
    }
}
