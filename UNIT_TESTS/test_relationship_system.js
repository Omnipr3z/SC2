//=============================================================================
// SimCraft 4 - Unit Tests : Système de Relations (V1 MVP Architecture)
// test_relationship_system.js
//=============================================================================

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("==============================================================");
console.log("   TEST: Système de Relations (actor.social._opinions, Fail-Fast) ");
console.log("==============================================================");

// 1. Mocks de l'environnement RMMZ / SC4
global.window = global;
global.DEBUGTOOL = { log: () => {}, warn: () => {}, error: () => {} };
global.DataManager = {
    loadDatabase: () => {},
    isDatabaseLoaded: () => true,
    createGameObjects: () => {},
    makeSaveContents: () => ({}),
    extractSaveContents: () => {},
    onLoad: () => {}
};
global.$dataActors = [
    null,
    { id: 1, name: "Capitaine Harlock", note: "<Hero>", meta: {} },
    { id: 2, name: "Soldat Fédéral", note: "<factionId: 1>", meta: { factionId: 1 } },
    { id: 3, name: "Contrebandier Saurien", note: "<factionId: 3>", meta: { factionId: 3 } },
    { id: 4, name: "Garde Intimidé", note: "", meta: {} },
    { id: 5, name: "Corsaire Hostile", note: "", meta: {} }
];
global.$dataActors[10] = { id: 10, name: "Informateur", meta: {} };
for (let i = 20; i < 30; i++) {
    global.$dataActors[i] = { id: i, name: `PNJ Batch #${i}`, meta: {} };
}

global.$gameParty = {
    leader: () => ({ actorId: () => 1 })
};

global.$gameFactions = {
    affinity: (id) => (id === 1 ? 25 : (id === 3 ? -15 : 0)),
    changeAffinity: () => {},
    faction: (id) => ({ id, name: id === 1 ? "Fédération" : "Faction #" + id, affinity: (id === 1 ? 25 : 0), powerBalance: 50, description: "Faction galactique" }),
    all: () => [
        { id: 1, name: "Fédération", affinity: 25, powerBalance: 50, description: "Union des mondes libres" }
    ]
};

global.$gameDate = {
    timestamp: 1000000
};

global.$gameSelfSwitches = {
    _data: {},
    setValue: function(key, val) { this._data[key.join(",")] = val; },
    value: function(key) { return !!this._data[key.join(",")]; }
};

global.$gameMessage = {
    _texts: [],
    add: function(text) { this._texts.push(text); },
    clear: function() { this._texts = []; }
};

// Mocks UI RMMZ
global.Graphics = { boxWidth: 1280, boxHeight: 720, width: 1280, height: 720 };
global.Rectangle = class {
    constructor(x, y, width, height) {
        this.x = x || 0;
        this.y = y || 0;
        this.width = width || 0;
        this.height = height || 0;
    }
};
global.ColorManager = {
    normalColor: () => "#ffffff",
    systemColor: () => "#88aaff"
};
global.Window_Base = class {
    constructor(rect) {
        this.x = rect ? rect.x : 0;
        this.y = rect ? rect.y : 0;
        this.width = rect ? rect.width : 0;
        this.height = rect ? rect.height : 0;
        this.contents = { clear: () => {}, drawText: () => {}, fillRect: () => {} };
    }
    get innerWidth() { return this.width - 24; }
    get innerHeight() { return this.height - 24; }
    changeTextColor() {}
    drawText() {}
};
global.Window_Selectable = class extends global.Window_Base {
    constructor(rect) {
        super(rect);
        this._index = -1;
        this._handlers = {};
    }
    select(i) { this._index = i; }
    index() { return this._index; }
    setHandler(sym, fn) { this._handlers[sym] = fn; }
    refresh() {}
    activate() {}
    itemRect(i) { return new global.Rectangle(0, i * 36, this.width, 36); }
};
global.Window_Command = class extends global.Window_Selectable {
    constructor(rect) {
        super(rect);
        this._list = [];
    }
    addCommand(name, symbol, enabled = true, ext = null) {
        this._list.push({ name, symbol, enabled, ext });
    }
};
global.Scene_Base = class {
    constructor() { this._windows = []; }
    addWindow(w) { this._windows.push(w); }
    create() {}
    start() {}
    update() {}
    stop() {}
    terminate() {}
};
global.Scene_MenuBase = class extends global.Scene_Base {
    mainAreaTop() { return 70; }
    popScene() {}
};
global.SubScene_Base = class extends global.Scene_Base {
    constructor(parentScene) {
        super();
        this._parentScene = parentScene;
        this._active = false;
        this._closing = false;
        this._windows = [];
    }
    isActive() { return !!this._active; }
    start() { this._active = true; }
    isClosing() { return !!this._closing; }
    close() { this._closing = true; this._active = false; }
    update() {
        if (!this.isActive()) return;
        this.updateMain();
    }
    updateMain() {}
};

