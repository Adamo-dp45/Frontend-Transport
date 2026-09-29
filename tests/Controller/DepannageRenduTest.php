<?php

namespace App\Tests\Controller;

use App\Domain\Helper\ApiHelper;
use App\Entity\ApiUser;
use App\Tests\Support\ApiHelperDouble;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\TestDox;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * Les trois écrans du dépannage se RENDENT, main d'œuvre externe comprise.
 *
 * On rend au lieu de relire : `lint:twig` compile sans exécuter, et c'est par là que deux
 * « Macro "…" is not defined » sont passés jusqu'à l'utilisateur. Le partiel de main d'œuvre porte en
 * plus du script et une boucle sur des lignes existantes — deux choses qu'un lint ne juge pas.
 *
 * L'ASSERTION QUI COMPTE est celle du total des pièces. Depuis que la main d'œuvre existe, `couttotal`
 * la comprend : le pied du tableau des pièces ne pouvait plus l'afficher sans cesser de totaliser son
 * propre tableau. C'est le genre d'écart qu'on met des mois à comprendre, et il ne se voit que sur un
 * dépannage qui a DES DEUX.
 */
final class DepannageRenduTest extends WebTestCase
{
    private const DEPANNAGE_ID = 7;

    private KernelBrowser $client;

    private ApiHelperDouble $api;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $this->api = new ApiHelperDouble();
        static::getContainer()->set(ApiHelper::class, $this->api);

        $donnees = [
            'id' => 1,
            'nom' => 'Test',
            'prenom' => 'Admin',
            'email' => 'admin@test.ci',
            'roles' => ['ROLE_ADMIN', 'ROLE_USER'],
            'entreprise' => ['id' => 1, 'libelle' => 'Test Transport'],
            'gare' => null,
            'userRoles' => [],
        ];

        $this->client->loginUser(new ApiUser($donnees));

