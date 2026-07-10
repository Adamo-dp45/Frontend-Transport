<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\EmailType;
use Symfony\Component\Form\Extension\Core\Type\FileType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\Extension\Core\Type\UrlType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints\Email;
use Symfony\Component\Validator\Constraints\File;
use Symfony\Component\Validator\Constraints\Length;
use Symfony\Component\Validator\Constraints\NotBlank;
use Symfony\Component\Validator\Constraints\Range;

class EntrepriseFormType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('libelle', TextType::class, [
                'label' => 'Libellé',
                'constraints' => [
                    new NotBlank(),
                    new Length(max: 255)
                ],
                'attr' => [
                    'placeholder' => 'Nom complet de l\'entreprise'
                ]
            ])
            ->add('sigle', TextType::class, [
                'label' => 'Sigle',
                'constraints' => [
                    new NotBlank(),
                    new Length(max: 50)
                ],
                'attr' => [
                    'placeholder' => 'ex: STIF, TSI..'
                ]
            ])
            ->add('type', ChoiceType::class, [
                'label' => 'Type d\'entreprise',
                'choices' => [
                    'SARL' => 'SARL',
                    'SA' => 'SA',
                    'SAS' => 'SAS',
                    'Entreprise individuelle' => 'EI',
                    'Autre' => 'AUTRE',
                ],
                'placeholder' => '-- Sélectionner un type --',
                'constraints' => [
                    new NotBlank()
                ]
            ])
            ->add('anneecreation', TextType::class, [
                'label' => 'Année de création',
                'required' => false,
                'attr' => [
                    'placeholder' => date('Y')
                ]
            ])
            // ── Contact ───────────────────────────────────────────────────
            ->add('email', EmailType::class, [
                'label' => 'Email',
                'required' => false,
                'constraints' => [
                    new Email()
                ]
            ])
            ->add('contact1', TextType::class, [
                'label' => 'Contact principal',
                'constraints' => [
                    new NotBlank(),
                    new Length(max: 50),
                ]
            ])
            ->add('contact2', TextType::class, [
                'label' => 'Contact secondaire',
                'required' => false
            ])
            ->add('adresse', TextType::class, [
                'label' => 'Adresse',
                'required' => false
            ])
            ->add('siteweb', UrlType::class, [
                'label' => 'Site web',
                'required' => false,
                'attr' => [
                    'placeholder' => 'https://www.exemple.com'
                ],
                'empty_data' => ''
            ])
            ->add('rccm', TextType::class, [
                'label' => 'Numéro RCCM',
                'required' => false
            ])
            ->add('banque', TextType::class, [
                'label' => 'Banque',
                'required' => false,
                'attr' => [
                    'placeholder' => 'Nom de la banque'
                ]
            ])
            ->add('centreimpot', TextType::class, [
                'label' => 'Centre des impôts',
                'required' => false
            ])
            ->add('tauxtva', IntegerType::class, [
                'label' => 'Taux TVA (%)',
                'required' => false,
                'constraints' => [
                    new Range(
                        min: 0,
                        max: 100,
                        notInRangeMessage: 'Le taux TVA doit être entre {{ min }} et {{ max }}'
                    )
                ]
            ])
            ->add('file', FileType::class, [
                'label' => 'Logo de l\'entreprise',
                'required' => false,
                'constraints' => [
                    new File(
                        maxSize: '5M',
                        mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
                        mimeTypesMessage: 'Veuillez uploader une image valide (JPG, PNG, WEBP, SVG)'
                    )
                ],
            ])
        ;
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'csrf_protection' => true,
            'csrf_field_name' => '_token',
            'csrf_token_id' => 'entreprise'
        ]);
    }
}
