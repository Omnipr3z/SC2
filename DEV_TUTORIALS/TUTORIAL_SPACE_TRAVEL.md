# Guide Développeur & Tutoriel : Système de Voyage Spatial Multi-Échelles (SC4)

Ce document constitue la référence technique et conceptuelle complète du système de navigation spatiale, de la physique orbitale, du calendrier stellaire et de la simulation galactique dans **SimCraft 4**.

> [!NOTE]
> Pour la gestion des quêtes scénarisées, transmissions radio et balises d'objectifs, consultez le guide dédié :  
> 👉 [**Tutoriel Système de Quêtes & Balises Multi-Échelles (SC4)**](./TUTORIAL_QUEST_SYSTEM.md).

---

## Sommaire
1. [Architecture Globale & Navigation Multi-Niveaux](#1-architecture-globale--navigation-multi-niveaux)
2. [Spécification & Structure Complète des Données JSON (`data/SC/`)](#2-spécification--structure-complète-des-données-json-datasc)
   - [2.1 SECTORS.json (Constellations & Systèmes Galactiques)](#21-sectorsjson-constellations--systèmes-galactiques)
   - [2.2 PLANETS.json (Corps Célestes, Mouvements & POIs)](#22-planetsjson-corps-célestes-mouvements--pois)
   - [2.3 SPACESHIPS.json (Flotte de Vaisseaux Joueur & PNJ)](#23-spaceshipsjson-flotte-de-vaisseaux-joueur--pnj)
   - [2.4 SHIP_MOTORS.json (Moteurs, Vitesse & Hyperdrive)](#24-ship_motorsjson-moteurs-vitesse--hyperdrive)
   - [2.5 TIME_SYSTEM.json (Calendrier Stellaire & Écoulement Temporel)](#25-time_systemjson-calendrier-stellaire--écoulement-temporel)
   - [2.6 QUESTS.json (Liaison Externe Quêtes / POIs)](#26-questsjson-liaison-externe-quêtes--pois)
3. [Mécaniques In-Game & Fonctionnalités Récentes](#3-mécaniques-in-game--fonctionnalités-récentes)
   - [3.1 Carte Galactique FTL & Trajectoire Visible du Saut Warp](#31-carte-galactique-ftl--trajectoire-visible-du-saut-warp)
   - [3.2 Système Solaire, Navigation & Vaisseaux PNJ ("En contact")](#32-système-solaire-navigation--vaisseaux-pnj-en-contact)
   - [3.3 Vue Sous-Système : Vaisseau en Orbite & POIs Rotatifs](#33-vue-sous-système--vaisseau-en-orbite--pois-rotatifs)
   - [3.4 Mode Hangar & Atterrissage Automatisé](#34-mode-hangar--atterrissage-automatisé)
4. [Moteur Temporel `$gameDate` & Déplacement Persistant Hors Scène](#4-moteur-temporel-gamedate--déplacement-persistant-hors-scène)
   - [4.1 Écoulement Continu & Modes de Vitesse](#41-écoulement-continu--modes-de-vitesse)
   - [4.2 Physique Orbitale Indexée sur le Temps](#42-physique-orbitale-indexée-sur-le-temps)
   - [4.3 Réponse Technique : Le Déplacement en Arrière-Plan sur `Scene_Map`](#43-réponse-technique--le-déplacement-en-arrière-plan-sur-scene_map)
5. [Guide Pratique : Recettes Développeur](#5-guide-pratique--recettes-développeur)
   - [5.1 Comment créer un nouveau Système et ses Planètes](#51-comment-créer-un-nouveau-système-et-ses-planètes)
   - [5.2 Comment ajouter un POI d'Atterrissage](#52-comment-ajouter-un-poi-datterrissage)
6. [API & Commandes de Script RMMZ](#6-api--commandes-de-script-rmmz)
7. [Liens & Documentation Connexe](#7-liens--documentation-connexe)

---

## 1. Architecture Globale & Navigation Multi-Niveaux

Le système spatial de SC4 repose sur **3 échelles d'exploration interconnectées** et une simulation physique persistante en tâche de fond :

```
┌────────────────────────────────────────────────────────┐
│  NIVEAU 1 : SECTEUR / GALAXIE (Scene_SectorTravel)     │
│  • Carte stellaire avec constellations et liaisons FTL.│
│  • Balises de quêtes pulsées sur les systèmes cibles.  │
│  • Déplacement visible du vaisseau le long des lignes  │
│    durant le saut Warp (InterSystemJump).              │
│  • Raccourci Page Bas (PgDown) -> Entrer dans système  │
└──────────────────────────┬─────────────────────────────┘
                           │ [Zoom In + Fondu]
                           ▼
┌────────────────────────────────────────────────────────┐
│  NIVEAU 2 : SYSTÈME SOLAIRE (Scene_SpaceTravel)        │
│  • Étoile centrale, orbites planétaires temps réel.    │
│  • Navigation libre au clic et mise en orbite.         │
│  • Présence de vaisseaux tiers (ex: Vigilance Prime)   │
│    avec option d'approche et statut "En contact".      │
│  • Hyperdrive local (Touche Shift / Clic prolongé).    │
│  • Raccourci Page Haut (PgUp)   -> Carte Galaxie       │
│  • Raccourci Page Bas (PgDown) -> Sous-système         │
│    (strictement réservé aux vaisseaux en orbite !)     │
└──────────────────────────┬─────────────────────────────┘
                           │ [Zoom In si le vaisseau orbite]
                           ▼
┌────────────────────────────────────────────────────────┐
│  NIVEAU 3 : SOUS-SYSTÈME (Scene_SubsystemTravel)       │
│  • Planète centrale en rotation temporelle continue.   │
│  • Vaisseau du joueur visible en orbite stationnaire   │
│    à côté de la planète (avec flottement fluide).      │
│  • POIs dimensionnés à 0.25 tournant avec la planète.  │
│  • Balises de quêtes actives priorisées (masquage de   │
│    l'icône d'alerte standard pour éviter doublons).    │
│  • Mode Consultation : observation & retour au système │
│  • Mode Hangar : atterrissage direct sur la carte RMMZ │
└──────────────────────────┬─────────────────────────────┘
                           │ [Atterrissage depuis Hangar]
                           ▼
┌────────────────────────────────────────────────────────┐
│  CARTE RPG STANDARD (Scene_Map)                        │
│  • Téléportation du joueur invisible ($gamePlayer).    │
│  • Déclenchement du Self-Switch A de l'event d'atterro.│
│  • Simulation spatiale en arrière-plan continue :       │
│    le temps s'écoule, les planètes orbitent et les     │
│    vaisseaux poursuivent leur voyage en tâche de fond. │
└────────────────────────────────────────────────────────┘
```

---

## 2. Spécification & Structure Complète des Données JSON (`data/SC/`)

Tous les fichiers de configuration résident dans le dossier `data/SC/` et sont chargés au démarrage par `SC_DataManager`.

### 2.1 `SECTORS.json` (Constellations & Systèmes Galactiques)
Définit la hiérarchie stellaire galactique, le placement des systèmes solaires et les autoroutes de saut FTL.

```json
[
  {
    "id": 0,
    "name": "Secteur Calixis",
    "segmentum": "ULTIMA-SEGMENTUM",
    "systems": [
      {
        "id": 0,
        "name": "Système Ankaros",
        "description": "Système central fortifié, riche en mondes-ruches et en stations de captage solaire.",
        "starType": "Yellow Star",
        "starColor": "#ffdd44",
        "pos": { "x": 380, "y": 320 },
        "connections": [1, 2],
        "entryPoint": { "x": 640, "y": 320 },
        "planetIds": [0, 1, 2, 3, 4, 5, 6, 7]
      },
      {
        "id": 1,
        "name": "Système Scintilla",
        "description": "Capitale sous haute surveillance de la Marine Impériale.",
        "starType": "Blue Giant",
        "starColor": "#55aaff",
        "pos": { "x": 680, "y": 210 },
        "connections": [0, 2],
        "entryPoint": { "x": 640, "y": 320 },
        "planetIds": [8, 9]
      }
    ]
  }
]
```

* **`segmentum`** : Région galactique affichée dans le fil d'Ariane de l'en-tête CRT.
* **`pos.x / pos.y`** : Coordonnées à l'écran de l'étoile dans `Scene_SectorTravel`.
* **`connections`** : Tableau des IDs de systèmes reliés par des lignes FTL. Les sauts Warp ne sont autorisés qu'entre systèmes directement connectés.
* **`entryPoint`** : Coordonnées locales $(X, Y)$ où émerge un vaisseau arrivant par saut FTL dans ce système.
* **`planetIds`** : Liste ordonnée des IDs de corps célestes présents dans ce système (référence aux entrées de `PLANETS.json`).

---

### 2.2 `PLANETS.json` (Corps Célestes, Mouvements & POIs)
Définit les planètes, étoiles, anomalies et stations, leurs mouvements orbitaux procéduraux, ainsi que **tous leurs Points d'Intérêt (POIs)**.

```json
[
  {
    "id": 4,
    "name": "Ankaros Prime",
    "type": "Hive World",
    "description": "Monde-ruche principal du système, siège du Gouverneur impérial.",
    "x": 350,
    "y": 240,
    "zoom": 0.2,
    "bitmapName": "planet_0",
    "moves": [
      {
        "type": "rotation",
        "value": 0.001
      },
      {
        "type": "orbit",
        "value": 0.5,
        "speed": 0.0001,
        "centerX": 640,
        "centerY": 320,
        "radiusX": 440,
        "radiusY": 240
      }
    ],
    "pois": [
      {
        "id": "prime_spatioport",
        "name": "Spatioport Magellan",
        "description": "Plateforme d'atterrissage majeure pour vaisseaux de transport et marchands.",
        "icon": "poi_spaceport",
        "mapX": 0.5,
        "mapY": 0.4,
        "landingMapId": 3,
        "landingX": 15,
        "landingY": 20,
        "landingEventId": 1
      }
    ]
  }
]
```

#### Types de Mouvements (`moves`) :
1. **`rotation`** :
   * `value` : Vitesse angulaire propre (radians par frame à vitesse normale). Utilisé pour la rotation procédurale de la planète sur elle-même.
2. **`orbit`** :
   * `centerX`, `centerY` : Point focal orbital (généralement l'étoile centrale).
   * `radiusX`, `radiusY` : Demi-grand axe et demi-petit axe de l'orbite elliptique.
   * `speed` : Vitesse de révolution orbitale.
   * `value` : Décalage angulaire initial (phase $0.0$ à $1.0$).
3. **`orbitPlanet`** :
   * Pour les satellites/lunes/stations : orbite autour d'une planète parente (`planetId`).

#### Configuration des POIs (`pois`) :
* **`id`** : Identifiant unique de chaîne du POI (ex: `"prime_spatioport"`), référencé par les quêtes.
* **`mapX`, `mapY`** : Coordonnées normalisées relatives sur la planète ($0.5, 0.5$ = centre exact de la sphère).
* **`landingMapId`** : ID de la carte RPG Maker MZ sur laquelle le joueur atterrit.
* **`landingX`, `landingY`** : Coordonnées de tuiles RMMZ d'arrivée du joueur.
* **`landingEventId`** : ID de l'événement sur la carte cible dont le **Self-Switch A** est automatiquement activé à l'atterrissage (par défaut : `1`).

---

### 2.3 `SPACESHIPS.json` (Flotte de Vaisseaux Joueur & PNJ)
Définit tous les navires du secteur, leurs positions, motorisations et allégeances.

```json
[
  {
    "id": 0,
    "name": "Dawn Of Faith",
    "category": "Escort & Scout",
    "shipClass": "Viper",
    "captainId": 1,
    "bitmapName": "B",
    "sectorId": 0,
    "systemId": 0,
    "x": 1100,
    "y": 160,
    "fuel": 800,
    "capacity": 200,
    "faction": "Astra Militarum",
    "motorId": 4
  },
  {
    "id": 1,
    "name": "Vigilance Prime",
    "category": "Patrol Cruiser",
    "shipClass": "Cobra",
    "captainId": 2,
    "bitmapName": "B",
    "sectorId": 0,
    "systemId": 0,
    "x": 480,
    "y": 380,
    "fuel": 600,
    "capacity": 350,
    "faction": "Imperial Navy",
    "motorId": 2
  }
]
```

* **`captainId`** : ID de l'acteur RMMZ ($gameActors) aux commandes. Le vaisseau dont le capitaine correspond au leader de l'équipe ($gameParty.leader()) devient automatiquement le **vaisseau du joueur**.
* **`bitmapName`** : Image du vaisseau située dans `img/GUI/ship/` (ex: `"B.png"`).
* **`motorId`** : Référence au moteur dans `SHIP_MOTORS.json`.

---

### 2.4 `SHIP_MOTORS.json` (Moteurs, Vitesse & Hyperdrive)

```json
[
  {
    "id": 4,
    "name": "Propulseur Plasma Helios V",
    "speed": 0.8,
    "capacity": 1000,
    "fuelType": "Plasma Enriched",
    "hyperdrive": {
      "buffRate": 2.5,
      "consumeRate": 2.2
    }
  }
]
```

* **`speed`** : Vitesse scalaire de base pour la navigation libre et les sauts FTL.
* **`capacity`** : Capacité maximale du réservoir (valeur `-1` = carburant infini).
* **`hyperdrive.buffRate`** : Multiplicateur de vitesse lors de l'activation de l'hyperdrive (Shift).
* **`hyperdrive.consumeRate`** : Multiplicateur de consommation de fuel en hyperdrive.

---

### 2.5 `TIME_SYSTEM.json` (Calendrier Stellaire & Écoulement Temporel)

```json
{
  "start_timestamp": 55657647,
  "minutes_per_hour": 60,
  "hours_per_day": 24,
  "days_per_month": 30,
  "months_per_year": 12,
  "tick_per_min": [0, 60, 30, 15, 5]
}
```

* **`tick_per_min`** définit la vitesse d'écoulement selon le mode actif :
  - **Mode 0 (Pause)** : 0 tick/min (temps arrêté).
  - **Mode 1 (Normal / Continu)** : 60 ticks/min (1 minute de jeu = 60 frames = 1 seconde réelle).
  - **Mode 2 (Croisière)** : 30 ticks/min (2x plus rapide).
  - **Mode 3 (Rapide)** : 15 ticks/min (4x plus rapide).
  - **Mode 4 (Saut Warp / FTL)** : 5 ticks/min (12x plus rapide, 12 minutes de jeu par seconde réelle).

---

### 2.6 `QUESTS.json` (Liaison Externe Quêtes / POIs)
Les quêtes ne contiennent aucune coordonnée physique. Elles référencent simplement l'ID d'un POI (`poiId`) défini dans `PLANETS.json`.

Pour les spécifications complètes du format des quêtes et des objectifs, référez-vous au guide :  
👉 [**TUTORIAL_QUEST_SYSTEM.md**](./TUTORIAL_QUEST_SYSTEM.md).

---

## 3. Mécaniques In-Game & Fonctionnalités Récentes

### 3.1 Carte Galactique FTL & Trajectoire Visible du Saut Warp
Dans `Scene_SectorTravel` :
* Sélectionner un système adjacent relié par une ligne FTL active l'option **"⚡ Saut FTL / Warp"**.
* Dès l'engagement du saut, le statut du vaisseau passe à `"InterSystemJump"`.
* **Trajectoire animée** : Le vaisseau ne saute plus instantanément. Son icône traverse visuellement la constellation d'une étoile à l'autre le long du tracé, orientée dans la direction du cap avec une légère pulsation de champ Warp.
* La vitesse de transit et la consommation de carburant dépendent du moteur du vaisseau.
* À l'arrivée dans le système cible, l'interface réactive automatiquement le bouton d'entrée dans le système ("▶ Entrer dans le Système").

### 3.2 Système Solaire, Navigation & Vaisseaux PNJ ("En contact")
Dans `Scene_SpaceTravel` :
* Navigation libre à la souris par clic direct dans l'espace.
* Clic sur une planète : le vaisseau s'oriente vers elle et se met en orbite stationnaire (`ship.status === "Orbiting"`).
* **Vaisseaux PNJ affichés** : Tous les vaisseaux tiers présents dans le système actuel (ex: *Vigilance Prime*) sont rendus à l'écran.
* Clic sur un vaisseau tiers : ouvre ses informations dans le volet cible et propose l'action **"Se mettre en contact"**.
* Le joueur s'approche alors du navire tiers jusqu'à passer au statut `"InContact"` ("En contact"), équivalent à une orbite de proximité.

### 3.3 Vue Sous-Système : Vaisseau en Orbite & POIs Rotatifs
Dans `Scene_SubsystemTravel` :
* **Accès conditionné** : Accessible uniquement lorsque le vaisseau est en orbite (`ship.status === "Orbiting"`).
* **Vaisseau du joueur visible** : Le vaisseau est dessiné à côté de la planète centrale (`x = planet.x + 230`, `y = planet.y - 40`) avec un doux mouvement de flottement orbital, laissant la surface planétaire parfaitement dégagée.
* **Échelle des POIs** : Les icônes de POIs standards (`mapIcon_alert`) et les balises de quête (`mapIcon_qust`) sont uniformément dimensionnées à l'échelle **`0.25`**.
* **Rotation solidaire des POIs** : Comme la planète tourne en continu sur elle-même, tous les POIs suivent fidèlement cette rotation en restant ancrés à leur position géographique relative.
* **Priorité de quête** : Si une quête active vise un POI, l'icône de base d'alerte est masquée pour laisser place à la balise de quête animée sans superposition disgracieuse.
* Le volet d'information met en surbrillance en jaune vif l'objectif de quête associé au POI sélectionné.

### 3.4 Mode Hangar & Atterrissage Automatisé
Lorsqu'il est appelé depuis la console de la navette dans le hangar du vaisseau :
1. La scène s'ouvre avec l'option **"Débarquer sur le POI"**.
2. Au clic sur "Débarquer" :
   * Le joueur devient invisible : `$gamePlayer.setTransparent(true)`.
   * Le joueur est transféré sur `landingMapId` aux coordonnées `(landingX, landingY)`.
   * Le **Self-Switch A** de l'événement d'atterrissage (`landingEventId`, par défaut 1) est activé sur la carte cible pour lancer la cinématique d'arrivée ou l'ouverture de la rampe.

---

## 4. Moteur Temporel `$gameDate` & Déplacement Persistant Hors Scène

### 4.1 Écoulement Continu & Modes de Vitesse
Contrairement aux systèmes où le temps n'avance que si le joueur bouge, l'horloge galactique `$gameDate` s'écoule **en continu à chaque frame** :
* Même lorsque le vaisseau est immobile ou en orbite, le temps progresse à vitesse standard (**Mode 1**).
* Dès que le vaisseau se met en mouvement vers une cible ou une orbite, le temps accélère en vitesse de croisière (**Mode 2**).
* Pendant un saut FTL le long des constellations ou sous Hyperdrive, le temps passe à vitesse FTL (**Mode 4**).

### 4.2 Physique Orbitale Indexée sur le Temps
Les orbites et rotations planétaires ne s'incrémentent plus par simple frame aléatoire :
* La rotation axiale (`planet.rotationAngle`) et la position orbitale (`planet.orbitAngle`) sont calculées directement comme une fonction déterministe de `$gameDate` :
  $$\text{ticks} = \$gameDate.\text{timestamp} \times 60 + \$gameDate.\_tick$$
  $$\text{orbitAngle} = (\text{offset} + \text{ticks} \times \text{speed}) \pmod{2\pi}$$
* Ainsi, sauvegarder, recharger ou accélérer le temps maintient un univers astronomique d'une précision absolue.

### 4.3 Réponse Technique : Le Déplacement en Arrière-Plan sur `Scene_Map`

> **Question Fréquente du Développeur :**  
> *"Pour le voyage persistant en dehors des scènes de voyage spatial, est-ce que les déplacements du vaisseau sont calés sur Game_Date aussi ?"*

**Réponse : OUI, à 100%.**

Voici exactement comment la synchronisation s'opère dans le moteur :

1. **Sur `Scene_Map` (exploration à pied) :**
   * À chaque frame, `Scene_Map.prototype.update` appelle `window.$gameDate.passTick()`.
   * En parallèle, la simulation spatiale s'exécute via `window.$systemMapManager.update(true)`.

2. **Indexation de la vitesse sur le ratio temporel :**
   * Le facteur d'accélération du vaisseau est calculé selon le ratio réel de minutes par seconde :
     ```javascript
     const timeFactor = (60 / $gameDate.getTickPerMin());
     const moveSpeed = (ship.speed / 4) * timeFactor;
     ```
   * En mode croisière (Mode 2), le temps de `$gameDate` s'écoule 2 fois plus vite (30 frames/min au lieu de 60), et le vaisseau avance de `2 × moveSpeed` par frame.
   * En saut FTL (Mode 4), le temps s'écoule 12 fois plus vite (5 frames/min), et le saut progresse de 12 ticks par frame.
   * **Conséquence :** La distance spatiale parcourue par minute de jeu est **rigoureusement identique**, que le joueur regarde l'écran de vol dans `Scene_SpaceTravel` ou qu'il soit en train de marcher dans les couloirs du vaisseau sur `Scene_Map`.

3. **Consommation de carburant continue :**
   * La réserve de fuel diminue en tâche de fond proportionnellement au temps passé en vol.

---

## 5. Guide Pratique : Recettes Développeur

### 5.1 Comment créer un nouveau Système et ses Planètes
1. Ouvrir `data/SC/SECTORS.json` :
   * Ajouter une entrée dans le tableau `systems` avec son `id`, ses coordonnées `pos`, et ses connexions `connections` vers les systèmes voisins.
2. Ouvrir `data/SC/PLANETS.json` :
   * Créer la planète et définir son orbite dans `moves` :
   ```json
   {
     "type": "orbit",
     "value": 0.25,
     "speed": 0.00012,
     "centerX": 640,
     "centerY": 320,
     "radiusX": 350,
     "radiusY": 180
   }
   ```
3. Lier l'ID de cette planète dans le tableau `planetIds` du système dans `SECTORS.json`.

---

### 5.2 Comment ajouter un POI d'Atterrissage
Dans l'entrée de la planète dans `PLANETS.json`, ajouter un objet dans le tableau `pois` :
```json
{
  "id": "bastion_omega",
  "name": "Forteresse Bastion Omega",
  "description": "Garnison fortifiée de l'Astra Militarum en bordure de toundra.",
  "icon": "poi_fortress",
  "mapX": 0.45,
  "mapY": 0.55,
  "landingMapId": 12,
  "landingX": 8,
  "landingY": 14,
  "landingEventId": 1
}
```
* **Sur la map RMMZ 12** : Placer l'événement ID 1 en Déclenchement "Processus Parallèle" ou "Exécution Automatique" avec la condition `Self-Switch A = ON`. Mettre dedans les messages d'arrivée, les sons de réacteurs, puis réinitialiser la transparence du joueur :
```javascript
$gamePlayer.setTransparent(false);
```

---

## 6. API & Commandes de Script RMMZ

### Commandes de Plugin (Événements RMMZ)
| Commande | Argument | Effet |
| :--- | :--- | :--- |
| `SC4_SpaceScenes` | `openSector` | Ouvre la carte galactique / constellations FTL. |
| `SC4_SpaceScenes` | `openSystem` | Ouvre le système solaire local. |
| `SC4_SpaceScenes` | `openHangar` | Ouvre le sous-système en mode atterrissage (si en orbite). |

### Appels par Script JS (Événements RMMZ ou Menus)
```javascript
// 1. Accès rapide au Hangar d'atterrissage
SC4.openHangar();
// ou :
SceneManager.openHangar();

// 2. Ouvrir directement la carte galactique
SceneManager.push(Scene_SectorTravel);

// 3. Ouvrir le système solaire
SceneManager.push(Scene_SpaceTravel);

// 4. Lire ou afficher la date Warhammer 40K
const dateStr = Game_DateFormatter.format40K($gameDate);
$gameMessage.add(`Horloge Impériale : ${dateStr}`);

// 5. Rendre le joueur à nouveau visible après débarquement
$gamePlayer.setTransparent(false);
```

---

## 7. Liens & Documentation Connexe

* 📜 [**Tutoriel Système de Quêtes & Balises Multi-Échelles**](./TUTORIAL_QUEST_SYSTEM.md) : Gestionnaire `$gameQuests`, déclencheur `$storyManager`, balises hiérarchiques et transmissions radio CRT.
* 🌐 [**Tutoriel Système de Localisation**](./TUTORIAL_LOCALIZATION.md) : Traduction dynamique des noms de systèmes et de planètes via les balises `\L[KEY]`.
* 🎒 [**Tutoriel Conteneurs & Multi-Inventaires**](./TUTORIAL_CONTAINERS_INVENTORIES.md) : Gestion des cales et soutes du vaisseau.
