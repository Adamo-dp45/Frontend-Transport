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
 * LE GABARIT SE CASSE AU RENDU, ET NULLE PART AILLEURS.
 *
 * `lint:twig` COMPILE sans exécuter : il ne voit donc pas la faute la plus vicieuse de ce projet —
 * une variable de gabarit qui écrase l'alias des macros posé par `{% import _self as t %}`. Twig lit
 * alors `t.champ` comme un appel de macro et lève « Macro "champ" is not defined » à l'exécution.
 * C'est arrivé DEUX FOIS jusqu'à l'utilisateur, tout étant vert : d'abord par `{% for t in … %}`
 * (`home/_gare.html.twig`), puis par `|filter(t => t.statut == 'VALIDE')` ici même.
 *
 * Ce fichier est la réponse : il REND la page. Aucun mot de passe n'est en jeu — `loginUser()`
 * connecte un utilisateur directement —, et `ApiHelperDouble` remplace les appels réseau. Un
 * 500 fait tomber le test, ce qui est tout ce qu'on demande : le détail de l'affichage se juge à
 * l'œil, la présence d'une exception ne se juge pas, elle se mesure.
 */
final class FicheVoyageRenduTest extends WebTestCase
{
    private const VOYAGE_ID = 42;

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

        /*
            LA SESSION AUSSI, et pas seulement le pare-feu : 'ApiUserProvider::refreshUser()' relit
            l'utilisateur depuis la SESSION à chaque requête (pour éviter un appel à l'API à chaque
            hit). Sans ces clés il ne trouve rien, déconnecte, et le test reçoit une redirection vers
            '/connexion' au lieu de la page — en croyant à un problème de droits.

            !! On passe par '$client->getSession()', qui RÉOUVRE la session désignée par le cookie — celle
            que 'loginUser()' vient d'écrire. Un 'session.factory->createSession()' en créerait une
            SECONDE, dont le cookie écraserait le premier : on perdrait '_security_main' et on
            retomberait sur la même redirection, pour une raison exactement inverse.
        */
        $session = $this->client->getSession();
        $session->set('user', $donnees);
        $session->set('token', 'jeton-de-test');
        $session->set('refresh_token', 'refresh-de-test');
        $session->save();
    }

    /**
     * La fiche d'un voyage, avec de quoi exercer TOUS les chemins qui ont cassé : un billet valide et
     * un désisté, un bagage annulé, un courrier annulé, une charge rattachée au départ.
     *
     * @param array<string, mixed> $surcharges
     */
    private function preparer(array $surcharges = []): void
    {
        $this->api->repond(array_merge([
            '/api/voyages/' . self::VOYAGE_ID => [
                'id' => self::VOYAGE_ID,
                'codevoyage' => 'LI-ABI-KOR-0001-V3',
                'numerodepart' => 2,
                'provenance' => 'Gare d\'Adjamé',
                'destination' => 'Gare de Korhogo',
                'datedepartprevue' => '2026-09-24T07:00:00+00:00',
                'datearriveeprevue' => '2026-09-24T16:00:00+00:00',
                'datedepartreelle' => null,
                'datearriveereelle' => null,
                'placestotal' => 60,
                'placesprevues' => 60,
                'ligne' => ['id' => 9, 'codeligne' => 'LI-ABI-KOR-0001', 'gareorigine' => ['id' => 17]],
                'car' => null,
                'commercial' => null,
                'garecourante' => ['id' => 17, 'libelle' => 'Gare d\'Adjamé'],
                'gareprovenance' => ['id' => 17, 'libelle' => 'Gare d\'Adjamé'],
                'passages' => [],
                'horaires' => [],
                'detailpersonnels' => [],
                'ticketsCount' => 1,
                'courriersCount' => 0,
                'bagagesCount' => 0,
                'tickets' => [
                    [
                        'id' => 100, 'codeticket' => 'TCK-1', 'nomclient' => 'Valide',
                        'contactclient' => '0700000000', 'prix' => 15000, 'statut' => 'VALIDE',
                        'gare' => ['id' => 17, 'libelle' => 'Gare d\'Adjamé'],
                        'garedescente' => ['id' => 19, 'libelle' => 'Gare de Korhogo'],
                        'siege' => ['numero' => 1],
                    ],
                    [
                        'id' => 101, 'codeticket' => 'TCK-2', 'nomclient' => 'Désisté',
                        'contactclient' => '0700000001', 'prix' => 15000, 'statut' => 'ANNULE',
                        'gare' => ['id' => 17, 'libelle' => 'Gare d\'Adjamé'],
                        'garedescente' => ['id' => 19, 'libelle' => 'Gare de Korhogo'],
                        'siege' => ['numero' => 2],
                    ],
                ],
                'bagages' => [
                    [
                        'id' => 200, 'codebagage' => 'BAG-1', 'nature' => 'Valise', 'type' => 'LEGER',
                        'poids' => 12, 'montant' => 2500, 'statut' => 'ENREGISTRE',
                        'ticket' => ['nomclient' => 'Valide', 'contactclient' => '0700000000'],
                    ],
                    [
                        'id' => 201, 'codebagage' => 'BAG-2', 'nature' => 'Carton', 'type' => 'LOURD',
                        'poids' => 30, 'montant' => 5000, 'statut' => 'ANNULE',
                        'ticket' => ['nomclient' => 'Désisté', 'contactclient' => '0700000001'],
                    ],
                ],
                'courriers' => [
                    [
                        'id' => 300, 'codecourrier' => 'CRR-1', 'nomexpediteur' => 'Exp',
                        'contactexpediteur' => '0700000002', 'nomdestinataire' => 'Dest',
                        'contactdestinataire' => '0700000003', 'montant' => 4000, 'statut' => 'EN_TRANSIT',
                    ],
                    [
                        'id' => 301, 'codecourrier' => 'CRR-2', 'nomexpediteur' => 'Exp2',
                        'contactexpediteur' => '0700000004', 'nomdestinataire' => 'Dest2',
                        'contactdestinataire' => '0700000005', 'montant' => 1000, 'statut' => 'ANNULE',
                    ],
                ],
            ],
            '/api/voyages/' . self::VOYAGE_ID . '/resultat' => [
                'voyageId' => self::VOYAGE_ID,
                'codevoyage' => 'LI-ABI-KOR-0001-V3',
                'billets' => 15000, 'nbBillets' => 1,
                'reservations' => 8000, 'nbReservations' => 1,
                'bagages' => 2500, 'nbBagages' => 1,
                'courriers' => 4000, 'nbCourriers' => 1,
                'recette' => 29500,
                'depenses' => 5000, 'nbDepenses' => 1,
                'resultat' => 24500,
                'lignesDepenses' => [
                    [
                        'id' => 400, 'datedepense' => '2026-09-24T09:00:00+00:00', 'montant' => 5000,
                        'typedepense' => 'Frais de route', 'libelle' => 'Ration équipage',
                        'beneficiaire' => 'Chauffeur', 'modereglement' => 'ESPECES',
                        'gare' => 'Gare d\'Adjamé',
                    ],
                ],
                'picOccupation' => 2, 'capacite' => 60, 'placesRestantes' => 58,
                'tauxRemplissage' => 3,
                'troncons' => [
                    ['depart' => 'Gare d\'Adjamé', 'arrivee' => 'Gare de Bouaké', 'ordre' => 0,
                     'occupation' => 2, 'capacite' => 60, 'taux' => 3],
                ],
            ],
            '/api/lignes/9' => [
                'id' => 9,
                'codeligne' => 'LI-ABI-KOR-0001',
                'arrets' => [
                    ['ordre' => 0, 'gare' => ['id' => 17, 'libelle' => 'Gare d\'Adjamé']],
                    ['ordre' => 1, 'gare' => ['id' => 18, 'libelle' => 'Gare de Bouaké']],
                    ['ordre' => 2, 'gare' => ['id' => 19, 'libelle' => 'Gare de Korhogo']],
                ],
            ],
            // Le contrôleur charge encore cette collection pour le compteur « tickets vendus ».
            '/api/tickets' => ['member' => [['id' => 100, 'prix' => 15000]]],
            '/api/activites' => ['member' => []],
        ], $surcharges));
    }

    #[Test]
    #[TestDox('La fiche du voyage se rend sans exception')]
    public function laFicheSeRend(): void
    {
        $this->preparer();

        $this->client->request('GET', '/voyage/' . self::VOYAGE_ID);

        self::assertResponseIsSuccessful(sprintf(
            "la fiche n'a pas pu être rendue. Réponses d'API non prévues : %s",
            implode(', ', $this->api->manquants()) ?: 'aucune'
        ));
    }

    #[Test]
    #[TestDox("Les compteurs ne comptent que ce que la recette compte")]
    public function lesCompteursSontHonnetes(): void
    {
        $this->preparer();

        $crawler = $this->client->request('GET', '/voyage/' . self::VOYAGE_ID);
        $texte = $crawler->filter('body')->text();

        /*
            Le cœur du défaut corrigé : la pastille annonçait 2 billets là où la liste des voyages en
            annonçait 1 pour le même départ, parce qu'elle comptait le désistement. On vérifie donc que
            le désisté est MENTIONNÉ comme tel, et que son montant ne gonfle pas le total des bagages
            (2 500 seul, et non 7 500 avec le bagage annulé).
        */
        self::assertStringContainsString('désisté', mb_strtolower($texte), 'le désistement est nommé');
        self::assertStringContainsString('2 500', $texte, 'le total des bagages exclut l\'annulé');
        self::assertStringNotContainsString('7 500', $texte, 'le bagage ANNULE ne doit pas être sommé');
    }

    #[Test]
    #[TestDox("Sans droit sur les dépenses, le bloc des charges n'apparaît pas")]
    public function sansDroitDepenseAucunChiffreDeCharge(): void
    {
        /*
            L'API répond `depenses: null` — « je ne te le dis pas » — et l'écran doit MASQUER le bloc
            plutôt qu'afficher 0 FCFA, qui ferait lire un résultat égal à la recette.
        */
        $this->preparer([
            '/api/voyages/' . self::VOYAGE_ID . '/resultat' => [
                'recette' => 29500, 'billets' => 15000, 'reservations' => 8000,
                'bagages' => 2500, 'courriers' => 4000,
                'depenses' => null, 'nbDepenses' => null, 'resultat' => null, 'lignesDepenses' => [],
                'picOccupation' => 2, 'capacite' => 60, 'placesRestantes' => 58,
                'tauxRemplissage' => 3, 'troncons' => [],
            ],
        ]);

        $crawler = $this->client->request('GET', '/voyage/' . self::VOYAGE_ID);

        self::assertResponseIsSuccessful();
        self::assertStringNotContainsString(
            'Dépenses du voyage',
            $crawler->filter('body')->text(),
            'le bloc des charges doit disparaître, pas afficher zéro'
        );
    }
}
