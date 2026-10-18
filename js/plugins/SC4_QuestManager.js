//=============================================================================
// SC4_QuestManager.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Gestionnaire de quêtes multi-échelles, balises galactiques et StoryManager.
 * @author SimCraft
 * 
 * @command openQuestBook
 * @text Ouvrir le Livre de Quêtes
 * @desc Ouvre le Datapad / Livre de Quêtes affichant toutes les missions, objectifs et transmissions.
 * 
 * @help
 * ============================================================================
 * SC4_QuestManager.js
 * ============================================================================
 * Fournit la séparation stricte des responsabilités demandée :
 * 
 * 1. Game_Quests ($gameQuests) :
 *    - Registre de quêtes et suivi de progression.
 *    - Localisations hiérarchiques et multiples :
 *      Secteur -> Système -> Planète/Sous-système -> Point d'intérêt (POI).
 *    - Filtrage des balises visuelles selon l'échelle :
 *      • hasIndicatorForSystem(systemId) (Carte Galactique)
 *      • hasIndicatorForPlanet(planetId) (Carte du Système)
 *      • hasIndicatorForPoi(poiId)       (Carte du Sous-système)
 *    - Activation / Désactivation dynamique d'objectifs intermédiaires.
 * 
 * 2. StoryManager ($storyManager) :
 *    - Déclencheur temporel et scénaristique.
 *    - Écoute $gameDate.timestamp pour amorcer les transmissions et quêtes.
 *    - Envoie les messages au terminal CRT de vol via $systemMapManager.log().
 * 
 * 3. Livre de Quêtes / Datapad (Scene_QuestBook) :
 *    - Interface complète de consultation des missions (actives, terminées, toutes).
 *    - Affichage des briefings, journaux de transmission et objectifs géolocalisés.
 *    - Accès rapide par script : SC4.openQuestBook() ou SceneManager.openQuestBook().
 *    - Commande d'événement RMMZ : openQuestBook.
 * 
 * 4. Persistance complète dans les sauvegardes via SC_DataManager.
 * ============================================================================
 */

// ============================================================================
// 1. MODÈLES : LOCALISATION & QUÊTE
// ============================================================================

class Game_QuestLocation {
    constructor(data) {
        this._id = data.id || "loc_0";
        this._name = data.name || "Objectif";
        this._description = data.description || "";
        this._sectorId = typeof data.sectorId === "number" ? data.sectorId : 0;
        this._systemId = typeof data.systemId === "number" ? data.systemId : 0;
        this._planetId = data.planetId !== undefined ? data.planetId : null;
        this._poiId = data.poiId || null;
        this._active = data.active !== false;
        this._completed = data.completed === true;
    }

    get id() { return this._id; }
    get name() { return this._name; }
    get description() { return this._description; }
    get sectorId() { return this._sectorId; }
    get systemId() { return this._systemId; }
    get planetId() { return this._planetId; }
    get poiId() { return this._poiId; }
    get active() { return this._active && !this._completed; }
    get completed() { return this._completed; }

    activate() { this._active = true; }
    deactivate() { this._active = false; }
    complete() { this._completed = true; }

    makeSavefileData() {
        return {
            id: this._id,
            active: this._active,
            completed: this._completed
        };
    }

    loadSavefileData(data) {
        if (data) {
            if (typeof data.active === "boolean") this._active = data.active;
            if (typeof data.completed === "boolean") this._completed = data.completed;
        }
    }
}

class Game_Quest {
    constructor(data) {
        this._id = data.id;
        this._name = data.name || "Quête sans nom";
        this._description = data.description || "";
        this._iconName = data.iconName || "mapIcon_qust";
        this._triggerTimestamp = typeof data.triggerTimestamp === "number" ? data.triggerTimestamp : 0;
        this._alertTxt = Array.isArray(data.alertTxt) ? [...data.alertTxt] : [];
        this._active = data.active === true;
        this._completed = false;
        this._failed = false;

        this._locations = [];
        if (Array.isArray(data.locations)) {
            this._locations = data.locations.map(loc => new Game_QuestLocation(loc));
        }
    }

