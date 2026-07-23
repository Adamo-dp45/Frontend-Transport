<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints\GreaterThan;
use Symfony\Component\Validator\Constraints\GreaterThanOrEqual;
use Symfony\Component\Validator\Constraints\LessThanOrEqual;
use Symfony\Component\Validator\Constraints\NotNull;

class ParametreReservationFormType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('delaiPresentationMinutes', IntegerType::class, [
                'label' => 'Délai de présentation (minutes avant le départ)',
                'help' => 'Dernière limite pour se présenter au guichet et retirer son billet — et limite au-delà de laquelle un départ n\'est plus réservable. Passé ce délai, une réservation payée devient un no-show à régulariser. 0 = jusqu\'au départ.',
                'constraints' => [
                    new NotNull(),
                    new GreaterThanOrEqual(value: 0, message: 'Le délai ne peut pas être négatif'),
                    new LessThanOrEqual(value: 10080, message: 'Le délai ne peut pas dépasser 7 jours (10080 min)')
                ]
            ])
            ->add('delaiPaiementMinutes', IntegerType::class, [
                'label' => 'Délai de paiement (minutes après la réservation)',
                'help' => 'Temps laissé au client pour payer, décompté dès la réservation (et jamais au-delà du délai de présentation). Non payée à l\'échéance, la réservation est perdue.',
                'constraints' => [
                    new NotNull(),
                    new GreaterThan(value: 0, message: 'Le délai de paiement doit être d\'au moins 1 minute'),
                    new LessThanOrEqual(value: 10080, message: 'Le délai ne peut pas dépasser 7 jours (10080 min)')
                ]
            ])
            ->add('penaliteType', ChoiceType::class, [
                'label' => 'Pénalité de régularisation (no-show)',
                'help' => 'Appliquée quand un client payé, absent au départ, se présente plus tard pour être reporté sur un autre départ.',
                'choices' => [
                    'Aucune pénalité' => 'AUCUNE',
                    'Montant fixe (FCFA)' => 'FIXE',
                    'Pourcentage du prix (%)' => 'POURCENTAGE',
                ],
                'constraints' => [new NotNull()],
            ])
            ->add('penaliteValeur', IntegerType::class, [
                'label' => 'Valeur de la pénalité',
                'help' => 'Montant en FCFA si « fixe », pourcentage si « pourcentage ». Ignoré si « aucune ».',
                'constraints' => [
                    new NotNull(),
                    new GreaterThanOrEqual(value: 0, message: 'La pénalité ne peut pas être négative'),
                ]
            ])
            ->add('fenetreRegularisationJours', IntegerType::class, [
                'label' => 'Fenêtre de régularisation (jours après le départ)',
                'help' => 'Au-delà de ce délai après la date prévue, une réservation no-show est définitivement perdue. (7 = une semaine)',
                'constraints' => [
                    new NotNull(),
                    new GreaterThanOrEqual(value: 0, message: 'La fenêtre ne peut pas être négative'),
                    new LessThanOrEqual(value: 365, message: 'La fenêtre ne peut pas dépasser 365 jours'),
                ]
            ])
        ;
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => null,
            'csrf_protection' => true,
            'csrf_field_name' => '_token',
            'csrf_token_id' => 'parametre_reservation'
        ]);
    }
}
