/**
 * ============================================================================
 * UNIT TEST : Déclenchement d'Événements Tactiles & Diagonales (Étape 4)
 * ============================================================================
 * Valide l'interaction par clic/toucher avec les événements situés en diagonale :
 * - Calcul des coordonnées dans les 8 directions par Game_Map.
 * - triggerTouchAction : lorsqu'on clique sur un événement adjacent (orthogonal ou diagonal),
 *   le joueur pivote vers l'événement, déclenche l'événement et annule la destination
 *   pour éviter le phénomène d'encerclement/tournoiement.
 */

const fs = require('fs');
const path = require('path');

// Mock Game_Map
class Mock_Game_Map {
    constructor() {
        this._events = [];
    }
    width() { return 20; }
    height() { return 20; }
    isLoopHorizontal() { return false; }
    isLoopVertical() { return false; }
    roundX(x) { return (x + 20) % 20; }
    roundY(y) { return (y + 20) % 20; }

    xWithDirection(x, d) {
        return x + (d === 6 || d === 3 || d === 9 ? 1 : d === 4 || d === 1 || d === 7 ? -1 : 0);
    }
    yWithDirection(y, d) {
        return y + (d === 2 || d === 1 || d === 3 ? 1 : d === 8 || d === 7 || d === 9 ? -1 : 0);
    }
    roundXWithDirection(x, d) {
        return this.roundX(this.xWithDirection(x, d));
    }
    roundYWithDirection(y, d) {
        return this.roundY(this.yWithDirection(y, d));
    }
    deltaX(x1, x2) { return x1 - x2; }
    deltaY(y1, y2) { return y1 - y2; }
    eventsXy(x, y) {
        return this._events.filter(e => e.x === x && e.y === y);
    }
    isAnyEventStarting() { return this._eventStarting; }
    setupStartingEvent() { return this._eventStarting; }
    isCounter(x, y) { return false; }
}

global.window = global;
global.$gameMap = new Mock_Game_Map();

global.$gameTemp = {
    _destinationX: null,
    _destinationY: null,
    setDestination(x, y) { this._destinationX = x; this._destinationY = y; },
    clearDestination() { this._destinationX = null; this._destinationY = null; },
    isDestinationValid() { return this._destinationX !== null; },
    destinationX() { return this._destinationX; },
    destinationY() { return this._destinationY; }
};

console.log('--- TEST 1 : COORDONNÉES 8 DIRECTIONS DE GAME_MAP ---');
const testDirs = [
    { dir: 2, expX: 5, expY: 6, name: 'Bas' },
    { dir: 4, expX: 4, expY: 5, name: 'Gauche' },
    { dir: 6, expX: 6, expY: 5, name: 'Droite' },
    { dir: 8, expX: 5, expY: 4, name: 'Haut' },
    { dir: 1, expX: 4, expY: 6, name: 'Bas-Gauche' },
    { dir: 3, expX: 6, expY: 6, name: 'Bas-Droite' },
    { dir: 7, expX: 4, expY: 4, name: 'Haut-Gauche' },
    { dir: 9, expX: 6, expY: 4, name: 'Haut-Droite' }
];

for (const t of testDirs) {
    const rx = $gameMap.roundXWithDirection(5, t.dir);
    const ry = $gameMap.roundYWithDirection(5, t.dir);
    if (rx !== t.expX || ry !== t.expY) {
        console.error(`Erreur sur direction ${t.name} (${t.dir}) : (${rx}, ${ry}) vs (${t.expX}, ${t.expY})`);
        process.exit(1);
    }
    console.log(`[PASS] ${t.name} (${t.dir}) -> (${rx}, ${ry})`);
}

console.log('\n--- TEST 2 : INTERACTION TACTILE SUR ÉVÉNEMENT DIAGONAL ---');
class Mock_Player {
    constructor() {
        this.x = 5;
        this.y = 5;
        this._direction = 2;
        this.startedEvent = false;
    }
    direction() { return this._direction; }
    setDirection(d) { this._direction = d; }
    canStartLocalEvents() { return true; }
    startMapEvent(x, y, triggers, normal) {
        const events = $gameMap.eventsXy(x, y);
        if (events.length > 0) {
            this.startedEvent = true;
            $gameMap._eventStarting = true;
        }
    }
    canPass() { return false; }
    canPassDiagonally() { return false; }

    triggerTouchAction() {
        if ($gameTemp.isDestinationValid()) {
            const destX = $gameTemp.destinationX();
            const destY = $gameTemp.destinationY();
            const x1 = this.x;
            const y1 = this.y;

            if (destX === x1 && destY === y1) {
                return false;
            }

            const dx = $gameMap.deltaX(destX, x1);
            const dy = $gameMap.deltaY(destY, y1);
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);

            // Adjacent (orthogonale OU diagonale)
            if (absDx <= 1 && absDy <= 1) {
                let dir = 0;
                if (dx === 0 && dy > 0) dir = 2;
                else if (dx < 0 && dy === 0) dir = 4;
                else if (dx > 0 && dy === 0) dir = 6;
                else if (dx === 0 && dy < 0) dir = 8;
                else if (dx < 0 && dy > 0) dir = 1;
                else if (dx > 0 && dy > 0) dir = 3;
                else if (dx < 0 && dy < 0) dir = 7;
                else if (dx > 0 && dy < 0) dir = 9;

                const events = $gameMap.eventsXy(destX, destY);
                if (events.length > 0) {
                    if (dir > 0) {
                        this.setDirection(dir);
                    }
                    this.startMapEvent(destX, destY, [0, 1, 2], true);
                    $gameTemp.clearDestination();
                    return true;
                }
            }
        }
        return false;
    }
}

// Ajout d'un événement sur la diagonale (6, 6)
$gameMap._events = [{ x: 6, y: 6, id: 1 }];
$gameMap._eventStarting = false;

const player = new Mock_Player();
$gameTemp.setDestination(6, 6);

const res = player.triggerTouchAction();
console.log('Résultat déclenchement :', res);
console.log('Événement démarré :', player.startedEvent);
console.log('Orientation joueur vers l\'événement (Bas-Droite 3) :', player.direction());
console.log('Destination annulée (pas d\'encerclement) :', !$gameTemp.isDestinationValid());

if (res && player.startedEvent && player.direction() === 3 && !$gameTemp.isDestinationValid()) {
    console.log('✅ TEST DÉCLENCHEMENT TACTILE VALIDÉ');
} else {
    console.error('❌ ÉCHEC DU TEST DÉCLENCHEMENT TACTILE');
    process.exit(1);
}
