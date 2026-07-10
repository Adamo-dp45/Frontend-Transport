<?php

namespace App\Controller;

use App\Domain\Helper\ApiHelper;
use App\Domain\Helper\StatsExportHelper;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Export des données de statistiques (Excel .xlsx / PDF) sur la période choisie. Réutilise les mêmes
 * endpoints API que les pages de stats, puis met en forme via StatsExportHelper.
 */
#[Route('/stats/export', name: 'stats.export.')]
#[IsGranted('ROLE_ADMIN')]
final class StatsExportController extends AbstractController
{
    public function __construct(
        private readonly ApiHelper $api,
        private readonly StatsExportHelper $exporter
    )
    {
    }

    #[Route('/billetterie', name: 'billetterie', methods: ['GET'])]
    public function billetterie(Request $request): Response
    {
        [$qs, $label] = $this->periode($request);
        $d = $this->fetch('/api/stats/billetterie?' . $qs, 'owner.billetterie');
        if ($d instanceof Response) {
            return $d;
        }

        $sections = [
            ['title' => 'Synthèse', 'columns' => ['Indicateur', 'Valeur'], 'rows' => [
                ['Total billets', (int) ($d['totalTickets'] ?? 0)],
                ['Recette totale (FCFA)', (float) ($d['recetteTotale'] ?? 0)],
            ]],
            ['title' => 'Recettes par jour', 'columns' => ['Date', 'Recette (FCFA)', 'Nb billets'],
                'rows' => array_map(
                    fn ($r) => [$r['label'] ?? '', (float) ($r['montant'] ?? 0), (int) ($r['nbtickets'] ?? 0)],
                    $d['recettesParJour'] ?? []
                )],
            ['title' => 'Recettes par trajet', 'columns' => ['Trajet', 'Recette (FCFA)', 'Nb billets'],
                'rows' => array_map(
                    fn ($r) => [$r['trajet'] ?? '', (float) ($r['montant'] ?? 0), (int) ($r['nbtickets'] ?? 0)],
                    $d['recettesParTrajet'] ?? []
                )],
            ['title' => 'Recettes par car', 'columns' => ['Véhicule', 'Recette (FCFA)', 'Nb billets'],
                'rows' => array_map(
                    fn ($r) => [$r['matricule'] ?? '', (float) ($r['montant'] ?? 0), (int) ($r['nbtickets'] ?? 0)],
                    $d['recettesParCar'] ?? []
                )],
        ];

        // Compléments (aligné sur BilletterieStatsController) : désistements, remises, heures de pointe
        $det = $this->fetchSoft('/api/stats/billetterie/details?' . $qs);
        $des = $det['desistements'] ?? [];
        $sections[] = ['title' => 'Désistements', 'columns' => ['Indicateur', 'Valeur'], 'rows' => [
            ['Billets valides', (int) ($des['valide'] ?? 0)],
            ['Reportés', (int) ($des['reporte'] ?? 0)],
            ['Annulés', (int) ($des['annule'] ?? 0)],
            ['Taux de désistement (%)', (int) ($des['taux'] ?? 0)],
        ]];
        $sections[] = ['title' => 'Remises par bénéficiaire', 'columns' => ['Bénéficiaire', 'Catégorie', 'Total remise (FCFA)', 'Nb billets'],
            'rows' => array_map(fn ($r) => [$r['nom'] ?? '', $r['categorie'] ?? '', (int) ($r['total'] ?? 0), (int) ($r['nb'] ?? 0)], $det['remises']['parBeneficiaire'] ?? [])];
        $sections[] = ['title' => 'Heures de pointe', 'columns' => ['Heure', 'Nb billets'],
            'rows' => array_map(fn ($r) => [($r['heure'] ?? 0) . 'h', (int) ($r['nb'] ?? 0)], $det['heures'] ?? [])];

        return $this->exporter->export(
            $this->format($request),
            'stats-billetterie-' . date('Ymd'),
            'Statistiques — Billetterie',
            $label,
            $sections
        );
    }

