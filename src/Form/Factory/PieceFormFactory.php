<?php

namespace App\Form\Factory;

use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\FileType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\Validator\Constraints\File;
use Symfony\Component\Validator\Constraints\Length;
use Symfony\Component\Validator\Constraints\NotBlank;
use Symfony\Component\Validator\Constraints\NotNull;
use Symfony\Component\Validator\Constraints\Positive;

class PieceFormFactory
{
    public function addCommonFields(FormBuilderInterface $builder, array $options): void
    {
        $toChoice = fn(array $items, $name) => array_merge(
            ['-- Sélectionner ' . $name . ' --' => null],
            array_combine(
                array_column($items, 'libelle'),
                array_column($items, 'id')
            )
        ); /* - Ou.. au cas ou une des colonnes n'existe pas dans le tableau
            $toChoice = function(array $items) {
                $choices = [];
                foreach($items as $item) {
                    if(isset($item['libelle'], $item['id'])) {
                        $choices[$item['libelle']] = $item['id'];
                    }
                }
                return $choices;
            };

            - Ou.. ['data' => null] + $toChoice($options['types'], 'dd')
        */
        $builder
            ->add('libelle', TextType::class, [
                'label' => 'Libellé',
                'constraints' => [
                    new NotBlank(),
                    new Length(max: 255)
                ]
            ])
            ->add('prixunitaire', IntegerType::class, [
                'label' => 'Prix unitaire (FCFA)',
                'constraints' => [
                    new NotNull(),
                    new Positive()
                ]
            ])
            ->add('typepiece', ChoiceType::class, [
                'label' => 'Type de pièce',
                'choices' => $toChoice($options['types'], 'un type'),
                'required' => false
            ])
            ->add('marquepiece', ChoiceType::class, [
                'label' => 'Marque de pièce',
                'choices' => $toChoice($options['marques'], 'une marque'),
                'required' => false
            ])
            ->add('model', ChoiceType::class, [
                'label' => 'Modèle de pièce',
                'choices' => $toChoice($options['modeles'], 'un modèle'),
                'required' => false
            ])
            ->add('imageFile', FileType::class, [
                'label' => 'Image',
                'required' => false,
                'constraints' => [new File(
                    maxSize: '5M',
                    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
                    mimeTypesMessage: 'Image invalide (JPG, PNG, WEBP)'
                )]
            ])
        ;
    }
}