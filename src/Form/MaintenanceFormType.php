<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\CheckboxType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

class MaintenanceFormType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('actif', CheckboxType::class, [
                'label' => 'Activer le mode maintenance',
                'required' => false,
                'help' => 'Quand c\'est activé, seul le super admin peut accéder à l\'application (interface + API). Tous les autres voient une page de maintenance.',
            ])
            ->add('message', TextareaType::class, [
                'label' => 'Message affiché (optionnel)',
                'required' => false,
                'help' => 'Message montré aux utilisateurs pendant la maintenance. Vide = message par défaut.',
                'attr' => ['rows' => 3, 'placeholder' => 'Ex : Maintenance planifiée, retour prévu à 14h.'],
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults(['data_class' => null]);
    }
}
