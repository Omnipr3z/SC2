//=============================================================================
// SC4_rmmz_scenes_Patches.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Surcharges et patches des classes natives de rmmz_scenes.js.
 * @author SimCraft
 * @help
 * ============================================================================
 * SC4_rmmz_scenes_Patches.js
 * ============================================================================
 * Regroupe tous les patches et surcharges apportés aux classes de rmmz_scenes :
 * 
 * 1. Scene_Map :
 *    - isMenuCalled : Le clic droit n'ouvre plus le menu sur la carte (seule la
 *      touche clavier Menu/Échap ouvre le menu).
 *    - onMapTouch : Si le mode visée est actif (clic droit maintenu), le clic
 *      gauche ne déclenche aucun déplacement et appelle l'action de visée
 *      ($gamePlayer.onAimAction).
 *    - update : Annule immédiatement tout déplacement automatique en cours si
 *      le joueur commence à viser.
 * ============================================================================
 * 
 * @command SetHudVisibility
 * @text Visibilité des HUDs
 * @desc Affiche, masque ou bascule l'affichage des HUDs (Acteur et/ou Arme).
 *
 * @arg target
 * @text Cible
 * @type select
 * @option Tous les HUDs
 * @value all
 * @option HUD Acteur (Joueur)
 * @value player
 * @option HUD Arme (Munitions)
 * @value weapon
 * @default all
 *
 * @arg visible
 * @text Action
 * @type select
 * @option Basculer (On/Off)
 * @value toggle
 * @option Afficher
 * @value true
 * @option Masquer
 * @value false
 * @default toggle
 * ============================================================================
 *
 * @param defaultHudVisible
 * @text HUDs visibles au départ
 * @type boolean
 * @desc Active ou masque l'ensemble des HUDs de la carte au début d'une nouvelle partie.
 * @default true
 *
 * @param defaultPlayerHud
 * @text HUD Joueur visible au départ
 * @type boolean
 * @desc Active ou masque spécifiquement le HUD Joueur (portrait, jauges) au départ.
 * @default true
 *
 * @param defaultWeaponHud
 * @text HUD Arme visible au départ
 * @type boolean
 * @desc Active ou masque spécifiquement le HUD Arme (munitions) au départ.
 * @default true
 * ============================================================================
 */

