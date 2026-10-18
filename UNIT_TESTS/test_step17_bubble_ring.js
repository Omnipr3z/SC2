//=============================================================================
// test_step17_bubble_ring.js
// Tests unitaires pour l'Étape 17 : Bubble Message (Window_BubbleMsg) & Ring Command (Window_RingCommand)
//=============================================================================

const fs = require('fs');
const path = require('path');

// Configuration de l'environnement global simulé
global.window = global;

global.Graphics = {
    width: 1280,
    height: 720,
    boxWidth: 1280,
    boxHeight: 720
};

global.Rectangle = class Rectangle {
    constructor(x, y, width, height) {
        this.x = x || 0;
        this.y = y || 0;
        this.width = width || 0;
        this.height = height || 0;
    }
};

global.TouchInput = {
    x: 0,
    y: 0,
    _triggered: false,
    isTriggered() { return this._triggered; },
    clear() { this._triggered = false; }
};

global.SoundManager = {
    playOk() {}
};

global.DEBUGTOOL = {
    log(msg, flag) {}
};

global.FontManager = {
    _loaded: {},
    load(family, filename) {
        this._loaded[family] = filename;
    }
};

global.ImageManager = {
    iconWidth: 32,
    iconHeight: 32,
    standardFaceWidth: 144,
    standardFaceHeight: 144,
    loadSystem(name) { return { name, ready: true }; }
};

// Base RMMZ Window classes
global.Window = class Window {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.padding = 12;
        this.opacity = 255;
        this.backOpacity = 192;
        this.openness = 255;
        this.visible = true;
        this.active = true;
    }
    move(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
    }
    isOpen() { return this.openness >= 255; }
    isClosed() { return this.openness === 0; }
    isClosing() { return false; }
    open() { this.openness = 255; }
    close() { this.openness = 0; }
    show() { this.visible = true; }
    hide() { this.visible = false; }
    activate() { this.active = true; }
    deactivate() { this.active = false; }
    createContents() {}
    destroyContents() {}
    update() {}
    refresh() {}
};

global.Window_Base = class Window_Base extends global.Window {
    constructor(rect) {
        super();
        this.initialize(rect);
    }
    initialize(rect) {
        if (rect) {
            this.move(rect.x, rect.y, rect.width, rect.height);
        }
        this.createContents();
    }
    createContents() {
        this.contents = { 
            fontFace: this.standardFontFace(), 
            fontSize: this.standardFontSize(),
            outlineWidth: 3,
            outlineColor: "rgba(0, 0, 0, 0.6)"
        };
        this.resetFontSettings();
    }
    destroyContents() {
        this.contents = null;
    }
    standardFontFace() { return "GameFont"; }
    standardFontSize() { return 26; }
    loadWindowskin() { this.windowskin = ImageManager.loadSystem("Window"); }
    updateBackOpacity() { this.backOpacity = 192; }
    resetFontSettings() {
        this.contents = this.contents || {};
        this.contents.fontFace = (typeof $gameSystem !== "undefined" && $gameSystem.mainFontFace) ? $gameSystem.mainFontFace() : "rmmz-mainfont";
        this.contents.fontSize = (typeof $gameSystem !== "undefined" && $gameSystem.mainFontSize) ? $gameSystem.mainFontSize() : 26;
        this.resetTextColor();
    }
    resetTextColor() {
        this.contents = this.contents || {};
        this.contents.outlineWidth = 3;
        this.contents.outlineColor = "rgba(0, 0, 0, 0.6)";
    }
    changePaintOpacity(e) {}
    drawText(t, x, y, w, align) {}
    drawIcon(id, x, y) {}
    createTextState(text, x, y, width) {
        return { text, x: x || 0, y: y || 0, startX: x || 0, width: width || 0 };
    }
    textSizeEx(text) {
        // Simulation de mesure de texte
        const lines = String(text).split('\n');
        let maxLen = 0;
        for (const line of lines) {
            maxLen = Math.max(maxLen, line.length);
        }
        return {
            width: maxLen * 14,
            height: lines.length * 36
        };
    }
    convertEscapeCharacters(text) {
        if (typeof SC4_Localization !== "undefined" && SC4_Localization.parse) {
            text = SC4_Localization.parse(text);
        }
        return text;
    }
};

