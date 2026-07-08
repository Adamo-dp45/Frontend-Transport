<?php

namespace App\Form\ChoiceList;

use Symfony\Component\Form\ChoiceList\ArrayChoiceList;
use Symfony\Component\Form\ChoiceList\ChoiceListInterface;
use Symfony\Component\Form\ChoiceList\Loader\ChoiceLoaderInterface;

/**
 * Loader « passe-plat » pour un select à autocomplete DISTANT (tom-select → /search).
 *
 * Un ChoiceType classique refuse toute valeur absente de sa liste `choices` (« Cette valeur n'est
 * pas valide »). Ici on ACCEPTE l'id soumis tel quel — le vrai contrôle d'existence/permission est
 * fait par l'API au moment du POST. `loadChoiceList()` ne contient que l'éventuelle valeur initiale
 * (préselection en édition), pour le rendu ; aucune liste complète n'est chargée.
 */
final class RemoteChoiceLoader implements ChoiceLoaderInterface
{
    private ?ArrayChoiceList $list = null;

    /**
     * @param array<string,string> $initial map id => libellé (préselection edit) ; [] en création
     */
    public function __construct(private array $initial = [])
    {
    }

    public function loadChoiceList(?callable $value = null): ChoiceListInterface
    {
        // Les « choix » sont les ids (en string) ; le libellé d'affichage est géré par tom-select
        // via data-value/data-label, donc peu importe ici.
        return $this->list ??= new ArrayChoiceList(array_keys($this->initial), $value);
    }

    public function loadChoicesForValues(array $values, ?callable $value = null): array
    {
        // Passe-plat : toute valeur non vide soumise est acceptée.
        return array_values(array_filter($values, static fn ($v) => $v !== '' && $v !== null));
    }

    public function loadValuesForChoices(array $choices, ?callable $value = null): array
    {
        return array_map(static fn ($c) => (string) $c, $choices);
    }
}
