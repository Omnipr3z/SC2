class GuiManager {
    constructor() {
        this.init();
    }
    init() {
        this._isPlayerHudVisible = false;
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

window.$guiManager = new GuiManager();