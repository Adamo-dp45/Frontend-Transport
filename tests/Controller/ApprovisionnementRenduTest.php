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
 * LA FICHE D'UN APPROVISIONNEMENT AFFICHE LE MONTANT SERVI PAR L'API, ELLE NE LE RECALCULE PLUS.
 *
 * Depuis le 28/09/2026, `Approvisionnement::$couttotal` porte le coût sur l'entête (patron
 * `Depannage::$couttotal`), recomposé côté API à chaque écriture. Trois surfaces du frontend le
 * resommaient — et pas même depuis le `couttotal` de la ligne, mais en refaisant
 * `quantite * prixunitaire` : deux façons d'obtenir le même nombre, donc deux façons de diverger, et
 * c'est l'écran qui aurait eu tort sans qu'on sache lequel croire.
 *
 * L'ASSERTION QUI COMPTE est construite pour être DISCRIMINANTE : la réponse d'API y porte un
 * `couttotal` qui ne tombe PAS sur la somme de ses lignes. Un écran qui resomme affiche alors l'autre
 * nombre et le test tombe. Avec des données cohérentes, les deux implémentations passeraient — le test
 * ne prouverait rien.
 *
 * On REND au lieu de relire : `lint:twig` compile sans exécuter, et c'est par là que deux
 * « Macro "…" is not defined » ont atteint l'utilisateur.
 */
final class ApprovisionnementRenduTest extends WebTestCase
{
    private const APPRO_ID = 21;

    /** Ce que l'API sert sur l'entête. */
    private const COUT_SERVI = 130000;

    /**
     * Ce qu'une resomme des lignes donnerait — VOLONTAIREMENT DIFFÉRENT.
     *
     * 3 × 10 000 = 30 000 : si la page recalcule, elle affiche 30 000 au lieu de 130 000.
     */
    private const COUT_RESOMME = 30000;

    /**
     * Le fournisseur tel que le gabarit le LIT — libelle, contact, adresse, email.
     *
     * Les quatre champs sont requis : Twig lève « Key "contact" ... does not exist » sur un tableau
     * incomplet, et la page répond 500. C'est ce qu'un premier jet de ce test a produit, et c'est une
     * information utile : la fiche exige ces champs, l'API les sert toujours (`Fournisseur` les rend
     * obligatoires à la création), mais un allègement du groupe de sérialisation casserait l'écran.
     */
    private const FOURNISSEUR = [
        'id' => 4,
        'libelle' => 'Pièces Auto Adjamé',
        'contact' => '+225 01 02 03 04 05',
        'adresse' => 'Adjamé, Abidjan',
        'email' => 'contact@pieces-adjame.ci',
    ];

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
            '/api/approvisionnements/' . self::APPRO_ID => [
                'id' => self::APPRO_ID,
                'dateappro' => '2026-09-25T08:00:00+00:00',
                'createdAt' => '2026-09-25T08:05:00+00:00',
                'statut' => 'VALIDE',
                'couttotal' => self::COUT_SERVI,
                'fournisseur' => self::FOURNISSEUR,
                'detailapprovisionnements' => [
                    [
                        'id' => 31,
                        'quantite' => 3,
                        'prixunitaire' => 10000,
                        'couttotal' => 30000,
                        'piece' => ['id' => 5, 'libelle' => 'Filtre à huile'],
                    ],
                ],
            ],
        ], $surcharges));
    }

    #[Test]
    #[TestDox("La fiche se rend et affiche le montant de l'API, non une resomme des lignes")]
    public function laFicheAfficheLeMontantServi(): void
    {
        $this->preparer();

        $crawler = $this->client->request('GET', '/approvisionnement/' . self::APPRO_ID);

        self::assertResponseIsSuccessful(sprintf(
            "réponses d'API non prévues : %s",
            implode(', ', $this->api->manquants()) ?: 'aucune'
        ));

        $texte = $crawler->filter('body')->text();

        /*
            ON CIBLE LE CHIFFRE QUI SUIT « Montant total », pas le texte entier.

            Un premier jet cherchait « 30 000 » dans TOUTE la page et tombait sur le total de la LIGNE
            de détail, qui vaut légitimement 30 000 : l'assertion échouait sur du code juste. Une
            assertion doit viser l'endroit exact où le défaut s'afficherait, sinon elle rend un verdict
            sur autre chose que ce qu'elle prétend juger.
        */
        self::assertSame(
            1,
            preg_match('/Montant total\s+([\d\s\xc2\xa0]+?)\s*FCFA/u', $texte, $m),
            'le bloc « Montant total » porte un montant'
        );
        $montantAffiche = (int) preg_replace('/\D/', '', $m[1]);

        self::assertSame(self::COUT_SERVI, $montantAffiche, 'la page affiche le montant SERVI par l\'API');
        self::assertNotSame(self::COUT_RESOMME, $montantAffiche, 'et non la resomme de ses lignes');
    }

    #[Test]
    #[TestDox("Un couttotal absent n'arrête pas la page")]
    public function couttotalAbsent(): void
    {
        /*
            Le champ est nullable : une ligne qu'aucun backfill n'aurait touchée, ou une réponse d'une
            version d'API antérieure, arrive sans lui. Le gabarit porte `|default(0)` — sans quoi la
            fiche répondrait 500 sur une donnée simplement incomplète, ce qui est le pire échange
            possible contre un zéro affiché.
        */
        $this->preparer(['/api/approvisionnements/' . self::APPRO_ID => [
            'id' => self::APPRO_ID,
            'dateappro' => '2026-09-25T08:00:00+00:00',
            'createdAt' => '2026-09-25T08:05:00+00:00',
            'statut' => 'VALIDE',
            'fournisseur' => self::FOURNISSEUR,
            'detailapprovisionnements' => [],
        ]]);

        $this->client->request('GET', '/approvisionnement/' . self::APPRO_ID);

        self::assertResponseIsSuccessful(sprintf(
            "réponses d'API non prévues : %s",
            implode(', ', $this->api->manquants()) ?: 'aucune'
        ));
    }
}
