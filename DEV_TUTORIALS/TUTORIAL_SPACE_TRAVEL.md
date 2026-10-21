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
   - [2.3.1 Système d'Onboarding & Amarrage (V, D, P)](#231-système-donboarding--amarrage-v-d-p)
   - [2.3.2 Disposition & Grille UI Standardisée (1760 × 990)](#232-disposition--grille-ui-standardisée-1760--990)
   - [2.4 SHIP_MOTORS.json (Moteurs, Vitesse & Hyperdrive)](#24-ship_motorsjson-moteurs-vitesse--hyperdrive)
   - [2.5 TIME_SYSTEM.json (Calendrier Stellaire & Écoulement Temporel)](#25-time_systemjson-calendrier-stellaire--écoulement-temporel)
   - [2.6 QUESTS.json (Liaison Externe Quêtes / POIs)](#26-questsjson-liaison-externe-quêtes--pois)
3. [Mécaniques In-Game & Fonctionnalités Récentes](#3-mécaniques-in-game--fonctionnalités-récentes)
   - [3.1 Carte Galactique FTL & Trajectoire Visible du Saut Warp](#31-carte-galactique-ftl--trajectoire-visible-du-saut-warp)
   - [3.2 Système Solaire, Navigation & Vaisseaux PNJ ("En contact")](#32-système-solaire-navigation--vaisseaux-pnj-en-contact)
   - [3.3 Vue Sous-Système : Vaisseau en Orbite & POIs Rotatifs](#33-vue-sous-système--vaisseau-en-orbite--pois-rotatifs)
   - [3.4 Mode Hangar & Atterrissage Automatisé avec Variable 41 (NEF_ID)](#34-mode-hangar--atterrissage-automatisé-avec-variable-41-nef_id)
   - [3.5 Transitions Douces Inter-Scènes](#35-transitions-douces-inter-scènes)
   - [3.6 Console de Passerelle de Commandement (Window_BridgeConsole)](#36-console-de-passerelle-de-commandement-window_bridgeconsole)
   - [3.7 Séquences Scénarisées V1 : Atterrissage & Décollage Directs](#37-séquences-scénarisées-v1--atterrissage--décollage-directs)
   - [3.8 Système de Clearance & Autorisation d'Atterrissage](#38-système-de-clearance--autorisation-datterrissage)
   - [3.9 Hublot & Parallaxe Dynamique des Cartes de Vaisseau](#39-hublot--parallaxe-dynamique-des-cartes-de-vaisseau)
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

> [!IMPORTANT]
> **Convention d'Indexation 1-based (RMMZ Compatible) :**  
> Tous les fichiers de données spatiales (`SECTORS.json`, `PLANETS.json`, `SPACESHIPS.json`, `SHIP_MOTORS.json`, `QUESTS.json`) adoptent la convention standard RPG Maker MZ : l'élément à l'index `0` est `null`, et les identifiants réels commencent à `1`.  
> De plus, le moteur effectue toutes ses recherches d'entités par identifiant explicite (`.find(e => e && e.id === targetId)`) et non par index direct de tableau, garantissant une robustesse absolue contre tout décalage d'index.

### 2.1 `SECTORS.json` (Constellations & Systèmes Galactiques)
Définit la hiérarchie stellaire galactique, le placement des systèmes solaires et les autoroutes de saut FTL.

```json
[
  null,
  {
    "id": 1,
    "name": "Secteur Calixis",
    "segment": "ULTIMA-SEGMENT",
    "systems": [
      null,
      {
        "id": 1,
        "name": "Système Ankaros",
        "description": "Système central fortifié, riche en mondes-ruches et en stations de captage solaire.",
        "starType": "Yellow Star",
        "starColor": "#ffdd44",
        "capital": true,
        "pos": { "x": 380, "y": 320 },
        "connections": [2, 3],
        "entryPoint": { "x": 640, "y": 320 },
        "planetIds": [1, 2, 3, 4, 5, 6, 7]
      },
      {
        "id": 2,
        "name": "Système Scintilla",
        "description": "Capitale sous haute surveillance de la Marine Impériale.",
        "starType": "Blue Giant",
        "starColor": "#55aaff",
        "capital": false,
        "pos": { "x": 680, "y": 210 },
        "connections": [1, 3],
        "entryPoint": { "x": 640, "y": 320 },
        "planetIds": [8, 9]
      }
    ]
  }
]
```

* **`capital`** : Booléen (`true`/`false`) indiquant si le système est la capitale du secteur (affiche un indicateur ou blason distinctif sur la carte galactique).
* **`segment`** : Région galactique majeure affichée dans le fil d'Ariane de l'en-tête CRT.
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

#### Propriétés Clés des Corps Célestes :
* **`interactive`** : Booléen (`true`/`false`, défaut `true`). Si défini à `false`, l'astre est **purement décoratif** (ex: anneaux planétaires visuels, nébuleuses locales, débris cosmiques d'arrière-plan). Il est rendu et animé avec sa physique orbitale complète, mais n'affiche pas de curseur de survol, ne peut pas être ciblé par le curseur et ne bloque pas les trajectoires du vaisseau.
* **`zoom`** : Facteur d'échelle du sprite céleste (calibré pour l'ergonomie : $0.16 - 0.28$ pour les planètes, surdimensionné à **$0.12$ pour les lunes** afin de garantir la cliquabilité souris sans miss-click, et $0.05 - 0.08$ pour les stations).
* **`orbitLine`** : Booléen (`true`/`false`) indiquant si le tracé elliptique de l'orbite doit être dessiné à l'écran.

#### Types de Mouvements (`moves`) & Paramètres Astronomiques Lore :
1. **`rotation`** :
   * `rotationHours` : Durée du jour local en heures virtuelles (ex: `24` pour un monde habitable étalon, `12` à `16` pour une géante gazeuse).
   * `value` : Décalage angulaire initial (phase $0.0$ à $1.0$).
2. **`orbit`** :
   * `orbitRadiusUA` : Rayon orbital en Unités Astronomiques ($1\text{ UA} = 100\text{ px}$).
   * `orbitalDays` : Période de révolution en jours virtuels selon la 3ème loi de Kepler ($60$ à $110\text{ j}$ pour les telluriques intérieures, **$360\text{ j}$ pour Neotori Prime**, $650$ à $1800\text{ j}$ pour les géantes extérieures).
   * `centerX`, `centerY` : Point focal orbital (généralement l'étoile centrale en $640, 320$).
   * `radiusX`, `radiusY` : Demi-grand axe et demi-petit axe de l'orbite elliptique (pixels RMMZ).
   * `value` : Décalage angulaire initial (phase $0.0$ à $1.0$).
3. **`orbitPlanet`** :
   * Pour les satellites/lunes/stations : orbite autour d'une planète parente (`planetId`). Rayon type $58\text{ px}$ ($0.58\text{ UA}$) pour les lunes avec révolution en $18$ à $36\text{ jours}$.
4. **`lookAtCenter` / Verrouillage par Marée (Tidal Lock)** :
   * Pour les satellites, ceintures ou stations synchrones : `"lookAtCenter": true` oriente en permanence le sprite vers l'étoile ou le corps céleste parent autour duquel il gravite.

#### Configuration des POIs (`pois`) & Éclairage au Sol :
* **`id`** : Identifiant unique de chaîne du POI (ex: `"prime_spatioport"`), référencé par les quêtes.
* **`mapX`, `mapY`** : Coordonnées normalisées relatives sur la planète ($0.5, 0.5$ = centre exact de la sphère).
* **`landingMapId`** : ID de la carte RPG Maker MZ sur laquelle le joueur atterrit.
* **`landingX`, `landingY`** : Coordonnées de tuiles RMMZ d'arrivée du joueur.
* **`landingEventId`** : ID de l'événement sur la carte cible dont le **Self-Switch A** est automatiquement activé à l'atterrissage (par défaut : `1`).
* **Heure Solaire & Teinte Dynamique au Sol** :
  * Lors du transfert sur la carte, le moteur calcule l'angle 2D du POI face au soleil pour injecter la teinte appropriée dans `$gameScreen.startTint()` (Midi = lumière neutre `[0, 0, 0, 0]`, Minuit = nuit sombre `[-70, -60, -30, 120]`, Aube/Crépuscule).
  * Les ceintures d'astéroïdes et stations spatiales disposent automatiquement d'une ambiance lumineuse fixe (`[-40, -35, -20, 90]`), sans cycle jour/nuit.

---

### 2.3 `SPACESHIPS.json` (Flotte de Vaisseaux Joueur & PNJ)
Définit tous les navires du secteur, leurs positions, motorisations, allégeances et statuts d'embarquement.

```json
[
  {
    "id": 0,
    "name": "Dawn Of Faith",
    "category": "Escort & Scout",
    "shipClass": "Viper",
    "captainId": 1,
    "bitmapName": "C",
    "sectorId": 0,
    "systemId": 0,
    "x": 1100,
    "y": 160,
    "fuel": 800,
    "capacity": 200,
    "faction": "Astra Militarum",
    "motorId": 4,
    "mapId": 31,
    "landingX": 10,
    "landingY": 10,
    "movingSE": { "name": "Collapse3", "volume": 90, "pitch": 80 },
    "hyperdriveBGS": { "name": "FIREWIND2", "volume": 90, "pitch": 100 },
    "warpjumpSE": { "name": "ShipJump", "volume": 90, "pitch": 100 }
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
    "motorId": 2,
    "mapId": 29,
    "landingX": 15,
    "landingY": 15
  },
  {
    "id": 2,
    "name": "Navette Test",
    "category": "Shuttle",
    "shipClass": "shuttle",
    "captainId": 1,
    "bitmapName": "C",
    "onBoard": "V1",
    "sectorId": 0,
    "systemId": 0,
    "x": 580,
    "y": 380,
    "fuel": 100,
    "capacity": 100,
    "faction": "Imperial Navy",
    "motorId": 2,
    "mapId": 31,
    "landingX": 10,
    "landingY": 10
  }
]
```

* **`captainId`** : ID de l'acteur RMMZ ($gameActors) aux commandes. Le vaisseau dont le capitaine correspond au leader de l'équipe ($gameParty.leader()) devient automatiquement le **vaisseau du joueur**.
* **`bitmapName`** : Image du vaisseau située dans `img/GUI/ship/` (ex: `"B.png"`).
* **`mapId`, `landingX`, `landingY`** : Carte et coordonnées d'atterrissage / transfert associées au navire.
* **`onBoard`** : Statut d'embarquement ou amarrage initial (`"V[ID]"`, `"D[ID]"`, `"P[ID]"`).
* **`dockingAllowed`** : Booléen (`true`/`false`, défaut `false`) indiquant si le vaisseau autorise d'autres navires à s'amarrer à ses sas.
* **`movingSE`, `hyperdriveBGS`, `warpjumpSE`** : Paramétrage audio spécifique par vaisseau.

---

### 2.3.1 Système d'Onboarding & Amarrage (`V`, `D`, `P`)

L'attribut `onBoard` permet de modéliser les liaisons physiques entre vaisseaux et corps célestes :

| Code | Type | Description | Comportement spatial |
| :---: | :--- | :--- | :--- |
| **`V[ID]`** | **À bord (Hangar)** | La nef se trouve dans le hangar du vaisseau `[ID]` (ex: `V1`). | **Masqué** des cartes de navigation spatiale. Sa position est synchronisée sur l'hôte. Affiché dans le volet d'infos de l'hôte sous **"◈ Flotte à bord"**. |
| **`D[ID]`** | **Amarré (Docking)** | Le vaisseau est amarré par passerelle / sas au vaisseau `[ID]` (ex: `D1`). | **Visible** sur la carte à proximité immédiate de l'hôte. Sa position suit l'hôte. Statut : `Amarré à [Nom]`. |
| **`P[ID]`** | **Posé (Planète)** | Le vaisseau a atterri sur la planète `[ID]` (ex: `P1`). | **Masqué** de la carte du système. Position synchronisée avec celle de la planète. Statut : `Posé sur [Nom]`. |

#### Méthodes de l'instance `Game_Spaceship` :
* `isOnBoard()` : renvoie l'ID de l'hôte si `V[ID]` (ou `0` / faux sinon).
* `isDocked()` : renvoie l'ID de l'hôte si `D[ID]` (ou `0` / faux sinon).
* `isLanded()` : renvoie l'ID de la planète si `P[ID]` (ou `0` / faux sinon).
* `aboard(targetId, type = "V")` : embarque (`"V"`), amarre (`"D"`) ou pose (`"P"`).
* `leaveHost()` : détache le navire (`onBoard = null`).
* `allowDocking(val = true)` : autorise ou révoque les demandes d'amarrage vers ce navire.

#### Matrice de Compatibilité Inter-Classes :

| Catégorie Nef | Catégorie Destination | Mode Onboarding | Condition requise |
| :--- | :--- | :---: | :--- |
| **Shuttle** | Shuttle | *notAllowed* | — |
| **Shuttle** | Escort & Scout | *notAllowed* | — |
| **Shuttle** | Fregate | **onBoard** | Hangar suffisant |
| **Shuttle** | Patrol Cruiser | **onBoard** | Hangar suffisant |
| **Escort & Scout** | Shuttle | *notAllowed* | — |
| **Escort & Scout** | Escort & Scout | **docking** | `target.dockingAllowed === true` |
| **Escort & Scout** | Fregate | **docking** | `target.dockingAllowed === true` |
| **Escort & Scout** | Patrol Cruiser | **onBoard** | Hangar suffisant |
| **Fregate** | Shuttle | *notAllowed* | — *(validé)* |
| **Fregate** | Escort & Scout | **docking** | `target.dockingAllowed === true` |
| **Fregate** | Fregate | **docking** | `target.dockingAllowed === true` |
| **Fregate** | Patrol Cruiser | **docking** | `target.dockingAllowed === true` |
| **Patrol Cruiser** | *(Toute catégorie)* | *notAllowed* | Trop lourd pour être embarqué |

- **`ship.getOnboardingMode(targetShipId)`** : renvoie `"onBoard"`, `"docking"`, ou `"notAllowed"`.
- **`ship.isBoardingAllowed(targetShipId)`** : renvoie `true` si le mode est `"onBoard"`.
- **`ship.isDockingAllowed(targetShipId)`** : renvoie `true` si le mode est `"docking"` **ET** que `target.dockingAllowed === true`.

---

### 2.3.2 Disposition & Grille UI Standardisée (1760 × 990)

Toutes les scènes spatiales (`Scene_SectorTravel`, `Scene_SpaceTravel`, `Scene_SubsystemTravel`) adoptent une grille pixel-perfect uniforme :

```
(12, 12) ┌────────────────────────────────────────────────────────┐ (1304, 90) ┌────────────────────────┐
         │                                                        │              │                        │
         │                ZONE DE CARTE SPATIALE                  │              │  VOLET D'INFOS         │
         │                     (1280 × 720)                       │              │  DU VAISSEAU           │
         │                                                        │              │  (1304, 90, 444, 380)  │
         │                                                        │              │  • Stats, Fuel, Vitesse│
         │                                                        │              │  • ◈ Flotte à bord     │
(12, 744)└────────────────────────────────────────────────────────┘              └────────────────────────┘
┌─────────────────────────┐ ┌─────────────────────────────────────────────────────────────────────────────┐
│  TERMINAL DE LOG CRT    │ │  DESCRIPTION CIBLE / POI (412, 744, 880, 150)                               │
│  (12, 744, 388, 234)    │ └─────────────────────────────────────────────────────────────────────────────┘
│  • Journal d'alertes    │ (412, 906) ┌──────────────────────────────────────────────────────────────────┐
│  • Télémétrie de bord   │            │  BARRE DE COMMANDES SPATIALES (412, 906, 1336, 72)               │
└─────────────────────────┘            └──────────────────────────────────────────────────────────────────┘
```

| Composant | Coordonnées `Rectangle(x, y, w, h)` | Rôle & Spécificités |
| :--- | :---: | :--- |
| **En-tête Fil d'Ariane & Date** | `Rectangle(0, 0, 1760, 48)` | Localisation stellaire, Segment, horloge 40K. |
| **Zone de Carte / Viewport** | `(12, 12, 1280, 720)` | Vue décalée avec offset global `12px`. |
| **Terminal de Log CRT** | `Rectangle(12, 744, 388, 234)` | Messages d'événements, contacts et alertes. |
| **Description / Cible / POI** | `Rectangle(412, 744, 880, 150)` | Télémétrie planétaire, détails système et quêtes. |
| **Barre de Commandes** | `Rectangle(412, 906, 1336, 72)` | Boutons de navigation et d'actions contextuelles. |
| **Volet d'Infos Vaisseau** | `Rectangle(1304, 90, 444, 380)` | Padding natif RMMZ (12px), propulsion, carburant, coordonnées et **section "◈ Flotte à bord"**. |

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
* **Préchauffage du Saut Warp (Warmup Delay)** : Dès l'ordre de saut, un compte à rebours de 30 ticks (`_jumpWarmupTicks = 30`) s'enclenche avec l'effet sonore spatial `ShipJump.ogg`.
* **Verrouillage Tactique de Vol** : Pendant tout le préchauffage et la durée du transit Warp, la barre de commande spatiale est désactivée pour empêcher tout conflit de commandes ou d'ordres simultanés.
* Le terminal de communication CRT affiche l'état opérationnel : *"Calcul des données de saut..."*.
* **Trajectoire animée** : Le vaisseau traverse visuellement la constellation d'une étoile à l'autre le long du tracé, orienté dans la direction du cap avec une pulsation de champ Warp.
* La vitesse de transit et la consommation de carburant dépendent du moteur du vaisseau.
* À l'arrivée dans le système cible, l'interface réactive automatiquement les commandes et le bouton d'entrée dans le système ("▶ Entrer dans le Système").

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

### 3.4 Capacité d'Atterrissage selon la Catégorie du Vaisseau & Mode Hangar
La capacité d'un vaisseau à atterrir directement sur la surface d'un astre dépend de son gabarit et de sa catégorie :
* **Vaisseaux capables d'atterrir** :
  - **Taille 1 (Nefs, Navettes, Chasseurs)** : Conçus pour les liaisons surface-orbite et les insertions atmosphériques.
  - **Taille 2 (Escorteurs légers, Scouts, Débarqueurs)** : Équipés de trains d'atterrissage renforcés et de rétrofusées de freinage.
* **Vaisseaux lourds (Non-atterrisseurs)** :
  - **Taille 3 (Frégates, Escorteurs lourds)** et **Taille 4 (Croiseurs, Cuirassés)** : Trop massifs pour supporter l'attraction gravitationnelle sans effondrement structurel. Ils demeurent obligatoirement en orbite stationnaire et utilisent leurs navettes de hangar ou les sas d'amarrage des stations orbitales.

#### Déploiement depuis le Hangar (Nefs embarquées `onBoard: "V[ID]"`)
Le mode Hangar est une possibilité scénaristique permettant de lancer une navette secondaire depuis les coursives d'un bâtiment porteur :
1. **Sélection de la Nef** : La scène est appelée avec l'ID de la navette (par exemple `nefId = 2`) via `SC4.openHangar(nefId)`.
2. **Affichage adapté** :
   - Le volet d'informations du vaisseau affiche les caractéristiques complètes de la navette sélectionnée (`Navette Test`, id 2).
   - Le terminal d'événements CRT reste connecté au vaisseau principal pour recevoir les communications générales.
   - Sur la console de bord d'un vaisseau embarqué (`onBoard`), les commandes contextuelles proposent : *Décoller / Se désarrimer*, *S'amarrer*, et en orbite *Atterrir*.
3. **Au clic sur "Débarquer sur le POI"** :
   - L'ID de la nef est stocké dans la variable RMMZ dédiée définie par le paramètre `@param nefVariableId` (par défaut **Variable 41**, nommée `NEF_ID`).
   - Le joueur devient transparent : `$gamePlayer.setTransparent(true)`.
   - Le **Self-Switch A** de l'événement d'atterrissage (`landingEventId`, par défaut 1) est activé sur la carte cible.
   - Le joueur est téléporté sur `landingMapId` aux coordonnées `(landingX, landingY)`.
   - *Note d'intégration* : La carte d'arrivée peut être une carte vide servant de hub de transition pour redispatcher le joueur selon la situation via événementiel.

### 3.5 Transitions Douces Inter-Scènes
Toutes les transitions entre les différentes échelles de voyage spatial (`Scene_SectorTravel`, `Scene_SpaceTravel`, `Scene_SubsystemTravel`) et l'écran de titre ou la carte RPG utilisent désormais des fondus au noir harmonieux (`startFadeIn(24)` / `startFadeOut(24)`). Ce fondu élimine tout scintillement ou affichage abrupt des sprites lors des changements de scènes.

### 3.6 Console de Passerelle de Commandement (`Window_BridgeConsole`)
La console de pont remplace les arborescences d'événements complexes par un terminal de commande contextuel intégré directement sur `Scene_Map` :
* **Déclenchement événementiel** :
  - Créer un événement sur la passerelle (déclencheur *Touche d'action* ou *Événement commun*).
  - Insérer la commande événementielle : **Script** ➔ `SC4.openBridgeConsole([shipId]);` (ou commande de plugin `openBridgeConsole`).
  - *Prérequis d'activation* : Le plugin `SC4_Window_BridgeConsole` doit impérativement être actif dans le gestionnaire de plugins de RPG Maker MZ (**F10**).
* **Hiérarchie de Détection du Vaisseau Contrôlé** :
  La console détermine automatiquement le vaisseau à piloter selon 3 niveaux de priorité :
  1. **Priorité 1 (Explicite)** : Argument `shipId` passé à la méthode `SC4.openBridgeConsole(shipId)` (idéal pour la prise de contrôle à distance, le piratage informatique, les consoles auxiliaires ou les vaisseaux multi-cartes).
  2. **Priorité 2 (Contextuelle par carte)** : Vaisseau dont l'attribut `mapId` dans `SPACESHIPS.json` correspond à la carte où se trouve le joueur (`$gameSpaceships.shipByMapId($gameMap.mapId())`).
  3. **Priorité 3 (Repli)** : Vaisseau principal du joueur (`$gameSpaceships.playerShip()`).
* **Architecture 5 Sections** : Implémentée selon le standard SimCraft (`SC4_Window_BridgeConsole.js`).
* **Matrice des Commandes Disponibles** :
  | Commande | Icône | Condition d'Activation | Effet |
  | :--- | :---: | :--- | :--- |
  | **Navigation Stellaire** | 🛰️ | En vol / Orbite (`!isLanded`) | Ouvre `Scene_SpaceTravel` (Système) ou `Scene_SectorTravel` (Secteur). |
  | **Atterrir** | 🛬 | `!isLanded && canLand && isLandingAuthorized` | Lance la séquence cinématique d'atterrissage sur le POI ciblé. |
  | **Décoller** | 🛫 | Vaisseau posé (`isLanded === true`) | Lance la séquence cinématique de décollage vers l'orbite stationnaire. |
  | **Amarrage / Sas** | ⚓ | *(Désactivé WIP)* | Amarrage sas à sas vers une station ou navire ami. |
  | **Subcom** | 📡 | *(Désactivé WIP)* | Communications radio (clearance, secours, avis météo). |
  | **Quitter la Console** | ❌ | Toujours disponible | Referme la fenêtre et restitue le contrôle au joueur sur le pont. |
* **Persistance au `pop()` de scène** :
  Lorsque le joueur quitte la console pour consulter la carte spatiale via `SceneManager.push(Scene_SpaceTravel)` et en revient par `SceneManager.pop()`, la variable d'état `$gameSystem._bridgeConsoleOpen` réouvre automatiquement la console sur la carte sans manipulation supplémentaire.

### 3.7 Séquences Scénarisées V1 : Atterrissage & Décollage Directs
Ces séquences automatisent les transitions entre l'espace et la surface planétaire avec effets audio et visuels :
* **Atterrissage (`SC4.performLandingSequence(poiId)`)** :
  1. Joue l'effet sonore de rentrée atmosphérique et réacteurs (`FIREWIND2.ogg`).
  2. Affiche l'overlay cinématique `Landing_placeholder.png` (`$gameScreen.showPicture`).
  3. Met à jour le modèle de vaisseau : `ship.aboard(planetId, "P")` et statut `Static`.
  4. Téléporte silencieusement le joueur vers les coordonnées du spatioport (ex: Map 37, x: 127, y: 58 pour `prime_spatioport`).
  5. Effectue un fondu sortant fluide de l'overlay (`$gameScreen.movePicture`).
* **Décollage (`SC4.performTakeoffSequence()`)** :
  1. Joue l'effet sonore de propulsion spatiale (`ShipJump.ogg`).
  2. Affiche l'overlay `Landing_placeholder.png`.
  3. Réinitialise le statut du vaisseau : quitte la surface (`ship.leaveHost()`) et le repositionne en orbite stationnaire autour de l'astre (`ship.setOrbitingPlanet()`).
  4. Téléporte silencieusement le joueur à l'intérieur du vaisseau (ex: Map 31, x: 10, y: 10 pour l'Escorteur 1).
  5. Fondu sortant fluide de l'overlay.

### 3.8 Système de Clearance & Autorisation d'Atterrissage
La clearance d'atterrissage régit l'accès aux spatioports et mondes civilisés :
* **Vérification** : `SC4.isLandingAuthorized(planetOrPoiId)` ou `$gameSystem.isLandingAuthorized(id)`.
* **Modification** : `SC4.setLandingAuthorized(planetOrPoiId, authorized = true)`.
* **Valeur par défaut** : `false` pour les mondes protégés (nécessitant une clearance via quête, dialogue ou transmission radio) ou définie par `landingAuthorized` dans `PLANETS.json` / `POIS.json`.

### 3.9 Hublot & Parallaxe Dynamique des Cartes de Vaisseau
Pour donner une sensation d'immersion immédiate depuis l'intérieur du vaisseau, les cartes intérieures (passerelle, cabines) adaptent automatiquement leur décor de fond visible par les hublots :
* **Notetag de carte RMMZ** : `<spaceshipIdParalaxes:[id]>` (ex: `<spaceshipIdParalaxes: 1>`).
* **Gestion automatique du parallaxe** :
  * **En orbite stationnaire** : Affiche la planète correspondante (`!planet_[id].png` depuis `img/parallaxes/`), en zero-parallax fixe (défilement figé `[0, 0]`).
  * **En saut FTL / Hyperdrive** : Affiche l'animation de défilement rapide `Warp.png` (`sx = 8`).
  * **En vol libre / espace profond** : Affiche le ciel étoilé `StarlitSky.png` avec dérive douce (`sx = 0.5`).
  * **Au sol / atterri** : Conserve le panorama fixe planétaire du site d'atterrissage.

---

## 4. Moteur Temporel `$gameDate` & Déplacement Persistant Hors Scène

### 4.1 Découplage Temporel Total & Vitesse Constante
Le temps galactique est désormais **totalement découplé des déplacements physiques du vaisseau** :
* L'horloge stellaire `$gameDate` s'écoule à son rythme propre continu (calibré pour s'écouler plus rapidement dans l'espace que sur la carte terrestre à pied).
* Les mouvements du navire en navigation libre ou en transit s'effectuent à **vitesse propre constante** déterminée par ses propulseurs (`SHIP_MOTORS.json`), sans accélérer ni ralentir l'horloge stellaire de manière artificielle.
* Lors des sauts Warp interstellaires, le mode FTL (`Mode 4`) est maintenu pour simuler la dilatation temporelle relative du voyage Warp.

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
| `SC4_SpaceScenes` | `openHangar` | Ouvre le sous-système en mode débarquement. Accepte l'argument `@arg nefId` (défaut `2`). |

### Appels par Script JS (Événements RMMZ ou Menus)
```javascript
// 1. Accès rapide au Hangar de débarquement (avec ID de la navette)
SC4.openHangar(2); // Spécifie la navette ID 2 (ou défaut 2 si omis)

// 2. Ouvrir directement la carte galactique
SceneManager.push(Scene_SectorTravel);

// 3. Ouvrir le système solaire
SceneManager.push(Scene_SpaceTravel);

// 4. Gestion programmatique de l'onboarding et de l'amarrage
const navette = $gameSpaceships.ship(2);
navette.aboard("V1"); // Embarque à bord du croiseur ID 1
navette.aboard("D1"); // S'amarre au sas du vaisseau ID 1
navette.aboard(3, "P"); // Se pose sur la planète ID 3
navette.leaveHost(); // Libère le vaisseau de son hôte

// 5. Autoriser/révoquer l'amarrage vers son vaisseau
const playerShip = $gameSpaceships.playerShip();
playerShip.allowDocking(true); // Autorise d'autres vaisseaux à s'amarrer

// 6. Lire la variable NEF_ID stockée lors du débarquement
const lastNefId = $gameVariables.value(41);

// 7. Lire ou afficher la date stellaire Neotori
const dateStr = Game_DateFormatter.formatNeotori($gameDate);
$gameMessage.add(`Horloge Fédérale : ${dateStr}`);

// 8. Rendre le joueur à nouveau visible après débarquement
$gamePlayer.setTransparent(false);

// 9. Gestion des POIs découverts / masqués
$gameSystem.setPoiLocated("warp_beacon_alpha", true); // Découvre le POI
const isDiscovered = $gameSystem.isPoiLocated("warp_beacon_alpha");

// 10. Vérifier si l'atterrissage sur une planète est autorisé
const curPlanet = $gameSector.currentSystem().planet(1);
if (curPlanet.isLandingAllowed()) {
    // Autorisé
}

// 11. Vérifier si le vaisseau peut sauter en Warp (moteur certifié et 500 fuel)
if (playerShip.isWarpAllowed() && playerShip.fuel >= 500) {
    playerShip.startInterSystemJump(targetSystemId);
}

// 12. Ouvrir la console de passerelle de commandement
SC4.openBridgeConsole();

// 13. Ouvrir la navigation stellaire (Système / Secteur)
SC4.openNavigation();

// 14. Déclencher la séquence scénarisée d'atterrissage direct
SC4.performLandingSequence("prime_spatioport"); // ou sans argument pour le POI de l'orbite courante

// 15. Déclencher la séquence scénarisée de décollage direct vers l'orbite
SC4.performTakeoffSequence();

// 16. Vérifier si l'atterrissage est autorisé sur un astre ou spatioport
const isClearanceGranted = SC4.isLandingAuthorized(5); // planète 5

// 17. Accorder ou révoquer une autorisation d'atterrissage
SC4.setLandingAuthorized(5, true); // Accorde la clearance
SC4.setLandingAuthorized("prime_spatioport", true);
```

---

## 7. Liens & Documentation Connexe

* 📜 [**Tutoriel Système de Quêtes & Balises Multi-Échelles**](./TUTORIAL_QUEST_SYSTEM.md) : Gestionnaire `$gameQuests`, déclencheur `$storyManager`, balises hiérarchiques et transmissions radio CRT.
* 🌐 [**Tutoriel Système de Localisation**](./TUTORIAL_LOCALIZATION.md) : Traduction dynamique des noms de systèmes et de planètes via les balises `\L[KEY]`.
* 🎒 [**Tutoriel Conteneurs & Multi-Inventaires**](./TUTORIAL_CONTAINERS_INVENTORIES.md) : Gestion des cales et soutes du vaisseau.
