/**
 * ============================================================================
 * UNIT TEST : A* Pathfinding à 8 Directions (Étape 2)
 * ============================================================================
 * Vérifie l'algorithme A* de recherche de chemin intégrant les diagonales (1, 3, 7, 9).
 * Valide les trajectoires directes, les diagonales parfaites et le repli sur les
 * 4 directions cardinales en cas d'obstacle diagonal.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

global.window = global;
global.$dataActors = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data/Actors.json'), 'utf8'));

// Mock de la carte RPG Maker MZ
global.$gameMap = {
    width: () => 20,
    height: () => 20,
    roundXWithDirection: (x, d) => {
        if (d === 4) return x - 1;
        if (d === 6) return x + 1;
        return x;
    },
    roundYWithDirection: (y, d) => {
        if (d === 8) return y - 1;
        if (d === 2) return y + 1;
        return y;
    },
    deltaX: (x1, x2) => x1 - x2,
    deltaY: (y1, y2) => y1 - y2
};

// Base Character Mock
class Game_CharacterBase {
    constructor() {
        this.x = 0;
        this.y = 0;
    }
    canPass(x, y, d) { return true; }
    canPassDiagonally(x, y, h, v) { return true; }
    deltaXFrom(x) { return this.x - x; }
    deltaYFrom(y) { return this.y - y; }
}

class Game_Character extends Game_CharacterBase {
    searchLimit() { return 12; }
}

// Algorithme findDirectionTo à 8 directions
Game_Character.prototype.findDirectionTo = function(goalX, goalY) {
    const searchLimit = this.searchLimit();
    const mapWidth = $gameMap.width();
    const nodeList = [];
    const openNodes = new Map();
    const closedSet = new Set();
    const start = {};
    let best = start;

    if (this.x === goalX && this.y === goalY) {
        return 0;
    }

    const distance8 = (x, y) => {
        const dx = Math.abs($gameMap.deltaX(x, goalX));
        const dy = Math.abs($gameMap.deltaY(y, goalY));
        return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy);
    };

    start.parent = null;
    start.x = this.x;
    start.y = this.y;
    start.g = 0;
    start.f = distance8(start.x, start.y);
    const startPos = start.y * mapWidth + start.x;
    nodeList.push(start);
    openNodes.set(startPos, start);

    const DIRS = [
        { dir: 2, horz: 0, vert: 2, isDiag: false },
        { dir: 4, horz: 4, vert: 0, isDiag: false },
        { dir: 6, horz: 6, vert: 0, isDiag: false },
        { dir: 8, horz: 0, vert: 8, isDiag: false },
        { dir: 1, horz: 4, vert: 2, isDiag: true },
        { dir: 3, horz: 6, vert: 2, isDiag: true },
        { dir: 7, horz: 4, vert: 8, isDiag: true },
        { dir: 9, horz: 6, vert: 8, isDiag: true }
    ];

    while (nodeList.length > 0) {
        let bestIndex = 0;
        for (let i = 1; i < nodeList.length; i++) {
            if (nodeList[i].f < nodeList[bestIndex].f) {
                bestIndex = i;
            }
        }

        const current = nodeList[bestIndex];
        const x1 = current.x;
        const y1 = current.y;
        const pos1 = y1 * mapWidth + x1;
        const g1 = current.g;

        nodeList.splice(bestIndex, 1);
        openNodes.delete(pos1);
        closedSet.add(pos1);

        if (current.x === goalX && current.y === goalY) {
            best = current;
            break;
        }

        if (g1 >= searchLimit) {
            continue;
        }

        for (const d of DIRS) {
            const x2 = d.isDiag ? $gameMap.roundXWithDirection(x1, d.horz) : $gameMap.roundXWithDirection(x1, d.dir);
            const y2 = d.isDiag ? $gameMap.roundYWithDirection(y1, d.vert) : $gameMap.roundYWithDirection(y1, d.dir);
            const pos2 = y2 * mapWidth + x2;

            if (closedSet.has(pos2)) {
                continue;
            }

            if (d.isDiag) {
                if (!this.canPassDiagonally(x1, y1, d.horz, d.vert)) {
                    continue;
                }
            } else {
                if (!this.canPass(x1, y1, d.dir)) {
                    continue;
                }
            }

            const stepCost = d.isDiag ? Math.SQRT2 : 1;
            const g2 = g1 + stepCost;
            let neighbor = openNodes.get(pos2);

            if (!neighbor || g2 < neighbor.g) {
                if (!neighbor) {
                    neighbor = { x: x2, y: y2 };
                    nodeList.push(neighbor);
                    openNodes.set(pos2, neighbor);
                }
                neighbor.parent = current;
                neighbor.g = g2;
                neighbor.f = g2 + distance8(x2, y2);
                if (!best || neighbor.f - neighbor.g < best.f - best.g) {
                    best = neighbor;
                }
            }
        }
    }

    let node = best;
    while (node.parent && node.parent !== start) {
        node = node.parent;
    }

    const deltaX1 = $gameMap.deltaX(node.x, start.x);
    const deltaY1 = $gameMap.deltaY(node.y, start.y);

    if (deltaX1 < 0 && deltaY1 > 0) return 1; // Bas-Gauche
    if (deltaX1 > 0 && deltaY1 > 0) return 3; // Bas-Droite
    if (deltaX1 < 0 && deltaY1 < 0) return 7; // Haut-Gauche
    if (deltaX1 > 0 && deltaY1 < 0) return 9; // Haut-Droite
    if (deltaY1 > 0) return 2; // Bas
    if (deltaX1 < 0) return 4; // Gauche
    if (deltaX1 > 0) return 6; // Droite
    if (deltaY1 < 0) return 8; // Haut

    const deltaX2 = this.deltaXFrom(goalX);
    const deltaY2 = this.deltaYFrom(goalY);
    const horz = deltaX2 > 0 ? 4 : (deltaX2 < 0 ? 6 : 0);
    const vert = deltaY2 > 0 ? 8 : (deltaY2 < 0 ? 2 : 0);

    if (horz !== 0 && vert !== 0) {
        if (this.canPassDiagonally(this.x, this.y, horz, vert)) {
            if (horz === 4 && vert === 2) return 1;
            if (horz === 6 && vert === 2) return 3;
            if (horz === 4 && vert === 8) return 7;
            if (horz === 6 && vert === 8) return 9;
        }
    }

    if (Math.abs(deltaX2) > Math.abs(deltaY2)) {
        return horz;
    } else if (vert !== 0) {
        return vert;
    }

    return 0;
};

// Exécution des tests
const char = new Game_Character();
char.x = 5;
char.y = 5;

let passCount = 0;
function assert(name, condition) {
    if (condition) {
        console.log(`[PASS] ${name}`);
        passCount++;
    } else {
        console.error(`[FAIL] ${name}`);
        process.exit(1);
    }
}

console.log('--- TESTS PATHFINDING A* 8 DIRECTIONS ---');
assert('Diagonale Bas-Droite (8,8) -> direction 3', char.findDirectionTo(8, 8) === 3);
assert('Diagonale Haut-Gauche (2,2) -> direction 7', char.findDirectionTo(2, 2) === 7);
assert('Diagonale Bas-Gauche (2,8) -> direction 1', char.findDirectionTo(2, 8) === 1);
assert('Diagonale Haut-Droite (8,2) -> direction 9', char.findDirectionTo(8, 2) === 9);
assert('Ligne droite Bas (5,9) -> direction 2', char.findDirectionTo(5, 9) === 2);
assert('Même case (5,5) -> direction 0', char.findDirectionTo(5, 5) === 0);

char.canPassDiagonally = (x, y, h, v) => false;
const fallbackDir = char.findDirectionTo(8, 8);
assert('Repli cardinal quand diagonale bloquée (2 ou 6)', fallbackDir === 2 || fallbackDir === 6);

console.log('✅ TOUS LES TESTS PATHFINDING SONT VALIDÉS');
