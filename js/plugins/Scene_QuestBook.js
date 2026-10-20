//=============================================================================
// RPG Maker MZ - SC4_Window_QuestBookHeader
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] En-tête du Datapad stellaire avec fil d'Ariane et horloge Neotori.
 * @author SimCraft
 * 
 * @help SC4_Window_QuestBookHeader.js
 */

class Window_QuestBookHeader extends Window_Base {
    constructor(rect) {
        super(rect);
        this.opacity = 240;
        this.refresh();
    }

    loadWindowskin() {
        if (ImageManager.loadSystem) {
            this.windowskin = ImageManager.loadSystem("Prompt") || ImageManager.loadSystem("Window");
        }
    }

    resetFontSettings() {
        this.contents.fontFace = $gameSystem ? $gameSystem.mainFontFace() : "sans-serif";
        this.contents.fontSize = 18;
        this.contents.textColor = "#e0e0e0";
        this.contents.outlineColor = "#000000";
        this.contents.outlineWidth = 3;
    }

    refresh() {
        this.contents.clear();
        this.resetFontSettings();

        // Titre Datapad
        this.contents.textColor = "#8ec07c";
        const titleText = typeof SC4_Localization !== "undefined" ? SC4_Localization.getText("quest.header", "DATAPAD IMPÉRIAL ▷ REGISTRE DES MISSIONS & TRANSMISSIONS") : "DATAPAD IMPÉRIAL ▷ REGISTRE DES MISSIONS & TRANSMISSIONS";
        this.drawText(titleText, 12, 0, this.contentsWidth() - 320, "left");

        // Horloge 40K
        const timeStr = window.$gameDate ? Game_DateFormatter.format40K($gameDate) : "";
        this.contents.textColor = "#fabd2f";
        this.drawText(timeStr, this.contentsWidth() - 300, 0, 280, "right");
    }
}

window.Window_QuestBookHeader = Window_QuestBookHeader;
if (typeof global !== "undefined") {
    global.Window_QuestBookHeader = Window_QuestBookHeader;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { Window_QuestBookHeader };
}


//=============================================================================
// RPG Maker MZ - SC4_Window_QuestFilter
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Barre d'onglets et de filtrage des quêtes du Datapad.
 * @author SimCraft
 * 
 * @help SC4_Window_QuestFilter.js
 */

const _BaseWindowQuestFilter = typeof Window_HorzCommand !== "undefined" ? Window_HorzCommand : (typeof Window_Command !== "undefined" ? Window_Command : (typeof Window_Base !== "undefined" ? Window_Base : Object));

class Window_QuestFilter extends _BaseWindowQuestFilter {
    constructor(rect) {
        super(rect);
    }

    maxCols() {
        return 4;
    }

    makeCommandList() {
        const qm = window.$gameQuests;
        const allQuests = qm ? qm.quests() : [];
        const activeCount = allQuests.filter(q => q && q.active).length;
        const recurringCount = allQuests.filter(q => q && q.recurring).length;
        const completedCount = allQuests.filter(q => q && q.completed).length;
        const totalCount = allQuests.length;

        const loc = (key, def) => typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(key, def) : def;
        const activeLbl = loc("quest.filter_active", "En cours");
        const recLbl = loc("quest.filter_recurring", "Contrats");
        const compLbl = loc("quest.filter_completed", "Terminées");
        const allLbl = loc("quest.filter_all", "Toutes");

        this.addCommand(`${activeLbl} (${activeCount})`, "active");
        this.addCommand(`${recLbl} (${recurringCount})`, "recurring");
        this.addCommand(`${compLbl} (${completedCount})`, "completed");
        this.addCommand(`${allLbl} (${totalCount})`, "all");
    }
}

window.Window_QuestFilter = Window_QuestFilter;
if (typeof global !== "undefined") {
    global.Window_QuestFilter = Window_QuestFilter;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { Window_QuestFilter };
}


