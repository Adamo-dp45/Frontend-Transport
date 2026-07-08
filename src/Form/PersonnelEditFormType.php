<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\DateType;
use Symfony\Component\Form\Extension\Core\Type\FileType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints\File;
use Symfony\Component\Validator\Constraints\Length;
use Symfony\Component\Validator\Constraints\NotBlank;
use Symfony\Component\Validator\Constraints\NotNull;

class PersonnelEditFormType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $typeChoices = [];
        foreach($options['types'] as $type) {
            $typeChoices[$type['libelle']] = $type['id']; // label -> value
        }

        $builder
            ->add('nom', TextType::class, [
                'label' => 'Nom',
                'constraints' => [
                    new NotBlank(),
                    new Length(max: 100),
                ]
            ])
            ->add('prenom', TextType::class, [
                'label' => 'Prénom',
                'constraints' => [
                    new NotBlank(),
                    new Length(max: 100),
                ]
            ])
            ->add('contact', TextType::class, [
                'label' => 'Contact',
                'constraints' => [
                    new NotBlank(),
                    new Length(max: 50)
                ]
            ])
            ->add('code', TextType::class, [
                'label' => 'Matricule',
                'constraints' => [
                    new NotBlank(),
                    new Length(max: 50)
                ],
                'attr' => [
                    'placeholder' => 'Ex: PER-001, DRV-2024-01..',
                    'class' => 'uppercase'
                ],
                'help' => 'Identifiant unique du personnel dans votre organisation'
            ])
            ->add('typepersonnel', ChoiceType::class, [
                'label' => 'Type de personnel',
                'choices' => $typeChoices,
                'placeholder' => '-- Sélectionner un type --',
                'constraints' => [
                    new NotNull(),
                ],
            ])
            ->add('dateembauche', DateType::class, [
                'label' => 'Date d\'embauche',
                'widget' => 'single_text',
                'input' => 'datetime_immutable',
                'required' => false,
            ])
            ->add('image', FileType::class, [
                'label' => 'Photo',
                'mapped' => false,
                'required' => false,
                'constraints' => [
                    new File(
                        maxSize: '5M',
                        mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
                        mimeTypesMessage: 'Veuillez uploader une image valide (JPG, PNG, WEBP)'
                    )
                ]
            ])
        ;
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'csrf_protection' => true,
            'csrf_field_name' => '_token',
            'csrf_token_id' => 'personneledit',
            'types' => []
        ]);
    }
}
