# Guide Développeur & Tutoriel : Système de Quêtes & Balises Multi-Échelles (SC4)

Ce document constitue la référence technique et conceptuelle complète du système de quêtes scénarisées, des transmissions astropathiques, de la progression par objectifs et des balises spatiales multi-échelles dans **SimCraft 4**.

---

## Sommaire
1. [Vue d'Ensemble & Architecture ($gameQuests & $storyManager)](#1-vue-densemble--architecture-gamequests--storymanager)
2. [Spécification & Structure Complète de `data/SC/QUESTS.json`](#2-spécification--structure-complète-de-datascquestsjson)
   - [2.1 Modèle de Quête (`Game_Quest`)](#21-modèle-de-quête-game_quest)
   - [2.2 Modèle d'Objectif Géolocalisé (`Game_QuestLocation`)](#22-modèle-dobjectif-géolocalisé-game_questlocation)
   - [2.3 Règle d'Or : Séparation Quêtes / Cartographie](#23-règle-dor--séparation-quêtes--cartographie)
3. [Projection Multi-Échelles des Balises Visuelles](#3-projection-multi-échelles-des-balises-visuelles)
   - [3.1 Niveau 1 : Échelle Galactique (Constellations & Étoiles)](#31-niveau-1--échelle-galactique-constellations--étoiles)
   - [3.2 Niveau 2 : Échelle du Système Solaire (Planètes & Satellites)](#32-niveau-2--échelle-du-système-solaire-planètes--satellites)
   - [3.3 Niveau 3 : Échelle du Sous-Système (Points d'Intérêt / POIs)](#33-niveau-3--échelle-du-sous-système-points-dintérêt--pois)
   - [3.4 Intégration Visuelle : Masquage des Doublons & Volet d'Infos](#34-intégration-visuelle--masquage-des-doublons--volet-dinfos)
4. [StoryManager & Déclencheurs Temporels ($gameDate)](#4-storymanager--déclencheurs-temporels-gamedate)
   - [4.1 Déclenchement Automatisé par Timestamp](#41-déclenchement-automatisé-par-timestamp)
   - [4.2 Transmissions & Alertes au Terminal CRT de Vol](#42-transmissions--alertes-au-terminal-crt-de-vol)
5. [Recettes Développeur : Création & Intégration](#5-recettes-développeur--création--intégration)
   - [5.1 Créer une Quête Principale avec Message Radio](#51-créer-une-quête-principale-avec-message-radio)
   - [5.2 Ajouter des Objectifs Multiples & Séquentiels](#52-ajouter-des-objectifs-multiples--séquentiels)
   - [5.3 Valider une Étape de Quête depuis un Événement Carte](#53-valider-une-étape-de-quête-depuis-un-événement-carte)
6. [API Complète & Commandes Scriptables](#6-api-complète--commandes-scriptables)
7. [Liens & Documentation Connexe](#7-liens--documentation-connexe)

---

## 1. Vue d'Ensemble & Architecture (`$gameQuests` & `$storyManager`)

Le moteur de quêtes de SC4 est implémenté dans [`SC4_QuestManager.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_QuestManager.js) et s'articule autour de deux gestionnaires globaux distincts :

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CALENDRIER STELLAIRE ($gameDate)                │
│                        Horloge galactique continue 40K                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Écoute du timestamp
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        STORY MANAGER ($storyManager)                   │
│  • Scrute les quêtes en attente de déclenchement temporel.             │
│  • Active la quête dès que : timestamp >= triggerTimestamp.           │
│  • Transmet les alertes radio au terminal de vol ($systemMapManager).  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Déclenche et active
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        REGISTRE DE QUÊTES ($gameQuests)                │
│  • Catalogue central des quêtes (instances de Game_Quest).             │
│  • Suivi des statuts (Active, Complétée, Échouée).                     │
│  • Gestion des objectifs hiérarchiques (instances de Game_QuestLocation)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Requêtes multi-échelles
                                    ▼
┌──────────────────────────┬──────────────────────────┬──────────────────┐
│ Carte Galactique         │ Système Solaire          │ Sous-Système     │
│ (Scene_SectorTravel)     │ (Scene_SpaceTravel)      │ (Scene_Subsystem)│
│ hasIndicatorForSystem()  │ hasIndicatorForPlanet()  │ hasIndicatorPoi()│
└──────────────────────────┴──────────────────────────┴──────────────────┘
```

---

## 2. Spécification & Structure Complète de `data/SC/QUESTS.json`

Le fichier `data/SC/QUESTS.json` contient un tableau d'objets Quête.

### Exemple de Structure Complète :
```json
[
  {
    "id": 0,
    "name": "Signal Astropathique Impérial",
    "description": "Une balise de détresse de la Marine Impériale a été interceptée. Rendez-vous au spatioport Magellan pour identifier l'origine du message.",
    "iconName": "mapIcon_qust",
    "triggerTimestamp": 55657647,
    "active": true,
    "alertTxt": [
      {
        "style": "alert",
        "txt": "ALERTE RADIO : Message astropathique prioritaire capté !"
      },
      {
        "style": "basicInfos",
        "txt": "Coordonnées de transmission triangulées sur Ankaros Prime."
      }
    ],
    "locations": [
      {
        "id": "loc_prime_spaceport",
        "name": "Spatioport Magellan",
        "description": "Retrouver l'émissaire impérial aux quais d'embarquement.",
        "sectorId": 0,
        "systemId": 0,
        "planetId": 4,
        "poiId": "prime_spatioport",
        "active": true,
        "completed": false
      },
      {
        "id": "loc_vortex_investigation",
        "name": "Épave Dérivante Saint-Drusus",
        "description": "Explorer l'anomalie dans le vortex pour récupérer le journal de bord.",
        "sectorId": 0,
        "systemId": 0,
        "planetId": 2,
        "poiId": "warp_derelict",
        "active": false,
        "completed": false
      }
    ]
  }
]
```

---

### 2.1 Modèle de Quête (`Game_Quest`)

| Propriété | Type | Description |
| :--- | :--- | :--- |
| **`id`** | `number` | Identifiant numérique unique de la quête. |
| **`name`** | `string` | Titre officiel de la mission (affiché dans les journaux et volets cibles). |
| **`description`** | `string` | Descriptif global et contexte narratif. |
| **`iconName`** | `string` | Nom de l'icône de balise dans `img/GUI/ship/` (défaut : `"mapIcon_qust"`). |
| **`triggerTimestamp`**| `number` | Date stellaire minimale requise pour l'activation automatique par le `$storyManager`. |
| **`active`** | `boolean` | `true` si la quête commence déjà active dès le début du jeu. |
| **`alertTxt`** | `Array<Object>` | Liste des messages textuels diffusés sur le terminal CRT du cockpit lors du déclenchement. Chaque entrée contient `style` (`"alert"`, `"basicInfos"`, `"infos"`) et `txt`. |
| **`locations`** | `Array<Object>` | Tableau des objectifs géolocalisés associés à la mission. |

---

### 2.2 Modèle d'Objectif Géolocalisé (`Game_QuestLocation`)

Chaque quête peut contenir un ou plusieurs objectifs géographiques, actifs en simultané ou débloqués séquentiellement.

| Propriété | Type | Description |
| :--- | :--- | :--- |
| **`id`** | `string` | Identifiant unique de l'objectif (ex: `"loc_prime_spaceport"`). |
| **`name`** | `string` | Intitulé court de l'objectif (affiché dans le volet d'info spatiale). |
| **`description`** | `string` | Détail de l'action à réaliser sur place. |
| **`sectorId`** | `number` | ID du secteur galactique concerné (référence `SECTORS.json`). |
| **`systemId`** | `number` | ID du système solaire cible. |
| **`planetId`** | `number` | ID du corps céleste (référence `PLANETS.json`). |
| **`poiId`** | `string` | ID unique du Point d'Intérêt déclaré dans la planète cible. |
| **`active`** | `boolean` | `true` si l'objectif est actuellement actif et doit afficher une balise. |
| **`completed`** | `boolean` | `true` si l'objectif a été accompli avec succès. |

---

### 2.3 Règle d'Or : Séparation Quêtes / Cartographie

> [!IMPORTANT]
> **Aucune coordonnée cartographique brute $(X, Y)$ ni ID de carte RMMZ ne doit figurer dans `QUESTS.json`.**  
> Les quêtes pointent **uniquement** vers un `poiId`. C'est le fichier [`PLANETS.json`](./TUTORIAL_SPACE_TRAVEL.md#22-planetsjson-corps-célestes-mouvements--pois) qui détient les données physiques du POI :
> * Ses coordonnées polaires sur la sphère planétaire (`mapX`, `mapY`).
> * La carte RMMZ de destination pour l'atterrissage (`landingMapId`).
> * L'événement à déclencher à l'arrivée (`landingEventId`).
>
> Cette séparation garantit que modifier la géographie d'une planète ou l'ID d'une carte n'affecte jamais l'écriture des quêtes.

---

## 3. Projection Multi-Échelles des Balises Visuelles

Le gestionnaire de quêtes fournit des requêtes optimisées permettant aux différentes scènes de vol de projeter la balise de quête (`mapIcon_qust`) au niveau d'échelle approprié :

### 3.1 Niveau 1 : Échelle Galactique (Constellations & Étoiles)
* **Scène** : `Scene_SectorTravel`
* **Méthode d'interrogation** :
  ```javascript
  $gameQuests.hasIndicatorForSystem(sys.id)
  ```
* **Effet visuel** : Une balise pulsée clignote au centre de l'étoile concernée dans la constellation galactique.
* Si le joueur survole ou sélectionne l'étoile, la fenêtre d'information affiche le nom du système et signale qu'un objectif prioritaire y attend la flotte.

### 3.2 Niveau 2 : Échelle du Système Solaire (Planètes & Satellites)
* **Scène** : `Scene_SpaceTravel`
* **Méthode d'interrogation** :
  ```javascript
  $gameQuests.hasIndicatorForPlanet(planet.dbId)
  ```
* **Effet visuel** : Une balise pulsée orbite au-dessus de la planète cible dans le plan écliptique 2D.
* Dès que le joueur s'approche et se met en orbite stationnaire autour de cette planète, l'option d'entrer dans le sous-système devient disponible.

### 3.3 Niveau 3 : Échelle du Sous-Système (Points d'Intérêt / POIs)
* **Scène** : `Scene_SubsystemTravel`
* **Méthode d'interrogation** :
  ```javascript
  $gameQuests.hasIndicatorForPoi(poi.id)
  ```
* **Effet visuel** : La balise est placée exactement sur le Point d'Intérêt à la surface de la planète zoomée.
* Comme la planète tourne en continu sur elle-même, la balise de quête suit la rotation physique solidaire du POI.

### 3.4 Intégration Visuelle : Masquage des Doublons & Volet d'Infos
Pour garantir une interface épurée et professionnelle :
1. **Pas de superposition d'icônes** : Si `hasIndicatorForPoi(poi.id)` est vrai, l'icône standard du POI (`mapIcon_alert`) est **automatiquement masquée**, laissant uniquement la balise de quête animée.
2. **Mise en avant textuelle** : Dans `Window_SpaceTargetInfo`, le volet d'information affiche le titre de la quête et l'objectif en surbrillance dorée avec le symbole `[!] MISSION : Nom de l'objectif`.

---

## 4. StoryManager & Déclencheurs Temporels (`$gameDate`)

Le composant `$storyManager` agit comme un maître du jeu événementiel :

### 4.1 Déclenchement Automatisé par Timestamp
Dans `Game_Date.prototype.onTimeChanged()` (ou à chaque minute franchie) :
```javascript
window.$storyManager.update();
```
Le gestionnaire vérifie toutes les quêtes non encore commencées. Si :
$$\$gameDate.\text{timestamp} \ge \text{quest.triggerTimestamp}$$
Alors la quête est automatiquement activée :
```javascript
quest.activate();
```

### 4.2 Transmissions & Alertes au Terminal CRT de Vol
Au moment du déclenchement, les messages définis dans `alertTxt` sont automatiquement acheminés vers le terminal de vol du vaisseau (`Window_SpaceEventLog`) via `$systemMapManager.log()` :
* Style `"alert"` : Texte clignotant avec signal audio d'alerte.
* Style `"basicInfos"` : Rapport de triangulation ou coordonnées tactiques.
* Style `"infos"` : Ordres de mission ou consignes de l'Amirauté.

Le joueur, même en plein vol spatial, voit son écran CRT afficher en temps réel la transmission interceptée.

---

## 5. Recettes Développeur : Création & Intégration

### 5.1 Créer une Quête Principale avec Message Radio
Ouvrir `data/SC/QUESTS.json` et ajouter :
```json
{
  "id": 1,
  "name": "Ravitaillement de la Toundra",
  "description": "Apporter du plasma purifié au Bastion Omega sur Wanghek.",
  "iconName": "mapIcon_qust",
  "triggerTimestamp": 55657700,
  "active": false,
  "alertTxt": [
    {
      "style": "alert",
      "txt": "COMMUNICATION PRIORITAIRE : Bastion Omega en pénurie de fuel !"
    }
  ],
  "locations": [
    {
      "id": "loc_bastion_delivery",
      "name": "Livraison au Bastion Omega",
      "description": "Débarquer au spatioport militaire et livrer les conteneurs.",
      "sectorId": 0,
      "systemId": 0,
      "planetId": 5,
      "poiId": "wanghek_bastion",
      "active": true,
      "completed": false
    }
  ]
}
```

---

### 5.2 Ajouter des Objectifs Multiples & Séquentiels
Pour créer une quête en plusieurs étapes (ex: étape 1 sur Ankaros Prime, puis étape 2 dans le Vortex) :
1. Déclarer les deux étapes dans le tableau `locations` de la quête :
   * Étape 1 avec `"active": true`.
   * Étape 2 avec `"active": false`.
2. Lorsque le joueur termine l'étape 1 (via script ou événement RMMZ) :
```javascript
const quest = $gameQuests.quest(1);
if (quest) {
    // 1. Terminer l'étape 1
    const step1 = quest.location("loc_prime_meeting");
    if (step1) step1.complete();

    // 2. Activer l'étape 2 (qui affiche sa balise sur la planète 2)
    const step2 = quest.location("loc_vortex_investigation");
    if (step2) step2.activate();
}
```

---

### 5.3 Valider une Étape de Quête depuis un Événement Carte
Lorsque le joueur a atterri sur le POI via le Hangar et parle au PNJ responsable de la quête sur la carte RMMZ :
Dans la commande d'événement RMMZ **"Insérer un script"** :
```javascript
// Valider l'objectif
const quest = $gameQuests.quest(0);
if (quest) {
    const loc = quest.location("loc_prime_spaceport");
    if (loc) {
        loc.complete();
        $gameMessage.add("Objectif accompli : Vous avez remis le message.");
    }
}
```
Si tous les objectifs de la quête sont terminés, valider la quête globale :
```javascript
quest.complete();
SoundManager.playShop();
$gameMessage.add("\\C[14]MISSION ACCOMPLIE : " + quest.name + "\\C[0]");
```

---

---

## 6. Livre de Quêtes & Interface Datapad (`Scene_QuestBook`)

Le module fournit une interface complète de type **Datapad / Registre des Missions**, inspirée de l'esthétique sci-fi / Warhammer 40K de SimCraft 4.

```
┌────────────────────────────────────────────────────────────────────────┐
│ DATAPAD IMPÉRIAL ▷ REGISTRE DES MISSIONS             2.140.55657.M41 │
├─────────────────────────┬──────────────────────────────────────────────┤
│ [En cours] [Terminées]  │ Signal Astropathique Impérial                │
│                         │ [ EN COURS D'EXÉCUTION ]     Horloge: 2.1... │
│ ◈ Signal Astropathique  │ ─────────────────────────────────────────── │
│   1/2 obj.              │ ◈ ORDRES DE MISSION & BRIEFING TACTIQUE     │
│                         │ Une balise de détresse de la Flotte a été... │
│ ✔ Ravitaillement Toundra│                                              │
│   1/1 obj.              │ ◈ COMMUNICATIONS ASTROPATHIQUES & LOGS      │
│                         │ ▶ ALERTE RADIO : Message intercepté !       │
│                         │                                              │
│                         │ ◈ OBJECTIFS TACTIQUES & GÉOLOCALISATION     │
│                         │ [► EN COURS] Spatioport Magellan             │
│                         │ Retrouver l'émissaire impérial aux quais.    │
│                         │ 📍 Secteur Calixis ▹ Ankaros ▹ Magellan     │
└─────────────────────────┴──────────────────────────────────────────────┘
```

### 6.1 Fonctionnalités Clés
* **En-tête dynamique** : Affichage permanent du titre et de la date 40K (`$gameDate`).
* **Filtres rapides** : Onglets "En cours (N)", "Terminées (N)", et "Toutes (N)" (sélectionnables à la souris ou avec les flèches gauche/droite `◀ / ▶`).
* **Liste de quêtes** : Puces de statut (`◈` en cours, `✔` complétée, `○` en attente), titre et décompte d'objectifs accomplis.
* **Fiche détaillée à défilement fluide** : Briefing textuel automatique avec retour à la ligne, encadré des alertes radio CRT et liste des objectifs avec localisation hiérarchique détaillée (`Secteur ▹ Système ▹ Planète ▹ POI`).
* **Fermeture instantanée** : Échap, Annuler ou Clic Droit retourne immédiatement à la scène précédente (carte ou cockpit).

### 6.2 Comment l'ouvrir depuis un Événement RMMZ

#### Option A : Appel par Script (Recommandé)
Dans une commande d'événement **"Insérer un script"** :
```javascript
SC4.openQuestBook();
// ou :
SceneManager.openQuestBook();
```

#### Option B : Commande de Plugin RMMZ
Dans la commande d'événement **"Commande du Plugin"** :
* **Nom du plugin** : `SC4_QuestManager`
* **Nom de la commande** : `openQuestBook`

---

## 7. API Complète & Commandes Scriptables

### Accès Rapide au Livre de Quêtes
```javascript
// Ouvre directement le Datapad / Livre de quêtes
SC4.openQuestBook();
```

### Interrogation des Quêtes (`$gameQuests`)
```javascript
// Obtenir la liste de toutes les quêtes actives
const activeQuests = $gameQuests.activeQuests();

// Récupérer une quête spécifique par ID
const quest = $gameQuests.quest(0);
const isEnCours = quest.active;
const isFinie = quest.completed;

// Vérifier la présence d'une balise sur un niveau spatial
const aSurEtoile   = $gameQuests.hasIndicatorForSystem(0);
const aSurPlanete  = $gameQuests.hasIndicatorForPlanet(4);
const aSurPoi      = $gameQuests.hasIndicatorForPoi("prime_spatioport");

// Récupérer la liste des objectifs actifs pour un POI donné
const list = $gameQuests.getIndicatorsForPoi("prime_spatioport");
list.forEach(item => {
    console.log(item.quest.name, item.location.name);
});
```

### Manipulation des Objectifs (`Game_QuestLocation`)
```javascript
const loc = $gameQuests.quest(0).location("loc_prime_spaceport");

loc.activate();   // Active la balise et l'objectif
loc.deactivate(); // Masque la balise
loc.complete();   // Marque l'objectif comme terminé
```

### Déclenchement Forcé via StoryManager (`$storyManager`)
```javascript
// Forcer le déclenchement immédiat d'une quête sans attendre son triggerTimestamp
$storyManager.startQuest(1);
```

---

## 8. Liens & Documentation Connexe

* 🚀 [**Tutoriel Navigation Spatiale & Simulation (SC4)**](./TUTORIAL_SPACE_TRAVEL.md) : Tout sur les systèmes solaires, la navigation libre, les sauts Warp le long des constellations, la vue sous-système et l'atterrissage depuis le hangar.
* 🌐 [**Tutoriel Système de Localisation**](./TUTORIAL_LOCALIZATION.md) : Intégration des balises `\L[KEY]` dans les noms et descriptions de quêtes pour le support bilingue FR/EN.
* 🎒 [**Tutoriel Conteneurs & Multi-Inventaires**](./TUTORIAL_CONTAINERS_INVENTORIES.md) : Gestion des soutes de stockage et cargaisons de quête.
