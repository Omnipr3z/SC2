//=============================================================================
// test_step15_gunfight.js
// Tests unitaires pour l'Étape 15 : Gunfight System (Armes à feu, balistique, reload, HUD)
//=============================================================================

const fs = require('fs');
const path = require('path');

// Configuration de l'environnement global simulé
global.window = global;

global.Graphics = { width: 1280, height: 720, boxWidth: 1280, boxHeight: 720 };
global.Rectangle = class Rectangle {
    constructor(x, y, width, height) {
        this.x = x || 0;
        this.y = y || 0;
        this.width = width || 0;
        this.height = height || 0;
    }
};

global.Bitmap = class Bitmap {
    constructor(w, h) {
        this.width = w || 1280;
        this.height = h || 720;
        this._ready = true;
        this.context = {
            save: () => {},
            restore: () => {},
            beginPath: () => {},
            moveTo: () => {},
            lineTo: () => {},
            arcTo: () => {},
            closePath: () => {},
            fill: () => {},
            stroke: () => {},
            fillRect: () => {},
            fillText: () => {},
            measureText: (txt) => ({ width: (txt || '').length * 8 }),
            createLinearGradient: () => ({ addColorStop: () => {} })
        };
    }
    isReady() { return this._ready; }
    drawText() {}
    clear() {}
    blt() {}
};

global.Sprite = class Sprite {
    constructor(bitmap) {
        this.bitmap = bitmap || new global.Bitmap();
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.opacity = 255;
        this.visible = true;
        this.rotation = 0;
        this.parent = null;
        this.anchor = {
            x: 0,
            y: 0,
            set: function(x, y) { this.x = x; this.y = y; }
        };
    }
    addChild(c) { c.parent = this; }
    removeChild(c) { c.parent = null; }
    update() {}
};

global.TouchInput = {
    _rightPressed: false,
    _pressed: false,
    _triggered: false,
    x: 640,
    y: 360,
    cursorX: 640,
    cursorY: 360,
    isTriggered: function() { return this._triggered; },
    isPressed: function() { return this._pressed; },
    isRightPressed: function() { return this._rightPressed; }
};

global.Input = {
    _pressed: {},
    _triggered: {},
    keyMapper: {},
    isPressed: function(key) { return Boolean(this._pressed[key]); },
    isTriggered: function(key) { return Boolean(this._triggered[key]); }
};

global.AudioManager = {
    _lastSe: null,
    playSe: function(se) { this._lastSe = se; }
};

global.ConfigManager = {
    keyboardLayout: "azerty",
    autoReload: false
};

global.Game_System = class Game_System {
    constructor() {
        this._playerHudVisible = true;
        this._weaponHudVisible = true;
    }
    isPlayerHudVisible() {
        return this._playerHudVisible !== undefined ? Boolean(this._playerHudVisible) : true;
    }
    setPlayerHudVisible(visible) {
        this._playerHudVisible = Boolean(visible);
    }
    togglePlayerHud() {
        this.setPlayerHudVisible(!this.isPlayerHudVisible());
        return this.isPlayerHudVisible();
    }
    isWeaponHudVisible() {
        return this._weaponHudVisible !== undefined ? Boolean(this._weaponHudVisible) : true;
    }
    setWeaponHudVisible(visible) {
        this._weaponHudVisible = Boolean(visible);
    }
    toggleWeaponHud() {
        this.setWeaponHudVisible(!this.isWeaponHudVisible());
        return this.isWeaponHudVisible();
    }
    isHudVisible() {
        return this.isPlayerHudVisible() || this.isWeaponHudVisible();
    }
    setHudVisible(visible) {
        this.setPlayerHudVisible(visible);
        this.setWeaponHudVisible(visible);
    }
    toggleHud() {
        const newState = !this.isHudVisible();
        this.setHudVisible(newState);
        return newState;
    }
};
global.$gameSystem = new global.Game_System();

global.SC4 = {
    setHudVisible: (v) => global.$gameSystem.setHudVisible(v),
    showHud: () => global.$gameSystem.setHudVisible(true),
    hideHud: () => global.$gameSystem.setHudVisible(false),
    toggleHud: () => global.$gameSystem.toggleHud(),
    setPlayerHudVisible: (v) => global.$gameSystem.setPlayerHudVisible(v),
    showPlayerHud: () => global.$gameSystem.setPlayerHudVisible(true),
    hidePlayerHud: () => global.$gameSystem.setPlayerHudVisible(false),
    togglePlayerHud: () => global.$gameSystem.togglePlayerHud(),
    setWeaponHudVisible: (v) => global.$gameSystem.setWeaponHudVisible(v),
    showWeaponHud: () => global.$gameSystem.setWeaponHudVisible(true),
    hideWeaponHud: () => global.$gameSystem.setWeaponHudVisible(false),
    toggleWeaponHud: () => global.$gameSystem.toggleWeaponHud()
};

