<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\CheckboxType;
use Symfony\Component\Form\Extension\Core\Type\DateType;
use Symfony\Component\Form\Extension\Core\Type\EmailType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\Extension\Core\Type\PasswordType;
use Symfony\Component\Form\Extension\Core\Type\RepeatedType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints\IsTrue;
use Symfony\Component\Validator\Constraints\Length;
use Symfony\Component\Validator\Constraints\NotBlank;

class RegisterFormType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            # User --
            ->add('email', EmailType::class, [
                'label' => 'Email'
            ])
            ->add('nom', TextType::class, [
                'label' => 'Nom'
            ])
            ->add('prenom', TextType::class, [
                'label' => 'Prénom'
            ])
            ->add('password', RepeatedType::class, [
                'type' => PasswordType::class,
                'invalid_message' => 'Les mots de passe doivent correspondrent',
                'required' => true,
                'first_options'  => [
                    'label' => 'Mot de passe'
                ],
                'second_options' => [
                    'label' => 'Confirmez le mot de passe'
                ],
                'constraints' => [
                    new NotBlank(
                        message: 'Veuillez entrer un mot de passe'
                    ),
                    new Length(
                        min: 4,
                        minMessage: 'Votre mot de passe doit contenir au moins {{ limit }} caractères',
                        max: 4096
                    ),
                ]
            ])
            ->add('agreeTerms', CheckboxType::class, [
                'mapped' => false,
                'label' => 'J\'accepte les conditions d\'utilisation',
                'constraints' => [
                    new IsTrue(
                        message: 'Vous devez accepter nos conditions.'
                    ),
                ],
            ])

            # Entreprise ou utilise un 'EntrepriseType' --
            ->add('libelle', TextType::class, [
                'label' => 'Nom de l’entreprise'
            ])
            ->add('contact1', TextType::class, [
                'label' => 'Contact principal'
            ])
            ->add('contact2', TextType::class, [
                'label' => 'Contact secondaire',
                'required' => false
            ])
            ->add('adresse', TextType::class, [
                'label' => 'Adresse',
                'required' => false
            ])
            ->add('emailEntreprise', EmailType::class, [
                'label' => 'Email de l’entreprise',
                'required' => false
            ])
            ->add('anneecreation', DateType::class, [
                'widget' => 'single_text', // type='date'
                'format' => 'yyyy-MM-dd',
                'input' => 'datetime_immutable', // Pour indiquer le type 'DateTimeImmutable'
                'required' => false,
                'label' => 'Année de création',
                'html5' => true // Pour utiliser le sélecteur de date natif du navigateur
            ])
            ->add('sigle', TextType::class, [
                'label' => 'Sigle',
                'required' => false
            ])
            ->add('siteweb', TextType::class, [
                'label' => 'Site web',
                'required' => false
            ])
            ->add('rccm', TextType::class, [
                'label' => 'RCCM',
                'required' => false
            ])
            ->add('banque', TextType::class, [
                'label' => 'Banque',
                'required' => false
            ])
            ->add('type', TextType::class, [
                'label' => 'Type',
                'required' => false
            ])
            ->add('centreimpot', TextType::class, [
                'label' => 'Centre des impôts',
                'required' => false
            ])
            ->add('tauxtva', IntegerType::class, [
                'label' => 'Taux de TVA',
                'required' => false
            ])
            // -- Image
        ;
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'csrf_protection' => true,
            'csrf_field_name' => '_token',
            'csrf_token_id' => 'register'
        ]);
    }
}
