//=============================================================================
// RPG Maker MZ - SC4_Scene_Inventory
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Scène de gestion et de transfert d'inventaires multiples (Layout Cyberpunk / ARPG).
 * @author SimCraft
 * @base SC4_Window_InventoryCommand
 * @base SC4_Window_InventoryList
 * @base SC4_Window_InventoryAction
 * @base SC4_Window_InventoryHeader
 * @base SC4_Window_InventoryCompare
 * @base SC4_Window_Tuto
 * @base SC4_Sprite_InventoryArrow
 * 
 * @help SC4_Scene_Inventory.js
 */

class Scene_Inventory extends Scene_MenuBase {
    static prepare(inventoryId, options = {}) {
        this._preparedId = String(inventoryId).trim();
        this._preparedOptions = options;
    }

    // ========================================================================
    // 1. INITIALISATION & GÉOMÉTRIE ADAPTATIVE
    // ========================================================================

    margin() {
        return 16;
    }

    needsCancelButton() {
        return false;
    }

    columnWidth() {
        const bw = (typeof Graphics !== "undefined" && Graphics.boxWidth) ? Graphics.boxWidth : 1280;
        return Math.round(bw * 0.28);
    }

    headerHeight() {
        return 168;
    }

    commandHeight() {
        return this.calcWindowHeight(1, true);
    }

    update() {
        super.update();
        if (this._playerLiveSprite && typeof this._playerLiveSprite.update === "function") {
            this._playerLiveSprite.update();
        }
        const isTutoBusy = Boolean(typeof $tutoManager !== "undefined" && $tutoManager && typeof $tutoManager.isBusy === "function" && $tutoManager.isBusy());
        const actionOpen = Boolean(this._actionWindow && (this._actionWindow.active || this._actionWindow.openness > 0));
        if (this._initialTutorialsChecked && !isTutoBusy && !actionOpen) {
            this.checkWeightGaugeTutorial();
        }
        if (typeof $tutoManager !== "undefined" && $tutoManager && typeof $tutoManager.update === "function") {
            $tutoManager.update();
        }
        this.updateTutoInputGuard();
    }

    create() {
        super.create();
        this._initialTutorialsChecked = false;
        this._targetId = Scene_Inventory._preparedId || "C_1";
        this._options = Scene_Inventory._preparedOptions || {};
        this._targetInventory = (typeof $inventories !== "undefined" && $inventories)
            ? $inventories.inventory(this._targetId)
            : null;

        this.createHelpWindow();
        this.createCompareWindow();
        this.createHeaders();
        this.createPartyWindow();
        this.createTargetWindow();
        this.createCommandWindow();
        this.createArrowSprite();
        this.createActionWindow();
        this.createTutoWindow();
    }

    start() {
        super.start();
        this.refreshAll();
        this._commandWindow.activate();
        this._commandWindow.select(0);
        this.checkInitialTutorials();
        this._initialTutorialsChecked = true;
    }

    // ========================================================================
    // 2. FOND DE SCÈNE FOCUS & VIGNETTE (Photomask in-world)
    // ========================================================================

    createBackground() {
        // 1. Snapshot net de la carte (aucun flou agressif)
        this._backgroundSprite = new Sprite();
        if (typeof SceneManager !== "undefined" && typeof SceneManager.backgroundBitmap === "function") {
            this._backgroundSprite.bitmap = SceneManager.backgroundBitmap();
        }
        this.addChild(this._backgroundSprite);

        // 2. Masque de focus radial / Vignette (PF-Mouvement.jpg en MULTIPLY centré sur le joueur)
        this.createFocusVignette();

        // 3. Sprite vivant du joueur à ses coordonnées écran réelles (réactif en direct à l'équipement)
        const player = (typeof $gamePlayer !== "undefined") ? $gamePlayer : null;
        if (player) {
            const SpriteClass = (typeof Sprite_Hero !== "undefined") ? Sprite_Hero : (typeof Sprite_Character !== "undefined" ? Sprite_Character : null);
            if (SpriteClass) {
                this._playerLiveSprite = new SpriteClass(player);
                this._playerLiveSprite.x = player.screenX();
                this._playerLiveSprite.y = player.screenY();
                this._playerLiveSprite.visible = true;
                // Forcer la visibilité même si $gamePlayer était momentanément transparent lors du snap
                this._playerLiveSprite.updateVisibility = function () {
                    this.visible = true;
                };
                this.addChild(this._playerLiveSprite);
            }
        }
    }

    createFocusVignette() {
        const w = (typeof Graphics !== "undefined" && Graphics.boxWidth) ? Graphics.boxWidth : 1280;
        const h = (typeof Graphics !== "undefined" && Graphics.boxHeight) ? Graphics.boxHeight : 720;
        const player = (typeof $gamePlayer !== "undefined") ? $gamePlayer : null;
        const cx = player ? player.screenX() : (w / 2);
        const cy = player ? (player.screenY() - 24) : (h / 2);

        let maskLoaded = false;
        if (typeof ImageManager !== "undefined" && typeof ImageManager.loadBitmap === "function") {
            const maskBmp = ImageManager.loadBitmap("img/GUI/inventory/", "PF-Mouvement");
            if (maskBmp && !maskBmp.isError()) {
                this._vignetteSprite = new Sprite(maskBmp);
                this._vignetteSprite.anchor.x = 0.5;
                this._vignetteSprite.anchor.y = 0.5;
                this._vignetteSprite.x = cx;
                this._vignetteSprite.y = cy;

                const maxDim = Math.max(w, h);
                const initialDim = (maskBmp.width > 0) ? maskBmp.width : 400;
                const s = (maxDim * 2.5) / initialDim;
                this._vignetteSprite.scale.x = s;
                this._vignetteSprite.scale.y = s;
                this._vignetteSprite.blendMode = (typeof PIXI !== "undefined" && PIXI.BLEND_MODES) ? PIXI.BLEND_MODES.MULTIPLY : 2;
                this._vignetteSprite.opacity = 255;
                this.addChild(this._vignetteSprite);

                maskBmp.addLoadListener(() => {
                    if (this._vignetteSprite && maskBmp.width > 0) {
                        const updatedScale = (maxDim * 2.5) / maskBmp.width;
                        this._vignetteSprite.scale.x = updatedScale;
                        this._vignetteSprite.scale.y = updatedScale;
                    }
                });
                maskLoaded = true;
            }
        }

        if (!maskLoaded) {
            // Repli procédural Canvas si PF-Mouvement.jpg n'est pas disponible
            const bmp = new Bitmap(w, h);
            const ctx = bmp.context;
            const rInner = Math.min(w, h) * 0.18;
            const rOuter = Math.max(w, h) * 0.65;

            const grad = ctx.createRadialGradient(cx, cy, rInner, cx, cy, rOuter);
            grad.addColorStop(0, "rgba(0, 0, 0, 0)");
            grad.addColorStop(0.35, "rgba(2, 6, 16, 0.25)");
            grad.addColorStop(0.70, "rgba(2, 6, 16, 0.65)");
            grad.addColorStop(1, "rgba(2, 6, 16, 0.88)");

            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            this._vignetteSprite = new Sprite(bmp);
            this.addChild(this._vignetteSprite);
        }
    }

