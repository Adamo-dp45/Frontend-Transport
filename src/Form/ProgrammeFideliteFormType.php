<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\CheckboxType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints\NotNull;
use Symfony\Component\Validator\Constraints\Positive;
use Symfony\Component\Validator\Constraints\Range;

class ProgrammeFideliteFormType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('seuil', IntegerType::class, [
                'label' => 'Voyages pour une récompense',
                'help' => 'Nombre de voyages payés à atteindre pour gagner une récompense.',
                'constraints' => [
                    new NotNull(),
                    new Positive(message: 'Le seuil doit être supérieur à 0')
                ]
            ])
            ->add('recompensePourcentage', IntegerType::class, [
                'label' => 'Remise de la récompense (%)',
                'help' => '100 = voyage offert.',
                'constraints' => [
                    new NotNull(),
                    new Range(min: 1, max: 100, notInRangeMessage: 'La remise doit être comprise entre 1 et 100 %')
                ]
            ])
            ->add('actif', CheckboxType::class, [
                'label' => 'Programme actif',
                'required' => false
            ])
        ;
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => null,
            'csrf_protection' => true,
            'csrf_field_name' => '_token',
            'csrf_token_id' => 'programme_fidelite'
        ]);
    }
}
