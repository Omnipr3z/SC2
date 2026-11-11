class GuiManager {
    constructor() {
        this.init();
    }
    init() {
        this._isPlayerHudVisible = false;
        this._isPlayerRelationHudVisible = false;
        this._isWeaponHudVisible = false;
        this._isBattleHudVisible = false;
        this._isMenuVisible = false;
        this._isSubComActive = false;
        this._isNavigationLocked = false;
        this._navigationLockReason = null;
        this._bubbleMode = 0;
        this._lastBubbleMode = 0;
    }
    // SUBCOM HUD
    get isSubComActive() {
        return Boolean(this._isSubComActive);
    }
    set isSubComActive(value) {
        this._isSubComActive = Boolean(value);
    }
    setSubComActive(value) {
        this._isSubComActive = Boolean(value);
        return this._isSubComActive;
    }
    showSubCom() {
        this._isSubComActive = true;
    }
    hideSubCom() {
        this._isSubComActive = false;
    }
    isSubComVisible() {
        return Boolean(this._isSubComActive);
    }
    // NAVIGATION LOCK (Bridge Console)
    get isNavigationLocked() {
        return Boolean(this._isNavigationLocked);
    }
    set isNavigationLocked(value) {
        this._isNavigationLocked = Boolean(value);
        if (!this._isNavigationLocked) {
            this._navigationLockReason = null;
        }
    }
    setNavigationLocked(locked, reason = null) {
        this._isNavigationLocked = Boolean(locked);
        this._navigationLockReason = this._isNavigationLocked ? (reason || null) : null;
        return this._isNavigationLocked;
    }
    lockNavigation(reason = null) {
        return this.setNavigationLocked(true, reason);
    }
    unlockNavigation() {
        return this.setNavigationLocked(false, null);
    }
    navigationLockReason() {
        return this._navigationLockReason || null;
    }
    // BUBBLE MODE
    get bubbleMode() {
        return this._bubbleMode;
    }
    get lastBubbleMode() {
        return this._lastBubbleMode;
    }
    getBubbleMode() {
        return this._bubbleMode;
    }
    getLastBubbleMode() {
        return this._lastBubbleMode;
    }
    setBubbleMode(mode = 0) {
        const nextMode = Math.max(0, Math.floor(Number(mode) || 0));
        if (nextMode !== this._bubbleMode) {
            this._lastBubbleMode = this._bubbleMode;
            this._bubbleMode = nextMode;
        }
        return this._bubbleMode;
    }
    restoreLastBubbleMode() {
        this._bubbleMode = this._lastBubbleMode;
        return this._bubbleMode;
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
        return Boolean(this._isPlayerHudVisible);
    }
    //PLAYER RELATION HUD
    showPlayerRelationHud() {
        this._isPlayerRelationHudVisible = true;
    }
    hidePlayerRelationHud() {
        this._isPlayerRelationHudVisible = false;
    }
    togglePlayerRelationHud() {
        this._isPlayerRelationHudVisible = !this._isPlayerRelationHudVisible;
    }
    isPlayerRelationHudVisible() {
        return Boolean(this._isPlayerRelationHudVisible);
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
        this.hidePlayerRelationHud();
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

    // PERSISTANCE
    makeSavefileData() {
        return {
            isPlayerHudVisible: Boolean(this._isPlayerHudVisible),
            isPlayerRelationHudVisible: Boolean(this._isPlayerRelationHudVisible),
            isWeaponHudVisible: Boolean(this._isWeaponHudVisible),
            isBattleHudVisible: Boolean(this._isBattleHudVisible),
            isMenuVisible: Boolean(this._isMenuVisible),
            isSubComActive: false, // État transitoire de sous-scène réinitialisé au chargement
            isNavigationLocked: Boolean(this._isNavigationLocked),
            navigationLockReason: this._navigationLockReason || null,
            bubbleMode: Number(this._bubbleMode) || 0,
            lastBubbleMode: Number(this._lastBubbleMode) || 0
        };
    }

    loadSavefileData(data) {
        this.init();
        if (!data || typeof data !== "object") return;
        if (data.isPlayerHudVisible !== undefined) this._isPlayerHudVisible = Boolean(data.isPlayerHudVisible);
        if (data.isPlayerRelationHudVisible !== undefined) this._isPlayerRelationHudVisible = Boolean(data.isPlayerRelationHudVisible);
        if (data.isWeaponHudVisible !== undefined) this._isWeaponHudVisible = Boolean(data.isWeaponHudVisible);
        if (data.isBattleHudVisible !== undefined) this._isBattleHudVisible = Boolean(data.isBattleHudVisible);
        if (data.isMenuVisible !== undefined) this._isMenuVisible = Boolean(data.isMenuVisible);
        if (data.isSubComActive !== undefined) this._isSubComActive = Boolean(data.isSubComActive);
        if (data.isNavigationLocked !== undefined) this._isNavigationLocked = Boolean(data.isNavigationLocked);
        if (data.navigationLockReason !== undefined) this._navigationLockReason = data.navigationLockReason || null;
        if (data.bubbleMode !== undefined) this._bubbleMode = Math.max(0, Math.floor(Number(data.bubbleMode) || 0));
        if (data.lastBubbleMode !== undefined) this._lastBubbleMode = Math.max(0, Math.floor(Number(data.lastBubbleMode) || 0));
    }
}

const _defaultGuiManager = new GuiManager();
if (typeof window !== "undefined") {
    window.GuiManager = GuiManager;
    window.$guiManager = _defaultGuiManager;
}
if (typeof global !== "undefined") {
    global.GuiManager = GuiManager;
    global.$guiManager = _defaultGuiManager;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = GuiManager;
}