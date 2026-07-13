<?php

namespace App\Controller;

use App\Domain\Helper\ApiExceptionHandlerHelper;
use App\Domain\Helper\ApiHelper;
use App\Domain\Helper\MaintenanceStateProvider;
use App\Form\MaintenanceFormType;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Espace SYSTÈME (super admin) : réglages plateforme. Pour l'instant, le mode maintenance global.
 */
#[Route('/admin/systeme', name: 'admin.systeme.')]
#[IsGranted('ROLE_SUPER_ADMIN')]
final class SystemeController extends AbstractController
{
    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler,
        private readonly MaintenanceStateProvider $maintenance
    )
    {
    }

    #[Route('', name: 'index', methods: ['GET', 'POST'])]
    public function index(Request $request): Response
    {
        $etat = ['actif' => false, 'message' => null, 'depuis' => null];
        try {
            $etat = $this->api->item('/api/maintenance') ?? $etat;
        } catch (ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'home');
            if ($response) {
                return $response;
            }
        }

        $form = $this->createForm(MaintenanceFormType::class, [
            'actif' => (bool) ($etat['actif'] ?? false),
            'message' => $etat['message'] ?? null,
        ]);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $payload = [
                'actif' => (bool) $form->get('actif')->getData(),
                'message' => $form->get('message')->getData(),
            ];
            try {
                $this->api->patch('/api/maintenance', $payload);
                $this->maintenance->forget(); // effet immédiat (invalide le cache local)
                $this->addFlash('success', $payload['actif']
                    ? 'Le mode maintenance est ACTIVÉ.'
                    : 'Le mode maintenance est désactivé.');
                return $this->redirectToRoute('admin.systeme.index');
            } catch (ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'admin.systeme.index');
                if ($response) {
                    return $response;
                }
            }
        }

        return $this->render('systeme/index.html.twig', [
            'form' => $form,
            'etat' => $etat,
        ]);
    }
}
