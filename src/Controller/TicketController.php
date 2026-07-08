<?php

namespace App\Controller;

use App\Controller\Trait\GareActionTrait;
use App\Domain\Helper\ApiExceptionHandlerHelper;
use App\Domain\Helper\ApiHelper;
use App\Domain\Helper\TableHelper;
use App\Domain\Service\PdfService;
use App\Domain\Service\QrCodeService;
use App\Entity\ApiUser;
use App\Form\TicketEditFormType;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/ticket', name: 'ticket.')]
#[IsGranted('ROLE_USER')]
final class TicketController extends AbstractController
{
    use GareActionTrait;

    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler,
        private readonly PdfService $pdfService,
        private readonly TableHelper $tableHelper,
        private readonly QrCodeService $qrCode
    )
    {
    }

    private ?array $entrepriseCache = null;
    private bool $entrepriseFetched = false;

    /**
     * Ajoute au tableau d'un ticket un QR code (data-URI PNG). Consommé par le
     * template (clé `qrcode`).
     *
     * Choix retenu : le QR encode SIMPLEMENT le code du billet (ex. TCK-2026-12).
     * L'agent le scanne et lit/vérifie le code à l'œil — pas de route ni de page
     * de vérification nécessaire.
     */
    private function withQrcode(?array $ticket): ?array
    {
        if (!$ticket || empty($ticket['codeticket'])) {
            return $ticket;
        }

        // Le QR encode le code du billet + la GARE ÉMETTRICE (gare de montée) : l'agent qui scanne
        // vérifie d'un coup d'œil le billet ET d'où il a été vendu.
        $contenu = $ticket['codeticket'];
        $gareEmettrice = $ticket['gare']['libelle'] ?? null;
        if ($gareEmettrice) {
            $contenu .= "\n" . 'Gare : ' . $gareEmettrice;
        }
        $ticket['qrcode'] = $this->qrCode->dataUri($contenu);

        /*
            // -- Approche alternative : QR encodant une URL de vérification --
            // Le QR renvoie vers une page (ticket.verify + templates/ticket/verify.html.twig)
            // qui affiche la validité du billet. Pour basculer dessus : décommenter ce bloc,
            // réactiver la route verify() plus bas, et le template show.html.twig.
            $url = $this->generateUrl(
                'ticket.verify',
                ['code' => $ticket['codeticket']],
                UrlGeneratorInterface::ABSOLUTE_URL
            );
            $ticket['qrcode'] = $this->qrCode->dataUri($url);
        */

        return $ticket;
    }

    /**
     * Récupère l'entreprise de l'utilisateur connecté (en-tête du billet),
     * mémorisée le temps de la requête. Le logo est embarqué en base64 car
     * Dompdf a le chargement d'images distantes désactivé.
     */
    private function getEntreprise(): ?array
    {
        if ($this->entrepriseFetched) {
            return $this->entrepriseCache;
        }
        $this->entrepriseFetched = true;

        try {
            $entreprise = $this->api->item('/api/me/entreprise');
        } catch (\Throwable) {
            return $this->entrepriseCache = null;
        }

        $contentUrl = $entreprise['image']['contentUrl'] ?? null;
        if ($contentUrl) {
            try {
                $raw = $this->api->raw($contentUrl);
                $entreprise['logo'] = 'data:' . $raw['content_type'] . ';base64,' . base64_encode($raw['body']);
            } catch (\Throwable) {
                // logo non embarquable → le template retombe sur le sigle/libellé
            }
        }

        return $this->entrepriseCache = $entreprise;
    }

    #[Route('', name: 'index', methods: ['GET'])]
    #[IsGranted('TICKET_VOIR')]
    public function index(Request $request): Response
    {
        /**
         * @var ApiUser
         */
        $user = $this->getUser();
        $canFilterGare = $user->getGare() === null;

        $allowedFilters = [
            'search' => 'codeticket',
            'voyage' => 'voyage.id',
            'statut' => 'statut',
        ];
        $extras = [
            'voyages' => $this->api->collection('/api/voyages?exists[datearriveereelle]=false'),
            'gares' => [],
        ];
        if($canFilterGare) {
            $allowedFilters['gare'] = 'gare.id';
            $extras['gares'] = $this->api->collection('/api/gares');
        }

        $data = $this->tableHelper->handleIndex('/api/tickets', $request->query->all(),
            $allowedFilters,
            [
                'id',
                'codeticket',
                'prix',
                'createdAt'
            ],
            $extras
        );

        return $this->render('ticket/index.html.twig', $data);
    }

    /*
        // -- Approche alternative (URL de vérification) — DÉSACTIVÉE --
        // Page de vérification d'un billet, cible du QR si on encode une URL.
        // À réactiver avec le bloc URL de withQrcode() et templates/ticket/verify.html.twig.
        // Un agent connecté scanne le QR : on retrouve le ticket par son code et on
        // affiche sa validité. Le périmètre entreprise/gare de l'API garantit qu'un agent
        // ne valide que les billets de son ressort.
        #[Route('/verifier/{code}', name: 'verify', methods: ['GET'], requirements: ['code' => '[^/]+'])]
        public function verify(string $code): Response
        {
            $ticket = null;
            try {
                // Le SearchFilter sur codeticket est "partial" → on confirme l'égalité stricte
                $matches = $this->api->collection('/api/tickets', ['codeticket' => $code]);
                foreach ($matches as $candidate) {
                    if (($candidate['codeticket'] ?? null) === $code) {
                        $ticket = $candidate;
                        break;
                    }
                }
            } catch (ApiException) {
                // ticket introuvable / hors périmètre → considéré non valide
            }

            return $this->render('ticket/verify.html.twig', [
                'code' => $code,
                'ticket' => $ticket,
                'valid' => $ticket !== null,
            ]);
        }
    */

    #[Route('/{id}', name: 'show', methods: ['GET'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('TICKET_VOIR')]
    public function show(int $id): Response
    {
        try {
            $ticket = $this->api->item('/api/tickets/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'ticket.index');
            if($response) {
                return $response;
            }
        }

        // Modif / désistement réservés à la gare émettrice (gare de montée du ticket)
        $peutAgir = $this->peutAgirSurGare($ticket['gare']['id'] ?? null);

        return $this->render('ticket/show.html.twig', [
            'ticket' => $this->withQrcode($ticket),
            'peutAgir' => $peutAgir
        ]);
    }

    #[Route('/nouveau', name: 'new', methods: ['GET', 'POST'])]
    #[IsGranted('TICKET_CREER')]
    public function new(Request $request): Response
    {
        if($request->isMethod('GET')) {
            /**
             * @var ApiUser
             */
            $user = $this->getUser();
            $voyages = $this->api->collection('/api/voyages?exists[datearriveereelle]=false');
            $gares = $this->api->collection('/api/gares');
            $beneficiaires = $this->api->collection('/api/beneficiaires');
            $userGare = $user->getGare();

            return $this->render('ticket/new.html.twig', [
                'voyages' => $voyages,
                'gares' => $gares,
                'beneficiaires' => $beneficiaires,
                'preselect_voyage' => $request->query->getInt('voyage'),
                'userGareId' => $userGare['id'] ?? null,
                'userGareLibelle' => $userGare['libelle'] ?? null,
                'currentUserId' => $user->getId() // pour détecter le commercial du voyage
            ]);
        }

        // POST : payload = tableau de tickets (vente groupée)
        // POST - ajouter gare dans le payload de chaque ticket
        try {
            $payload = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return $this->json(['detail' => 'Corps de requête JSON invalide'], 400);
        }

        // payload attendu : { tickets: [{ voyage, siege, nomclient, contactclient }] }
        $tickets = $payload['tickets'] ?? [];
        if (empty($tickets)) {
            return $this->json(['detail' => 'Aucun ticket à créer'], 422);
        }

        $created = [];
        $errors  = [];
        foreach($tickets as $index => $t) {
            if(empty($t['voyage']) || empty($t['siege']) || empty($t['gare'])) {
                $errors[] = "Ticket #" . ($index + 1) . " : voyage, siège et gare obligatoires";
                continue;
            }
            try {
                $ticket = $this->api->post('/api/tickets', [
                    'voyage' => $t['voyage'], // IRI /api/voyages/{id}
                    'siege' => $t['siege'], // IRI /api/sieges/{id}
                    'gare' => $t['gare'],      // gare de MONTÉE (IRI)
                    'garedescente' => $t['garedescente'] ?? null, // gare de DESCENTE (IRI) ; null = terminus (bout en bout)
                    'nomclient' => $t['nomclient']     ?? null,
                    'contactclient' => $t['contactclient'] ?? null,
                    // Remise (le backend calcule le montant et exige un bénéficiaire si remise)
                    'remisetype' => $t['remisetype'] ?? null,
                    'remisevaleur' => isset($t['remisevaleur']) ? (int) $t['remisevaleur'] : null,
                    'beneficiaire' => $t['beneficiaire'] ?? null, // IRI /api/beneficiaires/{id}
                    // Récompense fidélité : le backend valide l'éligibilité et applique la remise du programme
                    'fideliteRecompense' => (bool) ($t['fideliteRecompense'] ?? false)
                ]);
                $created[] = $ticket['id'];
            } catch (ApiException $e) {
                $errors[] = "Siège #" . ($index + 1) . " : " . $e->getMessage();
            }
        }

        if (!empty($errors) && empty($created)) {
            return $this->json(['detail' => implode(' | ', $errors)], 422);
        }

        return $this->json(['created' => $created, 'errors' => $errors]);
    }

    /**
     * Désistement d'un billet : page de saisie (GET) et relais vers l'API (POST).
     *  - REPORT     : reporte le client sur un autre voyage de la même ligne (nouveau billet).
     *  - ANNULATION : annule et rembourse le billet.
     * Dans les deux cas, le siège du billet d'origine est libéré.
     */
    #[Route('/{id}/desister', name: 'desister', methods: ['GET', 'POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('TICKET_MODIFIER')]
    public function desister(int $id, Request $request): Response
    {
        // POST (JSON depuis React) : on relaie au processor de l'API
        if ($request->isMethod('POST')) {
            try {
                $payload = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);
            } catch (\JsonException) {
                return $this->json(['error' => 'Corps de requête JSON invalide'], 400);
            }

            $mode = $payload['mode'] ?? null;
            $body = [
                'mode' => $mode,
                'motif' => $payload['motif'] ?? null,
            ];
            if ($mode === 'REPORT') {
                $body['voyage'] = $payload['voyage'] ?? null; // IRI /api/voyages/{id}
                $body['siege'] = $payload['siege'] ?? null;   // IRI /api/sieges/{id}
            }

            try {
                // L'API renvoie le billet résultant (nouveau billet si report, billet annulé sinon)
                $ticket = $this->api->patch('/api/tickets/' . $id . '/desister', $body);
                return $this->json(['ok' => true, 'id' => $ticket['id'] ?? $id, 'mode' => $mode]);
            } catch (ApiException $e) {
                return $this->json(['error' => $e->getMessage()], $e->getCode() ?: 400);
            }
        }

        // GET : page de désistement
        try {
            $ticket = $this->api->item('/api/tickets/' . $id);
        } catch (ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'ticket.index');
            if ($response) {
                return $response;
            }
        }

        if (($ticket['statut'] ?? 'VALIDE') !== 'VALIDE') {
            $this->addFlash('error', 'Ce billet ne peut pas être désisté (déjà reporté ou annulé).');
            return $this->redirectToRoute('ticket.show', ['id' => $id]);
        }

        // Voyages de report : même ligne, ouverts, hors voyage d'origine.
        // La ligne n'est pas exposée dans 'read:Ticket' → on la lit via le voyage (read:Voyage).
        $voyagesCible = [];
        $voyageOrigineId = $ticket['voyage']['id'] ?? null;
        try {
            $voyage = $this->api->item('/api/voyages/' . $voyageOrigineId);
            $ligneId = $voyage['ligne']['id'] ?? null;
            if ($ligneId) {
                $voyagesCible = array_values(array_filter(
                    $this->api->collection('/api/voyages', [
                        'ligne.id' => $ligneId,
                        'exists[datearriveereelle]' => 'false',
                    ]),
                    fn($v) => ($v['id'] ?? null) !== $voyageOrigineId
                ));
            }
        } catch (ApiException) {
            // ligne/voyages indisponibles → liste vide (seul le mode ANNULATION restera utilisable)
        }

        return $this->render('ticket/desister.html.twig', [
            'ticket' => $ticket,
            'voyagesCible' => $voyagesCible,
        ]);
    }

    #[Route('/sieges/{id}', name: 'sieges', methods: ['GET'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('TICKET_VOIR')]
    public function sieges(int $id, Request $request): JsonResponse
    {
        try {
            // 1. Charger le voyage pour récupérer le car
            $voyage = $this->api->item('/api/voyages/' . $id);

            $carId = $voyage['car']['id'] ?? null;

            if (!$carId) {
                return $this->json([
                    'siegesGauche' => 0,
                    'siegesDroite' => 0,
                    'sieges' => []
                ]);
            }

            // 2. Appeler le SiegeStateProvider : disponibilité PAR TRONÇON si montée/descente fournies
            $query = [
                'car' => '/api/cars/' . $carId,
                'voyage' => $id,
            ];
            $montee = $request->query->get('montee');
            $descente = $request->query->get('descente');
            if ($montee) {
                $query['montee'] = $montee;
            }
            if ($descente) {
                $query['descente'] = $descente;
            }
            $sieges = $this->api->collection('/api/sieges', $query);

            // Info capacité du tronçon (places réservées) — pour prévenir l'agent au guichet
            $capacite = ['placesReservees' => 0, 'placesDisponibles' => null, 'capacite' => null];
            if ($montee && $descente) {
                try {
                    $capacite = $this->api->get('/api/capacite', [
                        'voyage' => $id,
                        'montee' => $montee,
                        'descente' => $descente,
                    ]);
                } catch (ApiException) {
                    // non bloquant : on garde les valeurs par défaut
                }
            }

            return $this->json([
                'siegesGauche' => $voyage['car']['siegesGauche'] ?? 2,
                'siegesDroite' => $voyage['car']['siegesDroite'] ?? 2,
                'sieges'       => $sieges,
                'placesReservees'   => $capacite['placesReservees'] ?? 0,
                'placesDisponibles' => $capacite['placesDisponibles'] ?? null,
            ]);

        } catch (ApiException $e) {
            return $this->json(
                ['error' => 'Impossible de charger les sièges : ' . $e->getMessage()],
                $e->getCode() ?: 500
            );
        }
    }

    /**
     * Libère un siège pour le revendre : enregistre que l'occupant (billet bloquant) descend
     * à la gare 'gare' (montée de la revente). Le siège se dégrise en aval, sans toucher au prix.
     */
    #[Route('/siege/liberer', name: 'siege_liberer', methods: ['POST'])]
    #[IsGranted('TICKET_CREER')]
    public function libererSiege(Request $request): JsonResponse
    {
        $ticketId = $request->request->get('ticket');
        $gareId = $request->request->get('gare');
        if (!$ticketId || !$gareId) {
            return $this->json(['error' => 'Billet occupant et gare de descente obligatoires'], 400);
        }
        try {
            $this->api->patch('/api/tickets/' . (int) $ticketId . '/descendre', [
                'gare' => '/api/gares/' . (int) $gareId,
            ]);
            return $this->json(['ok' => true]);
        } catch (ApiException $e) {
            return $this->json(['error' => $e->getMessage()], $e->getCode() ?: 500);
        }
    }

    #[Route('/arrets/{id}', name: 'arrets', methods: ['GET'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('TICKET_VOIR')]
    public function arrets(int $id): JsonResponse
    {
        try {
            $voyage = $this->api->item('/api/voyages/' . $id);
            $ligneId = $voyage['ligne']['id'] ?? null;
            if (!$ligneId) {
                return $this->json(['arrets' => []]); // voyage non rattaché à une ligne
            }
            $ligne = $this->api->item('/api/lignes/' . $ligneId);
            $arrets = array_map(fn($a) => [
                'id' => $a['gare']['id'],
                'libelle' => $a['gare']['libelle'],
                'ville' => $a['gare']['ville'] ?? null,
                'ordre' => $a['ordre'],
            ], $ligne['arrets'] ?? []);
            usort($arrets, fn($x, $y) => $x['ordre'] <=> $y['ordre']);
            return $this->json(['arrets' => $arrets]);
        } catch (ApiException $e) {
            return $this->json(['error' => $e->getMessage()], $e->getCode() ?: 500);
        }
    }

    #[Route('/tarif', name: 'tarif', methods: ['GET'])]
    #[IsGranted('TICKET_VOIR')]
    public function tarif(Request $request): JsonResponse
    {
        $montee = $request->query->get('montee');
        $descente = $request->query->get('descente');
        if (!$montee || !$descente) {
            return $this->json(['montant' => null]);
        }
        try {
            // Prix issu de la grille tarifaire globale (gare → gare) de l'entreprise
            $tarifs = $this->api->collection('/api/tarifs', [
                'garedepart.id' => $montee,
                'garearrivee.id' => $descente,
            ]);
            return $this->json(['montant' => $tarifs[0]['montant'] ?? null]);
        } catch (ApiException $e) {
            return $this->json(['montant' => null, 'error' => $e->getMessage()], $e->getCode() ?: 500);
        }
    }

    #[Route('/fidelite', name: 'fidelite', methods: ['GET'])]
    #[IsGranted('TICKET_VOIR')]
    public function fideliteLookup(Request $request): JsonResponse
    {
        $contact = $request->query->get('contact');
        if (!$contact) {
            return $this->json(['found' => false]);
        }
        try {
            // Proxy vers l'API : statut de fidélité du client identifié par son téléphone (sans création)
            $data = $this->api->get('/api/fidelite/lookup', ['contact' => $contact]);
            return $this->json($data);
        } catch (ApiException $e) {
            return $this->json(['found' => false, 'error' => $e->getMessage()], $e->getCode() ?: 500);
        }
    }

    #[Route('/{id}/json', name: 'json', methods: ['GET'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('TICKET_VOIR')]
    public function jsons(int $id): JsonResponse
    {
        try {
            $ticket = $this->api->item('/api/tickets/' . $id);
            return $this->json($ticket);
        } catch (ApiException $e) {
            return $this->json(['detail' => $e->getMessage()], $e->getCode() ?: 500);
        }
    }

    #[Route('/{id}/modifier', name: 'edit', methods: ['GET', 'POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('TICKET_MODIFIER')]
    public function edit(int $id, Request $request)
    {
        try {
            $ticket = $this->api->item('/api/tickets/' . $id);
        } catch (ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'ticket.index');
            if($response) {
                return $response;
            }
        }

        $form = $this->createForm(TicketEditFormType::class, $ticket);
        $form->handleRequest($request);

        if($form->isSubmitted() && $form->isValid()) {
            $data = $form->getData();
            try {
                $this->api->patch('/api/tickets/' . $id, [
                    'nomclient' => $data['nomclient'],
                    'contactclient' => $data['contactclient']
                ]);
                $this->addFlash('success', 'Ticket modifié avec succès');
                return $this->redirectToRoute('ticket.show', ['id' => $id]);
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, $form, 'ticket.edit', ['id' => $id]);
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('ticket/edit.html.twig', [
            'form' => $form,
            'ticket' => $ticket
        ]);
    }
    /*
        #[Route('/{id}/print', name: 'print', methods: ['GET'], requirements: ['id' => Requirement::DIGITS])]
        #[IsGranted('TICKET_VOIR')]
        public function print(int $id)
        {
            try {
                $content = $this->api->raw('/api/tickets/' . $id . '/print'); /*
                    - L'impression venant de l'api
                *
                return new Response(
                    $content['body'],
                    200,
                    [
                        'Content-Type' => $content['content_type'],
                        'Content-Disposition' => 'inline; filename="ticket-' . $id . '.pdf"'
                    ]
                );
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'ticket.index');
                if($response) {
                    return $response;
                }
                -- Ou.. return $this->redirectToRoute('ticket.pdf', ['id' => $id]);
            }
        }
    */
    #[Route('/{id}/pdf', name: 'pdf', methods: ['GET'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('TICKET_VOIR')]
    public function pdf(int $id)
    {
        try {
            $ticket = $this->api->item('/api/tickets/' . $id);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'ticket.index');
            if($response) {
                return $response;
            }
        }

        // Garde d'impression : réservée à la gare créatrice (émettrice = gare de montée).
        // Empêche le contournement par URL directe (miroir du bouton).
        if (!$this->peutAgirSurGare($ticket['gare']['id'] ?? null)) {
            $this->addFlash('error', 'Vous ne pouvez imprimer que les billets émis à votre gare.');
            return $this->redirectToRoute('ticket.show', ['id' => $id]);
        }

        return $this->pdfService->generateThermalAutofit(
            'mails/ticket/thermalpdf.html.twig',
            [
                'ticket' => $this->withQrcode($ticket),
                'entreprise' => $this->getEntreprise(),
            ],
            'ticket-' . ($ticket['codeticket'] ?? $id) . '.pdf',
            1
        );
    }

    #[Route('/batch/print', name: 'batch_print', methods: ['POST'])]
    #[IsGranted('TICKET_VOIR')]
    public function batchPrint(Request $request): Response
    {
        try {
            $ids = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR)['ids'] ?? [];
        } catch (\JsonException) {
            return $this->json(['detail' => 'Requête invalide'], 400);
        }

        if (empty($ids) || count($ids) > 50) {
            return $this->json(['detail' => 'Sélection invalide (1 à 50 tickets)'], 422);
        }

        $tickets = [];
        foreach ($ids as $id) {
            try {
                $tickets[] = $this->withQrcode($this->api->item('/api/tickets/' . (int)$id));
            } catch (ApiException) {
                // On ignore les tickets inaccessibles
            }
        }

        if (empty($tickets)) {
            return $this->json(['detail' => 'Aucun ticket trouvé'], 404);
        }

        return $this->pdfService->generateThermalAutofit(
            'mails/ticket/thermalpdf.html.twig',
            [
                'tickets' => $tickets,
                'entreprise' => $this->getEntreprise(),
            ],
            'tickets-lot-' . date('YmdHis') . '.pdf',
            count($tickets)
        );
    }

    #[Route('/{id}/supprimer', name: 'delete', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('TICKET_SUPPRIMER')]
    public function delete(int $id, Request $request): Response
    {
        if($this->isCsrfTokenValid('delete_ticket', $request->request->get('_token'))) {
            try {
                $this->api->patch('/api/tickets/' . $id . '/remove');
                $this->addFlash('success', 'Le ticket a été supprimé avec succès');
            } catch (ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e, null, 'ticket.index');
                if($response) {
                    return $response;
                }
            }
        }
        return $this->redirectToRoute('ticket.index');
    }
}
