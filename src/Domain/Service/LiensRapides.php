<?php

namespace App\Domain\Service;

use Symfony\Bundle\SecurityBundle\Security;

/**
 * LES RACCOURCIS placés sous le titre d'un écran : « et après, je vais où ? »
 *
 * Un agent qui finit de vendre un billet repart presque toujours vers l'un de deux ou trois
 * endroits — enregistrer le bagage du même client, vendre le billet suivant, clôturer sa caisse.
 * Jusqu'ici il lui fallait rouvrir le menu, choisir un groupe, puis une entrée : trois gestes pour
 * un enchaînement qu'il répète cent fois par jour.
 *
 * !! UNE SEULE TABLE, ICI, et pas des liens écrits à la main dans chaque gabarit. Semés dans les
 * templates, ils divergeraient (un écran proposerait la caisse, l'autre non) et personne ne saurait
 * lesquels existent ni lesquels manquent. C'est le même choix que 'GareScopedEntities' ou
 * 'RoleFormType::ACTIONS_SPECIFIQUES' : la liste est la documentation.
 *
 * !! LES LIENS SONT FILTRÉS PAR PERMISSION, comme le menu. Proposer un raccourci qui mène à un 403
 * est pire que ne rien proposer : l'agent apprend que l'application lui ment, et cesse de lire la
 * ligne entière.
 */
final class LiensRapides
{
    /**
     * Route courante => destinations proposées.
     *
     * DEUX À TROIS PAR ÉCRAN, pas davantage. Une rangée de six liens n'est plus un raccourci mais
     * un second menu, qu'il faut lire — donc exactement ce qu'on voulait éviter.
     *
     * Seules des routes SANS PARAMÈTRE pour l'instant : un lien vers « le départ concerné »
     * demanderait de transporter son identifiant jusqu'ici, et un raccourci qui dépend du contenu
     * de la page se construit dans la page, pas dans cette table.
     *
     * @var array<string, list<array{route: string, libelle: string, permission: string}>>
     */
    private const DESTINATIONS = [
        'ticket.new' => [
            ['route' => 'bagage.new', 'libelle' => 'Enregistrer un bagage', 'permission' => 'BAGAGE_CREER'],
            ['route' => 'ticket.new', 'libelle' => 'Vendre un autre billet', 'permission' => 'TICKET_CREER'],
            ['route' => 'caisse.index', 'libelle' => 'Ma caisse', 'permission' => 'SESSIONCAISSE_VOIR'],
        ],
        'bagage.new' => [
            ['route' => 'ticket.new', 'libelle' => 'Vendre un billet', 'permission' => 'TICKET_CREER'],
            ['route' => 'caisse.index', 'libelle' => 'Ma caisse', 'permission' => 'SESSIONCAISSE_VOIR'],
        ],
        'courrier.new' => [
            ['route' => 'courrier.new', 'libelle' => 'Envoyer un autre courrier', 'permission' => 'COURRIER_CREER'],
            ['route' => 'caisse.index', 'libelle' => 'Ma caisse', 'permission' => 'SESSIONCAISSE_VOIR'],
        ],

        /*
            PARAMÉTRAGE — l'enchaînement n'est plus celui d'un guichet mais celui d'une MISE EN
            SERVICE : une ligne n'est vendable qu'une fois ses tarifs saisis, et un tarif se saisit
            entre deux gares qui doivent déjà exister. Ces deux écrans se renvoient donc l'un à
            l'autre, et c'est l'ordre décrit par la page « prise en main » : villes → gares →
            lignes → tarifs.
        */
        'ligne.new' => [
            ['route' => 'tarif.new', 'libelle' => 'Ajouter un tarif', 'permission' => 'TARIF_CREER'],
            ['route' => 'ligne.new', 'libelle' => 'Créer une autre ligne', 'permission' => 'LIGNE_CREER'],
            ['route' => 'ligne.index', 'libelle' => 'Toutes les lignes', 'permission' => 'LIGNE_VOIR'],
        ],
        'tarif.new' => [
            ['route' => 'tarif.new', 'libelle' => 'Ajouter un autre tarif', 'permission' => 'TARIF_CREER'],
            ['route' => 'tarif.index', 'libelle' => 'La grille tarifaire', 'permission' => 'TARIF_VOIR'],
            ['route' => 'ligne.index', 'libelle' => 'Les lignes', 'permission' => 'LIGNE_VOIR'],
        ],
    ];

    public function __construct(private readonly Security $security)
    {
    }

    /**
     * Les destinations d'un écran, celles que l'acteur a le droit d'ouvrir.
     *
     * Le lien vers l'écran COURANT est conservé quand il veut dire « recommencer » (« vendre un
     * autre billet ») : après une vente, l'agent est renvoyé sur la fiche du billet émis, et ce
     * raccourci est le chemin de retour au formulaire.
     *
     * @return list<array{route: string, libelle: string}>
     */
    public function pour(?string $route): array
    {
        $liens = [];

        foreach (self::DESTINATIONS[$route] ?? [] as $lien) {
            if ($this->security->isGranted($lien['permission'])) {
                $liens[] = ['route' => $lien['route'], 'libelle' => $lien['libelle']];
            }
        }

        return $liens;
    }
}