global.Window_Selectable = class Window_Selectable extends global.Window_Base {
    initialize(rect) {
        super.initialize(rect);
        this._index = 0;
        this._cursorRect = new Rectangle();
    }
    index() { return this._index; }
    select(i) { this._index = i; }
    maxItems() { return this._list ? this._list.length : 0; }
    setCursorRect(x, y, w, h) {
        this._cursorRect = new Rectangle(x, y, w, h);
    }
    cursorDown(wrap) {
        const max = this.maxItems();
        if (max > 0) this._index = (this._index + 1) % max;
    }
    cursorUp(wrap) {
        const max = this.maxItems();
        if (max > 0) this._index = (this._index - 1 + max) % max;
    }
};

global.Window_Command = class Window_Command extends global.Window_Selectable {
    initialize(rect) {
        super.initialize(rect);
        this._list = [];
        this._handlers = {};
        this.makeCommandList();
    }
    clearCommandList() { this._list = []; }
    makeCommandList() {}
    addCommand(name, symbol, enabled = true, ext = null) {
        this._list.push({ name, symbol, enabled, ext });
    }
    setHandler(symbol, method) {
        this._handlers[symbol] = method;
    }
    isHandled(symbol) {
        return !!this._handlers[symbol];
    }
    callHandler(symbol) {
        if (this.isHandled(symbol)) {
            this._handlers[symbol]();
        }
    }
    callOkHandler() {
        this.callHandler("ok");
    }
    refresh() {
        this.clearCommandList();
        this.makeCommandList();
    }
};

global.Window_Message = class Window_Message extends global.Window_Base {
    initialize(rect) {
        super.initialize(rect);
        this.initMembers();
    }
    initMembers() {
        this._textState = null;
        this._goldWindow = null;
        this._nameBoxWindow = null;
        this._choiceListWindow = null;
    }
    setGoldWindow(w) { this._goldWindow = w; }
    setNameBoxWindow(w) { this._nameBoxWindow = w; }
    setChoiceListWindow(w) { this._choiceListWindow = w; }
    newLineX(textState) { return 4; }
    newPage(textState) {}
    updatePlacement() {
        this.y = 480; // Standard bottom placement
        this.x = 0;
    }
    updateBackground() {}
    terminateMessage() {
        this.close();
    }
};

global.Window_ChoiceList = class Window_ChoiceList extends global.Window_Command {
    updatePlacement() {
        this.x = 400;
        this.y = 300;
        this.width = 200;
        this.height = 120;
    }
};

// Simulation Game objects
global.Game_System = class Game_System {
    constructor() {
        this._locale = "FR";
        this._bubbleMessageMode = false;
        this._ringMenuEnabled = true;
    }
    windowPadding() { return 12; }
    mainFontFace() { return "rmmz-mainfont"; }
    mainFontSize() { return 26; }
};
global.$gameSystem = new global.Game_System();

global.$gameMessage = {
    _texts: [],
    _positionType: 0,
    _faceName: "",
    texts() { return this._texts; },
    allText() { return this._texts.join('\n'); },
    add(t) { this._texts.push(t); },
    clear() { this._texts = []; this._faceName = ""; this._positionType = 0; },
    faceName() { return this._faceName; },
    positionType() { return this._positionType; },
    setPositionType(t) { this._positionType = t; },
    setBackground(b) {}
};

global.$gamePlayer = {
    _x: 640,
    _y: 400,
    screenX() { return this._x; },
    screenY() { return this._y; }
};

global.$gameMap = {
    _events: {
        1: { id: 1, _x: 300, _y: 200, screenX() { return this._x; }, screenY() { return this._y; } },
        2: { id: 2, _x: -300, _y: 150, screenX() { return this._x; }, screenY() { return this._y; } }, // offscreen left
        3: { id: 3, _x: 2000, _y: -500, screenX() { return this._x; }, screenY() { return this._y; } }  // offscreen top-right
    },
    event(id) { return this._events[id] || null; },
    isEventRunning() { return false; },
    _interpreter: { eventId() { return 0; } }
};