    get id() { return this._id; }
    get name() { return this._name; }
    get description() { return this._description; }
    get iconName() { return this._iconName; }
    get triggerTimestamp() { return this._triggerTimestamp; }
    get alertTxt() { return this._alertTxt; }
    get active() { return this._active && !this._completed && !this._failed; }
    get completed() { return this._completed; }
    get failed() { return this._failed; }
    get locations() { return this._locations; }

    activate() { this._active = true; }
    deactivate() { this._active = false; }

    complete() {
        this._completed = true;
        this._locations.forEach(loc => loc.complete());
    }

    fail() {
        this._failed = true;
    }

    activeLocations() {
        if (!this.active) return [];
        return this._locations.filter(loc => loc.active);
    }

    location(locId) {
        return this._locations.find(l => l.id === locId) || null;
    }

    makeSavefileData() {
        return {
            id: this._id,
            active: this._active,
            completed: this._completed,
            failed: this._failed,
            locations: this._locations.map(l => l.makeSavefileData())
        };
    }

    loadSavefileData(data) {
        if (!data) return;
        if (typeof data.active === "boolean") this._active = data.active;
        if (typeof data.completed === "boolean") this._completed = data.completed;
        if (typeof data.failed === "boolean") this._failed = data.failed;
        if (Array.isArray(data.locations)) {
            data.locations.forEach(lData => {
                const loc = this.location(lData.id);
                if (loc) loc.loadSavefileData(lData);
            });
        }
    }
}

// ============================================================================
// 2. GESTIONNAIRE DE QUÊTES ($gameQuests)
// ============================================================================

class Game_Quests {
    constructor() {
        this._quests = [];
        this.initQuests();
    }

    initQuests() {
        const raw = window.$dataQuests || [];
        this._quests = raw.map(q => new Game_Quest(q));
    }

    quests() {
        if (this._quests.length === 0 && Array.isArray(window.$dataQuests) && window.$dataQuests.length > 0) {
            this.initQuests();
        }
        return this._quests;
    }

    quest(questId) {
        return this.quests().find(q => q.id === questId) || null;
    }

    activeQuests() {
        return this.quests().filter(q => q.active);
    }

    // --- RECHERCHE MULTI-ÉCHELLES DES BALISES ---

    /**
     * Vérifie si un système solaire contient au moins un objectif actif.
     */
    hasIndicatorForSystem(systemId) {
        return this.activeQuests().some(q => 
            q.activeLocations().some(loc => loc.systemId === systemId)
        );
    }

    getIndicatorsForSystem(systemId) {
        const indicators = [];
        this.activeQuests().forEach(q => {
            q.activeLocations().forEach(loc => {
                if (loc.systemId === systemId) {
                    indicators.push({ quest: q, location: loc });
                }
            });
        });
        return indicators;
    }

    /**
     * Vérifie si une planète contient au moins un objectif actif.
     */
    hasIndicatorForPlanet(planetId) {
        return this.activeQuests().some(q => 
            q.activeLocations().some(loc => loc.planetId === planetId)
        );
    }

    getIndicatorsForPlanet(planetId) {
        const indicators = [];
        this.activeQuests().forEach(q => {
            q.activeLocations().forEach(loc => {
                if (loc.planetId === planetId) {
                    indicators.push({ quest: q, location: loc });
                }
            });
        });
        return indicators;
    }

    /**
     * Vérifie si un POI précis contient un objectif actif.
     */
    hasIndicatorForPoi(poiId) {
        if (!poiId) return false;
        return this.activeQuests().some(q => 
            q.activeLocations().some(loc => loc.poiId === poiId)
        );
    }

    getIndicatorsForPoi(poiId) {
        if (!poiId) return [];
        const indicators = [];
        this.activeQuests().forEach(q => {
            q.activeLocations().forEach(loc => {
                if (loc.poiId === poiId) {
                    indicators.push({ quest: q, location: loc });
                }
            });
        });
        return indicators;
    }

    makeSavefileData() {
        return this.quests().map(q => q.makeSavefileData());
    }

    loadSavefileData(data) {
        if (Array.isArray(data)) {
            data.forEach(qData => {
                const quest = this.quest(qData.id);
                if (quest) quest.loadSavefileData(qData);
            });
        }
    }
}

