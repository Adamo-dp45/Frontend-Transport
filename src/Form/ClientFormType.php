<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\EmailType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints\Length;
use Symfony\Component\Validator\Constraints\NotBlank;

class ClientFormType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('nom', TextType::class, [
                'label' => 'Nom du client',
                'constraints' => [
                    new NotBlank(),
                    new Length(max: 255)
                ]
            ])
            ->add('contact', TextType::class, [
                'label' => 'Numéro de téléphone',
                'help' => 'Identifie le client (un numéro = un client).',
                'constraints' => [
                    new NotBlank(),
                    new Length(min: 3, max: 255)
                ]
            ])
            ->add('email', EmailType::class, [
                'label' => 'Email',
                'required' => false
            ])
        ;
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'csrf_protection' => true,
            'csrf_field_name' => '_token',
            'csrf_token_id' => 'client'
        ]);
    }
}
