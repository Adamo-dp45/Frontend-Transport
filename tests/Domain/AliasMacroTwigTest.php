<?php

namespace App\Tests\Domain;

use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\TestDox;
use PHPUnit\Framework\TestCase;

/**
 * NE JAMAIS RÉUTILISER UN ALIAS DE MACRO COMME VARIABLE DE GABARIT.
 *
 * `{% import _self as t %}` fait de `t` l'objet qui porte les macros du fichier. Si une variable
 * locale prend le même nom — une boucle `{% for t in … %}`, un `{% set t = … %}`, ou le paramètre
 * d'une fonction fléchée `|filter(t => t.statut)` —, l'ALIAS GAGNE : Twig lit `t.statut` comme un
 * appel de macro et lève « Macro "statut" is not defined ».
 *
 * CE DÉFAUT NE SE VOIT QU'AU RENDU. `lint:twig` compile sans exécuter, il passe au vert. Il est
 * arrivé DEUX FOIS jusqu'à l'utilisateur : d'abord dans `home/_gare.html.twig` (`{% for t in … %}`),
 * puis dans `voyage/show.html.twig` (`|filter(t => …)`) — la seconde fois alors que la leçon de la
 * première était écrite noir sur blanc. D'où ce test, qui ne dépend de la mémoire de personne : il
 * balaie TOUS les gabarits à chaque exécution de la suite.
 *
 * Il complète, sans remplacer, `FicheVoyageRenduTest` : celui-ci rend une page et attrape tout, mais
 * une page à la fois ; celui-là n'attrape qu'une faute, mais sur les 283 gabarits.
 */
final class AliasMacroTwigTest extends TestCase
{
    private const RACINE = __DIR__ . '/../../templates';

    #[Test]
    #[TestDox('Aucun gabarit ne réutilise un alias de macro comme variable')]
    public function aucuneCollisionDAlias(): void
    {
        $collisions = [];

        foreach ($this->gabarits() as $chemin) {
            $relatif = str_replace('\\', '/', substr($chemin, strlen(self::RACINE) + 1));
            $lignes = explode("\n", $this->sansCommentaires((string) file_get_contents($chemin)));

            foreach ($this->aliasDeMacro($lignes) as $alias => $ligneAlias) {
                foreach ($this->reutilisations($lignes, $alias, $ligneAlias) as $ligne => $forme) {
                    $collisions[] = sprintf(
                        '%s:%d — l\'alias « %s » (déclaré ligne %d) est réutilisé en %s',
                        $relatif,
                        $ligne,
                        $alias,
                        $ligneAlias,
                        $forme
                    );
                }
            }
        }

        self::assertSame(
            [],
            $collisions,
            "Un alias de macro est écrasé par une variable. Twig lèvera « Macro \"…\" is not defined »\n"
            . "AU RENDU (lint:twig ne le voit pas). Renommez la variable :\n  - "
            . implode("\n  - ", $collisions)
        );
    }

    /** @return list<string> */
    private function gabarits(): array
    {
        $trouves = [];
        $iterateur = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator(self::RACINE, \FilesystemIterator::SKIP_DOTS)
        );
        foreach ($iterateur as $fichier) {
            if ($fichier->isFile() && str_ends_with($fichier->getFilename(), '.twig')) {
                $trouves[] = $fichier->getPathname();
            }
        }
        sort($trouves);

        return $trouves;
    }

    /**
     * Les commentaires `{# … #}` sont BLANCHIS et non supprimés : on remplace leur contenu par des
     * espaces pour que les numéros de ligne restent ceux du fichier. Sans cela, ce test se signalait
     * lui-même sur le commentaire qui explique le piège — un faux positif particulièrement ironique.
     */
    private function sansCommentaires(string $source): string
    {
        return (string) preg_replace_callback(
            '/{#.*?#}/s',
            static fn (array $m): string => preg_replace('/[^\n]/', ' ', $m[0]),
            $source
        );
    }

    /**
     * @param list<string> $lignes
     * @return array<string, int> alias => ligne de déclaration
     */
    private function aliasDeMacro(array $lignes): array
    {
        $alias = [];
        foreach ($lignes as $i => $ligne) {
            // {% import 'x.twig' as ui %} / {% import _self as t %}
            if (preg_match('/{%-?\s*import\s+.*?\s+as\s+(\w+)/', $ligne, $m)) {
                $alias[$m[1]] ??= $i + 1;
            }
            // {% from 'x.twig' import a, b as c %} — les noms importés sont aussi des macros
            if (preg_match('/{%-?\s*from\s+.*?\s+import\s+([^%]+?)-?%}/', $ligne, $m)) {
                foreach (explode(',', $m[1]) as $morceau) {
                    $nom = preg_match('/(\w+)\s+as\s+(\w+)/', trim($morceau), $mm)
                        ? $mm[2]
                        : trim($morceau);
                    if (preg_match('/^\w+$/', $nom)) {
                        $alias[$nom] ??= $i + 1;
                    }
                }
            }
        }

        return $alias;
    }

    /**
     * @param list<string> $lignes
     * @return array<int, string> ligne => forme de la réutilisation
     */
    private function reutilisations(array $lignes, string $alias, int $ligneAlias): array
    {
        $a = preg_quote($alias, '/');
        $formes = [
            '/{%-?\s*for\s+' . $a . '\b/' => 'boucle {% for %}',
            '/{%-?\s*for\s+\w+\s*,\s*' . $a . '\b/' => 'boucle {% for clé, valeur %}',
            '/[|(]\s*(?:filter|map|reduce|sort|find|every|some)\s*\(\s*' . $a . '\s*=>/' => 'fonction fléchée',
            '/\(\s*\w+\s*,\s*' . $a . '\s*\)\s*=>/' => 'fonction fléchée (2e paramètre)',
            '/{%-?\s*set\s+' . $a . '\s*=/' => '{% set %}',
        ];

        $trouvees = [];
        foreach ($lignes as $i => $ligne) {
            if ($i + 1 <= $ligneAlias) {
                continue; // avant la déclaration de l'alias, aucune collision possible
            }
            foreach ($formes as $motif => $forme) {
                if (preg_match($motif, $ligne)) {
                    $trouvees[$i + 1] = $forme;
                }
            }
        }

        return $trouvees;
    }
}