// Base RMMZ objects simulation
global.Game_CharacterBase = class Game_CharacterBase {
    constructor() {
        this._x = 5;
        this._y = 5;
        this._realX = 5;
        this._realY = 5;
        this._direction = 2;
        this._isActing = false;
        this._action = "walk";
        this._stepAnime = false;
        this._moving = false;
    }
    x() { return this._x; }
    y() { return this._y; }
    direction() { return this._direction; }
    setDirection(d) { this._direction = d; }
    isMoving() { return this._moving; }
    isActing() { return this._isActing; }
    action() { return this._action; }
    hasStepAnime() { return this._stepAnime; }
    canAct() { return !this.isActing(); }
    canAttack() { return this.canAct(); }
    playAction(opts) {
        this._isActing = true;
        let action = opts.action;
        let frames = opts.frames;
        let duration = opts.duration;
        const leader = (global.$gameParty ? global.$gameParty.leader() : null);
        if (leader && typeof leader.getAttackConfig === "function" && (!action || !frames || !duration)) {
            const cfg = leader.getAttackConfig(opts.skillId || 1);
            if (!action) action = cfg.actionName;
            if (!frames) frames = cfg.frames;
            if (!duration) duration = cfg.duration;
        }
        this._action = action || "atk";
        this._actionMaxFrames = frames || 4;
        this._actionFrameDuration = duration || 4;
        return true;
    }
    screenX() { return this._realX * 48 + 24; }
    screenY() { return this._realY * 48 + 24; }
};

global.Game_Player = class Game_Player extends global.Game_CharacterBase {
    constructor() {
        super();
        this._aiming = false;
        this._dashing = false;
    }
    isAiming() { return TouchInput.isRightPressed(); }
    isDashing() { return this._dashing; }
    aimDirection() { return 6; } // Visée Est/Droite par défaut
    moveByInput() {}
    centerX() { return 12.5; }
    centerY() { return 7; }
    scrolledX() { return (global.$gameMap ? global.$gameMap.adjustX(this._realX) : this._realX); }
    scrolledY() { return (global.$gameMap ? global.$gameMap.adjustY(this._realY) : this._realY); }
    distancePerFrame() { return 0.0625; }
    performAttack() {
        return this.playAction({ action: "atk", direction: this.direction() });
    }
};

global.Game_Actor = class Game_Actor {
    constructor(actorId) {
        this._actorId = actorId || 1;
        this._weapons = [];
        this.setup(this._actorId);
    }
    setup(id) { this._actorId = id; }
    actorId() { return this._actorId; }
    weapons() { return this._weapons; }
    equipWeapon(wp) { this._weapons = wp ? [wp] : []; }
    attackSkillId() { return 1; }
};

global.Game_Party = class Game_Party {
    constructor() {
        this._leader = null;
        this._items = {};
    }
    leader() { return this._leader; }
    setLeader(actor) { this._leader = actor; }
    numItems(item) {
        if (!item) return 0;
        return this._items[item.id] || 0;
    }
    gainItem(item, amount) {
        if (!item) return;
        this._items[item.id] = (this._items[item.id] || 0) + amount;
    }
    loseItem(item, amount) {
        if (!item) return;
        this._items[item.id] = Math.max(0, (this._items[item.id] || 0) - amount);
    }
};
global.$gameParty = new global.Game_Party();

global.Game_Map = class Game_Map {
    constructor() {
        this._blockedTiles = {};
        this._waterTiles = {};
        this._events = [];
        this._displayX = 0;
        this._displayY = 0;
    }
    tileWidth() { return 48; }
    tileHeight() { return 48; }
    width() { return 100; }
    height() { return 100; }
    screenTileX() { return 26; }
    screenTileY() { return 15; }
    isLoopHorizontal() { return false; }
    isLoopVertical() { return false; }
    isValid(x, y) { return x >= 0 && x <= 100 && y >= 0 && y <= 100; }
    isPassable(x, y, d) {
        const key = `${x},${y}`;
        return !this._blockedTiles[key];
    }
    setBlocked(x, y) { this._blockedTiles[`${x},${y}`] = true; }
    setWater(x, y) { this._waterTiles[`${x},${y}`] = true; }
    isWater(x, y) { return Boolean(this._waterTiles[`${x},${y}`]); }
    adjustX(x) { return x - (this._displayX || 0); }
    adjustY(y) { return y - (this._displayY || 0); }
    scrollRight(d) { this._displayX = (this._displayX || 0) + d; }
    scrollLeft(d) { this._displayX = (this._displayX || 0) - d; }
    scrollDown(d) { this._displayY = (this._displayY || 0) + d; }
    scrollUp(d) { this._displayY = (this._displayY || 0) - d; }
    events() { return this._events; }
    eventsXy(x, y) {
        return this._events.filter(e => Math.round(e.x) === Math.round(x) && Math.round(e.y) === Math.round(y));
    }
    addEvent(ev) { this._events.push(ev); }
};
global.$gameMap = new global.Game_Map();

