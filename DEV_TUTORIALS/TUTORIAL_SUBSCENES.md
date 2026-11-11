# Tutoriel Développeur : Architecture des Sous-Scènes (`SubScene_Base`)

> **SimCraft Engine V2 (SC4)**  
> **Composants clés** : [`SC4_SubScene_Base.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_SubScene_Base.js), [`SC4_SubScene_Console.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_SubScene_Console.js), [`SC4_Window_BridgeConsole.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Window_BridgeConsole.js), [`SC4_SubScene_Subcom.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_SubScene_Subcom.js), [`SC4_SubScene_RelationDialog.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_SubScene_RelationDialog.js), [`SC4_SubScene_SubcomDialog.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_SubScene_SubcomDialog.js).

---

## 1. Problématique & Philosophie Architecturale

Dans l'architecture native de RPG Maker, la dérive habituelle consiste à surcharger `Scene_Map` pour chaque nouvelle mécanique interactive (consoles, terminaux de piratage, dialogues de réputation, mini-jeux). Cette approche transforme `Scene_Map` en un **« God Object »** monstrueux, difficile à maintenir et source de régressions.

À l'inverse, basculer sur une scène classique RMMZ (`Scene_MenuBase` via `SceneManager.push`) fige la carte sous forme d'une simple capture d'écran statique (`SceneManager.backgroundBitmap()`), ce qui **casse l'immersion visuelle** (les étoiles défilant par les hublots spatiaux, la météo et les lumières du pont s'arrêtent).

### La Solution SimCraft : Le Pattern `SubScene_Base`
Le système de **Sous-Scènes (Child Scenes / SubScenes)** combine le meilleur des deux mondes :
1. **Monde vivant** : `Scene_Map` continue de tourner normalement à 60 FPS en arrière-plan (parallaxe dynamique du hublot, animations d'événements, horloge universelle).
2. **Isolation modulaire** : Toute l'orchestration des fenêtres, des jauges et des actions est encapsulée dans une classe autonome héritant de manière sécurisée de `Scene_Base`.
3. **Contrôle propre des inputs** : La sous-scène intercepte les clics et désactive le menu principal de la carte pendant toute sa durée de vie.

---

## 2. Héritage Sécurisé : Pourquoi `Scene_Base` et pas `Scene_Map` ?

Dans RPG Maker MZ, la hiérarchie de classes est :
$$\text{PIXI.Container} \longrightarrow \text{Stage} \longrightarrow \mathbf{\text{Scene\_Base}} \longrightarrow \text{Scene\_Message} \longrightarrow \mathbf{\text{Scene\_Map}}$$

| Classe | Pourquoi l'utiliser ou l'éviter pour une Sous-Scène |
| :--- | :--- |
| **`Scene_Base` (Adoptée)** | `Scene_Base` **est déjà un conteneur PIXI (`Stage`)** ! Elle apporte gratuitement le calque de fenêtrage officiel (`createWindowLayer()`, `addWindow()`), la mise à jour récursive (`updateChildren()`), les filtres graphiques et le cycle de vie standardisé, sans **aucun fardeau parasite**. |
| **`Scene_Map` (À proscrire)** | `Scene_Map` instancie son propre `Spriteset_Map` (ce qui dupliquerait tous les graphismes de la carte en mémoire !), gère le clic de déplacement au sol (`processMapTouch`), les transferts de map et les combats aléatoires. Hériter de `Scene_Map` obligerait à neutraliser 15 méthodes pour éviter des effets de bord critiques. |

### Résolution Sécurisée de la Classe Parente :
```javascript
const ParentClass = (typeof Scene_Base !== "undefined")
    ? Scene_Base
    : ((typeof Stage !== "undefined")
        ? Stage
        : ((typeof PIXI !== "undefined" && PIXI.Container) ? PIXI.Container : class {}));
```

---

## 3. Communication & Accès aux Éléments de la Scène Parente

Une question architecturale essentielle : **Comment la sous-scène interagit-elle avec la carte hôte ?**

Lors de l'instanciation via `parentScene.openSubScene(SubSceneClass, ...args)`, la référence de la scène parente (`Scene_Map`) est automatiquement injectée :

```javascript
class SubScene_Base extends ParentClass {
    constructor(parentScene, ...args) {
        super();
        this._parentScene = parentScene || null;
        // ...
    }

    get parentScene() {
        return this._parentScene;
    }
}
```

### Table d'Accès aux Composants de la Carte depuis une SubScene :
* **Accès à la Scène Hôte** : `this.parentScene` (instance active de `Scene_Map`).
* **Accès au Spriteset de la Carte** : `this.parentScene._spriteset` (permet d'agir sur les calques graphiques, les effets météo ou les sprites des événements).
* **Accès aux Données de la Carte (Singletons Globaux)** :
  - `$gameMap` : Données de la carte courante, dimensions, `mapId()`.
  - `$gameMap.events()` / `$gameMap.event(id)` : Accès direct aux entités événementielles du pont ou de la station.
  - `$gamePlayer` : Coordonnées, direction et état du héros.
  - `$gameParty` : Inventaire, crédits et membres d'équipage.
  - `$gameSpaceships` : Flotte, position orbitale et état du vaisseau.

---

## 4. Cycle de Vie Standardisé d'une SubScene

Chaque sous-scène suit un cycle de vie en 5 étapes rigoureusement cadencé :

```
             ┌─────────────┐
             │ constructor │ ➔ Stocke parentScene, appelle initMembers(...args)
             └──────┬──────┘
                    ▼
             ┌─────────────┐
             │  create()   │ ➔ createWindowLayer() ➔ createDisplayObjects()
             └──────┬──────┘
                    ▼
             ┌─────────────┐
             │   start()   │ ➔ this._active = true ➔ onStart() (active la fenêtre focus)
             └──────┬──────┘
                    ▼
      ┌──────▶ ┌─────────────┐
      │ update │  update()   │ ➔ garde $tutoManager.isBusy() ➔ super.update() ➔ updateMain()
      └──────── └──────┬──────┘
                    ▼  (Sous-scène enfant via openChildSubScene)
             ┌─────────────┐
             │deactivate() │ ➔ _active = false ➔ désactive fenêtres ➔ onDeactivate()
             └──────┬──────┘
                    ▼  (Fermeture de l'enfant close(result))
             ┌─────────────┐
             │reactivate() │ ➔ _active = true ➔ onReactivate() ➔ onSubSceneResume(child, res)
             └──────┬──────┘
                    ▼  (Au clic sur Quitter ou Action finale)
             ┌─────────────┐
             │   close()   │ ➔ Déclenche parentScene.closeSubScene(result)
             └──────┬──────┘
                    ▼
             ┌─────────────┐
             │   stop()    │ ➔ this._active = false ➔ onStop()
             └──────┬──────┘
                    ▼
             ┌─────────────┐
             │ terminate() │ ➔ onDestroy() ➔ destroyWindows() (libération mémoire RAM)
             └─────────────┘
```

### Règles Critiques d'Exécution & Garde
1. **Absence de Dimmer Opaque** : `SubScene_Base` n'ajoute **aucun** `createDimmer()` afin de préserver la lisibilité de la carte et des HUDs placés sous `_windowLayer` via `Scene_Map.addHudChild()`.
2. **Mise à Jour Unique (Anti-Double Input)** : Parce que la sous-scène est attachée via `this.addChild(subScene)` dans `Scene_Map.openSubScene()`, `Scene_Base.prototype.updateChildren()` appelle déjà `subScene.update()` une fois par frame. **`Scene_Map.update` ne doit jamais appeler `this._currentSubScene.update()` en plus**, sans quoi le curseur et la validation des fenêtres avancent 2 fois par pression.
3. **Garde Tutoriels** : `SubScene_Base.prototype.update()` retourne immédiatement si `$tutoManager && $tutoManager.isBusy()` afin de laisser `Window_Tuto` consommer les entrées sans traversée vers les commandes de la sous-scène.

---

## 🧱 4.1 Empilement Enfant (*Inception*) & Persistance (`SubSceneManager`)

### A. Pile de Sous-Scènes Enfants (`openChildSubScene`)
Une sous-scène peut ouvrir une autre sous-scène par-dessus elle sans fermer son contexte parent (ex. `SubScene_Console` → `SubScene_Subcom` → `SubScene_SubcomDialog`) :
* `openChildSubScene(SubSceneClass, ...args)` appelle `parentScene.openSubScene(...)`, empile l'instance courante (`child._callerSubScene`) et appelle `deactivate()` / `onDeactivate()`.
* À l'appel de `child.close(result)`, `Scene_Map.closeSubScene(result)` détruit l'enfant, restaure l'appelant, appelle `reactivate()` / `onReactivate()`, puis `onSubSceneResume(child, result)`.

### B. Suspension Inter-Scènes (`SubSceneManager`)
Lorsqu'une action dans une sous-scène bascule temporairement vers une scène RMMZ complète (ex. `Scene_SpaceTravel` depuis `SubScene_Console` ou pause menu) :
* `subScene.suspend(resumeData)` enregistre la classe, `resumeArgs()`, et l'état dans `SubSceneManager.suspend(this, resumeData)` avant `SceneManager.push(...)`.
* Au retour sur `Scene_Map`, `SubSceneManager` réinstancie la sous-scène et invoque `onResume(resumeData)`.
* Appeler `SubSceneManager.clear()` lors d'une sortie définitive (`onCommandCancel`).

---

## 5. Exemple Concret : Le Cockpit Bi-Écran (`SubScene_Console`)

La console de passerelle de commandement ([SC4_SubScene_Console.js](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_SubScene_Console.js)) illustre la puissance de cette architecture. Elle orchestre deux fenêtres coordonnées côte à côte au centre de l'écran (largeur totale 900px) :

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCENE_MAP (En arrière-plan : étoiles défilant par le hublot du pont)        │
│                                                                             │
│  [Volet Gauche : Télémétrie 420px]       [Volet Droit : Commandes 460px]    │
│  ┌───────────────────────────────┐       ┌───────────────────────────────┐  │
│  │ DAWN OF FAITH (Escorteur #1)  │       │ CONSOLE DE PASSERELLE ▷ ORDRES│  │
│  │ [Portrait Face Capitaine]     │       │ [STATUT] En orbite Ankaros    │  │
│  │ Coque   : ██████████ 100%     │       ├───────────────────────────────┤  │
│  │ Carburant: ████████░░  82%    │       │ 🛰️  Navigation Stellaire      │  │
│  │ Oxygène : ██████████ 100%     │       │ 🛬  Atterrir (Option A POIs)  │  │
│  │ Vitesse : 14.2 km/s (Orbital) │       │ 🛫  Décoller                  │  │
│  │ Hangar  : 1 Navette embarquée │       │ ❌  Quitter la console        │  │
│  └───────────────────────────────┘       └───────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Déclenchement en Jeu :
```javascript
// Depuis un événement sur la passerelle (Capture automatique de callingEventId) :
SC4.openBridgeConsole([shipId]);

// Ou directement via la scène active :
SceneManager._scene.openSubScene(SubScene_Console, [shipId], callingEventId);
```

### Catalogue des Sous-Scènes SC4 :
* [`SubScene_Console`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_SubScene_Console.js) : Cockpit bi-écran (`Window_SpaceShipInfo` + `Window_BridgeConsole`).
* [`SubScene_Subcom`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_SubScene_Subcom.js) : Terminal SubCom temps réel (`900×420`, ouvert comme sous-scène enfant depuis la console).
* [`SubScene_RelationDialog`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_SubScene_RelationDialog.js) : Dialogue social en arc (`Window_InteractionRingCommand` + `Window_BubbleMsg`).
* [`SubScene_SubcomDialog`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_SubScene_SubcomDialog.js) : Échange SubCom à distance (`mode = 1` hologramme CRT, bouton *Raccrocher*).

### Retour de Sous-Menu Fluide (Option A) :
Dans `SubScene_Console`, lorsque le joueur clique sur **Atterrir**, la fenêtre de droite bascule dynamiquement en mode `land_sites` pour lister tous les POIs atterrissables (`Spatioport Magellan [Autorisé]`, `Ruines [Autorisation requise]`). Un appui sur **Échap** ou **◀ Retour au menu** réinitialise le mode principal sans fermer la sous-scène ni perturber la carte !
