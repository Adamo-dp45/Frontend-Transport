<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\DateTimeType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints\Length;
use Symfony\Component\Validator\Constraints\NotBlank;
use Symfony\Component\Validator\Constraints\NotNull;
use Symfony\Component\Validator\Constraints\Positive;

class CarFormType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $marqueChoices = array_merge(
            ['-- Sélectionner une marque --' => null],
                array_combine(
                array_column($options['marques'], 'libelle'),
                array_column($options['marques'], 'id')
            )
        );
        $modelvehicules = array_merge(
            ['-- Sélectionner une modèle --' => null],
                array_combine(
                array_column($options['modelvehicules'], 'libelle'),
                array_column($options['modelvehicules'], 'id')
            )
        );
        $typevehicules = array_merge(
            ['-- Sélectionner une type --' => null],
                array_combine(
                array_column($options['typevehicules'], 'libelle'),
                array_column($options['typevehicules'], 'id')
            )
        );

        $builder
            ->add('matricule', TextType::class, [
                'label' => 'Immatriculation',
                'constraints' => [
                    new NotBlank(),
                    new Length(max: 50)
                ]
            ])
            ->add('nbrsiege', IntegerType::class, [
                'label' => 'Nombre de sièges',
                'constraints' => [
                    new NotNull(),
                    new Positive()
                ],
                'attr' => [
                    'min' => 1
                ]
            ])
            ->add('datearrivee', DateTimeType::class, [
                'label' => 'Date d\'arrivée',
                'widget' => 'single_text'
            ])
            ->add('etat', ChoiceType::class, [
                'label' => 'État',
                'choices' => [
                    'Disponible' => 'DISPONIBLE',
                    'En mission' => 'EN_VOYAGE',
                    'En panne' => 'EN_PANNE',
                    'En maintenance'=> 'EN_MAINTENANCE'
                ],
                'placeholder' => '-- Sélectionner un état --',
                'constraints' => [
                    new NotBlank()
                ]
            ])
            ->add('marque', ChoiceType::class, [
                'label' => 'Marque',
                'choices' => $marqueChoices,
                'required' => false
            ])
            ->add('modelvehicule', ChoiceType::class, [
                'label' => 'Modèle',
                'choices' => $modelvehicules,
                'required' => false
            ])
            ->add('typevehicule', ChoiceType::class, [
                'label' => 'Type',
                'choices' => $typevehicules,
                'required' => false
            ])
            ->add('siegesGauche', IntegerType::class, [
                'label' => 'Sièges par rangée (côté gauche)',
                'help' => 'Nombre de sièges par rangée du côté gauche ; le nombre de rangées est déduit du nombre total de sièges',
                // 'help_html' => true
            ])
            ->add('siegesDroite', IntegerType::class, [
                'label' => 'Sièges par rangée (côté droit)',
                'help' => 'Nombre de sièges par rangée du côté droit ; le nombre de rangées est déduit du nombre total de sièges'
            ])
        ;
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'csrf_protection' => true,
            'csrf_field_name' => '_token',
            'csrf_token_id' => 'car',
            'marques' => [],
            'modelvehicules' => [],
            'typevehicules' => []
        ]);
    }
}
