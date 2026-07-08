<?php

namespace App\Controller;

use App\Domain\Helper\ApiHelper;
use App\Domain\Service\ApiClientService;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/profil', name: 'profile.')]
#[IsGranted('ROLE_USER')]
final class ProfileController extends AbstractController
{
    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiClientService $apiClient
    )
    {
    }

    #[Route('', name: 'index', methods: ['GET'])]
    public function index(): Response
    {
        return $this->render('profile/index.html.twig', []);
    }

    #[Route('/modifier', name: 'edit', methods: ['GET', 'POST'])]
    public function edit(Request $request): Response
    {
        /** @var \App\Entity\ApiUser $user */
        $user = $this->getUser();
        $userData = $user->toArray();
        $error = null;

        if ($request->isMethod('POST')) {
            $data = $request->request->all();

            try {
                $this->api->patch('/api/me', [
                    'email' => trim($data['email']  ?? ''),
                    'nom' => trim($data['nom'] ?? ''),
                    'prenom' => trim($data['prenom']  ?? '')
                ]); /*
                    - Endpoint de self-service '/api/me' (et non '/api/users/{id}' réservé à l'admin et bloqué par le guard de gestion)
                */
                $this->addFlash('success', 'Profil mis à jour avec succès');
                $this->apiClient->refreshCurrentUser();
                return $this->redirectToRoute('profile.index');
            } catch (ApiException $e) {
                $error = $e->getMessage();
            }
        }

        return $this->render('profile/edit.html.twig', [
            'user' => $userData,
            'error' => $error
        ]);
    }

    // ── Changer le mot de passe ───────────────────────────────────────────────

    #[Route('/mot-de-passe', name: 'password', methods: ['GET', 'POST'])]
    public function password(Request $request): Response
    {
        $error = null;
        if($request->isMethod('POST')) {
            $data = $request->request->all();

            $currentPassword = $data['currentPassword'] ?? '';
            $newPassword = $data['newPassword']     ?? '';
            $confirmPassword = $data['confirmPassword'] ?? '';

            if (empty($currentPassword) || empty($newPassword)) {
                $error = 'Tous les champs sont requis.';
            } elseif ($newPassword !== $confirmPassword) {
                $error = 'Le nouveau mot de passe et la confirmation ne correspondent pas.';
            } elseif (strlen($newPassword) < 4) {
                $error = 'Le mot de passe doit contenir au moins 4 caractères.';
            } else {
                try {
                    $this->api->post('/api/me/password', [
                        'currentPassword' => $currentPassword,
                        'newPassword'     => $newPassword,
                    ]); /*
                        - POST '/api/me/password' (ChangePasswordProcessor) ; c'est un POST côté API, pas un PATCH
                    */

                    $this->addFlash('success', 'Mot de passe modifié avec succès');
                    $this->apiClient->refreshCurrentUser();
                    return $this->redirectToRoute('profile.index');

                } catch (ApiException $e) {
                    $error = $e->getMessage();
                }
            }
        }

        return $this->render('profile/password.html.twig', [
            'error' => $error,
        ]);
    }

    // ── Changer l'avatar ──────────────────────────────────────────────────────

    #[Route('/avatar', name: 'avatar', methods: ['POST'])]
    public function avatar(Request $request): Response
    {
        /**
         * @var UploadedFile
         */
        $file = $request->files->get('avatar');

        if(!$file) {
            $this->addFlash('danger', 'Aucun fichier sélectionné');
            return $this->redirectToRoute('profile.index');
        }
        /* - On l'a géré côté backend
            $allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
            if (!in_array($file->getMimeType(), $allowedMimes, true)) {
                $this->addFlash('error', 'Format non supporté. Utilisez JPG, PNG, WEBP ou GIF.');
                return $this->redirectToRoute('profil.index');
            }
            if($file->getSize() > 2 * 1024 * 1024) { -- 2Mo ici
                $this->addFlash('error', 'L\'image ne doit pas dépasser 2 Mo.');
                return $this->redirectToRoute('profil.index');
            }
        */
        try {
            /*
                $content = file_get_contents($file->getPathname()); -- Pour encoder en base64 avec le préfixe data uri
                $base64 = base64_encode($content);
                $dataUri = 'data:' . $file->getMimeType() . ';base64,' . $base64;
            */
            $this->api->multipart('/api/me/avatar', [], [
                'file' => $file
            ]);
            $this->addFlash('success', 'Avatar mis à jour avec succès');
            $this->apiClient->refreshCurrentUser();
        } catch(ApiException $e) {
            $this->addFlash('error', $e->getMessage());
        }

        return $this->redirectToRoute('profile.index');
    }

    // ── Supprimer mon compte (= suspension + déconnexion) ─────────────────────

    #[Route('/supprimer', name: 'delete', methods: ['POST'])]
    public function delete(Request $request): Response
    {
        if (!$this->isCsrfTokenValid('delete_account', (string) $request->request->get('_token'))) {
            $this->addFlash('error', 'Jeton de sécurité invalide, veuillez réessayer.');
            return $this->redirectToRoute('profile.index');
        }

        $password = (string)$request->request->get('password', '');
        if ($password === '') {
            $this->addFlash('error', 'Veuillez saisir votre mot de passe pour confirmer.');
            return $this->redirectToRoute('profile.index');
        }

        try {
            // Côté API : vérifie le mot de passe puis suspend le compte courant.
            $this->api->post('/api/me/supprimer', ['password' => $password]);
        } catch (ApiException $e) {
            $this->addFlash('error', $e->getMessage());
            return $this->redirectToRoute('profile.index');
        }

        // Compte suspendu → on déconnecte (invalidation de session) et on renvoie vers la connexion.
        $request->getSession()->invalidate();
        return $this->redirectToRoute('app_login', ['compte_supprime' => 1]);
    }
}
