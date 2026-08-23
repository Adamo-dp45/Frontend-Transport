<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints\Length;
use Symfony\Component\Validator\Constraints\NotBlank;

class RoleFormType extends AbstractType
{
    /*
        public const ENTITIES = [
            'Gare' => 'Gare',
            'Voyage' => 'Voyage',
            'Trajet' => 'Trajet',
            'Tarif' => 'Tarif',
            'Ticket' => 'Ticket',
            'Car' => 'Véhicule',
            'Marque' => 'Marque de véhicule',
            'Depannage' => 'Dépannage',
            'Personnel' => 'Personnel',
            'Typepersonnel' => 'Type de personnel',
            'Piece' => 'Pièce',
            'Typepiece' => 'Type de pièce',
            'Marquepiece' => 'Marque de pièce',
            'Model' => 'Modèle de pièce',
            'Approvisionnement' => 'Approvisionnement',
            'Fournisseur' => 'Fournisseur',
            'Inventaire' => 'Inventaire',
            'User' => 'Utilisateur',
            'Role' => 'Rôle',
            'Typevehicule' => 'Type de véhicule',
            'Modelvehicule' => 'Modèle de véhicule',
            'Typepanne' => 'Type de panne'
        ];
    */
    public const ACTIONS = ['VOIR', 'CREER', 'MODIFIER', 'SUPPRIMER'];

    /**
     * Actions SPÉCIFIQUES à une entité, en plus des quatre actions communes ci-dessus.
     *
     * Toutes les opérations sensibles ne se ramènent pas à « modifier » : rembourser un billet
     * ('DESISTER') engage la caisse, ajuster un stock ('AJUSTER') réécrit l'inventaire, déclarer un
     * colis perdu ('DECLARER_PERDU') engage la compagnie — là où corriger un libellé ne coûte rien.
     * Les faire porter par 'MODIFIER' revenait à donner tout cela à quiconque devait rectifier une
     * saisie. Une colonne n'apparaît que sur les lignes concernées.
     *
     * À tenir synchronisé avec le catalogue du voter côté API : une action absente ici reste
     * inassignable, une action absente là-bas n'est jamais vérifiée.
     *
     * @var array<string, list<string>> nom court d'entité => actions supplémentaires
     */
    public const ACTIONS_SPECIFIQUES = [
        'Ticket' => ['DESISTER'],                 // rembourser / reporter un billet (caisse)
        'Piece' => ['AJUSTER'],                   // ajustement d'inventaire (mouvement de stock)
        'Approvisionnement' => ['ANNULER'],       // retire du stock déjà entré
        'Depannage' => ['ANNULER'],               // restaure les pièces consommées
        'Reservation' => ['ANNULER'],             // défait une réservation PAYÉE
        'Courrier' => ['DECLARER_PERDU'],         // engage la responsabilité de la compagnie
        'Bagage' => ['DECLARER_PERDU'],
    ];

    /** Colonnes de la matrice de permissions : les actions communes, puis toutes les spécifiques. */
    public static function colonnes(): array
    {
        $colonnes = self::ACTIONS;
        foreach (self::ACTIONS_SPECIFIQUES as $actions) {
            foreach ($actions as $action) {
                if (!in_array($action, $colonnes, true)) {
                    $colonnes[] = $action;
                }
            }
        }

        return $colonnes;
    }

    /** Les actions applicables à une entité donnée : les communes, puis ses spécifiques. */
    public static function actionsDe(string $entite): array
    {
        return [...self::ACTIONS, ...(self::ACTIONS_SPECIFIQUES[$entite] ?? [])];
    }

    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $entities = $options['entities'];

        $builder
            ->add('name', TextType::class, [
                'label' => 'Nom du rôle',
                'constraints' => [
                    new NotBlank(),
                    new Length(max: 100)
                ],
                'attr' => [
                    'placeholder' => 'Ex: Responsable billetterie, Chef de gare...'
                ]
            ])
            ->add('description', TextareaType::class, [
                'label' => 'Description',
                'required' => false,
                'attr' => [
                    'placeholder' => 'Décrivez les responsabilités de ce rôle...',
                    'rows' => 3
                ]
            ])
            ->add('typerole', ChoiceType::class, [
                'label' => 'Type de rôle',
                'required' => false,
                'choices' => [
                    'Administration' => 'Administration',
                    'Exploitation' => 'Exploitation',
                    'Billetterie' => 'Billetterie',
                    'Maintenance' => 'Maintenance',
                    'RH' => 'RH'
                ],
                'placeholder' => '-- Sélectionner un type --',
                'constraints' => [
                    new NotBlank()
                ],
            ])
        ;

        // Permissions : une checkbox par combinaison entity x action
        // Valeur soumise : tableau de "entity_ACTION" ex: ["Gare_VIEW", "Voyage_CREATE"]
        $permissionChoices = [];
        foreach($entities as $entityKey => $entityLabel) {
            foreach(self::actionsDe($entityKey) as $action) {
                $permissionChoices[$entityLabel . ' — ' . $action] = $entityKey . '_' . $action;
            }
        }

        $builder->add('permissions', ChoiceType::class, [
            'label' => false,
            'required' => false,
            'multiple' => true,
            'expanded' => true,
            'choices' => $permissionChoices
        ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'csrf_protection' => true,
            'csrf_field_name' => '_token',
            'csrf_token_id' => 'role',
            'entities' => []
        ]);
    }
}