global.FightManager = class FightManager {
    constructor() {
        this._lastAttackRecord = null;
    }
    executeAttack(attacker, target, skillId = 1) {
        this._lastAttackRecord = {
            attacker,
            target,
            skillId,
            timestamp: Date.now()
        };
        if (target && target.battler && target.battler.gainHp) {
            target.battler.gainHp(-25);
        }
        return true;
    }
};
global.$fightManager = new global.FightManager();

global.$dataItems = {
    10: { id: 10, name: "Balles 9mm" },
    11: { id: 11, name: "Chargeur Fusil" }
};

global.$dataSkills = {
    1: { id: 1, name: "Attaque", note: "<visual_attack>\n  <duration>4</duration>\n  <frames>4</frames>\n  <action_name>atk</action_name>\n</visual_attack>" },
    10: { id: 10, name: "Tir de revolver Gruk", note: "<visual_attack>\n  <duration>4</duration>\n  <frames>4</frames>\n  <action_name>shot_onehandgun</action_name>\n</visual_attack>" },
    25: { id: 25, name: "Tir fusil", note: "<visual_attack>\n  <duration>4</duration>\n  <frames>4</frames>\n  <action_name>atk</action_name>\n</visual_attack>" }
};

// Chargement des plugins nécessaires
const ROOT_DIR = path.resolve(__dirname, '..');
const debugtoolCode = fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/DEBUGTOOL.js'), 'utf8');
eval(debugtoolCode);
const heroCode = fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/Game_Hero.js'), 'utf8');
eval(heroCode);
global.Game_Actor.prototype.getAttackConfig = global.Game_Hero.prototype.getAttackConfig;
const compositeCode = fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/Bitmap_Composite.js'), 'utf8');
eval(compositeCode);
const gunfightCode = fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_Gunfight.js'), 'utf8');
eval(gunfightCode);

console.log("==============================================================");
console.log("--- TEST ÉTAPE 15 : GUNFIGHT SYSTEM (ARMES, BALISTIQUE, HUD) ---");
console.log("==============================================================");

// 1. Test du Parsing des Notetags d'armes
const shotgun = {
    id: 1,
    name: "Fusil à pompe",
    iconIndex: 102,
    note: `
<skillId: 25>
<range: 6>
<rateOfFire: 30>
<specialAnim: shotgun>
<heavy>
<shootSe: ShotgunShoot, 95, 105>
<reload: true>
<reloadAction: pump>
<reloadMove: true>
<ammoId: 10>
<ammoCap: 6>
<reloadMode: 1by1>
<rechargeTime: 15>
<reloadSe: ShellInsert, 90, 100>
<outOfAmmo: DryFire, 80, 100>
<emptySe: NoAmmo, 80, 90>
<projectileImg: Fuseur>
<projectileSpeed: 20>
`
};

const stats = GunfightManager.parseWeaponStats(shotgun);

if (stats.skillId !== 25) {
    console.error(`❌ skillId incorrect: attendu 25, obtenu ${stats.skillId}`);
    process.exit(1);
}
if (stats.range !== 6 || !stats.isRanged) {
    console.error(`❌ range incorrect: attendu 6 (isRanged=true), obtenu ${stats.range}`);
    process.exit(1);
}
if (stats.rateOfFire !== 30) {
    console.error(`❌ rateOfFire incorrect: attendu 30, obtenu ${stats.rateOfFire}`);
    process.exit(1);
}
if (!stats.heavy) {
    console.error(`❌ heavy flag manquant sur le fusil à pompe`);
    process.exit(1);
}
if (stats.specialAnim !== "shotgun") {
    console.error(`❌ specialAnim attendu 'shotgun', obtenu ${stats.specialAnim}`);
    process.exit(1);
}
if (stats.reloadMode !== "1by1" || stats.ammoCap !== 6 || stats.ammoId !== 10) {
    console.error(`❌ reload stats incorrectes pour le mode 1by1`);
    process.exit(1);
}
if (!stats.reloadMove) {
    console.error(`❌ reloadMove devrait être true`);
    process.exit(1);
}
if (stats.projectileImg !== "Fuseur" || stats.projectileSpeed !== 20) {
    console.error(`❌ stats balistiques projectile incorrectes`);
    process.exit(1);
}
console.log("✅ 1. Parsing complet des notetags d'armes : OK");

// 2. Persistance des munitions par arme sur Game_Actor
const actor = new Game_Actor(1);
global.$gameParty.setLeader(actor);

actor.equipWeapon(shotgun);
if (actor.getLoadedAmmo() !== 6) {
    console.error(`❌ Le chargeur devrait être plein au 1er équipement (6), obtenu: ${actor.getLoadedAmmo()}`);
    process.exit(1);
}

// Tire 2 balles
actor.consumeLoadedAmmo(shotgun, 2);
if (actor.getLoadedAmmo() !== 4) {
    console.error(`❌ Il devrait rester 4 balles après avoir tiré 2 fois, obtenu: ${actor.getLoadedAmmo()}`);
    process.exit(1);
}