//=============================================================================
// RPG Maker MZ - SC4_Window_QuestList
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Liste des quêtes et contrats avec badges, marqueurs et délais.
 * @author SimCraft
 * 
 * @help SC4_Window_QuestList.js
 */

const _BaseWindowQuestList = typeof Window_Selectable !== "undefined" ? Window_Selectable : (typeof Window_Base !== "undefined" ? Window_Base : Object);

class Window_QuestList extends _BaseWindowQuestList {
    constructor(rect) {
        super(rect);
        this._filter = "active";
        this._data = [];
        this._detailWindow = null;
        this._onCycleFilter = null;
        this.refresh();
    }

    setDetailWindow(detailWindow) {
        this._detailWindow = detailWindow;
        this.updateDetail();
    }

    setFilter(filter) {
        if (this._filter !== filter) {
            this._filter = filter;
            this.refresh();
            this.select(0);
        }
    }

    maxItems() {
        return this._data ? this._data.length : 0;
    }

    item() {
        return this._data && this.index() >= 0 ? this._data[this.index()] : null;
    }

    itemHeight() {
        return 48;
    }

    makeItemList() {
        const qm = window.$gameQuests;
        const all = qm ? qm.quests() : [];
        if (this._filter === "active") {
            this._data = all.filter(q => q && q.active);
        } else if (this._filter === "recurring") {
            this._data = all.filter(q => q && q.recurring);
        } else if (this._filter === "completed") {
            this._data = all.filter(q => q && q.completed);
        } else {
            this._data = [...all];
        }
    }

    refresh() {
        this.makeItemList();
        super.refresh();
        this.updateDetail();
    }

    drawItem(index) {
        const quest = this._data[index];
        if (!quest) return;

        const rect = this.itemLineRect(index);
        this.contents.fontFace = $gameSystem ? $gameSystem.mainFontFace() : "sans-serif";
        this.contents.outlineColor = "#000000";
        this.contents.outlineWidth = 3;

        // Détermination du code couleur par catégorie / état
        let itemColor = "#ebdbb2";
        let marker = "◈";
        if (quest.failed) {
            itemColor = "#fb4934";
            marker = "✖";
        } else if (quest.completed) {
            itemColor = "#8ec07c";
            marker = "✔";
        } else if (quest.recurring) {
            itemColor = "#b8bb26"; // Vert émeraude contrat récurrent
            marker = "🔄";
        } else if (quest.category === "secondary" || quest.category === "side") {
            itemColor = "#83a598"; // Cyan quête secondaire
            marker = "📜";
        } else if (quest.category === "bounty") {
            itemColor = "#fe8019"; // Orange prime de recherche
            marker = "🎯";
        } else {
            itemColor = "#fabd2f"; // Doré quête principale
            marker = "👑";
        }

        // Puce et Pin de suivi
        const trackPin = quest.isTracking ? "📌" : "◌";
        this.contents.fontSize = 13;
        this.contents.textColor = quest.isTracking ? "#8ec07c" : "#7c6f64";
        this.drawText(trackPin, rect.x, rect.y + 4, 18, "center");

        this.contents.fontSize = 14;
        this.contents.textColor = itemColor;
        this.drawText(marker, rect.x + 20, rect.y + 4, 20, "center");

        // Titre + compteur de répétition
        let titleTxt = quest.name;
        if (quest.recurring && quest.completedCount > 0) {
            titleTxt += ` (x${quest.completedCount})`;
        }
        this.contents.fontSize = 14;
        this.contents.textColor = quest.completed ? "#a89984" : itemColor;
        const titleW = rect.width - 150;
        this.drawText(titleTxt, rect.x + 44, rect.y + 4, titleW, "left");

        // Badge objectifs ou délai restant
        this.contents.fontSize = 11;
        if (typeof quest.hasDeadline === "function" && quest.hasDeadline() && quest.active) {
            const remStr = quest.remainingTimeString();
            const remMin = quest.remainingTime();
            this.contents.textColor = remMin <= 60 ? "#fb4934" : (remMin <= 360 ? "#fe8019" : "#b8bb26");
            this.drawText(`⏱ ${remStr}`, rect.x + rect.width - 100, rect.y + 4, 95, "right");
        } else {
            const completedLocs = quest.locations ? quest.locations.filter(l => l && l.completed).length : 0;
            const totalLocs = quest.locations ? quest.locations.length : 0;
            this.contents.textColor = quest.completed ? "#8ec07c" : "#83a598";
            const badgeLbl = typeof SC4_Localization !== "undefined" ? SC4_Localization.getText("quest.obj_badge", "obj.") : "obj.";
            const objTxt = totalLocs > 0 ? `${completedLocs}/${totalLocs} ${badgeLbl}` : "";
            this.drawText(objTxt, rect.x + rect.width - 70, rect.y + 4, 65, "right");
        }
    }