global.Scene_Base = class Scene_Base {
    constructor() { this._windows = []; }
    addWindow(w) { this._windows.push(w); }
};

global.Scene_Message = class Scene_Message extends global.Scene_Base {
    createMessageWindow() {
        const rect = this.messageWindowRect();
        this._messageWindow = new Window_Message(rect);
        this.addWindow(this._messageWindow);
    }
    messageWindowRect() {
        return new Rectangle(0, 480, 1280, 240);
    }
};

global.Scene_Map = class Scene_Map extends global.Scene_Message {
    createAllWindows() {
        this.createMessageWindow();
    }
    update() {}
};

// Simulation SC4_Localization
global.SC4_Localization = {
    _dict: {
        "menu.item": "Objets",
        "menu.skill": "Compétences",
        "greeting": "Bonjour le monde",
        "bubble_player": "\\A\\L[greeting]",
        "bubble_event": "\\E[1]Bienvenue au village !"
    },
    parse(text) {
        if (typeof text !== "string") return text;
        return text.replace(/(?:\x1b|\\)[Ll]\[([^\]]+)\]/g, (match, key) => {
            return this._dict[key] || match;
        });
    }
};

// Chargement des plugins
const bubblePath = path.resolve(__dirname, '../js/plugins/SC4_BubbleMessage.js');
const ringPath = path.resolve(__dirname, '../js/plugins/SC4_RingCommand.js');

eval(fs.readFileSync(bubblePath, 'utf8'));
eval(fs.readFileSync(ringPath, 'utf8'));

// ============================================================================
// DÉBUT DES TESTS
// ============================================================================

let testsPassed = 0;
let testsFailed = 0;

function assert(cond, msg) {
    if (cond) {
        console.log(`  ✅ [PASS] ${msg}`);
        testsPassed++;
    } else {
        console.error(`  ❌ [FAIL] ${msg}`);
        testsFailed++;
    }
}

console.log("\n=======================================================");
console.log("   TESTS SUITE 17 : BUBBLE MESSAGE & RING COMMAND");
console.log("=======================================================\n");

// ----------------------------------------------------------------------------
// TEST 1 : Window_BubbleMsg - Instanciation et héritage
// ----------------------------------------------------------------------------
console.log("--- 1. Window_BubbleMsg Instanciation & Héritage ---");
const msgRect = new Rectangle(0, 480, 1280, 240);
const bubbleWin = new Window_BubbleMsg(msgRect);

assert(bubbleWin instanceof Window_Message, "Window_BubbleMsg hérite bien de Window_Message");
assert(bubbleWin.width === 1280 && bubbleWin.height === 240, "Dimensions initiales conformes à vanilla messageWindowRect");
assert(bubbleWin._isBubbleMode === false, "Mode bulle inactif par défaut");
assert(bubbleWin.mapTarget() === null, "Cible nulle par défaut");

// ----------------------------------------------------------------------------
// TEST 2 : Window_BubbleMsg - Analyse des flags (\A, \E[id], \PX, \PY)
// ----------------------------------------------------------------------------
console.log("\n--- 2. Window_BubbleMsg Détection et Nettoyage des Flags ---");

// Test \A (Player)
const parsedPlayer = bubbleWin.parseBubbleFlags("Bonjour \\A aventurier !");
assert(parsedPlayer.isBubble === true, "Flag \\A active le mode bulle");
assert(parsedPlayer.target === $gamePlayer, "Flag \\A cible correctement $gamePlayer");
assert(parsedPlayer.cleanText === "Bonjour aventurier !", "Flag \\A est supprimé du texte affiché");

// Test \E[1] (Event 1)
const parsedEvent = bubbleWin.parseBubbleFlags("\\E[1]Halte là !");
assert(parsedEvent.isBubble === true, "Flag \\E[1] active le mode bulle");
assert(parsedEvent.target === $gameMap.event(1), "Flag \\E[1] cible correctement l'événement 1");
assert(parsedEvent.cleanText === "Halte là !", "Flag \\E[1] est supprimé du texte affiché");

