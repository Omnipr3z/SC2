# 🌐 TUTORIEL DÉVELOPPEUR : SYSTÈME DE LOCALISATION MULTI-LANGUE

Le système de localisation de SimCraft 4 permet de traduire dynamiquement l'intégralité du jeu sans dupliquer les événements ni recharger les fichiers de données, grâce au flag universel `\L[KEY]` et aux dictionnaires JSON.

---

## ⚡ 1. Principe & Fonctionnement

- **Flag `\L[KEY]` (ou `\l[KEY]`)** : Remplace à la volée la balise par la chaîne correspondante dans le dictionnaire actif (`data/SC/Localisation_[LANG].json`).
- **Priorité d'expansion** : La traduction est résolue **en premier** dans `Window_Base.prototype.convertEscapeCharacters`. Cela permet à une phrase traduite de contenir elle-même d'autres codes d'échappement (ex: `\N[1]`, `\V[5]`, `\C[2]`, `\A`, etc.) qui seront ensuite normalement interprétés.
- **Support Universel** :
  - Fenêtres de messages et choix (`Window_Message`, `Window_ChoiceList`, `Window_BubbleMsg`).
  - Vocables et termes de l'interface (`TextManager`).
  - Noms et descriptions des objets de base de données (`$dataItems`, `$dataWeapons`, `$dataArmors`, `$dataSkills`, `$dataStates`) via des getters dynamiques.

---

## 📁 2. Architecture & Modularité des Fichiers (`data/SC/loc/`)

L'intégralité des textes et traductions est ordonnée de façon modulaire dans le répertoire `data/SC/loc/`, assurant la séparation stricte entre données physiques/règles et données linguistiques :

```
data/SC/loc/
├── UI_FR.json / UI_EN.json               # Menus, options, inventaire, termes système, Datapad
├── DIALOGUES_FR.json / DIALOGUES_EN.json # Dialogues scénarisés, répliques PNJ (dial_1, etc.)
├── TUTOS_FR.json / TUTOS_EN.json         # Tutoriels, briefings, aides contextuelles (tuto_1, etc.)
├── SECTORS_FR.json / SECTORS_EN.json     # Noms et descriptions des constellations et systèmes
├── PLANETS_FR.json / PLANETS_EN.json     # Noms, types et descriptions encyclopédiques des astres
├── POIS_FR.json / POIS_EN.json           # Noms et descriptions des sites d'atterrissage et stations
└── QUESTS_FR.json / QUESTS_EN.json       # Noms de missions, briefings, logs et libellés d'objectifs
```

### Fonctionnement & Fusion Automatisée :
- `SC4_Localization` charge dynamiquement tous les sous-fichiers selon la langue active (`FR` ou `EN`) et les fusionne de manière totalement transparente.
- Les fichiers racine `data/SC/PLANETS.json`, `SECTORS.json`, `POIS.json`, `QUESTS.json` constituent la **source physique unique** (orbites, coordonnées, liaisons, mécaniques) et ne contiennent aucun texte dupliqué.
- **Rétrocompatibilité totale** : Les balises `\L[KEY]` continuent de fonctionner à l'identique dans le jeu, que ce soit pour les dialogues, les menus, ou les objets.

### Règles de Résolution des Clés :
Le système supporte à la fois :
1. **La notation hiérarchique par point** : `\L[menu.item]`, `\L[dialogues.guard_intro]`, `\L[items.potion_name]`.
2. **Les clés plates directes** : `\L[newgame]`, `\L[item]`.

---

## 📝 3. Utilisation dans l'Éditeur RPG Maker MZ

### A. Dans les Événements (« Afficher un message »)
Dans la commande d'événement RPG Maker MZ standard :
```text
\A\L[dialogues.guard_intro]
```
- `\A` positionne la bulle sur le joueur.
- `\L[dialogues.guard_intro]` extrait la phrase traduite de la langue active.
- `\N[1]` présent à l'intérieur de la phrase traduite est automatiquement substitué par le nom du premier héros !

### B. Dans la Base de Données (Objets, Armes, Compétences)
Dans les champs **Nom** et **Description** de l'onglet Objets / Armes / Armures / Compétences :
- **Nom** : `\L[items.potion_name]`
- **Description** : `\L[items.potion_desc]`

Grâce aux getters dynamiques réactifs de `SC4_Localization`, changer la langue dans les options met immédiatement à jour les noms et descriptions affichés dans les menus, sans nécessiter de rechargement de sauvegarde.

### C. Dans l'Onglet Système (« Termes & Vocabulaire »)
Vous pouvez directement inscrire `\L[terms.hp]` ou `\L[newgame]` dans les champs de termes de l'éditeur. `TextManager` résout automatiquement le texte à l'affichage.

---

## ⚙️ 4. Menu des Options & Persistance

- **Option « Langue »** ajoutée directement dans le menu `Window_Options`.
- Permet de basculer en direct entre :
  - **Français** (`"FR"`)
  - **English** (`"EN"`)
- **Sauvegarde persistante** :
  - Enregistrée dans le fichier de configuration locale via `ConfigManager.locale`.
  - Synchronisée avec la variable de session `$gameSystem.locale`.
  - Le jeu redémarre systématiquement avec la dernière langue choisie par l'utilisateur.

---

## 💻 5. API Scriptable JavaScript

Vous pouvez interagir avec le système de localisation dans vos scripts ou plugins :

```javascript
// Récupérer la langue active ("FR" ou "EN")
const currentLang = SC4_Localization.locale();

// Récupérer un texte traduit par sa clé
const label = SC4_Localization.getText("menu.item", "Objets par défaut");

// Parser manuellement une chaîne contenant des flags \L
const parsed = SC4_Localization.parse("Bienvenue dans \\L[title.newGame] !");

// Forcer le changement de langue en cours de jeu
SC4_Localization.setLocale("EN"); // Synchronise ConfigManager et $gameSystem
```
