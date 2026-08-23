<?php

namespace App\Tests\Domain;

use App\Domain\Builder\TableQueryBuilder;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\TestDox;
use PHPUnit\Framework\TestCase;

/**
 * La traduction des paramètres d'URL du front en paramètres de requête API Platform.
 *
 * Ce constructeur est la porte d'entrée de TOUS les listings : ce que l'utilisateur tape dans
 * l'URL y transite avant de partir vers l'API. Deux points sont donc vérifiés de près — les
 * LISTES BLANCHES (un champ de tri ou un filtre non déclaré ne doit jamais être transmis, sinon
 * l'API renvoie une erreur sur un paramètre inconnu, ou pire, expose un tri sur un champ non prévu)
 * et la pagination, dont une valeur aberrante ferait réclamer des milliers de lignes.
 */
final class TableQueryBuilderTest extends TestCase
{
    private TableQueryBuilder $builder;

    protected function setUp(): void
    {
        $this->builder = new TableQueryBuilder();
    }

    #[Test]
    #[TestDox('Sans paramètre, on obtient la première page à la taille par défaut')]
    public function valeursParDefaut(): void
    {
        $params = $this->builder->buildParams([], [], []);

        self::assertSame(1, $params['page']);
        self::assertSame(25, $params['itemsPerPage']);
    }

    #[Test]
    #[TestDox("Une taille de page hors des valeurs proposées retombe sur le défaut")]
    public function taillePageHorsListe(): void
    {
        // Sans ce garde-fou, « ?perPage=100000 » ferait charger toute la table.
        foreach ([0, -5, 7, 100000] as $valeur) {
            $params = $this->builder->buildParams(['perPage' => $valeur], [], []);
            self::assertSame(25, $params['itemsPerPage'], sprintf('perPage=%s doit être ignoré', $valeur));
        }

        foreach ([10, 20, 50, 100] as $valeur) {
            $params = $this->builder->buildParams(['perPage' => $valeur], [], []);
            self::assertSame($valeur, $params['itemsPerPage']);
        }
    }

    #[Test]
    #[TestDox('Un numéro de page négatif ou nul est ramené à la première page')]
    public function pageNegative(): void
    {
        self::assertSame(1, $this->builder->buildParams(['page' => -3], [], [])['page']);
        self::assertSame(1, $this->builder->buildParams(['page' => 0], [], [])['page']);
        self::assertSame(4, $this->builder->buildParams(['page' => 4], [], [])['page']);
    }

    #[Test]
    #[TestDox("Seuls les filtres déclarés sont transmis, sous leur nom côté API")]
    public function filtresSurListeBlanche(): void
    {
        $params = $this->builder->buildParams(
            ['recherche' => 'Abidjan', 'inconnu' => 'valeur-injectee'],
            ['recherche' => 'libelle'],
            []
        );

        self::assertSame('Abidjan', $params['libelle'], 'la clé d\'entrée est traduite en clé d\'API');
        self::assertArrayNotHasKey('inconnu', $params);
        self::assertArrayNotHasKey('valeur-injectee', $params);
    }

    #[Test]
    #[TestDox('Un filtre vide ou composé d\'espaces n\'est pas transmis')]
    public function filtreVideIgnore(): void
    {
        $params = $this->builder->buildParams(
            ['recherche' => '   '],
            ['recherche' => 'libelle'],
            []
        );

        // Transmettre « libelle= » filtrerait sur la chaîne vide et viderait le listing.
        self::assertArrayNotHasKey('libelle', $params);
    }

    #[Test]
    #[TestDox('Les espaces autour de la valeur du filtre sont retirés')]
    public function filtreEspacesRetires(): void
    {
        $params = $this->builder->buildParams(
            ['recherche' => '  Bouaké  '],
            ['recherche' => 'libelle'],
            []
        );

        self::assertSame('Bouaké', $params['libelle']);
    }

    #[Test]
    #[TestDox("Un tri sur un champ non déclaré est ignoré")]
    public function triSurListeBlanche(): void
    {
        $autorise = $this->builder->buildParams(['sort' => 'libelle', 'dir' => 'desc'], [], ['libelle']);
        $refuse = $this->builder->buildParams(['sort' => 'password', 'dir' => 'desc'], [], ['libelle']);

        self::assertSame(['libelle' => 'desc'], $autorise['order']);
        self::assertArrayNotHasKey('order', $refuse, 'un champ hors liste blanche ne part jamais à l\'API');
    }

    #[Test]
    #[TestDox("Une direction de tri inconnue retombe sur l'ordre croissant")]
    public function directionInconnue(): void
    {
        $params = $this->builder->buildParams(['sort' => 'libelle', 'dir' => 'n-importe-quoi'], [], ['libelle']);

        self::assertSame(['libelle' => 'asc'], $params['order']);
    }

    #[Test]
    #[TestDox('Les métadonnées de pagination décrivent la tranche affichée')]
    public function metadonneesDePagination(): void
    {
        $meta = $this->builder->buildPaginationMeta(['totalItems' => 42], page: 2, perPage: 20);

        self::assertSame(42, $meta['total']);
        self::assertSame(3, $meta['totalPages']);
        self::assertSame(21, $meta['from']);
        self::assertSame(40, $meta['to']);
    }

    #[Test]
    #[TestDox('Une liste vide affiche une page, et une tranche « de 0 à 0 »')]
    public function metadonneesListeVide(): void
    {
        $meta = $this->builder->buildPaginationMeta(['totalItems' => 0], page: 1, perPage: 20);

        self::assertSame(0, $meta['from'], 'afficher « de 1 à 0 » serait absurde');
        self::assertSame(0, $meta['to']);
        self::assertSame(1, $meta['totalPages'], 'la pagination ne descend jamais à zéro page');
    }

    #[Test]
    #[TestDox('La dernière page est bornée au nombre réel de résultats')]
    public function derniereePageBornee(): void
    {
        $meta = $this->builder->buildPaginationMeta(['totalItems' => 42], page: 3, perPage: 20);

        self::assertSame(41, $meta['from']);
        self::assertSame(42, $meta['to'], 'et non 60');
    }

    #[Test]
    #[TestDox("Cliquer sur la colonne triée inverse le sens ; sur une autre colonne, on repart en croissant")]
    public function bascuteDuTri(): void
    {
        $surLaColonneActive = $this->builder->sortUrl(['sort' => 'libelle', 'dir' => 'asc'], 'libelle');
        self::assertSame('desc', $surLaColonneActive['params']['dir']);
        self::assertTrue($surLaColonneActive['active']);

        $surUneAutreColonne = $this->builder->sortUrl(['sort' => 'libelle', 'dir' => 'desc'], 'createdAt');
        self::assertSame('asc', $surUneAutreColonne['params']['dir']);
        self::assertFalse($surUneAutreColonne['active']);
    }

    #[Test]
    #[TestDox('Changer de tri ramène à la première page')]
    public function triRamèneEnPremierePage(): void
    {
        // Rester en page 7 après un changement de tri afficherait une tranche vide ou incohérente.
        $lien = $this->builder->sortUrl(['sort' => 'libelle', 'dir' => 'asc', 'page' => 7], 'createdAt');

        self::assertSame(1, $lien['params']['page']);
    }

    #[Test]
    #[TestDox('Le tri conserve les filtres déjà appliqués')]
    public function triConserveLesFiltres(): void
    {
        $lien = $this->builder->sortUrl(['recherche' => 'Abidjan', 'sort' => 'libelle'], 'createdAt');

        self::assertSame('Abidjan', $lien['params']['recherche'], 'trier ne doit pas effacer la recherche en cours');
    }
}