    isTargetPersistent() {
        if (this._targetId && this._targetId.startsWith("E_")) {
            return false; // Strictement interdit de déposer dans un cadavre d'ennemi
        }
        if (this._targetId && this._targetId.startsWith("A_")) {
            return true;
        }
        if (this._options) {
            if (this._options.auto_erase === true || this._options.persistent === false) {
                return false;
            }
            if (this._options.persistent === true) {
                return true;
            }
        }
        if (this._targetInventory) {
            if (typeof this._targetInventory.isAutoErase === "function" && this._targetInventory.isAutoErase()) {
                return false;
            }
            if (typeof this._targetInventory.isPersistent === "function" && this._targetInventory.isPersistent()) {
                return true;
            }
            if (this._targetInventory._explicitEphemeral) {
                return false;
            }
        }
        // Par convention fondamentale : tout conteneur C_ est persistant par défaut
        if (this._targetId && this._targetId.startsWith("C_")) {
            return true;
        }
        return false;
    }

    // ========================================================================
    // 3. CRÉATION DES FENÊTRES & COMPOSANTS
    // ========================================================================

    createHelpWindow() {
        const rect = this.helpWindowRect();
        this._helpWindow = new Window_Help(rect);
        this.addWindow(this._helpWindow);
    }

    createCompareWindow() {
        const rect = this.helpWindowRect();
        if (typeof Window_InventoryCompare !== "undefined") {
            this._compareWindow = new Window_InventoryCompare(rect);
            this.addWindow(this._compareWindow);
        }
    }

    helpWindowRect() {
        const m = this.margin();
        const colW = this.columnWidth();
        const wx = m + colW + m;
        const wy = m;
        const ww = Graphics.boxWidth - colW * 2 - m * 4;
        const wh = this.headerHeight();
        return new Rectangle(wx, wy, ww, wh);
    }

    loc(key, def) {
        if (typeof SC4_Localization !== "undefined" && typeof SC4_Localization.getText === "function") {
            return SC4_Localization.getText(key, def);
        }
        if (typeof LocalisationManager !== "undefined" && typeof LocalisationManager.getText === "function") {
            return LocalisationManager.getText(key, def);
        }
        return def;
    }

    createHeaders() {
        const m = this.margin();
        const colW = this.columnWidth();
        const headerH = this.headerHeight();

        // 1. Header Joueur (Haut Gauche)
        const pRect = new Rectangle(m, m, colW, headerH);
        const pTitle = this.loc("inventory.player_bag", "Inventaire partagé");
        this._partyHeaderWindow = new Window_InventoryHeader(pRect, pTitle, true);
        this._partyHeaderWindow.setExcludeInventory(this._targetInventory);
        this.addWindow(this._partyHeaderWindow);

        // 2. Header Conteneur (Haut Droit)
        const tRect = new Rectangle(Graphics.boxWidth - m - colW, m, colW, headerH);
        const tTitle = this.formatTargetTitle();
        this._targetHeaderWindow = new Window_InventoryHeader(tRect, tTitle, false);
        this._targetHeaderWindow.setTargetInventory(this._targetInventory);
        this.addWindow(this._targetHeaderWindow);
    }

    createPartyWindow() {
        const rect = this.partyWindowRect();
        const title = this.loc("inventory.player_bag", "Inventaire partagé");
        this._partyWindow = new Window_InventoryList(rect, title, true);
        this._partyWindow.setExcludeInventory(this._targetInventory);
        this._partyWindow.setHeaderWindow(this._partyHeaderWindow);
        this._partyWindow.setHelpWindow(this._helpWindow);
        this._partyWindow.setHandler("ok", this.onPartyListOk.bind(this));
        this._partyWindow.setHandler("cancel", this.onListCancel.bind(this));
        this._partyWindow.setHandler("right", this.onSwitchToTarget.bind(this));
        this.addWindow(this._partyWindow);
    }

    partyWindowRect() {
        const m = this.margin();
        const colW = this.columnWidth();
        const headerH = this.headerHeight();
        const cmdH = this.commandHeight();
        const wx = m;
        const wy = m + headerH + m;
        const ww = colW;
        const wh = Graphics.boxHeight - headerH - cmdH - m * 4;
        return new Rectangle(wx, wy, ww, wh);
    }

    createTargetWindow() {
        const rect = this.targetWindowRect();
        const title = this.formatTargetTitle();
        this._targetWindow = new Window_InventoryList(rect, title, false);
        this._targetWindow.setHeaderWindow(this._targetHeaderWindow);
        this._targetWindow.setTargetInventory(this._targetInventory);
        this._targetWindow.setHelpWindow(this._helpWindow);
        this._targetWindow.setHandler("ok", this.onTargetListOk.bind(this));
        this._targetWindow.setHandler("cancel", this.onListCancel.bind(this));
        this._targetWindow.setHandler("left", this.onSwitchToParty.bind(this));
        this.addWindow(this._targetWindow);
    }

    targetWindowRect() {
        const m = this.margin();
        const colW = this.columnWidth();
        const headerH = this.headerHeight();
        const cmdH = this.commandHeight();
        const wx = Graphics.boxWidth - m - colW;
        const wy = m + headerH + m;
        const ww = colW;
        const wh = Graphics.boxHeight - headerH - cmdH - m * 4;
        return new Rectangle(wx, wy, ww, wh);
    }

    createCommandWindow() {
        const rect = this.commandWindowRect();
        this._commandWindow = new Window_InventoryCommand(rect);
        this._commandWindow.setTargetContext(this._targetInventory, this.isTargetPersistent());
        this._commandWindow.setHandler("take", this.onCommandTake.bind(this));
        this._commandWindow.setHandler("dump", this.onCommandDump.bind(this));
        this._commandWindow.setHandler("deposit", this.onCommandDeposit.bind(this));
        this._commandWindow.setHandler("filter", this.onCommandFilter.bind(this));
        this._commandWindow.setHandler("close", this.onCommandClose.bind(this));
        this._commandWindow.setHandler("cancel", this.onCommandClose.bind(this));
        this.addWindow(this._commandWindow);
    }

