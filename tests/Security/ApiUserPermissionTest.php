<?php

namespace App\Tests\Security;

use App\Entity\ApiUser;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\TestDox;
use PHPUnit\Framework\TestCase;

/**
 * Les droits tels que le FRONT les interprète.
 *
 * Le front ne possède pas de base : il rejoue, à partir du profil renvoyé par '/api/me', la même
 * décision que le 'PermissionVoter' du backend — pour masquer un bouton plutôt que de laisser
 * l'utilisateur buter sur un 403. Les deux implémentations doivent donc rester d'accord ; c'est
 * précisément parce qu'elles sont dupliquées qu'il faut les épingler par des tests.
 *
 * Le cas sensible est 'ROLE_ADMIN_GARE' : son contournement est VOLONTAIREMENT partiel. S'il
 * devenait total, un chef de gare verrait les écrans de configuration de l'entreprise (tarifs,
 * lignes, flotte) que le serveur lui refuserait ensuite.
 */
final class ApiUserPermissionTest extends TestCase
{
    #[Test]
    #[TestDox("L'administrateur d'entreprise a tous les droits, sans rôle métier")]
    public function adminPeutTout(): void
    {
        $admin = $this->utilisateur(['ROLE_ADMIN']);

        self::assertTrue($admin->hasPermission('Tarif', 'SUPPRIMER'));
        self::assertTrue($admin->hasPermission('Voyage', 'CREER'));
    }

    #[Test]
    #[TestDox("Un agent sans rôle métier n'a aucun droit")]
    public function agentSansRoleNAAucunDroit(): void
    {
        $agent = $this->utilisateur();

        self::assertFalse($agent->hasPermission('Ticket', 'VOIR'));
    }

    #[Test]
    #[TestDox("Une permission accordée par un rôle métier est reconnue")]
    public function permissionAccordeeParUnRoleMetier(): void
    {
        $agent = $this->utilisateur(permissions: [['entity' => 'Ticket', 'action' => 'CREER']]);

        self::assertTrue($agent->hasPermission('Ticket', 'CREER'));
        self::assertFalse($agent->hasPermission('Ticket', 'SUPPRIMER'), 'une action non accordée reste refusée');
        self::assertFalse($agent->hasPermission('Courrier', 'CREER'), 'une autre entité reste refusée');
    }

    #[Test]
    #[TestDox("La comparaison ignore la casse, côté entité comme côté action")]
    public function comparaisonInsensibleALaCasse(): void
    {
        $agent = $this->utilisateur(permissions: [['entity' => 'ticket', 'action' => 'creer']]);

        // Les gabarits Twig écrivent 'TICKET_CREER' ; l'API renvoie le nom court de l'entité.
        self::assertTrue($agent->hasPermission('Ticket', 'CREER'));
        self::assertTrue($agent->hasPermission('TICKET', 'creer'));
    }

    #[Test]
    #[TestDox("L'admin de gare contourne les droits sur les entités de SON périmètre")]
    public function adminGareContourneSurSonPerimetre(): void
    {
        $chef = $this->utilisateur(['ROLE_ADMIN_GARE']);

        foreach (['Voyage', 'Ticket', 'Reservation', 'Courrier', 'Bagage', 'User', 'Role'] as $entite) {
            self::assertTrue(
                $chef->hasPermission($entite, 'MODIFIER'),
                sprintf('« %s » relève du périmètre de gare', $entite)
            );
        }
    }

    #[Test]
    #[TestDox("L'admin de gare ne contourne RIEN sur les entités de l'entreprise")]
    public function adminGareSansContournementHorsPerimetre(): void
    {
        $chef = $this->utilisateur(['ROLE_ADMIN_GARE']);

        // Configuration de la compagnie : un chef de gare ne la modifie pas. Lui ouvrir ces écrans
        // le mènerait droit à un 403 du serveur.
        foreach (['Tarif', 'Ligne', 'Gare', 'Car', 'Personnel', 'Piece', 'Entreprise'] as $entite) {
            self::assertFalse(
                $chef->hasPermission($entite, 'MODIFIER'),
                sprintf('« %s » est une entité entreprise : aucun contournement', $entite)
            );
        }
    }

    #[Test]
    #[TestDox("L'admin de gare retrouve ses droits hors périmètre s'ils lui sont explicitement accordés")]
    public function adminGareGardeSesRolesExplicites(): void
    {
        $chef = $this->utilisateur(
            ['ROLE_ADMIN_GARE'],
            permissions: [['entity' => 'Tarif', 'action' => 'VOIR']]
        );

        self::assertTrue($chef->hasPermission('Tarif', 'VOIR'), 'le rôle métier explicite prend le relais');
        self::assertFalse($chef->hasPermission('Tarif', 'MODIFIER'));
    }

    #[Test]
    #[TestDox("Les permissions de plusieurs rôles se cumulent")]
    public function permissionsCumuleesSurPlusieursRoles(): void
    {
        $agent = new ApiUser([
            'id' => 1,
            'roles' => ['ROLE_USER'],
            'userRoles' => [
                ['role' => ['permissions' => [['entity' => 'Ticket', 'action' => 'CREER']]]],
                ['role' => ['permissions' => [['entity' => 'Bagage', 'action' => 'CREER']]]],
            ],
        ]);

        self::assertTrue($agent->hasPermission('Ticket', 'CREER'));
        self::assertTrue($agent->hasPermission('Bagage', 'CREER'));
    }

    #[Test]
    #[TestDox("Un profil sans rôle métier du tout ne fait pas échouer la vérification")]
    public function profilSansRolesMetier(): void
    {
        // '/api/me' peut ne pas renvoyer 'userRoles' : la lecture doit rester défensive.
        $agent = new ApiUser(['id' => 1, 'roles' => ['ROLE_USER']]);

        self::assertFalse($agent->hasPermission('Ticket', 'VOIR'));
    }

    /**
     * @param list<string>                                $roles
     * @param list<array{entity: string, action: string}> $permissions
     */
    private function utilisateur(array $roles = ['ROLE_USER'], array $permissions = []): ApiUser
    {
        return new ApiUser([
            'id' => 1,
            'nom' => 'Test',
            'prenom' => 'Utilisateur',
            'email' => 'test@example.local',
            'roles' => $roles,
            'userRoles' => $permissions === [] ? [] : [['role' => ['permissions' => $permissions]]],
        ]);
    }
}
