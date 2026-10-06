//=============================================================================
// RPG Maker MZ - Spriteset_FightGauges.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Ensemble de jauges de combat affichées au-dessus des ennemis (HP, MP, AT).
 * @author SimCraft
 * 
 * @help Spriteset_FightGauges.js
 * 
 * Conteneur d'affichage des jauges de combat au-dessus des ennemis actifs en mode ENGAGE :
 *   - Sprite_FightGaugeBase : fond noir pour l'ensemble des jauges (48x14px).
 *   - Sprite_FightGaugeAT   : jauge d'Attack Timer (48x2px, blanche), progresse vers l'attaque.
 *   - Sprite_FightGaugeHP   : jauge de PV (48x8px) avec dégradé dynamique selon le % de PV
 *                             (vert >80%, orange-vert 60-80%, orange 40-60%, rouge-orange 20-40%, rouge <20%),
 *                             et clignotement rouge vif / rouge sombre à moins de 10% de PV.
 *   - Sprite_FightGaugeMP   : jauge de Mana/MP (48x4px) avec dégradé bleu selon le % de MP.
 * 
 * Les jauges ne sont visibles que lorsque l'ennemi est vivant et en mode engagement ("engage").
 */

// ============================================================================
// 1. Sprite_FightGaugeBase
// ============================================================================
class Sprite_FightGaugeBase extends Sprite {
    constructor() {
        super();
        this.bitmap = new Bitmap(50, 16);
        this.drawBackground();
    }

    drawBackground() {
        const ctx = this.bitmap.context;
        if (!ctx) return;
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, 50, 16);
    }
}

// ============================================================================
// 2. Sprite_FightGaugeAT (Attack Timer : 48x2px blanche)
// ============================================================================
class Sprite_FightGaugeAT extends Sprite {
    constructor() {
        super();
        this.bitmap = new Bitmap(48, 2);
        this._lastRate = -1;
    }

    updateGauge(character) {
        let rate = 0;
        if (character && character.ai) {
            const ai = character.ai();
            if (ai && ai.attackFrequency && ai.attackFrequency() > 0) {
                rate = Math.min(1.0, Math.max(0.0, ai.attackTimer() / ai.attackFrequency()));
            }
        }

        if (rate !== this._lastRate) {
            this._lastRate = rate;
            this.redraw(rate);
        }
    }

    redraw(rate) {
        this.bitmap.clear();
        const ctx = this.bitmap.context;
        if (!ctx) return;

        // Fond noir / gris très sombre
        ctx.fillStyle = "#111111";
        ctx.fillRect(0, 0, 48, 2);

        // Remplissage blanc
        const fillW = Math.floor(48 * rate);
        if (fillW > 0) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, fillW, 2);
        }
    }
}

// ============================================================================
// 3. Sprite_FightGaugeHP (PV : 48x8px dégradé par %)
// ============================================================================
class Sprite_FightGaugeHP extends Sprite {
    constructor() {
        super();
        this.bitmap = new Bitmap(48, 8);
        this._lastRate = -1;
        this._blinkTimer = 0;
    }

    getGradientColors(rate) {
        if (rate > 0.80) {
            return ["#2ecc71", "#27ae60"]; // Vert -> Vert
        } else if (rate >= 0.60) {
            return ["#e67e22", "#2ecc71"]; // Orange -> Vert
        } else if (rate >= 0.40) {
            return ["#f39c12", "#d35400"]; // Orange -> Orange
        } else if (rate >= 0.20) {
            return ["#e74c3c", "#e67e22"]; // Rouge -> Orange
        } else {
            return ["#c0392b", "#962d22"]; // Rouge -> Rouge
        }
    }

    updateGauge(battler) {
        if (!battler || battler.mhp <= 0) return;
        const rate = Math.max(0.0, Math.min(1.0, battler.hp / battler.mhp));
        
        let needsRedraw = false;
        if (rate !== this._lastRate) {
            this._lastRate = rate;
            needsRedraw = true;
        }

        // Clignotement à moins de 10% (2 frames ON, 2 frames OFF)
        if (rate < 0.10 && battler.hp > 0) {
            this._blinkTimer++;
            needsRedraw = true;
        } else {
            this._blinkTimer = 0;
        }

        if (needsRedraw) {
            this.redraw(rate);
        }
    }

    redraw(rate) {
        this.bitmap.clear();
        const ctx = this.bitmap.context;
        if (!ctx) return;

        // Fond noir
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, 48, 8);

        const fillW = Math.floor(48 * rate);
        if (fillW <= 0) return;

        // Effet clignotement rouge vif (< 10%)
        let colors = this.getGradientColors(rate);
        if (rate < 0.10) {
            const isBlinkOn = Math.floor(this._blinkTimer / 2) % 2 === 0;
            colors = isBlinkOn ? ["#ff3333", "#ff1111"] : ["#880000", "#550000"];
        }

        const gradient = ctx.createLinearGradient(0, 0, fillW, 0);
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(1, colors[1]);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, fillW, 8);
    }
}

