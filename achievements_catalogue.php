<?php
/**
 * achievements_catalogue.php — définition des succès intégrés.
 *
 * Partagé entre api.php (évaluation) et init.php (semis en base) : une seule
 * source de vérité pour les titres, les points et les succès cachés.
 */

/**
 * Catalogue des succès livrés avec la plateforme. Les points sont figés au
 * déblocage ; un succès caché n'expose ni son nom ni sa condition tant qu'il
 * n'est pas débloqué. Total : 750 points, hors First Blood qui est répétable.
 */
function builtin_achievements(): array
{
  static $catalogue = null;
  if ($catalogue !== null) {
    return $catalogue;
  }
  $catalogue = [
    // ── Visibles ──
    "builtin-first-blood" => ["🩸", "First Blood", "Être le premier à valider un challenge.", 25, false, true],
    "builtin-completiste" => ["🏆", "Complétiste", "Résoudre tous les challenges d'une catégorie.", 75, false, false],
    "builtin-rafale" => ["🚀", "Rafale", "Valider 5 flags en moins de 30 minutes.", 50, false, false],
    "builtin-eclaireur" => ["🧭", "Éclaireur", "Valider un challenge dans 3 catégories différentes en moins de 30 minutes.", 50, false, false],
    "builtin-podium-precoce" => ["🥇", "Podium précoce", "Être premier du classement, au moins 30 minutes après le lancement.", 50, false, false],
    "builtin-sans-faute" => ["🎯", "Sans faute", "Valider 3 challenges d'affilée sans un seul flag faux.", 25, false, false],
    "builtin-touche-a-tout" => ["📚", "Touche-à-tout", "Valider au moins un challenge dans chaque catégorie.", 25, false, false],
    "builtin-tete-dure" => ["🧗", "Tête dure", "Valider un challenge après au moins 10 essais ratés dessus.", 25, false, false],
    "builtin-premier-coup" => ["🎣", "Du premier coup", "Valider un challenge difficile au premier essai.", 25, false, false],
    "builtin-dernier-mot" => ["🐌", "Dernier mot", "Valider un challenge tombé à son plancher de points.", 25, false, false],
    "builtin-chasseur" => ["🔥", "Chasseur d'événement", "Valider un challenge pendant un boost de points.", 25, false, false],
    "builtin-a-l-envers" => ["🧨", "À l'envers", "Valider un challenge difficile sans avoir validé un seul challenge facile.", 25, false, false],
    "builtin-premier-contact" => ["🤝", "Premier contact", "Avoir un ami.", 25, false, false],
    // ── Cachés ──
    "builtin-remontada" => ["📈", "Remontada", "Repartir de la moitié basse du classement et atteindre le top 3.", 75, true, false],
    "builtin-perfectionniste" => ["🦾", "Perfectionniste", "Terminer une catégorie entière sans aucun flag faux.", 75, true, false],
    "builtin-collectionneur" => ["🎖️", "Collectionneur", "Débloquer 5 succès.", 75, true, false],
    "builtin-mystere" => ["🕵️", "Mystère résolu", "Résoudre un challenge mystère.", 50, true, false],
    "builtin-charismatique" => ["😎", "Charismatique", "Avoir 5 amis.", 25, true, false],
    "builtin-derniere-minute" => ["⏰", "Dernière minute", "Valider un challenge pendant la phase finale de brouillage.", 25, true, false],
  ];
  return $catalogue;
}
