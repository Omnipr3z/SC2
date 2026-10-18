# ⭕ TUTORIEL DÉVELOPPEUR : MENU CIRCULAIRE ROTATIF (RING COMMAND)

Le système de **Ring Command** de SimCraft 4 offre une interface de sélection circulaire moderne (type « Secret of Mana » ou menu radial interactif), avec une animation d'ouverture fluide, un support complet des icônes et une intégration native sur la carte de jeu.

---

## 🌟 1. Caractéristiques Principales

- **Classe ES7 Moderne** : `Window_RingCommand extends Window_Command`.
- **Disposition Radiale** : Répartition angulaire équilibrée des commandes en cercle autour du centre.
- **Animation d'Ouverture Fluide (Ease-Out)** : Le rayon (`_radius`) s'agrandit progressivement de 0 jusqu'à son rayon cible (`_targetRadius`) à l'ouverture.
- **Support des Icônes Multi-Formats** :
  - Index numérique d'icônetier RMMZ standard (`16`, `64`, etc.) rendu via `drawIcon`.
  - Chaînes emojis (`"⚔️"`, `"🎒"`, `"✨"`, `"⚙️"`).
- **Navigation Circulaire Naturelle** :
  - Clavier / Manette : `cursorRight` (avance en sens horaire), `cursorLeft` (recule en sens anti-horaire) avec rebouclage propre.
  - Souris / Tactile : Survol et clic direct sur chaque option.
- **Intégration Carte (`Scene_Map`)** :
  - Clic ou appui tactile sur le héros pour ouvrir le menu contextuel.
  - Centrage automatique sur le personnage ou la cible avec **Edge Clamping** pour ne jamais déborder hors de l'écran.

---

## 📋 2. Structure d'une Liste de Commandes

Chaque commande du menu est définie par un objet JavaScript :

```javascript
const mesCommandes = [
    { 
        name: "\\L[menu.item]",  // Nom (supporte la localisation dynamique \L[KEY])
        symbol: "item",          // Identifiant unique de l'action
        enabled: true,           // Actif ou grisé (true / false)
        icon: "🎒",              // Icône (emoji ou index numérique d'icônetier RMMZ)
        ext: null                // Données d'extension optionnelles
    },
    { 
        name: "Attaquer", 
        symbol: "attack", 
        enabled: true, 
        icon: 16                 // Index 16 de l'icônetier RMMZ (Épée)
    },
    { 
        name: "Magie", 
        symbol: "magic", 
        enabled: false,          // Grisé (non sélectionnable)
        icon: "✨" 
    },
    { 
        name: "Options", 
        symbol: "options", 
        enabled: true, 
        icon: "⚙️" 
    }
];
```

---

## 🗺️ 3. Intégration sur la Carte (`Scene_Map`)

### A. Déclenchement au Clic sur le Héros
Par défaut, lorsque le joueur clique ou tape sur l'empreinte du héros (zone 48x48 centrée au pied) en dehors d'un combat ou d'un événement en cours :
- Le menu circulaire s'ouvre centré sur le héros.
- Les commandes par défaut sont injectées :
  - `\L[menu.item]` (Objets)
  - `\L[menu.skill]` (Compétences)
  - `\L[menu.equip]` (Équipement)
  - `\L[menu.status]` (Statut)
  - `\L[options.language]` (Options)

### B. Activer ou Désactiver le Déclencheur Tactile / Clic
Vous pouvez activer ou désactiver ce comportement à tout moment (ex: lors de phases de combat ARPG, donjons ou cinématiques) :

```javascript
// Désactiver l'ouverture du Ring Menu au clic sur le joueur
$gameSystem.setRingMenuEnabled(false);

// Réactiver l'ouverture au clic
$gameSystem.setRingMenuEnabled(true);

// Vérifier l'état actuel
const isEnabled = $gameSystem.isRingMenuEnabled();
```

---

## 🎮 4. Ouvrir un Ring Menu Personnalisé par Script Call

Vous pouvez invoquer un Ring Menu sur mesure pour n'importe quelle interaction (ex: coffre, PNJ, terminal informatique) via une commande d'événement **« Insérer un script »** :

```javascript
// 1. Définir les actions personnalisées
const actions = [
    { name: "Inspecter", symbol: "inspect", enabled: true, icon: "🔍" },
    { name: "Piratage",  symbol: "hack",    enabled: true, icon: "💻" },
    { name: "Détruire",  symbol: "destroy", enabled: false, icon: "💣" }
];

// 2. Définir le gestionnaire de clic
const onSelect = function(symbol) {
    if (symbol === "inspect") {
        $gameMessage.add("\\E[0]Le terminal affiche des logs chiffrés.");
    } else if (symbol === "hack") {
        $gameParty.gainGold(250);
        $gameMessage.add("\\A\\C[2]Piratage réussi ! +250 crédits !");
    }
    SceneManager._scene.closeRingMenu();
};

// 3. Ouvrir sur l'événement en cours
const targetEvent = $gameMap.event(this.eventId());
SceneManager._scene._ringCommandWindow.setCommands(actions);
actions.forEach(cmd => {
    SceneManager._scene._ringCommandWindow.setHandler(cmd.symbol, onSelect.bind(this, cmd.symbol));
});
SceneManager._scene._ringCommandWindow.openAtTarget(targetEvent);
```

---

## 🎨 5. Configuration & Personnalisation Visuelle

Vous pouvez ajuster les dimensions, le rayon et la police du menu :

```javascript
// Configuration globale
Window_RingCommand.setConfig({
    fontFace: "",            // Police personnalisée ("" = police de base)
    fontSize: 20,            // Taille de police
    itemWidth: 130,          // Largeur de chaque cartouche d'item en pixels
    itemHeight: 42,          // Hauteur de chaque cartouche d'item en pixels
    radius: 0,               // 0 = calcul automatique selon la taille de fenêtre
    opacity: 0               // Opacité du cadre global (0 = fond transparent)
});

// Réinitialiser la configuration globale
Window_RingCommand.resetConfig();

// Configuration par session ($gameSystem)
$gameSystem.setRingCommandConfig({
    itemWidth: 140,
    fontSize: 22
});
```

---

## 📐 6. Calcul Géométrique & Animation (Détails Techniques)

1. **Angle de Départ (`_startAngle`)** : Défini à `-Math.PI / 2` (position 12h / midi), assurant que le premier item est toujours orienté en haut.
2. **Pas Angulaire (`step`)** : `(2 * Math.PI) / totalItems`.
3. **Coordonnées de l'Item `index`** :
   ```javascript
   const angle = -Math.PI / 2 + (index * step);
   const x = center.x + Math.cos(angle) * radius - (itemWidth / 2);
   const y = center.y + Math.sin(angle) * radius - (itemHeight / 2);
   ```
4. **Animation d'Ouverture (`updateOpeningRadius`)** :
   Utilise une fonction d'amortissement Ease-Out :
   ```javascript
   this._radius += (this._targetRadius - this._radius) * 0.2 + 0.5;
   ```
   Dès que `_radius` atteint `_targetRadius`, l'animation s'arrête automatiquement et stabilise le rendu.
