<?php

namespace App\Controller;

use App\Domain\Helper\ApiExceptionHandlerHelper;
use App\Domain\Helper\ApiHelper;
use App\Domain\Helper\TableHelper;
use App\Domain\Service\EtiquetteDepart;
use App\Form\DepenseFormType;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Les charges d'exploitation : carburant, péage, salaires, loyer, imprévus.
 *
 * Le périmètre est tenu par l'API (un agent de gare ne voit et n'impute que SA gare, les charges du
 * siège restent aux administrateurs et aux utilisateurs centraux). Ici on ne fait que masquer ce
 * que le serveur refuserait : le sélecteur d'imputation n'apparaît que pour qui peut s'en servir.
 */
#[Route('/depense', name: 'depense.')]
#[IsGranted('ROLE_USER')]
final class DepenseController extends AbstractController
{
    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler,
        private readonly EtiquetteDepart $etiquette
    )
    {
    }

    #[Route('', name: 'index', methods: ['GET'])]
    #[IsGranted('DEPENSE_VOIR')]
    public function index(Request $request, TableHelper $tableHelper): Response
    {
        try {
            $data = $tableHelper->handleIndex('/api/depenses', $request->query->all(),
                [
                    'search' => 'libelle',
                    'beneficiaire' => 'beneficiaire',
                    'typedepense' => 'typedepense.id',
                    'gare' => 'gare.id',
                    'mode' => 'modereglement',
                    'date_from' => 'datedepense[after]',
                    'date_to' => 'datedepense[before]'
                ],
                [
                    'id',
                    'datedepense',
                    'montant',
                    'createdAt'
                ]
            );
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        $refs = $this->refs();

        return $this->render('depense/index.html.twig', array_merge($data, [
            'types' => $refs['types'],
            'gares' => $refs['gares'],
            'canDelete' => $this->peutMettreEnCorbeille()
        ])); /*
            - 'refs()' appelé UNE fois : les deux appels précédents refaisaient trois requêtes HTTP à
              l'API pour en jeter la moitié à chaque affichage de la liste
        */
    }

    #[Route('/nouvelle', name: 'new', methods: ['GET', 'POST'])]
    #[IsGranted('DEPENSE_CREER')]
    public function new(Request $request): Response
    {
        $refs = $this->refs();
        $form = $this->createForm(
            DepenseFormType::class,
            ['datedepense' => new \DateTime()], // le geste se saisit le jour même, neuf fois sur dix
            $this->optionsFormulaire($refs)
        );
        $form->handleRequest($request);

        if($form->isSubmitted() && $form->isValid()) {
            $justificatif = $this->televerser($form);
            if($justificatif instanceof Response) {
                return $justificatif;
            }

            try {
                $this->api->post('/api/depenses', $this->payload($form, $justificatif));
                $this->addFlash('success', 'La dépense a été enregistrée avec succès');
                return $this->redirectToRoute('depense.index');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'depense.new');
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('depense/new.html.twig', [
            'form' => $form
        ]);
    }

    #[Route('/{id}', name: 'show', methods: ['GET'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('DEPENSE_VOIR')]
    public function show(int $id): Response
    {
        try {
            $depense = $this->api->item('/api/depenses/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'depense.index');
            if($response) {
                return $response;
            }
        }

        return $this->render('depense/show.html.twig', [
            'depense' => $depense
        ]);
    }

    #[Route('/{id}/modifier', name: 'edit', methods: ['GET', 'POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('DEPENSE_MODIFIER')]
    public function edit(int $id, Request $request): Response
    {
        try {
            $depense = $this->api->item('/api/depenses/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'depense.index');
            if($response) {
                return $response;
            }
        }

        $refs = $this->refs();
        $form = $this->createForm(DepenseFormType::class, [
            'datedepense' => isset($depense['datedepense']) ? new \DateTime($depense['datedepense']) : null,
            'montant' => $depense['montant'] ?? null,
            'typedepense' => $depense['typedepense']['id'] ?? null,
            'gare' => $depense['gare']['id'] ?? null,
            'modereglement' => $depense['modereglement'] ?? 'ESPECES',
            'libelle' => $depense['libelle'] ?? null,
            'beneficiaire' => $depense['beneficiaire'] ?? null,
            'fournisseur' => $depense['fournisseur']['id'] ?? null,
            'voyage' => $depense['voyage']['id'] ?? null,
        ], $this->optionsFormulaire($refs, $depense));
        $form->handleRequest($request);

        if($form->isSubmitted() && $form->isValid()) {
            $justificatif = $this->televerser($form);
            if($justificatif instanceof Response) {
                return $justificatif;
            }
            // Aucun nouveau fichier : on CONSERVE le justificatif déjà attaché plutôt que de
            // l'effacer parce que le champ était vide.
            $justificatif ??= ['@id' => $depense['justificatif']['@id'] ?? null];

            try {
                $this->api->patch('/api/depenses/' . $id, $this->payload($form, $justificatif));
                $this->addFlash('success', 'La dépense a été modifiée avec succès');
                return $this->redirectToRoute('depense.show', ['id' => $id]);
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'depense.edit', ['id' => $id]);
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('depense/edit.html.twig', [
            'form' => $form,
            'depense' => $depense
        ]);
    }

    /**
     * Mise en corbeille réservée aux ADMINISTRATEURS, comme côté API : une sortie d'argent est un
     * document, la permission 'SUPPRIMER' seule ne suffit pas.
     */
    #[Route('/{id}/supprimer', name: 'delete', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    public function delete(int $id, Request $request): Response
    {
        if(!$this->peutMettreEnCorbeille()) {
            throw $this->createAccessDeniedException(); /*
                - Un attribut '#[IsGranted]' ne prend qu'un rôle à la fois : la règle en compte trois
                  et sert aussi à décider de l'affichage du bouton. Une seule méthode pour les deux,
                  sinon l'écran et la route finissent par dire l'inverse l'un de l'autre
            */
        }

        if($this->isCsrfTokenValid('delete_depense', $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/depenses/' . $id . '/remove');
                $this->addFlash('success', 'La dépense a été supprimée avec succès');
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'depense.index');
                if($response) {
                    return $response;
                }
            }
        }

        return $this->redirectToRoute('depense.index');
    }

    /**
     * Qui peut imputer ailleurs que dans sa propre gare — et donc au siège. Miroir de la règle du
     * 'DepenseProcessor' côté API : administrateur, ou utilisateur central sans gare.
     */
    private function peutImputerLibrement(): bool
    {
        return $this->isGranted('ROLE_ADMIN')
            || $this->isGranted('ROLE_SUPER_ADMIN')
            || $this->getUser()?->getGare() === null;
    }

    /**
     * Qui peut mettre une dépense à la corbeille. Miroir exact de l'opération 'Remove_Depense' de
     * l'API : les administrateurs, l'ADMIN DE GARE compris — il tient les charges de sa gare, et
     * l'API le borne de toute façon à sa propre gare ('GareScopeExtension' s'applique aussi à
     * l'item, une dépense étrangère répond 404). La permission 'SUPPRIMER' ne suffit pas : un
     * guichetier corrige un montant, il n'efface pas une pièce.
     */
    private function peutMettreEnCorbeille(): bool
    {
        return $this->isGranted('ROLE_ADMIN')
            || $this->isGranted('ROLE_SUPER_ADMIN')
            || $this->isGranted('ROLE_ADMIN_GARE');
    }

    /** @param array<string, mixed>|null $depense la dépense en cours de modification, s'il y en a une */
    private function optionsFormulaire(array $refs, ?array $depense = null): array
    {
        return [
            'types' => $refs['types'],
            'gares' => $refs['gares'],
            'fournisseurs' => $refs['fournisseurs'],
            'peutImputerLibrement' => $this->peutImputerLibrement(),
            /*
                Le départ déjà rattaché : son id ET son étiquette. Sans l'étiquette, le sélecteur
                distant afficherait un champ vide sur une dépense qui porte pourtant un voyage — il
                n'a chargé aucune option au premier rendu, il ne peut pas résoudre l'id tout seul.
            */
            'voyage_initial_value' => $depense['voyage']['id'] ?? null,
            'voyage_initial_label' => isset($depense['voyage'])
                ? $this->etiquette->pour($depense['voyage'])
                : null,
        ];
    }

    /** @return array<string, mixed>|Response le média créé, null si aucun fichier, ou la réponse d'erreur */
    private function televerser($form): array|Response|null
    {
        /** @var UploadedFile|null $file */
        $file = $form->get('justificatifFile')->getData();
        if(!$file) {
            return null;
        }

        try {
            return $this->api->postMediaObject($file);
        } catch(ApiException $e) {
            return $this->apiExceptionHandler->handle($e, $form, 'depense.new') ?? new Response('', 500);
        }
    }

    /** @return array<string, mixed> */
    private function payload($form, ?array $justificatif): array
    {
        $payload = [
            'datedepense' => $form->get('datedepense')->getData()?->format(\DateTimeInterface::ATOM),
            'montant' => $form->get('montant')->getData(),
            'typedepense' => '/api/typedepenses/' . $form->get('typedepense')->getData(),
            'modereglement' => $form->get('modereglement')->getData(),
            'libelle' => $form->get('libelle')->getData(),
            'beneficiaire' => $form->get('beneficiaire')->getData(),
            'justificatif' => $justificatif['@id'] ?? null,
        ];

        $fournisseur = $form->get('fournisseur')->getData();
        $payload['fournisseur'] = $fournisseur ? '/api/fournisseurs/' . $fournisseur : null;

        // Le départ rattaché (frais de route). Vide = charge de structure, rattachée à rien.
        $voyage = $form->get('voyage')->getData();
        $payload['voyage'] = $voyage ? '/api/voyages/' . $voyage : null;

        /*
            La gare n'est envoyée QUE si l'acteur peut en décider. Pour un agent rattaché, le champ
            n'existe pas dans le formulaire et le serveur impute sa gare lui-même — c'est une seule
            règle, tenue à un seul endroit.
        */
        if($this->peutImputerLibrement()) {
            $gare = $form->get('gare')->getData();
            $payload['gare'] = $gare ? '/api/gares/' . $gare : null;
        }

        return $payload;
    }

    /**
     * Les référentiels des sélecteurs, chargés INDÉPENDAMMENT les uns des autres.
     *
     * !! un seul 'try' pour les trois vidait TOUT dès qu'un seul était refusé : un admin de gare,
     * qui n'a pas accès aux FOURNISSEURS (entité d'entreprise), se retrouvait avec une liste de
     * postes vide et ne pouvait plus rien saisir — un refus sur un champ facultatif emportait le
     * champ obligatoire. Chaque liste tombe désormais toute seule.
     *
     * @return array{types: array, gares: array, fournisseurs: array}
     */
    private function refs(): array
    {
        return [
            'types' => $this->collectionOuVide('/api/typedepenses'),
            // Les gares ne servent qu'à ceux qui peuvent imputer ailleurs que chez eux.
            'gares' => $this->peutImputerLibrement() ? $this->collectionOuVide('/api/gares') : [],
            // Facultatif, et refusé à un acteur de gare : son absence ne doit rien empêcher.
            'fournisseurs' => $this->collectionOuVide('/api/fournisseurs'),
        ];
    }


    private function collectionOuVide(string $endpoint, array $query = []): array
    {
        try {
            return $this->api->collection($endpoint, $query);
        } catch(ApiException) {
            return [];
        }
    }
}