    select(index) {
        super.select(index);
        this.updateDetail();
    }

    updateDetail() {
        if (this._detailWindow) {
            this._detailWindow.setQuest(this.item());
        }
    }

    cursorRight() {
        if (this._onCycleFilter) this._onCycleFilter(1);
    }

    cursorLeft() {
        if (this._onCycleFilter) this._onCycleFilter(-1);
    }
}

window.Window_QuestList = Window_QuestList;
if (typeof global !== "undefined") {
    global.Window_QuestList = Window_QuestList;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { Window_QuestList };
}


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

    paint() {
        this.contents.clear();
        const width = this.innerWidth;
        this.contents.fontFace = $gameSystem ? $gameSystem.mainFontFace() : "sans-serif";
        this.contents.outlineColor = "#000000";
        this.contents.outlineWidth = 3;

        const loc = (key, def) => typeof SC4_Localization !== "undefined" ? SC4_Localization.getText(key, def) : def;

        if (!this._quest) {
            this.contents.fontSize = 15;
            this.contents.textColor = "#928374";
            this.drawText(loc("quest.no_selection", "Sélectionnez une mission dans la liste à gauche."), 20, 40, width - 40, "center");
            return;
        }

        const q = this._quest;
        let curY = 8;

        // 1. Titre & Badge Catégorie
        this.contents.fontSize = 20;
        let titleColor = "#fabd2f";
        let catPill = loc("quest.category_main", "[ 👑 QUÊTE PRINCIPALE ]");
        if (q.recurring) {
            titleColor = "#b8bb26";
            catPill = loc("quest.category_recurring", "[ 🔄 CONTRAT RÉCURRENT ]");
        } else if (q.category === "secondary" || q.category === "side") {
            titleColor = "#83a598";
            catPill = loc("quest.category_secondary", "[ 📜 QUÊTE SECONDAIRE ]");
        } else if (q.category === "bounty") {
            titleColor = "#fe8019";
            catPill = loc("quest.category_bounty", "[ 🎯 AVIS DE RECHERCHE ]");
        }
        this.contents.textColor = titleColor;
        this.drawText(q.name, 16, curY, width - 32, "left");
        curY += 28;

        // Statut d'exécution & Badge Suivi & Date
        this.contents.fontSize = 13;
        let stText = loc("quest.status_not_started", "NON DÉCLENCHÉE");
        let stColor = "#928374";
        if (q.completed) {
            stText = loc("quest.status_completed", "[ MISSION ACCOMPLIE ]");
            stColor = "#8ec07c";
        } else if (q.active) {
            stText = loc("quest.status_active", "[ EN COURS D'EXÉCUTION ]");
            stColor = "#4da6ff";
        } else if (q.failed) {
            stText = loc("quest.status_failed", "[ ÉCHOUÉE ]");
            stColor = "#fb4934";
        }

        // Ligne de statut + catégorie + suivi
        this.contents.textColor = stColor;
        this.drawText(stText, 16, curY, 200, "left");

        this.contents.textColor = titleColor;
        this.drawText(catPill, 220, curY, 220, "left");

        const trackText = q.isTracking ? loc("quest.tracking_active", "[ 📌 SUIVI ACTIF ]") : loc("quest.tracking_inactive", "[ ◌ SUIVI MASQUÉ ]");
        this.contents.textColor = q.isTracking ? "#8ec07c" : "#928374";
        this.drawText(trackText, 440, curY, 180, "left");

        this.contents.textColor = "#a89984";
        const dateStr = window.$gameDate ? Game_DateFormatter.format40K($gameDate) : "";
        const dateLbl = loc("quest.date", "Date stellaire");
        this.drawText(`${dateLbl} : ${dateStr}`, width - 260, curY, 240, "right");
        curY += 22;

        // Information de récurrence si applicable
        if (q.recurring) {
            this.contents.fontSize = 12;
            this.contents.textColor = "#b8bb26";
            const recLbl = loc("quest.recurring_completed_count", "Accomplie");
            const timesLbl = loc("quest.recurring_times", "fois");
            this.drawText(`🔄 ${recLbl} : ${q.completedCount} ${timesLbl}`, 16, curY, 260, "left");
            this.contents.textColor = "#928374";
            this.drawText(loc("quest.toggle_tracking_hint", "(Entrée / Clic pour basculer le suivi)"), 280, curY, width - 296, "left");
            curY += 20;
        } else {
            this.contents.fontSize = 12;
            this.contents.textColor = "#928374";
            this.drawText(loc("quest.toggle_tracking_hint", "(Entrée / Clic pour basculer le suivi)"), 16, curY, width - 32, "left");
            curY += 20;
        }

        // 2. Encadré d'échéance & Délai limite si présent
        if (q.hasDeadline()) {
            this.contents.fillRect(16, curY + 4, width - 32, 28, "#282828");
            const remMin = q.remainingTime();
            const remStr = q.remainingTimeString();
            const isLate = remMin <= 0 || q.failed;
            const dColor = isLate ? "#fb4934" : (remMin <= 60 ? "#fb4934" : (remMin <= 360 ? "#fe8019" : "#b8bb26"));
            this.contents.fontSize = 13;
            this.contents.textColor = dColor;
            const titleDead = loc("quest.deadline_title", "◈ ÉCHÉANCE & COMPTE À REBOURS");
            const deadTxt = isLate ? `⚠ ${loc("quest.deadline_failed", "Délai expiré : Mission échouée")}` : `⏱ ${loc("quest.deadline_remaining", "Temps restant")} : ${remStr}`;
            this.drawText(`${titleDead} ▷ ${deadTxt}`, 28, curY + 6, width - 56, "left");
            curY += 36;
        }

        // Séparateur
        this.contents.fillRect(16, curY, width - 32, 2, "#504945");
        curY += 14;

        // 3. Ordres de Mission & Briefing
        this.contents.fontSize = 14;
        this.contents.textColor = "#83a598";
        this.drawText(loc("quest.briefing_title", "◈ ORDRES DE MISSION & BRIEFING TACTIQUE"), 16, curY, width - 32, "left");
        curY += 22;

        this.contents.fontSize = 13;
        this.contents.textColor = "#ebdbb2";
        curY = this.drawWrappedText(q.description || loc("quest.no_desc", "Aucun détail complémentaire fourni."), 24, curY, width - 48, 20);
        curY += 16;

        // 4. Transmissions Radio Interceptées (alertTxt)
        if (q.alertTxt && Array.isArray(q.alertTxt) && q.alertTxt.length > 0) {
            this.contents.fontSize = 14;
            this.contents.textColor = "#fe8019";
            this.drawText(loc("quest.alerts_title", "◈ COMMUNICATIONS ASTROPATHIQUES & LOGS"), 16, curY, width - 32, "left");
            curY += 22;

            q.alertTxt.forEach(item => {
                this.contents.fillRect(24, curY + 9, width - 48, 22, "#1d2021");
                this.contents.fontSize = 12;
                this.contents.textColor = item.style === "alert" ? "#fb4934" : "#b8bb26";
                this.drawText(`▶ ${item.txt}`, 30, curY, width - 60, "left");
                curY += 24;
            });
            curY += 14;
        }

        // 5. Objectifs Tactiques & Géolocalisation
        if (q.locations && Array.isArray(q.locations) && q.locations.length > 0) {
            this.contents.fontSize = 14;
            this.contents.textColor = "#8ec07c";
            this.drawText(loc("quest.objectives_title", "◈ OBJECTIFS TACTIQUES & GÉOLOCALISATION"), 16, curY, width - 32, "left");
            curY += 24;

            const sector = window.$gameSector ? window.$gameSector.currentSectorData() : null;
            const secName = sector ? (typeof SC4_Localization !== "undefined" ? SC4_Localization.parse(sector.name) : sector.name) : loc("travel.sector_default", "Secteur");
            const planets = window.$dataPlanets || [];

            q.locations.forEach(locItem => {
                // Fond de l'objectif
                this.contents.fillRect(24, curY + 8, width - 48, 68, "#282828");

                // Badge d'état
                let badge = loc("quest.obj_in_progress", "[► EN COURS]");
                let badgeColor = "#fabd2f";
                if (locItem.completed) {
                    badge = loc("quest.obj_completed", "[✔ TERMINÉ]");
                    badgeColor = "#8ec07c";
                } else if (!locItem.active) {
                    badge = loc("quest.obj_pending", "[🔒 EN ATTENTE]");
                    badgeColor = "#7c6f64";
                }

                this.contents.fontSize = 13;
                this.contents.textColor = badgeColor;
                this.drawText(badge, 32, curY + 6, 120, "left");

                // Nom de l'objectif
                this.contents.textColor = locItem.completed ? "#a89984" : "#fbf1c7";
                this.drawText(locItem.name, 160, curY + 6, width - 210, "left");

                // Description
                this.contents.fontSize = 12;
                this.contents.textColor = "#d5c4a1";
                this.drawText(locItem.description || loc("quest.default_reach", "Rejoindre la zone indiquée."), 32, curY + 26, width - 64, "left");

                // Breadcrumb géographique
                const sys = sector && sector.systems ? sector.systems.find(s => s && s.id === locItem.systemId) : null;
                const sysName = sys ? (typeof SC4_Localization !== "undefined" ? SC4_Localization.parse(sys.name) : sys.name) : `${loc("travel.system_default", "Système")} ${locItem.systemId}`;
                const pl = planets.find(p => p && (p.dbId === locItem.planetId || p.id === locItem.planetId));
                const bodyLbl = loc("travel.body_default", loc("travel.celestial_body", "Corps"));
                const plName = pl ? (typeof SC4_Localization !== "undefined" ? SC4_Localization.parse(pl.name) : pl.name) : (locItem.planetId !== null && locItem.planetId !== undefined ? `${bodyLbl} ${locItem.planetId}` : "");
                const allPois = window.$dataPois || [];
                const poi = allPois.find(p => p && p.id === locItem.poiId) || (pl && Array.isArray(pl.pois) ? pl.pois.find(p => p && p.id === locItem.poiId) : null);
                const isLocated = !locItem.poiId || (window.$gameSystem && typeof window.$gameSystem.isPoiLocated === "function" ? window.$gameSystem.isPoiLocated(locItem.poiId) : true);

                let poiDisplayName = "";
                if (locItem.poiId) {
                    if (isLocated) {
                        poiDisplayName = poi ? (typeof SC4_Localization !== "undefined" ? SC4_Localization.parse(poi.name) : poi.name) : locItem.poiId;
                    } else {
                        poiDisplayName = loc("quest.unknown_poi", "??? [Site non découvert]");
                    }
                }

                const breadcrumb = `📍 ${secName} ▹ ${sysName}${plName ? " ▹ " + plName : ""}${poiDisplayName ? " ▹ " + poiDisplayName : ""}`;
                this.contents.textColor = isLocated ? "#83a598" : "#fe8019";
                this.drawText(breadcrumb, 32, curY + 46, width - 64, "left");

                if (!isLocated) {
                    this.contents.fontSize = 12;
                    this.contents.textColor = "#fb4934";
                    this.drawText(`⚠ ${loc("quest.poi_unlocated_task", "À localiser : Coordonnées du site inconnues")}`, 32, curY + 64, width - 64, "left");
                    curY += 20;
                }

                curY += 74;
            });
        }

        // 6. Récompenses de Mission
        const rewards = q.rewards;
        if (rewards) {
            this.contents.fontSize = 14;
            this.contents.textColor = "#fabd2f";
            this.drawText(loc("quest.rewards_title", "◈ RÉCOMPENSES DE MISSION"), 16, curY, width - 32, "left");
            curY += 24;

            if (q.rewardVisible === false) {
                this.contents.fillRect(24, curY + 4, width - 48, 26, "#1d2021");
                this.contents.fontSize = 13;
                this.contents.textColor = "#fb4934";
                this.drawText(loc("quest.rewards_hidden", "??? [DONNÉES CLASSIFIÉES / INCONNUES]"), 32, curY + 6, width - 64, "left");
                curY += 34;
            } else {
                if (rewards.gold > 0) {
                    this.contents.fillRect(24, curY + 4, width - 48, 26, "#1d2021");
                    this.contents.fontSize = 13;
                    this.contents.textColor = "#fabd2f";
                    const creditsLbl = loc("quest.reward_credits", loc("quest.credits", "Crédits"));
                    this.drawText(`🪙 ${rewards.gold} ${creditsLbl}`, 32, curY + 6, width - 64, "left");
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

                        this.contents.fillRect(24, curY + 4, width - 48, 26, "#1d2021");
                        this.contents.fontSize = 13;
                        this.contents.textColor = "#ebdbb2";
                        this.drawText(`📦 ${itName} x${it.quantity}`, 32, curY + 6, width - 64, "left");
                        curY += 30;
                    });
                }
            }
        }
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