    #[Route('/courrier', name: 'courrier', methods: ['GET'])]
    public function courrier(Request $request): Response
    {
        [$qs, $label] = $this->periode($request);
        $d = $this->fetch('/api/stats/courriers?' . $qs, 'owner.stats.courrier');
        if ($d instanceof Response) {
            return $d;
        }

        $sections = [
            ['title' => 'Synthèse', 'columns' => ['Indicateur', 'Valeur'], 'rows' => [
                ['Total courriers', (int) ($d['totalCourriers'] ?? 0)],
                ['En attente', (int) ($d['enAttente'] ?? 0)],
                ['En transit', (int) ($d['enTransit'] ?? 0)],
                ['Réceptionnés', (int) ($d['receptionnes'] ?? 0)],
                ['Livrés', (int) ($d['livres'] ?? 0)],
                ['Perdus', (int) ($d['perdus'] ?? 0)],
                ['Annulés', (int) ($d['annules'] ?? 0)],
                ['Recette totale (FCFA)', (float) ($d['recetteTotale'] ?? 0)],
            ]],
            ['title' => 'Recettes par jour', 'columns' => ['Date', 'Recette (FCFA)', 'Nb courriers'],
                'rows' => array_map(
                    fn ($r) => [$r['label'] ?? '', (float) ($r['montant'] ?? 0), (int) ($r['nbcourriers'] ?? 0)],
                    $d['recettesParJour'] ?? []
                )],
            ['title' => 'Recettes par trajet', 'columns' => ['Trajet', 'Recette (FCFA)', 'Nb courriers'],
                'rows' => array_map(
                    fn ($r) => [$r['trajet'] ?? '', (float) ($r['montant'] ?? 0), (int) ($r['nbcourriers'] ?? 0)],
                    $d['recettesParTrajet'] ?? []
                )],
        ];

        // Compléments (aligné sur CourrierStatsDetailsController) : colis par tranche, délais, pertes
        $det = $this->fetchSoft('/api/stats/courriers/details?' . $qs);
        $sections[] = ['title' => 'Colis par tranche', 'columns' => ['Tranche', 'Nb colis', 'Recette (FCFA)'],
            'rows' => array_map(fn ($r) => [$r['libelle'] ?? '', (int) ($r['nb'] ?? 0), (int) ($r['recette'] ?? 0)], $det['parTranche'] ?? [])];
        $sections[] = ['title' => 'Indicateurs', 'columns' => ['Indicateur', 'Valeur'], 'rows' => [
            ['Délai moyen de livraison (h)', $det['delaiMoyenHeures'] ?? '—'],
            ['Courriers livrés (mesurés)', (int) ($det['nbLivres'] ?? 0)],
            ['Colis perdus', (int) ($det['colisPerdus'] ?? 0)],
            ['Total colis', (int) ($det['colisTotal'] ?? 0)],
            ['Taux de perte colis (%)', $det['tauxPerteColis'] ?? 0],
        ]];

        return $this->exporter->export(
            $this->format($request),
            'stats-courrier-' . date('Ymd'),
            'Statistiques — Courrier',
            $label,
            $sections
        );
    }

    #[Route('/bagage', name: 'bagage', methods: ['GET'])]
    public function bagage(Request $request): Response
    {
        [$qs, $label] = $this->periode($request);
        $d = $this->fetch('/api/stats/bagages?' . $qs, 'owner.stats.bagage');
        if ($d instanceof Response) {
            return $d;
        }

        $sections = [
            ['title' => 'Synthèse', 'columns' => ['Indicateur', 'Valeur'], 'rows' => [
                ['Total bagages', (int) ($d['totalBagages'] ?? 0)],
                ['Enregistrés', (int) ($d['enregistres'] ?? 0)],
                ['Embarqués', (int) ($d['embarques'] ?? 0)],
                ['Livrés', (int) ($d['livres'] ?? 0)],
                ['Perdus', (int) ($d['perdus'] ?? 0)],
                ['Annulés', (int) ($d['annules'] ?? 0)],
                ['Poids total (kg)', (int) ($d['poidsTotal'] ?? 0)],
                ['Recette totale (FCFA)', (float) ($d['recetteTotale'] ?? 0)],
            ]],
            ['title' => 'Recettes par jour', 'columns' => ['Date', 'Recette (FCFA)', 'Nb bagages', 'Poids (kg)'],
                'rows' => array_map(
                    fn ($r) => [$r['label'] ?? '', (float) ($r['montant'] ?? 0), (int) ($r['nbbagages'] ?? 0), (int) ($r['poids'] ?? 0)],
                    $d['recettesParJour'] ?? []
                )],
        ];

        return $this->exporter->export(
            $this->format($request),
            'stats-bagage-' . date('Ymd'),
            'Statistiques — Bagages',
            $label,
            $sections
        );
    }