// 2. Chargement des modules du système de relations (sans SC4_Game_Relations purgé)
const Game_Relation = require("../js/plugins/SC4_Game_Relation");
const Game_ScActorSocial = require("../js/plugins/SC4_Game_ScActorSocial");
const RelationManager = require("../js/plugins/SC4_RelationManager");
const Game_InteractionBase = require("../js/plugins/SC4_Game_InteractionBase");
const Game_ReactionBase = require("../js/plugins/SC4_Game_ReactionBase");
const Game_ReactionChat = require("../js/plugins/SC4_Game_ReactionChat");
const Game_InteractionChat = require("../js/plugins/SC4_Game_InteractionChat");
const RelationDialogManager = require("../js/plugins/SC4_RelationDialogManager");

// Fenêtres et Scènes
const Window_RelationStatus = require("../js/plugins/SC4_Window_RelationStatus");
const Window_InteractionCommand = require("../js/plugins/SC4_Window_InteractionCommand");
const Window_FactionInfo = require("../js/plugins/SC4_Window_FactionInfo");
const Window_FactionStatus = require("../js/plugins/SC4_Window_FactionStatus");
const Window_RelationList = require("../js/plugins/SC4_Window_RelationList");
const SubScene_RelationDialog = require("../js/plugins/SC4_SubScene_RelationDialog");
const Scene_MenuRelations = require("../js/plugins/SC4_Scene_MenuRelations");

global.Window_RelationStatus = Window_RelationStatus;
global.Window_InteractionCommand = Window_InteractionCommand;
global.Window_FactionInfo = Window_FactionInfo;
global.Window_FactionStatus = Window_FactionStatus;
global.Window_RelationList = Window_RelationList;
global.SubScene_RelationDialog = SubScene_RelationDialog;
global.Scene_MenuRelations = Scene_MenuRelations;

// Exposer globalement pour le runtime
global.Game_Relation = Game_Relation;
global.Game_ScActorSocial = Game_ScActorSocial;
global.RelationManager = RelationManager;
global.Game_InteractionBase = Game_InteractionBase;
global.Game_ReactionBase = Game_ReactionBase;
global.Game_ReactionChat = Game_ReactionChat;
global.Game_InteractionChat = Game_InteractionChat;
global.RelationDialogManager = RelationDialogManager;

// Modèle Game_Actors conforme RMMZ (_data[]) + lazy-loading de Game_ScActorSocial
global.Game_Actors = class Game_Actors {
    constructor() {
        this._data = [];
    }
    actor(id) {
        if (!global.$dataActors[id]) return null;
        if (!this._data[id]) {
            const def = global.$dataActors[id];
            const instanceMeta = {};
            if (def.meta) {
                for (const [k, v] of Object.entries(def.meta)) {
                    instanceMeta[k.toLowerCase()] = v;
                }
            }
            const actorObj = {
                _actorId: id,
                _states: [],
                _meta: instanceMeta,
                _social: null,
                actorId: () => id,
                actor: () => def,
                name: () => def.name,
                states: function() { return this._states; },
                addState: function(stId) { this._states.push({ id: stId }); },
                removeState: function(stId) { this._states = this._states.filter(s => s.id !== stId); },
                hasSocial: function() { return Boolean(this._social); },
                meta: function(key, defaultValue = null) {
                    const k = String(key).trim().toLowerCase();
                    return this._meta[k] !== undefined ? this._meta[k] : defaultValue;
                },
                setMeta: function(key, val) {
                    const k = String(key).trim().toLowerCase();
                    this._meta[k] = val;
                },
                makeSavefileData: function() {
                    const data = { actorId: this._actorId, meta: this._meta };
                    if (this._social) data.social = this._social.makeSavefileData();
                    return data;
                },
                loadSavefileData: function(data) {
                    if (!data) return;
                    if (data.meta) Object.assign(this._meta, data.meta);
                    if (data.social) this.social.loadSavefileData(data.social);
                }
            };
            Object.defineProperty(actorObj, "social", {
                get() {
                    if (!this._social) {
                        this._social = new Game_ScActorSocial(this);
                    }
                    return this._social;
                }
            });
            this._data[id] = actorObj;
        }
        return this._data[id];
    }
    makeSavefileData() {
        const result = {};
        for (let i = 1; i < this._data.length; i++) {
            const actor = this._data[i];
            if (actor && typeof actor.makeSavefileData === "function") {
                result[i] = actor.makeSavefileData();
            }
        }
        return result;
    }
    loadSavefileData(data) {
        if (!data || typeof data !== "object") return;
        for (const [idStr, actorData] of Object.entries(data)) {
            const id = parseInt(idStr, 10);
            if (id > 0) {
                const actor = this.actor(id);
                if (actor) actor.loadSavefileData(actorData);
            }
        }
    }
};

