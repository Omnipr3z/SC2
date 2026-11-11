# 🧘 TUTORIEL DÉVELOPPEUR : SYSTÈME DE POSES PERSISTANTES DU HERO (SC4)

Le système de **Poses Persistantes** de SimCraft 4 permet de doter les héros de postures corporelles durables (statiques ou de locomotion) distinctes des actions éphémères du combat ou des interactions.

---

## 🎯 1. Concept Fondamental : Actions vs Poses

| Type | Persistance | Comportement | Exemples |
| :--- | :--- | :--- | :--- |
| **Action Ponctuelle** (`playAction`) | Éphémère (quelques frames) | Joue une animation temporisée (attaque, tir, dégât, rechargement), puis **revient automatiquement** à la posture de base. | `atk`, `hurt`, `shoot`, `cast`, `dead`. |
| **Pose Persistante** (`setPose`) | Durable (infinie tant que non annulée) | Le personnage adopte une posture fixe ou un mode de locomotion alternatif. Si une action ponctuelle intervient pendant une pose (ex: subir des dégâts `hurt`), le héros joue l'action puis **revient à sa pose courante**. | `sit` (assis), `lay` (couché), `sleep` (endormi), `sneak` (furtif), `rampe` (ramper). |

Pour rétablir le comportement de marche normal, il suffit d'invoquer `clearPose()`.

---

## ⚙️ 2. Options de Configuration d'une Pose

Lors de l'application d'une pose via `setPose(poseName, options)`, plusieurs paramètres permettent d'ajuster finement la locomotion et les contraintes physiques :

```javascript
$gamePlayer.setPose("sneak", {
    canMove: true,      // Le joueur peut-il se déplacer ?
    allowDash: false,   // Le joueur peut-il courir / sprinter ?
    speedMod: -1,       // Modificateur de vitesse de déplacement
    onAlert: true       // Annulation automatique si la carte passe en mode combat
});
```

### Détail des Paramètres :

