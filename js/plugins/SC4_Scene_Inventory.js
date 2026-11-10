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
    }

    create() {
        super.create();
        this._targetId = Scene_Inventory._preparedId || "C_1";
        this._options = Scene_Inventory._preparedOptions || {};
        this._targetInventory = (typeof $inventories !== "undefined" && $inventories)
            ? $inventories.inventory(this._targetId)
            : null;

        this.createHelpWindow();
        this.createHeaders();
        this.createPartyWindow();
        this.createTargetWindow();
        this.createCommandWindow();
        this.createArrowSprite();
        this.createActionWindow();
    }

    start() {
        super.start();
        this.refreshAll();
        this._commandWindow.activate();
        this._commandWindow.select(0);
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

    helpWindowRect() {
        const colW = this.columnWidth();
        const wx = colW;
        const wy = 0;
        const ww = Graphics.boxWidth - colW * 2;
        const wh = this.headerHeight();
        return new Rectangle(wx, wy, ww, wh);
    }

    createHeaders() {
        const colW = this.columnWidth();
        const headerH = this.headerHeight();

        // 1. Header Joueur (Haut Gauche)
        const pRect = new Rectangle(0, 0, colW, headerH);
        const pTitle = (typeof LocalisationManager !== "undefined" && typeof LocalisationManager.getText === "function")
            ? LocalisationManager.getText("inventory.player_bag", "Sac du joueur")
            : "Sac du joueur";
        this._partyHeaderWindow = new Window_InventoryHeader(pRect, pTitle, true);
        this.addWindow(this._partyHeaderWindow);

        // 2. Header Conteneur (Haut Droit)
        const tRect = new Rectangle(Graphics.boxWidth - colW, 0, colW, headerH);
        const tTitle = this.formatTargetTitle();
        this._targetHeaderWindow = new Window_InventoryHeader(tRect, tTitle, false);
        this._targetHeaderWindow.setTargetInventory(this._targetInventory);
        this.addWindow(this._targetHeaderWindow);
    }

    createPartyWindow() {
        const rect = this.partyWindowRect();
        const title = (typeof LocalisationManager !== "undefined" && typeof LocalisationManager.getText === "function")
            ? LocalisationManager.getText("inventory.player_bag", "Sac du joueur")
            : "Sac du joueur";
        this._partyWindow = new Window_InventoryList(rect, title, true);
        this._partyWindow.setHeaderWindow(this._partyHeaderWindow);
        this._partyWindow.setHelpWindow(this._helpWindow);
        this._partyWindow.setHandler("ok", this.onPartyListOk.bind(this));
        this._partyWindow.setHandler("cancel", this.onListCancel.bind(this));
        this._partyWindow.setHandler("right", this.onSwitchToTarget.bind(this));
        this.addWindow(this._partyWindow);
    }

    partyWindowRect() {
        const colW = this.columnWidth();
        const headerH = this.headerHeight();
        const cmdH = this.commandHeight();
        const wx = 0;
        const wy = headerH;
        const ww = colW;
        const wh = Graphics.boxHeight - cmdH - headerH;
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
        const colW = this.columnWidth();
        const headerH = this.headerHeight();
        const cmdH = this.commandHeight();
        const wx = Graphics.boxWidth - colW;
        const wy = headerH;
        const ww = colW;
        const wh = Graphics.boxHeight - cmdH - headerH;
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
        const cmdH = this.commandHeight();
        const wx = 0;
        const wy = Graphics.boxHeight - cmdH;
        const ww = Graphics.boxWidth;
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
        this._partyWindow.deactivate();
        this._targetWindow.deactivate();
        this._commandWindow.activate();
    }

    // ========================================================================
    // 5. MODALE CONTEXTUELLE VOLANTE & FLÈCHE ANIMÉE
    // ========================================================================

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
        const colW = this.columnWidth();
        const rect = this._partyWindow.itemRectWithPadding(this._partyWindow.index());
        const itemScreenY = this._partyWindow.y + rect.y + rect.height / 2;
        const arrowW = 56;
        const originX = colW;
        const targetArrowX = colW + Math.round(arrowW / 2);

        if (this._arrowSprite) {
            this._arrowSprite.deploy(originX, itemScreenY, targetArrowX, "right");
        }

        const actionX = colW + arrowW + 10;
        const actionY = Math.round(itemScreenY - 50);
        this._actionWindow.reposition(actionX, actionY);

        const leader = (typeof $gameParty !== "undefined" && $gameParty) ? $gameParty.leader() : null;
        const canEquip = !!(leader && item && (DataManager.isWeapon(item) || DataManager.isArmor(item)) && (typeof leader.canEquip === "function" ? leader.canEquip(item) : true));
        const canDeposit = this.isTargetPersistent();

        let canAcceptOne = canDeposit;
        let canAcceptAll = canDeposit;
        if (canDeposit && this._targetInventory && typeof this._targetInventory.checkAcceptItem === "function") {
            const qty = (typeof this._partyWindow.itemQuantity === "function") ? this._partyWindow.itemQuantity(item) : 1;
            canAcceptOne = this._targetInventory.checkAcceptItem(item, 1).allowed;
            canAcceptAll = this._targetInventory.checkAcceptItem(item, qty).allowed;
        }

        this._actionWindow.setup("party", canDeposit, canEquip, false, false, canAcceptOne, canAcceptAll);
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
        const colW = this.columnWidth();
        const rect = this._targetWindow.itemRectWithPadding(this._targetWindow.index());
        const itemScreenY = this._targetWindow.y + rect.y + rect.height / 2;
        const arrowW = 56;
        const originX = Graphics.boxWidth - colW;
        const targetArrowX = Graphics.boxWidth - colW - Math.round(arrowW / 2);

        if (this._arrowSprite) {
            this._arrowSprite.deploy(originX, itemScreenY, targetArrowX, "left");
        }

        const actionX = Graphics.boxWidth - colW - arrowW - this._actionWindow.width - 10;
        const actionY = Math.round(itemScreenY - 50);
        this._actionWindow.reposition(actionX, actionY);

        const leader = (typeof $gameParty !== "undefined" && $gameParty) ? $gameParty.leader() : null;
        const canEquip = !!(leader && item && (DataManager.isWeapon(item) || DataManager.isArmor(item)) && (typeof leader.canEquip === "function" ? leader.canEquip(item) : true));
        const itemW = (typeof DataManager !== "undefined" && typeof DataManager.itemWeight === "function") ? DataManager.itemWeight(item) : 1;
        const curW = (typeof $gameParty !== "undefined" && typeof $gameParty.totalWeight === "function") ? $gameParty.totalWeight() : 0;
        const maxW = (typeof $gameParty !== "undefined" && typeof $gameParty.maxWeight === "function") ? $gameParty.maxWeight() : 48;
        const qty = (typeof this._targetWindow.itemQuantity === "function") ? this._targetWindow.itemQuantity(item) : 1;
        const isOverloadOne = (curW + itemW) > maxW;
        const isOverloadAll = (curW + itemW * qty) > maxW;
        this._actionWindow.setup("target", this.isTargetPersistent(), canEquip, isOverloadOne, isOverloadAll);
    }

    onActionCancel() {
        if (this._arrowSprite) {
            this._arrowSprite.hide();
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
        if (equipComp && typeof equipComp.equip === "function") {
            equipComp.equip(item);
        } else {
            const slotId = (equipComp && typeof equipComp.findSlotFor === "function")
                ? equipComp.findSlotFor(item)
                : ((typeof actor.equipSlots === "function") ? actor.equipSlots().indexOf(item.etypeId) : 0);
            if (slotId >= 0 && typeof actor.changeEquip === "function") {
                actor.changeEquip(slotId, item);
            }
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
            this._commandWindow.activate();
            this.selectCommandAfterEmptied();
            return;
        }

        this.onActionCancel();
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

        if (typeof $gameParty !== "undefined" && typeof $gameParty.canAcceptItem === "function") {
            if (!$gameParty.canAcceptItem(item, amount)) {
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
            this._commandWindow.activate();
            this.selectCommandAfterEmptied();
            return;
        }

        this.onActionCancel();
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

        $gameParty.loseItem(item, amount);
        this._targetInventory.gainItem(item, amount);

        if (typeof SoundManager !== "undefined" && typeof SoundManager.playEquip === "function") {
            SoundManager.playEquip();
        }

        this.refreshAll();
        this.onActionCancel();
    }

    executeDrop(amount) {
        const item = this._partyWindow.item();
        if (!item || amount <= 0) {
            this.onActionCancel();
            return;
        }

        $gameParty.loseItem(item, amount);
        if (typeof SoundManager !== "undefined") {
            if (typeof SoundManager.playUseItem === "function") SoundManager.playUseItem();
            else if (typeof SoundManager.playCancel === "function") SoundManager.playCancel();
        }

        this.refreshAll();
        this.onActionCancel();
    }

    // ========================================================================
    // 6. RAFRAÎCHISSEMENT GLOBAL & PERSISTANCE DU CONTENEUR
    // ========================================================================

    refreshAll() {
        if (this._partyHeaderWindow) {
            this._partyHeaderWindow.refresh();
        }
        if (this._targetHeaderWindow) {
            this._targetHeaderWindow.setTitle(this.formatTargetTitle());
            this._targetHeaderWindow.setTargetInventory(this._targetInventory);
            this._targetHeaderWindow.refresh();
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