// ============================================================================
// 3. STORY MANAGER : DÉCLENCHEUR TEMPOREL & SCÉNARISTIQUE
// ============================================================================

class StoryManager {
    constructor() {
        this._triggeredQuests = new Set();
    }

    update() {
        if (!window.$gameDate || !window.$gameQuests) return;
        const currentTimestamp = window.$gameDate.timestamp;

        window.$gameQuests.quests().forEach(quest => {
            if (!quest.active && !quest.completed && !quest.failed && !this._triggeredQuests.has(quest.id)) {
                if (currentTimestamp >= quest.triggerTimestamp) {
                    this.startQuest(quest.id);
                }
            }
        });
    }

    startQuest(questId) {
        const quest = window.$gameQuests ? window.$gameQuests.quest(questId) : null;
        if (!quest) return;

        this._triggeredQuests.add(questId);
        quest.activate();

        // Envoi des alertes radio / astropathiques au terminal de vol
        if (quest.alertTxt && Array.isArray(quest.alertTxt) && window.$systemMapManager) {
            quest.alertTxt.forEach(item => {
                window.$systemMapManager.log(item.style || "info", item.txt);
            });
        }
    }

    makeSavefileData() {
        return {
            triggeredQuests: Array.from(this._triggeredQuests)
        };
    }

    loadSavefileData(data) {
        this._triggeredQuests.clear();
        if (data && Array.isArray(data.triggeredQuests)) {
            data.triggeredQuests.forEach(id => this._triggeredQuests.add(id));
        }
    }
}

// Instances globales
window.$gameQuests = new Game_Quests();
window.$storyManager = new StoryManager();

// ============================================================================
// 4. INTERFACE GRAPHIQUE : LIVRE DE QUÊTES & DATAPAD (Scene_QuestBook)
// ============================================================================

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
        this.drawText("DATAPAD IMPÉRIAL ▷ REGISTRE DES MISSIONS & TRANSMISSIONS", 12, 0, this.contentsWidth() - 320, "left");

        // Horloge 40K
        const timeStr = window.$gameDate ? Game_DateFormatter.format40K($gameDate) : "";
        this.contents.textColor = "#fabd2f";
        this.drawText(timeStr, this.contentsWidth() - 300, 0, 280, "right");
    }
}

class Window_QuestFilter extends Window_HorzCommand {
    constructor(rect) {
        super(rect);
    }

    maxCols() {
        return 3;
    }

    makeCommandList() {
        const qm = window.$gameQuests;
        const allQuests = qm ? qm.quests() : [];
        const activeCount = allQuests.filter(q => q.active).length;
        const completedCount = allQuests.filter(q => q.completed).length;
        const totalCount = allQuests.length;

        this.addCommand(`En cours (${activeCount})`, "active");
        this.addCommand(`Terminées (${completedCount})`, "completed");
        this.addCommand(`Toutes (${totalCount})`, "all");
    }
}

