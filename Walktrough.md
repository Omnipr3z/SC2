# 🛠️ SimCraft Engine V2 (SC4) — Journal de Développement & Walkthrough

> **SimCraft Engine V2 (SC4)** — Architecture modulaire pour RPG Maker MZ  
> *Dernière mise à jour : 7 Novembre 2026*  
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
