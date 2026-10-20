//=============================================================================
// RPG Maker MZ - Window_SpaceTargetInfo
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Volet de télémétrie de la cible sélectionnée avec Scroll Y.
 * @author SimCraft
 *
 * @help SC4_Window_SpaceTargetInfo.js
 */

class Window_SpaceTargetInfo extends Window_Base {
    constructor(rect) {
        super(rect);
        this._targetData = null;
        this._targetType = ""; // system | planet | poi
        this._contextScene = "system"; // sector | system | subsystem
        this._scrollY = 0;
        this._maxScrollY = 0;
    }

    setContext(ctx) {
        this._contextScene = ctx;
        this.refresh();
    }

    setTarget(type, data) {
        this._targetType = type;
        this._targetData = data;
        this._scrollY = 0;
        this.refresh();
    }

    update() {
        super.update();
        this.processWheel();
    }

    processWheel() {
        if (this.isOpen() && this.visible && this._maxScrollY > 0) {
            const threshold = 15;
            if (TouchInput.wheelY >= threshold && this._scrollY < this._maxScrollY) {
                this._scrollY = Math.min(this._maxScrollY, this._scrollY + 20);
                this.refresh();
            } else if (TouchInput.wheelY <= -threshold && this._scrollY > 0) {
                this._scrollY = Math.max(0, this._scrollY - 20);
                this.refresh();
            }
        }
    }

    refresh() {
        this.contents.clear();
        const loc = (k, def) => typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(k, def) : def;
        const width = this.contentsWidth();
        const height = this.contentsHeight();

        // 1. AUCUNE CIBLE SÉLECTIONNÉE : AFFICHAGE DU TUTO CONTEXTUEL
        if (!this._targetData) {
            this._maxScrollY = 0;
            let tutoRaw = "";
            let headerTitle = "";
            if (this._contextScene === "sector") {
                headerTitle = loc("travel.tuto_sector_header", "◈ NAVIGATION SECTORIELLE & SAUTS WARP FTL");
                tutoRaw = loc("travel.tuto_sector", "");
            } else if (this._contextScene === "subsystem") {
                headerTitle = loc("travel.tuto_subsystem_header", "◈ DÉBARQUEMENT & COMMUNICATIONS SUBCOM");
                tutoRaw = loc("travel.tuto_subsystem", "");
            } else {
                headerTitle = loc("travel.tuto_system_header", "◈ CONSOLE DE NAVIGATION STELLAIRE & PROPULSION");
                tutoRaw = loc("travel.tuto_system", "");
            }

            this.contents.fontSize = 14;
            this.contents.textColor = "#fabd2f";
            this.drawText(headerTitle, 16, 6, width - 32, "left");

            const lines = tutoRaw.split("\n");
            let y = 30;
            this.contents.fontSize = 12;
            this.contents.textColor = "#d5c4a1";
            lines.forEach(l => {
                this.drawText(l, 16, y, width - 32, "left");
                y += 20;
            });
            return;
        }

        // 2. CIBLE SÉLECTIONNÉE : AFFICHAGE DÉTAILLÉ AVEC IMAGE/ICÔNE ET SCROLL Y
        const data = this._targetData;
        const originY = -this._scrollY;

        let textX = 16;
        if (this._targetType === "poi") {
            const iconIndex = (data.icon && typeof data.icon === "number") ? data.icon : 16;
            this.drawIcon(iconIndex, 16, 12 + originY);
            textX = 64;
        } else if (this._targetType === "planet" || this._targetType === "system") {
            const bmpName = data.bitmapName || (this._targetType === "system" ? "sun" : "planet_0");
            const bmp = ImageManager.loadBitmap("img/GUI/ship/", bmpName);
            if (bmp && bmp.isReady()) {
                const img = bmp._image || bmp._canvas;
                if (img && this.contents.context) {
                    this.contents.context.drawImage(img, 0, 0, img.width, img.height, 16, 10 + originY, 56, 56);
                }
            } else {
                this.contents.fillRect(16, 10 + originY, 56, 56, "#1d2021");
                this.contents.strokeStyle = "#8ec07c";
                this.contents.strokeRect(16, 10 + originY, 56, 56);
            }
            textX = 84;
        }

        const textW = width - textX - 16;

        this.contents.fontSize = 18;
        this.contents.textColor = "#fabd2f";
        const targetTitle = data.name ? (typeof SC4_Localization !== "undefined" ? SC4_Localization.parse(data.name) : data.name) : loc("travel.target_default", "Cible");
        this.drawText(targetTitle, textX, 4 + originY, textW, "left");

        this.contents.fontSize = 12;
        this.contents.textColor = "#8ec07c";
        const typeStr = data.type || (this._targetType === "system" ? loc("travel.target_system_solar", "Système Solaire") : loc("travel.target_poi", "Point d'Intérêt"));
        this.drawText(`${loc("travel.target_type", "Type")}: ${typeStr}`, textX, 26 + originY, textW, "left");

        this.contents.fontSize = 12;
        this.contents.textColor = "#ebdbb2";
        const desc = data.description || loc("travel.no_telemetry", "Aucune télémesure disponible.");
        const descLines = String(desc).split("\n");
        let curY = 46 + originY;
        descLines.forEach(line => {
            this.drawText(line, textX, curY, textW, "left");
            curY += 18;
        });
        curY += 6;

        // Quête active liée
        const qm = window.$gameQuests;
        let questInfo = null;
        if (qm) {
            if (this._targetType === "poi" && data.id) {
                const indicators = qm.getIndicatorsForPoi(data.id);
                if (indicators && indicators.length > 0) questInfo = indicators[0];
            } else if (this._targetType === "planet" && data.dbId !== undefined) {
                const indicators = qm.getIndicatorsForPlanet(data.dbId);
                if (indicators && indicators.length > 0) questInfo = indicators[0];
            } else if (this._targetType === "system" && data.id !== undefined) {
                const indicators = qm.getIndicatorsForSystem(data.id);
                if (indicators && indicators.length > 0) questInfo = indicators[0];
            }
        }

        if (questInfo) {
            this.contents.fontSize = 12;
            this.contents.textColor = "#fe8019";
            this.drawText(`${loc("travel.active_quest_badge", "★ Quête Active")} : ${questInfo.quest.name}`, textX, curY, textW, "left");
            this.contents.textColor = "#fabd2f";
            const qDesc = (questInfo.location && questInfo.location.description) || questInfo.quest.description;
            this.drawText(qDesc, textX, curY + 18, textW, "left");
            curY += 38;
        }

        const totalH = curY - originY + 10;
        this._maxScrollY = Math.max(0, totalH - height);

        if (this._maxScrollY > 0) {
            const scrollBarH = Math.max(16, Math.round((height / totalH) * height));
            const scrollBarY = Math.round((this._scrollY / this._maxScrollY) * (height - scrollBarH));
            this.contents.fillRect(width - 6, scrollBarY, 4, scrollBarH, "rgba(250, 189, 47, 0.6)");
        }
    }
}

// Barre d'actions & navigation multi-niveaux

window.Window_SpaceTargetInfo = Window_SpaceTargetInfo;
if (typeof global !== 'undefined') {
    global.Window_SpaceTargetInfo = Window_SpaceTargetInfo;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Window_SpaceTargetInfo };
}