    commandWindowRect() {
        const m = this.margin();
        const cmdH = this.commandHeight();
        const wx = m;
        const wy = Graphics.boxHeight - m - cmdH;
        const ww = Graphics.boxWidth - m * 2;
        const wh = cmdH;
        return new Rectangle(wx, wy, ww, wh);
    }

    createArrowSprite() {
        this._arrowSprite = new Sprite_InventoryArrow();
        this.addChild(this._arrowSprite);
    }

    createActionWindow() {
        const rect = this.actionWindowRect();
        this._actionWindow = new Window_InventoryAction(rect);
        this._actionWindow.setHandler("take_one", this.onActionTakeOne.bind(this));
        this._actionWindow.setHandler("take_all", this.onActionTakeAll.bind(this));
        this._actionWindow.setHandler("equip", this.onActionEquip.bind(this));
        this._actionWindow.setHandler("consume", this.onActionConsume.bind(this));
        this._actionWindow.setHandler("deposit_one", this.onActionDepositOne.bind(this));
        this._actionWindow.setHandler("deposit_all", this.onActionDepositAll.bind(this));
        this._actionWindow.setHandler("drop_one", this.onActionDropOne.bind(this));
        this._actionWindow.setHandler("drop_all", this.onActionDropAll.bind(this));
        this._actionWindow.setHandler("cancel", this.onActionCancel.bind(this));
        this.addWindow(this._actionWindow);
    }

    actionWindowRect() {
        const ww = 250;
        const wh = this.calcWindowHeight(5, true);
        const wx = Math.floor((Graphics.boxWidth - ww) / 2);
        const wy = Math.floor((Graphics.boxHeight - wh) / 2);
        return new Rectangle(wx, wy, ww, wh);
    }

    createTutoWindow() {
        if (typeof Window_Tuto !== "undefined" && !this._tutoWindow) {
            if (typeof Sprite_TutoArrow !== "undefined" && !this._tutoArrowSprite) {
                this._tutoArrowSprite = new Sprite_TutoArrow();
                this.addChild(this._tutoArrowSprite);
            }
            this._tutoWindow = new Window_Tuto(this._tutoArrowSprite);
            this.addWindow(this._tutoWindow);
            if (this._tutoWindow._nameWindow) {
                this.addWindow(this._tutoWindow._nameWindow);
            }
            if (this._tutoWindow._confirmWindow) {
                this.addWindow(this._tutoWindow._confirmWindow);
            }
        }
    }

    // ========================================================================
    // 3 bis. ORCHESTRATION DES DIDACTICIELS CONTEXTUELS
    // ========================================================================

    updateTutoInputGuard() {
        const isTutoBusy = Boolean(typeof $tutoManager !== "undefined" && $tutoManager && typeof $tutoManager.isBusy === "function" && $tutoManager.isBusy());
        if (isTutoBusy) {
            if (!this._tutoGuardActive) {
                this._tutoGuardActive = true;
                this._preTutoActiveWindow = this.findActiveWindow();
                this.deactivateAllInventoryWindows();
            }
        } else if (this._tutoGuardActive) {
            this._tutoGuardActive = false;
            if (typeof Input !== "undefined" && typeof Input.clear === "function") {
                Input.clear();
            }
            if (typeof TouchInput !== "undefined" && typeof TouchInput.clear === "function") {
                TouchInput.clear();
            }
            const targetWin = this._preTutoActiveWindow || this._commandWindow;
            if (targetWin && typeof targetWin.activate === "function") {
                targetWin.activate();
            }
            this._preTutoActiveWindow = null;
        }
    }

    deactivateAllInventoryWindows() {
        if (this._commandWindow && typeof this._commandWindow.deactivate === "function") this._commandWindow.deactivate();
        if (this._partyWindow && typeof this._partyWindow.deactivate === "function") this._partyWindow.deactivate();
        if (this._targetWindow && typeof this._targetWindow.deactivate === "function") this._targetWindow.deactivate();
        if (this._actionWindow && typeof this._actionWindow.deactivate === "function") this._actionWindow.deactivate();
    }

    findActiveWindow() {
        if (this._actionWindow && this._actionWindow.active) return this._actionWindow;
        if (this._partyWindow && this._partyWindow.active) return this._partyWindow;
        if (this._targetWindow && this._targetWindow.active) return this._targetWindow;
        if (this._commandWindow && this._commandWindow.active) return this._commandWindow;
        return null;
    }

    hasDifferentiatedWeight() {
        if (this._partyHeaderWindow && typeof this._partyHeaderWindow.hasDifferentiatedWeight === "function") {
            return this._partyHeaderWindow.hasDifferentiatedWeight();
        }
        const sharedW = (typeof $gameParty !== "undefined" && $gameParty && typeof $gameParty.totalWeight === "function")
            ? $gameParty.totalWeight()
            : 0;
        const lInv = this.leaderPersonalInventory();
        const personalW = (lInv && typeof lInv.totalWeight === "function") ? lInv.totalWeight() : 0;
        return sharedW > 0 && personalW > 0;
    }

    checkWeightGaugeTutorial() {
        if (typeof $tutoManager === "undefined" || !$tutoManager) return false;
        if (typeof ConfigManager !== "undefined" && ConfigManager.contextualHelp === false) return false;
        if (typeof $tutoManager.isSeen !== "function" || $tutoManager.isSeen("tuto_inv_weight_gauge")) return false;
        if (!this.hasDifferentiatedWeight()) return false;

        const ph = this._partyHeaderWindow;
        const gRect = (ph && typeof ph.weightGaugeScreenRect === "function") ? ph.weightGaugeScreenRect() : null;
        const arrowX = gRect
            ? gRect.x + Math.round(gRect.width / 2)
            : (ph ? ph.x + Math.round(ph.width * 0.68) : 250);
        const arrowY = gRect
            ? gRect.y + gRect.height + 6
            : (ph ? ph.y + Math.round(ph.height * 0.65) : 120);

        return Boolean($tutoManager.show("tuto_inv_weight_gauge", {
            position: "center",
            arrow: { x: arrowX, y: arrowY, angle: 180 }
        }));
    }

