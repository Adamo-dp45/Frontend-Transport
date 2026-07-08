<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\DateTimeType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints as Assert;

class VoyageFormType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        // ── ÉTAT PRÉCÉDENT (désactivé) — toutes les lignes/cars étaient chargées dans le select ──
        // $ligneChoices = [];
        // foreach ($options['lignes'] as $l) {
        //     $label = $l['libelle']
        //         ?? (($l['gareorigine']['libelle'] ?? '?') . ' → ' . ($l['gareterminus']['libelle'] ?? '?'));
        //     $label .= ' (' . ($l['codeligne'] ?? '') . ')';
        //     $ligneChoices[$label] = $l['id'];
        // }
        // $carChoices = [];
        // foreach($options['cars'] as $c) {
        //     $label = $c['matricule'] . ' (' . ($c['marque']['libelle'] ?? '-') . ')';
        //     $carChoices[$label] = $c['id'];
        // }

        $builder
            // ── ÉTAT PRÉCÉDENT (désactivé) — ChoiceType avec toutes les lignes ──
            // ->add('ligne', ChoiceType::class, [
            //     'label' => 'Ligne',
            //     'choices' => $ligneChoices,
            //     'placeholder' => '-- Sélectionner une ligne --',
            //     'constraints' => [new Assert\NotNull()]
            // ])
            ->add('ligne', RemoteChoiceType::class, [
                'label' => 'Ligne',
                // Doctrine : à la création, une gare ne voit que les lignes dont elle est l'ORIGINE
                // (admin/central → toutes). L'enforcement réel est côté API (VoyageGuard::assertPeutPlanifier).
                'resource' => 'lignes_origine',
                'placeholder_text' => '-- Rechercher une ligne --',
                'constraints' => [new Assert\NotNull()]
            ])
            ->add('datedepartprevue', DateTimeType::class, [
                'label' => 'Date et heure de départ (prévue)',
                'widget' => 'single_text',
                'constraints' => [new Assert\NotNull()]
            ])
            ->add('datearriveeprevue', DateTimeType::class, [
                'label' => 'Date et heure d\'arrivée (prévue)',
                'widget' => 'single_text',
                'required' => false
            ])
            // ── ÉTAT PRÉCÉDENT (désactivé) — ChoiceType avec tous les cars ──
            // ->add('car', ChoiceType::class, [
            //     'label' => 'Car',
            //     'choices' => [
            //         '-- Aucun car (optionnel) --' => null,
            //     ] + $carChoices,
            //     'required' => false,
            //     'help' => 'Seule les cars disponibles sont affichés'
            // ])
            ->add('car', RemoteChoiceType::class, [
                'label' => 'Car',
                'resource' => 'cars_disponibles',
                'required' => false,
                'placeholder_text' => '-- Rechercher un car (optionnel) --'
            ])
            ->add('placesprevues', IntegerType::class, [
                'label' => 'Places prévues (capacité prévisionnelle)',
                'help' => 'Facultatif. Permet d\'ouvrir les réservations avant l\'affectation d\'un car. Une fois un car affecté, sa capacité réelle prime.',
                'required' => false,
                'attr' => ['min' => 0],
                'constraints' => [new Assert\PositiveOrZero()]
            ])
        ;
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'csrf_protection' => true,
            'csrf_field_name' => '_token',
            'csrf_token_id' => 'voyage',
            // ── ÉTAT PRÉCÉDENT (désactivé) — plus besoin de passer toutes les lignes/cars : autocomplete distant ──
            // 'lignes' => [],
            // 'cars' => []
        ]);
    }
}