    #[Route('/agents', name: 'agent', methods: ['GET'])]
    public function agent(Request $request): Response
    {
        [$qs, $label] = $this->periode($request);
        $d = $this->fetch('/api/stats/agent?' . $qs, 'owner.agent');
        if ($d instanceof Response) {
            return $d;
        }

        $sections = [
            ['title' => 'Synthèse', 'columns' => ['Indicateur', 'Valeur'], 'rows' => [
                ['Total agents', (int) ($d['totalAgents'] ?? 0)],
                ['Agents actifs', (int) ($d['agentsActifs'] ?? 0)],
            ]],
            ['title' => 'Recette encaissée par agent', 'columns' => ['Agent', 'Total (FCFA)', 'Billets (FCFA)', 'Courriers (FCFA)', 'Bagages (FCFA)', 'Nb billets'],
                'rows' => array_map(fn ($r) => [
                    trim(($r['prenom'] ?? '') . ' ' . ($r['nom'] ?? '')),
                    (float) ($r['recetteTotale'] ?? 0), (float) ($r['recetteTickets'] ?? 0),
                    (float) ($r['recetteCourriers'] ?? 0), (float) ($r['recetteBagages'] ?? 0),
                    (int) ($r['nbtickets'] ?? 0),
                ], $d['performances'] ?? [])],
        ];

        return $this->exporter->export($this->format($request), 'stats-agents-' . date('Ymd'), 'Statistiques — Agents', $label, $sections);
    }

    #[Route('/clients', name: 'clients', methods: ['GET'])]
    public function clients(Request $request): Response
    {
        [$qs, $label] = $this->periode($request);
        $d = $this->fetch('/api/stats/clients?' . $qs, 'owner.stats.clients');
        if ($d instanceof Response) {
            return $d;
        }

        $mapTop = fn ($c) => [
            $c['nom'] ?? '',
            $c['contact'] ?? '',
            ($c['membre'] ?? false) ? 'Oui' : 'Non',
            (int) ($c['nbBillets'] ?? 0),
            (int) ($c['depense'] ?? 0),
        ];

        $sections = [
            ['title' => 'Synthèse', 'columns' => ['Indicateur', 'Valeur'], 'rows' => [
                ['Total clients', (int) ($d['totalClients'] ?? 0)],
                ['Membres fidélité', (int) ($d['membres'] ?? 0)],
                ['Nouveaux clients (période)', (int) ($d['nouveauxClients'] ?? 0)],
                ['Clients actifs (période)', (int) ($d['clientsActifs'] ?? 0)],
                ['Panier moyen (FCFA)', (int) ($d['panierMoyen'] ?? 0)],
            ]],
            ['title' => 'Clients les plus fidèles (par voyages)', 'columns' => ['Client', 'Téléphone', 'Membre', 'Voyages', 'Dépense (FCFA)'],
                'rows' => array_map($mapTop, $d['topParBillets'] ?? [])],
            ['title' => 'Plus gros acheteurs (par dépense)', 'columns' => ['Client', 'Téléphone', 'Membre', 'Voyages', 'Dépense (FCFA)'],
                'rows' => array_map($mapTop, $d['topParDepense'] ?? [])],
        ];

        return $this->exporter->export($this->format($request), 'stats-clients-' . date('Ymd'), 'Statistiques — Clients', $label, $sections);
    }

    #[Route('/fidelite', name: 'fidelite', methods: ['GET'])]
    public function fidelite(Request $request): Response
    {
        [$qs, $label] = $this->periode($request);
        $d = $this->fetch('/api/stats/fidelite?' . $qs, 'owner.stats.fidelite');
        if ($d instanceof Response) {
            return $d;
        }

        $sections = [
            ['title' => 'Synthèse', 'columns' => ['Indicateur', 'Valeur'], 'rows' => [
                ['Total clients', (int) ($d['totalClients'] ?? 0)],
                ['Membres', (int) ($d['totalMembres'] ?? 0)],
                ['Taux d\'adhésion (%)', $d['tauxAdhesion'] ?? 0],
                ['Adhésions (période)', (int) ($d['adhesionsPeriode'] ?? 0)],
                ['Récompenses utilisées (période)', (int) ($d['recompensesUtilisees'] ?? 0)],
                ['Valeur offerte (FCFA)', (int) ($d['valeurRecompenses'] ?? 0)],
                ['Récompenses à réclamer', (int) ($d['recompensesDisponibles'] ?? 0)],
                ['Seuil (voyages)', (int) ($d['seuil'] ?? 0)],
                ['Récompense (%)', (int) ($d['recompensePourcentage'] ?? 0)],
                ['Programme actif', ($d['programmeActif'] ?? false) ? 'Oui' : 'Non'],
            ]],
            ['title' => 'Top clients fidèles', 'columns' => ['Client', 'Téléphone', 'Voyages cumulés', 'Récompenses utilisées', 'Carte en cours', 'Récompense dispo'],
                'rows' => array_map(fn ($m) => [
                    $m['nom'] ?? '',
                    $m['contact'] ?? '',
                    (int) ($m['voyages'] ?? 0),
                    (int) ($m['recompensesUtilisees'] ?? 0),
                    (int) ($m['progression'] ?? 0) . ' / ' . (int) ($d['seuil'] ?? 0),
                    ($m['recompenseDisponible'] ?? false) ? 'Oui' : 'Non',
                ], $d['topMembres'] ?? [])],
        ];

        return $this->exporter->export($this->format($request), 'stats-fidelite-' . date('Ymd'), 'Statistiques — Fidélité', $label, $sections);
    }

