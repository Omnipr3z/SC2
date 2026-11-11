//=============================================================================
// RPG Maker MZ - SC4_Window_InventoryHeader
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] En-tête supérieur d'inventaire avec portrait, jauge de poids et icône conteneur.
 * @author SimCraft
 * 
 * @help SC4_Window_InventoryHeader.js
 */

class Window_InventoryHeader extends Window_Base {
    /**
     * @param {Rectangle} rect 
     * @param {string} title 
     * @param {boolean} isParty 
     */
    constructor(rect, title, isParty = false) {
        super(rect);
        this._title = title || "";
        this._isParty = isParty;
        this._targetInventory = null;
        this._excludeInventory = null;
        this._containerIconIndex = 210; // Caisse / Coffre par défaut
        this._gaugeRect = null;
        this._lastGaugeData = null;
        this._lastFaceCacheKey = "";
        this._lastFaceActorId = 0;
        this._lastReadyFaceBitmap = null;
        this.refresh();
    }

    setTargetInventory(inv) {
        this._targetInventory = inv;
        this.refresh();
    }

    setExcludeInventory(inv) {
        if (this._excludeInventory !== inv) {
            this._excludeInventory = inv || null;
            this.refresh();
        }
    }

    leaderInventory() {
        if (typeof $gameParty === "undefined" || !$gameParty || typeof $gameParty.leader !== "function") {
            return null;
        }
        const leader = $gameParty.leader();
        if (!leader) return null;
        let container = null;
        if (leader.inventory && typeof leader.inventory.container === "function") {
            container = leader.inventory.container();
        } else if (typeof leader.actorId === "function" && typeof $inventories !== "undefined" && $inventories && typeof $inventories.inventory === "function") {
            container = $inventories.inventory("A_" + leader.actorId());
        }
        if (!container || typeof container.totalWeight !== "function") {
            return null;
        }
        const excluded = this._excludeInventory || this._targetInventory;
        if (excluded && container === excluded) {
            return null;
        }
        return container;
    }

    setTitle(title) {
        this._title = title || "";
        this.refresh();
    }

    setContainerIconIndex(iconIndex) {
        this._containerIconIndex = iconIndex;
        this.refresh();
    }

    get sharedWeight() {
        if (this._isParty) {
            return (typeof $gameParty !== "undefined" && $gameParty && typeof $gameParty.totalWeight === "function")
                ? $gameParty.totalWeight()
                : 0;
        }
        return this._targetInventory ? this._targetInventory.totalWeight() : 0;
    }

    get personalWeight() {
        if (!this._isParty) return 0;
        const lInv = this.leaderInventory();
        return (lInv && typeof lInv.totalWeight === "function") ? lInv.totalWeight() : 0;
    }

    get currentWeight() {
        if (this._isParty) {
            return Math.round((this.sharedWeight + this.personalWeight) * 100) / 100;
        }
        return this._targetInventory ? this._targetInventory.totalWeight() : 0;
    }

    hasDifferentiatedWeight() {
        return Boolean(this._isParty && this.sharedWeight > 0 && this.personalWeight > 0);
    }

    weightGaugeScreenRect() {
        if (!this._gaugeRect) return null;
        const pad = Number(this.padding) || 12;
        return new Rectangle(
            this.x + pad + this._gaugeRect.x,
            this.y + pad + this._gaugeRect.y,
            this._gaugeRect.width,
            this._gaugeRect.height
        );
    }

    get maxWeight() {
        if (this._isParty) {
            return (typeof $gameParty !== "undefined" && typeof $gameParty.maxWeight === "function")
                ? $gameParty.maxWeight()
                : 48;
        }
        return this._targetInventory ? this._targetInventory.maxWeight() : Infinity;
    }

    get isOverloaded() {
        return this.currentWeight > this.maxWeight;
    }

    update() {
        super.update();
        this.updateFaceComposition();
    }

    isHeroActor(actor) {
        if (!actor) return false;
        if (typeof actor.isHero === "function") return Boolean(actor.isHero());
        if (typeof actor.hasNotetag === "function" && actor.hasNotetag("Hero")) return true;
        if (typeof actor.hasMeta === "function" && actor.hasMeta("hero")) return true;
        if (typeof actor.actor === "function") {
            const data = actor.actor();
            if (data && data.note && /<Hero>/i.test(data.note)) return true;
        }
        return false;
    }