// Initialiser les instances globales
global.$gameActors = new Game_Actors();
global.$relationManager = new RelationManager();
global.$relationDialogManager = new RelationDialogManager();

// ============================================================================
// TEST 1: Modèle Game_Relation (sans getter obsolète .key)
// ============================================================================
console.log("➡️ Test 1: Modèle unitaire Game_Relation...");
const rel1 = new Game_Relation({ actorId1: 1, actorId2: 4, affinity: 15, threat: 30, notoriety: 2 });
assert.strictEqual(rel1.actorId1, 1);
assert.strictEqual(rel1.actorId2, 4);
assert.strictEqual(typeof rel1.key, "undefined", "Fail Fast : Game_Relation.key doit être supprimé");
assert.strictEqual(rel1.affinity, 15);
assert.strictEqual(rel1.threat, 30);
assert.strictEqual(rel1.notoriety, 2);

// Obéissance = Affinité + (Menace * Notoriété * facteurAléatoire)
// 15 + (30 * 2 * 0.5) = 15 + 30 = 45
assert.strictEqual(rel1.calculateObedience(0.5), 45, "Calcul d'obéissance incorrect");

// Paliers Umbral
rel1.affinity = 60;
assert.strictEqual(rel1.getAffinityBracket(), "friendly");
assert.strictEqual(rel1.reactionThreshold(), "respect");

rel1.affinity = -80;
assert.strictEqual(rel1.getAffinityBracket(), "total_hate");
assert.strictEqual(rel1.reactionThreshold(), "total_hostility");

rel1.affinity = 0;
assert.strictEqual(rel1.getAffinityBracket(), "neutral");
assert.strictEqual(rel1.reactionThreshold(), "neutrality");

// Cooldowns
assert.strictEqual(rel1.canInteract("chat", 1000, 3600), true);
rel1.recordInteraction("chat", 1000);
assert.strictEqual(rel1.canInteract("chat", 2000, 3600), false, "Le cooldown doit bloquer avant 3600s");
assert.strictEqual(rel1.canInteract("chat", 5000, 3600), true, "Le cooldown doit autoriser après 3600s (delta 4000s)");

// Sauvegarde / Restauration
const saveData = rel1.makeSavefileData();
const relRestored = new Game_Relation();
relRestored.loadSavefileData(saveData);
assert.strictEqual(relRestored.actorId1, 1);
assert.strictEqual(relRestored.actorId2, 4);
assert.strictEqual(relRestored.affinity, 0);
assert.strictEqual(relRestored.threat, 30);
console.log("   ✅ Game_Relation validé.");

// ============================================================================
// TEST 2: Orientation actor.social.opinionFrom & Purge de $gameRelations
// ============================================================================
console.log("➡️ Test 2: Orientation actor.social.opinionFrom & Purge $gameRelations...");
assert.strictEqual(
    fs.existsSync(path.resolve(__dirname, "../js/plugins/SC4_Game_Relations.js")),
    false,
    "SC4_Game_Relations.js doit être physiquement supprimé"
);
assert.strictEqual(typeof global.$gameRelations, "undefined", "$gameRelations ne doit plus exister");
assert.strictEqual(typeof global.$relationManager.getRelation, "undefined", "Fail Fast : getRelation doit être supprimé");
assert.strictEqual(typeof global.$relationManager._actorFactions, "undefined", "Fail Fast : _actorFactions doit être supprimé");

