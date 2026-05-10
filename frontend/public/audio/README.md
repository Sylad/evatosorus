# Evatosorus — ambiance audio

Placeholder pour le clip ambiance lu par `<AmbientAudio />` (ambiance mésozoïque).

## TODO sourcer un freesound CC0

Le composant attend `evato-ambient.mp3` à la racine de ce dossier. Tant que le
fichier n'est pas en place, le clic sur le bouton speaker entraîne un échec
silencieux côté `<audio>` (404 → `play()` rejette → on retombe muet).

### Critères

- Licence : **CC0** (vérifier la page Freesound)
- Durée : ≥ 30s, loopable proprement
- Ambiance : vent + cris reptiles / oiseaux préhistoriques au lointain. Style
  documentaire BBC "Walking with Dinosaurs" / lever du jour jurassique.
- Format : MP3 ou OGG, mono, bitrate 96-128 kbps
- Poids cible : < 1.5 MB

### Pistes Freesound suggérées

- https://freesound.org/search/?q=jurassic+ambient&f=license:%22Creative+Commons+0%22
- https://freesound.org/search/?q=prehistoric+forest&f=license:%22Creative+Commons+0%22
- https://freesound.org/search/?q=wind+jungle+distant&f=license:%22Creative+Commons+0%22
- https://freesound.org/search/?q=dinosaur+ambient&f=license:%22Creative+Commons+0%22

### Mise en place

1. Télécharger le clip choisi.
2. Si besoin, ré-encoder en MP3 128 kbps mono :
   ```bash
   ffmpeg -i original.wav -c:a libmp3lame -b:a 128k -ac 1 evato-ambient.mp3
   ```
3. Placer le fichier ici : `frontend/public/audio/evato-ambient.mp3`
4. Crédit : ajouter l'auteur Freesound dans `src/pages/about.astro`
   (section Sources) et dans le README racine.