    checkInitialTutorials() {
        if (typeof $tutoManager === "undefined" || !$tutoManager) return;
        if (typeof ConfigManager !== "undefined" && ConfigManager.contextualHelp === false) return;
        if (typeof $tutoManager.isSeen !== "function") return;

        // Tuto 6 : Découverte du diptyque Inventaire partagé / Conteneur
        if (!$tutoManager.isSeen("tuto_inv_transfer")) {
            const tw = this._targetWindow;
            const arrowX = tw ? tw.x + Math.round(tw.width / 2) : 900;
            const arrowY = tw ? tw.y + 20 : 200;

            $tutoManager.show("tuto_inv_transfer", {
                position: "center",
                arrow: { x: arrowX, y: arrowY, angle: 0 }
            });
        }

        // Tuto 11 : Explication de la double jauge partagée / perso juste après Tuto 6 (uniquement si différenciée)
        this.checkWeightGaugeTutorial();

        // Tuto 10 : Interaction directe avec les objets (Équiper / Consommer) à la suite
        if (!$tutoManager.isSeen("tuto_inv_interact")) {
            const pw = this._partyWindow;
            const pArrowX = pw ? pw.x + Math.round(pw.width / 2) : 300;
            const pArrowY = pw ? pw.y + 20 : 200;

            $tutoManager.show("tuto_inv_interact", {
                position: "center",
                arrow: { x: pArrowX, y: pArrowY, angle: 0 }
            });
        }

        // Tuto 7 : Commandes & Tri
        if (!$tutoManager.isSeen("tuto_inv_commands")) {
            const cw = this._commandWindow;
            const cmdArrowX = cw ? cw.x + Math.round(cw.width / 2) : 640;
            const cmdArrowY = cw ? cw.y - 12 : 640;

            $tutoManager.show("tuto_inv_commands", {
                position: "top",
                arrow: { x: cmdArrowX, y: cmdArrowY, angle: 0 }
            });
        }
    }

    checkActionTutorials(canEquip) {
        if (typeof $tutoManager === "undefined" || !$tutoManager) return;
        if (typeof ConfigManager !== "undefined" && ConfigManager.contextualHelp === false) return;

        // Tuto 8 : Modale contextuelle d'action
        if (typeof $tutoManager.isSeen === "function" && !$tutoManager.isSeen("tuto_inv_action")) {
            const aw = this._actionWindow;
            const arrowX = aw ? aw.x + Math.round(aw.width / 2) : 640;
            const arrowY = aw ? aw.y - 12 : 300;
            const pos = (aw && aw.x > 640) ? "middle-left" : "middle-right";

            $tutoManager.show("tuto_inv_action", {
                position: pos,
                arrow: { x: arrowX, y: arrowY, angle: 0 }
            });
        }

        // Tuto 9 : Fenêtre comparative d'équipement
        if (canEquip && typeof $tutoManager.isSeen === "function" && !$tutoManager.isSeen("tuto_inv_compare")) {
            const comp = this._compareWindow;
            const compArrowX = comp ? comp.x + Math.round(comp.width / 2) : 640;
            const compArrowY = comp ? comp.y + comp.height + 12 : 200;

            $tutoManager.show("tuto_inv_compare", {
                position: "center",
                arrow: { x: compArrowX, y: compArrowY, angle: 180 }
            });
        }
    }

    formatTargetTitle() {
        const id = this._targetId;
        if (id.startsWith("A_")) {
            const actorId = Number(id.slice(2));
            const actor = (typeof $gameActors !== "undefined" && $gameActors) ? $gameActors.actor(actorId) : null;
            return "👤 " + (actor ? actor.name() : `Allié #${actorId}`);
        } else if (id.startsWith("E_")) {
            const enemyId = Number(id.slice(2));
            const enemy = (typeof $dataEnemies !== "undefined" && $dataEnemies) ? $dataEnemies[enemyId] : null;
            return "💀 " + (enemy ? enemy.name : `Ennemi #${enemyId}`) + " (Butin)";
        } else if (id.startsWith("C_")) {
            const evId = Number(id.slice(2));
            return `📦 Conteneur #${evId}`;
        }
        return "📦 Inventaire";
    }

    // ========================================================================
    // 4. LOGIQUE DES COMMANDES GLOBALES (Prendre, Tout vider, Déposer, Fermer)
    // ========================================================================

    onCommandDump() {
        if (!this._targetInventory || this._targetInventory.isEmpty()) {
            this._commandWindow.activate();
            return;
        }
        const items = this._targetInventory.items();
        for (const item of items) {
            const amount = this._targetInventory.numItems(item);
            if (amount > 0) {
                this._targetInventory.loseItem(item, amount);
                if (typeof $gameParty !== "undefined" && $gameParty) {
                    $gameParty.gainItem(item, amount);
                }
            }
        }
        if (typeof SoundManager !== "undefined" && typeof SoundManager.playShop === "function") {
            SoundManager.playShop();
        }
        this.refreshAll();
        if (this._targetInventory && this._targetInventory.isEmpty()) {
            this.checkTargetEmptied();
        }
        this._commandWindow.activate();
        this.selectCommandAfterEmptied();
        if (this._initialTutorialsChecked) {
            this.checkWeightGaugeTutorial();
        }
    }

    selectCommandAfterEmptied() {
        const cmd = this._commandWindow;
        const depositIndex = cmd.findSymbol("deposit");
        if (this.isTargetPersistent() && depositIndex >= 0 && cmd.isCommandEnabled(depositIndex)) {
            cmd.selectSymbol("deposit");
        } else {
            cmd.selectSymbol("close");
        }
    }

    onCommandClose() {
        if (typeof $gameParty !== "undefined" && $gameParty && typeof $gameParty.isOverweight === "function" && $gameParty.isOverweight()) {
            if (typeof SoundManager !== "undefined" && typeof SoundManager.playBuzzer === "function") {
                SoundManager.playBuzzer();
            }
            if (typeof $gameMessage !== "undefined" && $gameMessage) {
                const actorName = ($gameParty.leader() ? $gameParty.leader().name() : "Le joueur");
                $gameMessage.add(`⚠️ ${actorName} est en surpoids et ne pourra plus courir ni se déplacer normalement !`);
            }
        }
        if (this._arrowSprite) {
            this._arrowSprite.hide();
        }
        this.popScene();
    }

    onCommandTake() {
        this._commandWindow.deactivate();
        this._targetWindow.activate();
        if (this._targetWindow.index() < 0) {
            this._targetWindow.select(0);
        }
    }

    onCommandDeposit() {
        this._commandWindow.deactivate();
        this._partyWindow.activate();
        if (this._partyWindow.index() < 0) {
            this._partyWindow.select(0);
        }
    }