// Équipe une autre arme (Fusil d'assaut à 30 balles)
const rifle = {
    id: 2,
    name: "Fusil d'assaut",
    iconIndex: 105,
    note: "<range:10><ammoCap:30><reload:true><burst>"
};
actor.equipWeapon(rifle);
if (actor.getLoadedAmmo() !== 30) {
    console.error(`❌ Le fusil d'assaut devrait avoir 30 balles, obtenu: ${actor.getLoadedAmmo()}`);
    process.exit(1);
}
actor.consumeLoadedAmmo(rifle, 10);
if (actor.getLoadedAmmo() !== 20) {
    console.error(`❌ Le fusil d'assaut devrait avoir 20 balles, obtenu: ${actor.getLoadedAmmo()}`);
    process.exit(1);
}

// Ré-équipe le fusil à pompe : conserve exactement ses 4 balles !
actor.equipWeapon(shotgun);
if (actor.getLoadedAmmo() !== 4) {
    console.error(`❌ Le fusil à pompe rééquipé doit avoir conservé ses 4 balles, obtenu: ${actor.getLoadedAmmo()}`);
    process.exit(1);
}
console.log("✅ 2. Persistance des munitions par arme (anti-exploit de switch) : OK");

// 3. Machine d'état de Rechargement (Mode 1by1 & Mode total)
const player = new Game_Player();
player.actor = () => actor;
player.hero = () => actor;

// Réserve d'inventaire : 10 balles
global.$gameParty.gainItem(global.$dataItems[10], 10);
if (actor.getReserveAmmo() !== 10) {
    console.error(`❌ Réserve de balles attendue: 10, obtenu: ${actor.getReserveAmmo()}`);
    process.exit(1);
}

// Début rechargement 1by1 (Fusil à pompe à 4/6)
Input._pressed["reload"] = true;
player.startReload();

if (!player.isReloading()) {
    console.error("❌ Le joueur devrait être en état de rechargement");
    process.exit(1);
}
if (player.isDashing()) {
    console.error("❌ Le dash doit être bloqué pendant le rechargement");
    process.exit(1);
}
if (!player.hasStepAnime()) {
    console.error("❌ L'animation pas à pas doit être active pendant la recharge");
    process.exit(1);
}
if (player.action() !== "reload_pump") {
    console.error(`❌ Action attendue: 'reload_pump', obtenu: ${player.action()}`);
    process.exit(1);
}

// Simulation de 14 frames (rechargeTime = 15) -> pas encore de balle chargée
for (let i = 0; i < 14; i++) {
    player.updateReload();
}
if (actor.getLoadedAmmo() !== 4) {
    console.error("❌ Aucune balle ne doit être chargée avant rechargeTime");
    process.exit(1);
}

// 15ème frame -> 1 balle chargée (devient 5/6), 1 item consommé dans l'inventaire
player.updateReload();
if (actor.getLoadedAmmo() !== 5) {
    console.error(`❌ Balle non chargée à frame 15: attendu 5, obtenu: ${actor.getLoadedAmmo()}`);
    process.exit(1);
}
if (global.$gameParty.numItems(global.$dataItems[10]) !== 9) {
    console.error("❌ 1 item de munition aurait dû être consommé dans l'inventaire");
    process.exit(1);
}

// Le joueur relâche la touche R -> rechargement 1by1 s'interrompt et conserve les 5 balles !
Input._pressed["reload"] = false;
player.updateReload();
if (player.isReloading()) {
    console.error("❌ Relâcher R en mode 1by1 doit interrompre le rechargement");
    process.exit(1);
}
if (actor.getLoadedAmmo() !== 5) {
    console.error("❌ Les 5 balles chargées doivent être conservées à l'interruption");
    process.exit(1);
}
console.log("✅ 3. Rechargement 1by1 balle par balle avec interruption fluide : OK");

// 4. Balistique & Collisions du Projectile (Mur & Ennemi)
// Création d'un projectile vers la droite (direction 6)
const proj = new Game_Projectile({
    attacker: player,
    x: 2,
    y: 5,
    direction: 6,
    range: 5,
    speed: 16, // 16px/frame = 1/3 de case par frame
    skillId: 25
});

// Avancement de 3 frames (1 case parcourue)
proj.update();
proj.update();
proj.update();
if (!proj.isAlive) {
    console.error("❌ Le projectile devrait être actif en vol libre");
    process.exit(1);
}

// Test des décalages visuels : -30px pour 4, 6, -20px pour 7, 9, -38px pour 1, 3, 24px pour 2, 0px pour 8
const p4 = new Game_Projectile({ x: 5, y: 5, direction: 4 });
const p6 = new Game_Projectile({ x: 5, y: 5, direction: 6 });
const p7 = new Game_Projectile({ x: 5, y: 5, direction: 7 });
const p9 = new Game_Projectile({ x: 5, y: 5, direction: 9 });
const p1 = new Game_Projectile({ x: 5, y: 5, direction: 1 });
const p3 = new Game_Projectile({ x: 5, y: 5, direction: 3 });
const p2 = new Game_Projectile({ x: 5, y: 5, direction: 2 });
const p8 = new Game_Projectile({ x: 5, y: 5, direction: 8 });