//=============================================================================
// RPG Maker MZ - SC4_Scene_QuestBook
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Scène du Datapad stellaire et journal de quêtes.
 * @author SimCraft
 * @base SC4_Window_QuestBookHeader
 * @base SC4_Window_QuestFilter
 * @base SC4_Window_QuestList
 * @base SC4_Window_QuestDetail
 * 
 * @help SC4_Scene_QuestBook.js
 */

// Fallback loader pour les tests Node.js
if (typeof Window_QuestBookHeader === "undefined") {
    try {
        const _getMod = (name) => {
            if (typeof require === "function") return require(name);
            if (typeof process !== "undefined" && process.mainModule && process.mainModule.require) return process.mainModule.require(name);
            return null;
        };
        const _fs = _getMod('fs');
        const _path = _getMod('path');
        const _vm = _getMod('vm');
        if (_fs && _path && _vm) {
            let pluginsDir = _path.resolve('js/plugins');
            if (!_fs.existsSync(pluginsDir) && typeof __dirname !== 'undefined') {
                const candidate = _path.resolve(__dirname, '../js/plugins');
                if (_fs.existsSync(candidate)) pluginsDir = candidate;
            }
            if (!_fs.existsSync(pluginsDir) && typeof process !== 'undefined') {
                const candidate2 = _path.resolve(process.cwd(), 'js/plugins');
                if (_fs.existsSync(candidate2)) pluginsDir = candidate2;
            }
            const files = [
                'SC4_Window_QuestBookHeader.js',
                'SC4_Window_QuestFilter.js',
                'SC4_Window_QuestList.js',
                'SC4_Window_QuestDetail.js'
            ];
            for (const f of files) {
                const p = _path.join(pluginsDir, f);
                if (_fs.existsSync(p)) _vm.runInThisContext(_fs.readFileSync(p, 'utf8'));
            }
        }
    } catch (e) {}
}

