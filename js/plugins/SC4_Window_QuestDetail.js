//=============================================================================
// RPG Maker MZ - SC4_Window_QuestDetail
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Volet d'affichage détaillé et défilant d'une mission du Datapad.
 * @author SimCraft
 * 
 * @help SC4_Window_QuestDetail.js
 */

const _BaseWindowQuestDetail = typeof Window_Scrollable !== "undefined" ? Window_Scrollable : (typeof Window_Base !== "undefined" ? Window_Base : Object);

class Window_QuestDetail extends _BaseWindowQuestDetail {
    constructor(rect) {
        super(rect);
        this._quest = null;
        this.refresh();
    }

    setQuest(quest) {
        if (this._quest !== quest) {
            this._quest = quest;
            this.scrollTo(0, 0);
            this.refresh();
        }
    }

    // ========================================================================
    // 1. DONNÉES & GETTERS MÉTIER
    // ========================================================================

    get quest() {
        return this._quest;
    }

    loc(key, def) {
        return typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(key, def) : def;
    }

    overallHeight() {
        if (!this._quest) return this.innerHeight;
        let h = 100;
        h += 30;
        if (this._quest.hasDeadline()) h += 40;
        const descWords = (this._quest.description || "").split(" ").length;
        h += Math.max(30, Math.ceil(descWords / 12) * 22) + 20;
        if (this._quest.alertTxt && this._quest.alertTxt.length > 0) {
            h += 30 + this._quest.alertTxt.length * 26 + 20;
        }
        if (this._quest.locations && this._quest.locations.length > 0) {
            h += 30 + this._quest.locations.length * 76 + 20;
        }
        if (this._quest.rewards) {
            const r = this._quest.rewards;
            const lines = (this._quest.rewardVisible === false) ? 1 : ((r.gold > 0 ? 1 : 0) + (r.items ? r.items.length : 0));
            h += 34 + Math.max(1, lines) * 30 + 20;
        }
        return Math.max(this.innerHeight, h);
    }

    // ========================================================================
    // 2. RECTANGLES & GÉOMÉTRIE (xxxRect)
    // ========================================================================

    headerRect(y) {
        const width = this.innerWidth;
        const isRec = this._quest && this._quest.recurring;
        return {
            titleRect: new Rectangle(16, y, width - 32, 28),
            statusRect: new Rectangle(16, y + 28, 200, 22),
            categoryRect: new Rectangle(220, y + 28, 220, 22),
            trackingRect: new Rectangle(440, y + 28, 180, 22),
            dateRect: new Rectangle(width - 260, y + 28, 240, 22),
            recurrenceRect: new Rectangle(16, y + 50, 260, 20),
            hintRect: new Rectangle(isRec ? 280 : 16, y + 50, width - (isRec ? 296 : 32), 20)
        };
    }

    deadlineRect(y) {
        const width = this.innerWidth;
        return {
            bgRect: new Rectangle(16, y + 4, width - 32, 28),
            textRect: new Rectangle(28, y + 6, width - 56, 24)
        };
    }

    briefingRect(y) {
        const width = this.innerWidth;
        return {
            separatorRect: new Rectangle(16, y, width - 32, 2),
            titleRect: new Rectangle(16, y + 14, width - 32, 22),
            textX: 24,
            textY: y + 36,
            textWidth: width - 48
        };
    }

    alertItemRect(y) {
        const width = this.innerWidth;
        return {
            bgRect: new Rectangle(24, y + 9, width - 48, 22),
            textRect: new Rectangle(30, y, width - 60, 22)
        };
    }

    locationItemRect(y) {
        const width = this.innerWidth;
        return {
            bgRect: new Rectangle(24, y + 8, width - 48, 68),
            badgeRect: new Rectangle(32, y + 6, 120, 20),
            nameRect: new Rectangle(160, y + 6, width - 210, 20),
            descRect: new Rectangle(32, y + 26, width - 64, 20),
            breadcrumbRect: new Rectangle(32, y + 46, width - 64, 20),
            warningRect: new Rectangle(32, y + 64, width - 64, 20)
        };
    }

    rewardItemRect(y) {
        const width = this.innerWidth;
        return {
            bgRect: new Rectangle(24, y + 4, width - 48, 26),
            textRect: new Rectangle(32, y + 6, width - 64, 24)
        };
    }