if (p4.offsetY() !== -30 || p6.offsetY() !== -30) {
    console.error("❌ Décalage offsetY attendu -30px pour directions 4, 6");
    process.exit(1);
}
if (p7.offsetY() !== -20 || p9.offsetY() !== -20) {
    console.error("❌ Décalage offsetY attendu -20px pour directions 7, 9");
    process.exit(1);
}
if (p1.offsetY() !== -38 || p3.offsetY() !== -38) {
    console.error("❌ Décalage offsetY attendu -38px pour directions 1, 3");
    process.exit(1);
}
if (p2.offsetY() !== 24) {
    console.error("❌ Décalage offsetY attendu 24px pour direction 2");
    process.exit(1);
}
if (p8.offsetY() !== 0) {
    console.error("❌ Décalage offsetY attendu 0px pour direction 8");
    process.exit(1);
}
const baseScreenY = Math.round(5 * 48 + 24);
if (p6.screenY() !== baseScreenY - 30 || p1.screenY() !== baseScreenY - 38 || p2.screenY() !== baseScreenY + 24) {
    console.error(`❌ screenY() incorrect avec offsetY : obtenu p6=${p6.screenY()} (attendu ${baseScreenY - 30}), p1=${p1.screenY()} (attendu ${baseScreenY - 38}), p2=${p2.screenY()} (attendu ${baseScreenY + 24})`);
    process.exit(1);
}
const s6 = new Sprite_Projectile(p6);
if (s6.y !== p6.screenY() || s6.offsetY() !== -30) {
    console.error(`❌ Sprite_Projectile y mal aligné : obtenu ${s6.y}, attendu ${p6.screenY()}`);
    process.exit(1);
}
// Test fondu d'apparition sur les 180 premiers pixels
if (s6.opacity !== 0) {
    console.error(`❌ Opacité initiale du projectile attendue 0, obtenu: ${s6.opacity}`);
    process.exit(1);
}
p6.traveledTiles = 90 / 48; // 90px parcourus (mi-parcours du fondu 180px)
s6.updateOpacity();
if (s6.opacity !== 128) {
    console.error(`❌ Opacité à 90px attendue 128, obtenu: ${s6.opacity}`);
    process.exit(1);
}
p6.traveledTiles = 180 / 48; // 180px parcourus (fin du fondu)
s6.updateOpacity();
if (s6.opacity !== 255) {
    console.error(`❌ Opacité à 180px attendue 255, obtenu: ${s6.opacity}`);
    process.exit(1);
}
p6.traveledTiles = 200 / 48; // Au-delà de 180px
s6.updateOpacity();
if (s6.opacity !== 255) {
    console.error(`❌ Opacité au-delà de 180px attendue 255, obtenu: ${s6.opacity}`);
    process.exit(1);
}
// Test z-index inférieur aux personnages
if (p6.screenZ() !== 2 || s6.z !== 2) {
    console.error(`❌ Z-index du projectile attendu 2, obtenu: projectile=${p6.screenZ()}, sprite=${s6.z}`);
    process.exit(1);
}
const charZ = (typeof player.screenZ === "function") ? player.screenZ() : 3;
if (s6.z >= charZ) {
    console.error(`❌ Le z-index du projectile (${s6.z}) devrait être strictement inférieur à celui du personnage (${charZ})`);
    process.exit(1);
}

// Test du filtrage sélectif via DEBUGTOOL pour le flag "gunfight"
if (typeof DEBUGTOOL !== "undefined") {
    DEBUGTOOL.setSelectiveMode(true);
    DEBUGTOOL.setAllowedKeys(["OTHER"]);
    let intercepted = false;
    const originalLog = console.log;
    console.log = () => { intercepted = true; };
    DEBUGTOOL.log("Test log gunfight masqué", "gunfight");
    console.log = originalLog;
    if (intercepted) {
        console.error("❌ Le log 'gunfight' aurait dû être masqué en mode sélectif sans la clé autorisée");
        process.exit(1);
    }

    DEBUGTOOL.setAllowedKeys(["GUNFIGHT"]);
    console.log = () => { intercepted = true; };
    DEBUGTOOL.log("Test log gunfight visible", "gunfight");
    console.log = originalLog;
    if (!intercepted) {
        console.error("❌ Le log 'gunfight' aurait dû être affiché avec la clé 'GUNFIGHT' autorisée");
        process.exit(1);
    }
    DEBUGTOOL.setSelectiveMode(false);
}
console.log("✅ 4.1. Alignement visuel, fondu sur 180px, z-index sous les personnages (z=2) et logs DEBUGTOOL(flag: gunfight) : OK");

