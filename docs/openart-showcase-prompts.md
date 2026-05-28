# Prompts OpenArt - especes vitrines Evatosorus

Objectif : utiliser les credits OpenArt du 28 mai 2026 pour produire un lot coherent de medias vitrine, sans disperser les credits.

## Strategie credits

Priorite 1 : generer 10 images maitresses, une par espece vitrine.

Priorite 2 : choisir les 5 meilleures images et les transformer en animations courtes.

Priorite 3 : si le rendu est stable, animer les 5 restantes.

Ne pas chercher 4 variantes finales par espece des le debut. Faire 2 generations image par espece maximum, selectionner la meilleure, puis animer.

## Convention assets

Images finales :

```text
frontend/public/species-life/<species-id>.jpg
```

Animations finales :

```text
frontend/public/<video-prefix>-1.mp4
frontend/public/<video-prefix>-2.mp4
```

Prefixes videos existants :

```text
allosaurus
ankylosaurus
brachiosaurus
diplodocus
parasaurolophus
spinosaurus
stegosaurus
triceratops
tyrannosaurus-rex
velociraptor
```

Les MP4 doivent rester sous 25 MB pour Cloudflare Pages. Viser plutot 2 a 8 MB par video.

## Style commun

Base commune a coller dans chaque prompt :

```text
cinematic natural history paleoart, scientifically grounded dinosaur life scene, BBC nature documentary still, realistic anatomy, natural animal behavior, coherent late Mesozoic ecosystem, warm amber museum color grading, dramatic but believable light, detailed skin texture, environmental storytelling, no humans, no modern objects, no text, no logo, no watermark, no Jurassic Park monster design, no fantasy spikes, no oversized teeth, no inaccurate hands
```

Pour les animations OpenArt, demander un mouvement calme :

```text
subtle camera push-in, natural breathing, slow head movement, dust or mist drifting, vegetation moving gently, cinematic loop, no sudden attack, no morphing anatomy, preserve the original animal proportions
```

## Prompts images

### Tyrannosaurus rex

Fichier cible : `frontend/public/species-life/tyrannosaurus-rex.jpg`

```text
Tyrannosaurus rex adult walking along a humid floodplain in late Cretaceous North America at dawn, massive but natural posture, deep powerful skull, two-fingered arms held close, wet mud footprints, distant hadrosaurs reacting in the background, low amber sunlight through conifers and ferns, cinematic natural history paleoart, scientifically grounded dinosaur life scene, BBC nature documentary still, realistic anatomy, natural animal behavior, coherent late Mesozoic ecosystem, warm amber museum color grading, dramatic but believable light, detailed skin texture, environmental storytelling, no humans, no modern objects, no text, no logo, no watermark, no Jurassic Park monster design, no fantasy spikes, no oversized teeth, no inaccurate hands
```

Animation :

```text
subtle camera push-in, T. rex breathing slowly and turning its head slightly, dust and mist drifting over the floodplain, vegetation moving gently, cinematic loop, no running, no roaring, no morphing anatomy, preserve the original animal proportions
```

### Triceratops horridus

Fichier cible : `frontend/public/species-life/triceratops-horridus.jpg`

```text
Triceratops horridus herd crossing an open late Cretaceous floodplain, one large adult in the foreground guarding a juvenile, three horns and broad frill clearly visible, low browsing plants, muddy riverbank, distant storm clouds, calm defensive herd behavior, cinematic natural history paleoart, scientifically grounded dinosaur life scene, BBC nature documentary still, realistic anatomy, natural animal behavior, coherent late Mesozoic ecosystem, warm amber museum color grading, dramatic but believable light, detailed skin texture, environmental storytelling, no humans, no modern objects, no text, no logo, no watermark, no fantasy spikes, no oversized frill ornaments, no monster pose
```

Animation :

```text
gentle camera drift, adult Triceratops breathing and shifting weight, juvenile moving behind the adult, grass and dust moving softly, cinematic loop, no charging, no gore, preserve horn and frill anatomy
```

### Velociraptor mongoliensis

Fichier cible : `frontend/public/species-life/velociraptor-mongoliensis.jpg`

