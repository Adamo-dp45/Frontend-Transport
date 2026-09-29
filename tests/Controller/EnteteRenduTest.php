<?php

namespace App\Tests\Controller;

use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\TestDox;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * L'EN-TÊTE DES PAGES : UN SEUL SCRIPT DE THÈME, AVANT LA FEUILLE DE STYLE, ET LES ICÔNES DE L'APPLICATION.
 *
 * Les deux gabarits racines portaient un ANCIEN script de thème en ligne, en plus du partiel de
 * préchargement : deux décisions pour une seule classe `.dark`, la première lisant le mode « système »
 * comme « pas sombre ». Supprimé le 29/09/2026 ; ce test l'empêche de revenir.
 *
 * La CONNEXION est la page testée : publique, et c'est elle (`app-base.html.twig`) qui a déjà ignoré le
 * choix de thème quand le script ne vivait que dans `base.html.twig`.
 */
final class EnteteRenduTest extends WebTestCase
{
    #[Test]
    #[TestDox("Un seul script décide du thème, et il s'exécute avant la feuille de style")]
    public function unSeulScriptDeTheme(): void
    {
        $client = static::createClient();
        $crawler = $client->request('GET', '/connexion');
        self::assertResponseIsSuccessful();

        $tete = $crawler->filter('head')->html();

        self::assertSame(1, substr_count($tete, "classList.toggle('dark'"), 'une seule décision sur la classe .dark');
        self::assertStringNotContainsString('localStorage.theme ===', $tete, "l'ancien script en ligne");

        // Avant le CSS : sinon la page se peint en clair puis bascule (l'éclair blanc).
        $script = strpos($tete, "classList.toggle('dark'");
        $feuille = strpos($tete, 'rel="stylesheet"');
        self::assertNotFalse($feuille);
        self::assertLessThan($feuille, $script);
    }

    #[Test]
    #[TestDox("Les icônes sont celles de l'application, plus le favicon par défaut de Symfony")]
    public function lesIconesSontCellesDeLApplication(): void
    {
        $client = static::createClient();
        $crawler = $client->request('GET', '/connexion');

        $tete = $crawler->filter('head')->html();
        self::assertStringNotContainsString('sf</text>', $tete);
        self::assertSame('/icons/favicon.svg', $crawler->filter('link[rel="icon"][type="image/svg+xml"]')->attr('href'));
        self::assertSame('/icons/favicon.ico', $crawler->filter('link[rel="icon"][sizes="32x32"]')->attr('href'));
        self::assertSame('/icons/apple-touch-icon.png', $crawler->filter('link[rel="apple-touch-icon"]')->attr('href'));
    }
}