    onCommandFilter() {
        const curFilter = this._commandWindow.cycleFilter();
        if (typeof SoundManager !== "undefined" && typeof SoundManager.playCursor === "function") {
            SoundManager.playCursor();
        }
        this._partyWindow.setCategory(curFilter.key);
        this._targetWindow.setCategory(curFilter.key);
        this._commandWindow.activate();
    }

    onSwitchToTarget() {
        if (!this._targetInventory || this._targetInventory.isEmpty()) return;
        if (this._arrowSprite) this._arrowSprite.hide();
        this._partyWindow.deactivate();
        this._targetWindow.activate();
        if (this._targetWindow.index() < 0) {
            this._targetWindow.select(0);
        }
    }

    onSwitchToParty() {
        if (this._arrowSprite) this._arrowSprite.hide();
        this._targetWindow.deactivate();
        this._partyWindow.activate();
        if (this._partyWindow.index() < 0) {
            this._partyWindow.select(0);
        }
    }

    onListCancel() {
        if (this._arrowSprite) this._arrowSprite.hide();
        if (this._compareWindow) this._compareWindow.hide();
        if (this._helpWindow) this._helpWindow.show();
        this._partyWindow.deactivate();
        this._targetWindow.deactivate();
        this._commandWindow.activate();
    }

    // ========================================================================
    // 5. MODALE CONTEXTUELLE VOLANTE & FLÈCHE ANIMÉE
    // ========================================================================

    leaderPersonalInventory() {
        if (typeof $gameParty === "undefined" || !$gameParty || typeof $gameParty.leader !== "function") {
            return null;
        }
        const leader = $gameParty.leader();
        if (!leader) return null;
        let container = null;
        if (leader.inventory && typeof leader.inventory.container === "function") {
            container = leader.inventory.container();
        } else if (typeof leader.actorId === "function" && typeof $inventories !== "undefined" && $inventories && typeof $inventories.inventory === "function") {
            container = $inventories.inventory("A_" + leader.actorId());
        }
        if (!container || typeof container.numItems !== "function" || typeof container.loseItem !== "function") {
            return null;
        }
        if (this._targetInventory && container === this._targetInventory) {
            return null;
        }
        return container;
    }

    playerBagWeight() {
        const baseW = (typeof $gameParty !== "undefined" && $gameParty && typeof $gameParty.totalWeight === "function")
            ? $gameParty.totalWeight()
            : 0;
        const lInv = this.leaderPersonalInventory();
        const extraW = (lInv && typeof lInv.totalWeight === "function") ? lInv.totalWeight() : 0;
        return Math.round((baseW + extraW) * 100) / 100;
    }

    consumeFromPlayerContainers(item, amount) {
        if (!item || amount <= 0) return 0;
        let remaining = Number(amount) || 0;
        if (typeof $gameParty !== "undefined" && $gameParty && typeof $gameParty.numItems === "function" && typeof $gameParty.loseItem === "function") {
            const inParty = $gameParty.numItems(item);
            const fromParty = Math.min(remaining, inParty);
            if (fromParty > 0) {
                $gameParty.loseItem(item, fromParty);
                remaining -= fromParty;
            }
        }
        if (remaining > 0) {
            const lInv = this.leaderPersonalInventory();
            if (lInv) {
                const inLeader = lInv.numItems(item);
                const fromLeader = Math.min(remaining, inLeader);
                if (fromLeader > 0) {
                    lInv.loseItem(item, fromLeader);
                    remaining -= fromLeader;
                }
            }
        }
        return (Number(amount) || 0) - remaining;
    }

    canConsumeItem(item) {
        const leader = (typeof $gameParty !== "undefined" && $gameParty) ? $gameParty.leader() : null;
        if (!leader || !item) return false;
        const isWeapon = (typeof DataManager !== "undefined" && typeof DataManager.isWeapon === "function") ? DataManager.isWeapon(item) : (item.wtypeId !== undefined);
        const isArmor = (typeof DataManager !== "undefined" && typeof DataManager.isArmor === "function") ? DataManager.isArmor(item) : (item.etypeId !== undefined && !isWeapon);
        const isItem = (typeof DataManager !== "undefined" && typeof DataManager.isItem === "function")
            ? DataManager.isItem(item)
            : (item.itypeId !== undefined && !isWeapon && !isArmor);
        if (!isItem || item.consumable !== true) return false;

        if (typeof leader.meetsUsableItemConditions === "function") {
            if (!leader.meetsUsableItemConditions(item)) return false;
        } else if (item.occasion !== undefined && item.occasion !== 0 && item.occasion !== 2) {
            return false;
        }

        if (typeof Game_Action !== "undefined") {
            const action = new Game_Action(leader);
            action.setItemObject(item);
            if (typeof action.isForOpponent === "function" && action.isForOpponent()) {
                return false;
            }
            if (typeof action.isForFriend === "function" && !action.isForFriend()) {
                return Boolean(item.scope === 0 && Array.isArray(item.effects) && item.effects.length > 0);
            }
            if (typeof action.testApply === "function") {
                return Boolean(action.testApply(leader));
            }
        }
        return true;
    }

    onPartyListOk() {
        const item = this._partyWindow.item();
        if (!item) {
            this._partyWindow.activate();
            return;
        }
        this._commandWindow.deactivate();
        this._targetWindow.deactivate();
        this._partyWindow.deactivate();

        // Calcul de position de la flèche et de la modale
        const rect = this._partyWindow.itemRectWithPadding(this._partyWindow.index());
        const itemScreenY = this._partyWindow.y + rect.y + rect.height / 2;
        const arrowW = 56;
        const originX = this._partyWindow.x + this._partyWindow.width;
        const targetArrowX = originX + Math.round(arrowW / 2);

        if (this._arrowSprite) {
            this._arrowSprite.deploy(originX, itemScreenY, targetArrowX, "right");
        }

        const actionX = originX + arrowW + 10;
        const actionY = Math.round(itemScreenY - 50);

        const leader = (typeof $gameParty !== "undefined" && $gameParty) ? $gameParty.leader() : null;
        const canEquip = !!(leader && item && (DataManager.isWeapon(item) || DataManager.isArmor(item)) && (typeof leader.canEquip === "function" ? leader.canEquip(item) : true));
        const canConsume = this.canConsumeItem(item);
        const canDeposit = this.isTargetPersistent();

        let canAcceptOne = canDeposit;
        let canAcceptAll = canDeposit;
        if (canDeposit && this._targetInventory && typeof this._targetInventory.checkAcceptItem === "function") {
            const qty = (typeof this._partyWindow.itemQuantity === "function") ? this._partyWindow.itemQuantity(item) : 1;
            canAcceptOne = this._targetInventory.checkAcceptItem(item, 1).allowed;
            canAcceptAll = this._targetInventory.checkAcceptItem(item, qty).allowed;
        }

        if (canEquip) {
            if (this._helpWindow) this._helpWindow.hide();
            if (this._compareWindow) {
                this._compareWindow.setItem(item);
                this._compareWindow.show();
                this._compareWindow.open();
            }
        } else {
            if (this._compareWindow) this._compareWindow.hide();
            if (this._helpWindow) this._helpWindow.show();
        }

        this._actionWindow.setup("party", canDeposit, canEquip, false, false, canAcceptOne, canAcceptAll, canConsume);
        this._actionWindow.reposition(actionX, actionY);
        this.checkActionTutorials(canEquip);
    }

