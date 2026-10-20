# 🛠️ SimCraft Engine V2 (SC4) — Journal de Développement & Walkthrough

> **SimCraft Engine V2 (SC4)** — Architecture modulaire pour RPG Maker MZ  
> *Dernière mise à jour : 20 Octobre 2026*  
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
- **Couverture de Tests** : 26 suites de tests unitaires validées à 100% sans aucun échec (`node UNIT_TESTS/run_all_tests.js`).

---

## 12. Feuille de Route & Perspectives Futures

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
