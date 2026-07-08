<?php

namespace App\Domain\Service;

use Dompdf\Dompdf;
use Dompdf\Options;
use Symfony\Component\HttpFoundation\Response;
use Twig\Environment;

class PdfService
{
    public function __construct(
        private readonly Environment $twig
    )
    {
    }

    public function generate(
        string $template,
        array $data, string $filename = 'ticket.pdf',
        string $format = 'thermal'
    )
    {
        $html = $this->twig->render($template, $data);

        $options = new Options();
        $options
            ->set('defaultFont', 'DejaVu Sans')
            ->set('isRemoteEnabled', false)
            ->set('isHtml5ParserEnabled', true)
        ;
        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html);
        $paper = match($format) {
            'A4' => 'A4',
            'A4-land' => [0, 0, 841.89, 595.28],
            default => [0, 0, 226.77, 453.54], /*
                - Le format thermique '80mm x 160mm', '160mm' vu que 'dompdf' ne supporte pas 'auto' en hauteur
            */
        };
        $dompdf->setPaper($paper, 'portrait');
        $dompdf->render();
        $pdfContent = $dompdf->output();

        return new Response($pdfContent, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . $filename . '"',
            'Content-Length' => strlen($pdfContent)
        ]);
    }

    /**
     * Permet de forçer le téléchargement du pdf
     */
    public function download(string $template, array $data, string $filename = 'rapport.pdf'): Response
    {
        $response = $this->generate($template, $data, $filename);
        $response->headers->set('Content-Disposition', 'attachment; filename="' . $filename . '"');
        return $response;
    }

    /**
     * Génère un PDF thermique (largeur fixe) dont la HAUTEUR de page est ajustée
     * au contenu réel — Dompdf ne supportant pas la hauteur "auto", on la calcule.
     *
     * Évite les pages blanches et le grand vide en bas d'un billet : la page fait
     * exactement la hauteur du billet. Le template doit mettre UN billet par page
     * (page-break-after entre les billets) ; $expectedPages = nombre de billets.
     *
     * On cherche par dichotomie la plus petite hauteur de page qui tient tout le
     * contenu sur exactement $expectedPages pages.
     */
    public function generateThermalAutofit(
        string $template,
        array $data,
        string $filename = 'ticket.pdf',
        int $expectedPages = 1,
        float $widthPt = 226.77
    ): Response
    {
        $html = $this->twig->render($template, $data);
        $expectedPages = max(1, $expectedPages);

        // Gros lots : l'auto-fit (plusieurs rendus) coûterait cher → hauteur fixe sûre
        if ($expectedPages > 20) {
            return $this->renderAt($html, $widthPt, 500.0, $filename); // ~176 mm
        }

        $pageCount = fn(float $heightPt): int => $this->renderDompdf($html, $widthPt, $heightPt)
            ->getCanvas()->get_page_count();

        // Bornes de recherche (~90 mm à ~230 mm de haut)
        $lo = 255.0;
        $hi = 652.0;
        if ($pageCount($hi) > $expectedPages) {
            $hi = 1400.0; // contenu exceptionnellement long
            if ($pageCount($hi) > $expectedPages) {
                return $this->renderAt($html, $widthPt, 453.54, $filename); // repli thermique standard
            }
        }

        // Dichotomie : plus petite hauteur tenant en $expectedPages pages
        for ($i = 0; $i < 7; $i++) {
            $mid = ($lo + $hi) / 2;
            if ($pageCount($mid) <= $expectedPages) {
                $hi = $mid;
            } else {
                $lo = $mid;
            }
        }

        return $this->renderAt($html, $widthPt, $hi + 6.0, $filename); // +6 pt de marge de sécurité
    }

    private function renderDompdf(string $html, float $widthPt, float $heightPt): Dompdf
    {
        $options = new Options();
        $options
            ->set('defaultFont', 'DejaVu Sans')
            ->set('isRemoteEnabled', false)
            ->set('isHtml5ParserEnabled', true)
        ;
        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper([0, 0, $widthPt, $heightPt], 'portrait');
        $dompdf->render();

        return $dompdf;
    }

    private function renderAt(string $html, float $widthPt, float $heightPt, string $filename): Response
    {
        $pdfContent = $this->renderDompdf($html, $widthPt, $heightPt)->output();

        return new Response($pdfContent, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . $filename . '"',
            'Content-Length' => strlen($pdfContent)
        ]);
    }
}