// Test collision obstacle / mur
global.$gameMap.setBlocked(4, 5);
const wallProj = new Game_Projectile({
    attacker: player,
    x: 3,
    y: 5,
    direction: 6,
    range: 5,
    speed: 48, // 1 case par frame
    skillId: 25
});
wallProj.update(); // Essaie d'entrer dans la case (4, 5) bloquée
if (wallProj.isAlive) {
    console.error("❌ Le projectile aurait dû s'arrêter net contre le mur bloqué");
    process.exit(1);
}
console.log("✅ 4. Trajectoire balistique et arrêt sur mur infranchissable : OK");

// Test traversée des zones d'eau (bloquantes à pied mais franchissables par les balles)
global.$gameMap.setBlocked(7, 5); // Bloqué pour la marche
global.$gameMap.setWater(7, 5);   // C'est de l'eau !
const waterProj = new Game_Projectile({
    attacker: player,
    x: 6,
    y: 5,
    direction: 6,
    range: 5,
    speed: 48,
    skillId: 25
});
waterProj.update(); // Entre sur la case d'eau (7, 5)
if (!waterProj.isAlive) {
    console.error("❌ Le projectile aurait dû survoler la zone d'eau sans s'arrêter");
    process.exit(1);
}
console.log("✅ 4.5. Traversée des zones d'eau par les projectiles (lacs/rivières) : OK");

// Test collision ennemi
const dummyEnemy = {
    x: 6,
    y: 5,
    _realX: 6,
    _realY: 5,
    isHostile: () => true,
    battler: () => ({ isDead: () => false, hp: 100, gainHp: function(v) { this.hp += v; } })
};
global.$gameMap.addEvent(dummyEnemy);

const hitProj = new Game_Projectile({
    attacker: player,
    x: 5,
    y: 5,
    direction: 6,
    range: 5,
    speed: 48,
    skillId: 25
});
hitProj.update(); // Atteint (6, 5) où se trouve dummyEnemy

if (hitProj.isAlive) {
    console.error("❌ Le projectile aurait dû despawner à l'impact de l'ennemi");
    process.exit(1);
}
if (!global.$fightManager._lastAttackRecord || global.$fightManager._lastAttackRecord.target !== dummyEnemy) {
    console.error("❌ FightManager aurait dû enregistrer l'attaque sur l'ennemi touché");
    process.exit(1);
}
if (global.$fightManager._lastAttackRecord.skillId !== 25) {
    console.error("❌ Le skillId de l'impact doit correspondre à celui de l'arme (25)");
    process.exit(1);
}
console.log("✅ 5. Détection de collision et résolution d'impact sur ennemi : OK");

// 6. Restrictions Heavy, Snipe, et Tir continu Burst
const sniperRifle = {
    id: 3,
    name: "Fusil de précision",
    note: "<range:15><snipe><specialAnim:snipe>"
};
actor.equipWeapon(sniperRifle);

TouchInput._rightPressed = true; // Mode visée / garde
if (player.action() !== "guard_snipe") {
    console.error(`❌ Action visée avec specialAnim attendue 'guard_snipe', obtenu: ${player.action()}`);
    process.exit(1);
}

// Vérification de blocage de déplacement pendant la visée avec <snipe>
let moved = false;
player.moveByInput = function() { moved = true; };
Game_Player.prototype.moveByInput.call(player);
if (moved) {
    console.error("❌ Le joueur ne doit pas pouvoir bouger pendant la visée avec une arme <snipe>");
    process.exit(1);
}

// Vérification tir à sec & Option B (Auto-reload)
actor.setLoadedAmmo(shotgun, 0);
actor.equipWeapon(shotgun);
ConfigManager.autoReload = true; // Option B activée
TouchInput._triggered = true;

player.performGunfightShoot();
if (!player.isReloading()) {
    console.error("❌ En Option B (Auto-reload), tirer à sec doit automatiquement déclencher la recharge");
    process.exit(1);
}
if (!AudioManager._lastSe || AudioManager._lastSe.name !== "DryFire") {
    console.error("❌ Le son outOfAmmo (DryFire) aurait dû être joué lors du tir à sec");
    process.exit(1);
}
console.log("✅ 6. Restrictions Snipe, sons audio et Option B auto-reload au tir à sec : OK");

// Test tir au coup par coup (semi-auto sans burst) via performAttack
actor.setLoadedAmmo(shotgun, 5);
actor.equipWeapon(shotgun);
player._shootCooldown = 0;
player._isReloading = false;
TouchInput._rightPressed = true; // Visée active

const shotSucceeded = player.performAttack(); // Clic gauche normal
if (!shotSucceeded) {
    console.error("❌ performAttack() aurait dû déclencher le tir à distance pour une arme à feu");
    process.exit(1);
}
if (actor.getLoadedAmmo(shotgun) !== 4) {
    console.error(`❌ Munition non consommée en coup par coup : attendu 4, obtenu ${actor.getLoadedAmmo(shotgun)}`);
    process.exit(1);
}
if (player._shootCooldown <= 0) {
    console.error("❌ Le cooldown de tir aurait dû être appliqué en coup par coup");
    process.exit(1);
}
console.log("✅ 6.5. Tir au coup par coup (semi-auto) via performAttack() : OK");

