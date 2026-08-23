<?php

namespace App\Tests\Security;

use App\Entity\ApiUser;
use App\Security\Voter\PermissionVoter;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\TestDox;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\VoterInterface;

/**
 * Le voter qui traduit 'is_granted("TICKET_CREER")' des gabarits Twig en une décision métier.
 *
 * Deux comportements protègent le reste de l'application :
 *   · il DÉCLINE les rôles Symfony ('ROLE_ADMIN'…) pour laisser le voter natif les traiter — s'il
 *     s'en emparait, il répondrait « non » à un administrateur, qui perdrait accès à tout ;
 *   · il coupe l'attribut au PREMIER souligné, de sorte qu'une action composée reste intacte.
 */
final class PermissionVoterTest extends TestCase
{
    private PermissionVoter $voter;

    protected function setUp(): void
    {
        $this->voter = new PermissionVoter();
    }

    #[Test]
    #[TestDox("Un attribut « ENTITE_ACTION » accordé donne un accès autorisé")]
    public function attributAccorde(): void
    {
        $token = $this->token($this->utilisateur([['entity' => 'Ticket', 'action' => 'CREER']]));

        self::assertSame(
            VoterInterface::ACCESS_GRANTED,
            $this->voter->vote($token, null, ['TICKET_CREER'])
        );
    }

    #[Test]
    #[TestDox("Un attribut non accordé est refusé")]
    public function attributRefuse(): void
    {
        $token = $this->token($this->utilisateur([['entity' => 'Ticket', 'action' => 'CREER']]));

        self::assertSame(
            VoterInterface::ACCESS_DENIED,
            $this->voter->vote($token, null, ['TICKET_SUPPRIMER'])
        );
    }

    #[Test]
    #[TestDox("Les rôles Symfony ne sont pas traités par ce voter : il s'abstient")]
    public function rolesSymfonyAbstention(): void
    {
        $token = $this->token($this->utilisateur());

        foreach (['ROLE_USER', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN_GARE'] as $role) {
            self::assertSame(
                VoterInterface::ACCESS_ABSTAIN,
                $this->voter->vote($token, null, [$role]),
                sprintf('« %s » revient au voter natif de Symfony', $role)
            );
        }
    }

    #[Test]
    #[TestDox("Un attribut sans souligné n'est pas de son ressort")]
    public function attributSansSouligne(): void
    {
        $token = $this->token($this->utilisateur());

        self::assertSame(
            VoterInterface::ACCESS_ABSTAIN,
            $this->voter->vote($token, null, ['QUELQUECHOSE'])
        );
    }

    #[Test]
    #[TestDox("Le découpage se fait au PREMIER souligné : l'action composée reste entière")]
    public function decoupageAuPremierSouligne(): void
    {
        // 'CONFIG_RECETTE_MODIFIER' doit se lire comme (CONFIG, RECETTE_MODIFIER) — c'est le
        // contrat actuel du voter. Découper au dernier souligné changerait l'entité visée.
        $token = $this->token($this->utilisateur([['entity' => 'CONFIG', 'action' => 'RECETTE_MODIFIER']]));

        self::assertSame(
            VoterInterface::ACCESS_GRANTED,
            $this->voter->vote($token, null, ['CONFIG_RECETTE_MODIFIER'])
        );
    }

    #[Test]
    #[TestDox("Un visiteur non connecté est refusé")]
    public function utilisateurNonConnecte(): void
    {
        $token = $this->createStub(TokenInterface::class);
        $token->method('getUser')->willReturn(null);

        self::assertSame(
            VoterInterface::ACCESS_DENIED,
            $this->voter->vote($token, null, ['TICKET_VOIR'])
        );
    }

    /** @param list<array{entity: string, action: string}> $permissions */
    private function utilisateur(array $permissions = []): ApiUser
    {
        return new ApiUser([
            'id' => 1,
            'roles' => ['ROLE_USER'],
            'userRoles' => $permissions === [] ? [] : [['role' => ['permissions' => $permissions]]],
        ]);
    }

    /** Un STUB et non un mock : on ne vérifie rien sur le jeton, il ne sert qu'à porter l'utilisateur. */
    private function token(ApiUser $user): TokenInterface
    {
        $token = $this->createStub(TokenInterface::class);
        $token->method('getUser')->willReturn($user);

        return $token;
    }
}