    onTargetListOk() {
        const item = this._targetWindow.item();
        if (!item) {
            this._targetWindow.activate();
            return;
        }
        this._commandWindow.deactivate();
        this._partyWindow.deactivate();
        this._targetWindow.deactivate();

        // Calcul de position de la flèche et de la modale
        const rect = this._targetWindow.itemRectWithPadding(this._targetWindow.index());
        const itemScreenY = this._targetWindow.y + rect.y + rect.height / 2;
        const arrowW = 56;
        const originX = this._targetWindow.x;
        const targetArrowX = originX - Math.round(arrowW / 2);

        if (this._arrowSprite) {
            this._arrowSprite.deploy(originX, itemScreenY, targetArrowX, "left");
        }

        const actionX = originX - arrowW - this._actionWindow.width - 10;
        const actionY = Math.round(itemScreenY - 50);

        const leader = (typeof $gameParty !== "undefined" && $gameParty) ? $gameParty.leader() : null;
        const canEquip = !!(leader && item && (DataManager.isWeapon(item) || DataManager.isArmor(item)) && (typeof leader.canEquip === "function" ? leader.canEquip(item) : true));
        const canConsume = this.canConsumeItem(item);
        const itemW = (typeof DataManager !== "undefined" && typeof DataManager.itemWeight === "function") ? DataManager.itemWeight(item) : 1;
        const curW = this.playerBagWeight();
        const maxW = (typeof $gameParty !== "undefined" && typeof $gameParty.maxWeight === "function") ? $gameParty.maxWeight() : 48;
        const qty = (typeof this._targetWindow.itemQuantity === "function") ? this._targetWindow.itemQuantity(item) : 1;
        const isOverloadOne = (curW + itemW) > maxW;
        const isOverloadAll = (curW + itemW * qty) > maxW;

        if (canEquip) {
            if (this._helpWindow) this._helpWindow.hide();
            if (this._compareWindow) {
                this._compareWindow.setItem(item);
                this._compareWindow.show();
                this._compareWindow.open();
            }
        } else {
            if (this._compareWindow) this._compareWindow.hide();
            if (this._helpWindow) this._helpWindow.show();
        }

        this._actionWindow.setup("target", this.isTargetPersistent(), canEquip, isOverloadOne, isOverloadAll, true, true, canConsume);
        this._actionWindow.reposition(actionX, actionY);
        this.checkActionTutorials(canEquip);
    }

    onActionCancel() {
        if (this._arrowSprite) {
            this._arrowSprite.hide();
        }
        if (this._compareWindow) {
            this._compareWindow.hide();
        }
        if (this._helpWindow) {
            this._helpWindow.show();
        }
        this._actionWindow.close();
        this._actionWindow.deactivate();
        if (this._actionWindow._mode === "party") {
            if (this._partyWindow.maxItems() > 0) {
                this._partyWindow.activate();
            } else {
                this._commandWindow.activate();
            }
        } else {
            if (this._targetWindow.maxItems() > 0) {
                this._targetWindow.activate();
            } else {
                this._commandWindow.activate();
            }
        }
    }

    onActionEquip() {
        const mode = this._actionWindow.mode;
        const actor = (typeof $gameParty !== "undefined" && $gameParty) ? $gameParty.leader() : null;
        if (!actor) {
            this.onActionCancel();
            return;
        }

        const isTarget = (mode === "target");
        const item = isTarget ? this._targetWindow.item() : this._partyWindow.item();

        if (!item || !(DataManager.isWeapon(item) || DataManager.isArmor(item)) || !actor.canEquip(item)) {
            if (typeof SoundManager !== "undefined" && typeof SoundManager.playBuzzer === "function") {
                SoundManager.playBuzzer();
            }
            this.onActionCancel();
            return;
        }

        // Si l'objet provient du conteneur cible, on le déplace vers le groupe d'abord
        if (isTarget) {
            if (!this._targetInventory) {
                this.onActionCancel();
                return;
            }
            this._targetInventory.loseItem(item, 1);
            $gameParty.gainItem(item, 1);
        }

        // Équipement via le sous-composant equipment s'il existe ou via RMMZ natif
        const equipComp = actor.equipment;
        let equipSucceeded = true;
        if (equipComp && typeof equipComp.equip === "function") {
            equipSucceeded = equipComp.equip(item) !== false;
        } else {
            const targetEtype = (typeof DataManager !== "undefined" && typeof DataManager.isWeapon === "function" && DataManager.isWeapon(item)) ? 1 : item.etypeId;
            const slotId = (equipComp && typeof equipComp.findSlotFor === "function")
                ? equipComp.findSlotFor(item)
                : ((typeof actor.equipSlots === "function") ? actor.equipSlots().indexOf(targetEtype) : 0);
            if (slotId >= 0 && typeof actor.changeEquip === "function") {
                actor.changeEquip(slotId, item);
            } else {
                equipSucceeded = false;
            }
        }

        if (isTarget && !equipSucceeded) {
            $gameParty.loseItem(item, 1);
            this._targetInventory.gainItem(item, 1);
            if (typeof SoundManager !== "undefined" && typeof SoundManager.playBuzzer === "function") {
                SoundManager.playBuzzer();
            }
            this.refreshAll();
            this.onActionCancel();
            return;
        }

        // Rafraîchissement des entités cartographiques ($gamePlayer) et du sprite en arrière-plan
        if (typeof $gamePlayer !== "undefined" && $gamePlayer && typeof $gamePlayer.refresh === "function") {
            $gamePlayer.refresh();
        }
        if (this._playerLiveSprite && typeof this._playerLiveSprite.updateBitmap === "function") {
            this._playerLiveSprite.updateBitmap();
        }

        if (typeof SoundManager !== "undefined" && typeof SoundManager.playEquip === "function") {
            SoundManager.playEquip();
        }

        this.refreshAll();

        if (isTarget && this._targetInventory && this._targetInventory.isEmpty()) {
            this.checkTargetEmptied();
            if (this._arrowSprite) this._arrowSprite.hide();
            this._targetWindow.deactivate();
            this._actionWindow.close();
            this._actionWindow.deactivate();
            this._commandWindow.activate();
            this.selectCommandAfterEmptied();
            if (this._initialTutorialsChecked) {
                this.checkWeightGaugeTutorial();
            }
            return;
        }

        this.onActionCancel();
        if (this._initialTutorialsChecked) {
            this.checkWeightGaugeTutorial();
        }
    }