const _BaseSceneQuestBook = typeof Scene_MenuBase !== "undefined" ? Scene_MenuBase : (typeof Scene_Base !== "undefined" ? Scene_Base : Object);

class Scene_QuestBook extends _BaseSceneQuestBook {
    create() {
        super.create();
        //this.createBackground();
        this.createHeaderWindow();
        this.createFilterWindow();
        this.createListWindow();
        this.createDetailWindow();
    }

    createBackground() {
        this._bgSprite = new Sprite();
        this._bgSprite.bitmap = ImageManager.loadBitmap("img/GUI/ship/", "travelScreenBg");
        this.addChild(this._bgSprite);

        this._spaceSprite = new Sprite();
        this._spaceSprite.bitmap = ImageManager.loadBitmap("img/GUI/ship/", "space");
        this._spaceSprite.opacity = 210;
        this.addChild(this._spaceSprite);
    }

    createHeaderWindow() {
        const rect = new Rectangle(20, 12, Graphics.width - 40, 52);
        this._headerWindow = new Window_QuestBookHeader(rect);
        this.addWindow(this._headerWindow);
    }

    createFilterWindow() {
        const rect = new Rectangle(20, 68, 430, 50);
        this._filterWindow = new Window_QuestFilter(rect);
        this._filterWindow.setHandler("active", this.onFilterChange.bind(this, "active"));
        this._filterWindow.setHandler("recurring", this.onFilterChange.bind(this, "recurring"));
        this._filterWindow.setHandler("completed", this.onFilterChange.bind(this, "completed"));
        this._filterWindow.setHandler("all", this.onFilterChange.bind(this, "all"));
        this._filterWindow.setHandler("cancel", this.popScene.bind(this));
        this.addWindow(this._filterWindow);
    }