const actor1 = global.$gameActors.actor(1);
const actor2 = global.$gameActors.actor(2);

assert.strictEqual(actor1.social.hasOpinionFrom(2), false, "Aucune opinion enregistrée initialement");
const opFrom2 = actor1.social.opinionFrom(2);
assert.ok(opFrom2 instanceof Game_Relation, "opinionFrom(2) doit retourner un Game_Relation");
assert.strictEqual(opFrom2.actorId1, 1, "actorId1 = sujet évalué (acteur 1 / Mosay)");
assert.strictEqual(opFrom2.actorId2, 2, "actorId2 = détenteur de l'opinion (acteur 2)");
assert.strictEqual(actor1.social.hasOpinionFrom(2), true);
assert.strictEqual(actor2.social.hasOpinionFrom(1), false, "Orientation stricte : l'opinion de 2 envers 1 est stockée sur 1, pas sur 2");

opFrom2.affinity = 35;
assert.strictEqual(actor1.social.opinionFrom(2).affinity, 35, "Référence conservée dans actor1.social._opinions[2]");
assert.strictEqual(typeof actor1.social.opinionOf, "undefined", "Fail Fast : opinionOf doit être supprimé");
assert.strictEqual(typeof actor1.social.relationWith, "undefined", "Fail Fast : relationWith doit être supprimé");
console.log("   ✅ Orientation opinionFrom & Purge Fail-Fast validées.");

// ============================================================================
// TEST 3: RelationManager (getOpinionToSubjectFromHolder, Héritage Faction & Temps)
// ============================================================================
console.log("➡️ Test 3: RelationManager (Héritage Faction & Horloge)...");
global.$gameActors = new Game_Actors();
const manager = new RelationManager();
global.$relationManager = manager;

// Lazy-loading préservé par hasOpinionToSubjectFromHolder
const actor4Check = global.$gameActors.actor(4);
assert.strictEqual(manager.hasOpinionToSubjectFromHolder(4, 1), false);
assert.strictEqual(actor4Check.hasSocial(), false, "hasOpinionToSubjectFromHolder ne doit pas instancier .social");

// Acteur 2 a la faction 1 (affinité Faction envers le joueur = +25)
const relActor2 = manager.getRelationWithPlayer(2);
assert.strictEqual(relActor2.actorId1, 1, "getRelationWithPlayer doit cibler le leader (1) comme sujet");
assert.strictEqual(relActor2.actorId2, 2, "getRelationWithPlayer doit placer l'interlocuteur (2) en détenteur");
assert.strictEqual(relActor2.affinity, 25, "L'acteur 2 doit hériter de l'affinité de sa faction (+25)");
assert.strictEqual(manager.getOpinionToSubjectFromHolder(1, 2), relActor2, "getOpinionToSubjectFromHolder doit retourner exactement la même instance");

// Acteur 3 a la faction 3 (affinité Faction = -15)
const relActor3 = manager.getRelationWithPlayer(3);
assert.strictEqual(relActor3.affinity, -15, "L'acteur 3 doit hériter de l'affinité de sa faction (-15)");

// Vérifier setActorFactionId sans cache _actorFactions
manager.setActorFactionId(4, 3);
assert.strictEqual(manager.getActorFactionId(4), 3, "setActorFactionId doit persister uniquement sur actor.social");

// Érosion temporelle vers la base de faction du holder (rel.actorId2)
relActor2.affinity = 50; // Boosté artificiellement au-dessus de sa base de 25
manager._lastUpdateTimestamp = 1000000;
manager.update(1000000 + 86400 * 5); // 5 jours s'écoulent
assert.strictEqual(relActor2.affinity, 45, "L'affinité doit s'éroder de 5 points vers sa base de 25");

console.log("   ✅ RelationManager validé.");

// ============================================================================
// TEST 4: Interactions & Réactions (Game_InteractionChat & ReactionChat)
// ============================================================================
console.log("➡️ Test 4: Game_InteractionChat & Game_ReactionChat...");
const chat = new Game_InteractionChat(1, 2);
assert.strictEqual(chat.id, "chat");
assert.strictEqual(chat.name, "Discuter");

// Cas Amical (Affinité 45 >= Tranche respect)
const friendlyReaction = chat.calculateResult(relActor2, null, null);
assert.strictEqual(friendlyReaction.type, "friendly");
assert.strictEqual(friendlyReaction.affinityDelta, 3);
assert.strictEqual(friendlyReaction.isPositive(), true);

