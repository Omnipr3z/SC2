//=============================================================================
// RPG Maker MZ - SC4_Window_InventoryCommand
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Fenêtre de commande supérieure de transfert d'inventaire.
 * @author SimCraft
 * 
 * @help SC4_Window_InventoryCommand.js
 */

const _BaseWindowInvCmd = typeof Window_HorzCommand !== "undefined" ? Window_HorzCommand : (typeof Window_Command !== "undefined" ? Window_Command : (typeof Window_Base !== "undefined" ? Window_Base : Object));

class Window_InventoryCommand extends _BaseWindowInvCmd {
    constructor(rect) {
        super(rect);
        this._targetInventory = null;
        this._isPersistent = true;
    }

    maxCols() {
        return 3;
    }

    setTargetContext(targetInventory, isPersistent) {
        this._targetInventory = targetInventory;
        this._isPersistent = Boolean(isPersistent);
        this.refresh();
    }

    makeCommandList() {
        const hasTargetItems = this._targetInventory ? !this._targetInventory.isEmpty() : false;
        const canDeposit = Boolean(this._isPersistent);
        const hasPartyItems = (typeof $gameParty !== "undefined" && $gameParty) ? $gameParty.allItems().length > 0 : false;

        const txtTake = (typeof LocalisationManager !== "undefined" && typeof LocalisationManager.getText === "function")
            ? LocalisationManager.getText("inventory.take", "Prendre")
            : "Prendre";
        const txtDeposit = (typeof LocalisationManager !== "undefined" && typeof LocalisationManager.getText === "function")
            ? LocalisationManager.getText("inventory.deposit", "Déposer")
            : "Déposer";
        const txtClose = (typeof LocalisationManager !== "undefined" && typeof LocalisationManager.getText === "function")
            ? LocalisationManager.getText("inventory.close", "Fermer")
            : "Fermer";

        this.addCommand(txtTake, "take", hasTargetItems);
        this.addCommand(txtDeposit, "deposit", canDeposit && hasPartyItems);
        this.addCommand(txtClose, "close", true);
    }
}

// ============================================================================
// 2. Fenêtre de liste d'inventaire avec barre de poids intégrée
// ============================================================================

window.Window_InventoryCommand = Window_InventoryCommand;
if (typeof global !== "undefined") {
    global.Window_InventoryCommand = Window_InventoryCommand;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { Window_InventoryCommand };
}


//=============================================================================
// RPG Maker MZ - SC4_Window_InventoryList
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Liste d'inventaire avec barre de jauge de poids intégrée.
 * @author SimCraft
 * 
 * @help SC4_Window_InventoryList.js
 */

const _BaseWindowInvList = typeof Window_Selectable !== "undefined" ? Window_Selectable : (typeof Window_Base !== "undefined" ? Window_Base : Object);

class Window_InventoryList extends _BaseWindowInvList {
    /**
     * @param {Rectangle} rect 
     * @param {string} title 
     * @param {boolean} isParty 
     */
    constructor(rect, title, isParty = false) {
        super(rect);
        this._title = title;
        this._isParty = isParty;
        this._data = [];
        this._targetInventory = null;
        this.refresh();
    }

    setTargetInventory(inv) {
        this._targetInventory = inv;
        this.refresh();
    }

    setTitle(title) {
        this._title = title;
        this.refresh();
    }

    maxCols() {
        return 1;
    }

    maxItems() {
        return this._data ? this._data.length : 0;
    }

    maxPageRows() {
        // Réserve la ligne du bas pour afficher le poids
        return Math.max(1, Math.floor((this.innerHeight - this.lineHeight()) / this.itemHeight()));
    }

    item() {
        return this.itemAt(this.index());
    }

    itemAt(index) {
        return this._data && index >= 0 ? this._data[index] : null;
    }

    isCurrentItemEnabled() {
        return this.item() !== null;
    }

    makeItemList() {
        if (this._isParty) {
            if (typeof $gameParty !== "undefined" && $gameParty) {
                // Objets du sac (exclut naturellement les équipements portés qui sont dans actor._equips)
                this._data = $gameParty.allItems().filter(item => item && $gameParty.numItems(item) > 0);
            } else {
                this._data = [];
            }
        } else if (this._targetInventory) {
            this._data = this._targetInventory.items();
        } else {
            this._data = [];
        }
    }

    drawAllItems() {
        this.makeItemList();
        super.drawAllItems();
        this.drawWeightStatus();
    }

