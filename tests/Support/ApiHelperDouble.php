<?php

namespace App\Tests\Support;

use App\Domain\Helper\ApiHelper;
use App\Security\Exception\ApiException;

/**
 * Un `ApiHelper` qui répond depuis une table de réponses, sans réseau.
 *
 * POURQUOI : les écrans du front ne se cassent pas dans leur PHP mais dans leur TWIG, et une erreur
 * de gabarit ne se voit qu'au RENDU — `lint:twig` compile sans exécuter. Deux fois de suite, un
 * « Macro "…" is not defined » est arrivé jusqu'à l'utilisateur alors que tout était vert : une
 * variable de gabarit (`{% for t in … %}`, puis `|filter(t => t.statut)`) écrasait l'alias des
 * macros posé par `{% import _self as t %}`.
 *
 * Il fallait donc pouvoir RENDRE une page dans un test. Le reste du chemin est déjà là : `WebTestCase`
 * et `loginUser()` connectent un utilisateur SANS mot de passe, et ce double remplace le seul
 * obstacle restant — les appels HTTP vers l'API.
 */
final class ApiHelperDouble extends ApiHelper
{
    /** @var array<string, mixed> chemin d'API (sans query) => réponse */
    private array $reponses = [];

    /** @var list<string> chemins réclamés mais absents de la table : le test peut les inspecter */
    private array $manquants = [];

    public function __construct()
    {
        // On n'appelle PAS parent::__construct() : aucune dépendance n'est utilisée, et en exiger
        // trois (client HTTP, paramètres) pour un double qui ne fait rien serait du bruit.
    }

    /** @param array<string, mixed> $reponses */
    public function repond(array $reponses): self
    {
        $this->reponses = array_merge($this->reponses, $reponses);

        return $this;
    }

    /** @return list<string> */
    public function manquants(): array
    {
        return $this->manquants;
    }

    public function get(string $endpoint, array $query = [], array $headers = []): mixed
    {
        return $this->reponse($endpoint);
    }

    public function collection(string $endpoint, array $query = [], array $headers = []): mixed
    {
        $data = $this->reponse($endpoint);

        return $data['member'] ?? (is_array($data) ? $data : []);
    }

    public function item(string $endpoint, array $query = [], array $headers = []): ?array
    {
        $data = $this->reponse($endpoint);

        return is_array($data) ? $data : null;
    }

    /**
     * Un chemin absent lève une `ApiException` 404 plutôt que de rendre un tableau vide : les
     * contrôleurs entourent leurs appels de `try/catch`, et un silence ferait passer pour « rendu
     * correctement » une page à qui il manque la moitié de ses données. Le test lit `manquants()`
     * pour savoir ce qu'il a oublié de fournir.
     */
    private function reponse(string $endpoint): mixed
    {
        $chemin = strtok($endpoint, '?');

        if (!array_key_exists($chemin, $this->reponses)) {
            $this->manquants[] = $chemin;

            throw new ApiException('Aucune réponse prévue pour ' . $chemin, 404);
        }

        return $this->reponses[$chemin];
    }
}
