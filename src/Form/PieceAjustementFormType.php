<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints\NotBlank;
use Symfony\Component\Validator\Constraints\NotEqualTo;
use Symfony\Component\Validator\Constraints\NotNull;

class PieceAjustementFormType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
             ->add('quantite', IntegerType::class, [
                'label' => 'Quantité (positive = entrée, négative = sortie)',
                'constraints' => [
                    new NotNull(),
                    new NotEqualTo(
                        value: 0,
                        message: 'La quantité ne peut pas être 0'
                    )
                ],
                'attr' => [
                    'placeholder' => 'ex: 10 ou -5'
                ]
            ])
            ->add('motif', TextType::class, [
                'label' => 'Motif de l\'ajustement',
                'constraints' => [
                    new NotBlank()
                ],
                'attr' => [
                    'placeholder' => 'ex: Inventaire mensuel, Correction erreur..'
                ]
            ])
        ;
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'csrf_protection' => true,
            'csrf_field_name' => '_token',
            'csrf_token_id' => 'pieceajust'
        ]);
    }
}