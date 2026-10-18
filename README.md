# SimCraft Engine (SCE) - V2 (SC4)
![Simcraft Engine](https://img.shields.io/badge/Engine-Simcraft%20V2-blue)  
![Version](https://img.shields.io/badge/Version-2.0.0--alpha-orange)  
![Status](https://img.shields.io/badge/Status-Active%20Refactoring-brightgreen)  
![RPG Maker MZ](https://img.shields.io/badge/Compatibility-RPG%20Maker%20MZ-red)

# Licence

![Licence CC BY-NC-SA 4.0](https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png)

Ce projet est sous licence **Creative Commons Attribution - Non Commercial - Share Alike 4.0 International (CC BY-NC-SA 4.0)**.

Voir le texte complet ici : [https://creativecommons.org/licenses/by-nc-sa/4.0/](https://creativecommons.org/licenses/by-nc-sa/4.0/)

### **Restrictions Supplémentaires**
En plus des termes de la licence CC BY-NC-SA 4.0, l’utilisation de ce code est soumise aux conditions suivantes :

1. **Conservation de l’En-Tête** :
   - **Tous les fichiers** doivent conserver **intact** l’en-tête original (bannière ASCII, auteur, licence, etc.).
   - **Interdiction formelle** de supprimer, modifier ou altérer l’en-tête, sous peine de violation de licence.

2. **Obligation d’Afficher le Splash Screen** :
   - Tout projet commercial utilisant ce code **doit afficher le logo "Sim Craft Engine"** au démarrage du jeu.
   - Le logo, disponible dans le dossier `/DOC/logo.png` (ou équivalent V2), doit rester visible pendant **au moins 3 secondes**.

3. **Attribution Claire** :
   - Tout projet dérivé doit **mentionner explicitement** :
     - Le nom **"Sim Craft Engine"** dans les crédits.
     - Un lien vers le dépôt officiel : [https://github.com/Omnipr3z/SC2](https://github.com/Omnipr3z/SC2) (ou dépôt d'origine [SCE](https://github.com/Omnipr3z/SCE)).

Ces scripts sont conçus pour fonctionner avec le moteur RPG Maker MZ et restent soumis à la **licence propriétaire de Gotcha Gotcha Games / Degica**.

Par conséquent, **l'utilisation de ces scripts nécessite que vous possédiez une copie légale de RPG Maker MZ**.  
Ils ne peuvent pas être redistribués séparément ou utilisés en dehors du cadre autorisé par la licence utilisateur du logiciel.

Veuillez consulter le [EULA officiel de RPG Maker MZ](https://www.rpgmakerweb.com/eula) pour plus d'informations.

[![Licence RPG Maker MZ](https://img.shields.io/badge/Licence-RPG_Maker_MZ_EULA-red)](https://www.rpgmakerweb.com/eula)

---

# QU'EST-CE QUE SIMCRAFT ENGINE V2 (SC4)

**SimCraft Engine V2 (SC4)** est la réécriture complète et la modernisation du sous-moteur modulaire SimCraft pour **RPG Maker MZ**, développé pour des RPG tactiques, des simulations spatiales et des ARPGs exigeants dans l'univers sombre et futuriste de style Warhammer 40K.

> ⚡ **Refacto V2 : Légèreté, Modularité & Performance**  
> Contrairement à l'architecture monolithique de la première version, la V2 a été repensée dès le départ avec des principes stricts :
> - **Architecture légère et découplée** : aucun sur-moteur superflu, modules ES6 indépendants.
> - **Surcharges chirurgicales** : les extensions du moteur RPG Maker MZ sont concentrées dans des fichiers de patchs dédiés (`SC4_rmmz_*_Patches.js`).
> - **Simulation spatiale & ARPG unifiés** : intégration fluide entre navigation galactique multi-échelles, combat en temps réel, inventaires multiples et narration réactive.

---

# 📚 DOCUMENTATION TECHNIQUE & TUTORIELS DÉVELOPPEUR

Pour guider les développeurs et concepteurs d'événements, un répertoire complet de tutoriels spécialisés est disponible dans le dossier [`DEV_TUTORIALS/`](./DEV_TUTORIALS/) :

| Module | Description | Guide Développeur |
| :--- | :--- | :--- |
| 🚀 **Navigation & Simulation Spatiale** | Navigation multi-échelles (Secteur FTL, Système Solaire, Sous-système), sauts Warp animés, physique orbitale `$gameDate`, mode Hangar et atterrissage sur POI. | [Tutoriel Navigation Spatiale](./DEV_TUTORIALS/TUTORIAL_SPACE_TRAVEL.md) |
| 📜 **Système de Quêtes & Balises** | Gestionnaire `$gameQuests`, déclencheur temporel `$storyManager`, balises multi-échelles, objectifs hiérarchiques et alertes radio cockpit. | [Tutoriel Quêtes & Balises](./DEV_TUTORIALS/TUTORIAL_QUEST_SYSTEM.md) |
| 🔫 **Gunfight & Balistique** | Système complet d'armes à feu, munitions, rechargement (1by1 / total), balistique de projectiles, raycast, HUDs arme et acteur, visée et tir en rafale. | [Tutoriel Gunfight](./DEV_TUTORIALS/TUTORIAL_GUNFIGHT.md) |
| 🌐 **Localisation Multi-Langue** | Traduction dynamique avec balises `\L[KEY]`, dictionnaires JSON (FR/EN), intégration réactive TextManager et base de données, menu Options. | [Tutoriel Localisation](./DEV_TUTORIALS/TUTORIAL_LOCALIZATION.md) |
| 💬 **Bubble Messages** | Fenêtres de message flottantes en bulle (`Window_BubbleMsg`), ciblage dynamique (`\A`, `\E[id]`, `\PX`, `\PY`), auto-taille et edge-clamping hors-écran. | [Tutoriel Bubble Messages](./DEV_TUTORIALS/TUTORIAL_BUBBLE_MESSAGE.md) |
| ⭕ **Ring Command Menu** | Menu circulaire rotatif (`Window_RingCommand`), animation d'ouverture Ease-Out, icônes, navigation angulaire et trigger tactile/souris sur la carte. | [Tutoriel Ring Command](./DEV_TUTORIALS/TUTORIAL_RING_COMMAND.md) |
| 🎒 **Conteneurs & Multi-Inventaires** | Gestion des inventaires secondaires (`Game_Inventories`), conteneurs persistants vs auto-erase, support items/armes/armures, sauvegarde/chargement. | [Tutoriel Conteneurs](./DEV_TUTORIALS/TUTORIAL_CONTAINERS_INVENTORIES.md) |

Consultez le [Sommaire Général des Tutoriels](./DEV_TUTORIALS/README.md) pour les conventions globales et le [Journal de Développement (Walkthrough)](./Walktrough.md) pour l'historique complet des étapes et spécifications techniques.

---

# FONCTIONNALITÉS IMPLÉMENTÉES (V2)

### 1. 🎨 Système Paperdoll & Rendu Composite Dynamique (`Bitmap_Composite`)
- **Génération multi-couches en temps réel** : assemblage automatique du corps de base, du visage (`<Face>`), des armures, équipements et vêtements (`<visual_equip: FILENAME, zindex>`).
- **Spritesheets 96x96 pixels & 8 directions** : prise en charge complète des 8 orientations (cardinales et diagonales).
- **Organisation par action** : séparation propre des feuilles d'animation par état (`walk`, `run`, `atk`, `hurt`, `down`, etc.).
- **Cache haute performance** : clé de cache composite intelligente évitant tout recalcul inutile tout en permettant les recompositions à chaud.

### 2. 🕹️ Déplacement 8 Directions & Mode Visée Libre
- **Déplacement fluide en 8 directions** au clavier comme à la souris (clic gauche).
- **Mode de visée au clic droit maintenu** : orientation instantanée du héros vers la position du curseur souris sans interrompre ni altérer la trajectoire de marche au clavier.
- **Séparation contextuelle des clics** :
  - *Clic droit maintenu* : visée / orientation.
  - *Clic gauche seul* : déplacement vers la cible / interaction.
  - *Clic droit maintenu + Clic gauche* : déclenchement de l'action d'attaque orientée.

### 3. ⚔️ Moteur d'Actions & Animations Paramétrables (`playAction`)
- **API universelle d'animation** : méthode `playAction({ action, duration, frames })` exécutable sur le joueur, les compagnons ou les événements de carte.
- **Attaque personnalisée (`<visual_attack>`)** : balise XML paramétrable sur l'acteur ou les armes (durée par frame, nombre de frames, nom de l'action).
- **Transitions propres** : verrouillage temporaire pendant l'action puis retour automatique à l'état de repos (`walk`).

### 4. 👥 Compagnons d'Équipe (Followers) Avancés & Interactions
- **Intégration Paperdoll complète** sur tous les membres de la troupe d'accompagnement.
- **Orientation 8 directions** synchronisée avec le moteur de déplacement.
- **Support des actions animées** : capacité à déclencher des poses et actions scriptées (`this.playAction`) sur les suiveurs.
- **Interactions tactiles et orientation contextuelle** :
  - Le déplacement à la souris (clic gauche) ne déclenche plus accidentellement de dialogue avec un follower à l'arrivée.
  - Cliquer sur un compagnon adjacent sans lui faire face pivote d'abord le héros dans sa direction sans ouvrir de dialogue.
  - Le dialogue d'interaction ne s'ouvre que lorsque le joueur fait déjà face au compagnon et clique sur lui.

### 5. 🎭 Événements Acteurs (Actor Events) & Gestion d'Équipe Dynamique
- **Association Événement-Acteur** via le notetag `<actor: [ACTOR_ID]>` sur la page active ou la note de l'événement.
- **Rendu graphique adaptatif** : affichage en Paperdoll composite si l'acteur est un héros configuré, ou en character standard RMMZ dans le cas contraire.
- **Recrutement interactif (`joinPlayerParty()`)** : l'événement sur carte marche physiquement jusqu'à la position d'incorporation dans la formation avant d'intégrer l'équipe.
- **Renvoi dynamique des compagnons** : dialogue interactif avec le compagnon permettant de lui demander de rester ; l'événement carte réapparaît immédiatement sur la tuile exacte du compagnon libéré.
- **Gestion intelligente de la présence sur carte** : masquage automatique de l'événement lorsque l'acteur est présent dans l'équipe (sauf présence du notetag `<actor_visible>`).

### 6. 🏃 Course Dynamique (Dash / Run)
- Bascule automatique et instantanée de l'action `walk` à l'action `dash` (spritesheets `run`) pour le joueur et les followers dès que la course est active.
- Prise en charge sur les événements acteurs avec bascule automatique basée sur la vitesse de déplacement configurée.

### 7. 🥊 Combat ARPG en Temps Réel (`FightManager`) - Mêlée & Dégâts
- **Gestionnaire centralisé `window.$fightManager`** : indexation et surveillance dynamique des acteurs et ennemis de la carte courante.
- **Optimisation de performance (Screen Culling)** : le gestionnaire de combat filtre et n'évalue que les ennemis visibles à l'écran (`isNearTheScreen()`), maintenant les cibles distantes en veille.
- **Rôles et affiliations par notetags** :
  - `<role: neutral/hostile/ally/civilian>`
  - `<enemy: [ENNEMY_ID]>` : lie un événement hostile à un battler `Game_Enemy` avec ses statistiques et compétences RMMZ.
  - `<attackId: [SKILL_ID]>` : compétence utilisée lors de l'attaque (par défaut ID 1).
- **Combat au corps-à-corps sans arme** : résolution en temps réel des dégâts par le moteur natif (`Game_Action`) lors d'une attaque au contact direct face à un ennemi hostile.
- **Gestion des délais et interruptions de combat** :
  - Lors de dégâts (animation `hurt`), le délai d'attaque est réinitialisé (`onHurt()`).
  - Pendant l'animation d'attaque (`atk`), le compteur est gelé et remis à zéro à la fin de l'action.
- **Retours physiques et visuels complets** :
  - L'ennemi pivote pour faire face à l'attaquant.
  - Déclenchement de l'animation de compétence (`$gameTemp.requestAnimation`).
  - Réaction d'impact `hurt` (3 frames) avec recul physique (**knockback**) d'une case.
  - Réaction de mort `down` (3 frames) avec activation automatique de l'interrupteur local `C` pour le traitement des états de cadavre / butin.

### 8. 🎒 Inventaires Multiples & Conteneurs (`$inventories` & `Scene_Inventory`)
- **Hub centralisé `$inventories` (`Game_Inventories`) & instances `Game_Inventory`** :
  - Support d'inventaires secondaires multiples instanciés à la volée (`$inventories.inventory(id)`).
  - Conventions de nommage claires et notetags dédiés :
    - Acteurs : `A_[ACTOR_ID]` (`<actor_inventory: ID>`)
    - Conteneurs : `C_[EVENT_ID]` (`<inventory>` ou `<inventory: ID>`)
    - Ennemis : `E_[ENEMY_ID]` (`<enemy_inventory: ID>`)
  - Pré-remplissage via `data/SC/INVENTORIES.json` et persistance complète dans les sauvegardes.
- **Interface graphique dédiée (`Scene_Inventory`)** :
  - Double panneau ergonomique : inventaire du joueur (`Game_Party`) et inventaire cible (Allié, Conteneur, Cadavre ennemi).
  - Commandes d'action (*Transférer 1*, *Transférer Tout*, *Annuler*).

### 9. 🤖 Architecture Modulaire des IA (`IAManager`, `IA_melee`, `IA_range`, `Enemy_AI`)
- **Machine à états finis (FSM) à 4 modes modulaires** :
  - **MODE_NEUTRE (`neutral`)** : patrouille autonome sur la carte.
  - **MODE_ENGAGE (`engage`)** : accélération et poursuite de la cible via pathfinding A* 8 directions dès franchissement du rayon d'engagement.
  - **MODE_RECHERCHE (`search`)** : recherche de la cible perdue pendant une durée configurable (`AI_SEARCH_TIME`).
  - **MODE_RETOUR_BASE (`return`)** : retour à la position d'ancrage en cas de leash ou de perte de cible.
- **Attaques IA au corps-à-corps & à distance** avec knockback, animations d'impact et gestion du KO joueur (écran Game Over).

### 10. 💡 Indicateurs Visuels d'État & Jauges (`Sprite_CharacterIndicator`, `Spriteset_FightGauges`)
- Indicateurs animés au-dessus de la tête des ennemis (`!` jaune engagement, `?` rouge recherche, `?` jaune neutre).
- Jauges de combat dynamiques au-dessus des ennemis engagés : barre AT (Attack Timer), PV (avec dégradé dynamique et clignotement critique) et PM.

### 11. 🔫 Système d'Armes à Feu & Balistique (`SC4_Gunfight`)
- Armes à feu personnalisées par notetags (`<gun_type>`, `<gun_range>`, `<gun_ammo_id>`, `<gun_mag_capacity>`, `<gun_reload_type: total|1by1>`, `<gun_fire_rate>`, `<gun_sound>`).
- Raycast et balistique temps réel avec vérification des obstacles et détection des cibles ennemies.
- HUD d'arme dédié affichant le chargeur actuel, les réserves et les animations de rechargement.

### 12. 🌐 Localisation Multi-Langue Dynamique (`SC4_Localization`)
- Prise en charge des balises `\L[KEY]` dans les textes, fenêtres, messages et bases de données.
- Dictionnaires JSON externes (`data/SC/Localisation_FR.json` et `Localisation_EN.json`).
- Bascule instantanée de la langue dans les options sans rechargement.

### 13. 💬 Bubble Messages & Ring Command (`SC4_BubbleMessage`, `SC4_RingCommand`)
- **Bubble Messages** : fenêtres de dialogue flottantes au-dessus des acteurs (`\A`) ou événements (`\E[id]`) avec dimensionnement automatique et maintien à l'écran.
- **Ring Command** : menu circulaire rotatif pour les actions rapides, interactions contextuelles et ordres d'équipe.

### 14. 🚀 Voyage Spatial Multi-Échelles & Simulation Galactique (`SC4_SpaceTravel`, `SC4_SpaceScenes`)
- **Trois niveaux d'échelles imbriquées** :
  - **Niveau 1 : Secteur / Galaxie (Scene_SectorTravel)** : Constellations FTL, tracé des liaisons, sauts Warp visibles avec déplacement animé le long des lignes.
  - **Niveau 2 : Système Solaire (Scene_SpaceTravel)** : Étoile centrale, physique orbitale elliptique temps réel, navigation libre, approche des vaisseaux PNJ (*Vigilance Prime*) et mise en contact.
  - **Niveau 3 : Sous-système Planétaire (Scene_SubsystemTravel)** : Planète centrale en rotation continue, vaisseau en orbite stationnaire visible à côté de la planète, Points d'Intérêt rotatifs (échelle 0.25).
- **Mode Hangar & Atterrissage** :
  - Accès direct via `SC4.openHangar()` depuis la navette du hangar.
  - Atterrissage automatique : joueur invisible (`setTransparent`), téléportation sur la carte cible et déclenchement du Self-Switch A de l'événement d'atterrissage.

### 15. ⏱️ Horloge Galactique & Simulation en Tâche de Fond (`SC4_GameDate`)
- Horloge continue et calendrier Warhammer 40K (`2.dayOfYear.year.M41 [HH:MM]`).
- Modes de vitesse dynamiques : Normal (Mode 1), Croisière (Mode 2, 2x), Saut FTL / Hyperdrive (Mode 4, 12x).
- **Simulation continue en arrière-plan** : lorsque le joueur explore à pied sur `Scene_Map`, le temps avance et les vaisseaux poursuivent leur vol spatial au prorata exact des minutes écoulées.

### 16. 📜 Système de Quêtes & Datapad Impérial (`SC4_QuestManager`, `Scene_QuestBook`)
- **Quêtes hiérarchiques multi-échelles** : projection automatique des balises sur l'étoile (Galaxie), la planète (Système) et le POI (Sous-système).
- **StoryManager** : déclenchement temporel automatique par le calendrier `$gameDate` et transmission de messages astropathiques au terminal CRT du cockpit.
- **Livre de Quêtes / Datapad (`Scene_QuestBook`)** :
  - Registre de missions complet avec filtres par onglets (*En cours*, *Terminées*, *Toutes*).
  - Fiche détaillée à défilement avec briefing, logs radio d'origine et objectifs géolocalisés avec fil d'Ariane (`Secteur ▹ Système ▹ Planète ▹ POI`).
  - Accès rapide en événement RMMZ via `SC4.openQuestBook()` ou commande de plugin `openQuestBook`.

---

# ARCHITECTURE & ORGANISATION DU PROJET

L'ensemble des composants de SimCraft 4 est structuré ainsi :

```text
SC4/
├── data/                               # Données RPG Maker MZ
│   └── SC/                             # Bases de données JSON spécifiques SimCraft
│       ├── INVENTORIES.json            # Inventaires secondaires initiaux
│       ├── Localisation_FR.json        # Dictionnaire français
│       ├── Localisation_EN.json        # Dictionnaire anglais
│       ├── PLANETS.json                # Planètes, mouvements et POIs
│       ├── QUESTS.json                 # Quêtes et objectifs hiérarchiques
│       ├── SECTORS.json                # Secteurs galactiques et constellations FTL
│       ├── SHIP_MOTORS.json            # Moteurs et capacités de fuel
│       ├── SPACESHIPS.json             # Flotte de vaisseaux du secteur
│       └── TIME_SYSTEM.json            # Configuration du calendrier stellaire
├── DEV_TUTORIALS/                      # Documentation technique et tutoriels développeur
│   ├── README.md                       # Sommaire des tutoriels
│   ├── TUTORIAL_SPACE_TRAVEL.md        # Guide complet de navigation spatiale
│   ├── TUTORIAL_QUEST_SYSTEM.md        # Guide complet du système de quêtes
│   ├── TUTORIAL_GUNFIGHT.md            # Guide des armes à feu et balistique
│   ├── TUTORIAL_LOCALIZATION.md        # Guide du système de traduction
│   ├── TUTORIAL_BUBBLE_MESSAGE.md      # Guide des bulles de dialogue
│   ├── TUTORIAL_RING_COMMAND.md        # Guide du menu circulaire
│   └── TUTORIAL_CONTAINERS_INVENTORIES.md # Guide des conteneurs
├── img/                                # Ressources graphiques
│   ├── GUI/ship/                       # Éléments d'interface spatiale, planètes et icônes
│   ├── characters/composite/           # Banques Paperdoll (corps, têtes, équipements)
│   └── ui/                             # Jauges et indicateurs visuels
├── js/
│   ├── plugins.js                      # Registre d'activation des plugins
│   └── plugins/
│       ├── SC4_GameDate.js             # Moteur temporel et calendrier 40K
│       ├── SC4_SpaceTravel.js          # Moteur physique spatial et navigation
│       ├── SC4_SpaceScenes.js          # Scènes graphiques spatiales (Secteur, Système, Sous-système)
│       ├── SC4_QuestManager.js         # Quêtes, StoryManager et Datapad (Scene_QuestBook)
│       ├── SC4_Gunfight.js             # Système d'armes à feu et balistique
│       ├── SC4_Localization.js         # Moteur de localisation dynamique
│       ├── SC4_BubbleMessage.js        # Bulles de message flottantes
│       ├── SC4_RingCommand.js          # Menu circulaire d'actions
│       ├── SC4_TitleScreen.js          # Écran titre cinématique animé
│       ├── Bitmap_Composite.js         # Compositeur Paperdoll
│       ├── FightManager.js             # Combat ARPG temps réel
│       ├── IAManager.js                # IA modulaire
│       └── SC4_rmmz_*_Patches.js       # Surcharges chirurgicales du noyau RMMZ
├── UNIT_TESTS/                         # Suite complète de tests unitaires automatisés
├── WALKTROUGHT.md                      # Journal de développement des étapes
└── README.md                           # Présentation générale du projet SC4
```

---

# CONTACTS ET LIENS

<span style="font-size:24px;">
<!-- Website Icon -->
<a href="https://pahernandezd3v.com" style="color:#555">
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 2048 2048" fill="#555">
  <path d="M1024 0q141 0 272 36t245 103t207 160t160 208t103 245t37 272q0 141-36 272t-103 245t-160 207t-208 160t-245 103t-272 37q-141 0-272-36t-245-103t-207-160t-160-208t-103-244t-37-273q0-141 36-272t103-245t160-207t208-160T751 37t273-37m0 1920q123 0 237-32t214-90t182-141t140-181t91-214t32-238q0-123-32-237t-90-214t-141-182t-181-140t-214-91t-238-32q-123 0-237 32t-214 90t-182 141t-140 181t-91 214t-32 238q0 123 32 237t90 214t141 182t181 140t214 91t238 32m597-880l48-144h75l-85 256h-75l-48-144l-48 144h-75l-85-256h75l48 144l48-144h74zm-464-144h75l-85 256h-75l-48-144l-48 144h-75l-85-256h75l48 144l48-144h74l48 144zm-512 0h75l-85 256h-75l-48-144l-48 144h-75l-85-256h75l48 144l48-144h74l48 144z"/>
</svg> https://pahernandezd3v.com</a> <span style="font-size:16px;">**(en cours de maintenance)**</span>
<br><br>
<!-- Discord Icon -->
<a href="https://discord.gg/2U3mqfKG" style="color:#5865f2">
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256">
  <g fill="none">
    <rect width="256" height="256" fill="#5865f2" rx="60"/>
    <g clip-path="url(#SVGYhWcPcwn)">
      <path fill="#fff" d="M197.308 64.797a165 165 0 0 0-40.709-12.627a.62.62 0 0 0-.654.31c-1.758 3.126-3.706 7.206-5.069 10.412c-15.373-2.302-30.666-2.302-45.723 0c-1.364-3.278-3.382-7.286-5.148-10.412a.64.64 0 0 0-.655-.31a164.5 164.5 0 0 0-40.709 12.627a.6.6 0 0 0-.268.23c-25.928 38.736-33.03 76.52-29.546 113.836a.7.7 0 0 0 .26.468c17.106 12.563 33.677 20.19 49.94 25.245a.65.65 0 0 0 .702-.23c3.847-5.254 7.276-10.793 10.217-16.618a.633.633 0 0 0-.347-.881c-5.44-2.064-10.619-4.579-15.601-7.436a.642.642 0 0 1-.063-1.064a86 86 0 0 0 3.098-2.428a.62.62 0 0 1 .646-.088c32.732 14.944 68.167 14.944 100.512 0a.62.62 0 0 1 .655.08a80 80 0 0 0 3.106 2.436a.642.642 0 0 1-.055 1.064a102.6 102.6 0 0 1-15.609 7.428a.64.64 0 0 0-.339.889a133 133 0 0 0 10.208 16.61a.64.64 0 0 0 .702.238c16.342-5.055 32.913-12.682 50.02-25.245a.65.65 0 0 0 .26-.46c4.17-43.141-6.985-80.616-29.571-113.836a.5.5 0 0 0-.26-.238M94.834 156.142c-9.855 0-17.975-9.047-17.975-20.158s7.963-20.158 17.975-20.158c10.09 0 18.131 9.127 17.973 20.158c0 11.111-7.962 20.158-17.973 20.158m66.456 0c-9.855 0-17.974-9.047-17.974-20.158s7.962-20.158 17.974-20.158c10.09 0 18.131 9.127 17.974 20.158c0 11.111-7.884 20.158-17.974 20.158"/>
    </g>
    <defs>
      <clipPath id="SVGYhWcPcwn">
        <path fill="#fff" d="M28 51h200v154.93H28z"/>
      </clipPath>
    </defs>
  </g>
</svg> https://discord.gg/2U3mqfKG</a>
<br><br>
<!-- Patreon Icon -->
<a href="https://www.patreon.com/c/omnipr3z" style="color:#FF424D">
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256">
  <path fill="#FF424D" d="M232 93.17c0 41-29.69 52.47-53.55 61.67c-8.41 3.24-16.35 6.3-22.21 10.28c-11.39 7.72-18.59 21.78-25.55 35.38c-9.94 19.42-20.23 39.5-43.17 39.5c-12.91 0-24.61-11.64-33.85-33.66s-14.31-51-13.61-77.45c1.08-40.65 14.58-62.68 25.7-74c14.95-15.2 35.24-25.3 58.68-29.2c21.79-3.62 44.14-1.38 62.93 6.3C215.73 43.6 232 65.9 232 93.17"/>
</svg> https://www.patreon.com/c/omnipr3z</a>
<br><br>
<!-- GitHub Icon -->
<a href="https://github.com/Omnipr3z/SC2" style="color:#555">
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 20 20">
  <path fill="#555" d="M13.18 11.309c-.718 0-1.3.807-1.3 1.799c0 .994.582 1.801 1.3 1.801s1.3-.807 1.3-1.801c-.001-.992-.582-1.799-1.3-1.799m4.526-4.683c.149-.365.155-2.439-.635-4.426c0 0-1.811.199-4.551 2.08c-.575-.16-1.548-.238-2.519-.238c-.973 0-1.945.078-2.52.238C4.74 2.399 2.929 2.2 2.929 2.2c-.789 1.987-.781 4.061-.634 4.426C1.367 7.634.8 8.845.8 10.497c0 7.186 5.963 7.301 7.467 7.301l1.734.002l1.732-.002c1.506 0 7.467-.115 7.467-7.301c0-1.652-.566-2.863-1.494-3.871m-7.678 10.289h-.056c-3.771 0-6.709-.449-6.709-4.115c0-.879.31-1.693 1.047-2.369C5.537 9.304 7.615 9.9 9.972 9.9h.056c2.357 0 4.436-.596 5.664.531c.735.676 1.045 1.49 1.045 2.369c0 3.666-2.937 4.115-6.709 4.115m-3.207-5.606c-.718 0-1.3.807-1.3 1.799c0 .994.582 1.801 1.3 1.801s1.301-.807 1.301-1.801c0-.992-.582-1.799-1.301-1.799"/>
</svg> https://github.com/Omnipr3z/SC2</a>
<br><br>
<!-- YouTube Icon -->
<a href="https://www.youtube.com/@Omnipr3z" style="color:#FF0000">
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 20 20">
  <path fill="#FF0000" d="M10 2.3C.172 2.3 0 3.174 0 10s.172 7.7 10 7.7s10-.874 10-7.7s-.172-7.7-10-7.7m3.205 8.034l-4.49 2.096c-.393.182-.715-.022-.715-.456V8.026c0-.433.322-.638.715-.456l4.49 2.096c.393.184.393.484 0 .668"/>
</svg> https://www.youtube.com/@Omnipr3z</a>
</span>
<br><br>

# Crédits

* Icônes réseaux sociaux des documentations : https://icon-sets.iconify.design/
* Gotcha Gotcha Games / Degica pour RPG Maker MZ.
