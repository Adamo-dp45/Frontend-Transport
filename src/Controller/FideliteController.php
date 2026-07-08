<?php

namespace App\Controller;

use App\Domain\Helper\ApiExceptionHandlerHelper;
use App\Domain\Helper\ApiHelper;
use App\Form\ProgrammeFideliteFormType;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/admin/fidelite', name: 'admin.fidelite.')]
#[IsGranted('ROLE_ADMIN')]
final class FideliteController extends AbstractController
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
        try {
            $programme = $this->api->item('/api/me/programme-fidelite');
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'home');
            if($response) {
                return $response;
            }
        }

        $form = $this->createForm(ProgrammeFideliteFormType::class, $programme);
        $form->handleRequest($request);

        if($form->isSubmitted() && $form->isValid()) {
            $payload = [
                'seuil' => $form->get('seuil')->getData(),
                'recompensePourcentage' => $form->get('recompensePourcentage')->getData(),
                'actif' => (bool) $form->get('actif')->getData()
            ];
            try {
                $this->api->patch('/api/me/programme-fidelite', $payload);
                $this->addFlash('success', 'Le programme de fidélité a été mis à jour');
                return $this->redirectToRoute('admin.fidelite.config');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'admin.fidelite.config');
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('fidelite/config.html.twig', [
            'form' => $form,
            'programme' => $programme
        ]);
    }
}
