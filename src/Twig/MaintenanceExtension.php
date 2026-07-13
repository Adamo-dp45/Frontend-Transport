<?php

namespace App\Twig;

use App\Domain\Helper\MaintenanceStateProvider;
use Twig\Extension\AbstractExtension;
use Twig\TwigFunction;

/**
 * Expose l'état de maintenance aux templates (pour la bannière super admin). S'appuie sur le cache du
 * provider → pas d'appel API supplémentaire dans la fenêtre de cache.
 */
class MaintenanceExtension extends AbstractExtension
{
    public function __construct(private MaintenanceStateProvider $maintenance)
    {
    }

    public function getFunctions(): array
    {
        return [
            new TwigFunction('maintenance_etat', [$this, 'etat']),
        ];
    }

    /** @return array{actif: bool, message: ?string, depuis: ?string} */
    public function etat(): array
    {
        return $this->maintenance->etat();
    }
}