    #[Route('/personnel', name: 'personnel', methods: ['GET'])]
    public function personnel(Request $request): Response
    {
        [$qs, $label] = $this->periode($request);
        $d = $this->fetch('/api/stats/personnel?' . $qs, 'owner.personnels');
        if ($d instanceof Response) {
            return $d;
        }

        $sections = [
            ['title' => 'Synthèse', 'columns' => ['Indicateur', 'Valeur'], 'rows' => [
                ['Total personnels', (int) ($d['totalPersonnels'] ?? 0)],
                ['Personnels actifs', (int) ($d['personnelsActifs'] ?? 0)],
            ]],
            ['title' => 'Affectations', 'columns' => ['Personnel', 'Voyages', 'Dépannages', 'Actif'],
                'rows' => array_map(fn ($r) => [
                    $r['nom'] ?? '',
                    (int) ($r['nbvoyages'] ?? 0), (int) ($r['nbdepannages'] ?? 0),
                    ($r['actif'] ?? false) ? 'Oui' : 'Non',
                ], $d['performances'] ?? [])],
        ];

        return $this->exporter->export($this->format($request), 'stats-personnel-' . date('Ymd'), 'Statistiques — Personnel', $label, $sections);
    }

    #[Route('/trajets', name: 'trajet', methods: ['GET'])]
    public function trajet(Request $request): Response
    {
        [$qs, $label] = $this->periode($request);
        $d = $this->fetch('/api/stats/ligne/performance?' . $qs, 'owner.trajets');
        if ($d instanceof Response) {
            return $d;
        }

        $sections = [
            ['title' => 'Synthèse', 'columns' => ['Indicateur', 'Valeur'], 'rows' => [
                ['Total lignes', (int) ($d['totalLignes'] ?? 0)],
            ]],
            ['title' => 'Performance par ligne', 'columns' => ['Ligne', 'Recette totale (FCFA)', 'Billets + résa (FCFA)', 'Nb billets+résa', 'Courriers (FCFA)', 'Nb courriers', 'Bagages (FCFA)', 'Nb bagages', 'Nb voyages'],
                'rows' => array_map(fn ($r) => [
                    $r['libelle'] ?? '',
                    (float) ($r['recette'] ?? 0),
                    (float) ($r['recetteBillets'] ?? 0), (int) ($r['nbtickets'] ?? 0),
                    (float) ($r['recetteCourriers'] ?? 0), (int) ($r['nbcourriers'] ?? 0),
                    (float) ($r['recetteBagages'] ?? 0), (int) ($r['nbbagages'] ?? 0),
                    (int) ($r['nbvoyages'] ?? 0),
                ], $d['performances'] ?? [])],
        ];

        return $this->exporter->export($this->format($request), 'stats-trajets-' . date('Ymd'), 'Statistiques — Trajets', $label, $sections);
    }

