//=============================================================================
// RPG Maker MZ - SC4_Scene_Credits
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Scène de défilement des crédits de jeu.
 * @author SimCraft
 * 
 * @help SC4_Scene_Credits.js
 */

class Scene_Credits extends Scene_Base {
        create() {
            super.create();
            this._scrollTimer = 0;
            this._duration = 600; // 10 secondes par défaut (60 FPS)
            this.createBackgroundLayer();
            this.createCreditsText();
            this.playCreditsMusic();
        }

        createBackgroundLayer() {
            const loadT1 = (name) => {
                return (ImageManager.loadTitle1) ? ImageManager.loadTitle1(name) : ImageManager.loadBitmap("img/titles1/", name);
            };
            this._bg = new Sprite(loadT1("Bg_1"));
            this.addChild(this._bg);
        }

        createCreditsText() {
            const boxW = (typeof Graphics !== "undefined" && Graphics.width) ? Graphics.width : 1280;
            const boxH = (typeof Graphics !== "undefined" && Graphics.height) ? Graphics.height : 720;
            const textH = 1200;

            this._creditsBitmap = new Bitmap(boxW, textH);
            this._creditsSprite = new Sprite(this._creditsBitmap);
            this._creditsSprite.y = boxH;
            this.addChild(this._creditsSprite);

            const lines = [
                { text: "SIMCRAFT 4", size: 36, color: "#ffd700" },
                { text: "", size: 20 },
                { text: "CRÉATION ET DÉVELOPPEMENT", size: 22, color: "#61afef" },
                { text: "SimCraft Development Team", size: 20, color: "#ffffff" },
                { text: "", size: 20 },
                { text: "DIRECTION ARTISTIQUE ET ASSETS", size: 22, color: "#61afef" },
                { text: "Univers graphique SimCraft & Modules SCE", size: 20, color: "#ffffff" },
                { text: "", size: 20 },
                { text: "MUSIQUES ET AMBIANCES SONORES", size: 22, color: "#61afef" },
                { text: "03Z_MystFallOut & SimCraft Audio Collection", size: 20, color: "#ffffff" },
                { text: "", size: 20 },
                { text: "MOTEUR ET TECHNOLOGIES", size: 22, color: "#61afef" },
                { text: "RPG Maker MZ Core Engine", size: 20, color: "#ffffff" },
                { text: "SimCraft ARPG Real-Time Architecture", size: 20, color: "#ffffff" },
                { text: "", size: 30 },
                { text: "MERCI D'AVOIR JOUÉ À CETTE DÉMO !", size: 26, color: "#98c379" }
            ];

            let curY = 0;
            for (const item of lines) {
                if (item.text) {
                    this._creditsBitmap.fontSize = item.size;
                    this._creditsBitmap.textColor = item.color || "#ffffff";
                    this._creditsBitmap.drawText(item.text, 0, curY, boxW, item.size + 8, "center");
                }
                curY += (item.size || 20) + 16;
            }
        }

        playCreditsMusic() {
            if (typeof AudioManager !== "undefined" && AudioManager.playBgm) {
                AudioManager.playBgm({ name: "03Z_MystFallOut", volume: 90, pitch: 100, pan: 0 });
            }
        }

        update() {
            super.update();
            this._scrollTimer++;

            // Défilement vertical fluide
            if (this._creditsSprite) {
                this._creditsSprite.y -= 1.8;
            }

            // Retour automatique après durée impartie ou appui touche/clic
            const finished = this._scrollTimer >= this._duration || (this._creditsSprite && this._creditsSprite.y < -1200);
            const userSkipped = Input.isTriggered("ok") || Input.isTriggered("cancel") || TouchInput.isTriggered() || TouchInput.isCancelled();

            if (finished || userSkipped) {
                if (SoundManager && SoundManager.playCancel) SoundManager.playCancel();
                // Rétablir la musique du titre
                if (typeof Scene_Title !== "undefined" && Scene_Title.prototype.playTitleMusic) {
                    Scene_Title.prototype.playTitleMusic.call(this);
                }
                SceneManager.pop();
            }
        }
    }

    window.Scene_Credits = Scene_Credits;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = Scene_Credits;
    }