        // La session AUSSI : 'ApiUserProvider::refreshUser()' y relit l'utilisateur à chaque requête.
        // Cf. 'FicheVoyageRenduTest' pour le détail du piège (et pourquoi '$client->getSession()').
        $session = $this->client->getSession();
        $session->set('user', $donnees);
        $session->set('token', 'jeton-de-test');
        $session->set('refresh_token', 'refresh-de-test');
        $session->save();
    }

    /** @param array<string, mixed> $surcharges */
    private function preparer(array $surcharges = []): void
    {
        $this->api->repond(array_merge([
            '/api/depannages/' . self::DEPANNAGE_ID => [
                'id' => self::DEPANNAGE_ID,
                'lieudepannage' => 'Bord de route, axe Abidjan — Bouaké',
                'description' => 'Casse moteur en ligne',
                'datedepannage' => '2026-09-25T08:00:00+00:00',
                'createdAt' => '2026-09-25T08:05:00+00:00',
                'statut' => 'EN_COURS',
                'car' => ['id' => 3, 'matricule' => '4521 AB 01'],
                'typepanne' => ['id' => 2, 'libelle' => 'Moteur'],
                // 24 000 de pièces + 45 000 de main d'œuvre : les deux parts sont distinctes.
                'couttotal' => 69000,
                'coutmaindoeuvre' => 45000,
                'detaildepannages' => [
                    [
                        'id' => 11,
                        'quantite' => 2,
                        'prixunitaire' => 12000,
                        'piece' => ['id' => 5, 'libelle' => 'Filtre à huile'],
                    ],
                ],
                'detailmaindoeuvres' => [
                    [
                        'id' => 21,
                        'intervenant' => 'Garage Kouassi',
                        'prestation' => 'Démontage culasse',
                        'montant' => 30000,
                    ],
                    [
                        'id' => 22,
                        'intervenant' => 'Soudeur du village',
                        'prestation' => null,
                        'montant' => 15000,
                    ],
                ],
                'detailpersonnels' => [],
            ],
            '/api/typepannes' => ['member' => [['id' => 2, 'libelle' => 'Moteur']]],
        ], $surcharges));
    }

    #[Test]
    #[TestDox("La fiche du dépannage se rend, et son total de pièces reste celui des pièces")]
    public function laFicheSeRend(): void
    {
        $this->preparer();

        $crawler = $this->client->request('GET', '/depannage/' . self::DEPANNAGE_ID);

        self::assertResponseIsSuccessful(sprintf(
            "réponses d'API non prévues : %s",
            implode(', ', $this->api->manquants()) ?: 'aucune'
        ));

        $texte = $crawler->filter('body')->text();

        self::assertStringContainsString('Main d\'œuvre externe', $texte, 'la section apparaît');
        self::assertStringContainsString('Garage Kouassi', $texte);
        self::assertStringContainsString('Soudeur du village', $texte);
        self::assertStringContainsString('Total des pièces', $texte, 'le pied dit ce qu\'il totalise');
        self::assertStringContainsString('69 000', $texte, "le coût de l'intervention apparaît");

        /*
            ON LIT LA CELLULE, PAS LA PAGE. Une simple recherche de « 24 000 » dans le corps passait
            au vert MÊME avec le défaut réintroduit : le nombre figure aussi dans la ventilation du
            haut (« Pièces 24 000 · Main d'œuvre 45 000 »). Vérifié en remplaçant le total du pied par
            'couttotal' — le test restait vert. Une assertion qui ne tombe pas sur le défaut qu'elle
            prétend garder ne garde rien.
        */
        $pied = $crawler->filter('tfoot tr')->reduce(
            static fn ($ligne): bool => str_contains($ligne->text(), 'Total des pièces')
        );
        self::assertCount(1, $pied, 'le pied du tableau des pièces est identifiable');
        self::assertStringContainsString('24 000', $pied->text(), '2 × 12 000 : le total DES PIÈCES');
        self::assertStringNotContainsString(
            '69 000',
            $pied->text(),
            "le pied d'un tableau doit totaliser SON tableau, pas le coût complet de l'intervention"
        );
    }

    #[Test]
    #[TestDox("Sans main d'œuvre, la section et la ventilation disparaissent")]
    public function sansMainDoeuvreRienNApparait(): void
    {
        $this->preparer([
            '/api/depannages/' . self::DEPANNAGE_ID => array_merge(
                $this->depannageDeBase(),
                ['couttotal' => 24000, 'coutmaindoeuvre' => 0, 'detailmaindoeuvres' => []]
            ),
        ]);

        $crawler = $this->client->request('GET', '/depannage/' . self::DEPANNAGE_ID);

        self::assertResponseIsSuccessful();
        $texte = $crawler->filter('body')->text();

        // Rien à dire, donc on ne dit rien : répéter « Pièces 24 000 » sous « Coût total 24 000 »
        // n'apprendrait rien, et une section vide ferait croire à une donnée manquante.
        self::assertStringNotContainsString('Main d\'œuvre externe', $texte);
    }

    #[Test]
    #[TestDox("Le formulaire de CRÉATION porte le tableau de main d'œuvre, vide")]
    public function leFormulaireDeCreationSeRend(): void
    {
        $this->preparer();

        $crawler = $this->client->request('GET', '/depannage/nouveau');

        self::assertResponseIsSuccessful();
        $texte = $crawler->filter('body')->text();

        self::assertStringContainsString('Main d\'œuvre externe', $texte);
        // Facultative : on démarre à zéro ligne, avec l'invite qui le dit.
        self::assertStringContainsString('Aucun intervenant externe', $texte);
        self::assertCount(0, $crawler->filter('#tbody-mo tr'), 'aucune ligne au départ');
        self::assertCount(1, $crawler->filter('#btn-add-mo'), 'le bouton d\'ajout est là');
    }

    #[Test]
    #[TestDox("Le formulaire de MODIFICATION préremplit les lignes existantes")]
    public function leFormulaireDeModificationPreremplit(): void
    {
        $this->preparer();

        $crawler = $this->client->request('GET', '/depannage/' . self::DEPANNAGE_ID . '/modifier');

        self::assertResponseIsSuccessful();

        /*
            LA VRAIE PROMESSE DU PARTIEL PARTAGÉ : les deux formulaires décrivent ces champs au MÊME
            endroit. Une ligne préremplie ici prouve que la boucle d'édition marche, et le test de
            création au-dessus prouve que le cas vide marche — avec un seul gabarit derrière.
        */
        self::assertCount(2, $crawler->filter('#tbody-mo tr'), 'les deux intervenants sont là');
        self::assertSame(
            'Garage Kouassi',
            $crawler->filter('#tbody-mo input[name="mo_intervenant[]"]')->first()->attr('value')
        );
        self::assertSame(
            '30000',
            $crawler->filter('#tbody-mo input[name="mo_montant[]"]')->first()->attr('value')
        );
        self::assertStringNotContainsString(
            'Aucun intervenant externe',
            $crawler->filter('#mo-vide')->attr('class') ?? '',
            'l\'invite est masquée quand il y a des lignes'
        );
        self::assertStringContainsString('hidden', (string) $crawler->filter('#mo-vide')->attr('class'));
    }

    /** @return array<string, mixed> */
    private function depannageDeBase(): array
    {
        return [
            'id' => self::DEPANNAGE_ID,
            'lieudepannage' => 'Atelier',
            'description' => 'Entretien',
            'datedepannage' => '2026-09-25T08:00:00+00:00',
            'createdAt' => '2026-09-25T08:05:00+00:00',
            'statut' => 'EN_COURS',
            'car' => ['id' => 3, 'matricule' => '4521 AB 01'],
            'typepanne' => ['id' => 2, 'libelle' => 'Moteur'],
            'detaildepannages' => [
                ['id' => 11, 'quantite' => 2, 'prixunitaire' => 12000, 'piece' => ['id' => 5, 'libelle' => 'Filtre']],
            ],
            'detailpersonnels' => [],
        ];
    }
}