// Test \PX[250] \PY[180] (Coordinates)
const parsedCoords = bubbleWin.parseBubbleFlags("Coordonnées \\PX[250]\\PY[180] ciblées");
assert(parsedCoords.isBubble === true, "Flags \\PX & \\PY activent le mode bulle");
assert(parsedCoords.target.x === 250 && parsedCoords.target.y === 180, "Flags \\PX & \\PY extraient les coordonnées x=250, y=180");
assert(parsedCoords.cleanText === "Coordonnées ciblées", "Flags \\PX & \\PY sont nettoyés du texte");

// Test \L[key] intégré avec \A
const parsedLoc = bubbleWin.parseBubbleFlags("\\A\\L[greeting]");
assert(parsedLoc.isBubble === true, "Flag \\A combiné avec \\L[greeting] active le mode bulle");
assert(parsedLoc.cleanText === "Bonjour le monde", "Traduction \\L[KEY] résolue en amont et flag \\A extrait");

// ----------------------------------------------------------------------------
// TEST 3 : Window_BubbleMsg - startMessage, Redimensionnement et Placement
// ----------------------------------------------------------------------------
console.log("\n--- 3. Window_BubbleMsg startMessage, Dimensions & Placement ---");

$gameMessage.clear();
$gameMessage.add("\\ACeci est un test court");
$gameMessage.setPositionType(0); // Top of player
bubbleWin.startMessage();

assert(bubbleWin._isBubbleMode === true, "startMessage active le mode bulle via le message");
assert(bubbleWin.mapTarget() === $gamePlayer, "Cible configurée sur $gamePlayer");
assert(bubbleWin.width < 1280, `Largeur adaptée au texte court (${bubbleWin.width}px < 1280px)`);
assert(bubbleWin.width >= 120, `Largeur respecte le minWidth (${bubbleWin.width}px >= 120px)`);

// Vérification du centrage horizontal sur le joueur (screenX = 640)
const expectedX = 640 - Math.floor(bubbleWin.width / 2);
assert(bubbleWin.x === expectedX, `Fenêtre centrée horizontalement sur le joueur (${bubbleWin.x} === ${expectedX})`);

// Vérification du positionnement vertical au-dessus du joueur
const targetHeadY = 400 - 48; // screenY (400) - 48 = 352
const expectedY = targetHeadY - bubbleWin.height - 14;
assert(bubbleWin.y === expectedY, `Fenêtre positionnée au-dessus de la tête du joueur (${bubbleWin.y} === ${expectedY})`);

// ----------------------------------------------------------------------------
// TEST 4 : Window_BubbleMsg - Edge Clamping (Événement hors écran)
// ----------------------------------------------------------------------------
console.log("\n--- 4. Window_BubbleMsg Edge Clamping (Cible hors écran) ---");

// Test événement 2 (x: -300, y: 150 -> hors écran à gauche)
$gameMessage.clear();
$gameMessage.add("\\E[2]Je suis hors écran à gauche !");
bubbleWin.startMessage();

assert(bubbleWin.x === 8, `Bulle clampée au bord gauche de l'écran (x: ${bubbleWin.x} === 8)`);
assert(bubbleWin.y >= 8 && bubbleWin.y <= 720 - bubbleWin.height - 8, "Bulle clampée dans les limites verticales");

// Test événement 3 (x: 2000, y: -500 -> hors écran en haut à droite)
$gameMessage.clear();
$gameMessage.add("\\E[3]Je suis tout en haut à droite !");
bubbleWin.startMessage();

const maxAllowedX = 1280 - bubbleWin.width - 8;
assert(bubbleWin.x === maxAllowedX, `Bulle clampée au bord droit de l'écran (x: ${bubbleWin.x} === ${maxAllowedX})`);
assert(bubbleWin.y === 8, `Bulle clampée au bord haut de l'écran (y: ${bubbleWin.y} === 8)`);