// Cas Hostile (Affinité -80)
const relHostile = new Game_Relation({ actorId1: 1, actorId2: 5, affinity: -80 });
const chatHostile = new Game_InteractionChat(1, 5);
const hostileReaction = chatHostile.calculateResult(relHostile, null, null);
assert.strictEqual(hostileReaction.type, "hostile");
assert.strictEqual(hostileReaction.affinityDelta, -2);
assert.strictEqual(hostileReaction.isHostile(), true);

// Cas d'un PNJ avec État Hostile explicite (State RMMZ)
const actorWithHostileState = {
    states: () => [{ meta: { hostile: true } }]
};
const forcedHostileReaction = chat.calculateResult(relActor2, null, actorWithHostileState);
assert.strictEqual(forcedHostileReaction.type, "hostile", "L'état Hostile RMMZ doit forcer une réaction hostile");

console.log("   ✅ Interactions et Réactions validées.");

// ============================================================================
// TEST 5: RelationDialogManager (Contrôleur de Flux Complet)
// ============================================================================
console.log("➡️ Test 5: RelationDialogManager (Flux Complet)...");
const dialogManager = new RelationDialogManager();
global.$relationDialogManager = dialogManager;

// Démarrage de l'échange avec l'acteur 2
const session = dialogManager.startExchange(2);
assert.ok(session.relation, "Une relation doit être retournée");
assert.ok(session.availableInteractions.includes("chat"), "L'action 'chat' doit être disponible");

// Sélection de l'interaction
const selected = dialogManager.selectInteraction("chat");
assert.strictEqual(selected.id, "chat");

// Résolution de la réaction
const initialAffinity = session.relation.affinity;
const reaction = dialogManager.executeCurrentInteraction();
assert.ok(reaction, "Une réaction doit être calculée");

// Confirmation et répercussion dans le monde
const success = dialogManager.confirmReaction();
assert.strictEqual(success, true);
assert.strictEqual(session.relation.affinity, initialAffinity + reaction.affinityDelta, "L'affinité doit être mise à jour");

console.log("   ✅ RelationDialogManager validé.");

// ============================================================================
// TEST 6: Intégration DataManager (Persistance via sc_actors uniquement)
// ============================================================================
console.log("➡️ Test 6: Intégration SC_DataManager...");
const SC_DataManager = require("../js/plugins/SC4_DataManager");
const saveContents = {};
SC_DataManager.makeSaveContents(saveContents);

assert.strictEqual(saveContents.sc_relations, undefined, "sc_relations ne doit plus figurer dans la sauvegarde");
assert.ok(saveContents.sc_actors, "sc_actors doit être dans le paquet de sauvegarde");
assert.ok(saveContents.sc_relationManager, "sc_relationManager doit être dans le paquet de sauvegarde");
assert.strictEqual(saveContents.sc_relationManager.actorFactions, undefined, "actorFactions ne doit plus figurer dans sc_relationManager");

// Réinitialisation complète et restauration
global.$gameActors = new Game_Actors();
global.$relationManager = new RelationManager();

SC_DataManager.extractSaveContents(JSON.parse(JSON.stringify(saveContents)));
assert.strictEqual(global.$relationManager.getActorFactionId(4), 3, "La faction modifiée sur l'acteur 4 doit être restaurée via sc_actors");
const restoredRel = global.$relationManager.getOpinionToSubjectFromHolder(1, 2);
assert.ok(restoredRel, "L'opinion portée par l'acteur 2 envers le joueur doit être restaurée");
assert.strictEqual(restoredRel.actorId1, 1);
assert.strictEqual(restoredRel.actorId2, 2);
assert.strictEqual(restoredRel.affinity, initialAffinity + reaction.affinityDelta, "L'affinité modifiée doit être restaurée fidèlement");

console.log("   ✅ SC_DataManager validé.");

// ============================================================================
// TEST 7: Vues et Scènes (Windows & SubScene / Scene_MenuRelations)
// ============================================================================
console.log("➡️ Test 7: Fenêtres & Scènes (MVC View / Controller)...");

