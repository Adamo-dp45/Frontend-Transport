<?php

namespace App\Controller;

use App\Domain\Helper\ApiExceptionHandlerHelper;
use App\Domain\Helper\ApiHelper;
use App\Domain\Helper\TableHelper;
use App\Form\PersonnelEditFormType;
use App\Form\PersonnelFormType;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/personnel', name: 'personnel.')]
#[IsGranted('ROLE_USER')]
final class PersonnelController extends AbstractController
{
    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler
    )
    {
    }

    #[Route('', name: 'index', methods: ['GET'])]
    #[IsGranted('PERSONNEL_VOIR')]
    public function index(): Response
    {
        try {
            $personnels = $this->api->collection('/api/personnels');
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        return $this->render('personnel/index.html.twig', [
            'personnels' => $personnels
        ]);
    }

    #[Route('/{id}', name: 'show', methods: ['GET'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('PERSONNEL_VOIR')]
    public function show(int $id, Request $request, TableHelper $tableHelper): Response
    {
        try {
            $personnel = $this->api->item('/api/personnels/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'personnel.index');
            if($response) {
                return $response;
            }
        }

        $qVoyages = $request->query->all('v'); // On.. '?v[page]=2&v[sort]=datedepartprevue'
        $qDepannages = $request->query->all('d'); // On.. '?d[page]=1&d[sort]=datedepannage'

        $voyages = $tableHelper->handleRelated(
            endpoint: '/api/voyages',
            queryParams: $qVoyages,
            fixedFilters: [
                'personnel.id' => $id
                // 'exists[voyage]' => 'true' -- Si on.. la route du 'Detailpersonnel'
            ],
            allowedSorts: [
                'id',
                'provenance',
                'destination',
                'datedepartprevue',
                'placestotal',
                'createdAt'
            ],
            defaultPerPage: 10
        );

        $depannages = $tableHelper->handleRelated(
            endpoint: '/api/depannages',
            queryParams: $qDepannages,
            fixedFilters: [
                'personnel.id' => $id
                // 'exists[depannage]' => 'true' -- !!
            ],
            allowedSorts: [
                'id',
                'datedepannage',
                'lieudepannage',
                'couttotal',
                'createdAt'
            ],
            defaultPerPage: 10
        );

        return $this->render('personnel/show.html.twig', [
            'personnel' => $personnel,
            'voyages' => $voyages['items'],
            'voyagesMeta' => $voyages['meta'],
            'voyagesParams' => $qVoyages,
            'depannages' => $depannages['items'],
            'depannagesMeta' => $depannages['meta'],
            'depannagesParams' => $qDepannages
        ]);
    }

    #[Route('/nouveau', name: 'new', methods: ['GET', 'POST'])]
    #[IsGranted('PERSONNEL_CREER')]
    public function new(Request $request): Response
    {
        $types = [];
        try {
            $types = $this->api->collection('/api/typepersonnels');
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'personnel.index');
            if($response) {
                return $response;
            }
        }

        $form = $this->createForm(PersonnelFormType::class, null, [
            'types' => $types,
        ]);
        $form->handleRequest($request);

        if($form->isSubmitted() && $form->isValid()) {
            $typeId = $form->get('typepersonnel')->getData();

            /**
             * @var UploadedFile|null
             */
            $file = $form->get('image')->getData();
            $mediaObject = null;
            if($file) {
                try {
                    $mediaObject = $this->api->postMediaObject($file);
                } catch(ApiException $e) {
                    $response = $this->apiExceptionHandler->handle($e, null, 'personnel.new');
                    if($response) {
                        return $response;
                    }
                }
            }

            $payload = [
                'nom' => $form->get('nom')->getData(),
                'prenom' => $form->get('prenom')->getData(),
                'contact' => (string)$form->get('contact')->getData(),
                'code' => strtoupper(trim($form->get('code')->getData())),
                'typepersonnel' => '/api/typepersonnels/' . $typeId,
                'dateembauche' => $form->get('dateembauche')->getData()?->format('Y-m-d\TH:i:s.v\Z'),
                'image' => $mediaObject['@id'] ?? null
            ];
  
            try {
                $this->api->post('/api/personnels', $payload);
                $this->addFlash('success', 'Le personnel a été créé avec succès');
                return $this->redirectToRoute('personnel.index');
            } catch (ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'personnel.new');
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('personnel/new.html.twig', [
            'form' => $form
        ]);
    }

    #[Route('/{id}/modifier', name: 'edit', methods: ['GET', 'POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('PERSONNEL_MODIFIER')]
    public function edit(int $id, Request $request): Response
    {
        $types = [];
        $personnel = [];
        try {
            $personnel = $this->api->item('/api/personnels/' . $id);
            $types = $this->api->collection('/api/typepersonnels');
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'personnel.index');
            if($response) {
                return $response;
            }
        }

        $currentTypeId = isset($personnel['typepersonnel']) ? (int)$personnel['typepersonnel']['id'] : null;

        $form = $this->createForm(PersonnelEditFormType::class, array_merge(
            $personnel ?? [],
            [
                'typepersonnel' => $currentTypeId,
                'dateembauche' => !empty($personnel['dateembauche']) ? new \DateTimeImmutable($personnel['dateembauche']) : null
            ]
        ), [
            'types' => $types,
        ]);
        $form->handleRequest($request);

        if($form->isSubmitted() && $form->isValid()) {
            $typeId = $form->get('typepersonnel')->getData();

            // Gestion de l'image — on garde l'ancienne si pas de nouvelle
            $mediaObjectIri = $personnel['image']['@id'] ?? null;

            /** @var UploadedFile|null $file */
            $file = $form->get('image')->getData();
            if($file) {
                try {
                    $mediaObject = $this->api->postMediaObject($file);
                    $mediaObjectIri = $mediaObject['@id'] ?? null;
                } catch(ApiException $e) {
                    $response = $this->apiExceptionHandler->handle($e, $form, 'personnel.edit', ['id' => $id]);
                    if($response) {
                        return $response;
                    }
                }
            }

            $payload = [
                'nom' => $form->get('nom')->getData(),
                'prenom' => $form->get('prenom')->getData(),
                'contact' => $form->get('contact')->getData(),
                'code' => strtoupper(trim($form->get('code')->getData())),
                'typepersonnel' => '/api/typepersonnels/' . $typeId,
                'dateembauche' => $form->get('dateembauche')->getData()?->format('Y-m-d\TH:i:s.v\Z'),
                'image' => $mediaObjectIri // nouvelle IRI ou ancienne conservée
            ];

            try {
                $this->api->patch('/api/personnels/' . $id, $payload);
                $this->addFlash('success', 'Le personnel a été modifié avec succès');
                return $this->redirectToRoute('personnel.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'personnel.edit', ['id' => $id]);
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('personnel/edit.html.twig', [
            'form' => $form,
            'personnel' => $personnel
        ]);
    }

    #[Route('/{id}/suspendre', name: 'suspendre', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('PERSONNEL_MODIFIER')]
    public function suspendre(int $id): Response
    {
        try {
            $this->api->patch('/api/personnels/' . $id . '/suspendre');
            $this->addFlash('success', 'Le statut du personnel a été mis à jour');
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'personnel.show', ['id' => $id]);
            if($response) {
                return $response;
            }
        }

        return $this->redirectToRoute('personnel.show', ['id' => $id]);
    }

    #[Route('/{id}/desaffecter', name: 'desaffecter', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('PERSONNEL_MODIFIER')]
    public function desaffecter(int $id, Request $request): Response
    {
        $redirectUrl = $request->request->get('redirect_url');
        try {
            $this->api->delete('/api/detailpersonnels/' . $id);
            $this->addFlash('success', 'Le personnel a été désaffecté avec succès');
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        if($redirectUrl) {
            return $this->redirect($redirectUrl);
        }
        return $this->redirectToRoute('personnel.index');
    }

    #[Route('/{id}/supprimer', name: 'delete', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('PERSONNEL_SUPPRIMER')]
    public function delete(int $id, Request $request): Response
    {
        if($this->isCsrfTokenValid('delete_personnel', $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/personnels/' . $id . '/remove');
                $this->addFlash('success', 'Le personnel a été supprimé avec succès');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'personnel.index');
                if($response) {
                    return $response;
                }
            }
        }
        return $this->redirectToRoute('personnel.index');
    }
}