// ----------------------------------------------------------------------------
// TEST 5 : Window_BubbleMsg - Suivi dynamique du joueur en mouvement (update)
// ----------------------------------------------------------------------------
console.log("\n--- 5. Window_BubbleMsg Suivi Dynamique de la Cible (update) ---");

$gameMessage.clear();
$gameMessage.add("\\ABulle suiveuse");
bubbleWin.startMessage();
const initialX = bubbleWin.x;

// Déplacement du joueur
$gamePlayer._x = 800;
$gamePlayer._y = 500;
bubbleWin.update();

const newExpectedX = 800 - Math.floor(bubbleWin.width / 2);
assert(bubbleWin.x === newExpectedX, `Bulle a suivi le déplacement du joueur vers X=${newExpectedX} (avant: ${initialX})`);

// ----------------------------------------------------------------------------
// TEST 6 : Window_BubbleMsg - Rétablissement du mode Vanilla
// ----------------------------------------------------------------------------
console.log("\n--- 6. Window_BubbleMsg Rétablissement du Mode Vanilla ---");

bubbleWin.terminateMessage();
assert(bubbleWin.mapTarget() === null, "Cible réinitialisée à null après terminateMessage");
assert(bubbleWin._isBubbleMode === false, "Mode bulle réinitialisé à false");
assert(bubbleWin.width === 1280 && bubbleWin.height === 240, "Dimensions rétablies au rectangle vanilla standard");

// Message vanilla sans flag
$gameMessage.clear();
$gameMessage.add("Message standard en bas de l'écran sans aucun flag.");
bubbleWin.startMessage();
assert(bubbleWin._isBubbleMode === false, "Message sans flag reste en mode vanilla");
assert(bubbleWin.width === 1280, "Largeur plein écran 1280px préservée en mode vanilla");
assert(bubbleWin.y === 480, "Positionnement standard vanilla y=480");

// ----------------------------------------------------------------------------
// TEST 7 : Window_BubbleMsg - Configuration personnalisée (police, taille, marges)
// ----------------------------------------------------------------------------
console.log("\n--- 7. Window_BubbleMsg Configuration Personnalisée ---");

Window_BubbleMsg.setConfig({
    fontFace: "BubbleCustomFont",
    fontSize: 22,
    verticalGap: 20
});

$gameMessage.clear();
$gameMessage.add("\\ATexte stylé");
bubbleWin.startMessage();

assert(bubbleWin.standardFontFace() === "BubbleCustomFont", "Police personnalisée appliquée en mode bulle");
assert(bubbleWin.standardFontSize() === 22, "Taille de police personnalisée appliquée en mode bulle");
assert(bubbleWin.contents.fontSize === 22, `contents.fontSize défini à 22 (actuel: ${bubbleWin.contents.fontSize})`);

Window_BubbleMsg.resetConfig();
assert(Window_BubbleMsg.getConfig().fontFace === "", "resetConfig réinitialise la configuration globale");

// Test configuration dynamique via $gameSystem.setBubbleConfig({ fontFace: "BD.ttf", fontSize: 12, windowskin: "Window_Bubble" })
$gameSystem.setBubbleConfig({
    fontFace: "BD.ttf",
    fontSize: 12,
    windowskin: "Window_Bubble"
});

assert(FontManager._loaded["BD"] === "BD.ttf", "FontManager.load appelé avec famille 'BD' et fichier 'BD.ttf'");

$gameMessage.clear();
$gameMessage.add("Message avec config personnalisée");
bubbleWin.startMessage();

assert(bubbleWin._isBubbleMode === true, "setBubbleConfig active le mode bulle");
assert(bubbleWin.contents.fontSize === 12, `Taille de police appliquée à 12 (actuel: ${bubbleWin.contents.fontSize})`);
assert(bubbleWin.contents.fontFace === "BD", `Police appliquée à 'BD' (actuel: ${bubbleWin.contents.fontFace})`);
assert(bubbleWin.windowskin.name === "Window_Bubble", `Windowskin appliqué à 'Window_Bubble' (actuel: ${bubbleWin.windowskin ? bubbleWin.windowskin.name : null})`);
assert(bubbleWin.lineHeight() === 20, `LineHeight adapté à 20px pour font 12px (actuel: ${bubbleWin.lineHeight()})`);

