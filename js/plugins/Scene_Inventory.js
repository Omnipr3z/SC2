//=============================================================================
// Scene_Inventory.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Scène de gestion et de transfert d'inventaires multiples.
 * @author SimCraft
 * @help
 * ============================================================================
 * Scene_Inventory.js
 * ============================================================================
 * Fournit l'interface visuelle complète pour gérer les inventaires :
 * - Liste des objets du joueur ($gameParty)
 * - Liste des objets de l'inventaire cible (Acteur, Conteneur, Ennemi)
 * - Zone d'informations sur l'objet sélectionné
 * - Menu d'action : Transférer 1, Transférer Tout, Annuler
 * - Gestion automatique du pillage des cadavres d'ennemis (disparition et
 *   activation de l'interrupteur local D une fois vidé).
 * ============================================================================
 */

// ============================================================================
// 1. Fenêtre de liste d'inventaire personnalisée
// ============================================================================
class Window_InventoryList extends Window_Selectable {
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
            this.drawItemName(item, rect.x, rect.y, rect.width - 60);
            const qty = this.itemQuantity(item);
            this.drawText(":" + qty, rect.x, rect.y, rect.width, "right");
            this.changePaintOpacity(1);
        }
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
// 2. Fenêtre de commande d'actions d'inventaire
// ============================================================================
class Window_InventoryAction extends Window_Command {
    constructor(rect) {
        super(rect);
        this.openness = 0;
        this.deactivate();
    }

    makeCommandList() {
        this.addCommand("Transférer 1", "transfer_one");
        this.addCommand("Transférer Tout", "transfer_all");
        this.addCommand("Annuler", "cancel");
    }
}

// ============================================================================
// 3. Scène principale Scene_Inventory
// ============================================================================
class Scene_Inventory extends Scene_MenuBase {
    static prepare(inventoryId, options = {}) {
        this._preparedId = String(inventoryId).trim();
        this._preparedOptions = options;
    }

    create() {
        super.create();
        this._targetId = Scene_Inventory._preparedId || "C_1";
        this._options = Scene_Inventory._preparedOptions || {};
        this._targetInventory = $inventories.inventory(this._targetId);

        this.createHelpWindow();
        this.createPartyWindow();
        this.createTargetWindow();
        this.createActionWindow();
    }

    start() {
        super.start();
        this._partyWindow.activate();
        this._partyWindow.select(0);
    }

    createHelpWindow() {
        const rect = this.helpWindowRect();
        this._helpWindow = new Window_Help(rect);
        this.addWindow(this._helpWindow);
    }

    helpWindowRect() {
        const wx = 0;
        const wy = this.mainAreaTop();
        const ww = Graphics.boxWidth;
        const wh = this.calcWindowHeight(2, false);
        return new Rectangle(wx, wy, ww, wh);
    }

    createPartyWindow() {
        const rect = this.partyWindowRect();
        this._partyWindow = new Window_InventoryList(rect, "🎒 Joueur (Groupe)", true);
        this._partyWindow.setHelpWindow(this._helpWindow);
        this._partyWindow.setHandler("ok", this.onListOk.bind(this));
        this._partyWindow.setHandler("cancel", this.popScene.bind(this));
        this._partyWindow.setHandler("right", this.onSwitchToTarget.bind(this));
        this.addWindow(this._partyWindow);
    }

    partyWindowRect() {
        const wx = 0;
        const wy = this._helpWindow.y + this._helpWindow.height;
        const ww = Math.floor(Graphics.boxWidth / 2);
        const wh = Graphics.boxHeight - wy - 20;
        return new Rectangle(wx, wy, ww, wh);
    }

