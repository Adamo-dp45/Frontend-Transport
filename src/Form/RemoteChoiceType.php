<?php

namespace App\Form;

use App\Form\ChoiceList\RemoteChoiceLoader;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\OptionsResolver\Options;
use Symfony\Component\OptionsResolver\OptionsResolver;

/**
 * Champ select à AUTOCOMPLETE DISTANT — équivalent Symfony du `data-remote-select` (tom-select →
 * SearchController /search). À utiliser à la place d'un ChoiceType dont on chargeait toutes les
 * options.
 *
 * Usage :
 *   ->add('car', RemoteChoiceType::class, [
 *       'resource' => 'cars',            // ressource du SearchController
 *       'label' => 'Car',
 *       'required' => false,
 *       'initial_value' => $carId,       // (édition) id pré-sélectionné
 *       'initial_label' => $carMatricule // (édition) libellé affiché sans requête
 *   ])
 *
 * Rendu : un <select data-remote-select="resource"> vide (initialisé par tom-select au turbo:load).
 * Soumission : n'importe quel id est accepté (cf. RemoteChoiceLoader) ; l'API valide au POST.
 */
class RemoteChoiceType extends AbstractType
{
    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setRequired('resource');
        $resolver->setDefaults([
            'initial_value' => null,
            'initial_label' => null,
            'placeholder_text' => '-- Rechercher --',
        ]);
        $resolver->setAllowedTypes('resource', 'string');

        // choice_loader passe-plat (accepte l'id soumis + porte l'éventuelle valeur initiale)
        $resolver->setNormalizer('choice_loader', function (Options $options) {
            $iv = $options['initial_value'];

            return new RemoteChoiceLoader(
                $iv !== null && $iv !== ''
                    ? [(string) $iv => (string) ($options['initial_label'] ?? $iv)]
                    : []
            );
        });

        // Attributs lus par tom-select (data-remote-select + préselection edit + placeholder)
        $resolver->setNormalizer('attr', function (Options $options, $attr) {
            $attr = \is_array($attr) ? $attr : [];
            $attr['data-remote-select'] = $options['resource'];
            $attr['placeholder'] ??= $options['placeholder_text'];
            if ($options['initial_value'] !== null && $options['initial_value'] !== '') {
                $attr['data-value'] = (string) $options['initial_value'];
                if ($options['initial_label'] !== null) {
                    $attr['data-label'] = (string) $options['initial_label'];
                }
            }

            return $attr;
        });
    }

    public function getParent(): string
    {
        return ChoiceType::class;
    }
}