```text
Velociraptor mongoliensis in the late Cretaceous Gobi Desert, small feathered raptor the size of a turkey, alert posture beside wind-carved sandstone, feathered arms folded close, sickle claw visible, dry shrubs and pale desert light, a second raptor barely visible in the background, cinematic natural history paleoart, scientifically grounded dinosaur life scene, BBC nature documentary still, realistic anatomy, natural animal behavior, coherent late Mesozoic ecosystem, warm amber museum color grading, dramatic but believable light, detailed feathers and skin texture, environmental storytelling, no humans, no modern objects, no text, no logo, no watermark, no Jurassic Park oversized raptor, no naked scaly monster, no pronated hands
```

Animation :

```text
subtle camera push-in, feathers moving in desert wind, Velociraptor blinking and tilting its head, sand drifting, cinematic loop, no attack leap, no anatomy morphing, preserve small feathered proportions
```

### Brachiosaurus altithorax

Fichier cible : `frontend/public/species-life/brachiosaurus-altithorax.jpg`

```text
Brachiosaurus altithorax browsing high conifer branches in late Jurassic Morrison Formation, towering sauropod with longer front legs and elevated shoulders, small herd in the background, sun rays through tall araucaria-like trees, low mist near the ground, scale conveyed by tiny cycads and fallen logs, cinematic natural history paleoart, scientifically grounded dinosaur life scene, BBC nature documentary still, realistic anatomy, natural animal behavior, coherent late Mesozoic ecosystem, warm amber museum color grading, dramatic but believable light, detailed skin texture, environmental storytelling, no humans, no modern objects, no text, no logo, no watermark, no giraffe pattern, no elephant trunk, no fantasy spikes
```

Animation :

```text
slow upward camera drift, Brachiosaurus neck moving gently while browsing, leaves swaying, dust and mist drifting, cinematic loop, no fast movement, no neck stretching unnaturally, preserve sauropod proportions
```

### Stegosaurus stenops

Fichier cible : `frontend/public/species-life/stegosaurus-stenops.jpg`

```text
Stegosaurus stenops grazing among ferns in late Jurassic North America, side profile showing alternating back plates and four-spiked thagomizer tail, low browsing posture, dry seasonal woodland with cycads and conifers, another Stegosaurus partly hidden in the background, cinematic natural history paleoart, scientifically grounded dinosaur life scene, BBC nature documentary still, realistic anatomy, natural animal behavior, coherent late Mesozoic ecosystem, warm amber museum color grading, dramatic but believable light, detailed skin and plate texture, environmental storytelling, no humans, no modern objects, no text, no logo, no watermark, no oversized plates, no dragging tail, no monster aggression
```

Animation :

```text
gentle side camera drift, Stegosaurus breathing and moving its head while grazing, tail swaying slightly, ferns moving in breeze, cinematic loop, no attack, no plate morphing, preserve alternating plate anatomy
```

### Spinosaurus aegyptiacus

Fichier cible : `frontend/public/species-life/spinosaurus-aegyptiacus.jpg`

```text
Spinosaurus aegyptiacus standing in a shallow Cretaceous North African river, crocodile-like snout lowered toward fish, tall neural spine sail visible, semi-aquatic posture, mangrove-like river edge, fish ripples and wet sand, warm Sahara delta light, cinematic natural history paleoart, scientifically grounded dinosaur life scene, BBC nature documentary still, realistic anatomy, natural animal behavior, coherent late Mesozoic ecosystem, warm amber museum color grading, dramatic but believable light, detailed wet skin texture, environmental storytelling, no humans, no modern objects, no text, no logo, no watermark, no T. rex head, no monster roar, no inaccurate giant claws
```

Animation :

```text
slow camera push across water surface, Spinosaurus breathing and lowering its snout slightly, water ripples and fish movement, sail steady, reeds moving gently, cinematic loop, no sudden attack, no morphing sail, preserve semi-aquatic anatomy
```

### Ankylosaurus magniventris

Fichier cible : `frontend/public/species-life/ankylosaurus-magniventris.jpg`

```text
Ankylosaurus magniventris moving through low late Cretaceous vegetation, armored body close to the ground, bony osteoderms and heavy tail club clearly visible, warm evening light, distant tyrannosaur silhouette far away but not attacking, defensive calm behavior, cinematic natural history paleoart, scientifically grounded dinosaur life scene, BBC nature documentary still, realistic anatomy, natural animal behavior, coherent late Mesozoic ecosystem, warm amber museum color grading, dramatic but believable light, detailed armor texture, environmental storytelling, no humans, no modern objects, no text, no logo, no watermark, no turtle shell, no fantasy spikes, no upright posture
```