    // ========================================================================
    // 3. STYLES & TYPOGRAPHIE (styliseXxx)
    // ========================================================================

    initContentsStyle() {
        this.contents.fontFace = (typeof $gameSystem !== "undefined" && $gameSystem && typeof $gameSystem.mainFontFace === "function") 
            ? $gameSystem.mainFontFace() 
            : "sans-serif";
        this.contents.outlineColor = "#000000";
        this.contents.outlineWidth = 3;
    }

    styliseEmpty() {
        this.contents.fontSize = 15;
        this.contents.textColor = "#928374";
    }

    styliseHeaderTitle(q) {
        this.contents.fontSize = 20;
        if (q.recurring) return "#b8bb26";
        if (q.category === "secondary" || q.category === "side") return "#83a598";
        if (q.category === "bounty") return "#fe8019";
        return "#fabd2f";
    }

    styliseSectionTitle(color = "#83a598") {
        this.contents.fontSize = 14;
        this.contents.textColor = color;
    }

    styliseBodyText(size = 13, color = "#ebdbb2") {
        this.contents.fontSize = size;
        this.contents.textColor = color;
    }

    // ========================================================================
    // 4. MÉTHODES DE DESSIN PAR BLOC (drawXxxBlock)
    // ========================================================================

    drawEmptyState() {
        this.styliseEmpty();
        this.drawText(this.loc("quest.no_selection", "Sélectionnez une mission dans la liste à gauche."), 20, 40, this.innerWidth - 40, "center");
    }

    drawHeaderBlock(curY) {
        const q = this._quest;
        const rects = this.headerRect(curY);

        // Titre
        const titleColor = this.styliseHeaderTitle(q);
        this.contents.textColor = titleColor;
        this.drawText(q.name, rects.titleRect.x, rects.titleRect.y, rects.titleRect.width, "left");

        // Statut d'exécution
        this.contents.fontSize = 13;
        let stText = this.loc("quest.status_not_started", "NON DÉCLENCHÉE");
        let stColor = "#928374";
        if (q.completed) {
            stText = this.loc("quest.status_completed", "[ MISSION ACCOMPLIE ]");
            stColor = "#8ec07c";
        } else if (q.active) {
            stText = this.loc("quest.status_active", "[ EN COURS D'EXÉCUTION ]");
            stColor = "#4da6ff";
        } else if (q.failed) {
            stText = this.loc("quest.status_failed", "[ ÉCHOUÉE ]");
            stColor = "#fb4934";
        }
        this.contents.textColor = stColor;
        this.drawText(stText, rects.statusRect.x, rects.statusRect.y, rects.statusRect.width, "left");

        // Badge Catégorie
        let catPill = this.loc("quest.category_main", "[ 👑 QUÊTE PRINCIPALE ]");
        if (q.recurring) {
            catPill = this.loc("quest.category_recurring", "[ 🔄 CONTRAT RÉCURRENT ]");
        } else if (q.category === "secondary" || q.category === "side") {
            catPill = this.loc("quest.category_secondary", "[ 📜 QUÊTE SECONDAIRE ]");
        } else if (q.category === "bounty") {
            catPill = this.loc("quest.category_bounty", "[ 🎯 AVIS DE RECHERCHE ]");
        }
        this.contents.textColor = titleColor;
        this.drawText(catPill, rects.categoryRect.x, rects.categoryRect.y, rects.categoryRect.width, "left");

        // Badge Suivi
        const trackText = q.isTracking ? this.loc("quest.tracking_active", "[ 📌 SUIVI ACTIF ]") : this.loc("quest.tracking_inactive", "[ ◌ SUIVI MASQUÉ ]");
        this.contents.textColor = q.isTracking ? "#8ec07c" : "#928374";
        this.drawText(trackText, rects.trackingRect.x, rects.trackingRect.y, rects.trackingRect.width, "left");

        // Date Stellaire
        this.contents.textColor = "#a89984";
        const dateStr = window.$gameDate ? Game_DateFormatter.format40K($gameDate) : "";
        const dateLbl = this.loc("quest.date", "Date stellaire");
        this.drawText(`${dateLbl} : ${dateStr}`, rects.dateRect.x, rects.dateRect.y, rects.dateRect.width, "right");

        let nextY = curY + 50;

        // Récurrence & hint
        if (q.recurring) {
            this.contents.fontSize = 12;
            this.contents.textColor = "#b8bb26";
            const recLbl = this.loc("quest.recurring_completed_count", "Accomplie");
            const timesLbl = this.loc("quest.recurring_times", "fois");
            this.drawText(`🔄 ${recLbl} : ${q.completedCount} ${timesLbl}`, rects.recurrenceRect.x, rects.recurrenceRect.y, rects.recurrenceRect.width, "left");
            this.contents.textColor = "#928374";
            this.drawText(this.loc("quest.toggle_tracking_hint", "(Entrée / Clic pour basculer le suivi)"), rects.hintRect.x, rects.hintRect.y, rects.hintRect.width, "left");
        } else {
            this.contents.fontSize = 12;
            this.contents.textColor = "#928374";
            this.drawText(this.loc("quest.toggle_tracking_hint", "(Entrée / Clic pour basculer le suivi)"), rects.hintRect.x, rects.hintRect.y, rects.hintRect.width, "left");
        }

        return nextY + 20;
    }

