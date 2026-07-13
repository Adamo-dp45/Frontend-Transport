<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\CheckboxType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

class ConfigRecetteFormType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('courriershorsca', CheckboxType::class, [
                'label' => 'Exclure les courriers du chiffre d\'affaires',
                'required' => false,
                'help' => 'Si coché, les revenus des courriers ne comptent plus dans le CA, le bénéfice et les recettes par gare/ligne. Les statistiques courrier restent visibles.',
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults(['data_class' => null]);
    }
}
