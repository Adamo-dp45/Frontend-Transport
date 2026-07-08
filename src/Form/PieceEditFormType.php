<?php

namespace App\Form;

use App\Form\Factory\PieceFormFactory;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

class PieceEditFormType extends AbstractType
{
    public function __construct(
        private PieceFormFactory $pieceFormFactory
    )
    {
    }

    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $this->pieceFormFactory->addCommonFields($builder, $options); /*
            - Vu qu'on ne vas pas modifier le stock
        */
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'csrf_protection' => true,
            'csrf_field_name' => '_token',
            'csrf_token_id' => 'pieceedit',
            'types' => [],
            'marques' => [],
            'modeles' => []
        ]);
    }
}