bubbleWin.terminateMessage();
assert(bubbleWin.windowskin.name === "Window", "Windowskin réinitialisé à 'Window' après fermeture");

// Test réglage distinct verticalGapTop et verticalGapBottom
$gameSystem.setBubbleConfig({
    verticalGapTop: 25,
    verticalGapBottom: 35
});

// Test en haut (positionType = 0)
$gamePlayer._x = 600;
$gamePlayer._y = 350;
$gameMessage.clear();
$gameMessage.setPositionType(0);
$gameMessage.add("\\ATest décalage haut");
bubbleWin.startMessage();

const expectedTopY = (350 - 48) - bubbleWin.height - 25;
assert(bubbleWin.y === expectedTopY, `Décalage haut de 25px appliqué (${bubbleWin.y} === ${expectedTopY})`);
bubbleWin.terminateMessage();

// Test en bas (positionType = 2)
$gameMessage.clear();
$gameMessage.setPositionType(2);
$gameMessage.add("\\ATest décalage bas");
bubbleWin.startMessage();

const expectedBottomY = 350 + 35;
assert(bubbleWin.y === expectedBottomY, `Décalage bas de 35px appliqué (${bubbleWin.y} === ${expectedBottomY})`);
// Test désactivation de l'outline (ombre/contour des lettres)
$gameSystem.setBubbleConfig({
    enableOutline: false
});
$gameMessage.clear();
$gameMessage.add("\\ATest sans contour de lettres");
bubbleWin.startMessage();

assert(bubbleWin.contents.outlineWidth === 0, `Outline désactivé (outlineWidth: ${bubbleWin.contents.outlineWidth} === 0)`);
assert(bubbleWin.contents.outlineColor === "rgba(0, 0, 0, 0)", `Couleur d'outline transparente (${bubbleWin.contents.outlineColor})`);
bubbleWin.terminateMessage();

// Test réactivation avec outline personnalisé (ex: épaisseur 2)
$gameSystem.setBubbleConfig({
    enableOutline: true,
    outlineWidth: 2
});
$gameMessage.clear();
$gameMessage.add("\\ATest contour personnalisé");
bubbleWin.startMessage();

assert(bubbleWin.contents.outlineWidth === 2, `Outline personnalisé activé avec épaisseur 2 (actuel: ${bubbleWin.contents.outlineWidth})`);
bubbleWin.terminateMessage();

// Test que le mode vanilla rétablit l'outline standard à 3
assert(bubbleWin.contents.outlineWidth === 3, `Mode vanilla rétablit l'outline standard à 3 (actuel: ${bubbleWin.contents.outlineWidth})`);

$gameSystem._bubbleConfig = {};
$gameSystem._bubbleMessageMode = false;
$gamePlayer._x = 800;
$gamePlayer._y = 500;

// ----------------------------------------------------------------------------
// TEST 8 : Window_RingCommand - Instanciation et Calcul du Rayon
// ----------------------------------------------------------------------------
console.log("\n--- 8. Window_RingCommand Instanciation & Géométrie ---");

const ringRect = new Rectangle(0, 0, 400, 400);
const ringWin = new Window_RingCommand(ringRect);

assert(ringWin instanceof Window_Command, "Window_RingCommand hérite bien de Window_Command");
assert(ringWin.width === 400 && ringWin.height === 400, "Dimensions 400x400 conformes");
assert(ringWin._center.x === 200 && ringWin._center.y === 200, "Centre calculé à (200, 200)");
assert(ringWin._targetRadius > 0, `Rayon cible calculé avec succès (${ringWin._targetRadius}px)`);
assert(ringWin.opacity === 0, "Opacité de la fenêtre globale à 0 (transparence native)");