    itemQuantity(item) {
        if (!item) return 0;
        if (this._isParty) {
            return $gameParty.numItems(item);
        } else if (this._targetInventory) {
            return this._targetInventory.numItems(item);
        }
        return 0;
    }

    drawItem(index) {
        const item = this.itemAt(index);
        if (item) {
            const rect = this.itemLineRect(index);
            this.changePaintOpacity(this.isCurrentItemEnabled());
            this.drawItemName(item, rect.x, rect.y, rect.width - 80);
            const qty = this.itemQuantity(item);
            this.drawText("x" + qty, rect.x, rect.y, rect.width, "right");
            this.changePaintOpacity(1);
        }
    }

    drawWeightStatus() {
        const y = this.innerHeight - this.lineHeight();
        const x = 4;
        const w = this.innerWidth - 8;

        const curWeight = this._isParty
            ? ((typeof $gameParty !== "undefined" && typeof $gameParty.totalWeight === "function") ? $gameParty.totalWeight() : 0)
            : (this._targetInventory ? this._targetInventory.totalWeight() : 0);

        const maxWeight = this._isParty
            ? ((typeof $gameParty !== "undefined" && typeof $gameParty.maxWeight === "function") ? $gameParty.maxWeight() : Infinity)
            : (this._targetInventory ? this._targetInventory.maxWeight() : Infinity);

        const isOverloaded = curWeight > maxWeight;

        const label = (typeof LocalisationManager !== "undefined" && typeof LocalisationManager.getText === "function")
            ? LocalisationManager.getText("inventory.weight", "Poids")
            : "Poids";
        const maxStr = (maxWeight === Infinity || isNaN(maxWeight)) ? "∞" : maxWeight;
        const text = `${label}: ${curWeight}/${maxStr}`;

        this.contents.fillRect(0, y - 2, this.innerWidth, this.lineHeight() + 4, ColorManager.dimColor1());
        this.changePaintOpacity(true);
        if (isOverloaded) {
            this.changeTextColor("#ff4d4d");
        } else {
            this.changeTextColor(ColorManager.systemColor());
        }
        this.drawText(this._title, x, y, Math.floor(w / 2), "left");
        this.drawText(text, x, y, w, "right");
        this.resetTextColor();
    }

    updateHelp() {
        if (this._helpWindow) {
            this._helpWindow.setItem(this.item());
        }
    }

    refresh() {
        this.contents.clear();
        this.drawAllItems();
    }
}

// ============================================================================
// 3. Fenêtre de commande d'actions contextuelles (Transférer / Jeter / Annuler)
// ============================================================================

window.Window_InventoryList = Window_InventoryList;
if (typeof global !== "undefined") {
    global.Window_InventoryList = Window_InventoryList;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { Window_InventoryList };
}


//=============================================================================
// RPG Maker MZ - SC4_Window_InventoryAction
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Fenêtre d'action contextuelle (Prendre / Déposer / Jeter).
 * @author SimCraft
 * 
 * @help SC4_Window_InventoryAction.js
 */

const _BaseWindowInvAct = typeof Window_Command !== "undefined" ? Window_Command : (typeof Window_Selectable !== "undefined" ? Window_Selectable : Object);

class Window_InventoryAction extends _BaseWindowInvAct {
    constructor(rect) {
        super(rect);
        this._mode = "target"; // "target" ou "party"
        this._canDeposit = true;
        this.openness = 0;
        this.deactivate();
    }

    setup(mode, canDeposit = true) {
        this._mode = mode;
        this._canDeposit = canDeposit;
        this.refresh();
        this.select(0);
        this.open();
        this.activate();
    }

    makeCommandList() {
        const getTxt = (key, fallback) => {
            return (typeof LocalisationManager !== "undefined" && typeof LocalisationManager.getText === "function")
                ? LocalisationManager.getText(key, fallback)
                : fallback;
        };

        if (this._mode === "target") {
            this.addCommand(getTxt("inventory.take_one", "Prendre 1"), "take_one", true);
            this.addCommand(getTxt("inventory.take_all", "Prendre Tout"), "take_all", true);
            this.addCommand(getTxt("inventory.cancel", "Annuler"), "cancel", true);
        } else {
            this.addCommand(getTxt("inventory.deposit_one", "Déposer 1"), "deposit_one", this._canDeposit);
            this.addCommand(getTxt("inventory.deposit_all", "Déposer Tout"), "deposit_all", this._canDeposit);
            this.addCommand(getTxt("inventory.drop_one", "Jeter 1"), "drop_one", true);
            this.addCommand(getTxt("inventory.drop_all", "Jeter Tout"), "drop_all", true);
            this.addCommand(getTxt("inventory.cancel", "Annuler"), "cancel", true);
        }
    }
}

