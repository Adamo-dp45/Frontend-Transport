<?php

namespace App\Controller;

use App\Domain\Helper\ApiExceptionHandlerHelper;
use App\Domain\Helper\ApiHelper;
use App\Entity\ApiUser;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[IsGranted('ROLE_USER')]
final class HomeController extends AbstractController
{
    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler
    )
    {
    }

    #[Route('/', name: 'home', methods: ['GET'])]
    public function index(Request $request): Response
    {
        if($this->isGranted('ROLE_SUPER_ADMIN')) {
            return $this->redirectToRoute('admin.user.index');
        }

        // Seul l'admin d'entreprise voit le tableau de bord global.
        // - Agent / admin de gare (rattaché à une gare) → « Ma gare ».
        // - Utilisateur central sans gare → sa page d'accueil personnelle (raccourcis par permissions).
        if(!$this->isGranted('ROLE_ADMIN')) {
            /** @var ApiUser $user */
            $user = $this->getUser();
            $gare = $user->getGare();
            if($gare && !empty($gare['id'])) {
                return $this->redirectToRoute('gare.me');
            }
            return $this->redirectToRoute('accueil');
        }

        ['debut' => $debut, 'fin' => $fin, 'periode' => $periode] = $this->getPeriode($request);

        try {
            $exploitation = $this->api->item('/api/stats/exploitation?' . $periode);
            $financiere = $this->api->item('/api/stats/financiere?' . $periode);
            $stock = $this->api->item('/api/stats/stock?' . $periode);
            $flotte = $this->api->item('/api/stats/flotte?' . $periode);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        $exploitation = [
            'totalVoyages' => $exploitation['totalVoyages'] ?? 0,
            'tauxRemplissage'  => [
                'moyenneGlobale' => $exploitation['tauxRemplissage']['moyenneGlobale'] ?? 0,
                'detailParVoyage' => $exploitation['tauxRemplissage']['detailParVoyage'] ?? []
            ],
            'voyagesParPeriode' => $exploitation['voyagesParPeriode'] ?? [],
            'voyagesParStatut'  => $exploitation['voyagesParStatut'] ?? []
        ];

        $financiere = [
            'recettesTotales' => $financiere['recettesTotales'] ?? 0,
            'recettesTickets' => $financiere['recettesTickets'] ?? 0,
            'recettesCourriers' => $financiere['recettesCourriers'] ?? 0,
            'recettesBagages' => $financiere['recettesBagages'] ?? 0,
            'coutDepannages' => $financiere['coutDepannages'] ?? 0,
            'coutApprovisionnements' => $financiere['coutApprovisionnements'] ?? 0,
            'beneficeNet' => $financiere['beneficeNet'] ?? 0,
            'recettesParJour' => $financiere['recettesParJour'] ?? [],
            'coutsParJour' => $financiere['coutsParJour'] ?? []
        ];

        $stock = [
            'totalPieces' => $stock['totalPieces'] ?? 0,
            'piecesCritiques' => $stock['piecesCritiques'] ?? 0,
            'stockParPiece' => $stock['stockParPiece'] ?? [],
            'mouvementsRecents'=> $stock['mouvementsRecents'] ?? []
        ];

        $flotte = [
            'totalVehicules' => $flotte['totalVehicules'] ?? 0,
            'vehiculesParEtat' => $flotte['vehiculesParEtat'] ?? [],
            'vehiculesParDepannage' => $flotte['vehiculesParDepannage'] ?? [],
            'coutMaintenanceParVehicule'=> $flotte['coutMaintenanceParVehicule'] ?? []
        ];

        return $this->render('home/index.html.twig', [
            'exploitation' => $exploitation,
            'financiere' => $financiere,
            'stock' => $stock,
            'flotte' => $flotte,
            'debut' => $debut,
            'fin' => $fin
        ]);
    }

    #[Route('/proprietaire', name: 'owner', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function owner(): Response
    {
        return $this->render('home/owner.html.twig');
    }

    #[Route('/billetterie', name: 'owner.billetterie', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function billetterie(Request $request): Response
    {
        ['debut' => $debut, 'fin' => $fin, 'periode' => $periode] = $this->getPeriode($request);

        $details = ['desistements' => [], 'remises' => [], 'matriceOD' => ['gares' => [], 'cells' => []], 'heures' => []];
        try {
            $billetterie = $this->api->item('/api/stats/billetterie?' . $periode);
            $details = $this->api->item('/api/stats/billetterie/details?' . $periode);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        $billetterie = [
            'totalTickets' => $billetterie['totalTickets'] ?? 0,
            'recetteTotale' => $billetterie['recetteTotale'] ?? 0,
            'recettesParJour' => $billetterie['recettesParJour'] ?? [],
            'recettesParTrajet' => $billetterie['recettesParTrajet'] ?? [],
            'recettesParCar' => $billetterie['recettesParCar'] ?? []
        ];

        return $this->render('home/billetterie.html.twig', [
            'billetterie' => $billetterie,
            'details' => $details,
            'debut' => $debut,
            'fin' => $fin
        ]);
    }

    #[Route('/stats/commercial', name: 'owner.stats.commercial', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function commercial(Request $request): Response
    {
        ['debut' => $debut, 'fin' => $fin, 'periode' => $periode] = $this->getPeriode($request);

        $commercial = [];
        try {
            $commercial = $this->api->item('/api/stats/commercial?' . $periode);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        return $this->render('home/commercial.html.twig', [
            'commercial' => $commercial,
            'debut' => $debut,
            'fin' => $fin
        ]);
    }

    #[Route('/stats/departs', name: 'owner.stats.departs', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function departs(Request $request): Response
    {
        ['debut' => $debut, 'fin' => $fin, 'periode' => $periode] = $this->getPeriode($request);

        $departs = [];
        try {
            $departs = $this->api->item('/api/stats/gares/departs?' . $periode);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        return $this->render('home/departs.html.twig', [
            'departs' => $departs,
            'debut' => $debut,
            'fin' => $fin
        ]);
    }

    #[Route('/stats/reservations', name: 'owner.stats.reservations', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function reservations(Request $request): Response
    {
        ['debut' => $debut, 'fin' => $fin, 'periode' => $periode] = $this->getPeriode($request);

        $reservations = [];
        try {
            $reservations = $this->api->item('/api/stats/reservations?' . $periode);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        return $this->render('home/reservations.html.twig', [
            'reservations' => $reservations,
            'debut' => $debut,
            'fin' => $fin
        ]);
    }

    #[Route('/stats/clients', name: 'owner.stats.clients', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function clients(Request $request): Response
    {
        ['debut' => $debut, 'fin' => $fin, 'periode' => $periode] = $this->getPeriode($request);

        $clients = [];
        try {
            $clients = $this->api->item('/api/stats/clients?' . $periode);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        return $this->render('home/clients.html.twig', [
            'clients' => $clients,
            'debut' => $debut,
            'fin' => $fin
        ]);
    }

    #[Route('/stats/fidelite', name: 'owner.stats.fidelite', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function fidelite(Request $request): Response
    {
        ['debut' => $debut, 'fin' => $fin, 'periode' => $periode] = $this->getPeriode($request);

        $fidelite = [];
        try {
            $fidelite = $this->api->item('/api/stats/fidelite?' . $periode);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        return $this->render('home/fidelite.html.twig', [
            'fidelite' => $fidelite,
            'debut' => $debut,
            'fin' => $fin
        ]);
    }

    #[Route('/agents', name: 'owner.agent', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function agent(Request $request): Response
    {
        ['debut' => $debut, 'fin' => $fin, 'periode' => $periode] = $this->getPeriode($request);

        try {
            $agents = $this->api->item('/api/stats/agent?' . $periode);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        $agents = [
            'totalAgents' => $agents['totalAgents'] ?? 0,
            'agentsActifs' => $agents['agentsActifs'] ?? 0,
            'performances' => $agents['performances'] ?? []
        ];

        return $this->render('home/agent.html.twig', [
            'agents' => $agents,
            'debut' => $debut,
            'fin' => $fin
        ]);
    }

    #[Route('/personnels', name: 'owner.personnels', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function personnels(Request $request): Response
    {
        $debut = $request->query->get('debut', date('Y-m-01'));
        $fin = $request->query->get('fin', date('Y-m-t'));
        $periode = http_build_query([
            'debut' => $debut,
            'fin' => $fin
        ]);

        try {
            $personnel = $this->api->item('/api/stats/personnel?' . $periode);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        $personnel = [
            'totalPersonnels' => $personnel['totalPersonnels'] ?? 0,
            'personnelsActifs' => $personnel['personnelsActifs'] ?? 0,
            'performances' => $personnel['performances'] ?? []
        ];

        return $this->render('home/personnel.html.twig', [
            'personnel' => $personnel,
            'debut' => $debut,
            'fin' => $fin
        ]);
    }

    #[Route('/flotte', name: 'owner.flotte', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function flotte(Request $request): Response
    {
        ['debut' => $debut, 'fin' => $fin, 'periode' => $periode] = $this->getPeriode($request);

        $details = ['disponibilite' => ['parEtat' => [], 'tauxDispo' => 0, 'total' => 0, 'disponibles' => 0], 'pannes' => ['parType' => [], 'nb' => 0, 'coutMoyen' => 0, 'typeFrequent' => null]];
        try {
            $flotte = $this->api->item('/api/stats/flotte/activite?' . $periode);
            $details = $this->api->item('/api/stats/flotte/details?' . $periode);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        $flotte = [
            'totalVehicules' => $flotte['totalVehicules'] ?? 0,
            'vehiculesEnVoyage' => $flotte['vehiculesEnVoyage'] ?? 0,
            'activiteParVehicule' => $flotte['activiteParVehicule'] ?? []
        ];

        return $this->render('home/flotte.html.twig', [
            'flotteActivite' => $flotte,
            'details' => $details,
            'debut' => $debut,
            'fin' => $fin
        ]);
    }

    #[Route('/stats/stock', name: 'owner.stats.stock', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function statsStock(Request $request): Response
    {
        ['debut' => $debut, 'fin' => $fin, 'periode' => $periode] = $this->getPeriode($request);

        $stock = ['totalPieces' => 0, 'piecesCritiques' => 0, 'stockParPiece' => []];
        $details = ['valeurStock' => ['valeur' => 0, 'unites' => 0, 'nbPieces' => 0], 'consommation' => ['topPieces' => [], 'quantiteTotale' => 0, 'coutTotal' => 0, 'rotation' => 0], 'achatsParFournisseur' => []];
        try {
            $stock = $this->api->item('/api/stats/stock?' . $periode);
            $details = $this->api->item('/api/stats/stock/details?' . $periode);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        return $this->render('home/stock.html.twig', [
            'stock' => $stock,
            'details' => $details,
            'debut' => $debut,
            'fin' => $fin,
        ]);
    }

    #[Route('/trajets', name: 'owner.trajets', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function trajet(Request $request): Response
    {
        ['debut' => $debut, 'fin' => $fin, 'periode' => $periode] = $this->getPeriode($request);

        try {
            $ligne = $this->api->item('/api/stats/ligne/performance?' . $periode);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        $lignes = [
            'totalLignes' => $ligne['totalLignes'] ?? 0,
            'performances' => $ligne['performances'] ?? []
        ];

        return $this->render('home/trajet.html.twig', [
            'lignes' => $lignes,
            'debut' => $debut,
            'fin' => $fin
        ]);
    }

    #[Route('/caisse', name: 'owner.caisse', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function caisse(Request $request): Response
    {
        ['debut' => $debut, 'fin' => $fin, 'periode' => $periode] = $this->getPeriode($request);

        try {
            $caisse = $this->api->item('/api/stats/caisse?' . $periode);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        $caisse = [
            'totalTickets' => $caisse['totalTickets'] ?? 0,
            'recetteTickets' => $caisse['recetteTickets'] ?? 0,
            'totalCourriers' => $caisse['totalCourriers'] ?? 0,
            'recetteCourriers' => $caisse['recetteCourriers'] ?? 0,
            'totalBagages' => $caisse['totalBagages'] ?? 0,
            'recetteBagages' => $caisse['recetteBagages'] ?? 0,
            'recetteTotale' => $caisse['recetteTotale'] ?? 0,
            'parAgent' => $caisse['parAgent'] ?? [],
            'parJour' => $caisse['parJour'] ?? [],
            'parGare' => $caisse['parGare'] ?? []
        ];

        return $this->render('home/caisse.html.twig', [
            'caisse' => $caisse,
            'debut' => $debut,
            'fin' => $fin
        ]);
    }

    #[Route('/stats/gares', name: 'owner.stats.gares', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function statsGares(Request $request): Response
    {
        ['debut' => $debut, 'fin' => $fin, 'periode' => $periode] = $this->getPeriode($request);

        $stats = ['parGare' => [], 'joursAxis' => []];
        $trafic = ['parGare' => [], 'topTroncons' => []];
        $exploitation = ['parGare' => []];
        $colis = ['courriersParGare' => [], 'bagagesParGare' => []];
        $pilotage = ['parGare' => [], 'periodePrecedente' => []];
        try {
            $stats = $this->api->item('/api/stats/gares?' . $periode);
            $trafic = $this->api->item('/api/stats/gares/trafic?' . $periode);
            $exploitation = $this->api->item('/api/stats/gares/exploitation?' . $periode);
            $colis = $this->api->item('/api/stats/gares/colis?' . $periode);
            $pilotage = $this->api->item('/api/stats/gares/pilotage?' . $periode);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        return $this->render('home/gares.html.twig', [
            'stats' => $stats,
            'trafic' => $trafic,
            'exploitation' => $exploitation,
            'colis' => $colis,
            'pilotage' => $pilotage,
            'debut' => $debut,
            'fin' => $fin,
        ]);
    }

    #[Route('/stats/courrier', name: 'owner.stats.courrier', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function courrier(Request $request): Response
    {
        ['debut' => $debut, 'fin' => $fin, 'periode' => $periode] = $this->getPeriode($request);

        $details = ['parTranche' => [], 'delaiMoyenHeures' => null, 'nbLivres' => 0, 'colisPerdus' => 0, 'colisTotal' => 0, 'tauxPerteColis' => 0];
        try {
            $courrier = $this->api->item('/api/stats/courriers?' . $periode);
            $details = $this->api->item('/api/stats/courriers/details?' . $periode);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        $courrier = [
            'totalCourriers' => $courrier['totalCourriers'] ?? 0,
            'enAttente' => $courrier['enAttente'] ?? 0,
            'enTransit' => $courrier['enTransit'] ?? 0,
            'receptionnes' => $courrier['receptionnes'] ?? 0,
            'livres' => $courrier['livres'] ?? 0,
            'perdus' => $courrier['perdus'] ?? 0,
            'annules' => $courrier['annules'] ?? 0,
            'recetteTotale' => $courrier['recetteTotale'] ?? 0,
            'recettesParJour' => $courrier['recettesParJour'] ?? [],
            'recettesParTrajet' => $courrier['recettesParTrajet'] ?? []
        ];

        return $this->render('home/courrier.html.twig', [
            'courrier' => $courrier,
            'details' => $details,
            'debut' => $debut,
            'fin' => $fin
        ]);
    }

    #[Route('/stats/bagage', name: 'owner.stats.bagage', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function bagage(Request $request): Response
    {
        ['debut' => $debut, 'fin' => $fin, 'periode' => $periode] = $this->getPeriode($request);

        try {
            $bagage = $this->api->item('/api/stats/bagages?' . $periode);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        $bagage = [
            'totalBagages' => $bagage['totalBagages'] ?? 0,
            'enregistres' => $bagage['enregistres'] ?? 0,
            'embarques' => $bagage['embarques'] ?? 0,
            'livres' => $bagage['livres'] ?? 0,
            'perdus' => $bagage['perdus'] ?? 0,
            'annules' => $bagage['annules'] ?? 0,
            'recetteTotale' => $bagage['recetteTotale'] ?? 0,
            'poidsTotal' => $bagage['poidsTotal'] ?? 0,
            'recettesParJour' => $bagage['recettesParJour'] ?? []
        ];

        return $this->render('home/bagage.html.twig', [
            'bagage' => $bagage,
            'debut' => $debut,
            'fin' => $fin
        ]);
    }

    /**
     * Page d'accueil personnelle pour les utilisateurs centraux (sans gare, non-admin) :
     * raccourcis vers les modules selon leurs permissions. Les admins voient le dashboard global,
     * les agents de gare « Ma gare » — mais la page reste accessible directement à tout ROLE_USER.
     */
    #[Route('/accueil', name: 'accueil', methods: ['GET'])]
    public function accueil(): Response
    {
        return $this->render('home/accueil.html.twig');
    }

    /**
     * Flux d'activité global (« qui a fait quoi » dans l'application) — espace propriétaire.
     */
    #[Route('/activite', name: 'owner.activite', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function activite(Request $request): Response
    {
        $page = max(1, $request->query->getInt('page', 1));
        $data = [];
        try {
            $data = $this->api->get('/api/activites', ['page' => $page, 'order[createdAt]' => 'desc']);
        } catch (ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if ($response) {
                return $response;
            }
        }

        $activites = $data['member'] ?? $data['hydra:member'] ?? [];
        $total = (int) ($data['totalItems'] ?? $data['hydra:totalItems'] ?? 0);
        $perPage = 30;

        return $this->render('home/activite.html.twig', [
            'activites' => $activites,
            'page' => $page,
            'totalPages' => (int) ceil($total / max(1, $perPage)),
            'total' => $total,
        ]);
    }

    #[Route('/aide', name: 'aide', methods: ['GET'])]
    public function aide(): Response
    {
        return $this->render('home/aide.html.twig', []);
    }

    #[Route('/ui', name: 'ui', methods: ['GET'])]
    public function ui(): Response
    {
        return $this->render('home/ui.html.twig', []);
    }

    private function getPeriode(Request $request): array
    {
        $debut = $request->query->get('debut', date('Y-m-01')); // '01' pour le premier jour du mois
        $fin = $request->query->get('fin', date('Y-m-t'));

        return [
            'debut' => $debut,
            'fin' => $fin,
            'periode' => http_build_query([
                'debut' => $debut,
                'fin' => $fin
            ])
        ];
    }
}
