<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints\NotNull;

class VoyageAffectationCarFormType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        // ── ÉTAT PRÉCÉDENT (désactivé) — tous les cars chargés dans le select ──
        // $carChoices = [];
        // foreach ($options['cars'] as $c) {
        //     $label = $c['matricule'] . ' (' . ($c['marque']['libelle'] ?? '—') . ')';
        //     $carChoices[$label] = $c['id'];
        // }
        // $builder->add('car', ChoiceType::class, [
        //     'label' => 'Car à affecter',
        //     'choices' => $carChoices,
        //     'placeholder' => '-- Sélectionner un véhicule --',
        //     'constraints' => [new NotNull()]
        // ]);

        $builder->add('car', RemoteChoiceType::class, [
            'label' => 'Car à affecter',
            'resource' => 'cars_disponibles',
            'placeholder_text' => '-- Rechercher un véhicule --',
            'initial_value' => $options['initial_car'],
            'initial_label' => $options['initial_car_label'],
            'constraints' => [new NotNull()]
        ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'csrf_protection' => true,
            'csrf_field_name' => '_token',
            'csrf_token_id' => 'voyageaffect',
            // ── ÉTAT PRÉCÉDENT (désactivé) — 'cars' => [] : plus de chargement complet, autocomplete distant ──
            'initial_car' => null,
            'initial_car_label' => null,
        ]);
    }
}