    drawDeadlineBlock(curY) {
        const q = this._quest;
        if (!q || !q.hasDeadline()) return curY;

        const rects = this.deadlineRect(curY);
        this.contents.fillRect(rects.bgRect.x, rects.bgRect.y, rects.bgRect.width, rects.bgRect.height, "#282828");

        const remMin = q.remainingTime();
        const remStr = q.remainingTimeString();
        const isLate = remMin <= 0 || q.failed;
        const dColor = isLate ? "#fb4934" : (remMin <= 60 ? "#fb4934" : (remMin <= 360 ? "#fe8019" : "#b8bb26"));

        this.contents.fontSize = 13;
        this.contents.textColor = dColor;
        const titleDead = this.loc("quest.deadline_title", "◈ ÉCHÉANCE & COMPTE À REBOURS");
        const deadTxt = isLate 
            ? `⚠ ${this.loc("quest.deadline_failed", "Délai expiré : Mission échouée")}` 
            : `⏱ ${this.loc("quest.deadline_remaining", "Temps restant")} : ${remStr}`;
        this.drawText(`${titleDead} ▷ ${deadTxt}`, rects.textRect.x, rects.textRect.y, rects.textRect.width, "left");

        return curY + 36;
    }

    drawBriefingBlock(curY) {
        const q = this._quest;
        const rects = this.briefingRect(curY);

        // Séparateur
        this.contents.fillRect(rects.separatorRect.x, rects.separatorRect.y, rects.separatorRect.width, rects.separatorRect.height, "#504945");

        // Titre
        this.styliseSectionTitle("#83a598");
        this.drawText(this.loc("quest.briefing_title", "◈ ORDRES DE MISSION & BRIEFING TACTIQUE"), rects.titleRect.x, rects.titleRect.y, rects.titleRect.width, "left");

        // Texte multiligne
        this.styliseBodyText(13, "#ebdbb2");
        const nextY = this.drawWrappedText(q.description || this.loc("quest.no_desc", "Aucun détail complémentaire fourni."), rects.textX, rects.textY, rects.textWidth, 20);
        return nextY + 16;
    }

    drawAlertsBlock(curY) {
        const q = this._quest;
        if (!q.alertTxt || !Array.isArray(q.alertTxt) || q.alertTxt.length === 0) return curY;

        this.styliseSectionTitle("#fe8019");
        this.drawText(this.loc("quest.alerts_title", "◈ COMMUNICATIONS ASTROPATHIQUES & LOGS"), 16, curY, this.innerWidth - 32, "left");
        curY += 22;

        q.alertTxt.forEach(item => {
            const rects = this.alertItemRect(curY);
            this.contents.fillRect(rects.bgRect.x, rects.bgRect.y, rects.bgRect.width, rects.bgRect.height, "#1d2021");
            this.contents.fontSize = 12;
            this.contents.textColor = item.style === "alert" ? "#fb4934" : "#b8bb26";
            this.drawText(`▶ ${item.txt}`, rects.textRect.x, rects.textRect.y, rects.textRect.width, "left");
            curY += 24;
        });

        return curY + 14;
    }

