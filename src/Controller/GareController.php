<?php

namespace App\Controller;

use App\Domain\Helper\ApiExceptionHandlerHelper;
use App\Domain\Helper\ApiHelper;
use App\Form\GareFormType;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/gare', name: 'gare.')]
#[IsGranted('ROLE_USER')]
final class GareController extends AbstractController
{
    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler
    )
    {
    }

    #[Route('', name: 'index', methods: ['GET'])]
    #[IsGranted('GARE_VOIR')]
    public function index(): Response
    {
        try {
            $gares = $this->api->collection('/api/gares');
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        return $this->render('gare/index.html.twig', [
            'gares' => $gares
        ]);
    }

    #[Route('/me', name: 'me', methods: ['GET'])]
    public function me(Request $request): Response
    {
        /** @var \App\Entity\ApiUser $user */
        $user = $this->getUser();
        $gareRef = $user->getGare();

        // Utilisateur sans gare (admin/central) : on affiche un message, pas d'appel API
        if(!$gareRef || empty($gareRef['id'])) {
            return $this->render('gare/me.html.twig', ['gare' => null, 'users' => [], 'stats' => null, 'periode' => 'mois']);
        }

        $id = $gareRef['id'];
        $periode = $request->query->get('periode', 'mois');
        if(!in_array($periode, ['jour', 'mois', 'tout'], true)) {
            $periode = 'mois';
        }

        // La recette (dashboard) est réservée à l'admin de gare / admins
        $peutVoirRecette = $this->isGranted('ROLE_ADMIN_GARE') || $this->isGranted('ROLE_ADMIN') || $this->isGranted('ROLE_SUPER_ADMIN');

        $users = [];
        $stats = null;
        $suivi = ['versMaGare' => [], 'depuisMaGare' => []];
        try {
            // Accessible à tout ROLE_USER ('/api/gares/{id}' n'exige pas GARE_VOIR) : c'est SA gare
            $gare = $this->api->item('/api/gares/' . $id);
            if($peutVoirRecette) {
                $stats = $this->api->item('/api/gares/me/dashboard', ['periode' => $periode]);
            }
            // Suivi des cars : opérationnel, accessible à tout agent rattaché à la gare
            $suivi = $this->api->item('/api/gares/me/suivi');
            if($this->isGranted('USER_VOIR') || $this->isGranted('ROLE_SUPER_ADMIN')) {
                $users = $this->api->collection('/api/users', ['gare.id' => $id]);
            }
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'home');
            if($response) {
                return $response;
            }
        }

        return $this->render('gare/me.html.twig', [
            'gare' => $gare,
            'users' => $users,
            'stats' => $stats,
            'suivi' => $suivi,
            'periode' => $periode,
        ]);
    }

    #[Route('/{id}', name: 'show', methods: ['GET'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('GARE_VOIR')]
    public function show(int $id): Response
    {
        $users = [];
        try {
            $gare = $this->api->item('/api/gares/' . $id);
            // On ne charge les utilisateurs de la gare que si l'utilisateur a le droit de les voir
            if($this->isGranted('USER_VOIR') || $this->isGranted('ROLE_SUPER_ADMIN')) {
                $users = $this->api->collection('/api/users', ['gare.id' => $id]);
            }
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'gare.index');
            if($response) {
                return $response;
            }
        }

        return $this->render('gare/show.html.twig', [
            'gare' => $gare,
            'users' => $users
        ]);
    }

    #[Route('/nouveau', name: 'new', methods: ['GET', 'POST'])]
    #[IsGranted('GARE_CREER')]
    public function new(Request $request): Response
    {
        $villes = $this->api->collection('/api/villes');
        $form = $this->createForm(GareFormType::class, null, ['villes' => $villes]);
        $form->handleRequest($request);
        if($form->isSubmitted() && $form->isValid()) {
            $payload = [
                'chefgare' => $form->get('chefgare')->getData(),
                'ville' => '/api/villes/' . $form->get('ville')->getData(),
                'libelle' => $form->get('libelle')->getData(),
                'description' => $form->get('description')->getData(),
                'contact1' => $form->get('contact1')->getData(),
                'contact2' => $form->get('contact2')->getData(),
                'datecreation' => $form->get('datecreation')->getData()?->format('Y-m-d\TH:i:s.v\Z')
            ];
            try {
                $this->api->post('/api/gares', $payload);
                $this->addFlash('success', 'La gare a été créée avec succès');
                return $this->redirectToRoute('gare.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'gare.new');
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('gare/new.html.twig', [
            'form' => $form
        ]);
    }

    #[Route('/{id}/modifier', name: 'edit', methods: ['GET', 'POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('GARE_MODIFIER')]
    public function edit(int $id, Request $request): Response
    {
        try {
            $gare = $this->api->item('/api/gares/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'gare.index');
            if($response) {
                return $response;
            }
        }
        if(!empty($gare['datecreation'])) {
            $gare['datecreation'] = new \DateTimeImmutable($gare['datecreation']);
        }
        // Le select 'ville' attend l'ID (la lecture expose 'ville' en nom + 'villeId' en id)
        $gare['ville'] = $gare['villeId'] ?? null;
        $villes = $this->api->collection('/api/villes');
        $form = $this->createForm(GareFormType::class, $gare, ['villes' => $villes]);
        $form->handleRequest($request);
        if($form->isSubmitted() && $form->isValid()) {
            $payload = [
                'chefgare' => $form->get('chefgare')->getData(),
                'ville' => '/api/villes/' . $form->get('ville')->getData(),
                'libelle' => $form->get('libelle')->getData(),
                'description' => $form->get('description')->getData(),
                'contact1' => $form->get('contact1')->getData(),
                'contact2' => $form->get('contact2')->getData(),
                'datecreation' => $form->get('datecreation')->getData()?->format('Y-m-d\TH:i:s.v\Z')
            ];
            try {
                $this->api->patch('/api/gares/' . $id, $payload);
                $this->addFlash('success', 'La gare a été modifiée avec succès');
                return $this->redirectToRoute('gare.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'gare.edit', ['id' => $id]);
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('gare/edit.html.twig', [
            'form' => $form,
            'gare' => $gare
        ]);
    }

    #[Route('/{id}/suspendre', name: 'suspendre', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('ROLE_ADMIN')]
    public function suspendre(int $id, Request $request): Response
    {
        if($this->isCsrfTokenValid('suspendre_gare', $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/gares/' . $id . '/suspendre');
                $this->addFlash('success', 'Le statut de la gare a été modifié avec succès');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'gare.index');
                if($response) {
                    return $response;
                }
            }
        }
        return $this->redirectToRoute('gare.index');
    }

    #[Route('/{id}/supprimer', name: 'delete', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('GARE_SUPPRIMER')]
    public function delete(int $id, Request $request): Response
    {
        if($this->isCsrfTokenValid('delete_gare', $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/gares/' . $id . '/remove');
                $this->addFlash('success', 'La gare a été supprimée avec succès');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'gare.index');
                if($response) {
                    return $response;
                }
            }
        }
        return $this->redirectToRoute('gare.index');
    }
}
