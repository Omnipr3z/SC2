//=============================================================================
// RPG Maker MZ - SC4_Sprite_CharacterIndicator.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Affiche des indicateurs visuels au-dessus des personnages (Sprite_CharacterIndicator).
 * @author SimCraft
 * 
 * @help Sprite_CharacterIndicator.js
 * 
 * Composant graphique affichant des indicateurs animés au-dessus de la tête des personnages.
 * Entièrement agnostique et extensible :
 * Par défaut, utilise les alertes d'ennemis dans img/GUI/indicators/ennemyAlert.png (3 frames de 32x32px par ligne) :
 *   - Ligne 0 : Point d'exclamation (!) (exclamation, engage)
 *   - Ligne 1 : Point d'interrogation rouge (?) (question_red, search)
 *   - Ligne 2 : Point d'interrogation jaune (?) (question_yellow, neutral)
 * 
 * Supporte d'autres feuilles d'indicateurs (ex: affinité/coeur, quêtes, interactions) via
 * Sprite_CharacterIndicator.registerIndicator(type, config).
 * 
 * Animation (durée 60 frames / 1s par défaut) :
 *   - 15f d'apparition (fadeIn, zoom 0.1 à 1.0, montée de 10px)
 *   - 30f de maintien au-dessus de la tête
 *   - 15f de disparition (fadeOut, zoom 1.0 à 1.5, montée de 20px supplémentaires)
 * 
 * Gère une file d'attente (waitlist) pour jouer les indicateurs séquentiellement.
 */

class Sprite_CharacterIndicator extends Sprite {
    /**
     * @param {Game_CharacterBase} character 
     */
    constructor(character) {
        super();
        this._character = character;
        this.initMembers();
        this.loadBitmap();
    }

    initMembers() {
        this.anchor.x = 0.5;
        this.anchor.y = 1.0;
        this.visible = false;
        this.opacity = 0;
        this._active = false;
        this._currentRow = 0;
        this._animTimer = 0;
        this._queue = [];
        this._offsetY = 0;
        this._currentConfig = null;
        this._loadedFolder = null;
        this._loadedFile = null;
    }

    loadBitmap(folder = "img/GUI/indicators/", file = "ennemyAlert") {
        if (this._loadedFolder === folder && this._loadedFile === file && this.bitmap) {
            return;
        }
        this._loadedFolder = folder;
        this._loadedFile = file;
        if (typeof ImageManager !== "undefined" && ImageManager.loadBitmap) {
            this.bitmap = ImageManager.loadBitmap(folder, file);
        }
    }

    /**
     * Enregistre un nouveau type d'indicateur agnostique.
     * @param {string} type 
     * @param {object} config { folder, file, row, frameWidth, frameHeight, frameCount, duration }
     */
    static registerIndicator(type, config) {
        if (!this.DEFINITIONS) this.DEFINITIONS = {};
        this.DEFINITIONS[String(type).toLowerCase().trim()] = config;
    }

    /**
     * Ajoute une demande d'indicateur à la file d'attente.
     * @param {string|number|object} type "exclamation", "question_red", "question_yellow", "heart", "quest", etc.
     */
    request(type) {
        const item = this.typeToRow(type);
        if (this._active) {
            this._queue.push(item);
        } else {
            this.startIndicator(item);
        }
    }

    typeToRow(type) {
        if (typeof type === "number") return type;
        if (typeof type === "object" && type !== null) return type;
        const normalized = String(type).toLowerCase().trim();
        switch (normalized) {
            case "exclamation":
            case "engage":
            case "!":
                return 0; // Ligne 1 : Exclamation
            case "question_red":
            case "search":
            case "red_question":
                return 1; // Ligne 2 : Point d'interrogation rouge
            case "question_yellow":
            case "neutral":
            case "yellow_question":
                return 2; // Ligne 3 : Point d'interrogation jaune
            default:
                if (Sprite_CharacterIndicator.DEFINITIONS && Sprite_CharacterIndicator.DEFINITIONS[normalized]) {
                    return normalized;
                }
                return 0;
        }
    }

    resolveConfig(item) {
        const defaultConfig = {
            folder: "img/GUI/indicators/",
            file: "ennemyAlert",
            row: 0,
            frameWidth: 32,
            frameHeight: 32,
            frameCount: 3,
            duration: 60
        };

        if (typeof item === "number") {
            return Object.assign({}, defaultConfig, { row: item });
        }
        if (typeof item === "string") {
            const def = (Sprite_CharacterIndicator.DEFINITIONS && Sprite_CharacterIndicator.DEFINITIONS[item.toLowerCase()]) || null;
            if (def) {
                return Object.assign({}, defaultConfig, def);
            }
            return defaultConfig;
        }
        if (typeof item === "object" && item !== null) {
            return Object.assign({}, defaultConfig, item);
        }
        return defaultConfig;
    }

    startIndicator(item) {
        const config = this.resolveConfig(item);
        this._currentConfig = config;
        this._currentRow = config.row;
        this._animTimer = 0;
        this._active = true;
        this.visible = true;
        this.opacity = 0;
        this.scale.set(0.1, 0.1);
        this._offsetY = 0;

        this.loadBitmap(config.folder, config.file);
        this.setFrame(0, this._currentRow * config.frameHeight, config.frameWidth, config.frameHeight);
    }