    #[Route('/flotte', name: 'flotte', methods: ['GET'])]
    public function flotte(Request $request): Response
    {
        [$qs, $label] = $this->periode($request);
        $d = $this->fetch('/api/stats/flotte/activite?' . $qs, 'owner.flotte');
        if ($d instanceof Response) {
            return $d;
        }

        $sections = [
            ['title' => 'Synthèse', 'columns' => ['Indicateur', 'Valeur'], 'rows' => [
                ['Total véhicules', (int) ($d['totalVehicules'] ?? 0)],
                ['Véhicules en voyage', (int) ($d['vehiculesEnVoyage'] ?? 0)],
            ]],
            ['title' => 'Activité par véhicule', 'columns' => ['Véhicule', 'Voyages', 'Dépannages'],
                'rows' => array_map(fn ($r) => [
                    $r['matricule'] ?? '',
                    (int) ($r['nbvoyages'] ?? 0), (int) ($r['nbdepannages'] ?? 0),
                ], $d['activiteParVehicule'] ?? [])],
        ];

        // Compléments (aligné sur FlotteStatsDetailsController) : disponibilité, pannes par type
        $det = $this->fetchSoft('/api/stats/flotte/details?' . $qs);
        $sections[] = ['title' => 'Disponibilité (actuel)', 'columns' => ['État', 'Nb véhicules'],
            'rows' => array_map(fn ($r) => [$r['etat'] ?? '', (int) ($r['nb'] ?? 0)], $det['disponibilite']['parEtat'] ?? [])];
        $sections[] = ['title' => 'Pannes par type', 'columns' => ['Type de panne', 'Nb', 'Coût (FCFA)'],
            'rows' => array_map(fn ($r) => [$r['type'] ?? '', (int) ($r['nb'] ?? 0), (int) ($r['cout'] ?? 0)], $det['pannes']['parType'] ?? [])];

        return $this->exporter->export($this->format($request), 'stats-flotte-' . date('Ymd'), 'Statistiques — Flotte', $label, $sections);
    }

    #[Route('/stock', name: 'stock', methods: ['GET'])]
    public function stock(Request $request): Response
    {
        [$qs, $label] = $this->periode($request);
        $d = $this->fetch('/api/stats/stock?' . $qs, 'owner.stats.stock');
        if ($d instanceof Response) {
            return $d;
        }

        $sections = [
            ['title' => 'Synthèse', 'columns' => ['Indicateur', 'Valeur'], 'rows' => [
                ['Total pièces', (int) ($d['totalPieces'] ?? 0)],
                ['Pièces critiques', (int) ($d['piecesCritiques'] ?? 0)],
            ]],
            ['title' => 'Stock par pièce', 'columns' => ['Pièce', 'Stock actuel', 'Seuil', 'Critique'],
                'rows' => array_map(fn ($r) => [
                    $r['libelle'] ?? '',
                    (int) ($r['stockactuel'] ?? 0), (int) ($r['seuilstock'] ?? 0),
                    ($r['critique'] ?? false) ? 'Oui' : 'Non',
                ], $d['stockParPiece'] ?? [])],
        ];

        // Compléments (aligné sur StockStatsDetailsController) : valeur, consommation, achats fournisseur
        $det = $this->fetchSoft('/api/stats/stock/details?' . $qs);
        $vs = $det['valeurStock'] ?? [];
        $conso = $det['consommation'] ?? [];
        $sections[] = ['title' => 'Valeur & consommation', 'columns' => ['Indicateur', 'Valeur'], 'rows' => [
            ['Valeur du stock (FCFA)', (int) ($vs['valeur'] ?? 0)],
            ['Unités en stock', (int) ($vs['unites'] ?? 0)],
            ['Quantité consommée', (int) ($conso['quantiteTotale'] ?? 0)],
            ['Coût consommé (FCFA)', (int) ($conso['coutTotal'] ?? 0)],
            ['Rotation (%)', $conso['rotation'] ?? 0],
        ]];
        $sections[] = ['title' => 'Top pièces consommées', 'columns' => ['Pièce', 'Quantité', 'Coût (FCFA)'],
            'rows' => array_map(fn ($r) => [$r['libelle'] ?? '', (int) ($r['quantite'] ?? 0), (int) ($r['cout'] ?? 0)], $conso['topPieces'] ?? [])];
        $sections[] = ['title' => 'Achats par fournisseur', 'columns' => ['Fournisseur', 'Nb appros', 'Montant (FCFA)'],
            'rows' => array_map(fn ($r) => [$r['libelle'] ?? '', (int) ($r['nbAppros'] ?? 0), (int) ($r['montant'] ?? 0)], $det['achatsParFournisseur'] ?? [])];

        return $this->exporter->export($this->format($request), 'stats-stock-' . date('Ymd'), 'Statistiques — Stock', $label, $sections);
    }

