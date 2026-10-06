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
     * Surcharge d'update pour interrompre le déplacement automatique dès que l'on vise.
     */
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        if ($gamePlayer && $gamePlayer.isAiming && $gamePlayer.isAiming()) {
            if ($gameTemp.isDestinationValid()) {
                $gameTemp.clearDestination();
            }
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

})();
