<?php

namespace App\Controller;

use App\Domain\Helper\ApiExceptionHandlerHelper;
use App\Domain\Helper\ApiHelper;
use App\Form\ForgotPasswordType;
use App\Form\ResetPasswordType;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Authentication\AuthenticationUtils;

class SecurityController extends AbstractController
{
    public function __construct(
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler
    )
    {
    }

    #[Route(path: '/connexion', name: 'app_login')]
    public function login(AuthenticationUtils $authenticationUtils): Response
    {
        // if ($this->getUser()) {
        //     return $this->redirectToRoute('target_path');
        // }

        // get the login error if there is one
        $error = $authenticationUtils->getLastAuthenticationError();
        // last username entered by the user
        $lastUsername = $authenticationUtils->getLastUsername();

        return $this->render('security/login.html.twig', ['last_username' => $lastUsername, 'error' => $error]);
    }

    #[Route(path: '/deconnexion', name: 'app_logout')]
    public function logout(): void
    {
        throw new \LogicException('This method can be blank - it will be intercepted by the logout key on your firewall.');
    }

    #[Route('/forgot', name: 'forgot', methods: ['GET', 'POST'])]
    public function forgot(Request $request, ApiHelper $api)
    {
        if($this->getUser()) {
            return $this->redirectToRoute('home');
        }

        $form = $this->createForm(ForgotPasswordType::class);
        $form->handleRequest($request);

        if($form->isSubmitted() && $form->isValid()) {
            $email = $form->get('email')->getData();
            $resetUrl = $request->getSchemeAndHttpHost() . $this->generateUrl('reset'); /*
                - 'getSchemeAndHttpHost' dynamique selon l'environnement
            */
            try {
                $api->post('/api/forgot', [
                    'email' => $email,
                    'frontResetUrl' => $resetUrl
                ]);
            } catch(ApiException $e) { /*
                    - On le laisse silencieux et on ne révèle pas si le compte existe
                */
            }
            $this->addFlash('success', 'Si un compte existe avec cette adresse, vous recevrez un lien de réinitialisation dans quelques minutes');
            return $this->redirectToRoute('forgot');
        }

        return $this->render('security/forgot.html.twig', [
            'form' => $form
        ]);
    }

    #[Route('/reset', name: 'reset', methods: ['GET', 'POST'])]
    public function reset(Request $request, ApiHelper $api)
    {
        if($this->getUser()) {
            return $this->redirectToRoute('home');
        }

        $token = $request->query->get('token', ''); /*
            - Le token passe par query string '?token=' et est transmis en hidden field sur le post pour ne pas le perdre à la soumission
        */
        if(empty($token)) {
            return $this->redirectToRoute('forgot');
        }

        $form = $this->createForm(ResetPasswordType::class, [
            'token' => $token
        ]);
        $form->handleRequest($request);

        if($form->isSubmitted() && $form->isValid()) {
            try {
                $api->post('/api/reset', [
                    'token' => $form->get('token')->getData(),
                    'password' => $form->get('password')->getData()
                ]);
                $this->addFlash('success', 'Mot de passe réinitialisé avec succès. Vous pouvez vous connecter.');
                return $this->redirectToRoute('app_login');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'reset');
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('security/reset.html.twig', [
            'form' => $form,
            'token' => $token
        ]);
    }
}