    #[Route('/gares', name: 'gares', methods: ['GET'])]
    public function gares(Request $request): Response
    {
        [$qs, $label] = $this->periode($request);

        $stats = $this->fetch('/api/stats/gares?' . $qs, 'owner.stats.gares');
        if ($stats instanceof Response) {
            return $stats;
        }
        $trafic = $this->fetch('/api/stats/gares/trafic?' . $qs, 'owner.stats.gares');
        if ($trafic instanceof Response) {
            return $trafic;
        }
        $exploit = $this->fetch('/api/stats/gares/exploitation?' . $qs, 'owner.stats.gares');
        if ($exploit instanceof Response) {
            return $exploit;
        }

        $sections = [
            ['title' => 'Recette par gare', 'columns' => ['Gare', 'Billets', 'Courriers', 'Bagages', 'Total (FCFA)', 'Opérations', 'Panier moyen', 'Agents', 'Annulés', 'Reportés'],
                'rows' => array_map(fn ($g) => [
                    $g['libelle'] ?? '',
                    (int) ($g['recetteBillets'] ?? 0), (int) ($g['recetteCourriers'] ?? 0), (int) ($g['recetteBagages'] ?? 0),
                    (int) ($g['recetteTotale'] ?? 0), (int) ($g['nbOperations'] ?? 0), (int) ($g['panierMoyen'] ?? 0),
                    (int) ($g['nbAgents'] ?? 0), (int) ($g['ticketsAnnules'] ?? 0), (int) ($g['ticketsReportes'] ?? 0),
                ], $stats['parGare'] ?? [])],
            ['title' => 'Trafic par gare', 'columns' => ['Gare', 'Montées', 'Descentes', 'Trafic total'],
                'rows' => array_map(fn ($g) => [
                    $g['libelle'] ?? '', (int) ($g['montees'] ?? 0), (int) ($g['descentes'] ?? 0), (int) ($g['trafic'] ?? 0),
                ], $trafic['parGare'] ?? [])],
            ['title' => 'Top tronçons', 'columns' => ['De', 'Vers', 'Billets', 'Recette (FCFA)'],
                'rows' => array_map(fn ($t) => [
                    $t['de'] ?? '', $t['vers'] ?? '', (int) ($t['nb'] ?? 0), (int) ($t['recette'] ?? 0),
                ], $trafic['topTroncons'] ?? [])],
            ['title' => 'Exploitation par gare', 'columns' => ['Gare', 'Voyages', 'Capacité', 'Places vendues', 'Places restantes', 'Taux (%)', 'Recette (FCFA)'],
                'rows' => array_map(fn ($g) => [
                    $g['libelle'] ?? '', (int) ($g['nbVoyages'] ?? 0), (int) ($g['capacite'] ?? 0),
                    (int) ($g['placesVendues'] ?? 0), (int) ($g['placesRestantes'] ?? 0), (int) ($g['taux'] ?? 0), (int) ($g['recette'] ?? 0),
                ], $exploit['parGare'] ?? [])],
            ['title' => 'Recette par commercial', 'columns' => ['Commercial', 'Billets', 'Recette (FCFA)'],
                'rows' => array_map(fn ($c) => [
                    $c['nom'] ?? '', (int) ($c['nbtickets'] ?? 0), (int) ($c['recetteBillets'] ?? 0),
                ], $stats['commerciaux'] ?? [])],
        ];

        return $this->exporter->export($this->format($request), 'stats-gares-' . date('Ymd'), 'Statistiques — Gares', $label, $sections);
    }

    /**
     * Récupère les données de stats ; en cas d'erreur API, redirige vers la page concernée.
     *
     * @return array|Response
     */
    private function fetch(string $endpoint, string $fallbackRoute)
    {
        try {
            return $this->api->item($endpoint);
        } catch (ApiException $e) {
            $this->addFlash('error', 'Export impossible : ' . $e->getMessage());
            return $this->redirectToRoute($fallbackRoute);
        }
    }

    /** Récupère un complément de stats (endpoint /details) sans bloquer l'export en cas d'échec. */
    private function fetchSoft(string $endpoint): array
    {
        try {
            return $this->api->item($endpoint);
        } catch (ApiException) {
            return [];
        }
    }

    /** @return array{0:string,1:string} [querystring, libellé période] */
    private function periode(Request $request): array
    {
        $debut = $request->query->get('debut', date('Y-m-01'));
        $fin = $request->query->get('fin', date('Y-m-t'));

        return [
            http_build_query(['debut' => $debut, 'fin' => $fin]),
            'du ' . $debut . ' au ' . $fin,
        ];
    }

    private function format(Request $request): string
    {
        return $request->query->get('format') === 'pdf' ? 'pdf' : 'xlsx';
    }
}