    onActionConsume() {
        const mode = this._actionWindow.mode;
        const actor = (typeof $gameParty !== "undefined" && $gameParty) ? $gameParty.leader() : null;
        const isTarget = (mode === "target");
        const item = isTarget ? this._targetWindow.item() : this._partyWindow.item();

        if (!actor || !item || !this.canConsumeItem(item)) {
            if (typeof SoundManager !== "undefined" && typeof SoundManager.playBuzzer === "function") {
                SoundManager.playBuzzer();
            }
            this.onActionCancel();
            return;
        }

        if (isTarget) {
            if (!this._targetInventory || (typeof this._targetInventory.numItems === "function" && this._targetInventory.numItems(item) <= 0)) {
                if (typeof SoundManager !== "undefined" && typeof SoundManager.playBuzzer === "function") {
                    SoundManager.playBuzzer();
                }
                this.onActionCancel();
                return;
            }
            this._targetInventory.loseItem(item, 1);
        } else {
            const consumed = this.consumeFromPlayerContainers(item, 1);
            if (consumed <= 0) {
                if (typeof SoundManager !== "undefined" && typeof SoundManager.playBuzzer === "function") {
                    SoundManager.playBuzzer();
                }
                this.onActionCancel();
                return;
            }
        }

        if (typeof SoundManager !== "undefined") {
            if (typeof SoundManager.playUseItem === "function") SoundManager.playUseItem();
            else if (typeof SoundManager.playOk === "function") SoundManager.playOk();
        }

        if (typeof Game_Action !== "undefined") {
            const action = new Game_Action(actor);
            action.setItemObject(item);
            if (typeof action.isForFriend === "function" && action.isForFriend()) {
                const repeats = (typeof action.numRepeats === "function") ? action.numRepeats() : 1;
                for (let i = 0; i < repeats; i++) {
                    action.apply(actor);
                }
            }
            if (typeof action.applyGlobal === "function") {
                action.applyGlobal();
            }
        }
        if (typeof actor.refresh === "function") {
            actor.refresh();
        }

        if (typeof $gameTemp !== "undefined" && $gameTemp && typeof $gameTemp.isCommonEventReserved === "function" && $gameTemp.isCommonEventReserved()) {
            if (isTarget && this._targetInventory && this._targetInventory.isEmpty()) {
                this.checkTargetEmptied();
            } else {
                this.updateContainerSelfSwitchB();
            }
            if (typeof SceneManager !== "undefined" && typeof Scene_Map !== "undefined" && typeof SceneManager.goto === "function") {
                SceneManager.goto(Scene_Map);
                return;
            }
        }

        if (typeof $gamePlayer !== "undefined" && $gamePlayer && typeof $gamePlayer.refresh === "function") {
            $gamePlayer.refresh();
        }

        this.refreshAll();

        if (isTarget && this._targetInventory && this._targetInventory.isEmpty()) {
            this.checkTargetEmptied();
            if (this._arrowSprite) this._arrowSprite.hide();
            this._targetWindow.deactivate();
            this._actionWindow.close();
            this._actionWindow.deactivate();
            this._commandWindow.activate();
            this.selectCommandAfterEmptied();
            if (this._initialTutorialsChecked) {
                this.checkWeightGaugeTutorial();
            }
            return;
        }

        this.onActionCancel();
        if (this._initialTutorialsChecked) {
            this.checkWeightGaugeTutorial();
        }
    }

    onActionTakeOne() {
        this.executeTake(1);
    }

    onActionTakeAll() {
        const item = this._targetWindow.item();
        const total = this._targetWindow.itemQuantity(item);
        this.executeTake(total);
    }

    onActionDepositOne() {
        this.executeDeposit(1);
    }

    onActionDepositAll() {
        const item = this._partyWindow.item();
        const total = this._partyWindow.itemQuantity(item);
        this.executeDeposit(total);
    }

    onActionDropOne() {
        this.executeDrop(1);
    }

    onActionDropAll() {
        const item = this._partyWindow.item();
        const total = this._partyWindow.itemQuantity(item);
        this.executeDrop(total);
    }

    executeTake(amount) {
        const item = this._targetWindow.item();
        if (!item || amount <= 0) {
            this.onActionCancel();
            return;
        }

        if (typeof $gameParty !== "undefined" && $gameParty) {
            let canAccept = true;
            if (typeof $gameParty.canAcceptItem === "function" && !$gameParty.canAcceptItem(item, amount)) {
                canAccept = false;
            }
            if (canAccept && typeof $gameParty.maxWeight === "function") {
                const lInv = this.leaderPersonalInventory();
                const extraW = (lInv && typeof lInv.totalWeight === "function") ? lInv.totalWeight() : 0;
                if (extraW > 0) {
                    const itemW = (typeof DataManager !== "undefined" && typeof DataManager.itemWeight === "function")
                        ? DataManager.itemWeight(item)
                        : 1;
                    if ((this.playerBagWeight() + itemW * amount) > $gameParty.maxWeight()) {
                        canAccept = false;
                    }
                }
            }
            if (!canAccept) {
                if (typeof SoundManager !== "undefined" && typeof SoundManager.playBuzzer === "function") {
                    SoundManager.playBuzzer();
                }
                this.onActionCancel();
                return;
            }
        }

        this._targetInventory.loseItem(item, amount);
        $gameParty.gainItem(item, amount);

        if (typeof SoundManager !== "undefined" && typeof SoundManager.playEquip === "function") {
            SoundManager.playEquip();
        }

        this.refreshAll();

        if (this._targetInventory && this._targetInventory.isEmpty()) {
            this.checkTargetEmptied();
            if (this._arrowSprite) this._arrowSprite.hide();
            this._targetWindow.deactivate();
            this._actionWindow.close();
            this._actionWindow.deactivate();
            this._commandWindow.activate();
            this.selectCommandAfterEmptied();
            if (this._initialTutorialsChecked) {
                this.checkWeightGaugeTutorial();
            }
            return;
        }

        this.onActionCancel();
        if (this._initialTutorialsChecked) {
            this.checkWeightGaugeTutorial();
        }
    }

