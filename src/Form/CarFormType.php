<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\DateTimeType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
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
            ->add('plansieges', TextareaType::class, [
                'label' => 'Plan de sièges',
                'required' => false,
                'help' => 'Une rangée par ligne, numéros séparés par des espaces, « . » pour une allée ou un vide. Ex : « 3 4 5 . 2 1 ». Laissé vide, un plan standard est généré depuis les colonnes gauche/droite. Le nombre de sièges est déduit du plan.',
                'attr' => ['rows' => 6, 'class' => 'font-mono', 'placeholder' => "3 4 5 . 2 1\n8 9 10 . 7 6\n. . . . . 11\n14 15 . . 13 12\nB: 16 17 18 19 20"],
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
