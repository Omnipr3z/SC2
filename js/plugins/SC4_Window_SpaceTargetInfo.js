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

    // ========================================================================
    // 1. DONNÉES & GETTERS MÉTIER
    // ========================================================================

    get targetData() {
        return this._targetData;
    }

    get targetType() {
        return this._targetType;
    }

    get contextScene() {
        return this._contextScene;
    }

    loc(key, def) {
        return typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(key, def) : def;
    }

    getTutorialData() {
        let tutoRaw = "";
        let headerTitle = "";
        if (this._contextScene === "sector") {
            headerTitle = this.loc("travel.tuto_sector_header", "◈ NAVIGATION SECTORIELLE & SAUTS WARP FTL");
            tutoRaw = this.loc("travel.tuto_sector", "");
        } else if (this._contextScene === "subsystem") {
            headerTitle = this.loc("travel.tuto_subsystem_header", "◈ DÉBARQUEMENT & COMMUNICATIONS SUBCOM");
            tutoRaw = this.loc("travel.tuto_subsystem", "");
        } else {
            headerTitle = this.loc("travel.tuto_system_header", "◈ CONSOLE DE NAVIGATION STELLAIRE & PROPULSION");
            tutoRaw = this.loc("travel.tuto_system", "");
        }
        return { headerTitle, lines: tutoRaw.split("\n") };
    }

    // ========================================================================
    // 2. RECTANGLES & GÉOMÉTRIE (xxxRect)
    // ========================================================================

    tutorialRect(width) {
        return {
            headerRect: new Rectangle(16, 6, width - 32, 24),
            linesStartY: 30,
            lineHeight: 20
        };
    }

    mediaRect(originY) {
        return {
            poiIconRect: new Rectangle(16, 12 + originY, 32, 32),
            bodyBoxRect: new Rectangle(16, 10 + originY, 56, 56)
        };
    }

    targetHeaderRect(textX, originY, textW) {
        return {
            titleRect: new Rectangle(textX, 4 + originY, textW, 24),
            typeRect: new Rectangle(textX, 26 + originY, textW, 20)
        };
    }

    scrollBarRect(width, height, totalH) {
        const scrollBarH = Math.max(16, Math.round((height / totalH) * height));
        const scrollBarY = Math.round((this._scrollY / this._maxScrollY) * (height - scrollBarH));
        return new Rectangle(width - 6, scrollBarY, 4, scrollBarH);
    }

    // ========================================================================
    // 3. STYLES & TYPOGRAPHIE (styliseXxx)
    // ========================================================================

    styliseTutorialHeader() {
        this.contents.fontSize = 14;
        this.contents.textColor = "#fabd2f";
    }

    styliseTutorialBody() {
        this.contents.fontSize = 12;
        this.contents.textColor = "#d5c4a1";
    }

    styliseTargetTitle() {
        this.contents.fontSize = 18;
        this.contents.textColor = "#fabd2f";
    }

    styliseTargetType() {
        this.contents.fontSize = 12;
        this.contents.textColor = "#8ec07c";
    }

    styliseDescription() {
        this.contents.fontSize = 12;
        this.contents.textColor = "#ebdbb2";
    }

    styliseQuestBadge() {
        this.contents.fontSize = 12;
        this.contents.textColor = "#fe8019";
    }

    styliseQuestDesc() {
        this.contents.fontSize = 12;
        this.contents.textColor = "#fabd2f";
    }

    // ========================================================================
    // 4. MÉTHODES DE DESSIN PAR BLOC (drawXxxBlock)
    // ========================================================================

    drawTutorialBlock(width) {
        this._maxScrollY = 0;
        const tuto = this.getTutorialData();
        const rects = this.tutorialRect(width);

        this.styliseTutorialHeader();
        this.drawText(tuto.headerTitle, rects.headerRect.x, rects.headerRect.y, rects.headerRect.width, "left");

        this.styliseTutorialBody();
        let y = rects.linesStartY;
        tuto.lines.forEach(l => {
            this.drawText(l, 16, y, width - 32, "left");
            y += rects.lineHeight;
        });
    }

    drawMediaBlock(originY) {
        const data = this._targetData;
        const rects = this.mediaRect(originY);

        if (this._targetType === "poi") {
            const iconIndex = (data.icon && typeof data.icon === "number") ? data.icon : 16;
            this.drawIcon(iconIndex, rects.poiIconRect.x, rects.poiIconRect.y);
            return { textX: 64 };
        } 
        
        if (this._targetType === "planet" || this._targetType === "system") {
            const bmpName = data.bitmapName || (this._targetType === "system" ? "sun" : "planet_0");
            const bmp = ImageManager.loadBitmap("img/GUI/ship/", bmpName);
            if (bmp && bmp.isReady()) {
                const img = bmp._image || bmp._canvas;
                if (img && this.contents.context) {
                    this.contents.context.drawImage(img, 0, 0, img.width, img.height, rects.bodyBoxRect.x, rects.bodyBoxRect.y, rects.bodyBoxRect.width, rects.bodyBoxRect.height);
                }
            } else {
                this.contents.fillRect(rects.bodyBoxRect.x, rects.bodyBoxRect.y, rects.bodyBoxRect.width, rects.bodyBoxRect.height, "#1d2021");
                this.contents.strokeStyle = "#8ec07c";
                this.contents.strokeRect(rects.bodyBoxRect.x, rects.bodyBoxRect.y, rects.bodyBoxRect.width, rects.bodyBoxRect.height);
            }
            return { textX: 84 };
        }

        return { textX: 16 };
    }

    drawHeaderBlock(textX, originY, textW) {
        const data = this._targetData;
        const rects = this.targetHeaderRect(textX, originY, textW);

        // Titre de la cible
        this.styliseTargetTitle();
        const targetTitle = data.name 
            ? (typeof SC4_Localization !== "undefined" ? SC4_Localization.parse(data.name) : data.name) 
            : this.loc("travel.target_default", "Cible");
        this.drawText(targetTitle, rects.titleRect.x, rects.titleRect.y, rects.titleRect.width, "left");

        // Type de la cible
        this.styliseTargetType();
        const typeStr = data.type || (this._targetType === "system" 
            ? this.loc("travel.target_system_solar", "Système Solaire") 
            : this.loc("travel.target_poi", "Point d'Intérêt"));
        this.drawText(`${this.loc("travel.target_type", "Type")}: ${typeStr}`, rects.typeRect.x, rects.typeRect.y, rects.typeRect.width, "left");
    }

    drawDescriptionBlock(textX, startY, textW) {
        const data = this._targetData;
        this.styliseDescription();

        const desc = data.description || this.loc("travel.no_telemetry", "Aucune télémesure disponible.");
        const descLines = String(desc).split("\n");
        let curY = startY;

        descLines.forEach(line => {
            this.drawText(line, textX, curY, textW, "left");
            curY += 18;
        });

        return curY + 6;
    }

    drawQuestInfoBlock(textX, curY, textW) {
        const data = this._targetData;
        const qm = window.$gameQuests;
        if (!qm) return curY;

        let questInfo = null;
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

        if (questInfo) {
            this.styliseQuestBadge();
            this.drawText(`${this.loc("travel.active_quest_badge", "★ Quête Active")} : ${questInfo.quest.name}`, textX, curY, textW, "left");

            this.styliseQuestDesc();
            const qDesc = (questInfo.location && questInfo.location.description) || questInfo.quest.description;
            this.drawText(qDesc, textX, curY + 18, textW, "left");
            return curY + 38;
        }

        return curY;
    }

    drawScrollBar(width, height, totalH) {
        if (this._maxScrollY <= 0) return;
        const rect = this.scrollBarRect(width, height, totalH);
        this.contents.fillRect(rect.x, rect.y, rect.width, rect.height, "rgba(250, 189, 47, 0.6)");
    }

    // ========================================================================
    // 5. ORCHESTRATION & CYCLE DE RENDU (refresh)
    // ========================================================================

    refresh() {
        this.contents.clear();
        const width = this.contentsWidth();
        const height = this.contentsHeight();

        // 1. Aucune cible sélectionnée : Tuto contextuel
        if (!this._targetData) {
            this.drawTutorialBlock(width);
            return;
        }

        // 2. Cible sélectionnée : Télémétrie détaillée avec Scroll Y
        const originY = -this._scrollY;
        const mediaInfo = this.drawMediaBlock(originY);
        const textX = mediaInfo.textX;
        const textW = width - textX - 16;

        this.drawHeaderBlock(textX, originY, textW);
        let curY = this.drawDescriptionBlock(textX, 46 + originY, textW);
        curY = this.drawQuestInfoBlock(textX, curY, textW);

        const totalH = curY - originY + 10;
        this._maxScrollY = Math.max(0, totalH - height);
        this.drawScrollBar(width, height, totalH);
    }
}

window.Window_SpaceTargetInfo = Window_SpaceTargetInfo;
if (typeof global !== 'undefined') {
    global.Window_SpaceTargetInfo = Window_SpaceTargetInfo;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Window_SpaceTargetInfo };
}
