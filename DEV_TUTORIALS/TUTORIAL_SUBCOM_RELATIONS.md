# 📡 TUTORIEL DÉVELOPPEUR : SUBCOM TEMPS RÉEL & RELATIONS SOCIALES (SC4)

> **SimCraft Engine V2 (SC4)**  
> **Composants clés** :
> - **Relations** : [`SC4_Game_ScActorSocial.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Game_ScActorSocial.js), [`SC4_RelationManager.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_RelationManager.js), [`SC4_Game_Relation.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Game_Relation.js), [`SC4_SubScene_RelationDialog.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_SubScene_RelationDialog.js)
> - **HUDs Sociaux** : [`SC4_Sprite_PlayerRelationHud.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Sprite_PlayerRelationHud.js), [`SC4_Sprite_InterlocutorHUD.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Sprite_InterlocutorHUD.js)
> - **SubCom & Terminal** : [`SC4_Game_ScActorSubCom.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Game_ScActorSubCom.js), [`SC4_SubComManager.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_SubComManager.js), [`SC4_GuiManager.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_GuiManager.js), [`SC4_SubScene_Subcom.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_SubScene_Subcom.js), [`SC4_SubScene_SubcomDialog.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_SubScene_SubcomDialog.js), [`SC4_SubComHologramFilter.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_SubComHologramFilter.js)

---

## 💬 1. Référentiel Relationnel Pur (`actor.social._opinions`)

### A. Orientation Stricte des Opinions (`opinionFrom`)
Le registre global `$gameRelations` a été supprimé : chaque acteur héberge désormais localement les sentiments portés envers lui dans son sous-composant lazy-loaded `actor.social._opinions` (`WeakMap` vers son parent `Game_ScActor`).

* **`subjectActor.social.opinionFrom(holderActorId)`** désigne :  
  *« L'opinion que `holderActorId` (détenteur) porte envers `subjectActor` (sujet évalué). »*
* Exemple : `leader.social.opinionFrom(51)` représente ce que l'acteur `51` pense du joueur.
* **`subjectActor.social.hasOpinionFrom(holderActorId)`** vérifie l'existence sans instancier d'entrée.

### B. Façade `$relationManager`
| Méthode | Rôle |
| :--- | :--- |
| `$relationManager.getOpinionToSubjectFromHolder(subjectId, holderId)` | Lit ou instancie l'opinion de `holderId` envers `subjectId`. |
| `$relationManager.getRelationWithPlayer(npcId)` | Récupère l'opinion du PNJ envers le leader actif ; au 1er contact, initialise l'affinité depuis la faction du PNJ (`$gameFactions.affinity(factionId)`). |
| `$relationManager.getPlayerOpinions()` | Retourne `leader.social.allOpinions()` pour le Carnet Diplomatique. |
| `$relationManager.allActiveRelations()` | Collecte les relations déjà instanciées sans déclencher de lazy-loading sur les autres acteurs. |
| `$relationManager.openRelationDialog(actorId, eventId, modeOrOptions)` | Synchronise `$guiManager.setBubbleMode(mode)` puis ouvre [`SubScene_RelationDialog`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_SubScene_RelationDialog.js). |

### C. HUDs Sociaux & Ordre Z (`Scene_Map.addHudChild`)
* Tous les HUDs carte (`Sprite_PlayerHUD`, `Sprite_PlayerRelationHud`, `Sprite_InterlocutorHUD`, `Sprite_SubcomHUD`, `Sprite_WeaponHUD`) sont insérés **avant `_windowLayer`** via `Scene_Map.addHudChild()`, garantissant que les bulles et menus restent toujours au premier plan.
* **[`Sprite_PlayerRelationHud`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Sprite_PlayerRelationHud.js)** : positionné 16 px à droite du `PlayerHUD` avec repli sûr vers `banner_blank`.
* **[`Sprite_InterlocutorHUD`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Sprite_InterlocutorHUD.js)** : affiché en haut à droite (`260×260`). Affiche statut, affinité (6 cœurs/éclairs), obéissance, menace et barre d'agacement sans valeur numérique ; gère l'affichage anonyme **`"Signal Masqué"`** si l'interlocuteur SubCom est masqué.

