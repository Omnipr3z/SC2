//=============================================================================
// Sprite_HudStats.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SimCraft] Module du HUD pour l'affichage des statistiques et de l'XP.
 * @author PAHernandez
 *
 * @help
 */

class Sprite_HudStats extends Sprite_HudModule {
    initialize() {
        super.initialize();
        this._expVisu = 0;
    }
    get actor() { return $gameParty.leader(); }
    get hp() { return this.actor ? this.actor.hp : 0; }
    get lvl() { return this.actor ? this.actor._level : 0; }
    get currentExp() { return this.actor ? this.actor.currentExp() : 0; }
    get nextExp() { return this.actor ? this.actor.nextRequiredExp() : 1; }

    getCurrentData() {
        return {
            hp: this.hp,
            level: this.lvl,
            currentExp: this.currentExp,
            nextExp: this.nextExp,
            expVisu: this._expVisu
        };
    }

    update() {
        if (this.visible) {
            this.updateExpAnimation();
        }
        super.update();
    }

    updateExpAnimation() {
        const realExp = this.currentExp;
        if (this._expVisu > realExp) {
            this._expVisu = 0;
        } else if (this._expVisu < realExp) {
            this._expVisu++;
        }
    }

    // --- RENDU ---
    drawContent() {

        this.drawStatsTab(-7, 7);
        this.drawHealthTab(-7, 2);
        this.drawMapHudLife(0);

        const lvl = this.getLevel();
        const current = this.expVisu;
        const nextLvl = this.getNextExp();
        const txt = " Lvl:" + lvl + "   Exp:" + current + "   Next lvl at:" + nextLvl;

        const width = 180;
        const fillW = width * (current / (nextLvl + current));

        this.bitmap.fillRect(15, 143, width + 2, 4, "#121216");
        this.bitmap.fillRect(16, 144, fillW, 2, this.systemColor());

        this.bitmap.textColor = this.systemColor();
        this.drawText(txt, 16, 138, width, 'left');
    }
    drawStatsTab(x, y) {

    }
    drawHealthTab(x, y) { }
    drawMapHudLife(yOffset) { }
}