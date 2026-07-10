<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints\Range;

class ConfigRemiseFormType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('maxpourcentage', IntegerType::class, [
                'label' => 'Plafond de remise manuelle (%)',
                'required' => false,
                'help' => 'Remise maximale autorisée à la vente, en % du tarif. Vide = pas de plafond. N\'affecte pas les récompenses fidélité.',
                'constraints' => [
                    new Range(
                        min: 0,
                        max: 100,
                        notInRangeMessage: 'Le plafond doit être compris entre {{ min }} et {{ max }} %'
                    )
                ]
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults(['data_class' => null]);
    }
}