    createListWindow() {
        const rect = new Rectangle(20, 122, 430, Graphics.height - 134);
        this._listWindow = new Window_QuestList(rect);
        this._listWindow.setHandler("cancel", this.popScene.bind(this));
        this._listWindow.setHandler("ok", () => {
            const q = this._listWindow.item();
            if (q) {
                q.toggleTracking();
                SoundManager.playOk();
                this._listWindow.refresh();
                this._detailWindow.refresh();
            }
            this._listWindow.activate();
        });

        // Navigation par flèches gauche/droite pour cycler les filtres
        this._listWindow._onCycleFilter = (dir) => {
            const symbols = ["active", "recurring", "completed", "all"];
            let idx = symbols.indexOf(this._filterWindow.currentSymbol());
            idx = (idx + dir + symbols.length) % symbols.length;
            this._filterWindow.select(idx);
            this.onFilterChange(symbols[idx]);
        };

        this.addWindow(this._listWindow);
        this._listWindow.activate();
        this._listWindow.select(0);
    }

    createDetailWindow() {
        const rect = new Rectangle(460, 68, Graphics.width - 480, Graphics.height - 80);
        this._detailWindow = new Window_QuestDetail(rect);
        this.addWindow(this._detailWindow);
        this._listWindow.setDetailWindow(this._detailWindow);
    }

    onFilterChange(filterKey) {
        if (this._listWindow) {
            this._listWindow.setFilter(filterKey);
            this._listWindow.activate();
            this._listWindow.select(0);
        }
    }
}

window.Scene_QuestBook = Scene_QuestBook;
if (typeof global !== "undefined") {
    global.Scene_QuestBook = Scene_QuestBook;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { Scene_QuestBook };
}