class Window_QuestList extends Window_Selectable {
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
            this._data = all.filter(q => q.active);
        } else if (this._filter === "completed") {
            this._data = all.filter(q => q.completed);
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

        // Puce / Icône
        const marker = quest.completed ? "✔" : (quest.active ? "◈" : "○");
        this.contents.fontSize = 15;
        this.contents.textColor = quest.completed ? "#8ec07c" : (quest.active ? "#fabd2f" : "#928374");
        this.drawText(marker, rect.x, rect.y + 4, 24, "center");

        // Titre
        this.contents.fontSize = 14;
        this.contents.textColor = quest.completed ? "#a89984" : (quest.active ? "#ebdbb2" : "#7c6f64");
        const titleW = rect.width - 100;
        this.drawText(quest.name, rect.x + 28, rect.y + 4, titleW, "left");

        // Badge objectifs
        const completedLocs = quest.locations.filter(l => l.completed).length;
        const totalLocs = quest.locations.length;
        this.contents.fontSize = 12;
        this.contents.textColor = quest.completed ? "#8ec07c" : "#83a598";
        const objTxt = totalLocs > 0 ? `${completedLocs}/${totalLocs} obj.` : "";
        this.drawText(objTxt, rect.x + rect.width - 70, rect.y + 4, 65, "right");
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

class Window_QuestDetail extends Window_Scrollable {
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
        let h = 80;
        h += 30;
        const descWords = (this._quest.description || "").split(" ").length;
        h += Math.max(30, Math.ceil(descWords / 12) * 22) + 20;
        if (this._quest.alertTxt && this._quest.alertTxt.length > 0) {
            h += 30 + this._quest.alertTxt.length * 26 + 20;
        }
        if (this._quest.locations && this._quest.locations.length > 0) {
            h += 30 + this._quest.locations.length * 76 + 20;
        }
        return Math.max(this.innerHeight, h);
    }

    paint() {
        this.contents.clear();
        const width = this.innerWidth;
        this.contents.fontFace = $gameSystem ? $gameSystem.mainFontFace() : "sans-serif";
        this.contents.outlineColor = "#000000";
        this.contents.outlineWidth = 3;

        if (!this._quest) {
            this.contents.fontSize = 15;
            this.contents.textColor = "#928374";
            this.drawText("Sélectionnez une mission dans la liste à gauche.", 20, 40, width - 40, "center");
            return;
        }

        const q = this._quest;
        let curY = 8;

        // 1. Titre & En-tête
        this.contents.fontSize = 20;
        this.contents.textColor = "#fabd2f";
        this.drawText(q.name, 16, curY, width - 32, "left");
        curY += 28;

        // Statut & Date
        this.contents.fontSize = 13;
        let stText = "NON DÉCLENCHÉE";
        let stColor = "#928374";
        if (q.completed) {
            stText = "[ MISSION ACCOMPLIE ]";
            stColor = "#8ec07c";
        } else if (q.active) {
            stText = "[ EN COURS D'EXÉCUTION ]";
            stColor = "#4da6ff";
        } else if (q.failed) {
            stText = "[ ÉCHOUÉE ]";
            stColor = "#fb4934";
        }
        this.contents.textColor = stColor;
        this.drawText(stText, 16, curY, 240, "left");

        this.contents.textColor = "#a89984";
        const dateStr = window.$gameDate ? Game_DateFormatter.format40K($gameDate) : "";
        this.drawText(`Date stellaire : ${dateStr}`, 260, curY, width - 276, "right");
        curY += 24;

        // Séparateur
        this.contents.fillRect(16, curY, width - 32, 2, "#504945");
        curY += 14;

        // 2. Ordres de Mission & Briefing
        this.contents.fontSize = 14;
        this.contents.textColor = "#83a598";
        this.drawText("◈ ORDRES DE MISSION & BRIEFING TACTIQUE", 16, curY, width - 32, "left");
        curY += 22;

        this.contents.fontSize = 13;
        this.contents.textColor = "#ebdbb2";
        curY = this.drawWrappedText(q.description || "Aucun détail complémentaire fourni.", 24, curY, width - 48, 20);
        curY += 16;

        // 3. Transmissions Radio Interceptées (alertTxt)
        if (q.alertTxt && Array.isArray(q.alertTxt) && q.alertTxt.length > 0) {
            this.contents.fontSize = 14;
            this.contents.textColor = "#fe8019";
            this.drawText("◈ COMMUNICATIONS ASTROPATHIQUES & LOGS", 16, curY, width - 32, "left");
            curY += 22;

            q.alertTxt.forEach(item => {
                this.contents.fillRect(24, curY - 2, width - 48, 22, "#1d2021");
                this.contents.fontSize = 12;
                this.contents.textColor = item.style === "alert" ? "#fb4934" : "#b8bb26";
                this.drawText(`▶ ${item.txt}`, 30, curY, width - 60, "left");
                curY += 24;
            });
            curY += 14;
        }

        // 4. Objectifs Tactiques & Géolocalisation
        if (q.locations && Array.isArray(q.locations) && q.locations.length > 0) {
            this.contents.fontSize = 14;
            this.contents.textColor = "#8ec07c";
            this.drawText("◈ OBJECTIFS TACTIQUES & GÉOLOCALISATION", 16, curY, width - 32, "left");
            curY += 24;

            const sector = window.$gameSector ? window.$gameSector.currentSectorData() : null;
            const secName = sector ? sector.name : "Secteur";
            const planets = window.$dataPlanets || [];

            q.locations.forEach(loc => {
                // Fond de l'objectif
                this.contents.fillRect(24, curY, width - 48, 68, "#282828");

                // Badge d'état
                let badge = "[► EN COURS]";
                let badgeColor = "#fabd2f";
                if (loc.completed) {
                    badge = "[✔ TERMINÉ]";
                    badgeColor = "#8ec07c";
                } else if (!loc.active) {
                    badge = "[🔒 EN ATTENTE]";
                    badgeColor = "#7c6f64";
                }

                this.contents.fontSize = 13;
                this.contents.textColor = badgeColor;
                this.drawText(badge, 32, curY + 6, 120, "left");

                // Nom de l'objectif
                this.contents.textColor = loc.completed ? "#a89984" : "#fbf1c7";
                this.drawText(loc.name, 160, curY + 6, width - 210, "left");

                // Description
                this.contents.fontSize = 12;
                this.contents.textColor = "#d5c4a1";
                this.drawText(loc.description || "Rejoindre la zone indiquée.", 32, curY + 26, width - 64, "left");

                // Breadcrumb géographique
                const sys = sector && sector.systems ? sector.systems.find(s => s.id === loc.systemId) : null;
                const sysName = sys ? sys.name : `Système ${loc.systemId}`;
                const pl = planets.find(p => p.id === loc.planetId);
                const plName = pl ? pl.name : (loc.planetId !== null ? `Corps ${loc.planetId}` : "");
                const poi = pl && Array.isArray(pl.pois) ? pl.pois.find(p => p.id === loc.poiId) : null;
                const poiName = poi ? poi.name : (loc.poiId ? loc.poiId : "");

                const breadcrumb = `📍 ${secName} ▹ ${sysName}${plName ? " ▹ " + plName : ""}${poiName ? " ▹ " + poiName : ""}`;
                this.contents.textColor = "#83a598";
                this.drawText(breadcrumb, 32, curY + 46, width - 64, "left");

                curY += 74;
            });
        }
    }

    refresh() {
        this.paint();
    }

    drawWrappedText(text, x, y, maxWidth, lineHeight = 20) {
        if (!text) return y;
        const words = text.split(" ");
        let line = "";
        let curY = y;
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
        return curY;
    }
}