---

## 📡 2. Système SubCom Temps Réel (`$subComManager` & `Game_ScActorSubCom`)

Le SubCom est un **outil de communication live** (et non une simple boîte mail) raccordé à l'horloge galactique `$gameDate.timestamp`.

### A. Profil Communication d'Acteur (`actor.subCom`)
Instancié en lazy-loading sur `Game_ScActor` via [`SC4_Game_ScActorSubCom.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Game_ScActorSubCom.js) (`0` contact initial) :
* `actor.subCom.contacts()` : renvoie la liste d'IDs enregistrés après purge automatique des acteurs décédés (`pruneDeadContacts()`).
* `actor.subCom.addContact(targetActorId)` / `removeContact(id)` / `hasContact(id)`.
* `actor.subCom.availableForSubComCall()` / `setAvailableForSubComCall(bool)` (`true` par défaut).
* `actor.subCom.canBeCalledByPlayer()` : retourne `false` si l'acteur est décédé, indisponible, membre du groupe actif (`$gameParty.allMembers()`) ou physiquement présent sur la carte courante (`isPresentNearPlayer()`).
* **Recrutement automatique** : `Game_Party.prototype.addActor` ajoute mutuellement les contacts SubCom entre le nouvel équipier et les membres existants.

### B. Envoyer un Appel Entrant (`$subComManager.pushCall`)
```javascript
const now = $gameDate.timestamp;
$subComManager.pushCall({
    actorId: 51,                      // ID de l'acteur appelant (obligatoire)
    startTimestamp: now + 3,          // Défaut : $gameDate.timestamp
    limitTimestamp: now + 120,        // Défaut : null (illimité tant que non répondu/rejeté)
    blocksNavigation: true,           // Verrouille "Navigation Stellaire" dans BridgeConsole
    masked: false,                    // true => portrait & nom masqués ("Signal Masqué")
    maskedLabel: "Signal Crypté",     // Optionnel : libellé custom si masked = true
    revealOnAnswer: true,             // true => démasque dès le décroché
    eventId: null,                    // Optionnel : événement carte cible
    options: null                     // Optionnel : options transmises à SubScene_SubcomDialog
}, "recallAt-1hr");                   // Clé sérialisable en cas d'appel manqué / rejeté
```

### C. Règles du Gestionnaire (`$subComManager`)
* **Appel actif unique (`_activeCall`)** : si aucun appel n'est en cours, le plus ancien appel prêt (`startTimestamp <= now`) devient `_activeCall`.
* **Fusion d'appels prêts** : un `pushCall()` pour un `actorId` déjà actif ou prêt (`startTimestamp <= now`) fusionne avec l'entrée existante au lieu de la dupliquer.
* **Callbacks sérialisables (`checkCallback`)** : **jamais de fonction JS brute**. Utiliser une clé chaîne, notamment :
  * `"recallAt-500"` (minutes virtuelles)
  * `"recallAt-4hr"` (heures virtuelles)
  * `"recallAt-2jr"` (jours virtuels)
  * `"recallAt-1dec"` (décades)
* **Journal des Appels Manqués (`_missedCalls`)** : conservé à 20 entrées maximum (`{ actorId, timestamp, see, masked, maskedLabel }`), groupées par interlocuteur dans [`Window_SubcomMissedList`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Window_SubcomMissedList.js).
* **Démasquage en cours d'échange** : `$subComManager.revealCaller(actorId)` lève le masque sur l'appel actif/en cours et l'historique des manqués, puis enregistre le contact dans le carnet du leader.
* **Audio discret** : `Ship_msg` n'est joué à l'activation d'un appel que si le joueur se trouve sur la carte de son propre vaisseau (`isPlayerOnOwnShipMap()`).
* **Purge des morts (`pruneDeadActors`)** : supprime les acteurs décédés des files d'appels et carnets de contacts à chaque mise à jour sur `Scene_Map`.

---

## 🖥️ 3. Contrôle HUD (`$guiManager`), Terminal `900×420` & Shader Hologramme

### A. Verrouillage Navigation & Visibilité (`$guiManager`)
Persistant dans les sauvegardes via [`SC4_DataManager.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_DataManager.js) (`contents.guiManager` et `contents.subComManager`, sans toucher à `$gameSystem`) :
```javascript
// Verrouiller manuellement la commande "Navigation Stellaire" de la BridgeConsole :
$guiManager.lockNavigation("incoming_priority_call");
$guiManager.unlockNavigation();
```
*(La console bloque aussi automatiquement la navigation tant qu'un appel actif/prêt porte `blocksNavigation: true`.)*

### B. Disposition du Terminal SubCom (`SubScene_Subcom` — `900×420`)
Aligné à l'emplacement exact du pupitre de passerelle ([`SC4_SubScene_Subcom.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_SubScene_Subcom.js)) :
* **Haut-Gauche (`420×210`)** : [`Sprite_SubcomHUD`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Sprite_SubcomHUD.js) (`$guiManager.isSubComActive`) + [`Window_SubcomMissedList`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Window_SubcomMissedList.js) (overlay transparent purement passif sans curseur ni capture de clic).
* **Bas-Gauche (`420×202`)** : [`Window_SubcomContactCommand`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Window_SubcomContactCommand.js) (toujours visible ; activé lors du choix *Appeler*, avec contacts injoignables grisés).
* **Droite (`460×420`)** : [`Window_SubcomCommand`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Window_SubcomCommand.js) (*Répondre*, *Rejeter*, *Appeler*, *Quitter*).
* **Échange (`SubScene_SubcomDialog`)** : sous-classe de [`SubScene_RelationDialog`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_SubScene_RelationDialog.js) forçant `mode = 1`, remplaçant *Quitter* par *Raccrocher* (`📴 \L[subcom.cmd_hangup]`) et appelant `$subComManager.endActiveDialog()` à la fermeture pour revenir proprement sur `SubScene_Subcom`.

### C. Conventions WebGL PixiJS v5 (`SubComHologramFilter`)
[`SC4_SubComHologramFilter.js`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_SubComHologramFilter.js) applique scanlines CRT, séparation chromatique, micro-jitter horizontal et ligne de balayage sur le faceset de [`Sprite_InterlocutorHUD`](file:///c:/SERVER/htdocs/SimCraft/SC4/js/plugins/SC4_Sprite_InterlocutorHUD.js) lorsque `$guiManager.bubbleMode === 1`.

> [!IMPORTANT]
> **Règles WebGL / GLSL ES 1.00 obligatoires pour les filtres PixiJS v5 :**
> 1. Le vertex shader par défaut de PixiJS v5 déclare `inputSize` et `outputFrame` en **`highp`** : tout fragment shader custom doit impérativement aligner la précision avec `#ifdef GL_FRAGMENT_PRECISION_HIGH` (`precision highp float; uniform highp vec4 inputSize; uniform highp vec4 outputFrame;`) sous peine d'erreur `Precisions of uniform 'inputSize' differ between VERTEX and FRAGMENT shaders`.
> 2. Éviter `pow(delta, 2.0)` lorsque `delta` peut être négatif (préférer `delta * delta`).
> 3. N'attacher le filtre au sprite qu'une fois `bitmap.isReady() && !bitmap.isError()` vérifié (`syncHologramFilter()`) afin d'éviter de filtrer un bitmap asynchrone `0×0`.

---

## 🧪 4. Tests Unitaires Associés
```bash
node UNIT_TESTS/test_relationship_system.js
node UNIT_TESTS/test_step2_subcom_ui.js
node UNIT_TESTS/test_step3_subcom_visual_mode.js
node UNIT_TESTS/test_step4_subcom_system.js
```