(() => {
    "use strict";

    // ========================================================================
    // 1. Patches pour Scene_Map
    // ========================================================================
    /**
     * Empêche le clic droit d'ouvrir le menu sur la carte.
     */
    Scene_Map.prototype.isMenuCalled = function() {
        return Input.isTriggered("menu");
    };

    /**
     * Gère le toucher de carte : bloque le déplacement si le joueur vise.
     */
    const _Scene_Map_onMapTouch = Scene_Map.prototype.onMapTouch;
    Scene_Map.prototype.onMapTouch = function() {
        if ($gamePlayer && $gamePlayer.isAiming && $gamePlayer.isAiming()) {
            if ($gamePlayer.onAimAction) {
                $gamePlayer.onAimAction();
            }
            return;
        }
        _Scene_Map_onMapTouch.call(this);
    };

    /**
     * Surcharge d'update pour interrompre le déplacement automatique dès que l'on vise
     * et écouter la touche 'I' (ouverture rapide de l'inventaire).
     */
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        if (typeof $gamePlayer !== "undefined" && $gamePlayer) {
            if (typeof $gamePlayer.adjustCenterScroll === "function") {
                $gamePlayer.adjustCenterScroll();
            }
            if (typeof $gamePlayer.isAiming === "function" && $gamePlayer.isAiming()) {
                if (typeof $gameTemp !== "undefined" && $gameTemp && typeof $gameTemp.isDestinationValid === "function" && $gameTemp.isDestinationValid()) {
                    $gameTemp.clearDestination();
                }
            }
        }
        const isActive = (typeof this.isActive === "function") ? this.isActive() : true;
        const isSceneChanging = (typeof SceneManager !== "undefined" && typeof SceneManager.isSceneChanging === "function") ? SceneManager.isSceneChanging() : false;
        if (isActive && !isSceneChanging && typeof Input !== "undefined" && typeof Input.isTriggered === "function" && Input.isTriggered("inventory")) {
            if (typeof $gameMap !== "undefined" && !$gameMap.isEventRunning() && typeof $gameParty !== "undefined" && $gameParty.leader()) {
                const targetId = "A_" + $gameParty.leader().actorId();
                if (typeof SoundManager !== "undefined" && typeof SoundManager.playOk === "function") {
                    SoundManager.playOk();
                }
                if (typeof $inventories !== "undefined" && $inventories) {
                    $inventories.open(targetId);
                } else if (typeof Scene_Inventory !== "undefined") {
                    Scene_Inventory.prepare(targetId);
                    SceneManager.push(Scene_Inventory);
                }
            }
        }
        if (isActive && !isSceneChanging && typeof Input !== "undefined" && typeof Input.isTriggered === "function" && Input.isTriggered("toggleHud")) {
            if (typeof $gameSystem !== "undefined" && typeof $gameSystem.toggleHud === "function") {
                $gameSystem.toggleHud();
            }
        }
    };

    /**
     * Instanciation du HUD joueur en haut à gauche de Scene_Map.
     */
    const _Scene_Map_createDisplayObjects = Scene_Map.prototype.createDisplayObjects;
    Scene_Map.prototype.createDisplayObjects = function() {
        if (_Scene_Map_createDisplayObjects) {
            _Scene_Map_createDisplayObjects.call(this);
        }
        this.createPlayerHud();
    };

    Scene_Map.prototype.createPlayerHud = function() {
        if (typeof Sprite_PlayerHUD !== "undefined") {
            this._playerHud = new Sprite_PlayerHUD();
            this.addChild(this._playerHud);
        }
        if (typeof Sprite_InterlocutorHUD !== "undefined") {
            this._interlocutorHud = new Sprite_InterlocutorHUD();
            this.addChild(this._interlocutorHud);
        }
    };

    // ========================================================================
    // 2. Patches pour Window_MenuCommand & Scene_Menu (Bouton Inventory)
    // ========================================================================
    if (typeof Window_MenuCommand !== "undefined") {
        const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
        Window_MenuCommand.prototype.addOriginalCommands = function() {
            if (_Window_MenuCommand_addOriginalCommands) {
                _Window_MenuCommand_addOriginalCommands.call(this);
            }
            this.addCommand("Inventaire", "inventory", true);
        };
    }

    if (typeof Scene_Menu !== "undefined") {
        const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
        Scene_Menu.prototype.createCommandWindow = function() {
            _Scene_Menu_createCommandWindow.call(this);
            this._commandWindow.setHandler("inventory", this.commandInventory.bind(this));
        };

        Scene_Menu.prototype.commandInventory = function() {
            const leader = (typeof $gameParty !== "undefined" && $gameParty) ? $gameParty.leader() : null;
            const targetId = "A_" + (leader ? leader.actorId() : 1);
            if (typeof $inventories !== "undefined" && $inventories) {
                $inventories.open(targetId);
            } else if (typeof Scene_Inventory !== "undefined") {
                Scene_Inventory.prepare(targetId);
                SceneManager.push(Scene_Inventory);
            }
        };
    }

    // ========================================================================
    // 3. Commandes de plugin pour le contrôle du HUD (SetHudVisibility)
    // ========================================================================
    if (typeof PluginManager !== "undefined" && PluginManager.registerCommand) {
        PluginManager.registerCommand("SC4_rmmz_scenes_Patches", "SetHudVisibility", args => {
            const target = (args.target || "all").toLowerCase();
            const action = (args.visible || "toggle").toLowerCase();
            let visible = true;
            if (action === "false" || action === "hide" || action === "off") visible = false;
            if (action === "true" || action === "show" || action === "on") visible = true;
            const isToggle = (action === "toggle");

            if (typeof $gameSystem !== "undefined" && $gameSystem) {
                if (target === "player" || target === "actor") {
                    if (isToggle) $gameSystem.togglePlayerHud();
                    else $gameSystem.setPlayerHudVisible(visible);
                } else if (target === "weapon" || target === "gun") {
                    if (isToggle) $gameSystem.toggleWeaponHud();
                    else $gameSystem.setWeaponHudVisible(visible);
                } else {
                    if (isToggle) $gameSystem.toggleHud();
                    else $gameSystem.setHudVisible(visible);
                }
            }
        });
    }

    // ========================================================================
    // 4. Patches pour Scene_Item (Affichage Poids & Action Jeter un objet)
    // ========================================================================
    if (typeof Window_Base !== "undefined") {
        class Window_ItemWeight extends Window_Base {
            constructor(rect) {
                super(rect);
                this.refresh();
            }
            refresh() {
                this.contents.clear();
                if (typeof $gameParty === "undefined" || !$gameParty) return;
                const curWeight = (typeof $gameParty.totalWeight === "function") ? $gameParty.totalWeight() : 0;
                const maxWeight = (typeof $gameParty.maxWeight === "function") ? $gameParty.maxWeight() : 50;
                const isOverloaded = curWeight > maxWeight;
                const label = (typeof LocalisationManager !== "undefined" && typeof LocalisationManager.getText === "function")
                    ? LocalisationManager.getText("inventory.weight", "Poids")
                    : "Poids";
                const maxStr = (maxWeight === Infinity || isNaN(maxWeight)) ? "∞" : maxWeight;
                const text = `${label}: ${curWeight}/${maxStr}`;
                if (isOverloaded) {
                    this.changeTextColor("#ff4d4d");
                } else {
                    this.changeTextColor(ColorManager.systemColor());
                }
                this.drawText(text, 0, 0, this.innerWidth, "center");
                this.resetTextColor();
            }
        }
        window.Window_ItemWeight = Window_ItemWeight;
    }

    if (typeof Window_Command !== "undefined") {
        class Window_ItemAction extends Window_Command {
            constructor(rect) {
                super(rect);
                this.openness = 0;
                this.deactivate();
                this._item = null;
            }
            setup(item) {
                this._item = item;
                this.refresh();
                this.select(0);
                this.open();
                this.activate();
            }
            makeCommandList() {
                const item = this._item;
                const getTxt = (key, fallback) => {
                    return (typeof LocalisationManager !== "undefined" && typeof LocalisationManager.getText === "function")
                        ? LocalisationManager.getText(key, fallback)
                        : fallback;
                };
                const canUse = item && (typeof $gameParty !== "undefined") && $gameParty.canUse(item);
                if (canUse) {
                    this.addCommand(getTxt("inventory.use", "Utiliser"), "use", true);
                }
                this.addCommand(getTxt("inventory.drop_one", "Jeter 1"), "drop_one", true);
                this.addCommand(getTxt("inventory.drop_all", "Jeter Tout"), "drop_all", true);
                this.addCommand(getTxt("inventory.cancel", "Annuler"), "cancel", true);
            }
        }
        window.Window_ItemAction = Window_ItemAction;
    }

    if (typeof Scene_Item !== "undefined") {
        const _Scene_Item_create = Scene_Item.prototype.create;
        Scene_Item.prototype.create = function () {
            if (_Scene_Item_create) _Scene_Item_create.call(this);
            this.createWeightWindow();
            this.createItemActionWindow();
        };

        Scene_Item.prototype.categoryWindowRect = function () {
            const wx = 0;
            const wy = this.mainAreaTop();
            const ww = Graphics.boxWidth - 220;
            const wh = this.calcWindowHeight(1, true);
            return new Rectangle(wx, wy, ww, wh);
        };

        Scene_Item.prototype.createWeightWindow = function () {
            const ww = 220;
            const wh = this.calcWindowHeight(1, true);
            const wx = Graphics.boxWidth - ww;
            const wy = this.mainAreaTop();
            const rect = new Rectangle(wx, wy, ww, wh);
            this._weightWindow = new Window_ItemWeight(rect);
            this.addWindow(this._weightWindow);
        };

        Scene_Item.prototype.createItemActionWindow = function () {
            const ww = 280;
            const wh = this.calcWindowHeight(4, true);
            const wx = Math.floor((Graphics.boxWidth - ww) / 2);
            const wy = Math.floor((Graphics.boxHeight - wh) / 2);
            const rect = new Rectangle(wx, wy, ww, wh);
            this._itemActionWindow = new Window_ItemAction(rect);
            this._itemActionWindow.setHandler("use", this.onActionUse.bind(this));
            this._itemActionWindow.setHandler("drop_one", this.onActionDropOne.bind(this));
            this._itemActionWindow.setHandler("drop_all", this.onActionDropAll.bind(this));
            this._itemActionWindow.setHandler("cancel", this.onActionCancel.bind(this));
            this.addWindow(this._itemActionWindow);
        };

        Scene_Item.prototype.onItemOk = function () {
            const item = this.item();
            if (!item) {
                this._itemWindow.activate();
                return;
            }
            this._itemWindow.deactivate();
            this._itemActionWindow.setup(item);
        };

        Scene_Item.prototype.onActionUse = function () {
            this._itemActionWindow.close();
            this._itemActionWindow.deactivate();
            $gameParty.setLastItem(this.item());
            this.determineItem();
        };

        Scene_Item.prototype.onActionDropOne = function () {
            const item = this.item();
            if (item) {
                $gameParty.loseItem(item, 1);
                if (typeof SoundManager !== "undefined" && typeof SoundManager.playUseItem === "function") {
                    SoundManager.playUseItem();
                }
                this._itemWindow.refresh();
                if (this._weightWindow) this._weightWindow.refresh();
            }
            this._itemActionWindow.close();
            this._itemActionWindow.deactivate();
            this._itemWindow.activate();
        };

        Scene_Item.prototype.onActionDropAll = function () {
            const item = this.item();
            if (item) {
                const total = $gameParty.numItems(item);
                $gameParty.loseItem(item, total);
                if (typeof SoundManager !== "undefined" && typeof SoundManager.playUseItem === "function") {
                    SoundManager.playUseItem();
                }
                this._itemWindow.refresh();
                if (this._weightWindow) this._weightWindow.refresh();
            }
            this._itemActionWindow.close();
            this._itemActionWindow.deactivate();
            this._itemWindow.activate();
        };

        Scene_Item.prototype.onActionCancel = function () {
            this._itemActionWindow.close();
            this._itemActionWindow.deactivate();
            this._itemWindow.activate();
        };

        const _Scene_Item_useItem = Scene_Item.prototype.useItem;
        Scene_Item.prototype.useItem = function () {
            if (_Scene_Item_useItem) _Scene_Item_useItem.call(this);
            if (this._weightWindow) this._weightWindow.refresh();
        };
    }

})();