    getActorCompositeFaceKey(actor) {
        if (!actor) return "";
        if (actor.character && typeof actor.character.getCompositeFaceCacheKey === "function") {
            return actor.character.getCompositeFaceCacheKey();
        }
        if (typeof actor.getCompositeFaceCacheKey === "function") {
            return actor.getCompositeFaceCacheKey();
        }
        const actorId = (typeof actor.actorId === "function") ? actor.actorId() : (actor._actorId || 0);
        const race = (typeof actor.race === "function" && actor.race() ? actor.race() : "human").toLowerCase();
        const sex = (typeof actor.sex === "function" && actor.sex() ? actor.sex() : "male").toLowerCase();
        const equips = (typeof actor.equips === "function") ? actor.equips() : [];
        const equipIds = equips.map(e => e ? e.id : 0).join("-");
        return `face_${actorId}_${race}_${sex}_${equipIds}`;
    }

    getActorCompositeFaceEntry(actor) {
        if (!actor || typeof Bitmap_Composite === "undefined") return null;
        if (actor.character && typeof actor.character.getCompositeFaceEntry === "function") {
            return actor.character.getCompositeFaceEntry();
        }
        if (typeof Bitmap_Composite.getCompositeFaceEntry === "function") {
            return Bitmap_Composite.getCompositeFaceEntry(actor);
        }
        return null;
    }

    updateFaceComposition() {
        if (!this._isParty) return;
        const actor = typeof $gameParty !== "undefined" && $gameParty ? $gameParty.leader() : null;
        if (!actor) return;

        const useComposite = this.isHeroActor(actor) || Boolean(actor.hasFace && actor.hasFace());
        if (!useComposite || typeof Bitmap_Composite === "undefined") return;

        const faceKey = this.getActorCompositeFaceKey(actor);
        const faceEntry = this.getActorCompositeFaceEntry(actor);

        let needsRefresh = false;
        if (faceKey !== this._lastFaceCacheKey) {
            needsRefresh = true;
        }
        if (faceEntry && !faceEntry.isComposed && faceEntry.composer && faceEntry.composer.isReady()) {
            faceEntry.composer.bltComposite(faceEntry.bitmap);
            faceEntry.isComposed = true;
            needsRefresh = true;
        }
        if (needsRefresh) {
            this.refresh();
        }
    }

    refresh() {
        this.contents.clear();
        if (this._isParty) {
            this.drawPartyHeader();
        } else {
            this.drawTargetHeader();
        }
    }

    drawPartyHeader() {
        const actor = typeof $gameParty !== "undefined" && $gameParty ? $gameParty.leader() : null;
        const faceSize = Math.min(144, this.innerHeight);
        const padX = 4;
        const padY = Math.floor((this.innerHeight - faceSize) / 2);

        // 1. Portrait du héros (Face composite <Hero> ou RMMZ vanilla 144x144 sans rognage)
        if (actor) {
            const actorId = (typeof actor.actorId === "function") ? actor.actorId() : (actor._actorId || 0);
            if (this._lastFaceActorId !== actorId) {
                this._lastFaceActorId = actorId;
                this._lastReadyFaceBitmap = null;
            }
            const useComposite = this.isHeroActor(actor) || Boolean(actor.hasFace && actor.hasFace());
            this._lastFaceCacheKey = useComposite ? this.getActorCompositeFaceKey(actor) : "";

            let drawn = false;
            let waitingComposite = false;
            if (useComposite && typeof Bitmap_Composite !== "undefined") {
                const faceEntry = this.getActorCompositeFaceEntry(actor);
                if (faceEntry) {
                    if (!faceEntry.isComposed && faceEntry.composer && faceEntry.composer.isReady()) {
                        faceEntry.composer.bltComposite(faceEntry.bitmap);
                        faceEntry.isComposed = true;
                    }
                    if (faceEntry.isComposed && faceEntry.bitmap && faceEntry.bitmap.width > 0) {
                        this._lastReadyFaceBitmap = faceEntry.bitmap;
                        this.contents.blt(faceEntry.bitmap, 0, 0, faceEntry.bitmap.width, faceEntry.bitmap.height, padX, padY, faceSize, faceSize);
                        drawn = true;
                    } else {
                        waitingComposite = true;
                    }
                }
            }
            if (!drawn && waitingComposite && this._lastReadyFaceBitmap && this._lastReadyFaceBitmap.width > 0) {
                this.contents.blt(this._lastReadyFaceBitmap, 0, 0, this._lastReadyFaceBitmap.width, this._lastReadyFaceBitmap.height, padX, padY, faceSize, faceSize);
                drawn = true;
            }
            if (!drawn && !waitingComposite && actor.faceName()) {
                this.drawFace(actor.faceName(), actor.faceIndex(), padX, padY, faceSize, faceSize);
            }
            // Cadre subtil autour du portrait
            this.contents.strokeRect(padX - 1, padY - 1, faceSize + 2, faceSize + 2, "rgba(0, 238, 255, 0.45)");
        }

        // 2. Zone de droite : Titre avec icône graphique & Jauge de poids
        const textX = padX + faceSize + 12;
        const textW = this.innerWidth - textX - 8;
        const iconSize = 32;

        // Icône graphique du sac (bagIcon.png / bag.png depuis img/GUI/inventory/)
        this.drawBagIcon(textX, 16, iconSize);

        // Nom / Titre (sans emoji Unicode)
        this.contents.fontSize = 18;
        this.changeTextColor("#00eeff");
        const cleanTitle = (this._title || (actor ? actor.name() : "Inventaire partagé")).replace(/^[^\w\sÀ-ÿ]+/i, "").trim();
        this.drawText(cleanTitle, textX + iconSize + 8, 18, textW - iconSize - 8, "left");

        // Jauge de poids
        const gaugeY = Math.min(this.innerHeight - 36, 70);
        this._gaugeRect = new Rectangle(textX, gaugeY, textW, 22);
        this.drawWeightGauge(textX, gaugeY, textW, 22);
    }

