<?php

namespace App\Controller;

use App\Domain\Helper\ApiExceptionHandlerHelper;
use App\Domain\Helper\ApiHelper;
use App\Form\LibelleFormType;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;

#[Route('/typepiece', name: 'typepiece.')]
#[IsGranted('ROLE_USER')]
final class TypepieceController extends AbstractController
{
    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler /*
            private readonly CacheInterface $cache
        */
    )
    {
    }

    #[Route('', name: 'index', methods: ['GET'])]
    #[IsGranted('TYPEPIECE_VOIR')]
    public function index(): Response
    {
        try { /*
                $typepieces = $this->cache->get($this->cacheKey(), function (ItemInterface $item): array {
                    $item->expiresAfter(3600); # 1H
                    return $this->api->collection('/api/typepieces');
                });
            */
            $typepieces = $this->api->collection('/api/typepieces');
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        return $this->render('typepiece/index.html.twig', [
            'typepieces' => $typepieces
        ]);
    }

    #[Route('/nouveau', name: 'new', methods: ['GET', 'POST'])]
    #[IsGranted('TYPEPIECE_CREER')]
    public function new(Request $request): Response
    {
        $form = $this->createForm(LibelleFormType::class);
        $form->handleRequest($request);
        if($form->isSubmitted() && $form->isValid()) {
            try {
                $this->api->post('/api/typepieces', [
                    'libelle' => $form->get('libelle')->getData()
                ]);
                $this->addFlash('success', 'Le type de pièce a été créé avec succès');
                // $this->cache->delete($this->cacheKey());
                return $this->redirectToRoute('typepiece.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'typepiece.new');
                if($response) {
                    return $response;
                }
            } 
        }

        return $this->render('typepiece/new.html.twig', [
            'form' => $form
        ]);
    }

    #[Route('/{id}/modifier', name: 'edit', methods: ['GET', 'POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('TYPEPIECE_MODIFIER')]
    public function edit(int $id, Request $request): Response
    {
        try {
            $type = $this->api->item('/api/typepieces/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'typepiece.index');
            if($response) {
                return $response;
            }
        }

        $form = $this->createForm(LibelleFormType::class, $type);
        $form->handleRequest($request);
        if($form->isSubmitted() && $form->isValid()) {
            try {
                $this->api->patch('/api/typepieces/' . $id, [
                    'libelle' => $form->get('libelle')->getData()
                ]);
                $this->addFlash('success', 'Le type de pièce a été modifié avec succès');
                // $this->cache->delete($this->cacheKey());
                return $this->redirectToRoute('typepiece.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'typepiece.edit', ['id' => $id]);
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('typepiece/edit.html.twig', [
            'form' => $form,
            'typepiece' => $type
        ]);
    }

    #[Route('/{id}/supprimer', name: 'delete', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('TYPEPIECE_SUPPRIMER')]
    public function delete(int $id, Request $request): Response
    {
        if($this->isCsrfTokenValid('delete_typepiece', $request->request->get('_token'))) { // Ou.. 'CsrfTokenManagerInterface'
            try {
                $this->api->patch('/api/typepieces/' . $id . '/remove');
                $this->addFlash('success', 'Le type de pièce a été supprimé avec succès');
                // $this->cache->delete($this->cacheKey());
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'typepiece.index');
                if($response) {
                    return $response;
                }
            }
        }
        return $this->redirectToRoute('typepiece.index');
    }
    /*
        private function cacheKey(): string
        {
            /**
             * @var ApiUser
             *
            $user = $this->getUser();
            $entrepriseId = $user->getEntrepriseId();
            return sprintf('typepiece.%d', $entrepriseId);
        }

        private function cacheKeyItem(int $id): string
        {
            /**
             * @var ApiUser
             *
            $user = $this->getUser();
            return sprintf('fournisseur.%d.item.%d', $user->getEntrepriseId(), $id);
        }
    */
}