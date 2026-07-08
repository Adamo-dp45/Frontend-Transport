<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\DateTimeType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints\NotNull;
use Symfony\Component\Validator\Constraints\PositiveOrZero;

class VoyageEditFormType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        // provenance/destination dérivent de la ligne (non éditables) ; on ne modifie que la date et le car
        // ── ÉTAT PRÉCÉDENT (désactivé) — tous les cars disponibles chargés dans le select ──
        // $carChoices = [];
        // foreach ($options['cars'] as $c) {
        //     $label = $c['matricule'] . ' (' . ($c['marque']['libelle'] ?? '-') . ')';
        //     $carChoices[$label] = $c['id'];
        // }

        $builder
            // ── ÉTAT PRÉCÉDENT (désactivé) ──
            // ->add('car', ChoiceType::class, [
            //     'label' => 'Véhicule (optionnel)',
            //     'choices' => $carChoices,
            //     'required' => false
            // ])
            ->add('car', RemoteChoiceType::class, [
                'label' => 'Véhicule (optionnel)',
                'resource' => 'cars_disponibles',
                'required' => false,
                'initial_value' => $options['initial_car'],
                'initial_label' => $options['initial_car_label'],
                'placeholder_text' => '-- Rechercher un véhicule --'
            ])
            ->add('datedepartprevue', DateTimeType::class, [
                'label' => 'Date et heure de départ (prévue)',
                'widget' => 'single_text',
                'constraints' => [new NotNull()]
            ])
            ->add('datearriveeprevue', DateTimeType::class, [
                'label' => 'Date et heure d\'arrivée (prévue)',
                'widget' => 'single_text',
                'required' => false
            ])
            ->add('placesprevues', IntegerType::class, [
                'label' => 'Places prévues (capacité prévisionnelle)',
                'help' => 'Facultatif. Permet d\'ouvrir les réservations avant l\'affectation d\'un car. Une fois un car affecté, sa capacité réelle prime.',
                'required' => false,
                'attr' => ['min' => 0],
                'constraints' => [new PositiveOrZero()]
            ])
        ;
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'csrf_protection' => true,
            'csrf_field_name' => '_token',
            'csrf_token_id' => 'voyageedit',
            // ── ÉTAT PRÉCÉDENT (désactivé) — plus besoin de charger tous les cars : autocomplete distant ──
            // 'cars' => []
            'initial_car' => null,        // (édition) id du car courant, pour préselectionner l'autocomplete
            'initial_car_label' => null,  // (édition) libellé affiché
        ]);
    }
}
