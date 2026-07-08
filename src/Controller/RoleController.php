<?php

namespace App\Controller;

use App\Domain\Helper\ApiExceptionHandlerHelper;
use App\Domain\Helper\ApiHelper;
use App\Domain\Helper\TableHelper;
use App\Entity\ApiUser;
use App\Form\RoleFormType;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/admin/roles', name: 'admin.role.')]
#[IsGranted('ROLE_USER')]
final class RoleController extends AbstractController
{
    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler
    )
    {
    }

    private function getEntities(): array
    {
        try {
            $list = $this->api->collection('/api/entities');
            return array_combine($list, $list); /*
                - Pour avoir un tableau avec ['Gare' => 'Gare'] sinon les clés seront indexés par des nombres ainsi 'entityKey' et 'entityLabel' valent tous les 2 le nom de l'entité
            */
        } catch(ApiException $e) {
            return [];
        }
    }

    #[Route('', name: 'index', methods: ['GET'])]
    #[IsGranted('ROLE_VOIR')]
    public function index(Request $request, TableHelper $tableHelper): Response
    {
        /**
         * @var ApiUser
         */
        $user = $this->getUser();
        $canFilterGare = $user->getGare() === null;

        $allowedFilters = ['search' => 'name'];
        $extras = [
            'gares' => [],
            'canFilterGare' => $canFilterGare,
        ];
        if ($canFilterGare) {
            $allowedFilters['gare'] = 'gare.id';
            $extras['gares'] = $this->api->collection('/api/gares');
        }

        try {
            $data = $tableHelper->handleIndex('/api/roles', $request->query->all(),
                $allowedFilters,
                [
                    'id',
                    'name',
                    'createdAt'
                ],
                $extras
            );
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        return $this->render('admin/role/index.html.twig', $data);
    }

    #[Route('/{id}', name: 'show', methods: ['GET'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('ROLE_VOIR')]
    public function show(int $id): Response
    {
        try {
            $role = $this->api->item('/api/roles/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'admin.role.index');
            if($response) {
                return $response;
            }
        }

        return $this->render('admin/role/show.html.twig', [
            'role' => $role
        ]);
    }

    #[Route('/nouveau', name: 'new', methods: ['GET', 'POST'])]
    #[IsGranted('ROLE_CREER')]
    public function new(Request $request): Response
    {
        $entities = $this->getEntities();
        $form = $this->createForm(RoleFormType::class, null, [
            'entities' => $entities
        ]);
        $form->handleRequest($request);

        if($form->isSubmitted() && $form->isValid()) {
            // Permissions cochées : tableau de "entity_ACTION"
            $permissions = $form->get('permissions')->getData() ?? [];

            // Transformer en tableau [{entity, action}, ...]
            $permissionsPayload = array_map(function (string $key) {
                [$entity, $action] = explode('_', $key, 2);
                return ['entity' => $entity, 'action' => $action];
            }, $permissions);

            $payload = [
                'name' => $form->get('name')->getData(),
                'description' => $form->get('description')->getData(),
                'typerole' => $form->get('typerole')->getData(),
                'permissions' => $permissionsPayload
            ];

            try {
                $this->api->post('/api/roles', $payload);
                $this->addFlash('success', 'Le rôle a été créé avec succès');
                return $this->redirectToRoute('admin.role.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'admin.role.new');
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('admin/role/new.html.twig', [
            'form' => $form,
            'entities' => $entities,
            'actions' => RoleFormType::ACTIONS,
        ]);
    }

    #[Route('/{id}/modifier', name: 'edit', methods: ['GET', 'POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('ROLE_MODIFIER')]
    public function edit(int $id, Request $request): Response
    {
        $entities = $this->getEntities();
        try {
            $role = $this->api->item('/api/roles/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'admin.role.index');
            if($response) {
                return $response;
            }
        }

        // Pré-cocher les permissions existantes : ["Gare_VIEW", "Voyage_CREATE", ...]
        $existingPermissions = array_map(
            fn($p) => $p['entity'] . '_' . $p['action'],
            $role['permissions'] ?? []
        );

        $form = $this->createForm(RoleFormType::class, array_merge(
            $role ?? [],
            ['permissions' => $existingPermissions]
        ), ['entities' => $entities]);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $permissions = $form->get('permissions')->getData() ?? [];

            $permissionsPayload = array_map(function (string $key) {
                [$entity, $action] = explode('_', $key, 2);
                return ['entity' => $entity, 'action' => $action];
            }, $permissions);

            $payload = [
                'name' => $form->get('name')->getData(),
                'description' => $form->get('description')->getData(),
                'typerole' => $form->get('typerole')->getData(),
                'permissions' => $permissionsPayload,
            ];

            try {
                $this->api->patch('/api/roles/' . $id, $payload);
                $this->addFlash('success', 'Le rôle a été modifié avec succès');
                return $this->redirectToRoute('admin.role.index');
            } catch (ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'admin.role.edit', ['id' => $id]);
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('admin/role/edit.html.twig', [
            'form' => $form,
            'role' => $role,
            'entities' => $entities,
            'actions' => RoleFormType::ACTIONS,
        ]);
    }

    #[Route('/{id}/supprimer', name: 'delete', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('ROLE_SUPPRIMER')]
    public function delete(int $id, Request $request): Response
    {
        if($this->isCsrfTokenValid('delete_role', $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/roles/' . $id . '/remove');
                $this->addFlash('success', 'Le rôle a été supprimé avec succès');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'admin.role.index');
                if($response) {
                    return $response;
                }
            }
        }
        return $this->redirectToRoute('admin.role.index');
    }
}