class Scene_QuestBook extends Scene_MenuBase {
    create() {
        super.create();
        this.createBackground();
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
        const rect = new Rectangle(20, 68, 420, 50);
        this._filterWindow = new Window_QuestFilter(rect);
        this._filterWindow.setHandler("active", this.onFilterChange.bind(this, "active"));
        this._filterWindow.setHandler("completed", this.onFilterChange.bind(this, "completed"));
        this._filterWindow.setHandler("all", this.onFilterChange.bind(this, "all"));
        this._filterWindow.setHandler("cancel", this.popScene.bind(this));
        this.addWindow(this._filterWindow);
    }

    createListWindow() {
        const rect = new Rectangle(20, 122, 420, Graphics.height - 134);
        this._listWindow = new Window_QuestList(rect);
        this._listWindow.setHandler("cancel", this.popScene.bind(this));
        this._listWindow.setHandler("ok", () => {
            SoundManager.playOk();
            this._listWindow.activate();
        });

        // Navigation par flèches gauche/droite pour cycler les filtres
        this._listWindow._onCycleFilter = (dir) => {
            const symbols = ["active", "completed", "all"];
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
        const rect = new Rectangle(450, 68, Graphics.width - 470, Graphics.height - 80);
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

// Export global et Commandes RMMZ
window.Scene_QuestBook = Scene_QuestBook;
window.SC4 = window.SC4 || {};

/**
 * Ouvre directement l'interface du Livre de Quêtes (Datapad).
 * Utilisable partout en script RMMZ : SC4.openQuestBook() ou SceneManager.openQuestBook().
 */
SC4.openQuestBook = function() {
    SceneManager.push(Scene_QuestBook);
};
SceneManager.openQuestBook = SC4.openQuestBook;

// Enregistrement de la commande de plugin pour les événements RMMZ
PluginManager.registerCommand("SC4_QuestManager", "openQuestBook", () => {
    SC4.openQuestBook();
});