// ----------------------------------------------------------------------------
// TEST 9 : Window_RingCommand - Commandes, Icônes et Localisation
// ----------------------------------------------------------------------------
console.log("\n--- 9. Window_RingCommand Commandes, Icônes & Localisation ---");

const testCommands = [
    { name: "\\L[menu.item]", symbol: "item", enabled: true, icon: "🎒" },
    { name: "\\L[menu.skill]", symbol: "skill", enabled: true, icon: "✨" },
    { name: "Attaque", symbol: "attack", enabled: true, icon: 16 },
    { name: "Fuir", symbol: "escape", enabled: false, icon: "🏃" }
];

ringWin.setCommands(testCommands);
assert(ringWin.maxItems() === 4, "4 commandes ajoutées avec succès");
assert(ringWin._list[0].name === "Objets", "Commande 1 traduite via \\L[menu.item] -> 'Objets'");
assert(ringWin._list[0].icon === "🎒", "Icône emoji '🎒' conservée");
assert(ringWin._list[2].icon === 16, "Icône numérique RMMZ 16 conservée");
assert(ringWin._list[3].enabled === false, "Commande 4 désactivée (enabled: false)");

// ----------------------------------------------------------------------------
// TEST 10 : Window_RingCommand - Disposition Circulaire et itemRect
// ----------------------------------------------------------------------------
console.log("\n--- 10. Window_RingCommand Disposition Circulaire ---");

// Test avec rayon forcé pour calcul géométrique précis
ringWin._radius = 100;
const rect0 = ringWin.itemRect(0); // Angle -Math.PI / 2 (Haut / 12h)
const rect1 = ringWin.itemRect(1); // Angle 0 (Droite / 3h)
const rect2 = ringWin.itemRect(2); // Angle Math.PI / 2 (Bas / 6h)
const rect3 = ringWin.itemRect(3); // Angle Math.PI (Gauche / 9h)

// A midi (index 0) : x doit être au centre (200 - w/2), y doit être à (200 - 100 - h/2)
const itemW = ringWin.itemWidth();
const itemH = ringWin.itemHeight();

assert(rect0.x === Math.floor(200 - itemW / 2), `Item 0 (12h) centré en X (${rect0.x})`);
assert(rect0.y === Math.floor(200 - 100 - itemH / 2), `Item 0 (12h) en haut en Y (${rect0.y})`);

// A 3h (index 1) : x doit être à droite (200 + 100 - w/2)
assert(rect1.x === Math.floor(200 + 100 - itemW / 2), `Item 1 (3h) à droite en X (${rect1.x})`);

// ----------------------------------------------------------------------------
// TEST 11 : Window_RingCommand - Animation d'ouverture fluide (Ease-Out)
// ----------------------------------------------------------------------------
console.log("\n--- 11. Window_RingCommand Animation d'Ouverture Fluide ---");

ringWin._radius = 0;
ringWin.openness = 255;
ringWin.updateOpeningRadius();

assert(ringWin._radius > 0, `Rayon initialement à 0 a progressé (${ringWin._radius.toFixed(1)}px)`);
// Plusieurs cycles d'animation
for (let i = 0; i < 30; i++) {
    ringWin.updateOpeningRadius();
}
assert(ringWin._radius === ringWin._targetRadius, `Rayon a atteint le rayon cible max (${ringWin._radius} === ${ringWin._targetRadius})`);

// ----------------------------------------------------------------------------
// TEST 12 : Window_RingCommand - Navigation Circulaire (cursorLeft / cursorRight)
// ----------------------------------------------------------------------------
console.log("\n--- 12. Window_RingCommand Navigation Circulaire ---");

ringWin.select(0);
assert(ringWin.index() === 0, "Sélection initiale à 0");

ringWin.cursorRight();
assert(ringWin.index() === 1, "cursorRight passe à l'index 1 (sens horaire)");

ringWin.cursorRight();
ringWin.cursorRight();
ringWin.cursorRight();
assert(ringWin.index() === 0, "cursorRight boucle correctement sur 0");

ringWin.cursorLeft();
assert(ringWin.index() === 3, "cursorLeft recule avec boucle sur 3");

