//=============================================================================
// RPG Maker MZ - Sprite_CharacterIndicator.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Affiche des indicateurs visuels au-dessus des personnages (Sprite_CharacterIndicator).
 * @author SimCraft
 * 
 * @help Sprite_CharacterIndicator.js
 * 
 * Composant graphique affichant des indicateurs animés au-dessus de la tête des personnages.
 * Utilise l'image img/ui/indicator.png (lignes de 3 frames de 32x32px) :
 *   - Ligne 0 : Point d'exclamation (!)
 *   - Ligne 1 : Point d'interrogation rouge (?)
 *   - Ligne 2 : Point d'interrogation jaune (?)
 * 
 * Animation (durée 60 frames / 1s) :
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
    }

    loadBitmap() {
        if (typeof ImageManager !== "undefined" && ImageManager.loadBitmap) {
            this.bitmap = ImageManager.loadBitmap("img/ui/", "indicator");
        }
    }

    /**
     * Ajoute une demande d'indicateur à la file d'attente.
     * @param {string|number} type "exclamation", "question_red", "question_yellow" ou index de ligne 0..2
     */
    request(type) {
        const row = this.typeToRow(type);
        if (this._active) {
            this._queue.push(row);
        } else {
            this.startIndicator(row);
        }
    }

    typeToRow(type) {
        if (typeof type === "number") return type;
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
                return 0;
        }
    }

    startIndicator(row) {
        this._currentRow = row;
        this._animTimer = 0;
        this._active = true;
        this.visible = true;
        this.opacity = 0;
        this.scale.set(0.1, 0.1);
        this._offsetY = 0;
        this.setFrame(0, this._currentRow * 32, 32, 32);
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

        // Découpe de la frame (8 frames par tile, 3 tiles par ligne)
        const frameIndex = Math.floor(this._animTimer / 8) % 3;
        this.setFrame(frameIndex * 32, this._currentRow * 32, 32, 32);

        if (this._animTimer <= 15) {
            // Phase 1 : Apparition (15 frames)
            // FadeIn + zoom 0.1 à 1.0 + élévation 10px
            const t = this._animTimer / 15;
            this.opacity = Math.round(255 * t);
            const scale = 0.1 + 0.9 * t;
            this.scale.set(scale, scale);
            this._offsetY = -10 * t;
        } else if (this._animTimer <= 45) {
            // Phase 2 : Maintien (30 frames)
            this.opacity = 255;
            this.scale.set(1.0, 1.0);
            this._offsetY = -10;
        } else if (this._animTimer < 60) {
            // Phase 3 : Disparition (15 frames)
            // FadeOut + zoom 1.0 à 1.5 + élévation 20px supplémentaires
            const t = (this._animTimer - 45) / 15;
            this.opacity = Math.round(255 * (1 - t));
            const scale = 1.0 + 0.5 * t;
            this.scale.set(scale, scale);
            this._offsetY = -10 - 20 * t;
        } else {
            // Fin des 60 frames (1 seconde)
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

window.Sprite_CharacterIndicator = Sprite_CharacterIndicator;
