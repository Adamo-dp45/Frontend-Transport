<?php

namespace App\Controller;

use App\Domain\Helper\ApiExceptionHandlerHelper;
use App\Domain\Helper\ApiHelper;
use App\Form\EntrepriseFormType;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/admin/entreprises', name: 'admin.entreprise.')]
#[IsGranted('ROLE_USER')]
final class EntrepriseController extends AbstractController
{
    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler
    )
    {
    }

    #[Route('', name: 'index', methods: ['GET'])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function index(): Response
    {
        try {
            $entreprises = $this->api->get('/api/entreprises');
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        return $this->render('admin/entreprise/index.html.twig', [
            'entreprises' => $entreprises['member']
        ]);
    }

    #[Route('/{id}', name: 'show', methods: ['GET'], requirements: ['id' => Requirement::DIGITS])]
    public function show(int $id): Response
    {
        if(!$this->isGranted('ROLE_SUPER_ADMIN') && !$this->isGranted('ROLE_ADMIN') /* && or object == user.getEntreprise() */) {
            throw $this->createAccessDeniedException();
        }

        try {
            $entreprise = $this->api->item('/api/entreprises/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'admin.entreprise.index');
            if($response) {
                return $response;
            }
        }

        return $this->render('admin/entreprise/show.html.twig', [
            'entreprise' => $entreprise
        ]);
    } // Combiner le 'me_entreprise' et 'show'

    #[Route('/me', name: 'me', methods: ['GET'])]
    public function me(): Response
    {
        if(!$this->isGranted('ROLE_ADMIN') /* && or object == user.getEntreprise() */) {
            throw $this->createAccessDeniedException();
        }

        try {
            $entreprise = $this->api->item('/api/me/entreprise');
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'admin.entreprise.index');
            if($response) {
                return $response;
            }
        }

        return $this->render('admin/entreprise/show.html.twig', [
            'entreprise' => $entreprise
        ]);
    } // Combiner le 'me_entreprise' et 'show'

    #[Route('/modifier', name: 'edit', methods: ['GET', 'POST'])]
    #[IsGranted('ROLE_ADMIN')]
    public function edit(Request $request): Response
    {
        try {
            $entreprise = $this->api->item('/api/me/entreprise');
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'admin.entreprise.me');
            if($response) {
                return $response;
            }
        }

        $form = $this->createForm(EntrepriseFormType::class, $entreprise);
        $form->handleRequest($request);

        if($form->isSubmitted() && $form->isValid()) {
            // Image : 'EntrepriseInput::$image' attend l'ID (int) du média, pas son IRI.
            // On n'envoie donc QUE la nouvelle image ; à null le backend conserve
            // l'ancienne (cf. MeEntrepriseProcessor : 'if($data->image)').
            $mediaObjectId = null;
            /** @var UploadedFile|null $file */
            $file = $form->get('file')->getData();
            if($file) {
                try {
                    $mediaObject = $this->api->postMediaObject($file);
                    $mediaObjectId = $mediaObject['id'];
                } catch(ApiException $e) {
                    $response = $this->apiExceptionHandler->handle($e, $form, 'admin.entreprise.edit');
                    if($response) {
                        return $response;
                    }
                }
            }

            $payload = [
                'libelle' => $form->get('libelle')->getData(),
                'contact1' => $form->get('contact1')->getData(),
                'contact2' => $form->get('contact2')->getData(),
                'adresse' => $form->get('adresse')->getData(),
                'email' => $form->get('email')->getData(),
                'anneecreation'=> $form->get('anneecreation')->getData(), // '?->format('Y-m-d\TH:i:s.v\Z')' si un champ date
                'sigle' => $form->get('sigle')->getData(),
                'siteweb' => $form->get('siteweb')->getData(),
                'rccm' => $form->get('rccm')->getData(),
                'banque' => $form->get('banque')->getData(),
                'type' => $form->get('type')->getData(),
                'centreimpot' => $form->get('centreimpot')->getData(),
                'tauxtva' => $form->get('tauxtva')->getData(),
                'image' => $mediaObjectId
            ];

            try {
                $this->api->patch('/api/me/entreprise', $payload);
                $this->addFlash('success', 'L\'entreprise a été modifiée avec succès');
                return $this->redirectToRoute('admin.entreprise.me');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'admin.entreprise.me');
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('admin/entreprise/edit.html.twig', [
            'form' => $form,
            'entreprise' => $entreprise
        ]);
    }

    #[Route('/{id}/desactiver', name: 'desactiver', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function desactiver(int $id): Response
    {
        try {
            $this->api->patch('/api/entreprises/' . $id . '/desactiver');
            $this->addFlash('success', 'Le statut de l\'entreprise a été mis à jour');
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'admin.entreprise.index');
            if($response) {
                return $response;
            }
        }
        return $this->redirectToRoute('admin.entreprise.index');
    }
}
