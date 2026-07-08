<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints\NotBlank;
use Symfony\Component\Validator\Constraints\NotNull;

class DepannageAffectationFormType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        // ── ÉTAT PRÉCÉDENT (désactivé) — tout le personnel chargé dans le select ──
        // $personnelChoices = [];
        // foreach ($options['personnels'] as $p) {
        //     $type  = $p['typepersonnel']['libelle'] ?? 'N/A';
        //     $label = $p['prenom'] . ' ' . $p['nom'] . ' (' . $type . ')';
        //     $personnelChoices[$label] = $p['id'];
        // }

        $builder
            // ── ÉTAT PRÉCÉDENT (désactivé) ──
            // ->add('personnel', ChoiceType::class, [
            //     'label' => 'Personnel à affecter',
            //     'choices' => $personnelChoices,
            //     'placeholder' => '-- Sélectionner un personnel --',
            //     'constraints' => [new NotNull()]
            // ])
            ->add('personnel', RemoteChoiceType::class, [
                'label' => 'Personnel à affecter',
                'resource' => 'personnels',
                'placeholder_text' => '-- Rechercher un personnel --',
                'constraints' => [
                    new NotNull()
                ]
            ])
            ->add('motif', TextType::class, [
                'label' => 'Motif',
                'constraints' => [
                    new NotBlank()
                ],
                'attr' => [
                    'placeholder' => 'Ex: Mécanicien affecté pour réparation moteur...'
                ]
            ])
        ;
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'csrf_protection' => true,
            'csrf_field_name' => '_token',
            'csrf_token_id' => 'depannageaffect',
            // ── ÉTAT PRÉCÉDENT (désactivé) — 'personnels' => [] : plus de chargement complet, autocomplete distant ──
        ]);
    }
}
