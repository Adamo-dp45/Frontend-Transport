<?php

namespace App\Controller;

use App\Domain\Helper\ApiExceptionHandlerHelper;
use App\Domain\Helper\ApiHelper;
use App\Domain\Service\PdfService;
use App\Security\Exception\ApiException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/bordereau', name: 'bordereau.')]
#[IsGranted('ROLE_USER')]
final class BordereauController extends AbstractController
{
    /**
     * Au-delà de ce nombre de départs, on n'appelle plus le bordereau de chaque voyage : la liste
     * reste affichée (sans les montants), consultables un par un en dépliant. Le bilan de caisse se
     * fait sur une journée — une plage large est une exploration, pas un bilan, et ne justifie pas
     * une requête par voyage.
     */
    private const MAX_BORDEREAUX_CHARGES = 30;

    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler,
        private readonly PdfService $pdfService
    )
    {
    }

    /**
     * Bordereaux de gare : les départs d'UNE gare sur une journée, avec leur recette.
     *
     * La page s'ouvre DÉJÀ REMPLIE sur « ma gare, aujourd'hui ». Elle exigeait auparavant de choisir
     * une LIGNE avant d'afficher quoi que ce soit, sur le mois en cours et sans aucun montant : or le
     * bordereau de gare est le bilan de caisse d'un chef de gare en fin de journée, il n'a aucune
     * raison de commencer par une ligne. La ligne devient un filtre facultatif.
     */
    #[Route('', name: 'index', methods: ['GET'])]
    public function bordereau(Request $request): Response
    {
        $userGare = $this->getUser()->getGare();
        $userGareId = $userGare['id'] ?? null;
        $userGareLibelle = $userGare['libelle'] ?? null;

        // Un agent rattaché à une gare fait TOUJOURS le bordereau de SA gare : on la force.
        // (Les voyages sont de toute façon bornés à sa gare côté API par 'GareScopeExtension'.)
        $gareId = $userGareId ? (string) $userGareId : $request->query->get('gare');
        $ligneId = $request->query->get('ligne');

        // Par défaut la JOURNÉE en cours : c'est la maille du bilan de caisse.
        $debut = $request->query->get('debut') ?: date('Y-m-d');
        $fin = $request->query->get('fin') ?: $debut;
        if ($fin < $debut) {
            $fin = $debut;
        }

        $gares = [];
        $voyages = [];
        $selectedLigneLabel = null;

        try {
            // Le sélecteur de gare ne sert qu'aux profils SANS gare (admin, central).
            if (!$userGareId) {
                $gares = $this->api->collection('/api/gares');
            }

            if ($ligneId) {
                // Libellé de la ligne filtrée (préselection du tom-select), sans charger toutes les lignes.
                $l = $this->api->item('/api/lignes/' . $ligneId);
                $selectedLigneLabel = ($l['libelle'] ?? (($l['gareorigine']['libelle'] ?? '?') . ' → ' . ($l['gareterminus']['libelle'] ?? '?')))
                    . ' (' . ($l['codeligne'] ?? '') . ')';
            }

            $filtres = [
                // Bornes INCLUSIVES sur la journée : 'before' sur une date nue exclurait les départs
                // de l'après-midi, la comparaison se faisant sur minuit.
                'datedepartprevue[after]' => $debut . ' 00:00:00',
                'datedepartprevue[before]' => $fin . ' 23:59:59',
                'order[datedepartprevue]' => 'asc',
                'itemsPerPage' => 100,
            ];
            if ($ligneId) {
                $filtres['ligne.id'] = $ligneId;
            }
            $voyages = $this->api->collection('/api/voyages', $filtres);
        } catch (ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if ($response) {
                return $response;
            }
        }

        $voyages = $this->desservantLaGare($voyages, $gareId);
        [$voyages, $totaux, $bordereauxCharges] = $this->attacherBordereaux($voyages, $gareId);

        return $this->render('bordereau/index.html.twig', [
            'voyages' => $voyages,
            'totaux' => $totaux,
            'bordereauxCharges' => $bordereauxCharges,
            'gares' => $gares,
            'gareId' => $gareId,
            'ligneId' => $ligneId,
            'selectedLigneLabel' => $selectedLigneLabel,
            'debut' => $debut,
            'fin' => $fin,
            'estAujourdhui' => $debut === date('Y-m-d') && $fin === date('Y-m-d'),
            'userGareId' => $userGareId,
            'userGareLibelle' => $userGareLibelle,
        ]);
    }

    /**
     * Ne garde que les voyages dont le car PASSE RÉELLEMENT par cette gare.
     *
     * L'API borne déjà les voyages aux lignes qui desservent la gare de l'agent, mais une LIGNE qui
     * dessert Adjamé ne veut pas dire que CE départ y passe : sur un DÉPART PARTIEL lancé depuis
     * Bouaké, le car ne voit jamais Adjamé. Le bordereau d'Adjamé pour ce voyage vaudrait
     * nécessairement zéro — trois lignes à zéro dans une caisse, c'est du bruit qui fait douter du
     * chiffre. On s'appuie sur 'routeeffectiveids', que l'API expose précisément pour ça (provenance
     * effective → terminus).
     *
     * @return list<array<string, mixed>>
     */
    private function desservantLaGare(array $voyages, ?string $gareId): array
    {
        if ($gareId === null) {
            return $voyages;
        }

        return array_values(array_filter($voyages, static function (array $voyage) use ($gareId): bool {
            $route = $voyage['routeeffectiveids'] ?? null;

            // Route absente (ligne incomplète) : on n'invente rien, on laisse le voyage visible.
            return $route === null || in_array((int) $gareId, array_map('intval', $route), true);
        }));
    }

    /**
     * Attache à chaque voyage son bordereau POUR CETTE GARE, et cumule les totaux de la période.
     *
     * Un appel par voyage : il n'existe pas d'endpoint qui résume les bordereaux d'un lot, et la
     * recette d'une gare sur un voyage n'est pas dérivable de ce que renvoie '/api/voyages'. Sur la
     * vue par défaut (une journée, une gare) cela reste une poignée d'appels ; au-delà de
     * MAX_BORDEREAUX_CHARGES on s'abstient plutôt que de faire ramer la page.
     *
     * Un bordereau qui échoue n'interrompt rien : le voyage reste listé, sans montant. Perdre toute
     * la page parce qu'un seul voyage pose problème serait pire que l'afficher incomplète.
     *
     * @return array{0: list<array<string, mixed>>, 1: array<string, int>, 2: bool}
     */
    private function attacherBordereaux(array $voyages, ?string $gareId): array
    {
        $totaux = ['recette' => 0, 'billets' => 0, 'bagages' => 0, 'courriers' => 0];
        $charges = $gareId !== null && $voyages !== [] && count($voyages) <= self::MAX_BORDEREAUX_CHARGES;

        if (!$charges) {
            return [$voyages, $totaux, false];
        }

        foreach ($voyages as $i => $voyage) {
            try {
                $bordereau = $this->api->item(sprintf('/api/voyages/%d/bordereau', $voyage['id']), ['gare' => $gareId]);
            } catch (ApiException) {
                continue; // voyage sans bordereau pour cette gare (elle n'est pas sur sa ligne)
            }

            $voyages[$i]['bordereau'] = $bordereau;
            $totaux['recette'] += (int) ($bordereau['recette'] ?? 0);
            $totaux['billets'] += (int) ($bordereau['nbtickets'] ?? 0);
            $totaux['bagages'] += (int) ($bordereau['nbbagages'] ?? 0);
            $totaux['courriers'] += (int) ($bordereau['nbcourriers'] ?? 0);
        }

        return [$voyages, $totaux, true];
    }

    #[Route('/{voyageId}/bordereau/{gareId}', name: 'print', methods: ['GET'], requirements: ['voyageId' => '\d+', 'gareId' => '\d+'])]
    public function gare(int $voyageId, int $gareId): Response
    {
        try {
            $bordereau = $this->api->item('/api/voyages/' . $voyageId . '/bordereau?gare=' . $gareId);
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        return $this->pdfService->generate(
            'mails/bordereau/bordereau.html.twig',
            [
                'bordereau' => $bordereau
            ],
            'bordereau-' . $bordereau['voyage']['codevoyage'] . '.pdf',
            'A4'
        );
    }

    #[Route('/{voyageId}/bordereau/chauffeur', name: 'chauffeur', methods: ['GET'], requirements: ['voyageId' => '\d+'])]
    #[IsGranted('VOYAGE_VOIR')]
    public function chauffeur(int $voyageId): Response
    {
        try {
            $bordereau = $this->api->item('/api/voyages/' . $voyageId . '/bordereau/chauffeur');
        } catch (ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if ($response) return $response;
        }

        return $this->pdfService->generate(
            'mails/bordereau/bordereau_chauffeur.html.twig',
            [
                'bordereau' => $bordereau
            ],
            'bordereau-chauffeur-' . $bordereau['voyage']['codevoyage'] . '.pdf',
            'A4'
        );
    }
}
