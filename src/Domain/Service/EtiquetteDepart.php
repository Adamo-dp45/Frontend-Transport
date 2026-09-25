<?php

namespace App\Domain\Service;

/**
 * L'étiquette d'un DÉPART, écrite à un seul endroit.
 *
 * « LI-ABI-KOR-0001-V4 · départ 2 · 24/09 à 07h00 · Gare d'Adjamé → Gare de Korhogo »
 *
 * POURQUOI UN SERVICE plutôt qu'un bout de Twig ou une fonction dans chaque écran : trois surfaces
 * doivent écrire EXACTEMENT le même libellé, sinon l'utilisateur croit voir deux départs différents
 * — le sélecteur distant des frais de route (`SearchController`), la présélection du formulaire de
 * modification d'une dépense, et la fiche d'une dépense.
 *
 * Le NUMÉRO DU JOUR y figure parce que c'est ainsi qu'un guichet désigne un départ à l'oral (« le
 * deuxième départ d'hier ») : le code voyage seul ne dit rien à celui qui saisit.
 */
final class EtiquetteDepart
{
    /** @param array<string, mixed> $voyage tel que l'API le sert (read:Voyage ou read:Depense) */
    public function pour(array $voyage): string
    {
        $quand = !empty($voyage['datedepartprevue'])
            ? new \DateTimeImmutable((string) $voyage['datedepartprevue'])
            : null;

        $trajet = ($voyage['provenance'] ?? null) && ($voyage['destination'] ?? null)
            ? $voyage['provenance'] . ' → ' . $voyage['destination']
            : null;

        return implode(' · ', array_filter([
            $voyage['codevoyage'] ?? ('#' . ($voyage['id'] ?? '?')),
            isset($voyage['numerodepart']) ? 'départ ' . $voyage['numerodepart'] : null,
            /*
                Le « à » est CONCATÉNÉ, jamais échappé dans le motif : la barre oblique de
                'DateTime::format' ne protège qu'UN octet, et sur un caractère accentué (deux octets
                en UTF-8) elle laisserait passer le second tel quel — le libellé sortirait illisible.
            */
            $quand ? $quand->format('d/m') . ' à ' . $quand->format('H\hi') : null,
            $trajet,
        ]));
    }
}
