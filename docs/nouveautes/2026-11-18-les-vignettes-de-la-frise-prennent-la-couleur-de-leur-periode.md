---
title: Les vignettes de la frise prennent la couleur de leur période
date: 2026-11-18
created: 2026-11-18T14:55+01:00
lots: [L32]
captures: [{ file: captures/L32-frise-bureau.png, alt: "La frise du Mésozoïque sur ordinateur, curseur à 145 Ma : sous la bande Trias, Jurassique, Crétacé, quatre rangées de six vignettes, liseré rouille pour Éoraptor, Cœlophysis et Plateosaure, vert jade pour les six espèces du Jurassique, ambre pour le Crétacé" }, { file: captures/L32-frise-telephone.png, alt: "La même frise sur téléphone, vignettes sur deux colonnes : les trois espèces du Trias cerclées de rouille, puis Allosaure, Stégosaure et Compsognathus éclairés par le curseur au milieu des vignettes jade du Jurassique" }]
---
Dans la **frise interactive** de la page « Voyage temporel », chaque vignette d'espèce porte désormais un fin liseré de la couleur de **sa** période, la même que sur la bande de la frise, les fiches et la carte : **rouille** pour les 3 espèces du Trias, **jade** pour les 6 du Jurassique, **ambre** pour les 13 du Crétacé.

Jusqu'ici, les 22 vignettes étaient toutes cerclées d'ambre, comme si elles venaient du Crétacé. L'effet reste discret : le liseré est fin, et les espèces éclairées par le curseur gardent leur cadre doré.

En coulisses, les couleurs des trois périodes n'existent plus qu'à un seul endroit du code, et un test vérifie qu'aucune page ne les recopie.
