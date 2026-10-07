//=============================================================================
// Sprite_Hero.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Sprite d'affichage et d'animation pour le Hero (Paperdoll 96x96, 8 dir).
 * @author SimCraft
 * @help
 * ============================================================================
 * Sprite_Hero.js
 * ============================================================================
 * Hérite de Sprite_Character. Affiche le personnage Hero avec :
 * - Découpe de cases en 96x96 pixels.
 * - 3 colonnes de frames (colonne 1 = repos/idle).
 * - 8 lignes de direction (0:Bas, 1:Gauche, 2:Droite, 3:Haut, 4:BG, 5:BD, 6:HG, 7:HD).
 * - Récupération et composition dynamique du Bitmap via Bitmap_Composite.
 * ============================================================================
 */

/**
 * Sprite spécialisé pour les héros dans SC4.
 */
class Sprite_Hero extends Sprite_Character {
    initMembers() {
        super.initMembers();
        this._frameWidth = 96;
        this._frameHeight = 96;
        this._currentAction = "walk";
        this._compositeEntry = null;
        this._lastCacheKey = "";
        this._indicatorSprite = null;
        this._fightGauges = null;
        this._dashBufferTimer = 0;
    }

    setCharacter(character) {
        super.setCharacter(character);
        this.setupCharacterChildren();
    }

    setupCharacterChildren() {
        if (!this._indicatorSprite && typeof Sprite_CharacterIndicator !== "undefined") {
            this._indicatorSprite = new Sprite_CharacterIndicator(this._character);
            this.addChild(this._indicatorSprite);
        }
        if (!this._fightGauges && typeof Spriteset_FightGauges !== "undefined") {
            this._fightGauges = new Spriteset_FightGauges(this._character);
            this.addChild(this._fightGauges);
        }
    }

    /**
     * Résout l'action courante en évitant les micro-sauts intempestifs entre dash et walk
     * lors des transitions entre deux tuiles sur la map.
     */
    resolveAction() {
        if (!this._character) return "walk";
        const charAction = this._character.action ? this._character.action() : "walk";
        if (charAction === "dash") {
            this._dashBufferTimer = 6;
            return "dash";
        }
        if (this._currentAction === "dash" && charAction === "walk") {
            const isDashing = typeof this._character.isDashing === "function" && this._character.isDashing();
            if (isDashing && this._dashBufferTimer > 0) {
                this._dashBufferTimer--;
                return "dash";
            }
        }
        this._dashBufferTimer = 0;
        return charAction;
    }

    /**
     * Met à jour le bitmap du héros depuis Bitmap_Composite.
     */
    updateBitmap() {
        if (this.isImageChanged()) {
            this._characterName = this._character.characterName();
            this.setHeroBitmap();
        }
    }

    /**
     * Détecte si l'action, l'équipement ou l'image a changé.
     */
    isImageChanged() {
        const hero = this.getHero();
        const action = this.resolveAction();
        const actionChanged = this._currentAction !== action;

        if (hero) {
            const currentKey = hero.getCompositeCacheKey(action);
            if (this._lastCacheKey !== currentKey) {
                return true;
            }
        } else if (this._lastCacheKey !== "") {
            return true;
        }

        return super.isImageChanged() || actionChanged || !this.bitmap;
    }

    /**
     * Récupère le Game_Hero associé au personnage (Game_Player, Game_Follower, etc.).
     */
    getHero() {
        return this._character.hero ? this._character.hero() : null;
    }

    /**
     * Configure le bitmap composite du héros (ou standard si non-Hero).
     */
    setHeroBitmap() {
        const hero = this.getHero();
        if (hero) {
            this._currentAction = this.resolveAction();
            this._lastCacheKey = hero.getCompositeCacheKey(this._currentAction);
            this._compositeEntry = hero.getCompositeEntry(this._currentAction);

            if (this._compositeEntry) {
                this.bitmap = this._compositeEntry.bitmap;
                // Si déjà composé, force rafraîchissement immédiat de la frame
                if (this._compositeEntry.isComposed && this._frame) {
                    this._frame.width = 0;
                }
            }
        } else {
            this._compositeEntry = null;
            this._lastCacheKey = "";
            this.setCharacterBitmap();
        }
    }

    /**
     * Surcharge de update : compose le bitmap dès que toutes les couches sont prêtes.
     */
    update() {
        super.update();
        this.updateCompositeAssembly();
    }

    /**
     * Vérifie si le composite doit être assemblé (asynchrone).
     */
    updateCompositeAssembly() {
        if (this._compositeEntry && !this._compositeEntry.isComposed) {
            const composer = this._compositeEntry.composer;
            if (composer && composer.isReady()) {
                composer.bltComposite(this._compositeEntry.bitmap);
                this._compositeEntry.isComposed = true;
                // Force le rafraîchissement immédiat de la frame
                if (this._frame) {
                    this._frame.width = 0;
                }
            }
        }
    }

    /**
     * Gestion de la visibilité des personnages (followers masqués, events masqués en équipe, etc.).
     */
    isEmptyCharacter() {
        if (this._character && typeof this._character.isInPartyHidden === "function" && this._character.isInPartyHidden()) {
            return true;
        }
        if (this.getHero()) {
            if (this._character && typeof this._character.isVisible === "function" && !this._character.isVisible()) {
                return true;
            }
            return false;
        }
        return super.isEmptyCharacter();
    }

    patternWidth() {
        return this.getHero() ? this._frameWidth : super.patternWidth();
    }

    patternHeight() {
        return this.getHero() ? this._frameHeight : super.patternHeight();
    }

    characterBlockX() {
        return this.getHero() ? 0 : super.characterBlockX();
    }

    characterBlockY() {
        return this.getHero() ? 0 : super.characterBlockY();
    }

    characterPatternX() {
        if (this._character) {
            const act = typeof this._character.action === "function" ? this._character.action() : "walk";
            if (act !== "walk" && act !== "dash") {
                const pattern = typeof this._character.actionPattern === "function" ? this._character.actionPattern() : 0;
                return this.getHero() ? pattern : (pattern % 3);
            }
            if (typeof this._character.isActing === "function" && this._character.isActing()) {
                const pattern = this._character.actionPattern();
                return this.getHero() ? pattern : (pattern % 3);
            }
        }
        if (this.getHero()) {
            return this._character.pattern(); // 0, 1 (repos), 2
        }
        return super.characterPatternX();
    }

    characterPatternY() {
        if (this.getHero()) {
            const dir = this._character.direction();
            // Mappage 8 directions vers lignes 0..7
            const DIR_TO_ROW = {
                2: 0, // Bas (South)
                4: 1, // Gauche (West)
                6: 2, // Droite (East)
                8: 3, // Haut (North)
                1: 4, // Bas-Gauche (South-West)
                3: 5, // Bas-Droite (South-East)
                7: 6, // Haut-Gauche (North-West)
                9: 7  // Haut-Droite (North-East)
            };
            return DIR_TO_ROW[dir] ?? 0;
        }
        return super.characterPatternY();
    }
}

window.Sprite_Hero = Sprite_Hero;
