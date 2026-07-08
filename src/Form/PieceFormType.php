<?php

namespace App\Form;

use App\Form\Factory\PieceFormFactory;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints\NotNull;
use Symfony\Component\Validator\Constraints\PositiveOrZero;

class PieceFormType extends AbstractType
{
    public function __construct(
        private PieceFormFactory $pieceFormFactory
    )
    {
    }

    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $this->pieceFormFactory->addCommonFields($builder, $options);
        $builder
            ->add('stockinitial', IntegerType::class, [
                'label' => 'Stock initial',
                'constraints' => [
                    new NotNull(),
                    new PositiveOrZero()
                ],
                'attr' => [
                    'placeholder' => '0',
                    'min' => 0
                ]
            ])
        ;
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'csrf_protection' => true,
            'csrf_field_name' => '_token',
            'csrf_token_id' => 'piece',
            'types' => [],
            'marques' => [],
            'modeles' => []
        ]);
    }
}
