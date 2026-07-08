<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints as Assert;

class TarifcourrierFormType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('libelle', TextType::class, [
                'label' => 'Libellé',
                'attr' => [
                    'placeholder' => 'ex: Petits colis, Colis moyens..'
                ],
                'constraints' => [
                    new Assert\NotBlank(),
                    new Assert\Length(min: 2)
                ],
            ])
            ->add('valeurmin', IntegerType::class, [
                'label' => 'Valeur min (FCFA)',
                'attr' => [
                    'min' => 0
                ],
                'constraints' => [
                    new Assert\NotNull(),
                    new Assert\PositiveOrZero()
                ],
            ])
            ->add('valeurmax', IntegerType::class, [
                'label' => 'Valeur max (FCFA)',
                'required' => false,
                'attr' => [
                    'min' => 0,
                    'placeholder' => 'Laisser vide = illimité'
                ],
                'constraints' => [
                    new Assert\Positive()
                ]
            ])
            ->add('montanttaxe', IntegerType::class, [
                'label' => 'Taxe (FCFA)',
                'attr' => [
                    'min' => 0
                ],
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
            'csrf_token_id' => 'tarifcourrier'
        ]);
    }
}
