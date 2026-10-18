# 🛠️ SimCraft Engine V2 (SC4) — Journal de Développement & Walkthrough

> **SimCraft Engine V2 (SC4)** — Architecture modulaire pour RPG Maker MZ  
> *Dernière mise à jour : 18 Octobre 2026*  
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

### 3.4 Indicateurs Visuels Flottants (`Sprite_CharacterIndicator`)
Animation fluide d'apparition (Fade-in + Zoom 0.1 ➔ 1.0) au-dessus de la tête :
- `!` (Point d'exclamation rouge) : Passage en mode **ENGAGE**.
- `?` (Point d'interrogation rouge) : Passage en mode **RECHERCHE**.
- `?` (Point d'interrogation jaune) : Perte de cible et retour en mode **NEUTRE**.

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

### 8.1 Les 3 Échelles de Navigation
1. **Échelle Galactique (Secteur FTL)** : Carte des constellations et des étoiles reliées. Sauts Warp animés avec progression visible le long des routes stellaires.
2. **Échelle Système Solaire** : Vue orbitale temps réel autour de l'étoile centrale avec orbites elliptiques des planètes et lunes.
3. **Échelle Sous-Système (Subsystem)** : Vue zoomée sur un astre en rotation continue avec ses Points d'Intérêt (POI). Vaisseau stationné en orbite à côté de la planète.

### 8.2 Procédure d'Atterrissage & Mode Hangar
- L'accès au sous-système exige d'être préalablement placé en orbite de l'astre ciblé.
- L'atterrissage ne se fait pas depuis la console cockpit mais physiquement dans le **Hangar** via la carte (`Scene_Map`).
- L'activation de l'événement du vaisseau dans le hangar ouvre l'interface de descente : téléportation sur la carte du POI, héros invisible et déclenchement du self-switch `A` de l'événement d'atterrissage.

### 8.3 Déplacement Persistant Hors-Scène
- Les trajectoires interplanétaires et de croisière continuent en temps réel pendant que le joueur navigue à bord du vaisseau en `Scene_Map`.

### 8.4 Moteur Temporel (`Game_Date`)
- Horloge continue et persistante (secondes, minutes, heures, jours, mois, années).
- Rotation des planètes synchronisée sur `$gameDate`.
- Dilatation temporelle : le temps s'écoule normalement à quai et sur la carte, et s'accélère proportionnellement lors des vols de croisière spatiale.

---

## 9. Système de Quêtes, Balises & Journal de Bord (Datapad)

### 9.1 Séparation des Responsabilités
- **`$storyManager`** : Supervise les jalons temporels, les dates limites et les déclenchements d'événements selon l'horloge `$gameDate`.
- **`$gameQuests` (`SC4_QuestManager`)** : Suit l'état opérationnel des missions, leurs objectifs hiérarchiques et les récompenses associées.

### 9.2 Structure d'une Quête (`data/SC/Quests.json`)
```json
{
  "id": "quest_space_01",
  "title": "\\L[quest_01_title]",
  "category": "main",
  "level": 3,
  "description": "\\L[quest_01_desc]",
  "locations": [
    { "systemId": "ankaros", "planetId": "ankaros_prime", "poiId": "landing_base", "active": true }
  ],
  "objectives": [
    { "id": "obj_reach_ankaros", "text": "\\L[obj_reach_ankaros]", "completed": false }
  ],
  "rewards": { "exp": 250, "gold": 1200, "items": [{ "id": 5, "amount": 2 }] }
}
```

### 9.3 Balises Spatiales & POI
- Balises spatiales redimensionnées à 0.25x avec animation de pulsation respiratoire (scale + fade).
- Masquage automatique des marqueurs de POI neutres lorsqu'une quête active pointe déjà sur les mêmes coordonnées.
- Alerte radio cockpit (`RadioComm`) signalant la mise à jour des objectifs.

### 9.4 Datapad / Journal de Bord (`Scene_QuestBook`)
- Accessible via le menu ou par script rapide :
  ```javascript
  SceneManager.push(Scene_QuestBook);
  ```
- Onglets : *En cours*, *Terminées*, *Toutes*.
- Panneau d'informations complet : description localisée, localisation stellaire, statut des objectifs et aperçu des récompenses.

---

## 10. Interface Utilisateur Avancée : Localisation, Bubble Messages & Ring Command

### 10.1 Localisation Multi-Langue (`SC4_Localization`)
- Dictionnaires JSON dans `data/SC/Localisation_FR.json` et `Localisation_EN.json`.
- Balise universelle `\L[KEY]` résolue dynamiquement dans les messages, TextManager et propriétés d'objets (`name`, `description`).
- Changement de langue à la volée dans les Options, persistant dans `config.rpgsave`.

### 10.2 Messages en Bulles Flottantes (`SC4_BubbleMessage`)
- `Window_BubbleMsg` remplace contextuellement les fenêtres de message traditionnelles.
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
- Une classe principale par fichier JavaScript.
- Surcharges du moteur vanilla concentrées dans `SC4_rmmz_*_Patches.js`.
- Conservation absolue des bannières d'en-tête ASCII et licences.
- Préservation de l'intégrité des données vanilla (aucun hack destructif dans les JSON de base).

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
