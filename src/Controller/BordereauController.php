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
    public function __construct(
        private readonly ApiHelper $api,
        private readonly ApiExceptionHandlerHelper $apiExceptionHandler,
        private readonly PdfService $pdfService
    )
    {
    }

    #[Route('', name: 'index', methods: ['GET'])]
    // #[IsGranted('VOYAGE_VOIR')]
    public function bordereau(Request $request): Response
    {
        $ligneId = $request->query->get('ligne');
        $gareId = $request->query->get('gare');
        $debut = $request->query->get('debut', date('Y-m-01'));
        $fin = $request->query->get('fin', date('Y-m-t'));

        // Un agent rattaché à une gare imprime toujours le bordereau de SA gare → on la force.
        // (Les lignes sont déjà bornées à sa gare côté API via GareScopeExtension.)
        $userGare = $this->getUser()->getGare();
        $userGareId = $userGare['id'] ?? null;
        $userGareLibelle = $userGare['libelle'] ?? null;
        if ($userGareId) {
            $gareId = (string) $userGareId;
        }

        try {
            // Plus de chargement de TOUTES les lignes : le select ligne est un autocomplete distant (tom-select → /search)
            $gares = $this->api->collection('/api/gares');
        } catch(ApiException $e) {
            $response = $this->apiExceptionHandler->handle($e);
            if($response) {
                return $response;
            }
        }

        $voyages = [];
        $selectedLigneLabel = null;
        if($ligneId) {
            try {
                // Libellé de la ligne filtrée (préselection du tom-select), sans charger toutes les lignes
                $l = $this->api->item('/api/lignes/' . $ligneId);
                $selectedLigneLabel = ($l['libelle'] ?? (($l['gareorigine']['libelle'] ?? '?') . ' → ' . ($l['gareterminus']['libelle'] ?? '?')))
                    . ' (' . ($l['codeligne'] ?? '') . ')';

                // Filtre générique sur /api/voyages (ligne.id + plage de dates)
                $voyages = $this->api->collection('/api/voyages', [
                    'ligne.id' => $ligneId,
                    'datedepartprevue[after]' => $debut,
                    'datedepartprevue[before]' => $fin,
                    'itemsPerPage' => 100,
                ]);
            } catch(ApiException $e) {
                $response = $this->apiExceptionHandler->handle($e);
                if($response) {
                    return $response;
                }
            }
        }

        return $this->render('bordereau/index.html.twig', [
            'selectedLigneLabel' => $selectedLigneLabel,
            'gares' => $gares,
            'voyages' => $voyages,
            'ligneId'  => $ligneId,
            'gareId' => $gareId,
            'debut' => $debut,
            'fin' => $fin,
            'userGareId' => $userGareId,
            'userGareLibelle' => $userGareLibelle
        ]);
    }

    #[Route('/{voyageId}/bordereau/{gareId}', name: 'print', methods: ['GET'], requirements: ['voyageId' => '\d+', 'gareId' => '\d+'])]
    // #[IsGranted('VOYAGE_VOIR')]
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
