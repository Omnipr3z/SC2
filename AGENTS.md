# Instructions et Règles SimCraft 4

## Règle de Synchronisation Éditeur RPG Maker MZ & js/plugins.js

À chaque fois que vous modifiez ou réécrivez le fichier `js/plugins.js` :
1. **Modifier impérativement le surnom (`nickname`) de l'acteur 1** dans `data/Actors.json` (par exemple en alternant entre `"Wesword"` et `"Wesword_RMMZ"`, ou en ajoutant un horodatage/suffixe de synchronisation).
2. **Raison impérative** :
   - L'éditeur RPG Maker MZ conserve la liste des plugins en mémoire. S'il n'est pas invité à recharger le projet, toute modification externe directe de `js/plugins.js` est automatiquement écrasée dès que l'utilisateur enregistre un changement dans l'éditeur.
   - En modifiant `data/Actors.json`, l'éditeur RPG Maker MZ détecte la modification externe des données du projet et affiche une invite demandant à l'utilisateur de recharger le projet.
   - Lorsque l'utilisateur recharge le projet, les nouveaux plugins déclarés dans `js/plugins.js` sont alors correctement synchronisés et conservés dans l'éditeur.