// 1. Window_RelationStatus
const statusRect = new Rectangle(0, 0, 400, 160);
const winStatus = new Window_RelationStatus(statusRect);
winStatus.setRelation(restoredRel);
assert.strictEqual(winStatus.relation, restoredRel);
assert.ok(winStatus.titleRect());
assert.ok(winStatus.affinityRect());

// 2. Window_InteractionCommand
const cmdRect = new Rectangle(0, 0, 300, 140);
const winCmd = new Window_InteractionCommand(cmdRect);
winCmd.setAvailableInteractions(["chat"]);
assert.ok(winCmd._list.some(c => c.symbol === "chat"));
assert.ok(winCmd._list.some(c => c.symbol === "cancel"));

// 3. Window_FactionInfo
const fInfoRect = new Rectangle(0, 0, 260, 160);
const winFaction = new Window_FactionInfo(fInfoRect);
winFaction.setFaction(1, "Faction Test");
assert.strictEqual(winFaction._factionId, 1);
assert.ok(winFaction.headerRect());

// 4. Window_FactionStatus
const fStatusRect = new Rectangle(0, 0, 500, 200);
const winFactionStatus = new Window_FactionStatus(fStatusRect);
assert.ok(winFactionStatus);

// 5. Window_RelationList
const listRect = new Rectangle(0, 0, 300, 400);
const winList = new Window_RelationList(listRect);
assert.ok(winList.maxItems() >= 1, "La liste doit contenir au moins la relation enregistrée");
assert.ok(winList.item());

// 6. SubScene_RelationDialog avec targetEventId explicite
global.$gameMessage.clear();
const subScene = new SubScene_RelationDialog(null, 2, 7);
subScene.createDisplayObjects();
assert.strictEqual(subScene.targetActorId, 2, "targetActorId doit valoir 2");
assert.strictEqual(subScene.targetEventId, 7, "targetEventId explicite doit valoir 7");
assert.ok(subScene._playerFactionWindow, "La fenêtre de faction PJ doit être créée");
assert.ok(subScene._npcFactionWindow, "La fenêtre de faction PNJ doit être créée");
assert.ok(subScene._relationStatusWindow, "La fenêtre de statut relationnel doit être créée");
assert.ok(subScene._commandWindow, "La fenêtre de commandes d'interaction doit être créée");

// Test de l'action 'chat' sur la sous-scène : doit injecter \E[7] dans $gameMessage
const preAffinity = restoredRel.affinity;
subScene.onCommandChat();
assert.ok(restoredRel.affinity !== preAffinity || restoredRel._cooldowns.chat, "L'action 'chat' doit être exécutée");
assert.ok(global.$gameMessage._texts.some(t => t.includes("\\E[7]")), "Le message de réaction doit contenir le tag \\E[7]");

// Test de l'auto-détection via l'interpréteur RMMZ
global.$gameMap = {
    _interpreter: {
        eventId: () => 14
    }
};
const autoSubScene = new SubScene_RelationDialog(null, 2);
assert.strictEqual(autoSubScene.targetEventId, 14, "targetEventId doit auto-détecter l'événement 14 de l'interpréteur");

// Test du passage sous forme de tableau [actorId, eventId]
const arraySubScene = new SubScene_RelationDialog(null, [3, 21]);
assert.strictEqual(arraySubScene.targetActorId, 3, "targetActorId doit valoir 3");
assert.strictEqual(arraySubScene.targetEventId, 21, "targetEventId doit valoir 21");

// Fermeture de la sous-scène
subScene.onCommandCancel();
assert.strictEqual(subScene.isClosing(), true);

// 7. Scene_MenuRelations
const menuScene = new Scene_MenuRelations();
menuScene.create();
assert.ok(menuScene._listWindow, "Window_RelationList doit être instanciée dans la scène");
assert.ok(menuScene._statusWindow, "Window_RelationStatus doit être instanciée dans la scène");
assert.ok(menuScene._factionWindow, "Window_FactionInfo doit être instanciée dans la scène");
assert.ok(menuScene._globalFactionWindow, "Window_FactionStatus doit être instanciée dans la scène");

console.log("   ✅ Windows & Scènes validées.");

// ============================================================================
// TEST 8: Patience Sociale (The Sims), Seuil Boring & Simulation Étalée (Round-Robin)
// ============================================================================
console.log("➡️ Test 8: Patience Sociale, Seuil Boring & Simulation par Lot...");

