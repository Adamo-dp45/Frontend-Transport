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
 * LE JUSTIFICATIF D'UNE DÉPENSE SE CONSULTE PAR LE RELAIS DU FRONT, JAMAIS PAR UNE URL.
 *
 * Depuis le 28/09/2026 un justificatif est un document PRIVÉ côté API : stocké dans un dossier interdit au serveur web, sans
 * `contentUrl`, lisible seulement par `GET /api/depenses/{id}/justificatif` avec le jeton de
 * l'utilisateur. Le navigateur n'ayant pas ce jeton, `/depense/{id}/justificatif` le relaie.
 *
 * Le lien d'avant pointait sur `contentUrl` SANS l'hôte de l'API — un chemin relatif résolu sur le
 * FRONT, donc un 404 à chaque clic. Et la réparer en préfixant l'hôte aurait servi le fichier à
 * quiconque connaissait l'adresse.
 */
final class DepenseJustificatifTest extends WebTestCase
{
    private const DEPENSE_ID = 7;

    private const PDF = "%PDF-1.4\n%%EOF\n";

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
        $session = $this->client->getSession();
        $session->set('user', $donnees);
        $session->set('token', 'jeton-de-test');
        $session->set('refresh_token', 'refresh-de-test');
        $session->save();
    }

    private function fichier(string $corps, string $type): void
    {
        $this->api->repond([
            '/api/depenses/' . self::DEPENSE_ID . '/justificatif' => [
                'body' => $corps,
                'content_type' => $type,
                'status' => 200,
            ],
        ]);
    }

    #[Test]
    #[TestDox("Le relais sert le fichier de l'API, affiché dans le navigateur et jamais mis en cache")]
    public function leRelaisSertLeFichier(): void
    {
        $this->fichier(self::PDF, 'application/pdf');

        $this->client->request('GET', '/depense/' . self::DEPENSE_ID . '/justificatif');

        self::assertResponseIsSuccessful();
        $reponse = $this->client->getResponse();
        self::assertSame(self::PDF, $reponse->getContent());
        self::assertSame('application/pdf', $reponse->headers->get('Content-Type'));
        self::assertStringStartsWith('inline;', (string) $reponse->headers->get('Content-Disposition'));
        self::assertStringContainsString('justificatif-depense-7.pdf', (string) $reponse->headers->get('Content-Disposition'));
        self::assertSame('nosniff', $reponse->headers->get('X-Content-Type-Options'));
        self::assertStringContainsString('no-store', (string) $reponse->headers->get('Cache-Control'));
    }

    #[Test]
    #[TestDox("Un type que l'API n'accepte pas au dépôt part en téléchargement opaque, jamais affiché")]
    public function unTypeInconnuNEstPasAffiche(): void
    {
        /*
            L'API refuse ce type au dépôt : ce cas ne devrait jamais se présenter. C'est justement pour
            ça qu'on le garde — afficher « inline », sur l'origine du front, un contenu annoncé comme du
            HTML, c'est laisser le navigateur l'exécuter.
        */
        $this->fichier('<script>alert(1)</script>', 'text/html; charset=UTF-8');

        $this->client->request('GET', '/depense/' . self::DEPENSE_ID . '/justificatif');

        self::assertResponseIsSuccessful();
        $reponse = $this->client->getResponse();
        self::assertSame('application/octet-stream', $reponse->headers->get('Content-Type'));
        self::assertStringStartsWith('attachment;', (string) $reponse->headers->get('Content-Disposition'));
    }

    #[Test]
    #[TestDox("La fiche d'une dépense pointe vers le relais, pas vers le contentUrl (nul pour un document privé)")]
    public function laFichePointeVersLeRelais(): void
    {
        $this->api->repond([
            '/api/depenses/' . self::DEPENSE_ID => [
                'id' => self::DEPENSE_ID,
                'datedepense' => '2026-09-28T08:00:00+00:00',
                'createdAt' => '2026-09-28T08:05:00+00:00',
                'montant' => 45000,
                'typedepense' => ['id' => 2, 'libelle' => 'Pneus'],
                'gare' => ['id' => 3, 'libelle' => 'Gare de Bouaké'],
                'portee' => 'GARE',
                'modereglement' => 'ESPECES',
                'beneficiaire' => 'Vulcanisateur',
                'fournisseur' => null,
                'libelle' => 'Deux pneus avant',
                'voyage' => null,
                // Tel que l'API le sert pour un document PRIVÉ : clé présente, URL nulle.
                'justificatif' => ['@id' => '/api/media_objects/9', 'contentUrl' => null, 'prive' => true],
            ],
        ]);

        $crawler = $this->client->request('GET', '/depense/' . self::DEPENSE_ID);

        self::assertResponseIsSuccessful(sprintf(
            "réponses d'API non prévues : %s",
            implode(', ', $this->api->manquants()) ?: 'aucune'
        ));
        $lien = $crawler->filter('a:contains("Consulter le justificatif")');
        self::assertCount(1, $lien, 'le bouton du justificatif est rendu');
        self::assertSame('/depense/' . self::DEPENSE_ID . '/justificatif', $lien->attr('href'));
    }
}
