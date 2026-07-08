<?php

namespace App\Domain\Helper;

use App\Domain\Service\PdfService;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\HeaderUtils;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Génère un export de statistiques (Excel .xlsx ou PDF) à partir d'une structure de « sections » :
 *
 *   [
 *     ['title' => 'Synthèse', 'columns' => ['Indicateur', 'Valeur'], 'rows' => [['Total', 42], ...]],
 *     ['title' => 'Recettes par jour', 'columns' => [...], 'rows' => [[...], ...]],
 *   ]
 *
 * - xlsx : une feuille par section (en-tête en gras, colonnes auto-dimensionnées).
 * - pdf  : un rapport A4 (template mails/stats/export.html.twig).
 */
class StatsExportHelper
{
    public function __construct(
        private readonly PdfService $pdfService
    )
    {
    }

    /**
     * @param array<array{title:string, columns?:array, rows:array}> $sections
     */
    public function export(string $format, string $filename, string $titre, string $periodeLabel, array $sections): Response
    {
        return $format === 'pdf'
            ? $this->pdf($filename, $titre, $periodeLabel, $sections)
            : $this->xlsx($filename, $sections);
    }

    private function xlsx(string $filename, array $sections): Response
    {
        $spreadsheet = new Spreadsheet();
        $used = [];
        $first = true;

        foreach ($sections as $i => $section) {
            $sheet = $first ? $spreadsheet->getActiveSheet() : $spreadsheet->createSheet();
            $first = false;
            $sheet->setTitle($this->sheetName($section['title'] ?? ('Feuille ' . ($i + 1)), $used));

            $columns = $section['columns'] ?? [];
            $rows = array_values($section['rows'] ?? []);
            $matrix = $columns ? array_merge([$columns], $rows) : $rows;

            if ($matrix) {
                $sheet->fromArray($matrix, null, 'A1', true);
                if ($columns) {
                    $last = Coordinate::stringFromColumnIndex(count($columns));
                    $sheet->getStyle('A1:' . $last . '1')->getFont()->setBold(true);
                    for ($c = 1; $c <= count($columns); $c++) {
                        $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($c))->setAutoSize(true);
                    }
                }
            }
        }

        $spreadsheet->setActiveSheetIndex(0);

        $writer = new Xlsx($spreadsheet);
        $response = new StreamedResponse(static function () use ($writer) {
            $writer->save('php://output');
        });
        $response->headers->set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        $response->headers->set('Content-Disposition', HeaderUtils::makeDisposition(
            HeaderUtils::DISPOSITION_ATTACHMENT,
            $filename . '.xlsx'
        ));
        // Pas de cache : les chiffres dépendent de la période
        $response->headers->set('Cache-Control', 'max-age=0, must-revalidate, private');

        return $response;
    }

    private function pdf(string $filename, string $titre, string $periodeLabel, array $sections): Response
    {
        $response = $this->pdfService->generate(
            'mails/stats/export.html.twig',
            ['titre' => $titre, 'periode' => $periodeLabel, 'sections' => $sections],
            $filename . '.pdf',
            'A4'
        );
        // Téléchargement plutôt qu'affichage inline
        $response->headers->set('Content-Disposition', HeaderUtils::makeDisposition(
            HeaderUtils::DISPOSITION_ATTACHMENT,
            $filename . '.pdf'
        ));

        return $response;
    }

    /** Nom de feuille Excel valide : ≤ 31 caractères, sans caractère interdit, unique. */
    private function sheetName(string $title, array &$used): string
    {
        $name = str_replace(['\\', '/', '?', '*', '[', ']', ':'], ' ', $title);
        $name = trim(mb_substr($name, 0, 28));
        if ($name === '') {
            $name = 'Feuille';
        }

        $base = $name;
        $n = 2;
        while (in_array(mb_strtolower($name), $used, true)) {
            $name = mb_substr($base, 0, 25) . ' ' . $n;
            $n++;
        }
        $used[] = mb_strtolower($name);

        return $name;
    }
}