// ============================================================================
// 4. Sprite_FightGaugeMP (Mana / MP : 48x4px dégradé bleu)
// ============================================================================
class Sprite_FightGaugeMP extends Sprite {
    constructor() {
        super();
        this.bitmap = new Bitmap(48, 4);
        this._lastRate = -1;
    }

    getGradientColors(rate) {
        if (rate > 0.80) {
            return ["#5dade2", "#3498db"]; // Bleu clair -> Bleu clair
        } else if (rate >= 0.60) {
            return ["#2980b9", "#5dade2"]; // Bleu -> Bleu clair
        } else if (rate >= 0.40) {
            return ["#2471a3", "#1f618d"]; // Bleu -> Bleu
        } else if (rate >= 0.20) {
            return ["#1b4f72", "#2471a3"]; // Bleu foncé -> Bleu
        } else {
            return ["#154360", "#1b4f72"]; // Bleu très foncé -> Bleu foncé
        }
    }

    updateGauge(battler) {
        if (!battler) return;
        const rate = battler.mmp > 0 ? Math.max(0.0, Math.min(1.0, battler.mp / battler.mmp)) : 1.0;
        if (rate !== this._lastRate) {
            this._lastRate = rate;
            this.redraw(rate);
        }
    }

    redraw(rate) {
        this.bitmap.clear();
        const ctx = this.bitmap.context;
        if (!ctx) return;

        // Fond noir
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, 48, 4);

        const fillW = Math.floor(48 * rate);
        if (fillW <= 0) return;

        const colors = this.getGradientColors(rate);
        const gradient = ctx.createLinearGradient(0, 0, fillW, 0);
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(1, colors[1]);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, fillW, 4);
    }
}

// ============================================================================
// 5. Spriteset_FightGauges (Conteneur principal)
// ============================================================================
class Spriteset_FightGauges extends Sprite {
    /**
     * @param {Game_CharacterBase} character 
     */
    constructor(character) {
        super();
        this._character = character;
        this.initMembers();
        this.createGauges();
    }

    initMembers() {
        this.visible = false;
        this.anchor.x = 0.5;
        this.anchor.y = 1.0;
    }

    createGauges() {
        // Fond commun noir (50x16 pour marges de 1px)
        this._baseSprite = new Sprite_FightGaugeBase();
        this._baseSprite.x = -1;
        this._baseSprite.y = -1;
        this.addChild(this._baseSprite);

        // Jauge AT (Attack Timer) en haut : y = 0, h = 2
        this._atSprite = new Sprite_FightGaugeAT();
        this._atSprite.x = 0;
        this._atSprite.y = 0;
        this.addChild(this._atSprite);

        // Jauge HP (Vie) au milieu : y = 2, h = 8
        this._hpSprite = new Sprite_FightGaugeHP();
        this._hpSprite.x = 0;
        this._hpSprite.y = 2;
        this.addChild(this._hpSprite);

        // Jauge MP (Mana) en bas : y = 10, h = 4
        this._mpSprite = new Sprite_FightGaugeMP();
        this._mpSprite.x = 0;
        this._mpSprite.y = 10;
        this.addChild(this._mpSprite);
    }

    update() {
        super.update();

        const character = this._character;
        if (!character) {
            this.visible = false;
            return;
        }

        // Vérification des conditions d'affichage :
        // 1. Ennemi hostile
        const isHostile = typeof character.isHostile === "function" && character.isHostile();
        // 2. Vivant
        const battler = typeof character.battler === "function" ? character.battler() : null;
        const isAlive = battler && typeof battler.isDead === "function" && !battler.isDead();
        // 3. Mode engagement actif ("engage")
        const isEngage = typeof character.aiState === "function" && character.aiState() === "engage";

        const shouldShow = Boolean(isHostile && isAlive && isEngage);
        this.visible = shouldShow;
        if (!shouldShow) return;

        // Mise à jour des sous-jauges
        this._atSprite.updateGauge(character);
        this._hpSprite.updateGauge(battler);
        this._mpSprite.updateGauge(battler);

        this.updatePosition();
    }

    updatePosition() {
        if (!this.parent) return;

        // Centré horizontalement (-24px pour 48px de large)
        this.x = -24;

        let charHeight = 48;
        if (typeof this.parent.patternHeight === "function") {
            charHeight = this.parent.patternHeight();
        } else if (this.parent.height > 0) {
            charHeight = this.parent.height;
        }

        // Positionné au-dessus de la tête du personnage (et au-dessus de l'indicateur)
        this.y = -charHeight - 16;
    }
}

window.Sprite_FightGaugeBase = Sprite_FightGaugeBase;
window.Sprite_FightGaugeAT   = Sprite_FightGaugeAT;
window.Sprite_FightGaugeHP   = Sprite_FightGaugeHP;
window.Sprite_FightGaugeMP   = Sprite_FightGaugeMP;
window.Spriteset_FightGauges = Spriteset_FightGauges;