Animation :

```text
low camera tracking shot, Ankylosaurus breathing and slowly shifting its tail club, dust moving around armor plates, plants brushing against the body, cinematic loop, no fight, no tail strike, preserve low armored proportions
```

### Parasaurolophus walkeri

Fichier cible : `frontend/public/species-life/parasaurolophus-walkeri.jpg`

```text
Parasaurolophus walkeri herd at the edge of a late Cretaceous forest lake, adult foreground with long backward crest, several individuals drinking and calling softly in the mist, wetland plants and conifers, early morning golden fog, peaceful social behavior, cinematic natural history paleoart, scientifically grounded dinosaur life scene, BBC nature documentary still, realistic anatomy, natural animal behavior, coherent late Mesozoic ecosystem, warm amber museum color grading, dramatic but believable light, detailed skin texture, environmental storytelling, no humans, no modern objects, no text, no logo, no watermark, no duck bill caricature, no fantasy crest, no monster pose
```

Animation :

```text
slow camera drift over lake edge, Parasaurolophus raising its head and crest slightly, mist drifting, water ripples, herd moving subtly in background, cinematic loop, no stampede, no anatomy morphing
```

### Allosaurus fragilis

Fichier cible : `frontend/public/species-life/allosaurus-fragilis.jpg`

```text
Allosaurus fragilis stalking through a late Jurassic dry floodplain, lean theropod with lacrimal brow crests visible, mouth closed, alert but not monstrous, Morrison Formation woodland with ferns, cycads, and distant sauropods, late afternoon amber light, cinematic natural history paleoart, scientifically grounded dinosaur life scene, BBC nature documentary still, realistic anatomy, natural animal behavior, coherent late Mesozoic ecosystem, warm amber museum color grading, dramatic but believable light, detailed skin texture, environmental storytelling, no humans, no modern objects, no text, no logo, no watermark, no T. rex skull, no oversized teeth, no pronated hands
```

Animation :

```text
subtle tracking camera, Allosaurus breathing and turning its head toward distant sauropods, dust drifting, plants moving softly, cinematic loop, no chase, no gore, preserve lean theropod proportions
```

### Diplodocus carnegii

Fichier cible : `frontend/public/species-life/diplodocus-carnegii.jpg`

```text
Diplodocus carnegii herd crossing a broad late Jurassic river plain, extremely long horizontal neck and whip-like tail, low browsing sauropod posture, juveniles near adults, open Morrison Formation landscape with conifers and fern meadows, warm low sunlight, cinematic natural history paleoart, scientifically grounded dinosaur life scene, BBC nature documentary still, realistic anatomy, natural animal behavior, coherent late Mesozoic ecosystem, warm amber museum color grading, dramatic but believable light, detailed skin texture, environmental storytelling, no humans, no modern objects, no text, no logo, no watermark, no vertical swan neck, no elephant feet exaggeration, no fantasy spikes
```

Animation :

```text
wide slow camera pan, Diplodocus neck and tail moving gently, herd walking slowly, river mist and grasses moving, cinematic loop, no fast run, no impossible neck bend, preserve long horizontal body proportions
```

## Ordre recommande dans OpenArt

1. Tyrannosaurus rex - image + animation
2. Triceratops horridus - image + animation
3. Velociraptor mongoliensis - image + animation
4. Spinosaurus aegyptiacus - image + animation
5. Brachiosaurus altithorax - image + animation
6. Stegosaurus stenops - image seulement si les credits descendent vite
7. Ankylosaurus magniventris - image seulement si les credits descendent vite
8. Parasaurolophus walkeri - image seulement si les credits descendent vite
9. Allosaurus fragilis - image seulement si les credits descendent vite
10. Diplodocus carnegii - image seulement si les credits descendent vite

## Apres export OpenArt

Deposer les exports dans :

```text
/home/sylvain_ladoire/projects/developpeur/tmp/openart-evatosorus/
```

Puis Codex peut :

- convertir/compresser les images en JPG/WebP optimises ;
- renommer selon la convention ;
- remplacer les fichiers `species-life`;
- remplacer ou ajouter les MP4 vitrine ;
- verifier le poids des assets ;
- lancer `npm run build` dans `frontend/`;
- deployer Cloudflare Pages apres validation.
