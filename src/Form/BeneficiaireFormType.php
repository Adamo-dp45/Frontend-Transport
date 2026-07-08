<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints\Length;
use Symfony\Component\Validator\Constraints\NotBlank;

class BeneficiaireFormType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('nom', TextType::class, [
                'label' => 'Nom',
                'constraints' => [
                    new NotBlank(),
                    new Length(max: 255)
                ]
            ])
            ->add('categorie', ChoiceType::class, [
                'label' => 'Catégorie',
                'placeholder' => '-- Sélectionner une catégorie --',
                'choices' => [
                    'Étudiant'   => 'ETUDIANT',
                    'Enfant'     => 'ENFANT',
                    '3e âge'     => 'TROISIEME_AGE',
                    'Personnel'  => 'PERSONNEL',
                    'Militaire'  => 'MILITAIRE',
                    'Partenaire' => 'PARTENAIRE',
                    'Autre'      => 'AUTRE',
                ],
                'constraints' => [new NotBlank()]
            ])
            ->add('contact', TextType::class, [
                'label' => 'Contact',
                'required' => false,
                'constraints' => [new Length(max: 255)]
            ])
        ;
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'csrf_protection' => true,
            'csrf_field_name' => '_token',
            'csrf_token_id' => 'beneficiaire'
        ]);
    }
}
