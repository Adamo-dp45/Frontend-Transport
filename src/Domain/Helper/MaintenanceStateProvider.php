<?php

namespace App\Domain\Helper;

use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;

/**
 * État du mode maintenance (lu depuis l'API BK), mis en cache quelques secondes pour ne pas appeler
 * l'API à chaque requête. Fail-open : en cas d'erreur, on considère qu'il n'y a PAS de maintenance
 * (on ne veut pas verrouiller l'app à cause d'un hoquet réseau).
 */
class MaintenanceStateProvider
{
    private const KEY = 'maintenance_etat';
    private const TTL = 10; // secondes

    public function __construct(
        private ApiHelper $api,
        private CacheInterface $cache
    )
    {
    }

    /** @return array{actif: bool, message: ?string, depuis: ?string} */
    public function etat(): array
    {
        try {
            return $this->cache->get(self::KEY, function (ItemInterface $item) {
                $item->expiresAfter(self::TTL);
                $data = $this->api->item('/api/maintenance') ?? [];

                return [
                    'actif' => (bool) ($data['actif'] ?? false),
                    'message' => $data['message'] ?? null,
                    'depuis' => $data['depuis'] ?? null,
                ];
            });
        } catch (\Throwable) {
            return ['actif' => false, 'message' => null, 'depuis' => null];
        }
    }

    public function estActif(): bool
    {
        return $this->etat()['actif'];
    }

    /** Invalide le cache (après une bascule par le super admin) pour un effet immédiat. */
    public function forget(): void
    {
        try {
            $this->cache->delete(self::KEY);
        } catch (\Throwable) {
            // non bloquant
        }
    }
}
