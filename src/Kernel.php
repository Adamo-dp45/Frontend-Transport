<?php

namespace App;

use Symfony\Bundle\FrameworkBundle\Kernel\MicroKernelTrait;
use Symfony\Component\HttpKernel\Kernel as BaseKernel;

class Kernel extends BaseKernel
{
    use MicroKernelTrait;

    public function __construct(string $environment, bool $debug)
    {
        // Fuseau horaire applicatif FIXE, indépendant du php.ini de l'hôte (cf. Backend-Transport).
        // La compagnie opère en UTC+0 (Abidjan) ; on épingle UTC pour un comportement identique
        // en local et en production, notamment pour les dates saisies dans les formulaires.
        date_default_timezone_set('UTC');

        parent::__construct($environment, $debug);
    }
}
