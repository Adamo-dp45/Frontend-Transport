<?php

namespace App\Controller\Trait;

/**
 * Détermine si l'utilisateur courant peut AGIR (livrer, perdre, annuler, désister, modifier, supprimer…)
 * sur un objet rattaché à une gare donnée. Miroir côté FT de 'App\Security\GareGuard' (backend) : les admins
 * et les utilisateurs centraux (sans gare) ne sont pas restreints ; un agent de gare doit être sur la gare visée.
 *
 * Sert à masquer les boutons d'action quand le backend les refuserait (mauvaise gare).
 */
trait GareActionTrait
{
    private function peutAgirSurGare(?int $gareId): bool
    {
        if ($this->isGranted('ROLE_ADMIN') || $this->isGranted('ROLE_SUPER_ADMIN')) {
            return true;
        }
        $userGare = $this->getUser()->getGare();
        if ($userGare === null) {
            return true; // utilisateur central sans gare : non restreint
        }
        return ($userGare['id'] ?? null) === $gareId;
    }

    /**
     * L'utilisateur courant est-il le COMMERCIAL (vendeur à bord) de ce billet ? Le commercial vend
     * depuis la position du car : la gare de montée du billet n'est PAS sa gare d'attache, donc
     * peutAgirSurGare() le refuserait. Il doit pourtant pouvoir agir sur ses propres ventes à bord
     * (imprimer, rattacher un bagage…).
     */
    private function estCommercialDe(?int $commercialId): bool
    {
        return $commercialId !== null && $this->getUser()?->getId() === $commercialId;
    }
}