    update() {
        super.update();

        // Récupération des requêtes déposées sur le personnage
        if (this._character && this._character._indicatorQueue && this._character._indicatorQueue.length > 0) {
            while (this._character._indicatorQueue.length > 0) {
                const req = this._character._indicatorQueue.shift();
                this.request(req);
            }
        }

        if (!this._active) {
            if (this._queue.length > 0) {
                this.startIndicator(this._queue.shift());
            } else {
                this.visible = false;
                return;
            }
        }

        this.updateAnimation();
        this.updatePosition();
    }

    updateAnimation() {
        this._animTimer++;
        const config = this._currentConfig || {
            frameWidth: 32,
            frameHeight: 32,
            frameCount: 3,
            duration: 60
        };

        const duration = config.duration || 60;
        const fadeInEnd = Math.max(1, Math.round(duration * 0.25));
        const holdEnd = Math.max(fadeInEnd + 1, Math.round(duration * 0.75));
        const frameCount = config.frameCount || 3;

        // Découpe de la frame (8 frames par tile)
        const frameIndex = Math.floor(this._animTimer / 8) % frameCount;
        this.setFrame(frameIndex * config.frameWidth, this._currentRow * config.frameHeight, config.frameWidth, config.frameHeight);

        if (this._animTimer <= fadeInEnd) {
            // Phase 1 : Apparition
            const t = this._animTimer / fadeInEnd;
            this.opacity = Math.round(255 * t);
            const scale = 0.1 + 0.9 * t;
            this.scale.set(scale, scale);
            this._offsetY = -10 * t;
        } else if (this._animTimer <= holdEnd) {
            // Phase 2 : Maintien
            this.opacity = 255;
            this.scale.set(1.0, 1.0);
            this._offsetY = -10;
        } else if (this._animTimer < duration) {
            // Phase 3 : Disparition
            const t = (this._animTimer - holdEnd) / (duration - holdEnd);
            this.opacity = Math.round(255 * (1 - t));
            const scale = 1.0 + 0.5 * t;
            this.scale.set(scale, scale);
            this._offsetY = -10 - 20 * t;
        } else {
            // Fin de la durée
            this._active = false;
            this.opacity = 0;
            if (this._queue.length > 0) {
                this.startIndicator(this._queue.shift());
            } else {
                this.visible = false;
            }
        }
    }

    updatePosition() {
        if (!this.parent) return;

        // Centré horizontalement au-dessus de la tête du personnage
        this.x = 0;
        
        let charHeight = 48;
        if (typeof this.parent.patternHeight === "function") {
            charHeight = this.parent.patternHeight();
        } else if (this.parent.height > 0) {
            charHeight = this.parent.height;
        }

        this.y = -charHeight + this._offsetY;
    }
}

// Registre d'indicateurs agnostiques extensibles
Sprite_CharacterIndicator.DEFINITIONS = {
    // Alertes Ennemis (img/GUI/indicators/ennemyAlert.png)
    "exclamation":     { folder: "img/GUI/indicators/", file: "ennemyAlert", row: 0, frameWidth: 32, frameHeight: 32, frameCount: 3, duration: 60 },
    "engage":          { folder: "img/GUI/indicators/", file: "ennemyAlert", row: 0, frameWidth: 32, frameHeight: 32, frameCount: 3, duration: 60 },
    "!":               { folder: "img/GUI/indicators/", file: "ennemyAlert", row: 0, frameWidth: 32, frameHeight: 32, frameCount: 3, duration: 60 },
    "question_red":    { folder: "img/GUI/indicators/", file: "ennemyAlert", row: 1, frameWidth: 32, frameHeight: 32, frameCount: 3, duration: 60 },
    "search":          { folder: "img/GUI/indicators/", file: "ennemyAlert", row: 1, frameWidth: 32, frameHeight: 32, frameCount: 3, duration: 60 },
    "red_question":    { folder: "img/GUI/indicators/", file: "ennemyAlert", row: 1, frameWidth: 32, frameHeight: 32, frameCount: 3, duration: 60 },
    "question_yellow": { folder: "img/GUI/indicators/", file: "ennemyAlert", row: 2, frameWidth: 32, frameHeight: 32, frameCount: 3, duration: 60 },
    "neutral":         { folder: "img/GUI/indicators/", file: "ennemyAlert", row: 2, frameWidth: 32, frameHeight: 32, frameCount: 3, duration: 60 },
    "yellow_question": { folder: "img/GUI/indicators/", file: "ennemyAlert", row: 2, frameWidth: 32, frameHeight: 32, frameCount: 3, duration: 60 },

    // Futurs indicateurs de relation, quêtes, interactions
    "heart":           { folder: "img/GUI/indicators/", file: "heart", row: 0, frameWidth: 32, frameHeight: 32, frameCount: 3, duration: 60 },
    "quest":           { folder: "img/GUI/indicators/", file: "quest", row: 0, frameWidth: 32, frameHeight: 32, frameCount: 3, duration: 60 },
    "quest_ready":     { folder: "img/GUI/indicators/", file: "quest_ready", row: 0, frameWidth: 32, frameHeight: 32, frameCount: 3, duration: 60 }
};

window.Sprite_CharacterIndicator = Sprite_CharacterIndicator;