    drawBagIcon(x, y, size) {
        if (typeof ImageManager !== "undefined" && typeof ImageManager.loadBitmap === "function") {
            let bitmap = ImageManager.loadBitmap("img/GUI/inventory/", "bagIcon");
            if (!bitmap || bitmap.isError()) {
                bitmap = ImageManager.loadBitmap("img/GUI/inventory/", "bag");
            }
            if (bitmap && bitmap.isReady()) {
                this.contents.blt(bitmap, 0, 0, bitmap.width, bitmap.height, x, y, size, size);
                return;
            } else if (bitmap && !bitmap.isError()) {
                bitmap.addLoadListener(() => this.refresh());
                return;
            }
        }
        // Repli icône standard sac si l'image n'est pas encore chargée
        if (typeof ImageManager !== "undefined" && typeof ImageManager.loadSystem === "function") {
            const iconIndex = 208; // Sac standard
            const pw = ImageManager.iconWidth || 32;
            const ph = ImageManager.iconHeight || 32;
            const sx = (iconIndex % 16) * pw;
            const sy = Math.floor(iconIndex / 16) * ph;
            const sysBitmap = ImageManager.loadSystem("IconSet");
            if (sysBitmap && sysBitmap.isReady()) {
                this.contents.blt(sysBitmap, sx, sy, pw, ph, x, y, size, size);
            }
        }
    }

    drawTargetHeader() {
        const iconSize = Math.min(136, this.innerHeight);
        const iconX = this.innerWidth - iconSize - 6;
        const iconY = Math.floor((this.innerHeight - iconSize) / 2);
        const textW = iconX - 16;

        // 1. Titre du conteneur
        this.contents.fontSize = 18;
        this.changeTextColor("#ffffff");
        this.drawText(this._title || "Conteneur", 8, 18, textW, "left");

        // 2. Icône du conteneur en haut à droite
        this.drawContainerIcon(iconX, iconY, iconSize);

        // 3. Jauge de poids ou capacité si conteneur limité
        const gaugeY = Math.min(this.innerHeight - 36, 70);
        this.drawWeightGauge(8, gaugeY, textW, 22);
    }

