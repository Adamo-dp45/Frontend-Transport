<?php

namespace App\Controller;

use App\Domain\Helper\ApiExceptionHandlerHelper;
use App\Domain\Helper\ApiHelper;
use App\Domain\Helper\TableHelper;
use App\Domain\Service\PdfService;
use App\Entity\ApiUser;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * LA CAISSE d'un agent : ouvrir le matin avec son fonds, compter le soir, signer l'écart.
 *
 * !! LE COMPTAGE EST AVEUGLE, et c'est la règle centrale de cet écran : le théorique n'est JAMAIS
 * affiché avant la saisie. À qui le connaît, il suffit de le recopier pour n'avoir jamais d'écart —
 * et le contrôle ne mesure alors plus rien. L'agent saisit ce qu'il a dans le tiroir, le serveur
 * lui répond l'écart. Ne pas « améliorer » cet écran en y ajoutant un rappel du montant attendu.
 *
 * Le périmètre est tenu par l'API ('CaisseScopeExtension' : un agent ne voit que SES caisses, un
 * chef de gare celles de sa gare). Ici on ne fait que refléter ce que le serveur sert.
 */
#[Route('/caisse', name: 'caisse.')]
#[IsGranted('ROLE_USER')]
final class CaisseController extends AbstractController
{
    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler,
        private readonly PdfService $pdfService
    )
    {
    }

    /**
     * « Ma caisse » : l'état du jour, et l'historique de ses propres sessions.
     *
     * Volontairement SÉPARÉ de la liste générale : un guichetier ouvre cet écran pour faire un
     * geste — ouvrir, ou clôturer —, pas pour consulter un tableau. Le chef de gare, lui, vient
     * pour lire, et c'est l'autre page.
     */
    #[Route('', name: 'index', methods: ['GET'])]
    #[IsGranted('SESSIONCAISSE_VOIR')]
    public function index(): Response
    {
        /**
         * @var ApiUser
         */
        $user = $this->getUser();
        $userId = $user->getId();

        try {
            $ouverte = $this->api->collection('/api/sessioncaisses', [
                'statut' => 'OUVERTE',
                'agent.id' => $userId,
            ]);
            $miennes = $this->api->collection('/api/sessioncaisses', [
                'agent.id' => $userId,
                'itemsPerPage' => 10,
                'order' => ['datedebut' => 'desc'],
            ]);
        } catch (ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if ($response) {
                return $response;
            }
            $ouverte = $miennes = [];
        }

        // 'ApiHelper::collection()' rend déjà la LISTE — le 'member' d'Hydra est déballé là-bas.
        return $this->render('caisse/index.html.twig', [
            'caisse' => $ouverte[0] ?? null,
            'sessions' => $miennes,
        ]);
    }

    #[Route('/ouvrir', name: 'ouvrir', methods: ['POST'])]
    #[IsGranted('SESSIONCAISSE_CREER')]
    public function ouvrir(Request $request): Response
    {
        if (!$this->isCsrfTokenValid('caisse_ouvrir', (string) $request->request->get('_token'))) {
            $this->addFlash('error', 'Jeton de sécurité invalide.');

            return $this->redirectToRoute('caisse.index');
        }

        try {
            /*
                Le fonds est le SEUL champ : l'agent et la gare se déduisent de l'acteur côté API.
                Les laisser saisir ouvrirait le tiroir d'un collègue.
            */
            $this->api->post('/api/sessioncaisses', [
                'fondsouverture' => (int) $request->request->get('fondsouverture', 0),
            ]);
            $this->addFlash('success', 'Votre caisse est ouverte.');
        } catch (ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if ($response) {
                return $response;
            }
            $this->addFlash('error', $e->getMessage());
        }

        return $this->redirectToRoute('caisse.index');
    }

    #[Route('/{id}/cloturer', name: 'cloturer', methods: ['POST'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('SESSIONCAISSE_CLOTURER')]
    public function cloturer(int $id, Request $request): Response
    {
        if (!$this->isCsrfTokenValid('caisse_cloturer', (string) $request->request->get('_token'))) {
            $this->addFlash('error', 'Jeton de sécurité invalide.');

            return $this->redirectToRoute('caisse.index');
        }

        try {
            /*
                Seul le TOTAL part au serveur. Le détail des coupures reste dans le navigateur : il
                aide l'agent à compter, il n'a aucune valeur comptable — et le stocker donnerait à
                relire un décompte de billets que personne ne pourra jamais vérifier.
            */
            $this->api->patch('/api/sessioncaisses/' . $id . '/cloturer', [
                'montantcompte' => (int) $request->request->get('montantcompte', 0),
                'motifecart' => trim((string) $request->request->get('motifecart', '')) ?: null,
            ]);
            $this->addFlash('success', 'Caisse clôturée.');

            return $this->redirectToRoute('caisse.show', ['id' => $id]);
        } catch (ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e, null, 'caisse.index');
            if ($response) {
                return $response;
            }
            $this->addFlash('error', $e->getMessage());
        }

        return $this->redirectToRoute('caisse.index');
    }

    /**
     * La liste des caisses visibles — l'écran du chef de gare.
     *
     * Le filtre qui compte est celui sur l'ÉCART : c'est la seule colonne qu'on vient chercher, et
     * la trier par défaut ne suffirait pas (un écart de +200 n'intéresse personne, un manquant de
     * 40 000 si).
     */
    #[Route('/sessions', name: 'sessions', methods: ['GET'])]
    #[IsGranted('SESSIONCAISSE_VOIR')]
    public function sessions(Request $request, TableHelper $tableHelper): Response
    {
        try {
            $data = $tableHelper->handleIndex('/api/sessioncaisses', $request->query->all(),
                [
                    'statut' => 'statut',
                    'agent' => 'agent.id',
                    'gare' => 'gare.id',
                    'date_from' => 'datedebut[after]',
                    'date_to' => 'datedebut[before]',
                ],
                [
                    'id',
                    'datedebut',
                    'datefin',
                    'ecart',
                ]
            );
        } catch (ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if ($response) {
                return $response;
            }
            $data = ['items' => []];
        }

        /*
            L'URL de la fiche est construite ICI et non dans le composant : le front React ne
            connaît pas le routage Symfony, et la lui faire deviner par concaténation ferait casser
            la colonne « Détail » au premier changement de route.
        */
        $data['items'] = array_map(function (array $caisse): array {
            $caisse['url'] = $this->generateUrl('caisse.show', ['id' => $caisse['id']]);

            return $caisse;
        }, $data['items'] ?? []);

        return $this->render('caisse/sessions.html.twig', array_merge($data, [
            'statuts' => ['OUVERTE' => 'Ouverte', 'CLOTUREE' => 'Clôturée'],
        ]));
    }

    /**
     * LE RÉCAPITULATIF A4 d'une gare sur une période — le document du chef de gare.
     *
     * Complémentaire du ticket, pas redondant : le ticket prouve UNE clôture et se signe à deux,
     * ce tableau met les caisses d'une période CÔTE À CÔTE, ce qui est la seule façon de voir
     * qu'un agent est toujours à -2 000 quand les autres tombent juste.
     *
     * Seules les caisses CLÔTURÉES y figurent : une caisse ouverte n'a pas de totaux, et l'y
     * inscrire avec des tirets ferait croire à une journée sans recette.
     */
    #[Route('/recapitulatif', name: 'recapitulatif', methods: ['GET'])]
    #[IsGranted('SESSIONCAISSE_VOIR')]
    public function recapitulatif(Request $request): Response
    {
        $debut = new \DateTimeImmutable($request->query->get('date_from') ?: 'first day of this month 00:00');
        $fin = new \DateTimeImmutable($request->query->get('date_to') ?: 'today 23:59:59');

        $query = [
            'statut' => 'CLOTUREE',
            'datedebut[after]' => $debut->format('Y-m-d H:i:s'),
            'datedebut[before]' => $fin->format('Y-m-d H:i:s'),
            'itemsPerPage' => 200,
            'order' => ['datedebut' => 'asc'],
        ];
        if ($request->query->get('gare')) {
            $query['gare.id'] = $request->query->get('gare');
        }

        $entreprise = [];

        try {
            $caisses = $this->api->collection('/api/sessioncaisses', $query);
            $entreprise = $this->api->item('/api/me/entreprise') ?? [];
        } catch (ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if ($response) {
                return $response;
            }
            $caisses = [];
        }

        $totaux = ['fonds' => 0, 'encaisse' => 0, 'rembourse' => 0, 'theorique' => 0, 'compte' => 0, 'ecart' => 0];

        foreach ($caisses as $i => $caisse) {
            /*
                « Encaissé » = les SEPT postes d'entrée, sans le fonds d'ouverture : c'est ce que
                l'agent a reçu des clients. Additionner le fonds ici gonflerait la recette d'une
                avance de monnaie qui n'est pas une vente — et le récapitulatif d'une gare servirait
                alors à deux lectures contradictoires.
            */
            $encaisse = (int) ($caisse['totalbillets'] ?? 0)
                + (int) ($caisse['totalbagages'] ?? 0)
                + (int) ($caisse['totalcourriers'] ?? 0)
                + (int) ($caisse['totalfraissuivi'] ?? 0)
                + (int) ($caisse['totalreservations'] ?? 0)
                + (int) ($caisse['totalpenalites'] ?? 0)
                + (int) ($caisse['totalcomplements'] ?? 0);

            $caisses[$i]['encaisse'] = $encaisse;

            $totaux['fonds'] += (int) ($caisse['fondsouverture'] ?? 0);
            $totaux['encaisse'] += $encaisse;
            $totaux['rembourse'] += (int) ($caisse['totalremboursements'] ?? 0);
            $totaux['theorique'] += (int) ($caisse['montanttheorique'] ?? 0);
            $totaux['compte'] += (int) ($caisse['montantcompte'] ?? 0);
            $totaux['ecart'] += (int) ($caisse['ecart'] ?? 0);
        }

        return $this->pdfService->download(
            'caisse/recapitulatif.html.twig',
            [
                'caisses' => $caisses,
                'totaux' => $totaux,
                'entreprise' => $entreprise,
                'gareLibelle' => $caisses[0]['gare']['libelle'] ?? null,
                'debut' => $debut,
                'fin' => $fin,
            ],
            'caisses-' . $debut->format('Y-m-d') . '-' . $fin->format('Y-m-d') . '.pdf'
        );
    }

    /**
     * Le TICKET DE CLÔTURE, sur la bobine thermique du guichet.
     *
     * L'écran s'imprime déjà en A4, mais ce n'est pas le même imprimé : celui-ci sort de la même
     * imprimante que les billets, au format 80 mm, et c'est LUI que le chef de gare agrafe à son
     * bordereau du soir. Un agent n'a pas d'imprimante bureautique à son guichet.
     *
     * RÉSERVÉ AUX CAISSES CLÔTURÉES : imprimer une caisse ouverte donnerait un papier signé sur des
     * totaux qui bougent encore — et surtout révélerait l'attendu à qui doit compter à l'aveugle.
     */
    #[Route('/{id}/ticket', name: 'ticket', methods: ['GET'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('SESSIONCAISSE_VOIR')]
    public function ticket(int $id): Response
    {
        $entreprise = [];

        try {
            $caisse = $this->api->item('/api/sessioncaisses/' . $id);
            $entreprise = $this->api->item('/api/me/entreprise') ?? [];
        } catch (ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if ($response) {
                return $response;
            }
            $caisse = null;
        }

        if ($caisse === null) {
            throw $this->createNotFoundException('Caisse introuvable');
        }

        if (($caisse['statut'] ?? null) !== 'CLOTUREE') {
            $this->addFlash('error', "Cette caisse n'est pas encore clôturée : il n'y a rien à signer.");

            return $this->redirectToRoute('caisse.show', ['id' => $id]);
        }

        return $this->pdfService->generateThermalAutofit(
            'caisse/thermal.html.twig',
            ['caisse' => $caisse, 'entreprise' => $entreprise],
            'caisse-' . $id . '.pdf',
            1,
            PdfService::TICKET_LARGEUR_PT
            /*
                PAS de hauteur fixe, contrairement au billet : un ticket de caisse se coupe à la fin
                du papier, il n'a pas à s'aligner sur un point de coupe constant. Et sa longueur
                varie avec le motif d'écart, qui est du texte libre.
            */
        );
    }

    #[Route('/{id}', name: 'show', methods: ['GET'], requirements: ['id' => Requirement::DIGITS])]
    #[IsGranted('SESSIONCAISSE_VOIR')]
    public function show(int $id): Response
    {
        try {
            $caisse = $this->api->item('/api/sessioncaisses/' . $id);
        } catch (ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if ($response) {
                return $response;
            }
            $caisse = null;
        }

        if ($caisse === null) {
            throw $this->createNotFoundException('Caisse introuvable');
        }

        return $this->render('caisse/show.html.twig', ['caisse' => $caisse]);
    }
}