// 7. HUD d'arme (Sprite_WeaponHUD) et contrôle de visibilité
const hud = new Sprite_WeaponHUD();
hud.update();
if (hud.x <= 0 || hud.y <= 0) {
    console.error("❌ Coordonnées de position du HUD arme invalides");
    process.exit(1);
}
if (!hud.visible) {
    console.error("❌ Sprite_WeaponHUD devrait être visible par défaut");
    process.exit(1);
}

// Test désactivation via $gameSystem.setWeaponHudVisible(false)
$gameSystem.setWeaponHudVisible(false);
hud.update();
if (hud.visible) {
    console.error("❌ Sprite_WeaponHUD devrait être invisible après setWeaponHudVisible(false)");
    process.exit(1);
}

// Test bascule via $gameSystem.toggleWeaponHud()
$gameSystem.toggleWeaponHud();
hud.update();
if (!hud.visible) {
    console.error("❌ Sprite_WeaponHUD devrait redevenir visible après toggleWeaponHud()");
    process.exit(1);
}

// Test contrôle global via SC4.hideHud() / SC4.showHud()
SC4.hideHud();
hud.update();
if (hud.visible) {
    console.error("❌ Sprite_WeaponHUD devrait être masqué après SC4.hideHud()");
    process.exit(1);
}

SC4.showHud();
hud.update();
if (!hud.visible) {
    console.error("❌ Sprite_WeaponHUD devrait être réaffiché après SC4.showHud()");
    process.exit(1);
}
console.log("✅ 7. Sprite_WeaponHUD et contrôle de visibilité (show/hide/toggle) : OK");

// 8. Armes avec <specialAnim> : fallback automatique reloadAction et animation de tir shot_[NAME]
const revolverGruk = {
    id: 31,
    name: "Revolver Gruk",
    note: "<range:8><rateOfFire:25><specialAnim:onehandgun><skillId:10><reload:true><reloadMode:1by1><ammoCap:6><ammoId:10><rechargeTime:20><reloadMove:true>"
};
actor.equipWeapon(revolverGruk);
actor.setLoadedAmmo(revolverGruk, 6);
const grukStats = actor.gunfightStats();

if (grukStats.specialAnim !== "onehandgun") {
    console.error(`❌ specialAnim attendu 'onehandgun', obtenu: ${grukStats.specialAnim}`);
    process.exit(1);
}
if (grukStats.reloadAction !== "onehandgun") {
    console.error(`❌ reloadAction aurait dû hériter de specialAnim ('onehandgun'), obtenu: ${grukStats.reloadAction}`);
    process.exit(1);
}

// Test animation de recharge statique (reload_onehandgun)
player._isActing = false;
player._action = "walk";
player._isReloading = true;
player._moving = false;
TouchInput._rightPressed = false;
if (player.action() !== "reload_onehandgun") {
    console.error(`❌ Action de reload statique attendue 'reload_onehandgun', obtenu: ${player.action()}`);
    process.exit(1);
}

// Test animation de recharge en déplacement (walkreload_onehandgun)
player._moving = true;
if (player.action() !== "walkreload_onehandgun") {
    console.error(`❌ Action de reload en déplacement attendue 'walkreload_onehandgun', obtenu: ${player.action()}`);
    process.exit(1);
}
player._isReloading = false;
player._moving = false;

// Test animation de tir shot_onehandgun
player._shootCooldown = 0;
TouchInput._rightPressed = true;
player.performGunfightShoot();
if (player._action !== "shot_onehandgun") {
    console.error(`❌ Action d'animation de tir attendue 'shot_onehandgun', obtenu: ${player._action}`);
    process.exit(1);
}
if (player._actionMaxFrames !== 4) {
    console.error(`❌ Nombre de frames pour l'animation shot_onehandgun attendu 4 (depuis le notetag de la compétence), obtenu: ${player._actionMaxFrames}`);
    process.exit(1);
}

// Test résolution des candidats dans Bitmap_Composite
const shotCandidates = Bitmap_Composite.resolveActionCandidates("shot_onehandgun");
if (!shotCandidates.includes("shot_onehandgun") || !shotCandidates.includes("atk_onehandgun") || !shotCandidates.includes("walk")) {
    console.error(`❌ Résolution des candidats pour shot_onehandgun invalide: ${JSON.stringify(shotCandidates)}`);
    process.exit(1);
}
const walkreloadCandidates = Bitmap_Composite.resolveActionCandidates("walkreload_onehandgun");
if (!walkreloadCandidates.includes("walkreload_onehandgun") || !walkreloadCandidates.includes("reload_onehandgun") || !walkreloadCandidates.includes("walk")) {
    console.error(`❌ Résolution des candidats pour walkreload_onehandgun invalide: ${JSON.stringify(walkreloadCandidates)}`);
    process.exit(1);
}
// Test locomotion normale (walk_onehandgun et dash_onehandgun)
player._isActing = false;
player._isReloading = false;
player._moving = false;
player._dashing = false;
TouchInput._rightPressed = false;
if (player.action() !== "walk_onehandgun") {
    console.error(`❌ Action de marche statique attendue 'walk_onehandgun', obtenu: ${player.action()}`);
    process.exit(1);
}