// ----------------------------------------------------------------------------
// TEST 13 : Window_RingCommand - openAtTarget & Edge Clamping
// ----------------------------------------------------------------------------
console.log("\n--- 13. Window_RingCommand openAtTarget & Clamping ---");

// Centré sur le joueur (x: 800, y: 500)
ringWin.openAtTarget($gamePlayer);
const expectedRingX = 800 - Math.floor(ringWin.width / 2);
assert(ringWin.x === expectedRingX, `Ring command centré sur le joueur en X (${ringWin.x} === ${expectedRingX})`);
assert(ringWin.isOpen(), "Fenêtre ouverte après openAtTarget");

// Cible au bord extrême droit (x: 1250, y: 300)
ringWin.openAt(1250, 300);
const maxRingX = 1280 - ringWin.width - 8;
assert(ringWin.x === maxRingX, `Ring command clampé au bord droit (x: ${ringWin.x} === ${maxRingX})`);

// ----------------------------------------------------------------------------
// TEST 14 : Scene_Map - Intégration et Clic Joueur
// ----------------------------------------------------------------------------
console.log("\n--- 14. Scene_Map Intégration Ring Menu ---");

const sceneMap = new Scene_Map();
sceneMap.createAllWindows();

assert(sceneMap._messageWindow instanceof Window_BubbleMsg, "Scene_Map._messageWindow est une instance de Window_BubbleMsg");
assert(sceneMap._ringCommandWindow instanceof Window_RingCommand, "Scene_Map._ringCommandWindow est une instance de Window_RingCommand");

// Test du clic sur le joueur
TouchInput.x = $gamePlayer.screenX();
TouchInput.y = $gamePlayer.screenY() - 20; // Dans l'empreinte 48x48
TouchInput._triggered = true;

assert(sceneMap.isTouchOnPlayer() === true, "isTouchOnPlayer détecte le clic sur le joueur");

sceneMap.updateRingCommandTrigger();
assert(sceneMap._ringCommandWindow.active === true, "Ring Command activé après clic sur le joueur");

sceneMap.closeRingMenu();
assert(sceneMap._ringCommandWindow.active === false, "closeRingMenu désactive correctement le Ring Command");

// ----------------------------------------------------------------------------
// TEST 15 : Window_BubbleMsg - Prévention du Flash de la Fenêtre Vanilla à l'Ouverture
// ----------------------------------------------------------------------------
console.log("\n--- 15. Window_BubbleMsg Prévention du Flash Vanilla en Ouverture ---");

// Test de préchargement de windowskin
assert(ImageManager.loadSystem("Window_Bubble").name === "Window_Bubble", "ImageManager a bien accès au windowskin Window_Bubble");

const testWin = new Window_BubbleMsg(new Rectangle(0, 480, 1280, 240));
$gameMessage.clear();
$gameMessage.add("\\A Message test flash 1");
testWin.startMessage();

assert(testWin._isBubbleMode === true, "Mode bulle actif dès startMessage");
assert(testWin.windowskin.name === "Window_Bubble", "Windowskin appliqué à Window_Bubble dès le départ");
assert(testWin.width < 1280, `Dimensions bulle appliquées immédiatement (width: ${testWin.width} < 1280)`);
assert(testWin.y !== 480, `Placement bulle appliqué immédiatement (y: ${testWin.y} !== 480)`);
assert(testWin.isOpen(), "Fenêtre ouverte après startMessage");

// Simulation fermeture
testWin.terminateMessage();
assert(testWin.isClosed(), "Fenêtre fermée après terminateMessage en mode synchrone");
assert(testWin._isBubbleMode === false, "Mode réinitialisé à false une fois fermée");
assert(testWin.width === 1280, "Dimensions rétablies au vanilla une fois fermée");

// ----------------------------------------------------------------------------
// RÉSUMÉ FINAL
// ----------------------------------------------------------------------------
console.log("\n=======================================================");
console.log(`RÉSUMÉ : ${testsPassed} validés, ${testsFailed} échoués`);
console.log("=======================================================\n");

if (testsFailed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