    drawLocationsBlock(curY) {
        const q = this._quest;
        if (!q.locations || !Array.isArray(q.locations) || q.locations.length === 0) return curY;

        this.styliseSectionTitle("#8ec07c");
        this.drawText(this.loc("quest.objectives_title", "◈ OBJECTIFS TACTIQUES & GÉOLOCALISATION"), 16, curY, this.innerWidth - 32, "left");
        curY += 24;

        const sector = window.$gameSector ? window.$gameSector.currentSectorData() : null;
        const secName = sector ? (typeof SC4_Localization !== "undefined" ? SC4_Localization.parse(sector.name) : sector.name) : this.loc("travel.sector_default", "Secteur");
        const planets = window.$dataPlanets || [];
        const allPois = window.$dataPois || [];

        q.locations.forEach(locItem => {
            const rects = this.locationItemRect(curY);

            // Fond
            this.contents.fillRect(rects.bgRect.x, rects.bgRect.y, rects.bgRect.width, rects.bgRect.height, "#282828");

            // Badge d'état
            let badge = this.loc("quest.obj_in_progress", "[► EN COURS]");
            let badgeColor = "#fabd2f";
            if (locItem.completed) {
                badge = this.loc("quest.obj_completed", "[✔ TERMINÉ]");
                badgeColor = "#8ec07c";
            } else if (!locItem.active) {
                badge = this.loc("quest.obj_pending", "[🔒 EN ATTENTE]");
                badgeColor = "#7c6f64";
            }

            this.contents.fontSize = 13;
            this.contents.textColor = badgeColor;
            this.drawText(badge, rects.badgeRect.x, rects.badgeRect.y, rects.badgeRect.width, "left");

            // Nom de l'objectif
            this.contents.textColor = locItem.completed ? "#a89984" : "#fbf1c7";
            this.drawText(locItem.name, rects.nameRect.x, rects.nameRect.y, rects.nameRect.width, "left");

            // Description
            this.contents.fontSize = 12;
            this.contents.textColor = "#d5c4a1";
            this.drawText(locItem.description || this.loc("quest.default_reach", "Rejoindre la zone indiquée."), rects.descRect.x, rects.descRect.y, rects.descRect.width, "left");

            // Données géographiques
            const sys = sector && sector.systems ? sector.systems.find(s => s && s.id === locItem.systemId) : null;
            const sysName = sys ? (typeof SC4_Localization !== "undefined" ? SC4_Localization.parse(sys.name) : sys.name) : `${this.loc("travel.system_default", "Système")} ${locItem.systemId}`;
            const pl = planets.find(p => p && (p.dbId === locItem.planetId || p.id === locItem.planetId));
            const bodyLbl = this.loc("travel.body_default", this.loc("travel.celestial_body", "Corps"));
            const plName = pl ? (typeof SC4_Localization !== "undefined" ? SC4_Localization.parse(pl.name) : pl.name) : (locItem.planetId !== null && locItem.planetId !== undefined ? `${bodyLbl} ${locItem.planetId}` : "");
            const poi = allPois.find(p => p && p.id === locItem.poiId) || (pl && Array.isArray(pl.pois) ? pl.pois.find(p => p && p.id === locItem.poiId) : null);
            const isLocated = !locItem.poiId || (window.$gameSystem && typeof window.$gameSystem.isPoiLocated === "function" ? window.$gameSystem.isPoiLocated(locItem.poiId) : true);

            let poiDisplayName = "";
            if (locItem.poiId) {
                if (isLocated) {
                    poiDisplayName = poi ? (typeof SC4_Localization !== "undefined" ? SC4_Localization.parse(poi.name) : poi.name) : locItem.poiId;
                } else {
                    poiDisplayName = this.loc("quest.unknown_poi", "??? [Site non découvert]");
                }
            }

            const breadcrumb = `📍 ${secName} ▹ ${sysName}${plName ? " ▹ " + plName : ""}${poiDisplayName ? " ▹ " + poiDisplayName : ""}`;
            this.contents.textColor = isLocated ? "#83a598" : "#fe8019";
            this.drawText(breadcrumb, rects.breadcrumbRect.x, rects.breadcrumbRect.y, rects.breadcrumbRect.width, "left");

            if (!isLocated) {
                this.contents.fontSize = 12;
                this.contents.textColor = "#fb4934";
                this.drawText(`⚠ ${this.loc("quest.poi_unlocated_task", "À localiser : Coordonnées du site inconnues")}`, rects.warningRect.x, rects.warningRect.y, rects.warningRect.width, "left");
                curY += 20;
            }

            curY += 74;
        });

        return curY;
    }

