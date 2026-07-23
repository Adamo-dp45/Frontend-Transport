<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\DateType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints\Length;
use Symfony\Component\Validator\Constraints\NotBlank;
use Symfony\Component\Validator\Constraints\NotNull;

class GareFormType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $villeChoices = [];
        foreach ($options['villes'] as $v) {
            $villeChoices[$v['nom']] = $v['id'];
        }

        $builder
            ->add('libelle', TextType::class, [
                'label' => 'Nom de la gare',
                'constraints' => [
                    new NotBlank(),
                    new Length(max: 150)
                ]
            ])
            ->add('ville', ChoiceType::class, [
                'label' => 'Ville',
                'choices' => $villeChoices,
                'placeholder' => '-- Sélectionner une ville --',
                'constraints' => [new NotNull()]
            ])
            ->add('chefgare', TextType::class, [
                'label' => 'Chef de gare',
                'constraints' => [
                    new NotBlank(),
                    new Length(max: 150)
                ]
            ])
            ->add('description', TextareaType::class, [
                'label' => 'Description',
                'constraints' => [
                    new Length(max: 150)
                ],
                'required' => false
            ])
            ->add('contact1', TextType::class, [
                'label' => 'Contact principal',
                'constraints' => [
                    new NotBlank(), 
                    new Length(max: 150)
                ]
            ])
            ->add('contact2', TextType::class, [
                'label' => 'Contact secondaire',
                'constraints' => [
                    new Length(max: 150)
                ],
                'required' => false
            ])
            ->add('datecreation', DateType::class, [
                'label' => 'Date de création',
                'widget' => 'single_text',
                'input' => 'datetime_immutable',
                'required' => false,
            ])
        ;
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'csrf_protection' => true,
            'csrf_field_name' => '_token',
            'csrf_token_id' => 'gare',
            'villes' => []
        ]);
    }
}