player._moving = true;
if (player.action() !== "walk_onehandgun") {
    console.error(`❌ Action de marche en déplacement attendue 'walk_onehandgun', obtenu: ${player.action()}`);
    process.exit(1);
}

player._dashing = true;
if (player.action() !== "run_onehandgun") {
    console.error(`❌ Action de course attendue 'run_onehandgun', obtenu: ${player.action()}`);
    process.exit(1);
}
player._dashing = false;
player._moving = false;

// Test déséquipement : retour au 'walk' par défaut
player._action = "walk";
actor.equipWeapon(null);
if (player.action() !== "walk") {
    console.error(`❌ Action après déséquipement attendue 'walk', obtenu: ${player.action()}`);
    process.exit(1);
}
actor.equipWeapon(revolverGruk);

console.log("✅ 8. Support <specialAnim> (walk_onehandgun, dash_onehandgun, reload_onehandgun, shot_onehandgun) : OK");

// 9. Test de recentrage automatique et réajustement du scroll (adjustCenterScroll)
player._realX = 30;
player._realY = 25;
global.$gameMap._displayX = 0;
global.$gameMap._displayY = 0;
player._moving = false;

// Le joueur est décentré : scrolledX() = 30 alors que centerX() = 12.5 (diff = 17.5)
if (Math.abs(player.scrolledX() - player.centerX()) < 1) {
    console.error("❌ Le joueur devrait être décentré avant adjustCenterScroll()");
    process.exit(1);
}

// En mouvement, adjustCenterScroll compense immédiatement tout décentrage
player._moving = true;
player.adjustCenterScroll();
if (Math.abs(player.scrolledX() - player.centerX()) > 0.01) {
    console.error(`❌ Écran mal recentré en X lors du déplacement : scrolledX=${player.scrolledX()}, attendu=${player.centerX()}`);
    process.exit(1);
}
if (Math.abs(player.scrolledY() - player.centerY()) > 0.01) {
    console.error(`❌ Écran mal recentré en Y lors du déplacement : scrolledY=${player.scrolledY()}, attendu=${player.centerY()}`);
    process.exit(1);
}

// Test respect des bordures infranchissables de la carte
player._realX = 2; // Bordure gauche de la carte
global.$gameMap._displayX = 0;
player.adjustCenterScroll();
if (global.$gameMap._displayX < 0) {
    console.error(`❌ La carte ne doit jamais défiler au-delà de la bordure gauche (displayX: ${global.$gameMap._displayX})`);
    process.exit(1);
}
console.log("✅ 9. Réajustement automatique du scroll et recentrage fluide de la caméra (adjustCenterScroll) : OK");

// 10. Test du maintien de posture en tir en rafale (Burst Shooting)
// Équipement du fusil d'assaut (burst: true)
actor.equipWeapon(rifle);
actor.setLoadedAmmo(rifle, 30);
player._shootCooldown = 0;
TouchInput._rightPressed = true; // Visée active
TouchInput._pressed = true;      // Clic gauche maintenu

// Déclenchement du tir en rafale
player.performGunfightShoot();
if (!player.isBurstShooting()) {
    console.error("❌ isBurstShooting() attendu true avec clic droit + clic gauche + arme burst");
    process.exit(1);
}

// Fin de l'animation d'action du tir (action terminée mais les deux clics restent maintenus)
player._isActing = false;
// L'action ne doit PAS repasser immédiatement à 'walk'
const burstAction = player.action();
if (burstAction === "walk") {
    console.error(`❌ L'action en cours de rafale ne doit pas repasser à 'walk' entre les tirs : obtenu ${burstAction}`);
    process.exit(1);
}

// Clic gauche relâché : fin de la rafale
TouchInput._pressed = false;
if (player.isBurstShooting()) {
    console.error("❌ isBurstShooting() attendu false quand le clic gauche est relâché");
    process.exit(1);
}
player.update(true);
if (player.action() !== "guard") {
    console.error(`❌ Après fin de rafale avec visée maintenue, posture attendue 'guard', obtenu: ${player.action()}`);
    process.exit(1);
}

// Clic droit relâché : retour complet à la marche
TouchInput._rightPressed = false;
player.update(true);
if (player.action() !== "walk") {
    console.error(`❌ Après relâchement complet, posture attendue 'walk', obtenu: ${player.action()}`);
    process.exit(1);
}
console.log("✅ 10. Maintien de la posture de tir en rafale continue sans bascule intempestive vers walk : OK");

console.log("\n==============================================================");
console.log("🎉 TOUS LES TESTS DE L'ÉTAPE 15 (GUNFIGHT) SONT VALIDÉS !");
console.log("==============================================================");