| Option | Type | Valeur par défaut | Rôle & Impact |
| :--- | :---: | :---: | :--- |
| **`canMove`** | `boolean` | `true` | Si `false`, fige totalement les déplacements du personnage (flèches, clics, pathfinding) tout en maintenant le rendu graphique de la pose. Idéal pour les poses statiques d'assise, de lit ou d'alitement médical. |
| **`allowDash`** | `boolean` | `false` | Si `false`, désactive le sprint natif (Shift ou double-tap) tant que la pose est active. Idéal pour forcer la marche lente lors de l'infiltration ou de la reptation. |
| **`speedMod`** | `number` | `0` | Ajuste dynamiquement la vitesse de déplacement réelle (`realMoveSpeed`). Une valeur négative (ex: `-1`) ralentit le personnage, une valeur positive l'accélère. |
| **`onAlert`** | `boolean` | `true` | **Réveil / Alerte Automatique** : si la carte bascule en Mode Combat (présence d'ennemis hostiles alertés), la pose est instantanément interrompue et le personnage repasse immédiatement en posture de combat/marche (`walk`). |

---

## 🚨 3. Réveil Automatique & Sécurité en Combat (`onAlert`)

Dans un RPG spatial et tactique, un personnage endormi ou assis doit réagir immédiatement en cas d'attaque surprise ou de déclenchement d'alarme :

1. Lorsque la carte passe en Mode Combat (`$gameMap.setCombatMode(true)` ou détection d'ennemis vivants par `IAManager`), le moteur déclenche la méthode `onAlertTrigger()` sur le joueur et l'ensemble de ses compagnons (`followers`).
2. Pour chaque personnage :
   - Si `_pose` est active et que `_poseOptions.onAlert !== false` :
     - La pose est révoquée (`clearPose()`).
     - L'action courante repasse à `"walk"` avec récupération immédiate de la vitesse normale et du sprint.
3. Si vous souhaitez qu'une pose résiste à l'alerte (ex: personnage paralysé, inconscient ou ligoté), définissez explicitement `onAlert: false`.

---

## 🎨 4. Nomenclature Graphique Paperdoll (`Bitmap_Composite`)

Le moteur composite multi-couches ([`SC4_Bitmap_Composite.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Bitmap_Composite.js)) assemble automatiquement les calques graphiques selon le nom de la pose active :

* Au lieu de charger la planche standard `_walk.png`, le compositeur résout automatiquement :
  * **Corps** : `img/characters/bodies/[race]_[sex]_[pose].png` (ex: `human_male_sit.png`).
  * **Visages** : `img/characters/faces/[id]_[pose].png`.
  * **Équipements** : `img/characters/equipments/[item]_[pose].png`.
* Une clé de cache dédiée par pose garantit des transitions fluides à 60 FPS sans recompilation superflue.

### 4.1 Préchargement `Scene_Loading` & Cache Persistant `ImageManager._system`

Pour éliminer tout flash d'assemblage asynchrone et prévenir le déchargement des briques lors des transferts de carte (`ImageManager.clear()`), [`SC4_Scene_Loading.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Scene_Loading.js) s'exécute une fois au démarrage depuis `Scene_Boot` :
1. **Scan & Cache d'Existence** : Parcourt récursivement `img/characters/composite/` (`.png` / `.png_`) et pré-remplit `Bitmap_Composite._fileExistsCache`.
2. **Routage Persistant `_system`** : [`SC4_rmmz_core_Patches.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_rmmz_core_Patches.js) détourne uniquement les URLs contenant `/characters/composite/` vers `ImageManager._system`, tout en conservant `img/system/screwLoading.png` pour le spinner vanilla `#loadingSpinnerImage`.
3. **Composition Synchrone & Anti-Flash** : Quand toutes les briques sont en cache, `Sprite_Hero` et `Sprite_PaperdollFace` composent dès la frame `0` ; en cas de nouveau calque non encore prêt, `Sprite_Hero` conserve son bitmap précédent jusqu'à la fin de l'assemblage.
4. **Seuils Mémoire** : `DEBUGTOOL.warn` émet un avertissement si le volume composite dépasse les seuils (`WARN_COMPOSITE_FILES = 400` / `CACHE_WARN_RAM_MB = 250`). Valider via `node UNIT_TESTS/test_scene_loading_composite.js`.

---

## 💻 5. Appels de Script & Commandes RMMZ

### A. Appels JavaScript Directs

```javascript
// 1. Assigner une pose au joueur
$gamePlayer.setPose("sit", { canMove: false, allowDash: false });

// 2. Annuler la pose du joueur (retour à walk)
$gamePlayer.clearPose();

// 3. Assigner une pose à un héros spécifique (ex: Acteur 2 - Priscilla)
$heroHub.setPose(2, "sleep", { canMove: false, onAlert: true });

// 4. Annuler la pose d'un héros spécifique
$heroHub.clearPose(2);

// 5. Utiliser la façade globale SC4
SC4.setHeroPose(1, "sneak", { canMove: true, allowDash: false, speedMod: -1 });
SC4.clearHeroPose(1);

// 6. Vérifier si une pose est active
if ($gamePlayer.isPoseActive()) {
    console.log("Pose courante : " + $gamePlayer.pose());
}
```

### B. Commandes de Plugin RPG Maker MZ

Dans l'éditeur d'événements RMMZ, utilisez la commande **Commande de Plugin** (Plugin Command) en ciblant le plugin `SC4_Interface` :

1. **`setHeroPose`** :
   * `actorId` : ID de l'acteur (défaut `1`).
   * `pose` : Nom de la pose (ex: `sit`, `lay`, `sneak`).
   * `canMove` : `true` / `false`.
   * `allowDash` : `true` / `false`.
   * `speedMod` : Entier relatif (`0`, `-1`, etc.).
   * `onAlert` : `true` / `false`.

2. **`clearHeroPose`** :
   * `actorId` : ID de l'acteur à réinitialiser.

---

## 📚 6. Liens & Documentation Connexe

* 🔫 [**Tutoriel Gunfight & Zones Sécurisées**](./TUTORIAL_GUNFIGHT.md) : Gestion du mode combat automatique et rengainage des armes.
* 🚀 [**Tutoriel Voyage Spatial**](./TUTORIAL_SPACE_TRAVEL.md) : Hublot parallaxe et console de bord.
