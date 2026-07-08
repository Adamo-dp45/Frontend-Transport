<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\EmailType;
use Symfony\Component\Form\Extension\Core\Type\PasswordType;
use Symfony\Component\Form\Extension\Core\Type\RepeatedType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints\Email;
use Symfony\Component\Validator\Constraints\Length;
use Symfony\Component\Validator\Constraints\NotBlank;

class UserEditFormType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $availableRoles = $options['available_roles'] ?? []; // La liste des rôles disponibles passés en option depuis le controller
        $roleChoices = [];
        foreach($availableRoles as $role) {
            $label = isset($role['typerole']) 
                ? $role['name'] . ' (' . $role['typerole'] . ')'
                : $role['name']
            ; /* Ou..
                if(!isset($role['typerole'])) {
                    continue;
                }
            */
            $roleChoices[$label] = $role['id'];
        }

        $availableGares = $options['available_gares'] ?? [];
        $gareChoices = [];
        foreach($availableGares as $gare) {
            $gareChoices[$gare['libelle'] . ' - ' . $gare['ville']] = $gare['id'];
        }
        $gareChoices = ['-- Choisir une gare --' => null] + $gareChoices;

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
                    new Length(max: 100)
                ]
            ])
            ->add('email', EmailType::class, [
                'label' => 'Adresse email',
                'constraints' => [
                    new NotBlank(),
                    new Email(),
                ]
            ])
           ->add('password', RepeatedType::class, [
                'type' => PasswordType::class,
                'invalid_message' => 'Les mots de passe doivent correspondrent',
                'required' => false,
                'first_options'  => [
                    'label' => 'Nouveau mot de passe',
                    'attr' => [
                        'autocomplete' => 'new-password'
                    ]
                ],
                'second_options' => [
                    'label' => 'Confirmez le mot de passe'
                ],
                'constraints' => [
                    new Length(
                        min: 4,
                        minMessage: 'Votre mot de passe doit contenir au moins {{ limit }} caractères',
                        max: 4096
                    ),
                ]
            ])
            ->add('roles', ChoiceType::class, [
                'label' => 'Rôles',
                'required' => false,
                'multiple' => true,
                'expanded' => true,
                'choices' => $roleChoices
            ])
        ;

        if(!$options['hide_gare']) {
            $builder->add('gare', ChoiceType::class, [
                'label' => 'Gare',
                'required' => false,
                'placeholder' => '-- Choisir la gare --',
                'choices' => $gareChoices
            ]);
        }
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'csrf_protection' => true,
            'csrf_field_name' => '_token',
            'csrf_token_id' => 'useredit',
            'available_roles' => [],
            'available_gares' => [],
            'hide_gare' => false
        ]);
    }
}