// ============================================================================
// 4. Scène principale Scene_Inventory
// ============================================================================

window.Window_InventoryAction = Window_InventoryAction;
if (typeof global !== "undefined") {
    global.Window_InventoryAction = Window_InventoryAction;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { Window_InventoryAction };
}


//=============================================================================
// RPG Maker MZ - SC4_Scene_Inventory
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Scène de gestion et de transfert d'inventaires multiples.
 * @author SimCraft
 * @base SC4_Window_InventoryCommand
 * @base SC4_Window_InventoryList
 * @base SC4_Window_InventoryAction
 * 
 * @help SC4_Scene_Inventory.js
 */

// Fallback loader pour l'environnement Node.js
if (typeof Window_InventoryCommand === "undefined") {
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
                'SC4_Window_InventoryCommand.js',
                'SC4_Window_InventoryList.js',
                'SC4_Window_InventoryAction.js'
            ];
            for (const f of files) {
                const p = _path.join(pluginsDir, f);
                if (_fs.existsSync(p)) _vm.runInThisContext(_fs.readFileSync(p, 'utf8'));
            }
        }
    } catch (e) {}
}

const _BaseSceneInventory = typeof Scene_MenuBase !== "undefined" ? Scene_MenuBase : (typeof Scene_Base !== "undefined" ? Scene_Base : Object);

class Scene_Inventory extends _BaseSceneInventory {
    static prepare(inventoryId, options = {}) {
        this._preparedId = String(inventoryId).trim();
        this._preparedOptions = options;
    }

    create() {
        super.create();
        this._targetId = Scene_Inventory._preparedId || "C_1";
        this._options = Scene_Inventory._preparedOptions || {};
        this._targetInventory = (typeof $inventories !== "undefined" && $inventories)
            ? $inventories.inventory(this._targetId)
            : null;

        this.createCommandWindow();
        this.createHelpWindow();
        this.createPartyWindow();
        this.createTargetWindow();
        this.createActionWindow();
    }

