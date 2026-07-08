<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints as Assert;

class TarifFormType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $gareChoices = [];
        foreach ($options['gares'] as $g) {
            $label = $g['libelle'];
            if (!empty($g['ville'])) {
                $label .= ' · ' . $g['ville'];
            }
            $gareChoices[$label] = $g['id'];
        }

        $builder
            ->add('garedepart', ChoiceType::class, [
                'label' => 'Gare de départ',
                'choices' => $gareChoices,
                'placeholder' => '-- Sélectionner la gare de départ --',
                'constraints' => [new Assert\NotNull()]
            ])
            ->add('garearrivee', ChoiceType::class, [
                'label' => "Gare d'arrivée",
                'choices' => $gareChoices,
                'placeholder' => "-- Sélectionner la gare d'arrivée --",
                'constraints' => [new Assert\NotNull()]
            ])
            ->add('montant', IntegerType::class, [
                'label' => 'Montant (FCFA)',
                'attr' => ['min' => 0],
                'constraints' => [
                    new Assert\NotNull(),
                    new Assert\Positive()
                ]
            ])
        ;
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'csrf_protection' => true,
            'csrf_field_name' => '_token',
            'csrf_token_id' => 'tarif',
            'gares' => []
        ]);
    }
}
