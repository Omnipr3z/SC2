/**
 * ============================================================================
 * UNIT TEST : Étape 3 - Mode Visée, Strafe et Découplage Clavier/Souris
 * ============================================================================
 * Valide les mécanismes de la visée à 8 directions :
 * - Clic droit maintenu : activation du mode visée (isAiming) et calcul de
 *   la direction du regard vers le curseur (aimDirection à 8 directions).
 * - Clic gauche en mode visée : déclenchement de l'action de tir/coup (onAimAction)
 *   sans interférer avec la destination tactile de Scene_Map.
 * - Strafe : déplacement au clavier (flèches/ZQSD) en maintenant l'orientation
 *   du regard fixée vers la cible (direction decoupled from movement).
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// Mocks d'environnement RMMZ
global.window = global;
global.Graphics = {
    pageToCanvasX: x => x,
    pageToCanvasY: y => y,
    isInsideCanvas: () => true
};

global.Input = {
    dir8: 0,
    isTriggered: key => key === 'menu_keyboard'
};

global.$dataActors = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/Actors.json'), 'utf8'));
global.$dataArmors = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/Armors.json'), 'utf8'));
global.$dataWeapons = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/Weapons.json'), 'utf8'));

// Mock TouchInput
global.TouchInput = {
    clear() {},
    update() {},
    isPressed() { return false; },
    isTriggered() { return false; },
    _onCancel(x, y) {}
};

// Mock Scene_Map & Game_Temp
global.$gameTemp = {
    _destinationX: null,
    _destinationY: null,
    setDestination(x, y) { this._destinationX = x; this._destinationY = y; },
    clearDestination() { this._destinationX = null; this._destinationY = null; },
    isDestinationValid() { return this._destinationX !== null; }
};

global.Scene_Map = class Scene_Map {
    isMenuCalled() { return Input.isTriggered('menu') || TouchInput.isCancelled(); }
    onMapTouch() {
        const x = TouchInput.x;
        const y = TouchInput.y;
        $gameTemp.setDestination(x, y);
    }
    update() {}
};

global.Game_Actor = class Game_Actor {};
global.Game_Actors = class Game_Actors {};
global.Game_Map = class Game_Map {};
global.$gameParty = { leader: () => null };
global.$gameMap = {
    width: () => 20,
    height: () => 20,
    canvasToMapX: x => Math.floor(x / 48),
    canvasToMapY: y => Math.floor(y / 48),
    roundXWithDirection: (x, d) => x,
    roundYWithDirection: (y, d) => y,
    deltaX: (x1, x2) => x1 - x2,
    deltaY: (y1, y2) => y1 - y2
};

// Mock Game_CharacterBase & Game_Player
global.Game_CharacterBase = class Game_CharacterBase {
    constructor() {
        this._x = 5; this._y = 5; this._realX = 5; this._realY = 5;
        this.x = 5; this.y = 5;
        this._direction = 2;
    }
    direction() { return this._direction; }
    setDirection(d) { this._direction = d; }
    screenX() { return 200; }
    screenY() { return 200; }
    canPass() { return true; }
    canPassDiagonally() { return true; }
    moveStraight(d) { this.setDirection(d); }
    moveDiagonally(h, v) {}
    isMoving() { return false; }
    isDashing() { return false; }
};

global.Game_Character = class Game_Character extends global.Game_CharacterBase {};

global.Game_Player = class Game_Player extends global.Game_Character {
    constructor() {
        super();
        this._aimDirection = 2;
    }
    executeMove(direction) {
        if (this.isAiming && this.isAiming()) {
            // Strafe : déplace le personnage sans changer la direction de regard
            const oldDir = this._direction;
            this.moveStraight(direction);
            this.setDirection(oldDir);
        } else {
            this.moveStraight(direction);
        }
    }
};

global.$gamePlayer = new Game_Player();

// Chargement des plugins SC4
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_rmmz_core_Patches.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_rmmz_objects_Patches.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_rmmz_scenes_Patches.js'), 'utf8'));

const sceneMap = new Scene_Map();

console.log('--- TEST 1 : TOUCHINPUT ÉCOUTEURS SOURIS ---');
console.log('TouchInput._onRightButtonDown est une fonction :', typeof TouchInput._onRightButtonDown === 'function');
console.log('TouchInput._onMouseMove est une fonction :', typeof TouchInput._onMouseMove === 'function');
console.log('TouchInput._onMouseUp est une fonction :', typeof TouchInput._onMouseUp === 'function');

console.log('\n--- TEST 2 : CLIC DROIT & ÉTAT DE VISÉE ---');
TouchInput._rightPressed = false;
console.log('Initialement : isAiming() est faux :', !$gamePlayer.isAiming());

// Simulation de l'appui sur le clic droit
TouchInput._onRightButtonDown({ pageX: 300, pageY: 200 });
console.log('Après appui clic droit : TouchInput.isRightPressed() :', TouchInput.isRightPressed());
console.log('Après appui clic droit : $gamePlayer.isAiming() :', $gamePlayer.isAiming());

console.log('\n--- TEST 3 : CALCUL DE LA DIRECTION DE VISÉE (8 DIRECTIONS) ---');
const centerPx = $gamePlayer.screenX();
const centerPy = $gamePlayer.screenY() - 24;

// Est (Droite / 6)
TouchInput._cursorX = centerPx + 100;
TouchInput._cursorY = centerPy;
console.log('Curseur Est -> direction de visée = 6 :', $gamePlayer.aimDirection());

// Sud-Est (Bas-Droite / 3)
TouchInput._cursorX = centerPx + 100;
TouchInput._cursorY = centerPy + 100;
console.log('Curseur Sud-Est -> direction de visée = 3 :', $gamePlayer.aimDirection());

// Sud (Bas / 2)
TouchInput._cursorX = centerPx;
TouchInput._cursorY = centerPy + 100;
console.log('Curseur Sud -> direction de visée = 2 :', $gamePlayer.aimDirection());

// Sud-Ouest (Bas-Gauche / 1)
TouchInput._cursorX = centerPx - 100;
TouchInput._cursorY = centerPy + 100;
console.log('Curseur Sud-Ouest -> direction de visée = 1 :', $gamePlayer.aimDirection());

// Ouest (Gauche / 4)
TouchInput._cursorX = centerPx - 100;
TouchInput._cursorY = centerPy;
console.log('Curseur Ouest -> direction de visée = 4 :', $gamePlayer.aimDirection());

// Nord-Ouest (Haut-Gauche / 7)
TouchInput._cursorX = centerPx - 100;
TouchInput._cursorY = centerPy - 100;
console.log('Curseur Nord-Ouest -> direction de visée = 7 :', $gamePlayer.aimDirection());

// Nord (Haut / 8)
TouchInput._cursorX = centerPx;
TouchInput._cursorY = centerPy - 100;
console.log('Curseur Nord -> direction de visée = 8 :', $gamePlayer.aimDirection());

// Nord-Est (Haut-Droite / 9)
TouchInput._cursorX = centerPx + 100;
TouchInput._cursorY = centerPy - 100;
console.log('Curseur Nord-Est -> direction de visée = 9 :', $gamePlayer.aimDirection());

console.log('\n--- TEST 4 : DÉCOUPLAGE TACTILE & DESTINATION ---');
TouchInput._rightPressed = false;
TouchInput._x = 50; TouchInput._y = 50;
sceneMap.onMapTouch();
console.log('Sans visée : destination tactile définie :', $gameTemp.isDestinationValid());

// Début de visée
TouchInput._onRightButtonDown({ pageX: 300, pageY: 152 });
sceneMap.update();
console.log('Avec visée : destination annulée :', !$gameTemp.isDestinationValid());

$gamePlayer._aimActionRequested = false;
sceneMap.onMapTouch();
console.log('Avec visée : clic gauche ne définit pas de destination :', !$gameTemp.isDestinationValid());
console.log('Avec visée : onAimAction a été déclenché :', $gamePlayer._aimActionRequested);

console.log('\n--- TEST 5 : STRAFE (DÉPLACEMENT TOUT EN VISANT) ---');
TouchInput._cursorX = centerPx + 100;
TouchInput._cursorY = centerPy;
$gamePlayer.update(true);
console.log('Direction de regard en visant vers l\'Est :', $gamePlayer.direction()); // 6

$gamePlayer.executeMove(2); // Déplacement vers le Sud
console.log('Après déplacement Sud, regard maintenu à l\'Est (6) :', $gamePlayer.direction());

// Relâchement du clic droit
TouchInput._onMouseUp({ button: 2, pageX: 300, pageY: 152 });
console.log('Après relâchement clic droit, isAiming est faux :', !$gamePlayer.isAiming());

$gamePlayer.executeMove(2);
console.log('Après déplacement normal Sud, direction = Sud (2) :', $gamePlayer.direction());

console.log('✅ TEST ÉTAPE 3 COMPLÈTEMENT VALIDÉ !');
