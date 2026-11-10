# 🛠️ SimCraft Engine V2 (SC4) — Journal de Développement & Walkthrough

> **SimCraft Engine V2 (SC4)** — Architecture modulaire pour RPG Maker MZ  
> *Dernière mise à jour : 8 Novembre 2026*  
> *Auteur : Pierre André Hernandez (Omnipr3z)*

---

## 🧭 Sommaire Général

1. [Vision & Principes d'Architecture V2](#1-vision--principes-darchitecture-v2)
2. [Système Composite Paperdoll & Moteur de Sprites (Étapes 1 à 8)](#2-système-composite-paperdoll--moteur-de-sprites-étapes-1-à-8)
3. [Combat ARPG Temps Réel, IA & Audio (Étapes 9, 11 & 11.5)](#3-combat-arpg-temps-réel-ia--audio-étapes-9-11--115)
4. [Contrôles Avancés, GUI & Facesets Dynamiques (Étapes 12 à 13.5)](#4-contrôles-avancés-gui--facesets-dynamiques-étapes-12-à-135)
5. [Écran Titre Cinématique & Menus Étendus (Étape 14)](#5-écran-titre-cinématique--menus-étendus-étape-14)
6. [Système de Gunfight & Balistique (Étapes G1 & G2)](#6-système-de-gunfight--balistique-étapes-g1--g2)
7. [Multi-Inventaires, Conteneurs & Système de Poids (Étape 10)](#7-multi-inventaires-conteneurs--système-de-poids-étape-10)
8. [Navigation Spatiale Multi-Échelles & Système Temporel (Étapes N1 à N3)](#8-navigation-spatiale-multi-échelles--système-temporel-étapes-n1-à-n3)
9. [Système de Quêtes, Balises & Journal de Bord (Datapad)](#9-système-de-quêtes-balises--journal-de-bord-datapad)
10. [Interface Utilisateur Avancée : Localisation, Bubble Messages & Ring Command](#10-interface-utilisateur-avancée--localisation-bubble-messages--ring-command)
11. [Outils de Diagnostic & Normes de Développement](#11-outils-de-diagnostic--normes-de-développement)
12. [Feuille de Route & Perspectives Futures](#12-feuille-de-route--perspectives-futures)

---

## 1. Vision & Principes d'Architecture V2

La refonte **SimCraft Engine V2 (SC4)** succède au moteur historique de SCE en appliquant des règles d'ingénierie strictes :
- **Légèreté & modularité** : suppression des sur-moteurs monolithiques. Chaque fonctionnalité forme un module indépendant réutilisable.
- **Surcharges chirurgicales** : les altérations du code vanilla RPG Maker MZ sont concentrées dans des fichiers de patchs dédiés (`SC4_rmmz_*_Patches.js`).
- **Standardisation des données** : séparation claire entre la logique JavaScript et les données déclaratives (fichiers JSON dans `data/SC/` et notetags).
- **Architecture unifiée** : synergie immédiate entre combat ARPG au sol, navigation spatiale multi-échelles, multi-inventaires et quêtes narratives.

---

## 2. Système Composite Paperdoll & Moteur de Sprites (Étapes 1 à 8)

### 2.1 Classes Fondatrices
- **`Bitmap_Composite`** : Assemble dynamiquement en mémoire tampon les différentes couches graphiques d'un personnage (corps, visage, vêtements, armes, armures) sans modifier les planches d'origine.
- **`Character_Hero`** : Extension de `Game_CharacterBase` gérant les 8 directions, le suivi du curseur souris, les postures et l'exécution des actions temporisées (`playAction`).
- **`Sprite_Hero`** : Rendu visuel optimisé du personnage sur la carte, synchronisé avec les données du `Character_Hero`.
- **`Game_Hero`** : Dérive de `Game_Actor` pour les acteurs déclarés avec le flag `<Hero>`.

### 2.2 Notetags Personnages
```text
<Hero>
<Race: Human>
<Sex: Male>
<Face>
```

### 2.3 Structure des Planches Graphiques (8 directions x 3 frames)
Chaque planche est constituée de 8 lignes (directions) et de colonnes de frames de 96x96 pixels :
- Frame index `0` : Pied gauche en avant
- Frame index `1` : Position de repos (idle)
- Frame index `2` : Pied droit en avant

| Ligne | Direction | Orientation | Rôle |
| :---: | :---: | :--- | :--- |
| **0** | `2` | Sud (Bas) | Face caméra |
| **1** | `4` | Ouest (Gauche) | Profil gauche |
| **2** | `6` | Est (Droite) | Profil droit |
| **3** | `8` | Nord (Haut) | Dos caméra |
| **4** | `1` | Sud-Ouest (Bas-Gauche) | Diagonale avant-gauche |
| **5** | `3` | Sud-Est (Bas-Droite) | Diagonale avant-droite |
| **6** | `7` | Nord-Ouest (Haut-Gauche) | Diagonale arrière-gauche |
| **7** | `9` | Nord-Est (Haut-Droite) | Diagonale arrière-droite |

### 2.4 Arborescence des Assets Composite
```text
img/characters/composite/
├── faces/
│   ├── [actorId]_[action].png
│   └── [actorId]_[action]_[weaponType].png
├── [race]/
│   └── [sex]/
│       ├── bodies/
│       │   ├── walk.png, run.png, guard.png, atk.png, hurt.png, down.png
│       │   └── walkreload_[weaponType].png, guard_[weaponType].png, ...
│       └── equipments/
│           ├── [equipName]_walk.png
│           ├── [equipName]_atk.png
│           └── ...
└── projectiles/
    └── bullet.png, laser.png, ...
```

### 2.5 Couches d'Équipement Paperdoll
Déclarées sur les armes et armures de la base de données :
```text
<visual_equip: FILENAME, Z_INDEX>
```
*Exemple :* `<visual_equip: flak, 55>` assemble `img/characters/composite/human/male/equipments/flak_walk.png` au-dessus du corps de base (Z: 50).

### 2.6 Contrôles & Système d'Attaque (Étapes 3 & 4)
- **Clic droit maintenu** : Fixe l'orientation vers le curseur (mode visée / garde). Le personnage adopte la posture `guard` et les déplacements se font aux touches directionnelles (ZQSD / WASD).
- **Clic gauche seul** : Déplacement standard vers la case ciblée.
- **Clic droit + Clic gauche** : Déclenche l'attaque dans l'axe du curseur.
- **Notetag d'action d'attaque** :
  ```text
  <visual_attack>
  <duration>4</duration>
  <frames>4</frames>
  <action_name>atk</action_name>
  </visual_attack>
  ```

### 2.7 Compagnons (Followers) & Événements Acteurs (Étapes 5 à 7)
- Pilotage direct des compagnons par script :
  ```javascript
  this.playAction({ action: "atk", duration: 4, frames: 4 });
  ```
- **Événements acteurs** : un événement portant `<actor: ACTOR_ID>` adopte l'apparence dynamique du héros. S'il entre dans l'équipe, l'événement est automatiquement masqué (sauf flag `<actor_visible>`).
- **Gestion d'équipe** : Clic gauche sur un compagnon au contact ouvre le menu contextuel (*Demander de rester* / *Ouvrir l'inventaire*). L'événement reste sur place et peut être réintégré via `joinPlayerParty()`.

### 2.8 Course & Anti-Scintillement (Étape 8)
- Passage fluide en posture `run` lors de la course.
- Temporisation anti-scintillement (*hysteresis*) empêchant le retour intempestif en `walk` entre deux pas.

---

## 3. Combat ARPG Temps Réel, IA & Audio (Étapes 9, 11 & 11.5)

### 3.1 Gestionnaire de Combat (`FightManager`)
- Singleton global `window.$fightManager`.
- Indexation continue des acteurs et ennemis sur la carte courante (`actorEvents()`).
- Détection des cibles au contact direct (`findHostileTargetInFront()`).
- Résolution par `Game_Action` native : knockback d'une case, posture `hurt`, posture `down` puis activation automatique du self-switch `C`.

### 3.1 bis Orchestrateur Tactique d'IA de Combat (`BattleAIManager` / `$battleAIManager`)
- Singleton global `window.$battleAIManager` instancié par `SC_DataManager.createGameObjects()`.
- **Registre unifié & Cycle de vie** : `_enemies` (`Map<number, IAManager>`) synchronisé au chargement de carte (`onMapLoaded`) et dynamique au spawn/mort.
- **Suivi réactif O(1) du niveau de menace** : `engagedCount()`, `hostileCount()`, `isCombatActive()`. Fin des boucles de scan d'événements à 60 FPS.
- **Bascule automatique Safe Zone / Mode Combat** : synchronise instantanément `$gameMap.setCombatMode(true/false)`.
- **Tactique Collective & Alerte de Meute (Pack Alert)** : `alertNearbyAllies(sourceEvent, target, radius = 6)`. Dès qu'un ennemi engage ou appelle à l'aide, tous ses alliés proches neutres ou en recherche rejoignent l'assaut (socle Nemesis).
- **Spatial Culling & Optimisation CPU** : espacement des calculs de perception pour les ennemis neutres hors écran (> 25 cases) et protection anti-double-tick (`_lastUpdateFrame`).
- **Orchestration Audio & Fondus Doux** : déclenchement du BGM de combat dès le 1er engagé, mémorisation du BGM de carte, et fondu de sortie de 3s (180 frames) avec reprise en fondu d'entrée dès la fin de l'engagement.

### 3.2 Notetags des Événements & Ennemis
- Événement : `<actor: ID>`, `<role: hostile>`, `<enemy: ENEMY_ID>`.
- Base de données héros : `<attackId: SKILL_ID>`.

### 3.3 Intelligence Artificielle Modulaire
Cycle d'états : **NEUTRE** ➔ **ENGAGÉ** ➔ **RECHERCHE** ➔ **RETOUR BASE**.
```text
<AI_MODE: melee>
<AI_BASE_SPEED: 2>
<AI_ATTACK_RANGE: 1>
<AI_ENGAGE_RANGE: 4>
<AI_ENGAGE_SPEED: 4>
<AI_SEARCH_RANGE: 10>
<AI_SEARCH_TIME: 60>
<AI_ATTACK_FREQUENCY: 240>
<AI_BASE_POSITION: 12, 8>
<AI_ZONE_ENGAEMENT_RANGE: 15>
```

### 3.4 Indicateurs Visuels Flottants Agnostiques (`Sprite_CharacterIndicator`)
Composant visuel entièrement agnostique et extensible via un registre d'indicateurs (`Sprite_CharacterIndicator.registerIndicator(type, config)`).  
Gère l'empilement en file d'attente (waitlist) et une animation en 3 phases de 60 frames (apparition 15f zoom 0.1 ➔ 1.0, maintien 30f, disparition 15f zoom 1.0 ➔ 1.5).
- **Alertes de Combat** (`img/GUI/indicators/ennemyAlert.png`) :
  - `!` (Point d'exclamation rouge, ligne 0) : Passage en mode **ENGAGE** (`"exclamation"`, `"engage"`).
  - `?` (Point d'interrogation rouge, ligne 1) : Passage en mode **RECHERCHE** (`"question_red"`, `"search"`).
  - `?` (Point d'interrogation jaune, ligne 2) : Perte de cible et retour en mode **NEUTRE** (`"question_yellow"`, `"neutral"`).
- **Indicateurs Extensibles** : Support natif pour de futurs marqueurs visuels (cœurs d'affinité, points de quête, bulles d'interaction).

### 3.5 Jauges de Combat au-dessus de l'Ennemi (`Spriteset_FightGauges`)
- Jauge HP dynamique (dégradé vert ➔ orange ➔ rouge selon les PV restants, clignotement sous 10%).
- Jauge MP (nuances de bleu).
- Jauge AT (*Attack Timer* blanche) visualisant la préparation du prochain coup.

### 3.6 Audio Dynamique & Récompenses
- BGM de combat maintenue pendant l'état `hurted`.
- Sons configurables par notetags d'événement :
  ```text
  <se_engage: Monster1_A, 100, 150>
  <se_search: Monster1_A, 90, 100>
  <se_forget: Monster1_B, 90, 100>
  <se_hurted: Monster1_C, 100, 150>
  <se_death: Monster1_C, 90, 100>
  ```
- Attribution automatique d'EXP au héros lors de la mort d'un ennemi.

---

## 4. Contrôles Avancés, GUI & Facesets Dynamiques (Étapes 12 à 13.5)

### 4.1 Mappage Clavier Personnalisable
- Configuration dans le menu Options (`ConfigManager.keyboardLayout`) :
  - **AZERTY** : `ZQSD` (Déplacements), `A` (Action spéciale), `E` (Interagir), `I` (Inventaire), `R` (Recharger).
  - **QWERTY** : `WASD` (Déplacements), `Q` (Action spéciale), `E` (Interagir), `I` (Inventaire), `R` (Recharger).

### 4.2 HUD Joueur & Compagnons (`Sprite_PlayerHUD`)
- Ancrage en haut à gauche de l'écran.
- Portrait Paperdoll dynamique 64x64, nom de l'acteur, jauges de PV, MP, TP et barre de progression d'EXP avec niveau.
- Mini-HUDs pour les compagnons de l'équipe (échelle 60%) disposés horizontalement à droite du HUD principal.
- Protection tactile : le clic sur le HUD n'entraîne aucun déplacement involontaire sur la carte.

### 4.3 Portraits Dynamiques (`Sprite_PaperdollFace`)
- Génération d'un portrait composite 144x144 pixels pour les acteurs `<Hero>`.
- Couche de base : `img/faces/hero/[actorId].png`.
- Couches d'équipements déclarées sur les pièces d'armure :
  ```text
  <face: EQUIP_FILENAME, Z_INDEX, UNISEX_BOOL>
  ```
- Remplacement transparent des appels `drawActorFace` vanilla via `drawDynamicFace`.

---

## 5. Écran Titre Cinématique & Menus Étendus (Étape 14)

### 5.1 Architecture des Couches Titre
```text
img/Titles1/Parralaxe.png  (z: 0)  - Défilement horizontal lent
img/Titles1/Bg_0.png       (z: 1)  - Arrière-plan spatial
img/Titles1/Bg_1.png       (z: 2)  - Nébuleuse intermédiaire
img/Titles2/Station.png    (z: 4)  - Station spatiale en zoom progressif (406, 225)
img/Titles2/Screw.png      (z: 5)  - Éléments rotatifs
img/Titles1/Bg_2.png       (z: 10) - Voile de transition
img/Titles2/Game_logo.png  (z: 11) - Logo du jeu avec translation haute
img/Titles2/Sc_logo.png    (z: 12) - Emblème SimCraft
img/Titles2/Left.png       (z: 13) - Volet gauche cinématique
img/Titles2/Right.png      (z: 14) - Volet droit cinématique
```

### 5.2 Scénario d'Animation d'Ouverture
1. Fondu progressif de la parallaxe et de `Bg_0`.
2. Apparition centrée du logo `Game_logo` (opacité 0.5), puis ascension vers le haut de l'écran avec fondu de `Bg_1`.
3. Apparition de la station en zoom (0.1 ➔ 1.0) et rotation du screw.
4. Transition de screw vers `Sc_logo`.
5. Déploiement de la fenêtre de commandes sans cadre.

### 5.3 Commandes Étendues
- **Débuter** & **Continuer** (avec transition cinématique des volets `Left`/`Right` et fondu vers `03Z_MystFallOut.ogg`).
- **Mode Libre** (`Scene_FreeGameStart`).
- **Options** (Langue FR/EN, clavier AZERTY/QWERTY, confort reload).
- **Codex** (`Scene_Codex`) : Base de connaissances et accomplissements.
- **Crédits** (`Scene_Credits`) : Défilement vertical avec BGM d'ambiance.
- **Quitter** : Fermeture propre de l'application.

---

## 6. Système de Gunfight & Balistique (Étapes G1 & G2)

### 6.1 Statistiques d'Armes à Feu (Notetags)
```text
<skillId: 1>
<range: 12>
<rateOfFire: 15>
<specialAnim: riffle>
<heavy>
<snipe>
<burst>
<shootSe: GunShot, 90, 100>
<projectileImg: bullet>
<projectileSpeed: 16>
```

### 6.2 Système de Rechargement (Reload)
```text
<reload: true>
<reloadAction: riffle>
<reloadMove: true>
<ammoId: 1>
<ammoCap: 30>
<reloadMode: total>
<rechargeTime: 120>
<reloadSe: Reload, 80, 100>
<outOfAmmo: EmptyClick, 90, 120>
```
- **Modes de rechargement** :
  - `1by1` : balle par balle (revolver / fusil à pompe). Maintien de la touche `R`. Interruption possible à tout moment en conservant les munitions chargées.
  - `total` : chargeur complet. Nécessite la fin du délai `rechargeTime`.
- **Persistance** : Stockage de l'état du chargeur par arme sur l'acteur (`actor._weaponAmmo[weaponId]`).
- **Option Confort** : Rechargement automatique au tir à vide configurable dans le menu Options.

### 6.3 Balistique & Améliorations de Visée (G1 & G2)
- **Alignement directionnel** : Ajustement du point de tir (-26px en horizontal et diagonales hautes, -36px en diagonales basses) pour coïncider avec le canon de l'arme.
- **Fondu d'apparition** : Fade-in du projectile sur les 64 premiers pixels de parcours.
- **Traversée des zones d'eau** : Les balles survolent l'eau tout en étant bloquées par les murs physiques.
- **Maintien de posture en rafale** : Suppression des oscillations visuelles vers `walk` lors d'un tir continu en rafale (`<burst>`).
- **Recentrage de caméra** : Réajustement dynamique du scroll (`updateScroll`) lors des tirs prolongés en déplacement.

---

## 7. Multi-Inventaires, Conteneurs & Système de Poids (Étape 10)

### 7.1 Architecture `$inventories` (`Game_Inventories`)
- Chargement et sauvegarde autonomes via `SC_DataManager` (`data/SC/INVENTORIES.json`).
- Préfixes d'identification standardisés :
  - `A_[ACTOR_ID]` : Inventaire personnel de héros / allié.
  - `C_[CONTAINER_ID]` : Conteneur physique sur la carte.
  - `E_[ENEMY_ID]` : Inventaire de dépouille d'ennemi.

### 7.2 Paramétrage des Conteneurs
- Persistance vs auto-effacement après vidage complet.
- Filtres de stockage : armes uniquement, munitions, consommables, etc.
- Déclencheur local : activation automatique de l'interrupteur local `B` quand le conteneur est vide, désactivation s'il contient des objets.

### 7.3 Système de Poids & Encombrement
- Notetag de poids sur les objets : `<height: NUMBER>` (valeur par défaut : 1).
- Équipements allégeants : possibilité de poids négatif sur les sacs et harnais.
- Capacité totale calculée sur la force (`atk`) cumulée de l'équipe active.
- Surcharge : immobilisation du joueur et signalement visuel d'encombrement.

---

## 8. Navigation Spatiale Multi-Échelles & Système Temporel (Étapes N1 à N3)

### 8.1 Les 3 Échelles de Navigation & Grille UI Harmonisée (1760 × 990)
1. **Échelle Galactique (Secteur FTL - `Scene_SectorTravel`)** : Carte des constellations et des étoiles reliées. Préchauffage et sauts Warp animés avec progression visible le long des routes stellaires. Identification visuelle des capitales de secteur (`capital: true`).
2. **Échelle Système Solaire (`Scene_SpaceTravel`)** : Vue orbitale temps réel autour de l'étoile centrale avec orbites elliptiques des planètes, satellites, astres décoratifs (`interactive: false`) et vaisseaux PNJ.
3. **Échelle Sous-Système (`Scene_SubsystemTravel`)** : Vue zoomée sur un astre en rotation continue avec ses Points d'Intérêt (POI) rotatifs et le vaisseau en orbite stationnaire.

#### Grille Pixel-Perfect Standardisée & Améliorations Ergonomiques :
Toutes les scènes spatiales partagent une architecture graphique rigoureusement identique en 1760 × 990 :
- **Zone de carte spatiale** : `1280 × 720` décalée de 12px en haut et à gauche (`mapOffsetX = 12`, `mapOffsetY = 12`).
- **Terminal de log CRT (`Window_SpaceEventLog`)** : `Rectangle(12, 744, 388, 234)` recevant les alertes, télémétries et transmissions radio. **Persistance multi-scènes** : l'historique est conservé dans `$gameSystem` lors des transitions (plus de réinitialisation brutale).
- **Description / Cible / POI (`Window_SpaceTargetInfo`)** : `Rectangle(412, 744, 880, 150)`. Support du défilement vertical à la molette (**Scroll Y**), textes tutoriels contextuels au lancement (4 lignes en secteur/système, invitation au débarquement ou contact Subcom en sous-système), et imagette / icône sur la gauche de la description.
- **Barre de commandes (`Window_SpaceControls`)** : `Rectangle(412, 906, 1336, 72)` regroupant les actions de navigation et vol. **Désactivée automatiquement pendant les transits FTL et les sauts Warp** pour sécuriser le pilotage.
- **Volet d'infos vaisseau (`Window_SpaceShipInfo`)** : `Rectangle(1304, 90, 444, 380)` avec **padding horizontal supérieur à 24px**, **portrait du Capitaine** dans le coin supérieur droit (avec badge "Capitaine" et nom de l'acteur), jauges de fuel, vitesse, coordonnées et **section "◈ Flotte à bord"** résolvant rigoureusement chaque vaisseau par ID.
- **Transitions Visuelles Douces** : Toutes les entrées et sorties de scènes spatiales, écran titre et cartes au sol intègrent un fondu au noir soigné (`startFadeIn(24)` / `startFadeOut(24)`).

### 8.2 Découplage des POIs, Planètes & Indexation 1-based
- **Indexation 1-based RMMZ** : Tous les jeux de données spatiales (`SECTORS.json`, `PLANETS.json`, `SPACESHIPS.json`, `SHIP_MOTORS.json`, `QUESTS.json`) intègrent `null` à l'index `0`. Le moteur garantit une recherche par identifiant explicite (`.find(e => e && e.id === id)`) prévenant tout décalage d'index.
- **Astres Décoratifs & Tidal Lock** : Les astres avec `"interactive": false` (anneaux, lunes mineures, nébuleuses) restent visibles et orbitent sans capturer le clic ni bloquer la navigation. Le paramètre `"lookAtCenter": true` oriente en continu les corps en verrouillage de marée vers leur centre focal.
- **Univers Neotori & Calendrier Stellaire** : Standard temporel Neotori :
  `Era:[Millenaire]-cycle:[an]-séquence:[mois]/[DECADE]/[JR DE LA DECADE] - [Hr:min]`. Vocabulaire unifié : "Fédération / Fédéral" et communications "Subcom".
- **Fichiers Découplés & Localisation Modulaire** : Répertoires modulaires `data/SC/loc/` (POIs, Planètes, Secteurs, Quêtes et UI) synchronisés automatiquement par `SC4_Localization`.
- **Découverte dynamique (`.located`)** : Les POIs non découverts (`located: false`) sont masqués de la carte sous-système et signalés dans les quêtes actives par la mention `[À localiser : Coordonnées inconnues]`.

### 8.3 Règles du Saut Warp FTL & Délai de Préchauffage (Warmup Delay)
- **Propulsion FTL (`warpAllowed`)** : Les moteurs de saut spatial disposent d'un attribut `warpAllowed: true/false` dans `SHIP_MOTORS.json` (réservé aux Moteurs 2 et 4).
- **Préchauffage Tactique de Saut** : Au déclenchement du saut Warp, un délai de 30 ticks (`_jumpWarmupTicks = 30`) prépare les générateurs avec le son `ShipJump.ogg`, la fenêtre de commande est désactivée et le CRT affiche *"Calcul des données de saut..."*.
- **Coût fixe au lancement** : Le saut Warp inter-système déduit immédiatement **500 unités de carburant** à l'engagement du saut (`startInterSystemJump`). Aucune consommation continue n'est prélevée pendant le transit.
- **Sécurité & Verrouillage** : Si le moteur n'est pas certifié Warp ou si le carburant est strictement inférieur à 500, le bouton de saut affiche explicitement *"Moteur non équipé"* ou *"Carburant insuffisant"*.

### 8.4 Système d'Onboarding & Amarrage (`V`, `D`, `P`)
Modélisation des relations physiques spatiales entre vaisseaux et corps célestes via l'attribut `onBoard` (persisté dans les sauvegardes) :
- **`V[ID]` (À bord du Hangar)** : La nef (ex: navette `V1`) est arrimée à l'intérieur du hangar du vaisseau `[ID]`. Elle est **masquée** de la carte stellaire, suit l'hôte et apparaît dans sa section "◈ Flotte à bord".
- **`D[ID]` (Amarré via Passerelle)** : Le vaisseau est amarré par un sas étanche au navire `[ID]`. Il reste **visible** sur la carte spatiale à proximité immédiate de l'hôte et se déplace solidairement avec lui.
- **`P[ID]` (Posé sur Planète)** : Le vaisseau a atterri sur la planète `[ID]`. Il est masqué de la carte du système et sa position est verrouillée sur celle de la planète.

### 8.5 Matrice de Compatibilité Inter-Classes & Accord d'Amarrage
L'embarquement et l'amarrage obéissent à des règles de classes strictes via `ship.getOnboardingMode(targetShipId)` :
- **Shuttle** -> Fregate ou Patrol Cruiser : `onBoard` (hangar adapté).
- **Escort & Scout** -> Patrol Cruiser : `onBoard` | Escort & Scout ou Fregate : `docking`.
- **Fregate** -> Escort & Scout, Fregate, Patrol Cruiser : `docking` | Shuttle : `notAllowed`.
- **Patrol Cruiser** -> toute catégorie : `notAllowed` (gabarit trop important pour être embarqué ou amarré à plus petit).
- **Autorisation requise (`_dockingAllowed`)** : Tout amarrage (`docking`) nécessite impérativement que le vaisseau hôte ait activé son autorisation (`target.dockingAllowed === true`). Vérifiable via `ship.isDockingAllowed(targetId)` et commutable via `ship.allowDocking(true/false)`.

### 8.6 Procédure d'Atterrissage, Mode Hangar & Dispatching (Variable 41 `NEF_ID`)
- **Accès Hangar** : Déclenché depuis la console ou le navire dans le hangar (`SC4.openHangar(nefId)` avec par défaut `nefId = 2`).
- **Affichage ciblé** : `Scene_SubsystemTravel` affiche les caractéristiques complètes de la nef/navette sélectionnée, tandis que la console de log reste connectée au vaisseau principal.
- **Débarquement automatisé** :
  1. Stockage de l'ID de la nef dans la variable RMMZ dédiée (`nefVariableId`, par défaut **Variable 41 `NEF_ID`**).
  2. Rendre le joueur invisible (`$gamePlayer.setTransparent(true)`).
  3. Activation du Self-Switch `A` de l'événement d'atterrissage sur la carte cible.
  4. Téléportation vers la carte de destination (pouvant être une carte vide servant de hub de transition et de dispatching scénarisé).

### 8.7 Découplage Temporel Total, Vitesse Constante & Continuité Orbitale
- **Indépendance Temps / Déplacement** : L'accélération artificielle du temps liée au simple fait que le vaisseau avance a été totalement supprimée. L'horloge stellaire `$gameDate` progresse de manière fluide à sa cadence propre.
- **Vitesse Propre Constante** : Le vaisseau navigue vers ses coordonnées de destination à vitesse constante indexée sur ses propulseurs (`SHIP_MOTORS.json`).
- **Simulation continue hors-scène** : Les trajectoires interplanétaires continuent en temps réel pendant que le joueur explore à pied (`Scene_Map`).
- **Physique orbitale continue & absolue** : Résolution du pas d'animation à chaque minute virtuelle via le ratio de progression sub-minute (`_tick / getTickPerMin()`). Les angles de révolution et de rotation sont calculés en continu sans aucune discontinuité ni à-coup au franchissement de minute.
- **Synchronisation dynamique des Vaisseaux Étrangers & Navettes** :
  - Les vaisseaux embarqués (`isOnBoard`) et les vaisseaux atterris (`isLanded`) sont dynamiquement masqués de la carte du système dans `Scene_SpaceTravel.updateShipGraphics()`.
  - Leurs coordonnées géographiques sont automatiquement et continuellement alignées sur celles de leur vaisseau hôte ou planète d'accueil dans `SystemMapManager.updateSpaceships()`.

### 8.8 Composants GUI Standardisés & Vocable de Navigation
- **Classe `SC4_GUI_Utils` (Centrage 'Contain')** :
  - Fournit les méthodes statiques `fitContain(srcW, srcH, maxW, maxH)` et `adjustSpriteContain(sprite, boxX, boxY, boxW, boxH)` prenant en charge le chargement asynchrone des Bitmaps RMMZ.
  - Évite tout monkey-patching inutile de `Window_Base` et garantit l'affichage pixel-perfect sans déformation du sprite du navire dans `Window_SpaceShipInfo`.
- **Vocable de Sortie Épuré** :
  - Harmonisation du bouton d'annulation des scènes spatiales en `"Retour (Échap)"` dans `Scene_SpaceTravel`, `Scene_SectorTravel` et l'ensemble des dictionnaires de localisation FR et EN.
- **Standardisation de la Hiérarchie Galactique** :
  - Remplacement de `segmentum` par `segment` dans `SECTORS.json` et prise en charge native dans `SC4_Window_SpaceCalendar.js` (`Galaxie ▷ Segment ▹ Secteur ▹ Système ▹ POI`).

### 8.9 Modèle Astronomique Lore, Déterminisme Absolu & Éclairage Solaire au Sol
- **Échelle Astronomique In-Lore ($1\text{ UA} = 100\text{ px}$)** :
  - Standardisation de toutes les distances planétaires en Unités Astronomiques (`orbitRadiusUA`). Les vitesses des vaisseaux s'expriment en UA/h.
- **Réalisme Chronologique & Calibrage Keplerien** :
  - Fin des rotations orbitales aberrantes en 11h : chaque astre possède une période de révolution (`orbitalDays`) et une rotation axiale (`rotationHours`) cohérentes selon son type et sa distance à l'étoile centrale :
    - *Planètes telluriques intérieures* ($1.5$ à $2.8\text{ UA}$) : année de $60$ à $110\text{ jours}$, rotation de $20\text{h}$ à $32\text{h}$, zoom $0.16$.
    - *Planète habitable de référence (Neotori Prime - ID 62)* ($3.7\text{ UA}$) : année étalon de **$360\text{ jours}$**, jour de **$24\text{h}$**, zoom $0.22$.
    - *Géantes gazeuses extérieures* ($4.8$ à $6.5\text{ UA}$) : année de $650$ à $1\,800\text{ jours}$, rotation rapide de $10\text{h}$ à $16\text{h}$, zoom $0.26 - 0.28$.
- **Surdimensionnement Ergonomique des Lunes & Satellites** :
  - *Règle de cliquabilité* : Les lunes naturelles (ex: Concordia, Knull, Ouro) sont volontairement agrandies (zoom passé de $0.05$ à **$0.12$**, soit ~43px) et leur rayon orbital légèrement étendu ($58\text{ px} = 0.58\text{ UA}$). Cela élimine les miss-clicks à la souris et offre une excellente lisibilité graphique de leurs cratères.
  - *Préservation stricte des Stations & Belts* : La taille et le zoom des stations orbitales, relais et champs d'astéroïdes V1 restent strictement inchangés.
- **Moteur Déterministe & Cadencement d'Update (`SystemMapManager`)** :
  - Tout mouvement est une fonction pure du temps universel `timestamp` : $\theta(t) = \theta_0 + 2\pi \times (t / P)$. Zéro dérive temporelle au changement de vitesse ou pause.
  - *Optimisation de la cadence* : En vol normal, les coordonnées orbitales progressent par pas horaire in-game (aucun jitter sub-pixel inutile pour un déplacement de $0{,}004\text{ px/min}$), tandis que la rotation axiale s'actualise toutes les 5 minutes in-game. En vitesse accélérée (x4, x12), le calcul redevient continu et fluide.
- **Calcul 2D de l'Heure Solaire Locale & Teinte au Landing** :
  - Calcul trigonométrique 2D en temps réel entre le vecteur Soleil $\theta_{\text{soleil}}$ et l'angle instantané du POI $\theta_{\text{poi}}$ :
    - $\Delta\theta \approx 0 \implies$ **12h00 (Plein Midi)** $\rightarrow$ Teinte neutre $[0, 0, 0, 0]$.
    - $\Delta\theta \approx \pm\pi \implies$ **00h00 (Minuit)** $\rightarrow$ Teinte nuit $[-70, -60, -30, 120]$.
    - $\Delta\theta \approx -\pi/2 \implies$ **06h00 (Aube)** $\rightarrow$ Teinte dorée matinale $[20, -10, -20, 30]$.
    - $\Delta\theta \approx +\pi/2 \implies$ **18h00 (Crépuscule)** $\rightarrow$ Teinte crépusculaire $[30, -20, -30, 60]$.
  - *Exception Ceintures d'Astéroïdes, Épaves & Stations* : Ambiance lumineuse fixe (`[-40, -35, -20, 90]`, obscurité froide du vide lointain et néons industriels), sans bascule dynamique de lever/coucher de soleil.
  - *Application continue au transfert* : La teinte est injectée dans `$gameScreen.startTint()` dès l'atterrissage dans `Scene_SubsystemTravel`.

### 8.5 Console de Passerelle (`Window_BridgeConsole`), Séquences V1 & Hublot Dynamique
- **Console de Passerelle (`SC4_Window_BridgeConsole.js`)** :
  - Fenêtre de commande contextuelle respectant rigoureusement le standard en 5 sections SimCraft.
  - Commandes : Navigation Stellaire (`!isLanded`), Atterrir (`!isLanded && canLand && isLandingAuthorized`), Décoller (`isLanded`), Amarrage (WIP), Subcom (WIP), Quitter.
  - Persistance automatique : Si le joueur ouvre la carte de navigation depuis la console et revient sur la carte de pont via `SceneManager.pop()`, la console se réouvre automatiquement (`$gameSystem._bridgeConsoleOpen`).
- **Séquences Scénarisées V1 (`SC4_Interface.js`)** :
  - `SC4.performLandingSequence(poiId)` : SE de propulsion/atterrissage (`FIREWIND2`), overlay de fondu `Landing_placeholder.png`, pose le vaisseau (`ship.aboard(planetId, "P")`), transfert silencieux (Map 37, x: 127, y: 58 pour `prime_spatioport`) et fondu sortant de transition.
  - `SC4.performTakeoffSequence()` : SE de saut (`ShipJump`), overlay, retour en orbite stationnaire (`ship.leaveHost()`, `ship.setOrbitingPlanet()`), transfert silencieux à bord du vaisseau (Map 31, x: 10, y: 10).
  - Gestion des autorisations d'accès : `SC4.isLandingAuthorized(id)` et `SC4.setLandingAuthorized(id, bool)`.
- **Hublot / Parallaxe Dynamique sur Cartes Intérieures (`<spaceshipIdParalaxes:[id]>`)** :
  - Notetag de carte RMMZ liant la carte à un vaisseau de flotte.
  - En orbite stationnaire : affiche la vue de la planète ciblée (`!planet_[id]`) en zero-parallax fixe sans scroll.
  - En saut hyperdrive / FTL (`InterSystemJump`) : active l'animation de défilement rapide `Warp` (`sx = 8`).
  - En espace profond : active la dérive d'étoiles `StarlitSky` (`sx = 0.5`).

---

## 9. Système de Quêtes, Balises & Journal de Bord (Datapad)

### 9.1 Séparation des Responsabilités & Architecture Modulaire
- **`$storyManager`** : Supervise les jalons temporels, les délais critiques (`deadlineTimestamp`) et les déclenchements de missions selon l'horloge `$gameDate`.
- **`$gameQuests` (`SC4_QuestManager`)** : Registre centralisé des quêtes et de leurs objectifs géolocalisés multi-échelles.
- **Données Modulaires** : Structure dans `data/SC/QUESTS.json` et localisations dans `data/SC/loc/QUESTS_FR.json` & `QUESTS_EN.json`.

### 9.2 Modèle Avancé de Quête (`Game_Quest`)
- **Catégorisation** : `"main"` (principale), `"secondary"` (secondaire), `"recurring"` (contrat de guilde / répétable), `"bounty"` (prime).
- **Récurrence & Compteur** : Les quêtes avec `repeatable: true` peuvent être réinitialisées et relancées (`quest.restart()`), avec comptabilisation précise des victoires (`quest.completedCount`).
- **Délais Temporels & Échéances** : Paramétrage d'un `deadlineDuration` en secondes. Le `deadlineTimestamp` est vérifié à chaque tick temporel (`checkDeadline()`) : si l'échéance est franchie avant accomplissement, la quête passe automatiquement au statut `failed` (échec).
- **Bascule de Suivi Tactique** : Le joueur peut choisir d'activer ou masquer les balises d'une quête sur le HUD et les cartes spatiales (`isTracking`, commutable via `quest.toggleTracking()`).

### 9.3 Balises Spatiales & Hotspots Multi-Quêtes
- Balises spatiales redimensionnées à 0.25x avec animation de pulsation respiratoire (scale + fade).
- **Hotspots Multi-Quêtes** : Lorsqu'un astre ou un POI réunit plusieurs objectifs simultanés, une pastille numérique (`+N`) apparaît automatiquement sur la balise (`updateHotspotBadge()`) pour informer immédiatement le joueur de la concentration d'opportunités.
- Masquage automatique des marqueurs de POI neutres lorsqu'une quête active pointe déjà sur les mêmes coordonnées.
- Alerte radio cockpit (`RadioComm`) signalant la mise à jour des objectifs.

### 9.4 Datapad / Journal de Bord (`Scene_QuestBook`)
- Accessible via le menu ou par script rapide :
  ```javascript
  SC4.openQuestBook(); // ou SceneManager.openQuestBook();
  ```
- Onglets : *En cours*, *Terminées*, *Toutes*.
- Affichage complet : description localisée, compte à rebours d'échéance pour les quêtes à délai, compteur de complétions pour les quêtes récurrentes, localisation hiérarchique stellaire (`Secteur ▹ Système ▹ Planète ▹ POI`) et aperçu des transmissions Subcom associées.

---

## 10. Interface Utilisateur Avancée : Localisation, Bubble Messages & Ring Command

### 10.1 Localisation Multi-Langue (`SC4_Localization`)
- Dictionnaires JSON dans `data/SC/Localisation_FR.json` et `Localisation_EN.json`.
- Balise universelle `\L[KEY]` (et `\l[key]`) résolue dynamiquement dans les messages, le nom de l'interlocuteur, les choix (`Window_ChoiceList`), le TextManager et les objets de la base de données.
- Changement de langue à la volée dans les Options, persistant dans `config.rpgsave`.
- Synchronisation automatique avec `$dataQuests`, `$dataPlanets` et `$dataPois`.

### 10.2 Messages en Bulles Flottantes & Portraits Déportés (`SC4_BubbleMessage`)
- `Window_BubbleMsg` remplace contextuellement les fenêtres de message traditionnelles.
- **Suppression des Facesets dans les Bulles** : Aucun portrait n'est dessiné à l'intérieur des bulles; leurs dimensions s'adaptent exclusivement au volume de texte.
- **Gestion des Interlocuteurs & HUDs** :
  - **Joueur qui parle avec le faceset `System:1`** : Le portrait dans `Sprite_PlayerHUD` s'illumine d'un cadre rouge interne de 2px (`_isSpeaking = true`).
  - **Événement/PNJ qui parle avec le faceset `System:1`** :
    - Si l'événement est un héros : affichage du portrait composite Paperdoll dans le nouveau HUD en haut à droite (`Sprite_InterlocutorHUD`).
    - Sinon : aucun portrait.
  - **Autre faceset sélectionné** : affiché dans `Sprite_InterlocutorHUD` avec cartouche du nom au liseré doré.
  - **Nom du locuteur** : défini directement dans le champ "Nom" vanilla de l'éditeur RPG Maker MZ, avec support natif du tag `\L[clé]` ou `\l[clé]`.
- Balises de ciblage :
  - `\A` : Cible le joueur (`$gamePlayer`).
  - `\E[ID]` : Cible l'événement désigné.
  - `\PX[X]`, `\PY[Y]` : Coordonnées cartésiennes fixes.
- **Edge Clamping** : Si la cible sort de l'écran, la bulle reste ancrée au bord le plus proche avec pointage directionnel.
- Rétablissement automatique du mode vanilla si aucune balise n'est présente.

### 10.3 Ring Command Menu (`SC4_RingCommand`)
- Menu circulaire rotatif (`Window_RingCommand`) déclenché par clic/touch sur le héros.
- Animation fluide d'ouverture Ease-Out du rayon.
- Prise en charge des icônes du set d'icônes natif, emojis et labels courts.
- Navigation angulaire intuitive à la souris et au clavier.

---

## 11. Outils de Diagnostic & Normes de Développement

### 11.1 Journalisation Conditionnelle (`DEBUGTOOL`)
```javascript
DEBUGTOOL.log("Cible engagée à portée", "COMBAT");
DEBUGTOOL.logFormat({ actor: "Paolo", hp: 120 }, "Acteur : %[actor], PV : %[hp]");
```
- Activation globale ou sélective par clé via les paramètres du plugin.
- Affichage aligné au-delà de la colonne 80 pour ne pas polluer la lecture du code.

### 11.2 Normes de Codage
- Une classe principale par fichier JavaScript ("1 Fichier = 1 Classe").
- Préfixe unifié `SC4_` sur tous les plugins métier du projet SimCraft pour éviter les conflits et assurer un classement alphabétique propre dans l'éditeur.
- Surcharges du moteur vanilla concentrées dans `SC4_rmmz_*_Patches.js` (Règle d'exception : ne pas scinder les patches natifs).
- Gestionnaire de données SimCraft `SC4_DataManager.js` traité de façon autonome en dehors des patches vanilla.
- Conservation absolue des bannières d'en-tête ASCII et licences.
- Préservation de l'intégrité des données vanilla (aucun hack destructif dans les JSON de base).
- Synchronisation RMMZ Editor : à chaque modification de `js/plugins.js`, bascule de la propriété `nickname` de l'Acteur 1 dans `data/Actors.json` (`"Wesword"` <-> `"Wesword_RMMZ"`) pour forcer le rafraîchissement natif de l'éditeur.

### 11.3 Façade Publique Universelle & Modularité (`SC4_Interface`)
- **Gateway Unique (`SC4_Interface.js`)** :
  - Centralisation de toutes les commandes de plugin RPG Maker MZ (`openSector`, `openSystem`, `openHangar`, `openQuestBook`, `openInventory`, `setHeroPose`, `clearHeroPose`).
  - API globale documentée en JSDoc sous le namespace `window.SC4.*`.
  - Alias rétrocompatibles pour les anciens appels de commande (`SC4_SpaceScenes`).
- **Décomposition Modulaire Accomplie** :
  - **Livre de Quêtes** : 4 fenêtres dédiées (`SC4_Window_QuestBookHeader`, `SC4_Window_QuestFilter`, `SC4_Window_QuestList`, `SC4_Window_QuestDetail`) et 1 scène orchestratrice pure (`SC4_Scene_QuestBook`).
  - **Multi-Inventaires** : 3 fenêtres dédiées (`SC4_Window_InventoryCommand`, `SC4_Window_InventoryList`, `SC4_Window_InventoryAction`) et 1 scène orchestratrice pure (`SC4_Scene_Inventory`).
  - **Moteur Spatial** : 6 modèles physiques et de gestion (`SC4_Game_Planet`, `SC4_Game_PlanetarySystem`, `SC4_Game_Sector`, `SC4_Game_Spaceship`, `SC4_Game_Spaceships`, `SC4_SystemMapManager`) orchestrés par `SC4_SpaceTravel`.
  - **Gestionnaire de Quêtes** : 4 modèles métiers (`SC4_Game_QuestLocation`, `SC4_Game_Quest`, `SC4_Game_Quests`, `SC4_StoryManager`) orchestrés par `SC4_QuestManager`.
  - **Calendrier & Horloge** : Séparation propre du modèle de temps (`SC4_Game_Date`) et du formateur lisible (`SC4_Game_DateFormatter`).
- **Couverture de Tests** : 30 suites de tests unitaires validées à 100% sans aucun échec (`node UNIT_TESTS/run_all_tests.js`).

### 11.5 Zones Sécurisées, Mode Combat Automatique & Système de Poses Persistantes
- **Safe Zones & Détection de Combat Automatique (`SC4_rmmz_objects_Patches.js`, `SC4_IAManager.js`)** :
  - Détection automatique d'environnement pacifique : cartes avec `disableDashing: true` ou notetag `<safe_zone>`.
  - Mode Combat dynamique : active l'état de combat si des ennemis hostiles sont vivants et alertés (`IAManager.countActiveHostileEnemies() > 0`).
  - Priorité absolue au Sprint : en mode combat, le dash/sprint est débloqué même sur les cartes `disableDashing`.
  - Rengainage automatique : en zone sécurisée, les tirs, rechargements et attaques sont désactivés, les armes sont rangées.
- **Système de Poses Persistantes (`canMove`, `allowDash`, `speedMod`, `onAlert`)** :
  - Poses statiques (`sit`, `lay`, etc.) ou de locomotion (`sneak`, `rampe`) persistantes jusqu'à appel de `clearPose()`.
  - Options de pose :
    - `canMove: false` fige le déplacement tout en maintenant la pose active.
    - `allowDash: false` interdit la course durant la pose lente.
    - `speedMod` ajuste dynamiquement la vitesse de déplacement.
    - `onAlert: true` annule automatiquement la pose au déclenchement d'une alerte combat pour repasser en posture de marche/combat (`walk`).
  - API : `$gamePlayer.setPose(name, opts)`, `$heroHub.setPose(actorId, name, opts)`, `SC4.setHeroPose(...)`, `SC4.clearHeroPose(...)`.

### 11.4 Architecture Modulaire Standard des Fenêtres (`Window_*`)
### 11.6 Architecture des Sous-Scènes Superposées (`SubScene_Base` & `SubScene_Console`)
- **Infrastructure Générique (`SC4_SubScene_Base.js`)** :
  - Dérive de `Scene_Base` et s'exécute superposée sur `Scene_Map` sans décharger le contexte de jeu actif.
  - Gestion indépendante de la pile de fenêtres (`addWindow`, `updateWindowPositions`) et capture transparente des clics souris et touches clavier.
  - Découplage complet : protège le joueur contre toute fermeture intempestive et garantit une restitution propre des contrôles à la sortie.
- **Console de Passerelle de Commandement (`SubScene_Console`, `SC4_Window_BridgeConsole.js`)** :
  - Menu contextuel intelligent du cockpit de pilotage :
    1. 🛰️ **Navigation Stellaire** : Active en vol ou en orbite, ouvre `Scene_SpaceTravel` ou `Scene_SectorTravel`.
    2. 🛬 **Atterrir (Débarquement)** : Conditionné à la présence en orbite, au gabarit du navire (`canLand`), et à l'autorisation (`isLandingAuthorized`).
    3. 🛫 **Décoller** : Activé uniquement lorsque le vaisseau est posé au sol (`isLanded`).
    4. ⚓ **Amarrage / Sas** & 📡 **Subcom** (Réservés WIP).
    5. ❌ **Quitter la console** : Referme la sous-scène et rend le contrôle du déplacement au sol.
- **Séquences Scénarisées V1 (`SC4_Interface.js`)** :
  - `SC4.performLandingSequence(poiId)` : Joue le SE `FIREWIND2`, affiche l'overlay `Landing_placeholder.png`, amarre le vaisseau à l'astre (`ship.aboard(planetId, "P")`), téléporte le joueur sur les coordonnées du tarmac du spatioport (Map 37, x: 127, y: 58 pour `prime_spatioport`) et effectue un fondu sortant.
  - `SC4.performTakeoffSequence()` : Joue le SE `ShipJump`, affiche l'overlay, replace le navire en orbite (`ship.leaveHost()`), et téléporte le joueur à bord du vaisseau (Map 31, x: 10, y: 10).
  - Gestion d'autorisation universelle : `SC4.isLandingAuthorized(id)` et `SC4.setLandingAuthorized(id, val)`.

### 11.7 Hiérarchie Spatiale & Classification des Vaisseaux
- **Hiérarchie Universelle en 5 Niveaux** :
  - 1. **Galaxie** : Macro-univers.
  - 2. **Segment** : Vaste région galactique majeure reliée par des Giga-Portes.
  - 3. **Secteur** : Zone stellaire locale (ex: Secteur Ankaros) reliée par des Portes Stellaires.
  - 4. **Système** : Système planétaire articulé autour d'une étoile centrale (Sol, Alpha Centauri).
  - 5. **Sous-système** : Corps célestes et structures locales (Planètes, Lunes, Ceintures d'astéroïdes, Stations, POIs).
  *(Documenté exhaustivement dans [TUTORIAL_SPACE_TRAVEL.md](file:///c:/SERVER/htdocs/SimCraft/SC4/DEV_TUTORIALS/TUTORIAL_SPACE_TRAVEL.md))*.
- **Classification par Gabarits Entiers (`SHIP_CATEGORIES.json`)** :
  - Fichier de données `data/SC/SHIP_CATEGORIES.json` et localisations `SHIP_CATEGORIES_[FR/EN].json`.
  - Attribut numérique `size` (1 à 4) déterminant les capacités physiques :
    - **Taille 1 (Nefs, Chasseurs, Navettes)** : Ultra-légers, capables d'atterrir sur tous les sols et d'entrer dans les hangars de vaisseaux porteurs.
    - **Taille 2 (Escorteurs légers, Scouts)** : Gabarit intermédiaire, atterrissage autorisé sur spatioports et plaines solides.
    - **Taille 3 (Frégates, Escorteurs lourds)** : Bâtiments de ligne, atterrissage atmosphérique strictement interdit. Opèrent en orbite ou amarrage sas.
    - **Taille 4 (Croiseurs, Cuirassés capitaux)** : Géants de flotte. Strictement spatiaux, utilisation obligatoire de nefs embarquées pour descendre à terre.

### 11.8 Contrôles Temporels Spatiaux & Lissage Déterministe de la Rotation (Option 2)
- **Volet de Contrôle Temporel (`SC4_Window_SpaceTimeControls.js`, `SC4_Scene_SpaceTravel.js`)** :
  - Fenêtre dédiée intégrée au tableau de bord spatial : Pause (0x), Vitesse Normale (1x), Avance Rapide (5x), Voyage Warp (20x).
  - Règle de réinitialisation automatique : Lors d'un transit de navigation vers un astre ou un POI, la vitesse repasse obligatoirement en 1x dès l'arrivée à destination pour éviter tout dépassement.
- **Lissage Visuel Continu de la Rotation Planétaire (Option 2)** :
  - Découplage de l'ancienne quantification par paliers de 5 minutes (`Math.floor(progress / 5) * 5`).
  - Calcul direct frame-accurate à 60 FPS basé sur le timestamp universel et le ratio de ticks par minute (`progress = timestamp + (_tick / tickPerMin)`).
  - Fluidité soyeuse sans aucune saccade visuelle, tout en conservant une synchronisation parfaite à 100% avec les coordonnées orbitales, les POIs de surface et le calendrier stellaire.

### 11.9 Ergonomie Multi-Inventaires : Commande "Tout vider" & Alerte Surcharge
- **Commande "Tout vider" (`SC4_Window_InventoryCommand.js`)** :
  - Ajout d'une 4e option dans la barre supérieure de transfert d'inventaire permettant de piller d'un bloc un conteneur secondaire vers l'inventaire du joueur.
  - Commande automatiquement grisée si le poids cumulé du conteneur dépasse la capacité de charge restante du joueur.
- **Alerte Modale de Surcharge à la Fermeture (`SC4_Scene_Inventory.js`)** :
  - Lors de la fermeture de la scène d'inventaire, si le joueur se trouve en surcharge (`isOverweight`), suspension de la sortie et affichage d'un dialogue de confirmation :
    `"[Acteur] est en surpoids et ne pourra plus se déplacer. Voulez-vous confirmer ?"`
  - Permet d'éviter de se retrouver bloqué au sol sur la carte sans possibilité de manœuvre.

### 11.10 Parallaxe Dynamique Tri-Couche des Cartes de Vaisseau (`SpaceParallaxesManager`)
- **Déclaration sur la carte intérieure (`Inner Map`)** :
  - Notetag générique RMMZ : `<spaceship:[id]>` (ex: `<spaceship: 1>` ou `<spaceship: player>`).
  - Stocké dans `$gameMap._spaceShipId`, servant de référence universelle pour toutes les mécaniques du vaisseau sur la carte.
  - Orientation initiale récupérée depuis le JSON de la map (`$gameMap.shipHeadingVector()`, par défaut `{ x: 0, y: -3 }`).
- **Moteur d'État Centralisé (`SC4_SpaceParallaxesManager.js`)** :
  - Interroge l'état cinétique et spatial du navire et renvoie l'état synchronisé des 3 couches : `{ lower, mid, upper }`.
  - Évite les interrogations redondantes à chaque frame via mise à jour centralisée dans `Spriteset_Map.prototype.updateSpaceshipParallaxes()`.
- **Architecture Tri-Couche (Triple Parallax Layer)** :
  1. **Couche Basse (`this._parallax`)** :
     - *À l'arrêt / orbite stationnaire* : Fond fixe (`StarlitSky`, `sx = 0, sy = 0`).
     - *En propulsion sous-lumière* : Défilement cinétique orienté selon le cap de la carte proportionnel à la vitesse des propulseurs (`ship.speed`).
     - *En saut FTL / Warp* : Texture `Warp.png` avec défilement rapide `sx = 8`.
  2. **Couche Intermédiaire de Profondeur (`this._parallaxDepthLayer`)** :
     - Étoiles rapprochées sur fond transparent (`img/parallaxes/Stars.png`, `TilingSprite`).
     - Défilement à coefficient `x1.6` par rapport au fond pour un effet de profondeur 3D naturel.
     - Masqué automatiquement durant les sauts Warp.
  3. **Couche Haute (`this._parallaxUpperLayer`, `SC4_Sprite_ParallaxesUpperLayer.js`)** :
     - Rendu des astres visibles à travers les baies vitrées de la passerelle.
     - **Changement de repère & calcul d'angle relatif** : Projection trigonométrique du vecteur galactique $(dx, dy)$ dans le repère local du navire selon son cap $\theta = \text{atan2}(V_y, V_x)$ :
       $$D_{\text{forward}} = dx \cdot \cos\theta + dy \cdot \sin\theta$$
       $$D_{\text{right}} = -dx \cdot \sin\theta + dy \cdot \cos\theta$$
     - **Champ de vision 2D (178×99 px)** : L'astre apparaît dès qu'il entre dans la boîte de détection ($|D_{\text{forward}}| \le 49.5$, $|D_{\text{right}}| \le 89$).
     - **Projection écran fluide** : Quelle que soit la trajectoire sur la carte galactique, l'astre arrive toujours par le haut du hublot et descend vers le centre en harmonie avec le défilement des étoiles.
     - **Échelle Hublot** : Zoom multiplié par 10 (`planet.zoom * 10`) pour correspondre au ratio d'agrandissement vers le plein écran.
     - **Orbite stationnaire** : Centrage parfait au milieu de la baie vitrée (`centerX, centerY`).

### 11.11 Registre des Factions & Système de Relations (Nemesis)
- **Fichier de données `data/SC/FACTIONS.json` et localisations `FACTIONS_[FR/EN].json`** :
  - 8 factions majeures avec ID 1-based, index 0 `null`, affinité (-100 à +100), balance de pouvoir et matrice relationnelle croisée.
  - Modèles métiers `Game_Faction` (`SC4_Game_Faction.js`) et registre global `$gameFactions` (`SC4_Game_Factions.js`) intégrés à `SC4_DataManager.js` pour chargement et persistance dans les sauvegardes.
  - Document maître exhaustif : [SC4_RELATIONSHIP_SYSTEM.md](file:///c:/SERVER/htdocs/SimCraft/SC4/SC4_RELATIONSHIP_SYSTEM.md).

### 11.12 Standardisation des Patchs RMMZ & Gestion Propre des Plugins
- **Norme d'ingénierie des fichiers de patchs (`SC4_rmmz_*_Patches.js`)** :
  - Organisation stricte par classe : nom en commentaire, bloc d'alias groupé en tête, ligne vide, méthodes ordonnées sans doublons de surcharge.
  - Respect de l'ordre natif des classes vanilla RMMZ pour faciliter la navigation et le `foldall` dans l'éditeur.
  - Règle *Fail Fast* : suppression des vérifications défensives redondantes sur les classes natives et maintien de logs explicites d'erreur.
  - Rapatriement de toutes les surcharges éparses dans leurs fichiers d'origine dédiés (`objects`, `sprites`, `windows`, `scenes`, `core`).
- **Organisation en Blocs Structurés dans `js/plugins.js`** :
  - Découpage par catégories lisibles : `DEV TOOLS`, `CORE`, `GAME OBJECTS`, `SPRITES`, `WINDOWS`, `SCENES`, `MANAGERS`, `PATCHES`.
  - Sauvegarde miroir automatique dans `js/plugins.backup.js`.
  - Protocole de synchronisation RMMZ via bascule du nickname de l'Acteur 1 dans `data/Actors.json` (`Wesword` / `Reload_RMMZ`).

### 11.13 Conteneur de Calques Stellaires `Spriteset_UpperLayers` & Multi-Planètes Parallaxes
- **Architecture de Rendu Découplée (`SC4_Spriteset_UpperLayers.js`)** :
  - `Spriteset_UpperLayers` dérive de `PIXI.Container` et organise séparément les couches d'astres (`_planetsContainer`) et de vaisseaux spatiaux (`_shipsContainer`).
  - Indexation directe des astres via `Map` basée sur `$gameGalaxy.currentSystem()._data.planetIds`.
  - Détection de saut / changement de système stellaire via `isPlanetarySystemChanging()` et réinstanciation propre (`setupPlanets`).
  - Culling optimisé hors champ (seuil 250 px) et masquage total (`visible = false`, update bypassé) lors des sauts FTL Warp.
  - Facteurs d'échelle normalisés : ratio $\times 20$ pour les corps célestes et planètes en parallaxe, $\times 2$ pour les stations orbitales (`isStation()`).

### 11.14 Alignement Souverain sur `$gameGalaxy` & Refonte du Système de Quêtes
- **Hiérarchie Spatiale Ascendante et Fail Fast** :
  - Éradication intégrale des références obsolètes à `$gameSector` au profit de `$gameGalaxy` (`Galaxy -> Sectors -> Systems -> Planets -> POIs`).
  - Suppression sans compromis de tous les shims/sparadraps de rétrocompatibilité (`Object.defineProperty(window, "$gameSector")`, `currentSectorData()`).
  - Nettoyage des fichiers déclaratifs `QUESTS.json` : suppression des IDs ancêtres redondants (`sectorId`, `systemId`, `planetId`) lorsque la cible est un POI ou une planète.
- **Résolution Dynamique dans `Game_QuestLocation`** :
  - Résolution ascendante automatique des parents via les getters `poi`, `planet`, `system`, `sector`, `target`.
  - Résolution dynamique des IDs (`poiId`, `planetId`, `systemId`, `sectorId`) pour assurer la projection multi-échelles continue des balises tactiques (`Scene_SectorTravel`, `Scene_SpaceTravel`, `Scene_SubsystemTravel`).
  - Méthode unifiée de fil d'Ariane `breadcrumbText()` et gestion intégrée de la découverte de site (`isLocated`).
- **Nettoyage Architectural** :
  - `SC4_Window_QuestDetail.js` allégé et connecté directement aux getters hiérarchiques de `Game_QuestLocation`.
  - `SC4_QuestManager.js` et `SC4_Scene_QuestBook.js` purgés de leurs chargeurs Node.js obsolètes.
  - Ajout des méthodes de balises pour secteurs stellaires `hasIndicatorForSector` et `getIndicatorsForSector` dans `SC4_Game_Quests.js`.
  - Validation complète par suite de tests unitaires dédiés (`UNIT_TESTS/test_quest_galaxy_integration.js`).

### 11.15 Gestionnaire de Sous-Scènes `SubSceneManager` & Persistance Inter-Scènes
- **Orchestration Centralisée (`SC4_SubSceneManager.js`)** :
  - Classe statique dédiée gérant le cycle de vie, la mise en veille et la restauration des sous-scènes (`SubScene_Base`) au travers des transitions de scènes natives (`SceneManager.push` / `SceneManager.pop`).
  - Suspension explicite via `SubSceneManager.suspend(subScene, resumeData)` : mémorise la classe constructeur, les arguments d'instanciation (`resumeArgs()`) et l'état contextuel (mode d'onglet, index).
  - Restauration automatique transparente au `start()` de `Scene_Map` via `SubSceneManager.resume(this)` avec consommation immédiate pour prévenir toute réinstanciation multiple.
  - Purge explicite sans effet de bord (`SubSceneManager.clear()`) lors des actions terminales (quitter, atterrissage, décollage, téléportation de carte).
- **Intégration du Pupitre de Passerelle (`SC4_SubScene_Console.js`) & Dialogue Social (`SC4_SubScene_RelationDialog.js`)** :
  - Le bouton "Navigation" suspend la console de commandement (`mode: 'main'`) avant d'ouvrir la carte spatiale (`Scene_SpaceTravel`).
  - Lorsque le joueur quitte la carte spatiale pour revenir sur la passerelle, la console se réouvre instantanément avec le vaisseau et le mode actifs.
  - La sous-scène de dialogue social `SubScene_RelationDialog` intègre la persistance `resumeArgs()` (`[targetActorId, targetEventId]`) et la purge explicite `onCommandCancel()` avec clôture propre de session dans `RelationDialogManager`.
  - Point d'entrée souverain `SubSceneManager.open(subSceneClass, ...args)` unifié pour les modules métiers (`RelationManager`, `SC4.openRelationDialog`, `SC4.openBridgeConsole`).
- **Validation** :
  - Test unitaire dédié : [`UNIT_TESTS/test_subscene_manager.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/UNIT_TESTS/test_subscene_manager.js) (9/9 tests validés).

### 11.16 Hublot Spatial & Projection Parallaxe Haute (`SC4_SpaceParallaxesManager.js`)
- **Échelle de Projection Cockpit & Getters Modulaires** :
  - Facteur d'échelle de projection $K = 10$ configuré via l'accesseur statique `SpaceParallaxesManager.projectionScale`, étendant considérablement la respiration spatiale entre les astres dans la vue cockpit.
  - Getters statiques dédiés pour chaque catégorie d'astre dans `SpaceParallaxesManager` :
    - `planetZoomMultiplier = 30` (Planètes)
    - `moonZoomMultiplier = 30` (Lunes)
    - `starZoomMultiplier = 4` (Étoiles / Soleils)
    - `stationZoomMultiplier = 2` (Stations orbitales)
    - `vortexZoomMultiplier = 4` (Vortex Warp)
    - `beltZoomMultiplier = 4` (Ceintures d'astéroïdes)
  - Méthode de résolution centralisée `SpaceParallaxesManager.resolveZoomMultiplier(p)`.
- **Bounding-Box Culling (Zéro Pop-in)** :
  - Remplacement du culling ponctuel par un test de boîte englobante tenant compte du rayon visuel maximal de l'astre :
    $$\text{visualRadiusPx} = \lceil 350 \times \text{pZoom} \rceil$$
  - L'astre glisse désormais de façon continue et naturelle depuis l'extérieur de l'écran sans aucune apparition brutale.
- **Refactorisation Modulaire Fail-Fast** :
  - Découpage de la méthode monolithique `getParallaxesStatus` en sous-fonctions spécialisées à responsabilité unique (`computeBackgroundLayers`, `computeUpperLayer`, `getScreenParams`, `resolveShipHeading`, `computePlanetsInView`, `projectPlanet`).
  - Suppression de tous les garde-fous défensifs redondants au profit d'un contrat Fail-Fast direct.
  - Correction de l'horloge stellaire dans `SC4_SystemMapManager.js` : suppression du `setScrollSpeedMode(2)` forcé pour rétablir le plein contrôle des modes (Pause, 1x, 5x, 20x) et la réinitialisation 1x au retour sur `Scene_Map`.
- **Validation** :
  - Test unitaire dédié : [`UNIT_TESTS/test_space_parallaxes_manager.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/UNIT_TESTS/test_space_parallaxes_manager.js) (11/11 tests validés).

### 11.17 Système Anti-Oscillation de Déplacement Clic/Tactile (`SC4_rmmz_objects_Patches.js`)
- **Mémoire Tampon 4 Pas (`_touchMoveHistory`)** :
  - Enregistre la séquence des déplacements `{ direction, x, y }` effectués sous le contrôle de la souris/toucher (`$gameTemp.isDestinationValid()`).
  - Borné strictement aux 4 derniers mouvements.
  - Purge automatique à chaque nouveau clic (`Game_Temp.prototype.setDestination`), annulation (`Game_Temp.prototype.clearDestination`), ou reprise de contrôle au clavier (`Input.dir8 > 0`).
- **Détection d'Oscillation & Minimum Local (`isTouchMoveOscillating`)** :
  - Détecte les va-et-vient alternés en directions opposées (`[4, 6, 4, 6]`, `[7, 3, 7, 3]`, etc.).
  - Détecte les doubles allers-retours consécutifs et les boucles de coordonnées géographiques (visite répétée de la même case).
- **Interruption Immédiate & Orientation Face à la Cible** :
  - Dès qu'une oscillation est constatée lors d'un clic sur une zone inaccessible (mur, falaise, meuble, obstacle diagonal) :
    1. Annulation immédiate du déplacement : `$gameTemp.clearDestination()`.
    2. Purge de l'historique : `this.clearTouchMoveHistory()`.
    3. Orientation 8 axes vers la destination cliquée via `directionToPosition(destX, destY)`.
    4. Interruption de l'appel `executeMove8Dir` : le personnage s'arrête net sans à-coup et regarde la case cible.
- **Validation** :
  - Test unitaire dédié : [`UNIT_TESTS/test_touch_anti_oscillation.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/UNIT_TESTS/test_touch_anti_oscillation.js) (5/5 tests validés).

### 11.18 Architecture Narrative & Moteur de Quêtes : Découplage `QuestManager` & `StoryManager` (Nexus)
- **Découplage Structurel** :
  - **`QuestManager` (`$questManager` dans `SC4_QuestManager.js`)** : Contrôleur opérationnel du cycle de vie unitaire des quêtes (activation manuelle `start()`, avancée d'étape `advanceStep()`, clôture `complete()`, échec `fail()`, et attribution automatique des récompenses en or, expérience et objets).
    - Gestion des déclencheurs temporels (`triggerTimestamp`) et de découverte géographique de POI (`triggerPoiLocated`) évalués automatiquement sans faux positifs.
    - Échéances calendaires impératives (`deadlineTimestamp`) entraînant l'échec automatique de la mission si dépassée.
    - Persistance intégrale dans la sauvegarde (`contents.sc_questManager` via `SC_DataManager`).
  - **`StoryManager` (`$storyManager` dans `SC4_StoryManager.js`)** : Moteur macro-scénaristique orchestrant l'arbre d'embranchements non-linéaire articulé autour des **5 Nœuds Narratifs Majeurs** convergeant vers la bataille décisive du **Nexus**.
    - Gestion de la dualité d'alignement (`order` vs `liberty`), métriques d'influence politique et résolution des 5 Nœuds :
      1. *Nœud 1 : Conférence Diplomatique de Neotori* (première rupture et découverte du Nexus).
      2. *Nœud 2 : Réveil des Atrons & Crise de reZero* (choix éthique de préservation du bug ou transfert de conscience).
      3. *Nœud 3 : Hybridation Atron-Élion & Trahison Fédérale*.
      4. *Nœud 4 : Chute d'Ankaros & Mobilisation Générale*.
      5. *Nœud 5 : Assaut du Nexus*.
    - Déverrouillage automatique du Nexus après résolution des 5 nœuds, calcul de la faction dominante et bascule vers la phase 4X galactique post-main-quest (`resolveNexus()`).
    - État d'allégeance du compagnon reZero (`reZero.bugPreserved`).
    - Persistance intégrale dans la sauvegarde (`contents.sc_story` via `SC_DataManager`).
- **Bible Scénaristique (`STORY_LINES.md`)** :
  - Document maître récapitulant la situation initiale (réveil du PJ dans son petit vaisseau escorteur en mission de livraison d'un colis diplomatique sur Ankaros), le découpage des nœuds, les twists et la boucle de jeu post-campagne (ajouté au `.gitignore`).
- **Validation** :
  - Test unitaire dédié : [`UNIT_TESTS/test_quest_story_manager.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/UNIT_TESTS/test_quest_story_manager.js) (13/13 tests validés).

### 11.19 Refonte Modulaire du HUD d'Arme (`Sprite_WeaponHUD.js` & `Sprite_HudBase`)
- **Héritage `Sprite_HudBase`** :
  - Refactorisation complète de `Sprite_WeaponHUD` par dérivation de `Sprite_HudBase`, standardisant les méthodes graphiques, la gestion du dirty flag (`forceDirty()`) et l'interpolation.
- **Organisation en 4 Piliers Méthodologiques** :
  1. *Getters & États Métier* : `weapon()`, `ammoCount()`, `maxAmmo()`, `reserveCount()`, `isReloading()`.
  2. *Positionnement & Découpage Rectangulaire* : Ancrage bas-droit (marge de 20px), `baseRect`, `bulletGaugeRect`, `reservePacksRect`, `secondaryWeaponRect`, `tacticalBeltRect` (pré-câblage pour les jauges graphiques modulaires de balles style Recovery).
  3. *Styles & Réactivité Graphique* : `styleBackground()` (bordure d'alerte rouge clignotante quand le chargeur est vide), `styleAmmo()` (couleur dynamique selon le pourcentage de munitions restantes), `styleReserve()`.
  4. *Blocs de Dessin Séparés (Draw Blocks)* : `drawHud()`, `drawBackground()`, `drawWeaponIcon()`, `drawWeaponName()`, `drawAmmoCounter()`, `drawReserveCounter()`.
- **Intégration `GuiManager` & Raccourci Clavier** :
  - Masquage initial au démarrage (`_isWeaponHudVisible = false`) pour un level design immersif sans saturation visuelle.
  - Pilotage via `$guiManager.showWeaponHud()`, `hideWeaponHud()`, `toggleWeaponHud()`, `hideAllHuds()`, `showAllHuds()`.
  - Touche `H` (Keycode 72, action `toggleHud` dans `ConfigManager.applyKeyboardLayout`) pour masquer/afficher simultanément le PlayerHUD et le WeaponHUD.
- **Validation** :
  - Test unitaire dédié : [`UNIT_TESTS/test_weapon_hud.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/UNIT_TESTS/test_weapon_hud.js) (10/10 tests validés).

### 11.20 Moteur de Didacticiel Contextuel & Gel Intégral de Carte (`TutoManager`, `Window_Tuto`, `Scene_TutoBook`)
- **Option & Persistance Globale** :
  - `ConfigManager.contextualHelp = true` par défaut, persisté dans `global.rmmzsave`.
  - Option "Aide contextuelle" ON/OFF ajoutée dans le menu des options (`Window_Options`) avec traductions complètes FR/EN.
- **Orchestrateur `TutoManager` (`$tutoManager` dans `SC4_TutoManager.js`)** :
  - Singleton gérant la file d'attente séquentielle `_queue` et le registre d'historique `_seenTutos` persisté dans la sauvegarde (`contents.sc_tutos`).
  - Déclencheur souverain `$tutoManager.show(tutoId, data)` ou `showTuto(tutoId, data)`.
  - Support de recherche polymorphe (ID numérique, clé textuelle ou objet direct), vérification d'activation optionnelle et prévention des doublons.
  - Paramètres optionnels `coord` ({ xMap, yMap } ou { x, y }), `arrow` ({ xMap, yMap, x, y, angle }), `imgName`, `force`.
- **Gel Intégral de Carte & Préservation du Moteur UI** :
  - *Maintien de la boucle UI* : `Scene_Map.prototype.update` poursuit l'appel natif `_Scene_Map_update.call(this)` afin que les fenêtres, le tactile, les entrées clavier et les sprites d'interface continuent de s'exécuter à 60 FPS sans aucun blocage.
  - *Freeze des Autotiles Animés* : Interception de `Tilemap.prototype.update` pour stopper l'incrémentation de `this.animationCount++` (les surfaces d'eau, écrans et néons animés sont instantanément figés).
  - *Freeze du Spriteset* : Interception de `Spriteset_Map.prototype.update` neutralisant les sprites de personnages, parallaxes, météo, ombres et projectiles.
  - *Freeze des Événements & de l'IA* : Interception de `Game_Event.prototype.update` suspendant net les routes autonomes, animations de pas stationnaires (*step anime*), orientations et l'IA de combat (`$battleAIManager`).
  - *Freeze de la Logique de Carte* : Interception de `Game_Map.prototype.update` et `Scene_Map.prototype.updateMain`.
  - *Suspension du Joueur et du Menu* : `Scene_Map.prototype.isPlayerActive` et `isMenuEnabled` renvoient `false` tant que `$tutoManager.isBusy()`.
  - *Suspension du Temps Stellaire* : Pause de `$gameDate.passTick()`, `$systemMapManager.update()`, `$relationManager.updateTick()`, `$fightManager.updateProjectiles()`.
- **Rendu Graphique Dynamique & Auto-Proportionné (`Window_Tuto` & `Sprite_TutoArrow`)** :
  - `Window_Tuto` utilise le Windowskin 9-slice `WindowTuto.png` (192×192) et le jingle doux `Neon.ogg`.
  - *Enveloppement automatique (Word Wrap)* : Méthode `computeWrappedLines` découpant les paragraphes et phrases longues aux espaces, mesurant la largeur réelle hors codes d'échappement invisibles et prévenant tout débordement en X.
  - *Dimensionnement auto-proportionné* : Calcul dynamique de la largeur (400-600px) et de la hauteur en fonction du nombre de lignes enveloppées, du titre, de l'illustration éventuelle et de la touche de validation, éliminant tout débordement en Y.
  - Chargement asynchrone des illustrations via écouteur `addLoadListener` pour recalculer les dimensions et rafraîchir la fenêtre dès la réception du PNG.
  - Clignotement subtil de l'invite `[ Entrée / Clic ]` et fermeture universelle sur Entrée, Espace, Échap ou Clic/Toucher.
  - `Sprite_TutoArrow` ancré à la pointe `(0.5, 1.0)`, orientable et oscillant en respiration le long de son axe vers les coordonnées cibles.
- **Scène d'Historique & Intégration Codex (`Scene_TutoBook`)** :
  - `Scene_TutoBook` (`Window_TutoList`, `Window_TutoDetail`) accessible via script ou directement depuis l'entrée "Guides & Didacticiels" du Codex (`Scene_Codex`).
- **Validation** :
  - Test unitaire dédié : [`UNIT_TESTS/test_tuto_system.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/UNIT_TESTS/test_tuto_system.js) (14/14 tests validés).

---

### 11.21 Refonte Ergonomique du Didacticiel : Fenêtre de Titre Enfant (`Window_TutoName`), Découpage d'Icône 32px & Word-Wrap Natif 26px
- **Alignement & Word-Wrap Natif à 26px** :
  - Harmonisation complète entre la mesure du texte et le tracé effectif de `Window_Base.prototype.drawTextEx` : les lignes sont découpées (`computeWrappedLines`) en utilisant la police réelle du jeu (26px).
  - La largeur par défaut est fixée à **520px** avec support d'une largeur personnalisée (`width`) passée en paramètre d'appel ou dans le JSON.
  - Si une illustration est présente (`img`), la largeur de la fenêtre s'étend automatiquement pour égaler au minimum la largeur de l'image plus les marges intérieures.
  - La hauteur de la fenêtre s'adapte dynamiquement au nombre exact de lignes enveloppées (`lineHeight() = 36px`), éliminant tout risque de texte tronqué horizontalement ou verticalement.
- **Fenêtre de Titre Dédiée (`Window_TutoName`)** :
  - Sous-fenêtre enfant instanciée et rattachée directement à `Window_Tuto` (`this.addChild(this._nameWindow)`), héritant de `Window_NameBox` (ou fallback `Window_Base`).
  - Utilise le Windowskin `WindowTuto.png`.
  - Positionnée en superposition en haut à gauche de la fenêtre parente, débordant de 8px en Y (`x = 0`, `y = -this.height + 8`).
  - Largeur dynamique s'ajustant exactement à l'icône 32px + espacement + titre.
  - Tracé du texte en vert néon (`#00ff88`).
- **Découpage de l'Icône de Titre (`tuto_icons.png`)** :
  - Extraction de tuiles 32×32px depuis `img/GUI/tuto/tuto_icons.png` (grille horizontale 160×32px).
  - Priorité de résolution : `paramètre d'appel iconIndex` ➔ `donnée json iconIndex` ➔ `index 0 par défaut`.
- **Envoi Groupé de Didacticiels (`$tutoManager.showTutos`)** :
  - Nouvelle méthode `$tutoManager.showTutos(list)` (et alias global `showTutos(list)`) acceptant un tableau d'identifiants (IDs, clés) ou d'objets complets de configuration (ex: `[{id: "tuto_1"}, {id: 1, data: {xMap: 4, yMap: 15}}, 2]`).
  - Délégation automatique depuis `show(array)` et `showTuto(array)`.
- **Confinement Écran Strict & Flèche Hors-Écran Radar** :
  - *Confinement Écran* : Clamping bidirectionnel strict de `Window_Tuto` et de son titre enfant `Window_TutoName`. Si `winY + winH > boxH`, la fenêtre remonte automatiquement vers le haut jusqu'à `y: 0` (avec réserve d'espace pour le titre). Pareil horizontalement : si `winX + totalW > boxW`, elle est décalée vers la gauche jusqu'à `x: 0`.
  - *Flèche Guidage Hors-Écran* : Si la cible est définie par `xMap, yMap` et se trouve en dehors du champ de la caméra, `Sprite_TutoArrow` se positionne automatiquement sur la bordure de l'écran (marge de 8px) et pivote en temps réel pour pointer précisément vers la case cible hors-champ avec oscillation continue.
- **Validation** :
  - Test unitaire dédié : [`UNIT_TESTS/test_tuto_system.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/UNIT_TESTS/test_tuto_system.js) (18/18 tests validés).

---

### 11.22 Système d'Overlays Cartographiques & Toits Escamotables (`MapOverlaysManager`, `Game_MapOverlay`, `Spriteset_Overlays`)
- **Modèle Métier & Interpolation (`Game_MapOverlay` & Classes Filles)** :
  - Modèle d'état découplé de la vue avec gestion des cibles (`targetOpacity`, `targetZoomX/Y`, `targetX/YMap`) et interpolation progressive automatique (*Tweening/Damping*).
  - Méthodes de transition : `fadeOut(speed)`, `fadeIn(speed)`, `setTargetOpacity(val, speed)`, `setTargetPosition(x, y, speed)`, `setTargetZoom(zx, zy, speed)`.
  - Déclencheur intelligent de toit (*Smart Roof*) : propriété `regionTrigger` détectant la présence de `$gamePlayer` sur le Region ID spécifié pour masquer (`targetOpacity: 0`) ou afficher (`targetOpacity: baseOpacity`) l'overlay sans aucune ligne de code événementiel.
  - Classes spécialisées : `Game_MapFogOverlay` (autoscroll continu `offsetX/Y`) et `Game_MapLightOverlay` (pulsation et oscillation d'échelle paramétrables).
- **Gestionnaire Global & Persistance Sélective (`MapOverlaysManager`)** :
  - Singleton `window.$mapOverlaysManager` stockant l'état par carte (`_data[mapId][overlayId]`).
  - Synchronisation automatique au chargement de carte (`onMapInit`) :
    - Les overlays déclarés par notetag sont créés ou restaurés (sauf si `persistant: true` auquel cas leur état en jeu est conservé).
    - Les overlays dynamiques créés en jeu (`createOverlay` / `addOverlay`) avec `persistant: false` sont automatiquement nettoyés lors du transfert de carte.
    - Les overlays dynamiques persistants (`persistant: true`) sont conservés d'une visite à l'autre et sérialisés dans la sauvegarde (`sc_mapOverlays`).
  - Méthodes d'accès : `getOverlay(id, mapId)`, `removeOverlay(id, mapId)`, `getOverlaysData(mapId)` (ordonné par `zIndex` croissant).
- **Rendu Graphique Bi-Calque & Arbre d'Affichage (`Spriteset_Overlays`, `Sprite_MapOverlay`)** :
  - Répertoire des assets dédié : `img/GUI/overlays/` (ou `img/tileset/overlays/`).
  - **Architecture Bi-Calque Intégrée au Tilemap Natif** :
    - `lowerContainer` (`z = 2`) : Directement rattaché au `_tilemap` de RMMZ, placé sous les héros (`z = 3`) et au-dessus des tuiles de sol (`z = 0/1`). Les personnages marchent ainsi *sur* les ombres projetées sans que leur visage ou corps ne soit ombré.
    - `upperContainer` (`z = 6`) : Directement rattaché au `_tilemap` de RMMZ, placé au-dessus des héros (`z = 3/5`) et des tuiles hautes (`z = 4`), mais sous l'indicateur de clic blanc (`z = 9`). Accueille les halos de lumière, toits et brumes.
    - Neutralisation des ombres carrées natives de RMMZ (`createShadow` neutralisé).
  - **Acheminement Automatique par Type & Z-Index** :
    - Tout overlay dont le `type` contient `"shadow"` ou dont le `zIndex < 3` est automatiquement affecté au `lowerContainer`.
    - Tout autre type (`"light"`, `"roof"`, `"static"`, `"fog"`) est affecté au `upperContainer`.
    - Prise en charge des transferts dynamiques à chaud si le type ou le zIndex d'un overlay change en cours de partie.
  - **Positionnement Pixel-Perfect avec le Tilemap RMMZ** :
    - Alignement mathématique strict sur la formule interne de `Tilemap.prototype.updateTransform` (`Math.round(wrappedX * tileW) - Math.ceil(displayX * tileW)`). Élimine tout décalage d'un pixel provoqué par les résolutions non multiples de 48 (ex: 1760×990) lors du centrage caméra.
  - Support natif du centrage d'ancrage (`anchorX`, `anchorY` : `(0, 0)` par défaut, `(0.5, 0.5)` pour les halos de lumière).
  - Support natif du `blendMode` (0=Normal, 1=Additif, 2=Produit, 3=Superposition) et de la teinte `hue` (0-360°) accélérée par GPU shader (`ColorFilter`).
  - Scintillement synchronisé (`flickerType`) : modulation d'opacité en miroir pour les ombres, et douce oscillation d'échelle/lumière pour les halos.
  - Vitesse de transition adaptative : les overlays de type `"roof"` adoptent automatiquement une durée de transition douce de **80 frames (~1,33s)** (contre 16 frames pour les transitions rapides).
  - Protection contre les transferts intra-carte : lors d'un transfert sur la même carte sans fondu (`isSameMap && fadeType === 2`), `skipRefresh: true` préserve l'état courant des overlays sans réinitialiser les toits effacés.
  - *Frustum Culling* : masquage automatique (`visible = false`) dès que le rectangle de l'overlay se trouve en dehors du champ de la caméra, garantissant un framerate parfait à 60 FPS.
- **Syntaxe Notetag de Carte** :
  - `<overlay: id, imgName, type, zIndex, xMap, yMap, opacity, persistant, blendMode, hue, regionTrigger, flickerType, fadeDuration>`
- **Coexistence Multi-Calques & Balises Multiples** :
  - Parsing simultané de balises multiples sur une même carte (`setupMapOverlays`).
  - Coexistence transparente du calque d'ombre (`lowerContainer`, z = 2, au sol sous les héros) et des toits escamotables (`upperContainer`, z = 6, au-dessus des héros).
  - Préservation de l'opacité des overlays au retour d'une scène fille / pushée (inventaire, menu) sur la même carte (`skipRefresh: true`).
- **Validation** :
  - Test unitaire dédié : [`UNIT_TESTS/test_map_overlays.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/UNIT_TESTS/test_map_overlays.js) (18/18 tests validés).

---

### 11.23 Système d'Actions Transitives, Rotation 8-Dir & File d'Attente (`_actionQueue`)
- **Principe & Zone de Superposition 24px** :
  - Conçu pour résoudre les transitions de postures complexes (se lever du lit, s'extraire d'un siège, franchir un rebord) exploitant le format Paperdoll 96×96 pixels sur la grille de 48px.
  - La zone de débordement de 24px de chaque côté du personnage permet de raccorder deux poses distinctes sans artefact visuel ni décalage de frame.
- **Moteur de File d'Attente (`_actionQueue`) & Architecture Modulaire** :
  - Chaque `Game_CharacterBase` possède sa propre file d'attente d'ordres (`_actionQueue`) et une méthode de dépilement séquentielle (`processNextAction()`).
  - Types d'ordres pris en charge :
    - `rotate` : rotation progressive 8-dir avec délai en frames par cran de 45° (`stepDelay`).
    - `action` : animation Paperdoll avec gestion des durées, frames et répétitions (`repeat`).
    - `translate` : translation physique instantanée (`dx, dy, direction`).
    - `setPose` / `clearPose` : changement ou réinitialisation propre de posture dans la file.
    - `wait` : attente passive de X frames sans bloquer le moteur de rendu.
    - `call` : callback JavaScript personnalisé.
  - **Moteur de Répétition (`repeat`)** :
    - Répétition finie : `repeat: N` (décrémente à chaque cycle jusqu'à 0).
    - Répétition infinie : `repeat: true`, `repeat: -1` ou `repeat: Infinity`.
    - Arrêt contrôlé : `character.stopActionRepeat()` ou vidage complet via `character.clearActionQueue()`.
- **Rotation Progressive 8 Directions (`playRotate`)** :
  - Calcul trigonométrique systématique du chemin angulaire le plus court (sens horaire vs anti-horaire).
  - Règle de départage déterministe à 180° (demi-tour franc) : privilégie le passage par le bas (2) ou la droite (6).
  - Intégrée par défaut dans `playTranslateAction` : le personnage pivote avec fluidité (3 frames par angle) vers sa cible avant d'enclencher l'Action 1.
- **Cycle d'Exécution en Deux Phases (`playTranslateAction`)** :
  1. **Phase 0 (Optionnelle)** : Rotation progressive fluide vers l'angle de translation si non aligné.
  2. **Phase 1** : `action1` démarre sur la case source.
  3. **Translation physique** : au terme d'`action1`, les coordonnées du personnage sont instantanément translatées (`_x += dx, _y += dy, _realX = _x, _realY = _y`) sans saut de caméra ni rechargement de scène.
  4. **Phase 2** : `action2` prend immédiatement le relais sur la case d'arrivée.
  5. **Gestion de Pose Finale** : nettoie automatiquement la pose initiale (`clearPose: true` par défaut si le personnage avait une pose active comme lit/sommeil) ou applique `finalPose`.
  6. **Synchronisation continue** : `isActing() === true` reste actif sans interruption du début à la fin, permettant aux événements RMMZ d'attendre la fin de l'enchaînement de façon fluide.
- **Script Calls & Ergonomie Développeur** :
  - Sur le personnage : `$gamePlayer.playTranslateAction("standup_bed", "realign", 6)`
  - Dans un événement RMMZ : `this.playTranslateAction("standup_bed", "realign", 6)`
  - Forme objet : `this.playTranslateAction({ action1: "...", action2: "...", direction: 6, finalPose: "walk", onEnd: ... })`
- **Validation** :
  - Test unitaire dédié : [`UNIT_TESTS/test_translate_action.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/UNIT_TESTS/test_translate_action.js) (14/14 tests validés).

---

### 11.24 Refonte du Curseur de Destination Animé (`Sprite_Destination` dans `SC4_rmmz_sprites_Patches.js`)
- **Problématique & Esthétique** :
  - Remplacement du carré clignotant blanc natif de RMMZ par un curseur bi-composant fluide épousant la perspective **3/4 plongeante** (*Top-Down Oblique / Cavalière*).
- **Architecture Bi-Composant** :
  - **1. Disque & Anneau Lumineux au Sol (`_groundSprite`)** :
    - Rayon maximal de 36px (diamètre 72px, soit un débordement doux de 12px de part et d'autre de la case 48px), permettant au curseur de rester visible même sous un meuble ou un toit.
    - Dessiné avec dégradé radial et ratio d'ellipse adapté (~1.85:1) en fusion additive (`blendMode = 1`).
    - Animation par pulsation continue (cycle de 25 frames) associant expansion d'échelle ($0.67 \to 1.00$) et atténuation d'opacité ($220 \to 0$).
  - **2. Flèche Supérieure Flottante (`_pointerSprite`)** :
    - Charge l'asset [`img/GUI/cursors/destPointer.png`](file:///c:/SERVER/htdocs/SimCraft/SC4/img/GUI/cursors/destPointer.png) avec ancrage sur la pointe dirigée vers le sol (`anchor = 0.5, 1.0`).
    - Flottement vertical sinusoïdal doux au-dessus du centre de la case (-12px à -2px).
    - **Opacité Dynamique Synchronisée avec l'Oscillation** :
      - L'opacité est inversement proportionnelle à la hauteur : plus la flèche monte, plus elle s'atténue.
      - Opacité maximale de **65%** ($166/255$) au point le plus bas (proche du sol) et opacité minimale de **45%** ($115/255$) au point le plus haut.
    - **Condition de praticabilité (Passability)** :
      - Visible uniquement si la case cliquée est franchissable par le joueur (`!isCollidedWithCharacters` et tuile passable sur la carte).
      - Sur un mur, meuble bloquant ou PNJ, la flèche s'efface automatiquement tout en conservant le disque au sol pour accuser réception du clic.
  - **3. Désactivation du Menu Circulaire sur Clic Héros** :
    - Dans [`SC4_Window_RingCommand.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Window_RingCommand.js), `Game_System.prototype.isRingMenuEnabled` est désactivé (`false`) et `Scene_Map.prototype.updateRingCommandTrigger` est neutralisé pour suspendre le menu circulaire sur clic joueur pour l'instant.
  - **Masquage Automatique** :
    - L'ensemble du curseur s'estompe et se masque instantanément dès que la destination est atteinte ou effacée (`!$gameTemp.isDestinationValid()`).
- **Validation** :
  - Test unitaire dédié : [`UNIT_TESTS/test_destination_sprite.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/UNIT_TESTS/test_destination_sprite.js) (10/10 tests validés).

---

### 11.25 Modularité Architecturale du Ring Command & Intégration Événementielle des Tutos
- **Nettoyage et Répartition par Classe Vanilla** :
  - [`SC4_Window_RingCommand.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Window_RingCommand.js) : Définition exclusive de la classe d'interface graphique `Window_RingCommand` (sans injection de monkey-patches).
  - [`SC4_rmmz_objects_Patches.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_rmmz_objects_Patches.js) : Centralisation des méthodes de `Game_System` (`isRingMenuEnabled`, `setRingMenuEnabled`, `getRingCommandConfig`, `setRingCommandConfig`).
  - [`SC4_rmmz_scenes_Patches.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_rmmz_scenes_Patches.js) : Centralisation du cycle de vie dans `Scene_Map` (`createRingCommandWindow`, `openRingMenu`, `closeRingMenu`, `updateRingCommandTrigger`, `isTouchOnPlayer`).
- **Pont Événementiel `Game_Interpreter` & Localisation des Titres de Tutos** :
  - Support de `this.showTuto(tutoId, data)` et `this.showTutos(list)` directement utilisables dans les commandes d'événements RMMZ en délégation vers `$tutoManager`.
  - Résolution des titres de didacticiels via la clé `tutoName_[ID_DU_TUTO]` dans `data/SC/loc/TUTOS_[LANG].json`.
  - Si la traduction est absente du fichier de langue, la fenêtre affiche directement la clé brute `tutoName_[ID]` pour repérer immédiatement les éléments non traduits.
- **Validation** :
  - 64 tests unitaires validés avec succès sur l'ensemble des suites.

---

### 11.26 Positionnement par Mots-Clés et Marge d'Écran (`Window_Tuto` & `SC4_TutoManager`)
- **Positionnement Contextuel par Mots-Clés** :
  - En complément du centrage par défaut et du ciblage de coordonnées sur la carte (`coord: { x, y }`), la fenêtre de tutoriel supporte désormais des mots-clés de placement à l'écran :
    - `top`, `bottom`, `left`, `right`
    - `top-left`, `top-right`, `bottom-left`, `bottom-right`
    - `middle-left` (ou `center-left`), `middle-right` (ou `center-right`), `center` (ou `middle`)
- **Gestion Dynamique du Padding Écran (`getPadding`)** :
  - Padding automatique de **12px** par rapport aux bords de l'écran par défaut.
  - Méthode d'accès normalisée : `Window_Tuto.prototype.getPadding()`.
  - Configurable globalement via `Window_Tuto.prototype.setPadding(pad)` ou localement dans la commande via la propriété `padding: 16`.
- **Alignement Précis du Badge de Titre (`Window_TutoName`)** :
  - La fenêtre de titre chevauche le bord supérieur de la fenêtre principale (`y = -height + 8`).
  - Lors d'un positionnement `top`, le décalage `topPadding = Math.max(0, nameH - 8)` est automatiquement calculé et injecté pour que le badge de titre soit lui-même parfaitement espacé de `getPadding()` (12px) du sommet de l'écran.
  - Confinement de sécurité (`clamping`) garantissant que la fenêtre et son titre ne débordent jamais hors écran.
- **Ergonomie des Appels & Script Calls** :
  - Raccourci direct avec argument chaîne :
    - `showTuto("nomDuTuto", "top")`
    - `this.showTuto("nomDuTuto", "bottom-right")`
  - Forme objet paramétrée :
    - `this.showTuto("nomDuTuto", { position: "top", padding: 16 })`
- **Validation** :
  - Test unitaire dédié : [`UNIT_TESTS/test_tuto_system.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/UNIT_TESTS/test_tuto_system.js) (24/24 tests validés).

---

### 11.27 Bouton de Désactivation Rapide & Modal de Confirmation (`Window_TutoConfirm`)
- **Bouton de Désactivation Contextuelle Intégré** :
  - Ajout d'un bouton interactif `[ ⊘ Désactiver les tutos ]` en bas à gauche de [`SC4_Window_Tuto.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Window_Tuto.js) (`_disableButtonSprite`).
  - Détection de survol (hover) avec rétro-éclairage et encadrement rouge doux (`rgba(255, 100, 100, 0.2)`).
  - Clic intercepté avant le gestionnaire de fermeture standard du didacticiel : cliquer sur ce bouton n'entraîne pas la fermeture du didacticiel.
- **Fenêtre Modale de Confirmation (`Window_TutoConfirm`)** :
  - Fenêtre 2 colonnes avec windowskin `WindowTuto`, centrée à l'écran (`winW = 540, winH = 170`).
  - Texte explicatif rappelant au joueur la possibilité de réactiver l'aide à tout moment : *"Les didacticiels peuvent être réactivés à tout moment depuis le menu Options."*
  - Choix de commande : `"Désactiver"` et `"Annuler"` (`"Annuler"` pré-sélectionné par défaut pour prévenir toute validation accidentelle).
- **Gestion Stricte des Flux d'Interaction** :
  - **Annulation / Rétractation** : Si le joueur sélectionne `"Annuler"`, presse Échap ou clique hors de la fenêtre modale, seule la confirmation se referme. Le tutoriel courant reste ouvert et redevient interactif. Le joueur doit à nouveau cliquer ou appuyer sur Entrée pour fermer le tutoriel courant.
  - **Validation de la Désactivation** : Si le joueur confirme `"Désactiver"` :
    - `ConfigManager.contextualHelp = false` est appliqué et sauvegardé immédiatement (`ConfigManager.save()`).
    - La file d'attente active de didacticiels est vidée via `$tutoManager.disableContextualHelp()`.
    - La fenêtre de tutoriel courante se ferme immédiatement et la carte reprend son cours.
- **Localisation Dynamique & Validation** :
  - Clés bilingues FR/EN ajoutées dans `data/SC/loc/TUTOS_FR.json` et `TUTOS_EN.json`.
  - Test unitaire dédié : [`UNIT_TESTS/test_tuto_system.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/UNIT_TESTS/test_tuto_system.js) (27/27 tests validés).

---

### 11.28 Option Plein Écran (F4) & Adaptation Dynamique des Résolutions
- **Gestion des Écrans de Résolution Inférieure (Format 1760×990)** :
  - **En Mode Fenêtré** : Sur les écrans de faible résolution (ex: 1366×768 ou 1600×900), la fenêtre de jeu s'ouvre à sa taille native 1760×990 et peut déborder du cadre sans maximisation.
  - **En Mode Plein Écran** : Le moteur graphique de RMMZ (`Graphics` / PixiJS) applique automatiquement une réduction d'échelle bilinéaire proportionnelle (`downscaling`) basée sur le ratio de l'écran. L'ensemble de la zone de jeu (1760×990) est ainsi parfaitement contenu dans l'écran sans distorsion ni débordement.
- **Intégration dans `Window_Options` & `ConfigManager`** :
  - **Lancement par défaut en fenêtré** : `ConfigManager.fullscreen = false`.
  - **Commande d'Options** : Intitulée `"Plein écran (F4)"` (FR) et `"Fullscreen (F4)"` (EN) avec bascule d'état `ON` / `OFF`.
  - **Bascule en Temps Réel** : Toute modification via la touche Entrée, Espace, les flèches ou le clic tactile déclenche instantanément `Graphics._requestFullScreen()` ou `Graphics._cancelFullScreen()`.
  - **Synchronisation avec F4** : Appuyer sur la touche **F4** en cours de jeu met à jour la valeur de `ConfigManager.fullscreen` et sauvegarde l'état dans `config.rpgsave`.
  - **Restauration au Démarrage** : `Scene_Boot.prototype.start` rétablit automatiquement le plein écran au lancement si configuré.
- **Validation** :
  - Test unitaire dédié : [`UNIT_TESTS/test_fullscreen_option.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/UNIT_TESTS/test_fullscreen_option.js) (9/9 tests validés).

---

### 11.29 Agrandissement & Dimensionnement Dynamique de `Scene_Options`
- **Résolution & Ergonomie Visuelle (`SC4_rmmz_scenes_Patches.js`)** :
  - **Largeur portée à 560px** (`Math.min(560, boxW - 32)`) au lieu des 400px étriqués natifs, pour donner tout l'espace d'affichage nécessaire aux intitulés bilingues et rappels de touches.
  - **Débridage de la capacité** : `Scene_Options.prototype.maxCommands` passe de 7 à 30 commandes sans bridage artificiel.
  - **Marge maximale de 16px en haut et en bas** : `maxVisibleCommands()` et `optionsWindowRect()` calculent dynamiquement une hauteur plafonnée à `boxHeight - 32` (958px max en 1760×990), garantissant 16px de marge min en haut et 16px en bas.
  - **Adaptation précise au contenu réel** : `createOptionsWindow` recalcule la hauteur exacte selon `maxItems()` (12 options = 456px actuellement). La fenêtre se centre verticalement sans aucun espace vide ni ascenseur superflu tant que les éléments tiennent à l'écran.
- **Validation** :
  - Test unitaire dédié : [`UNIT_TESTS/test_options_window.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/UNIT_TESTS/test_options_window.js) (6/6 tests validés).

---

### 11.30 Verrou de Relâchement Tactile (*Touch Release Guard*) à la Fermeture d'Interfaces
- **Problématique résolue** :
  - Lors de la fermeture d'un didacticiel (`Window_Tuto`) ou d'une fenêtre modale par un clic tactile, le temps de réaction musculaire humain (80 à 150 ms) fait que le bouton physique de la souris est encore enfoncé quand la fenêtre disparaît.
  - Dans le même tour de boucle du moteur ou les frames suivantes, `Scene_Map.prototype.processMapTouch()` détectait un clic sur la carte et faisait marcher involontairement le personnage vers les coordonnées du clic.
- **Architecture SRP & Double Barrière (`SC4_Window_Tuto.js`, `SC4_rmmz_scenes_Patches.js`, `SC4_TutoManager.js`)** :
  - 1. **Consommation Immédiate (`TouchInput.clear()`)** : À la fermeture de la fenêtre, purge instantanée de l'état tactile (`triggered`, `pressed`, `clicked` remis à `false`).
  - 2. **Méthode à responsabilité unique : `isTouchCoolDownOk()`** :
    - Gère un temps mort déterministe en frames (`_touchCooldown`, ex: 8 frames par défaut).
    - Décrémente le compteur frame par frame et renvoie `false` tant qu'il n'a pas atteint zéro.
  - 3. **Méthode à responsabilité unique : `isTouchReleaseGuardOk()`** :
    - Surveille l'état du verrou `_touchReleaseGuard`.
    - Bloque (`false`) tant que `TouchInput.isPressed()` est maintenu par le joueur.
    - Dès que le doigt physique est levé, désarme automatiquement le verrou (`_touchReleaseGuard = false`) et renvoie `true`.
  - 4. **Orchestration fluide dans `Scene_Map.prototype.isMapTouchOk`** :
    - `isMapTouchOk()` valide successivement : `!$tutoManager.isBusy()`, `isTouchCoolDownOk()`, `isTouchReleaseGuardOk()`, puis la condition native RMMZ.
    - Également armé lors du retour sur la carte depuis une scène fille (`Scene_Map.prototype.start`).
- **Validation** :
  - Test unitaire dédié : [`UNIT_TESTS/test_tuto_system.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/UNIT_TESTS/test_tuto_system.js) Suite 4 (29/29 tests validés).

---

### 11.31. Refonte Architecturale de l'Acteur : `Game_ScActor` & Sous-Composants Modulaires
- **Contexte & Problématique** :
  - Historiquement, la classe native `Game_Actor` de RMMZ était directement surchargée par de multiples monkey-patches dans le prototype (`SC4_rmmz_objects_Patches.js`), mélangeant combat, munitions, allégeances de factions, inventaire secondaire, poids d'équipement et localisation.
  - De plus, `Game_Hero` héritait directement de `Game_Actor`, créant une dette technique empêchant les acteurs non-héros (compagnons, PNJs recrutables) de bénéficier proprement des fonctionnalités avancées sans alourdir le prototype global.
- **Architecture par Décomposition & Composition Modulaire (SRP)** :
  - **`Game_ScActor` ([`SC4_Game_ScActor.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Game_ScActor.js))** :
    - Classe ES6 étendant nativement `Game_Actor`.
    - Instancie et orchestre 5 sous-composants dédiés lors de `setup(actorId)` :
      1. **`Game_ScActorEquipment` ([`SC4_Game_ScActorEquipment.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Game_ScActorEquipment.js))** : Gestion des slots (11 types d'équipement), association arme/armure, détection d'équipement, extraction des calques Paperdoll (`<visual_equip: ...>`) et Faceset (`<face: ...>`), calcul du bonus de charge d'emport.
      2. **`Game_ScActorInventory` ([`SC4_Game_ScActorInventory.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Game_ScActorInventory.js))** : Couplage avec le conteneur secondaire `$inventories.inventory("A_" + actorId)`, calcul de la charge portée, capacité maximale (`atk * 2.5 + bonus`), état de surcharge et fatigue (`exhaustion`).
      3. **`Game_ScActorCombat` ([`SC4_Game_ScActorCombat.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Game_ScActorCombat.js))** : Arme active de gunfight, gestion des munitions engagées dans le chargeur (`_weaponAmmo`), réserve globale ou sac, compétence d'attaque (`<attackId: X>`) et parsing des animations d'attaque (`<visual_attack>`).
      4. **`Game_ScActorSocial` ([`SC4_Game_ScActorSocial.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Game_ScActorSocial.js))** : Allégeance de faction (`<factionId: X>`), accès à l'entité `$gameFactions.faction()`, relations interpersonnelles `$gameRelations`.
      5. **`Game_ScActorLocation` ([`SC4_Game_ScActorLocation.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Game_ScActorLocation.js))** : Coordonnées spatiales hiérarchiques (Secteur, Système, Planète, POI), synchronisation par défaut avec la flotte/groupe (`$gameGalaxy`) et possibilité de détachement géographique.
  - **`Game_Hero` ([`SC4_Game_Hero.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Game_Hero.js))** :
    - Hérite désormais de `Game_ScActor` (`class Game_Hero extends Game_ScActor`).
    - Se recentre exclusivement sur les spécificités de rendu Paperdoll (race, sexe, visage composite, hub `$heroHub`, clés de cache et bitmaps composites).
  - **Factory `Game_Actors.prototype.actor` ([`SC4_rmmz_objects_Patches.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_rmmz_objects_Patches.js))** :
    - Instancie `Game_Hero` si l'acteur possède `<hero>`, sinon instancie `Game_ScActor`.
- **Validation** :
  - Test unitaire dédié : [`UNIT_TESTS/test_sc_actor_hierarchy.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/UNIT_TESTS/test_sc_actor_hierarchy.js) (70/70 tests validés).

---

### 11.32. Architecture SC4 Niveau 2 : Modèle QQOQCP Driven & Unification Radicale
- **Cadre Conceptuel QQOQCP (Qui, Quand, Où, Quoi, Comment, Pourquoi)** :
  - **QUI** : `$gameActors` (`Game_ScActor` unifié pour PJ, PNJ, compagnons et factions).
  - **QUAND** : `$gameDate` (Progression temporelle et calendrier stellaire).
  - **OÙ** : `$gameGalaxy` (Spatial macro : Secteur → Système → Planète → POI) et `$gameMap` (Micro local).
  - **QUOI** : Moteur d'interactions (`Game_InteractionBase`, `Game_ReactionBase`, dialogue, combat, échanges d'inventaire).
  - **COMMENT** : Managers, Scènes, Fenêtres et Sprites (`$questManager`, `$storyManager`, `$tutoManager`, `$inventories`, SubScenes).
  - **POURQUOI** : Finalité et quêtes (`$gameQuests`, `$storyManager`, Contrats, Nœuds Narratifs et Nexus).
- **Implémentations Livrées** :
  1. **Lazy Loading Pur sur `Game_ScActor`** : Les 6 sous-composants (`equipment`, `inventory`, `combat`, `social`, `location`, `character`) sont initialisés à `null` et ne s'instancient qu'à la première demande.
  2. **Parsing Unique des Notetags (`_meta`)** : Les balises de l'acteur sont extraites une seule fois lors de `setup(actorId)` dans `_meta` (0 regex répétée au runtime, modification dynamique avec `setMeta`).
  3. **Absorption de `Game_Hero` dans `Game_ScActor`** : Rétrocompatibilité totale assurée par alias direct (`window.Game_Hero = Game_ScActor`).
  4. **Sous-objet `Game_ScActorCharacter` ([`SC4_Game_ScActorCharacter.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Game_ScActorCharacter.js))** : Encapsule l'apparence sur carte, le Paperdoll, les coordonnées et la liaison avec l'entité concrète (`$gamePlayer`, `Game_Follower`, `Game_Event`).
  5. **Décentralisation des Relations dans `_social._opinions`** : Chaque acteur héberge les sentiments / opinions que les interlocuteurs portent à son égard (`actor.social.opinion(targetId)`).
  6. **Factions comme Acteurs (<Faction>)** : Détection via `actor.isFaction()`, accès naturel à un inventaire (banque/stock) et diplomatie sans corps cartographique.
- **Validation** :
  - Suite de tests unitaire dédiée : [`UNIT_TESTS/test_sc_actor_hierarchy.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/UNIT_TESTS/test_sc_actor_hierarchy.js) (46/46 tests validés).

---

### 11.33 Purge des Monkey-Patches de Game_Actor.prototype & Victoire du Fail Fast
- **Objectif** :
  - Éliminer la dette technique en supprimant les greffes sauvages sur le prototype vanilla de RMMZ (`Game_Actor.prototype`).
  - Forcer l'utilisation stricte des sous-composants spécialisés (`actor.combat`, `actor.inventory`, `actor.social`, `actor.character`, `actor.equipment`).
  - Appliquer la règle d'or **Clean Code & Fail Fast** : aucune façade de complaisance masquant les erreurs de routage.
- **Réalisations Techniques** :
  1. **Purge de `Game_Actor.prototype` dans [`SC4_rmmz_objects_Patches.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_rmmz_objects_Patches.js)** :
     - Retrait complet de : `gunfightWeapon`, `gunfightStats`, `getLoadedAmmo`, `setLoadedAmmo`, `consumeLoadedAmmo`, `getReserveAmmo`, `hasNoWeapons`, `getFaceEquipLayers`, `factionId`, `faction`, `setFactionId`, `equipmentWeightCapacityBonus`, `weightCapacity`, `exhaustion`.
     - Seules subsistent les surcharges vanilla nécessaires : localisation (`name`, `nickname`, `profile`) et la fabrique `$gameActors.actor(id)` qui instancie désormais directement `Game_ScActor`.
  2. **Nettoyage Radical de [`SC4_Game_ScActor.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Game_ScActor.js)** :
     - Élimination des façades redondantes qui déléguaient passivement aux sous-objets.
     - Seule la méthode native du moteur RMMZ `attackSkillId()` est conservée comme surcharge ES6 native pour répondre aux requêtes internes du moteur de combat de RMMZ.
  3. **Reroutage Global des Points d'Appel (Call-Sites)** :
     - Balistique : `Game_Player` et [`SC4_Sprite_WeaponHUD.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Sprite_WeaponHUD.js) appellent directement `actor.combat.*`.
     - Visuels Paperdoll : `Game_Follower`, `Game_Event`, [`SC4_Sprite_Hero.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Sprite_Hero.js) et [`SC4_Bitmap_Composite.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Bitmap_Composite.js) appellent `actor.character.*` et `actor.equipment.*`.
     - Inventaire & Poids : `Game_Party.prototype.maxWeight` appelle `actor.inventory.weightCapacity()`.
     - Social & Allégeance : [`SC4_Game_Planet.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Game_Planet.js), [`SC4_Game_Spaceship.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Game_Spaceship.js) et [`SC4_RelationManager.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_RelationManager.js) appellent `actor.social.factionId()`.
- **Validation** :
  - [`UNIT_TESTS/test_sc_actor_hierarchy.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/UNIT_TESTS/test_sc_actor_hierarchy.js) : 46/46 tests réussis (atteste l'inexistence des façades directes et la pureté des composants).
  - [`UNIT_TESTS/test_weapon_hud.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/UNIT_TESTS/test_weapon_hud.js) : 10/10 tests réussis.
  - [`UNIT_TESTS/test_step24_faction_allegiance.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/UNIT_TESTS/test_step24_faction_allegiance.js) : 17/17 tests réussis.
  - Synchronisation SHA256 absolue de `plugins.js` et `plugins.backup.js` (`E712721441530C65365681FB5FCB19BF280F2B0516CDCE6FF0816ABD308EC087`).

---

### 11.34 Refonte Immersive de Scene_Inventory, Tri Adaptatif & Action Contextuelle "Équiper" (Étapes 1 à 3)
- **Objectif** :
  - Métamorphoser l'interface de transfert d'inventaires pour éliminer l'abstraction des menus textuels classiques et préserver l'immersion spatiale diégétique.
  - Laisser le centre de l'écran ouvert sur la carte en cours (héros visible dans sa cabine du vaisseau en train d'interagir avec l'armoire).
  - Fournir un habillage direct sans manipulation superflue : équiper instantanément armures et armes depuis un conteneur ou le sac.
  - Offrir un système de tri toggle universel adaptatif aux restrictions du meuble, avec affichage informatif du type dans l'aide et détection des données non typées ("Divers").
- **Réalisations Techniques** :
  1. **Photomask Focus Procédural (`createFocusVignette`)** :
     - Remplacement du flou intégral (`BlurFilter`) par un dégradé radial Canvas procédural.
     - Le centre reste parfaitement net et transparent pour voir le héros et le décor ; les périphéries et colonnes latérales sont ombrées (`rgba(2, 6, 16, 0.65..0.88)`). Aucun asset image lourd n'est requis.
  2. **En-têtes Supérieurs Dédiés ([`SC4_Window_InventoryHeader.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Window_InventoryHeader.js))** :
     - Header Joueur (Gauche) : Portrait de face composite Paperdoll ou vanilla, titre "Sac du joueur", jauge graphique de poids dynamique avec paliers de couleur (Bleu < 85%, Orange < 100%, Rouge Surchargé).
     - Header Conteneur (Droite) : Icône graphique HD dédiée `img/GUI/defautInventoryIcon.png` (ou personnalisable par conteneur dans `data/SC/INVENTORIES.json`), titre contextuel ("Armoire perso", cadavre, allié), jauge de charge du réceptacle.
  3. **Flèche Néon Animée ([`SC4_Sprite_InventoryArrow.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Sprite_InventoryArrow.js))** :
     - Sprite procédural cyan néon jaillissant horizontalement depuis la ligne de l'item sélectionné vers la modale volante d'action (`Window_InventoryAction`), suivi d'une respiration/pulsation subtile continue.
  4. **Action Contextuelle "Équiper"** :
     - Détection dynamique si l'item survolé est une pièce d'armure ou une arme (`DataManager.isWeapon` / `DataManager.isArmor`) équipable par le héros (`actor.canEquip(item)`).
     - Intégration de la commande `"equip"` dans `Window_InventoryAction` (adaptant dynamiquement sa hauteur via `fittingHeight`).
     - Exécution directe dans `Scene_Inventory.prototype.onActionEquip` : transfert de la pièce, équipement via `actor.equipment.equip(item)` et `actor.changeEquip`, rafraîchissement synchrone du portrait Paperdoll de l'en-tête et notification cartographique `$gamePlayer.refresh()`.
  5. **Bouton de Tri Toggle Synchronisé & Adaptatif** :
     - Commande `[ Tri : [Label] ]` dans `Window_InventoryCommand` (bas d'écran à 5 colonnes).
     - Cycle séquentiel entre : *Tout, Consommables, Biomédical, Ingrédients, Équipements, Armes & Munitions, Outils, Datapads, Objets Clés, Divers*.
     - Filtre simultanément et en temps réel le sac du joueur et le conteneur (`_partyWindow` et `_targetWindow`).
     - **Adaptatif** : Si le conteneur cible impose des restrictions (`onlyWeapons`, `onlyItems`, etc.), le toggle saute automatiquement les catégories incompatibles.
  6. **Typage Notetag `<sc_type: ...>` & Détection "Divers"** :
     - Résolution universelle dans `DataManager.itemScTypeInfo(item)`.
     - Affichage dans l'en-tête de `Window_Help` : `[ TYPE : ÉQUIPEMENT ]` ou `[ TYPE : DIVERS ]` en surbrillance, suivi de la description en ligne 2.
     - Permet d'identifier immédiatement en jeu les objets non tagués afin de compléter les bases de données.
  7. **Avertissements Prédictifs de Surcharge Pondérale (Poids !)** :
     - Affichage de `⚠️ +X kg (SURCHARGE !)` en rouge dans la fenêtre d'aide.
     - Mention `⚠️` et texte rouge sur `Prendre 1` et `Prendre Tout` dans la modale d'action.
     - Bouton `Tout vider` en rouge d'alerte avec `⚠️` si le déversement dépasse la charge maximale du joueur.
- **Validation** :
  - Suite de tests complète : [`UNIT_TESTS/test_inventory_layout.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/UNIT_TESTS/test_inventory_layout.js) (**16/16 tests** validés avec succès).
  - Synchronisation stricte de [`plugins.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins.js) et [`plugins.backup.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins.backup.js) (SHA256: `C184C159BDD46171132427FAD58F7B9C9AB62FC6D7CC85376AFA5119AA171071`).

---

### 11.35 Didacticiels Contextuels : Synchronisation et Priorité aux Boîtes de Message
- **Statut** : Complété et validé par tests unitaires automatisés ([`UNIT_TESTS/test_tuto_system.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/UNIT_TESTS/test_tuto_system.js) - 35/35 tests).
- **Problématique** :
  - Empêcher l'ouverture intrusive d'une fenêtre de tutoriel (`Window_Tuto`) par-dessus un dialogue narratif ou un événement textuel en cours (`Window_Message` / `$gameMessage`).
  - Assurer la conservation ordonnée de la file d'attente (`_queue`) tant qu'un message est visible ou en cours d'animation de fermeture, puis ouvrir automatiquement le didacticiel dès le retour au calme.
- **Fonctionnalités Techniques** :
  1. **Détection `isMessageActive()`** :
     - Écoute `$gameMessage.isBusy()` (textes, choix, inputs).
     - Surveille l'état de fermeture de `_messageWindow` (`!isClosed()`) et `_scrollTextWindow` pour couvrir l'intégralité de l'animation de disparition de la fenêtre de dialogue (openness de 255 à 0).
  2. **File d'Attente Non-Destructive** :
     - `processNext()` suspend son dépilement si `isMessageActive()` est vrai. Le tutoriel reste sagement dans `_queue`.
     - `isBusy()` de `TutoManager` reste à `false` tant qu'aucun didacticiel n'est affiché à l'écran, ce qui préserve la réactivité de la boucle de jeu (`updateMain`) et permet au joueur de faire défiler ses dialogues.
  3. **Reprise Automatique (`update()`)** :
     - `Scene_Map.prototype.update` invoque `window.$tutoManager.update()`.
     - Dès que le message s'éteint complètement, le prochain tutoriel de la file est dépilé et s'ouvre proprement.

---

### 11.36 Résolution de la Sérialisation Profonde JsonEx et Refonte Haute Définition UI Inventaire
- **Statut** : Complété et validé ([`UNIT_TESTS/test_sc_actor_hierarchy.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/UNIT_TESTS/test_sc_actor_hierarchy.js) - 49/49 tests, [`UNIT_TESTS/test_inventory_layout.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/UNIT_TESTS/test_inventory_layout.js) - 18/18 tests).
- **Correctif `Object too deep` (Menu Équipement Vanilla)** :
  - `Window_EquipItem.prototype.updateHelp` effectue un `JsonEx.makeDeepCopy(this._actor)` pour simuler les variations de statistiques.
  - Les références `_actor`, `_entity` et `_target` ont été rendues non-énumérables (`enumerable: false`) dans tous les sous-composants (`equipment`, `inventory`, `combat`, `social`, `location`, `character`).
  - Suppression complète de toute récursion cyclique lors de la sérialisation / désérialisation JSON.
- **Améliorations UI Scene_Inventory** :
  - **Assets Dédiés** : Déplacement dans `img/GUI/inventory/` (`defautInventoryIcon.png`, `bagIcon.png`, `PF-Mouvement.jpg`).
  - **Hauteur 168px (Headers & Help)** : Faceset RMMZ natif 144x144 rendu intégralement sans rognage, icône conteneur redimensionnée à 136px.
  - **Masque Photomask Radial** : Superposition de `PF-Mouvement.jpg` en mode `MULTIPLY`.
  - **Sprite Vivant en Arrière-Plan** : Intégration de `Sprite_Character($gamePlayer)` sous le masque pour actualiser visuellement en direct le héros lors de l'équipement.
  - **Nettoyage des Rectangles Fantômes** : Suppression d'une surcharge doublon `refresh()` dans `Window_InventoryList` et synchronisation stricte de `contentsBack`.

---

### 11.37 Refonte Architecturale Découplée de Game_ScActor (WeakMap & Sérialisation Whitelistée) & Snap de Carte Sans Acteur
- **Statut** : Complété et validé ([`UNIT_TESTS/test_sc_actor_hierarchy.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/UNIT_TESTS/test_sc_actor_hierarchy.js) - 62/62 tests, [`UNIT_TESTS/test_inventory_layout.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/UNIT_TESTS/test_inventory_layout.js) - 18/18 tests).
- **Architecture des Composants Enfants sans Référence `_actor` Directe** :
  - **Éradication des Références Circulaires** : Suppression complète du stockage de `this._actor` sous forme de propriété sur les 6 sous-composants (`equipment`, `inventory`, `combat`, `social`, `location`, `character`).
  - **Résolution Dynamique et Sûre** : Utilisation de `WeakMap` isolées par composant (`_scActorXxxMap`) associées à un getter/méthode `actor()` qui résout en repli l'acteur via son identifiant souverain `$gameActors.actor(this._actorId)`.
  - **Isolation Vis-à-vis de JsonEx** : Les 6 propriétés de composants sur `Game_ScActor` sont définies comme non-énumérables (`enumerable: false`), empêchant `JsonEx.stringify` et `JsonEx.makeDeepCopy` de traverser récursivement les sous-arbres.
  - **Sérialisation Whitelistée Dédiée** : Implémentation du pattern `makeSavefileData()` et `loadSavefileData(data)` sur `Game_ScActor`, ses sous-composants, `Game_Actors` et `SC_DataManager` (`contents.sc_actors`), calqué sur l'architecture robuste de la Galaxy et des Quêtes.
- **Capture Propre du Fond de Carte (Scene_Inventory)** :
  - **Masquage Pré-Snap dans Scene_Map** : `Scene_Map.prototype.terminate` masque temporairement l'entité `$gamePlayer` (`setTransparent(true)` et `visible = false` sur son sprite) juste avant l'appel à `SceneManager.snapForBackground()`, puis restaure immédiatement sa visibilité. Le snapshot bitmap ne contient ainsi aucun sprite figé du joueur.
  - **Centrage In-World du Masque Vignette** : La vignette radiale `PF-Mouvement.jpg` (en `MULTIPLY`) est ancrée en `(0.5, 0.5)` et centrée précisément sur les coordonnées réelles écran du joueur `($gamePlayer.screenX(), $gamePlayer.screenY() - 24)`, s'adaptant à n'importe quelle configuration de carte (avec ou sans scrolling).
  - **Sprite Vivant Positionné et Orienté** : `_playerLiveSprite` (`Sprite_Hero` avec support Paperdoll) est positionné aux coordonnées exactes de l'avatar et orienté selon son `direction()` natif, garantissant une actualisation visuelle immédiate et fluide sans superposition résiduelle lors du changement d'équipement.

---

## 12. Feuille de Route & Perspectives Futures

### Ergonomie, Contrôles & Entrées
- Architecture `SC4_KeymapManager` & Getter strict sur `Input.keyMapper` : gestionnaire contextuel centralisé des touches (exploration, cockpit FTL, mini-jeux), profils joueur configurables en options et hooks sans effets de bord.

### Combat & Balistique
- Trajectoires balistiques paraboliques pour grenades et armes de jet.
- Armes à surchauffe et enrayement.
- Armes à charge progressive (type canon à plasma / fusil Gauss).
- Couverture dynamique et ligne de vue via la couche R (*Region IDs*).
- Ciblage automatique (*auto-targeting*) sur l'ennemi le plus proche.

### Navigation Spatiale & Univers
- Rapprochement et communications radio avec vaisseaux tiers.
- Combats tactiques de vaisseaux spatiaux en vue orbitale.
- Gestion complète des ressources du vaisseau (carburant, oxygène, blindage, compartiments).
- Génération procédurale d'anomalies de sous-système.

---

*Fin du document — Référentiel technique unifié SimCraft Engine V2.*
