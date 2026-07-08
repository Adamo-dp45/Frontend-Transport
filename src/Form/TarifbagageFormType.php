<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints as Assert;

class TarifbagageFormType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('libelle', TextType::class, [
                'label' => 'Libellé',
                'attr' => [
                    'placeholder' => 'ex: Bagage léger, Bagage lourd..'
                ],
                'constraints' => [
                    new Assert\NotBlank(),
                    new Assert\Length(min: 2)
                ],
            ])
            ->add('poidsmin', IntegerType::class, [
                'label' => 'Poids min (kg)',
                'attr' => [
                    'min' => 0,
                ],
                'constraints' => [
                    new Assert\NotNull(),
                    new Assert\PositiveOrZero()
                ]
            ])
            ->add('poidsmax', IntegerType::class, [
                'label' => 'Poids max (kg)',
                'required' => false,
                'attr' => [
                    'min' => 0,
                    'placeholder' => 'Laisser vide = illimité'
                ],
                'constraints' => [
                    new Assert\Positive()
                ],
            ])
            ->add('montant', IntegerType::class, [
                'label' => 'Montant (FCFA)',
                'attr' => [
                    'min' => 0
                ],
                'constraints' => [
                    new Assert\NotNull(),
                    new Assert\Positive()
                ],
            ])
        ;
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'csrf_protection' => true,
            'csrf_field_name' => '_token',
            'csrf_token_id' => 'tarifbagage'
        ]);
    }
}