// 1. Test Game_ReactionBase.shouldCloseScene
const closeReaction = new Game_ReactionBase({ shouldCloseScene: true });
assert.strictEqual(closeReaction.shouldCloseScene, true, "shouldCloseScene doit être true");

// 2. Test Game_ReactionChat.createBored
const boredReaction = Game_ReactionChat.createBored(2, "Assez parlé !", -1, true);
assert.strictEqual(boredReaction.type, "bored");
assert.strictEqual(boredReaction.affinityDelta, -1);
assert.strictEqual(boredReaction.shouldCloseScene, true);

// 3. Test Game_Relation Patience & Saturation
const now = global.$gameDate.timestamp;
const simRel = new Game_Relation({ actorId1: 1, actorId2: 10, patience: 100, lastPatienceTimestamp: now });
assert.strictEqual(simRel.patience, 100);
assert.strictEqual(simRel.isSaturated(now), false);

// Consommation
simRel.consumePatience(60, now);
assert.strictEqual(simRel.patience, 40);
assert.strictEqual(simRel.isSaturated(now), false);

// Chute sous le seuil (seuil = 20)
simRel.consumePatience(25, now);
assert.strictEqual(simRel.patience, 15);
assert.strictEqual(simRel.isSaturated(now), true, "Patience < 20 doit être saturée");

// Régénération après écoulement de 2 heures (2 * 3600 sec = +50 patience)
const newPatience = simRel.getPatience(now + 7200);
assert.strictEqual(newPatience, 65, "Après 2h, patience doit remonter à 15 + 50 = 65");
assert.strictEqual(simRel.isSaturated(now + 7200), false, "Ne doit plus être saturé");

// 4. Test Game_InteractionChat avec saturation
simRel.consumePatience(50, now + 7200); // Patience retombe à 15 à l'heure actuelle
global.$gameDate.timestamp = now + 7200;
const chatInteraction = new Game_InteractionChat(1, 10);
const calcReaction = chatInteraction.calculateResult(simRel, null, null);
assert.strictEqual(calcReaction.type, "bored", "Un PNJ saturé doit retourner une réaction bored");

// 5. Test Window_InteractionCommand affichage saturé
const saturatedCmdWin = new Window_InteractionCommand(cmdRect);
saturatedCmdWin.setAvailableInteractions(["chat_saturated"]);
const satCmd = saturatedCmdWin._list.find(c => c.name.includes("Saturé"));
assert.ok(satCmd, "La commande 'Discuter (Saturé)' doit être présente");
assert.strictEqual(satCmd.enabled, false, "La commande saturée doit être désactivée/grisée");

// 6. Test Simulation Étalée (Round-Robin Time-Slicing) dans RelationManager
global.$dataSceSystem = {
    relationship_simulation: {
        tick_delay: 2,
        batch_budget: 3
    }
};

const batchManager = new RelationManager();
assert.strictEqual(batchManager.getSimulationTickDelay(), 2, "Doit lire le tick_delay depuis $dataSceSystem");
assert.strictEqual(batchManager.getSimulationBatchBudget(), 3, "Doit lire le batch_budget depuis $dataSceSystem");

// Créer plusieurs opinions portées envers le joueur sur actor(1).social._opinions
for (let i = 20; i < 30; i++) {
    const r = batchManager.getOpinionToSubjectFromHolder(1, i);
    r.patience = 50;
    r.lastPatienceTimestamp = global.$gameDate.timestamp;
}
assert.ok(batchManager.allActiveRelations().length >= 10, "allActiveRelations() doit collecter toutes les opinions actives");

// Tick 1 : ne doit pas encore exécuter le batch (délai = 2)
batchManager.updateTick(global.$gameDate.timestamp + 3600);
assert.strictEqual(batchManager._simulationCursor, 0, "Curseur ne doit pas bouger au tick 1");

// Tick 2 : doit exécuter le batch de 3 relations
batchManager.updateTick(global.$gameDate.timestamp + 3600);
assert.strictEqual(batchManager._simulationCursor, 3, "Curseur doit avoir avancé de 3");

console.log("   ✅ Patience Sociale, Seuil Boring & Simulation par Lot validés.");

// ============================================================================
// TEST 9: Séquences Multi-Messages & Dialogues Croisés (Ping-Pong PNJ / PJ)
// ============================================================================
console.log("➡️ Test 9: Séquences Multi-Messages & Dialogues Croisés (Ping-Pong PNJ/PJ)...");

