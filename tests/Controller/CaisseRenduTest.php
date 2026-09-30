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
 * LES ÉCRANS DE CAISSE, et surtout : LE COMPTAGE EST AVEUGLE.
 *
 * La sentinelle qui compte ici est celle du montant attendu. À qui connaît le théorique, il suffit
 * de le recopier pour n'avoir jamais d'écart — le contrôle ne mesure alors plus rien. L'écran de
 * clôture ne doit donc afficher AUCUN attendu, et c'est le genre de chose qu'on « améliore » un
 * jour de bonne foi, en croyant rendre service à l'agent.
 */
final class CaisseRenduTest extends WebTestCase
{
    private KernelBrowser $client;

    private ApiHelperDouble $api;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $this->api = new ApiHelperDouble();
        static::getContainer()->set(ApiHelper::class, $this->api);

        $donnees = [
            'id' => 4,
            'nom' => 'Kouadio',
            'prenom' => 'Awa',
            'email' => 'awa@test.ci',
            'roles' => ['ROLE_USER'],
            'entreprise' => ['id' => 1, 'libelle' => 'Test Transport'],
            'gare' => ['id' => 2, 'libelle' => 'Adjamé'],
            // Les permissions se lisent à travers les rôles métier, pas sur l'utilisateur.
            'userRoles' => [['role' => ['permissions' => [
                ['entity' => 'Sessioncaisse', 'action' => 'VOIR'],
                ['entity' => 'Sessioncaisse', 'action' => 'CREER'],
                ['entity' => 'Sessioncaisse', 'action' => 'CLOTURER'],
            ]]]],
        ];
        $this->client->loginUser(new ApiUser($donnees));

        // La session AUSSI : 'ApiUserProvider::refreshUser()' y relit l'utilisateur à chaque requête.
        $session = $this->client->getSession();
        $session->set('user', $donnees);
        $session->set('token', 'jeton-de-test');
        $session->set('refresh_token', 'refresh-de-test');
        $session->save();
    }

    #[Test]
    #[TestDox("Sans caisse ouverte, l'écran propose la prise de poste")]
    public function sansCaisseOuverte(): void
    {
        $this->api->repond(['/api/sessioncaisses' => ['member' => []]]);

        $crawler = $this->client->request('GET', '/caisse');

        self::assertResponseIsSuccessful();
        self::assertStringContainsString('Ouvrir ma caisse', $crawler->html());
        self::assertStringContainsString(
            'Fonds de caisse',
            $crawler->html(),
            "le fonds est la SEULE raison d'être de l'ouverture manuelle : oublié, il ressort le "
            . "soir comme un excédent inexpliqué"
        );
    }

    #[Test]
    #[TestDox("Avec une caisse ouverte, l'écran de clôture ne révèle AUCUN montant attendu")]
    public function comptageAveugle(): void
    {
        $this->api->repond([
            '/api/sessioncaisses' => ['member' => [[
                'id' => 12,
                'statut' => 'OUVERTE',
                'datedebut' => '2026-09-30T07:00:00+00:00',
                'datefin' => null,
                'fondsouverture' => 5000,
                'ouvertureautomatique' => false,
                'montantcompte' => null,
                'ecart' => null,
                'motifecart' => null,
                'gare' => ['id' => 2, 'libelle' => 'Adjamé'],
            ]]],
        ]);

        $crawler = $this->client->request('GET', '/caisse');

        self::assertResponseIsSuccessful();
        $html = $crawler->html();

        self::assertStringContainsString('Clôturer ma caisse', $html);
        self::assertStringContainsString('Total compté', $html);
        self::assertStringNotContainsString(
            'Attendu',
            $html,
            "AUCUN montant attendu sur l'écran de comptage : le connaître permet de le recopier, "
            . "et l'écart ne mesure alors plus rien"
        );
        self::assertStringNotContainsString('montanttheorique', $html);
    }

    #[Test]
    #[TestDox('La fiche d’une caisse clôturée montre les postes, le compté et l’écart signé')]
    public function ficheDUneCaisseCloturee(): void
    {
        $this->api->repond([
            '/api/sessioncaisses/12' => [
                'id' => 12,
                'statut' => 'CLOTUREE',
                'datedebut' => '2026-09-29T07:00:00+00:00',
                'datefin' => '2026-09-29T19:30:00+00:00',
                'fondsouverture' => 5000,
                'ouvertureautomatique' => false,
                'totalbillets' => 45000,
                'totalbagages' => 4000,
                'totalcourriers' => 3000,
                'totalfraissuivi' => 500,
                'totalreservations' => 12000,
                'totalpenalites' => 2000,
                'totalcomplements' => 1000,
                'totalremboursements' => 15000,
                'montanttheorique' => 57500,
                'montantcompte' => 56500,
                'ecart' => -1000,
                'motifecart' => 'Billet de 1 000 rendu en trop',
                'agent' => ['id' => 4, 'nom' => 'Kouadio', 'prenom' => 'Awa'],
                'gare' => ['id' => 2, 'libelle' => 'Adjamé'],
            ],
        ]);

        $crawler = $this->client->request('GET', '/caisse/12');

        self::assertResponseIsSuccessful();
        $html = $crawler->html();

        self::assertStringContainsString('Attendu en caisse', $html, 'une fois clôturée, le chiffre se dit');
        self::assertStringContainsString('Frais de suivi', $html, 'ils ont leur propre ligne, comme sur le reçu du client');
        self::assertStringContainsString('Remboursements', $html);
        self::assertStringContainsString('Billet de 1 000 rendu en trop', $html, "le motif reste attaché à l'écart");
        self::assertStringContainsString(
            'Manquant dans le tiroir',
            $html,
            "le SIGNE porte le sens : un excédent n'est pas une bonne nouvelle, c'est une autre anomalie"
        );
    }
}
