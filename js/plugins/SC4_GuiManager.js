class GuiManager {
    constructor() {
        this.init();
    }
    init() {
        this._isPlayerHudVisible = false;
        this._isWeaponHudVisible = false;
        this._isBattleHudVisible = false;
        this._isMenuVisible = false;
    }
    //PLAYER HUD
    showPlayerHud() {
        this._isPlayerHudVisible = true;
    }
    hidePlayerHud() {
        this._isPlayerHudVisible = false;
    }
    togglePlayerHud() {
        this._isPlayerHudVisible = !this._isPlayerHudVisible;
    }
    isPlayerHudVisible() {
        return this._isPlayerHudVisible;
    }
    //WEAPON HUD
    showWeaponHud() {
        this._isWeaponHudVisible = true;
    }
    hideWeaponHud() {
        this._isWeaponHudVisible = false;
    }
    toggleWeaponHud() {
        this._isWeaponHudVisible = !this._isWeaponHudVisible;
    }
    isWeaponHudVisible() {
        return Boolean(this._isWeaponHudVisible);
    }
    //GLOBAL CONTROLS
    hideAllHuds() {
        this.hidePlayerHud();
        this.hideWeaponHud();
        this.hideBattleHud();
    }
    showAllHuds() {
        this.showPlayerHud();
        this.showWeaponHud();
        this.showBattleHud();
    }
    //BATTLE HUD
    showBattleHud() {
        this._isBattleHudVisible = true;
    }
    hideBattleHud() {
        this._isBattleHudVisible = false;
    }
    toggleBattleHud() {
        this._isBattleHudVisible = !this._isBattleHudVisible;
    }
    isBattleHudVisible() {
        return this._isBattleHudVisible;
    }
    //MENU
    showMenu() {
        this._isMenuVisible = true;
    }
    hideMenu() {
        this._isMenuVisible = false;
    }
    toggleMenu() {
        this._isMenuVisible = !this._isMenuVisible;
    }
    isMenuVisible() {
        return this._isMenuVisible;
    }
}

window.GuiManager = GuiManager;
window.$guiManager = new GuiManager();
if (typeof module !== "undefined" && module.exports) {
    module.exports = GuiManager;
}