    drawContainerIcon(x, y, size) {
        let iconName = "defautInventoryIcon";
        if (this._targetInventory && typeof this._targetInventory.icon === "function" && this._targetInventory.icon()) {
            iconName = this._targetInventory.icon().replace(/\.png$/i, "");
        } else if (this._targetInventory && this._targetInventory._icon) {
            iconName = this._targetInventory._icon.replace(/\.png$/i, "");
        }

        if (typeof ImageManager !== "undefined" && typeof ImageManager.loadBitmap === "function") {
            let bitmap = ImageManager.loadBitmap("img/GUI/inventory/", iconName);
            if (!bitmap || bitmap.isError()) {
                bitmap = ImageManager.loadBitmap("img/GUI/", iconName);
            }
            if (bitmap && bitmap.isReady()) {
                this.contents.blt(bitmap, 0, 0, bitmap.width, bitmap.height, x, y, size, size);
                return;
            } else if (bitmap && !bitmap.isError()) {
                bitmap.addLoadListener(() => this.refresh());
                return;
            }
        }

        // Repli de secours sur l'icône IconSet standard si l'image n'est pas encore prête ou absente
        if (typeof ImageManager !== "undefined" && typeof ImageManager.loadSystem === "function") {
            const iconIndex = this._containerIconIndex || 210;
            const pw = ImageManager.iconWidth || 32;
            const ph = ImageManager.iconHeight || 32;
            const sx = (iconIndex % 16) * pw;
            const sy = Math.floor(iconIndex / 16) * ph;
            const sysBitmap = ImageManager.loadSystem("IconSet");
            if (sysBitmap && sysBitmap.isReady()) {
                this.contents.blt(sysBitmap, sx, sy, pw, ph, x + Math.floor((size - pw) / 2), y + Math.floor((size - ph) / 2));
            } else if (sysBitmap) {
                sysBitmap.addLoadListener(() => this.refresh());
            }
        }
    }

    drawWeightGauge(x, y, w, h) {
        const cur = this.currentWeight;
        const max = this.maxWeight;
        const isInfinite = max === Infinity || isNaN(max) || max <= 0;
        const rate = isInfinite ? 0 : Math.min(1, Math.max(0, cur / max));
        const isOver = !isInfinite && cur > max;
        const sharedW = this.sharedWeight;
        const personalW = this.personalWeight;

        // Fond de jauge
        this.contents.fillRect(x, y + 2, w, h - 4, "rgba(10, 20, 35, 0.7)");
        this.contents.strokeRect(x, y + 2, w, h - 4, "rgba(0, 180, 255, 0.35)");

        // Remplissage de jauge commune
        let fillW = 0;
        let fillColor = "#00b4d8"; // Bleu cyan néon normal (poids partagé)
        if (rate > 0) {
            fillW = Math.max(2, Math.round((w - 2) * rate));
            if (isOver) {
                fillColor = "#ef4444"; // Rouge alerte surpoids
            } else if (rate >= 0.85) {
                fillColor = "#f59e0b"; // Orange pré-alerte
            }
            this.contents.fillRect(x + 1, y + 3, fillW, h - 6, fillColor);
        }

        // Sur-jauge sans fond pour la proportion issue de l'inventaire personnel du leader (A_<leaderId>)
        let personalRate = 0;
        let personalFillW = 0;
        const overlayColor = "#a855f7"; // Violet néon (inventaire personnel)
        if (this._isParty && !isInfinite && personalW > 0 && rate > 0) {
            personalRate = isOver
                ? (cur > 0 ? Math.min(1, Math.max(0, personalW / cur)) : 0)
                : Math.min(rate, Math.max(0, personalW / max));
            if (personalRate > 0) {
                personalFillW = Math.min(fillW, Math.max(2, Math.round((w - 2) * personalRate)));
                this.contents.fillRect(x + 1, y + 3, personalFillW, h - 6, overlayColor);
            }
        }

        this._lastGaugeData = {
            cur,
            shared: sharedW,
            personal: personalW,
            max,
            rate,
            personalRate,
            fillW,
            personalFillW,
            isOver,
            fillColor,
            overlayColor
        };

        // Texte : Charge: X/Y UM
        this.contents.fontSize = 14;
        this.resetTextColor();
        const curStr = Number(cur.toFixed(1)).toString();
        const maxStr = isInfinite ? "∞" : Number(max.toFixed(1)).toString();
        const label = "Charge :";
        this.changeTextColor("rgba(215, 238, 255, 0.92)");
        this.drawText(label, x + 4, y - 1, w, "left");

        this.changeTextColor(isOver ? "#ef4444" : "#ffffff");
        this.drawText(`${curStr}/${maxStr} UM`, x, y - 1, w - 4, "right");
        this.resetTextColor();
    }
}

window.Window_InventoryHeader = Window_InventoryHeader;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Window_InventoryHeader;
}

