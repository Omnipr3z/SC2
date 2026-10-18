# 💬 TUTORIEL DÉVELOPPEUR : BULLES DE MESSAGE (BUBBLE MESSAGES)

Le système de **Bubble Messages** de SimCraft 4 substitue dynamiquement et contextuellement la boîte de dialogue standard de RPG Maker MZ par des bulles de texte flottantes ancrées aux personnages ou événements de la carte.

---

## 🚀 1. Caractéristiques Principales

- **Classe ES7** : `Window_BubbleMsg extends Window_Message`.
- **Remplacement Transparent** : S'intègre directement dans `Scene_Message` sans casser la compatibilité avec les sous-fenêtres (or, nom, choix).
- **Comportement par défaut (Vanilla)** : En l'absence de flag ou de mode bulle activé, les fenêtres s'affichent en bas ou en haut de l'écran dans leurs dimensions vanilla d'origine.
- **Redimensionnement Automatique** : La bulle calcule exactement la largeur et la hauteur nécessaires avec `textSizeEx`, tenant compte des polices, icônes et portraits (faces).
- **Edge Clamping (Bord d'écran)** : Si la cible est située hors du champ de la caméra, la bulle ne disparaît pas : elle vient se coller automatiquement au bord de l'écran le plus proche.
- **Suivi Dynamique en Mouvement** : Si le joueur ou l'événement ciblé se déplace pendant le dialogue, la bulle suit fidèlement son mouvement frame par frame.

---

## 🏷️ 2. Flags de Message dans l'Éditeur

Inscrivez simplement l'un des flags suivants au début ou dans le texte de la commande d'événement **« Afficher un message »** :

| Flag | Cible | Comportement |
| :--- | :--- | :--- |
| `\A` | **Joueur** (`$gamePlayer`) | La bulle s'ancre au-dessus de la tête du héros. |
| `\E[ID]` | **Événement** (ID sur la carte) | La bulle s'ancre au-dessus de l'événement désigné (`$gameMap.event(ID)`). Clampée au bord d'écran si hors-champ. |
| `\PX[X]\PY[Y]` | **Coordonnées d'Écran** | La bulle s'ancre aux coordonnées d'écran `(X, Y)` spécifiées en pixels. |
| `\L[KEY]` | **Localisation** | Résolu en priorité avant l'extraction des flags de positionnement. |

### Exemples d'utilisation :

1. **Dialogue du héros** :
   ```text
   \A\L[dialogues.hero_answer]
   ```
2. **Dialogue d'un PNJ (Événement ID 4)** :
   ```text
   \E[4]Bonjour voyageur ! Que puis-je pour toi ?
   ```
3. **Dialogue avec choix** :
   ```text
   \E[2]Souhaitez-vous entrer dans le donjon ?
   ```
   *(La fenêtre de choix `Window_ChoiceList` s'aligne automatiquement au centre de la bulle).*

---

## 📐 3. Positionnement & Hauteur

Le placement vertical de la bulle respecte le paramètre de **Position** défini dans la commande d'événement RPG Maker MZ :

- **Haut (Top - positionType 0)** : Positionnée au-dessus de la tête du personnage (décalage vertical de base : 14px au-dessus de la tête).
  - *Inversion automatique* : S'il n'y a pas assez de place en haut de l'écran, la bulle bascule automatiquement sous les pieds.
- **Milieu (Middle - positionType 1)** : Centrée verticalement sur le personnage.
- **Bas (Bottom - positionType 2)** : Positionnée sous les pieds du personnage.
  - *Inversion automatique* : Si la bulle dépasse en bas de l'écran, elle bascule automatiquement au-dessus de la tête.

---

## ⚙️ 4. Paramètres du Plugin (Plugin Manager)

Le plugin `SC4_BubbleMessage.js` dispose de paramètres configurables directement dans le **Gestionnaire de Plugins** de RPG Maker MZ :

| Paramètre | Description | Valeur par défaut |
| :--- | :--- | :--- |
| `preloadFonts` | **Liste des polices à pré-charger** au démarrage du jeu (JSON Array, ex: `["mplus-1m-regular.woff"]`). | `["BD.ttf"]` |
| `defaultFontFace` | Police par défaut de la bulle (`"BD.ttf"`, `"mplus-1m-regular.woff"`, ou vide). | `BD.ttf` |
| `defaultFontSize` | Taille de la police (0 = taille par défaut du projet). | `0` |
| `defaultWindowskin` | Habillage par défaut de la bulle (`img/system/Window_Bubble.png`). | `Window_Bubble` |
| `enableOutline` | **Activer l'Outline (Ombre/Contour)** des lettres en mode bulle (`true` / `false`). | `false` |
| `defaultOutlineWidth` | **Épaisseur du contour** des lettres en pixels si activé (`0` = sans contour, `3` = standard RMMZ). | `0` |
| `outlineColor` | Couleur du contour (laisser vide pour la couleur par défaut RMMZ `'rgba(0, 0, 0, 0.6)'`). | `""` |
| `verticalGapTop` | **Décalage vertical vers le haut** (espace en px au-dessus de la tête). | `14` |
| `verticalGapBottom` | **Décalage vertical vers le bas** (espace en px sous les pieds). | `14` |
| `defaultPadding` | Marges internes (padding) en pixels. | `12` |
| `defaultBackOpacity` | Opacité du fond (0 à 255). | `240` |
| `minWidth` | Largeur minimale en pixels. | `120` |
| `minHeight` | Hauteur minimale en pixels. | `64` |
| `maxWidthPercent` | Largeur maximale (ratio de l'écran, ex: 0.85 = 85%). | `0.85` |
| `maxHeightPercent` | Hauteur maximale (ratio de l'écran, ex: 0.80 = 80%). | `0.80` |

---

## 🎨 5. Personnalisation Dynamique (Script / Game System)

L'apparence des bulles peut également être modifiée ou surchargée en cours de jeu par appel de script via `$gameSystem` ou l'API statique :

```javascript
// Configuration dynamique en cours de jeu ($gameSystem)
$gameSystem.setBubbleConfig({
    fontFace: "mplus-1m-regular.woff", // Police préchargée
    fontSize: 18,                      // Taille de police
    enableOutline: false,              // Désactiver l'outline/ombre des lettres
    outlineWidth: 0,                   // 0 pour un rendu parfaitement net sans contour
    windowskin: "Window_Bubble",       // Habillage dans img/system/
    verticalGapTop: 48,                // Décalage personnalisé au-dessus de la tête
    verticalGapBottom: -32             // Décalage personnalisé sous les pieds
});

// Configuration globale via l'API statique
Window_BubbleMsg.setConfig({
    fontFace: "mplus-1m-regular.woff",
    fontSize: 18,
    enableOutline: false,
    verticalGapTop: 48,
    verticalGapBottom: -32,
    padding: 12,
    backOpacity: 240
});

// Réinitialiser la configuration globale
Window_BubbleMsg.resetConfig();
```

> [!TIP]
> **Prise en compte automatique et résilience :**
> - L'appel à `$gameSystem.setBubbleConfig({...})` active automatiquement le mode bulle pour les prochains messages (sans avoir besoin d'écrire `\A` dans chaque message, sauf si vous passez explicitement `enabled: false`).
> - **Outline / Ombre des lettres** : L'outline est contrôlé par `enableOutline` et `defaultOutlineWidth`. Lorsqu'il est désactivé (`false` ou `0`), le texte est tracé directement sans le stroke noir de 3px de RPG Maker MZ, offrant un rendu moderne et ultra net. Lors du retour en mode vanilla, l'outline natif du jeu est restauré.
> - Le nom de fichier de police (ex: `"BD.ttf"` ou `"BD"`) est automatiquement nettoyé de son extension pour la famille CSS, chargé via `FontManager.load` et injecté dans le canvas.
> - L'habillage (`"Window_Bubble"`) est appliqué dynamiquement à l'ouverture de la bulle et rétabli au skin standard vanilla à la fermeture.
> - La hauteur de ligne (`lineHeight`) s'adapte automatiquement à la taille de police (ex: 20px pour une police de 12px au lieu des 36px par défaut de RMMZ).
> - Les décalages verticaux haut (`verticalGapTop`) et bas (`verticalGapBottom`) permettent un espacement asymétrique sur mesure pour compenser la hauteur des sprites ou des coiffes.

---

## 🔄 6. Activation & Désactivation Explicite du Mode Bulle

Si vous souhaitez contrôler manuellement l'activation sans changer les polices :

```javascript
// Activer le mode bulle universel
$gameSystem.setBubbleMessageMode(true);

// Désactiver et revenir au mode vanilla par défaut
$gameSystem.setBubbleMessageMode(false);
```

*Lorsqu'il est activé globalement sans flag explicite (`\A`, `\E`), le système cible automatiquement l'événement en cours d'exécution dans l'interpréteur (ou le joueur à défaut).*

---

## 🧪 7. Commandes de Test Console (F12)

Pour tester immédiatement le rendu en jeu depuis la console développeur :

```javascript
// 1. Bulle sur le joueur (0=haut, 1=milieu, 2=bas)
testBubbleMsg("Test de bulle sur le héros", 0);

// 2. Bulle sur un événement (ex: événement ID 1)
testBubbleMsgEvent(1, "Halte là, étranger !", 0);

// 3. Bulle à des coordonnées précises (X=400, Y=300)
testBubbleMsgCoords(400, 300, "Bulle fixe à (400, 300)", 1);

// 4. Réinitialiser la cible active
clearBubbleTarget();
```