// 1. Normalisation Game_ReactionBase
const singleReaction = new Game_ReactionBase({ dialogueText: "Réplique unique" });
assert.strictEqual(singleReaction.isMultiMessage(), false);
assert.deepStrictEqual(singleReaction.dialogueSequence(), [{ target: "npc", text: "Réplique unique" }]);

const arrayReaction = new Game_ReactionBase({ dialogueText: ["Première phrase", "Deuxième phrase"] });
assert.strictEqual(arrayReaction.isMultiMessage(), true);
assert.deepStrictEqual(arrayReaction.dialogueSequence(), [
    { target: "npc", text: "Première phrase" },
    { target: "npc", text: "Deuxième phrase" }
]);

// 2. Factory Game_ReactionChat.createSequence avec cibles mixtes
const pingPongReaction = Game_ReactionChat.createSequence(2, [
    { target: "npc", text: "Halte là ! Déclinez vos intentions." },
    { target: "player", text: "Je viens commercer pacifiquement." },
    { target: "npc", text: "Très bien, vous pouvez circuler." }
], { affinityDelta: 2, shouldCloseScene: false });

assert.strictEqual(pingPongReaction.isMultiMessage(), true);
assert.strictEqual(pingPongReaction.affinityDelta, 2);
assert.strictEqual(pingPongReaction.dialogueSequence().length, 3);
assert.strictEqual(pingPongReaction.dialogueSequence()[1].target, "player");

// 3. Exécution séquentielle pas-à-pas dans SubScene_RelationDialog
global.$gameMessage.clear();
let seqCompleted = false;
let isBusyState = true;

// Mocker isBusy sur $gameMessage pour simuler le défilement joueur
global.$gameMessage.isBusy = () => isBusyState;

const testSubScene = new SubScene_RelationDialog(null, 2, 5); // PNJ = Event #5
testSubScene.start();

testSubScene.playDialogueSequence(pingPongReaction.dialogueSequence(), () => {
    seqCompleted = true;
});

// Étape 1 : Le message 1 (PNJ) doit être envoyé avec le tag \E[5]
assert.strictEqual(global.$gameMessage._texts.length, 1);
assert.ok(global.$gameMessage._texts[0].includes("\\E[5]"), "Étape 1 doit cibler l'événement PNJ \\E[5]");
assert.ok(global.$gameMessage._texts[0].includes("Halte là"));

// Tant que le joueur n'a pas validé, update() n'envoie pas le message suivant
testSubScene.update();
assert.strictEqual(global.$gameMessage._texts.length, 1, "Ne doit pas avancer tant que le message est busy");

// Le joueur valide la bulle 1
global.$gameMessage.clear();
isBusyState = false;
testSubScene.update(); // Détecte la fin de la bulle 1 et envoie la bulle 2
isBusyState = true;

// Étape 2 : Le message 2 (Joueur) doit être envoyé avec le tag \A
assert.strictEqual(global.$gameMessage._texts.length, 1);
assert.ok(global.$gameMessage._texts[0].includes("\\A"), "Étape 2 doit cibler le joueur \\A");
assert.ok(global.$gameMessage._texts[0].includes("Je viens commercer"));

// Le joueur valide la bulle 2
global.$gameMessage.clear();
isBusyState = false;
testSubScene.update(); // Détecte la fin de la bulle 2 et envoie la bulle 3
isBusyState = true;

// Étape 3 : Le message 3 (PNJ) doit être envoyé avec le tag \E[5]
assert.strictEqual(global.$gameMessage._texts.length, 1);
assert.ok(global.$gameMessage._texts[0].includes("\\E[5]"), "Étape 3 doit cibler l'événement PNJ \\E[5]");
assert.ok(global.$gameMessage._texts[0].includes("Très bien, vous pouvez circuler"));

// Le joueur valide la bulle 3
global.$gameMessage.clear();
isBusyState = false;
testSubScene.update(); // Détecte la fin et déclenche le callback de fin

assert.strictEqual(seqCompleted, true, "Le callback de complétion de la séquence doit être exécuté");
console.log("   ✅ Séquences Multi-Messages & Ping-Pong PNJ/PJ validés avec succès.");

console.log("\n==============================================================");
console.log("🎉 TOUS LES TESTS DU SYSTÈME DE RELATIONS SONT VALIDÉS AVEC SUCCÈS !");
console.log("==============================================================\n");
