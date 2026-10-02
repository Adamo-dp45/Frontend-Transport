<?php

namespace App\Twig;

use App\Domain\Service\LiensRapides;
use Twig\Extension\AbstractExtension;
use Twig\TwigFunction;

/**
 * Expose les raccourcis d'un écran aux gabarits.
 *
 * Une EXTENSION et non une variable passée par chaque contrôleur : les raccourcis ne dépendent que
 * de la route courante et des permissions, jamais des données de la page. Les faire transiter par
 * les contrôleurs obligerait à toucher chacun d'eux — et à y penser pour chaque nouvel écran.
 */
class LiensRapidesExtension extends AbstractExtension
{
    public function __construct(private LiensRapides $liensRapides)
    {
    }

    public function getFunctions(): array
    {
        return [
            new TwigFunction('liens_rapides', [$this, 'pour']),
        ];
    }

    /** @return list<array{route: string, libelle: string}> */
    public function pour(?string $route): array
    {
        return $this->liensRapides->pour($route);
    }
}
