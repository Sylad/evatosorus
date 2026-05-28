# Plan OpenArt - enrichissement Evatosorus

Objectif : reprendre le 28 mai 2026, au reset des credits OpenArt, pour enrichir Evatosorus avec des images et animations coherentes plutot que des medias ajoutes au hasard.

## Intention

Faire evoluer Evatosorus vers un musee vivant du Mesozoique pour Eva :

- des scenes de vie lisibles pour les dinosaures les plus connus ;
- une identite visuelle propre a chaque espece ;
- des images et videos reliees aux fiches du Codex ;
- une integration performante dans Astro, sans ralentir inutilement le site.

## Priorite de production

Commencer par les especes vitrines :

1. Tyrannosaurus rex
2. Triceratops horridus
3. Velociraptor mongoliensis
4. Brachiosaurus altithorax
5. Stegosaurus stenops
6. Spinosaurus aegyptiacus
7. Ankylosaurus magniventris
8. Parasaurolophus walkeri
9. Allosaurus fragilis
10. Diplodocus carnegii

Ensuite, etendre par ere, biome et popularite.

## Methode

Pour chaque espece :

- definir periode, biome, comportement et ambiance ;
- generer une image scene de vie avec OpenArt ;
- transformer les meilleures images en animations courtes ;
- nommer les assets proprement avec le slug de l'espece ;
- integrer les medias dans les pages vitrine et fiche espece ;
- verifier rendu desktop/mobile, poids des fichiers et build Astro.

## Points a preparer

- Un batch de prompts OpenArt par espece.
- Une convention de fichiers pour images et videos.
- Une liste des pages a enrichir en premier.
- Une verification performance apres integration.

Prompt pack pret a utiliser :

```text
docs/openart-showcase-prompts.md
```

Exports OpenArt a deposer ici avant integration :

```text
/home/sylvain_ladoire/projects/developpeur/tmp/openart-evatosorus/
```

## Role des outils

- Sylvain : direction artistique, choix finaux, validation.
- OpenArt : generation images et animations.
- Codex : preparation des prompts, integration dans le projet, verification build/performance, enrichissement structurel du site.
- Claude Code : peut continuer a aider sur les gros ajouts de contenu ou de code selon les limites disponibles.
