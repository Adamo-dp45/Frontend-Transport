<?php

namespace App\Controller;

use App\Domain\Helper\ApiExceptionHandlerHelper;
use App\Domain\Helper\ApiHelper;
use App\Form\RegisterFormType;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

final class RegisterController extends AbstractController
{
    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler
    )
    {
    }

    #[Route('/inscription', name: 'app_register')]
    // #[IsGranted('ROLE_SUPER_ADMIN')]
    public function register(Request $request): Response
    {
        $form = $this->createForm(RegisterFormType::class);
        $form->handleRequest($request);

        if($form->isSubmitted() && $form->isValid()) {
            $data = $form->getData();
            $payload = [
                'email' => $data['email'],
                'nom' => $data['nom'],
                'prenom' => $data['prenom'],
                'password' => $data['password'],
                'libelle' => $data['libelle'],
                'contact1' => $data['contact1'],
                'contact2' => $data['contact2'] ?? null,
                'adresse' => $data['adresse'] ?? null,
                'emailEntreprise' => $data['emailEntreprise'] ?? null,
                'anneecreation' => $form->getData()['anneecreation']?->format('Y-m-d') ?? null,
                'sigle' => $data['sigle'] ?? null,
                'siteweb' => $data['siteweb'] ?? null,
                'rccm' => $data['rccm'] ?? null,
                'banque' => $data['banque'] ?? null,
                'type' => $data['type'] ?? null,
                'centreimpot' => $data['centreimpot'] ?? null,
                'tauxtva' => $data['tauxtva'] ?? null
            ];

            try {
                $response = $this->api->post('/api/register', $payload); /*
                    - Si on veut le connecter directement on peut créer '->setToken()' ensuite le redirigé
                */
                $this->addFlash('success', 'Inscription réussie, vous pouvez vous connecter !');
                return $this->redirectToRoute('app_login');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'app_register');
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('register/register.html.twig', [
            'form' => $form
        ]);
    }
}
