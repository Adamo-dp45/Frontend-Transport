<?php

namespace App\Domain\Service;

use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\Writer\PngWriter;

class QrCodeService
{
    /**
     * Génère un QR code PNG encodé en data-URI base64 (directement intégrable
     * dans une balise <img src="..."> y compris sous Dompdf où le chargement
     * d'images distantes est désactivé).
     *
     * @param string $data    Le contenu encodé (ex: une URL de vérification)
     * @param int    $size    Taille du PNG généré en pixels (haute résolution, mise à l'échelle via CSS)
     * @param int    $margin  Marge blanche (quiet zone) autour du QR
     */
    public function dataUri(string $data, int $size = 220, int $margin = 4): string
    {
        $result = (new Builder(
            writer: new PngWriter(),
            data: $data,
            encoding: new Encoding('UTF-8'),
            // Niveau M : ~15% de correction d'erreur, bon compromis lisibilité/densité
            errorCorrectionLevel: ErrorCorrectionLevel::Medium,
            size: $size,
            margin: $margin,
        ))->build();

        return $result->getDataUri();
    }
}