    drawRewardsBlock(curY) {
        const q = this._quest;
        const rewards = q.rewards;
        if (!rewards) return curY;

        this.styliseSectionTitle("#fabd2f");
        this.drawText(this.loc("quest.rewards_title", "◈ RÉCOMPENSES DE MISSION"), 16, curY, this.innerWidth - 32, "left");
        curY += 24;

        if (q.rewardVisible === false) {
            const rects = this.rewardItemRect(curY);
            this.contents.fillRect(rects.bgRect.x, rects.bgRect.y, rects.bgRect.width, rects.bgRect.height, "#1d2021");
            this.contents.fontSize = 13;
            this.contents.textColor = "#fb4934";
            this.drawText(this.loc("quest.rewards_hidden", "??? [DONNÉES CLASSIFIÉES / INCONNUES]"), rects.textRect.x, rects.textRect.y, rects.textRect.width, "left");
            return curY + 34;
        }

        if (rewards.gold > 0) {
            const rects = this.rewardItemRect(curY);
            this.contents.fillRect(rects.bgRect.x, rects.bgRect.y, rects.bgRect.width, rects.bgRect.height, "#1d2021");
            this.contents.fontSize = 13;
            this.contents.textColor = "#fabd2f";
            const creditsLbl = this.loc("quest.reward_credits", this.loc("quest.credits", "Crédits"));
            this.drawText(`🪙 ${rewards.gold} ${creditsLbl}`, rects.textRect.x, rects.textRect.y, rects.textRect.width, "left");
            curY += 30;
        }

        if (Array.isArray(rewards.items)) {
            rewards.items.forEach(it => {
                let itemObj = null;
                if (it.type === "item" && typeof $dataItems !== "undefined") itemObj = $dataItems[it.id];
                else if (it.type === "weapon" && typeof $dataWeapons !== "undefined") itemObj = $dataWeapons[it.id];
                else if (it.type === "armor" && typeof $dataArmors !== "undefined") itemObj = $dataArmors[it.id];

                let itName = `${it.type} #${it.id}`;
                if (itemObj && itemObj.name) {
                    itName = typeof SC4_Localization !== "undefined" ? SC4_Localization.parse(itemObj.name) : itemObj.name;
                }

                const rects = this.rewardItemRect(curY);
                this.contents.fillRect(rects.bgRect.x, rects.bgRect.y, rects.bgRect.width, rects.bgRect.height, "#1d2021");
                this.contents.fontSize = 13;
                this.contents.textColor = "#ebdbb2";
                this.drawText(`📦 ${itName} x${it.quantity}`, rects.textRect.x, rects.textRect.y, rects.textRect.width, "left");
                curY += 30;
            });
        }

        return curY;
    }

    // ========================================================================
    // 5. ORCHESTRATION & CYCLE DE RENDU (paint / refresh)
    // ========================================================================

    paint() {
        this.contents.clear();
        this.initContentsStyle();

        if (!this._quest) {
            this.drawEmptyState();
            return;
        }

        let curY = 8;
        curY = this.drawHeaderBlock(curY);
        curY = this.drawDeadlineBlock(curY);
        curY = this.drawBriefingBlock(curY);
        curY = this.drawAlertsBlock(curY);
        curY = this.drawLocationsBlock(curY);
        curY = this.drawRewardsBlock(curY);
    }

    refresh() {
        this.paint();
    }

    drawWrappedText(text, x, y, maxWidth, lineHeight = 20) {
        if (!text) return y;
        const converted = (typeof this.convertEscapeCharacters === "function") 
            ? this.convertEscapeCharacters(text) 
            : text;
        const paragraphs = converted.split("\n");
        let curY = y;
        for (const p of paragraphs) {
            const words = p.split(" ");
            let line = "";
            for (const w of words) {
                const testLine = line ? `${line} ${w}` : w;
                if (this.textWidth(testLine) > maxWidth && line) {
                    this.drawText(line, x, curY, maxWidth, "left");
                    line = w;
                    curY += lineHeight;
                } else {
                    line = testLine;
                }
            }
            if (line) {
                this.drawText(line, x, curY, maxWidth, "left");
                curY += lineHeight;
            }
        }
        return curY;
    }
}

window.Window_QuestDetail = Window_QuestDetail;
if (typeof global !== "undefined") {
    global.Window_QuestDetail = Window_QuestDetail;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { Window_QuestDetail };
}