    executeDeposit(amount) {
        const item = this._partyWindow.item();
        if (!item || amount <= 0 || !this.isTargetPersistent()) {
            if (typeof SoundManager !== "undefined" && typeof SoundManager.playBuzzer === "function") {
                SoundManager.playBuzzer();
            }
            this.onActionCancel();
            return;
        }

        if (this._targetInventory && typeof this._targetInventory.checkAcceptItem === "function") {
            const check = this._targetInventory.checkAcceptItem(item, amount);
            if (!check.allowed) {
                if (typeof SoundManager !== "undefined" && typeof SoundManager.playBuzzer === "function") {
                    SoundManager.playBuzzer();
                }
                this.onActionCancel();
                return;
            }
        }

        const moved = this.consumeFromPlayerContainers(item, amount);
        if (moved <= 0) {
            if (typeof SoundManager !== "undefined" && typeof SoundManager.playBuzzer === "function") {
                SoundManager.playBuzzer();
            }
            this.onActionCancel();
            return;
        }
        this._targetInventory.gainItem(item, moved);

        if (typeof SoundManager !== "undefined" && typeof SoundManager.playEquip === "function") {
            SoundManager.playEquip();
        }

        this.refreshAll();
        this.onActionCancel();
        if (this._initialTutorialsChecked) {
            this.checkWeightGaugeTutorial();
        }
    }

    executeDrop(amount) {
        const item = this._partyWindow.item();
        if (!item || amount <= 0) {
            this.onActionCancel();
            return;
        }

        const dropped = this.consumeFromPlayerContainers(item, amount);
        if (dropped <= 0) {
            this.onActionCancel();
            return;
        }
        if (typeof SoundManager !== "undefined") {
            if (typeof SoundManager.playUseItem === "function") SoundManager.playUseItem();
            else if (typeof SoundManager.playCancel === "function") SoundManager.playCancel();
        }

        this.refreshAll();
        this.onActionCancel();
        if (this._initialTutorialsChecked) {
            this.checkWeightGaugeTutorial();
        }
    }

    // ========================================================================
    // 6. RAFRAÎCHISSEMENT GLOBAL & PERSISTANCE DU CONTENEUR
    // ========================================================================

    refreshAll() {
        if (this._partyHeaderWindow) {
            if (typeof this._partyHeaderWindow.setExcludeInventory === "function") {
                this._partyHeaderWindow.setExcludeInventory(this._targetInventory);
            }
            this._partyHeaderWindow.refresh();
        }
        if (this._targetHeaderWindow) {
            this._targetHeaderWindow.setTitle(this.formatTargetTitle());
            this._targetHeaderWindow.setTargetInventory(this._targetInventory);
            this._targetHeaderWindow.refresh();
        }
        if (typeof this._partyWindow.setExcludeInventory === "function") {
            this._partyWindow.setExcludeInventory(this._targetInventory);
        }
        this._partyWindow.refresh();
        this._targetWindow.refresh();
        this._commandWindow.setTargetContext(this._targetInventory, this.isTargetPersistent());
        this.updateContainerSelfSwitchB();
    }

    updateContainerSelfSwitchB() {
        if (typeof $inventories !== "undefined" && typeof $inventories.updateEventSelfSwitchB === "function") {
            $inventories.updateEventSelfSwitchB(this._targetId);
        }
        if (!this._targetId || !this._targetId.startsWith("C_")) return;
        let eventId = (this._options && this._options.eventId) || (typeof $inventories !== "undefined" && $inventories.currentEventId ? $inventories.currentEventId() : null);
        if (!eventId && typeof $gameMap !== "undefined" && $gameMap) {
            const cId = Number(this._targetId.slice(2));
            if (!isNaN(cId)) eventId = cId;
        }
        if (eventId && typeof $gameMap !== "undefined" && $gameMap && typeof $gameSelfSwitches !== "undefined") {
            const isEmpty = this._targetInventory ? this._targetInventory.isEmpty() : true;
            $gameSelfSwitches.setValue([$gameMap.mapId(), eventId, "B"], isEmpty);
        }
    }

    terminate() {
        super.terminate();
        if (this._arrowSprite) {
            this._arrowSprite.hide();
        }
        if (this._compareWindow) {
            this._compareWindow.hide();
        }
        if (this._tutoArrowSprite && typeof this._tutoArrowSprite.setup === "function") {
            this._tutoArrowSprite.setup(null);
        }
        if (this._tutoWindow && typeof this._tutoWindow.close === "function") {
            this._tutoWindow.close();
        }
        this.updateContainerSelfSwitchB();
    }

    checkTargetEmptied() {
        if (this.isTargetPersistent()) {
            return;
        }
        this.handleEnemyLooted();
    }

    handleEnemyLooted() {
        if (this.isTargetPersistent()) {
            return;
        }
        if (typeof $inventories !== "undefined" && $inventories) {
            if (typeof $inventories.markLooted === "function") {
                $inventories.markLooted(this._targetId);
            }
            $inventories.unset(this._targetId);
        }

        let eventId = this._options.eventId || (typeof $inventories !== "undefined" && $inventories.currentEventId ? $inventories.currentEventId() : null);
        if (!eventId && typeof $gameMap !== "undefined" && $gameMap) {
            if (this._targetId.startsWith("E_")) {
                const enemyId = Number(this._targetId.slice(2));
                const enemyEv = $gameMap.events().find(e => e && e._enemyId === enemyId);
                if (enemyEv) eventId = enemyEv.eventId();
            } else if (this._targetId.startsWith("C_")) {
                const cId = Number(this._targetId.slice(2));
                if (!isNaN(cId)) eventId = cId;
            }
        }

        if (eventId && typeof $gameMap !== "undefined" && $gameMap) {
            const ev = $gameMap.event(eventId);
            if (ev) {
                if (typeof $gameSelfSwitches !== "undefined") {
                    $gameSelfSwitches.setValue([$gameMap.mapId(), eventId, "D"], true);
                }
                if (typeof ev.setOpacity === "function") {
                    ev.setOpacity(0);
                }
                if (typeof ev.erase === "function") {
                    ev.erase();
                }
            }
        }
    }
}

window.Scene_Inventory = Scene_Inventory;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Scene_Inventory;
}