    start() {
        super.start();
        this.refreshAll();
        this._commandWindow.activate();
        this._commandWindow.select(0);
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

    createCommandWindow() {
        const rect = this.commandWindowRect();
        this._commandWindow = new Window_InventoryCommand(rect);
        this._commandWindow.setTargetContext(this._targetInventory, this.isTargetPersistent());
        this._commandWindow.setHandler("take", this.onCommandTake.bind(this));
        this._commandWindow.setHandler("deposit", this.onCommandDeposit.bind(this));
        this._commandWindow.setHandler("close", this.popScene.bind(this));
        this._commandWindow.setHandler("cancel", this.popScene.bind(this));
        this.addWindow(this._commandWindow);
    }

    commandWindowRect() {
        const wx = 0;
        const wy = this.mainAreaTop();
        const ww = Graphics.boxWidth;
        const wh = this.calcWindowHeight(1, true);
        return new Rectangle(wx, wy, ww, wh);
    }

    createHelpWindow() {
        const rect = this.helpWindowRect();
        this._helpWindow = new Window_Help(rect);
        this.addWindow(this._helpWindow);
    }

    helpWindowRect() {
        const wx = 0;
        const wy = this._commandWindow.y + this._commandWindow.height;
        const ww = Graphics.boxWidth;
        const wh = this.calcWindowHeight(2, false);
        return new Rectangle(wx, wy, ww, wh);
    }

    createPartyWindow() {
        const rect = this.partyWindowRect();
        const title = (typeof LocalisationManager !== "undefined" && typeof LocalisationManager.getText === "function")
            ? LocalisationManager.getText("inventory.player_bag", "🎒 Sac du joueur")
            : "🎒 Sac du joueur";
        this._partyWindow = new Window_InventoryList(rect, title, true);
        this._partyWindow.setHelpWindow(this._helpWindow);
        this._partyWindow.setHandler("ok", this.onPartyListOk.bind(this));
        this._partyWindow.setHandler("cancel", this.onListCancel.bind(this));
        this._partyWindow.setHandler("right", this.onSwitchToTarget.bind(this));
        this.addWindow(this._partyWindow);
    }

    partyWindowRect() {
        const wx = 0;
        const wy = this._helpWindow.y + this._helpWindow.height;
        const ww = Math.floor(Graphics.boxWidth / 2);
        const wh = Graphics.boxHeight - wy;
        return new Rectangle(wx, wy, ww, wh);
    }

    createTargetWindow() {
        const rect = this.targetWindowRect();
        const title = this.formatTargetTitle();
        this._targetWindow = new Window_InventoryList(rect, title, false);
        this._targetWindow.setTargetInventory(this._targetInventory);
        this._targetWindow.setHelpWindow(this._helpWindow);
        this._targetWindow.setHandler("ok", this.onTargetListOk.bind(this));
        this._targetWindow.setHandler("cancel", this.onListCancel.bind(this));
        this._targetWindow.setHandler("left", this.onSwitchToParty.bind(this));
        this.addWindow(this._targetWindow);
    }

    targetWindowRect() {
        const wx = Math.floor(Graphics.boxWidth / 2);
        const wy = this._partyWindow.y;
        const ww = Graphics.boxWidth - wx;
        const wh = this._partyWindow.height;
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

    createActionWindow() {
        const rect = this.actionWindowRect();
        this._actionWindow = new Window_InventoryAction(rect);
        this._actionWindow.setHandler("take_one", this.onActionTakeOne.bind(this));
        this._actionWindow.setHandler("take_all", this.onActionTakeAll.bind(this));
        this._actionWindow.setHandler("deposit_one", this.onActionDepositOne.bind(this));
        this._actionWindow.setHandler("deposit_all", this.onActionDepositAll.bind(this));
        this._actionWindow.setHandler("drop_one", this.onActionDropOne.bind(this));
        this._actionWindow.setHandler("drop_all", this.onActionDropAll.bind(this));
        this._actionWindow.setHandler("cancel", this.onActionCancel.bind(this));
        this.addWindow(this._actionWindow);
    }

    actionWindowRect() {
        const ww = 320;
        const wh = this.calcWindowHeight(5, true);
        const wx = Math.floor((Graphics.boxWidth - ww) / 2);
        const wy = Math.floor((Graphics.boxHeight - wh) / 2);
        return new Rectangle(wx, wy, ww, wh);
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

    onSwitchToTarget() {
        if (!this._targetInventory || this._targetInventory.isEmpty()) return;
        this._partyWindow.deactivate();
        this._targetWindow.activate();
        if (this._targetWindow.index() < 0) {
            this._targetWindow.select(0);
        }
    }

    onSwitchToParty() {
        this._targetWindow.deactivate();
        this._partyWindow.activate();
        if (this._partyWindow.index() < 0) {
            this._partyWindow.select(0);
        }
    }

    onListCancel() {
        this._partyWindow.deactivate();
        this._targetWindow.deactivate();
        this._commandWindow.activate();
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
        this._actionWindow.setup("party", this.isTargetPersistent());
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
        this._actionWindow.setup("target", this.isTargetPersistent());
    }

    onActionCancel() {
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

        // Vérification de la capacité en poids du groupe
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

        // Si l'inventaire cible est vidé
        if (this._targetInventory && this._targetInventory.isEmpty()) {
            this.checkTargetEmptied();
            this._targetWindow.deactivate();
            this._actionWindow.close();
            this._commandWindow.activate();
            // Si le conteneur est persistant et le joueur a des objets, sélectionne "Déposer"
            if (this.isTargetPersistent() && this._commandWindow.isCommandEnabled(1)) {
                this._commandWindow.select(1); // Déposer
            } else {
                this._commandWindow.select(2); // Fermer
            }
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

        // Vérification des restrictions du conteneur cible
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

    refreshAll() {
        this._partyWindow.refresh();
        this._targetWindow.refresh();
        this._commandWindow.setTargetContext(this._targetInventory, this.isTargetPersistent());
        this.updateContainerSelfSwitchB();
    }

    /**
     * Met à jour l'interrupteur local B de l'événement conteneur (C_[id]) :
     * activé automatiquement s'il est vide, désactivé s'il contient des objets.
     */
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
        this.updateContainerSelfSwitchB();
    }

    /**
     * Gère le vidage complet de l'inventaire cible selon qu'il est persistant ou éphémère.
     */
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
if (typeof global !== "undefined") {
    global.Scene_Inventory = Scene_Inventory;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { Scene_Inventory };
}
