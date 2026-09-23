<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\DateTimeType;
use Symfony\Component\Form\Extension\Core\Type\FileType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints\File;
use Symfony\Component\Validator\Constraints\Length;
use Symfony\Component\Validator\Constraints\NotNull;
use Symfony\Component\Validator\Constraints\Positive;

/**
 * Saisie d'une charge d'exploitation.
 *
 * Le champ GARE n'est proposé que si l'acteur peut imputer ailleurs que chez lui (option
 * 'peutImputerLibrement') : pour un agent rattaché, le serveur force sa gare et refuse toute autre
 * imputation — lui montrer un sélecteur qu'il ne peut pas utiliser produirait un refus incompris.
 */
class DepenseFormType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $toChoice = fn(array $items, string $vide) => array_merge(
            [$vide => null],
            array_combine(
                array_column($items, 'libelle'),
                array_column($items, 'id')
            )
        );

        $builder
            ->add('datedepense', DateTimeType::class, [
                'label' => 'Date de la dépense',
                'widget' => 'single_text',
                'constraints' => [new NotNull()],
                'help' => 'La date à laquelle la charge a été engagée, pas celle de la saisie.',
            ])
            ->add('montant', IntegerType::class, [
                'label' => 'Montant (FCFA)',
                'constraints' => [
                    new NotNull(),
                    new Positive(message: 'Le montant doit être supérieur à zéro'),
                ],
                'attr' => ['min' => 1, 'placeholder' => '0'],
            ])
            ->add('typedepense', ChoiceType::class, [
                'label' => 'Poste de dépense',
                'choices' => $toChoice($options['types'], '-- Sélectionner un poste --'),
                'constraints' => [new NotNull(message: 'Le poste de dépense est obligatoire')],
            ])
            ->add('modereglement', ChoiceType::class, [
                'label' => 'Mode de règlement',
                'choices' => [
                    'Espèces' => 'ESPECES',
                    'Mobile Money' => 'MOBILE_MONEY',
                    'Virement' => 'VIREMENT',
                    'Chèque' => 'CHEQUE',
                ], // miroir de App\Domain\Enum\Modereglement côté API
                'help' => 'Les dépenses en espèces sortent de la caisse de la gare.',
            ])
            ->add('libelle', TextType::class, [
                'label' => 'Objet',
                'required' => false,
                'constraints' => [new Length(max: 255)],
                'attr' => ['placeholder' => 'Gasoil des départs du jour'],
            ])
            ->add('beneficiaire', TextType::class, [
                'label' => 'Bénéficiaire',
                'required' => false,
                'constraints' => [new Length(max: 255)],
                'attr' => ['placeholder' => 'À qui la somme a été versée'],
            ])
            ->add('fournisseur', ChoiceType::class, [
                'label' => 'Fournisseur',
                'choices' => $toChoice($options['fournisseurs'], '-- Aucun --'),
                'required' => false,
                'help' => 'À renseigner seulement si le bénéficiaire est un fournisseur déjà enregistré.',
            ])
            ->add('justificatifFile', FileType::class, [
                'label' => 'Justificatif',
                'required' => false,
                'help' => 'Photo du reçu ou facture (JPG, PNG, WEBP ou PDF, 5 Mo maximum).',
                'constraints' => [new File(
                    maxSize: '5M',
                    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
                    mimeTypesMessage: 'Fichier invalide (JPG, PNG, WEBP ou PDF)'
                )],
            ])
        ;

        if($options['peutImputerLibrement']) {
            $builder->add('gare', ChoiceType::class, [
                'label' => 'Imputer à',
                'choices' => $toChoice($options['gares'], 'Siège (charge de l\'entreprise)'),
                'required' => false,
                'help' => 'Sans gare, la charge est portée par le siège : loyer, salaires de la direction.',
            ]);
        }
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'csrf_protection' => true,
            'csrf_field_name' => '_token',
            'csrf_token_id' => 'depense',
            'types' => [],
            'gares' => [],
            'fournisseurs' => [],
            'peutImputerLibrement' => false,
        ]);
    }
}
