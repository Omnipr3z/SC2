//=============================================================================
// RPG Maker MZ - SC4_Scene_FreeGameStart
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Scène de lancement du mode libre.
 * @author SimCraft
 * 
 * @help SC4_Scene_FreeGameStart.js
 */

(() => {
    "use strict";

    const Scene_MenuBaseClass = (typeof Scene_MenuBase !== "undefined") ? Scene_MenuBase : Scene_Base;

    class Scene_FreeGameStart extends Scene_MenuBaseClass {
        create() {
            super.create();
            this.createBackgroundLayer();
            this.createInfoWindow();
        }

        createBackgroundLayer() {
            const loadT1 = (name) => {
                return (ImageManager.loadTitle1) ? ImageManager.loadTitle1(name) : ImageManager.loadBitmap("img/titles1/", name);
            };
            this._bg = new Sprite(loadT1("Bg_2"));
            this.addChild(this._bg);
        }

        createInfoWindow() {
            const boxW = (typeof Graphics !== "undefined" && Graphics.boxWidth) ? Graphics.boxWidth : 1280;
            const boxH = (typeof Graphics !== "undefined" && Graphics.boxHeight) ? Graphics.boxHeight : 720;
            const rect = new Rectangle((boxW - 640) / 2, (boxH - 260) / 2, 640, 260);

            this._infoWindow = new Window_Base(rect);
            this._infoWindow.opacity = 220;

            const text1 = "SIMCRAFT 4 - MODE LIBRE";
            const text2 = "Ce mode permettra d'explorer les secteurs en toute autonomie,";
            const text3 = "de lancer des expéditions et d'aménager vos bases.";
            const text4 = "[ Fonctionnalité en cours de préparation ]";
            const text5 = "Appuyez sur Échap ou Annuler pour revenir au titre.";

            this._infoWindow.contents.fontSize = 22;
            this._infoWindow.drawText(text1, 0, 15, rect.width - 36, "center");
            this._infoWindow.contents.fontSize = 16;
            this._infoWindow.drawText(text2, 0, 65, rect.width - 36, "center");
            this._infoWindow.drawText(text3, 0, 95, rect.width - 36, "center");
            this._infoWindow.changeTextColor(ColorManager ? ColorManager.systemColor() : "#ffd700");
            this._infoWindow.drawText(text4, 0, 140, rect.width - 36, "center");
            this._infoWindow.resetTextColor();
            this._infoWindow.drawText(text5, 0, 185, rect.width - 36, "center");

            this.addWindow(this._infoWindow);
        }

        update() {
            super.update();
            if (Input.isTriggered("cancel") || TouchInput.isCancelled()) {
                if (SoundManager && SoundManager.playCancel) SoundManager.playCancel();
                SceneManager.pop();
            }
        }
    }

    window.Scene_FreeGameStart = Scene_FreeGameStart;
})();
