<?php

namespace App\Security\Voter;

use App\Entity\ApiUser;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

final class PermissionVoter extends Voter
{
    private const SYMFONY_ROLES = [
        'ROLE_USER',
        'ROLE_ADMIN',
        'ROLE_SUPER_ADMIN',
        'ROLE_ADMIN_GARE'
    ];

    protected function supports(string $attribute, mixed $subject): bool
    {
        if(in_array($attribute, self::SYMFONY_ROLES, true)) {
            return false;
        }

        return str_contains($attribute, '_'); /* Ou..
            $parts = explode('_', $attribute);
            $action = array_pop($parts);
            $entity = implode('_', $parts); -- 'VOYAGE_BUS_READ'
        */
    }

    protected function voteOnAttribute(
        string $attribute,
        mixed $subject,
        TokenInterface $token,
        ?Vote $vote = null
    ): bool
    {
        $user = $token->getUser();

        if(!$user instanceof ApiUser) {
            return false;
        }

        [$entity, $action] = explode('_', $attribute, 2); // ex: TRAJET_VOIR

        return $user->hasPermission($entity, $action);
    }
}