<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints\Length;
use Symfony\Component\Validator\Constraints\NotBlank;

class TicketEditFormType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('nomclient', TextType::class, [
                'label' => 'Nom du passager',
                'constraints' => [
                    new NotBlank(),
                    new Length(max: 150)
                ]
            ])
            ->add('contactclient', TextType::class, [
                'label' => 'Contact',
                'constraints' => [
                    new NotBlank(),
                    new Length(max: 50)
                ]
            ])
        ;
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'csrf_protection' => true,
            'csrf_field_name' => '_token',
            'csrf_token_id' => 'ticket'
        ]);
    }
}
