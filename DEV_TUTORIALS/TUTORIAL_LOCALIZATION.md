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

## 📁 2. Structure des Fichiers Dictionnaires JSON

Les dictionnaires sont situés dans le dossier `data/SC/` :
- `data/SC/Localisation_FR.json` (Français)
- `data/SC/Localisation_EN.json` (Anglais)

### Exemple de structure :
```json
{
  "title": {
    "newGame": "Débuter",
    "continue": "Continuer",
    "options": "Options",
    "exit": "Quitter"
  },
  "menu": {
    "item": "Objets",
    "skill": "Compétences",
    "equip": "Équipement",
    "status": "Statut",
    "save": "Sauvegarder"
  },
  "dialogues": {
    "guard_intro": "Halte là, \\N[1] ! Présentez votre laissez-passer.",
    "guard_pass": "Tout est en ordre. Circulez."
  },
  "items": {
    "potion_name": "Potion de Soin",
    "potion_desc": "Restaure \\C[2]500 PV\\C[0] immédiatement."
  },
  "newgame": "Débuter",
  "item": "Objets"
}
```

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