    createTargetWindow() {
        const rect = this.targetWindowRect();
        const title = this.formatTargetTitle();
        this._targetWindow = new Window_InventoryList(rect, title, false);
        this._targetWindow.setTargetInventory(this._targetInventory);
        this._targetWindow.setHelpWindow(this._helpWindow);
        this._targetWindow.setHandler("ok", this.onListOk.bind(this));
        this._targetWindow.setHandler("cancel", this.popScene.bind(this));
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
        this._actionWindow.setHandler("transfer_one", this.onActionTransferOne.bind(this));
        this._actionWindow.setHandler("transfer_all", this.onActionTransferAll.bind(this));
        this._actionWindow.setHandler("cancel", this.onActionCancel.bind(this));
        this.addWindow(this._actionWindow);
    }

    actionWindowRect() {
        const ww = 280;
        const wh = this.calcWindowHeight(3, true);
        const wx = Math.floor((Graphics.boxWidth - ww) / 2);
        const wy = Math.floor((Graphics.boxHeight - wh) / 2);
        return new Rectangle(wx, wy, ww, wh);
    }

    onSwitchToTarget() {
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

    activeListWindow() {
        return this._partyWindow.active ? this._partyWindow : this._targetWindow;
    }

    onListOk() {
        const win = this.activeListWindow();
        const item = win.item();
        if (!item) {
            win.activate();
            return;
        }
        win.deactivate();
        this._actionWindow.open();
        this._actionWindow.activate();
        this._actionWindow.select(0);
    }

    onActionCancel() {
        this._actionWindow.close();
        this._actionWindow.deactivate();
        const activeWin = this._partyWindow.active ? this._partyWindow : this._targetWindow;
        activeWin.activate();
    }

    onActionTransferOne() {
        this.executeTransfer(1);
    }

    onActionTransferAll() {
        const win = this.activeListWindow();
        const item = win.item();
        const total = win.itemQuantity(item);
        this.executeTransfer(total);
    }

    executeTransfer(amount) {
        const isFromParty = this._partyWindow.active;
        const sourceWin = isFromParty ? this._partyWindow : this._targetWindow;
        const item = sourceWin.item();

        if (item && amount > 0) {
            if (isFromParty) {
                // Du joueur vers la cible
                $gameParty.loseItem(item, amount);
                this._targetInventory.gainItem(item, amount);
            } else {
                // De la cible vers le joueur
                this._targetInventory.loseItem(item, amount);
                $gameParty.gainItem(item, amount);
            }

            SoundManager.playEquip();
            this._partyWindow.refresh();
            this._targetWindow.refresh();

            // Si c'est un ennemi et que son inventaire est vidé :
            if (!isFromParty && this._targetId.startsWith("E_") && this._targetInventory.isEmpty()) {
                this.handleEnemyLooted();
            }
        }

        this.onActionCancel();
    }

    handleEnemyLooted() {
        // 1. Supprime de la liste des inventaires
        $inventories.unset(this._targetId);

        // 2. Récupère l'événement associé (soit passé en option, soit via FightManager/GameMap)
        let eventId = this._options.eventId || $inventories.currentEventId();
        if (!eventId && typeof $gameMap !== "undefined" && $gameMap) {
            const enemyId = Number(this._targetId.slice(2));
            const enemyEv = $gameMap.events().find(e => e && e._enemyId === enemyId);
            if (enemyEv) eventId = enemyEv.eventId();
        }

        if (eventId && typeof $gameMap !== "undefined" && $gameMap) {
            const ev = $gameMap.event(eventId);
            if (ev) {
                // Activation de l'interrupteur local D
                if (typeof $gameSelfSwitches !== "undefined") {
                    $gameSelfSwitches.setValue([$gameMap.mapId(), eventId, "D"], true);
                }
                // Disparition visuelle (fade / opacité à 0)
                if (typeof ev.setOpacity === "function") {
                    ev.setOpacity(0);
                }
            }
        }
    }
}

window.Window_InventoryList = Window_InventoryList;
window.Window_InventoryAction = Window_InventoryAction;
window.Scene_Inventory = Scene_Inventory;
