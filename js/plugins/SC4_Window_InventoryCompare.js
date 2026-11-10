//=============================================================================
// SC4_Window_InventoryCompare.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Fenêtre comparative de statistiques d'équipement pour Scene_Inventory.
 * @author SimCraft
 * @help
 * ============================================================================
 * Window_InventoryCompare.js
 * ============================================================================
 * Affiche la comparaison des statistiques (ATK, DEF, MAT, etc.) et de l'encombrement
 * entre l'équipement actuellement porté et l'objet sélectionné dans l'inventaire.
 * Remplace Window_Help lors de l'ouverture du menu d'action d'équipement.
 * ============================================================================
 */

class Window_InventoryCompare extends Window_Base {
    constructor(rect) {
        super(rect);
        this._item = null;
        this._actor = null;
        this._tempActor = null;
        this._slotId = -1;
        this._currentItem = null;
        this.hide();
    }

    setItem(item) {
        this._item = item;
        const leader = (typeof $gameParty !== "undefined" && $gameParty) ? $gameParty.leader() : null;
        this._actor = leader;
        this._tempActor = null;
        this._slotId = -1;
        this._currentItem = null;

        if (leader && item && (DataManager.isWeapon(item) || DataManager.isArmor(item))) {
            const slotId = (leader.equipment && typeof leader.equipment.findSlotFor === "function")
                ? leader.equipment.findSlotFor(item)
                : ((typeof leader.equipSlots === "function") ? leader.equipSlots().indexOf(item.etypeId) : 0);
            this._slotId = slotId;

            let curItem = null;
            if (slotId >= 0) {
                if (leader.equipment && typeof leader.equipment.itemAt === "function") {
                    curItem = leader.equipment.itemAt(slotId);
                } else if (typeof leader.equips === "function") {
                    const equips = leader.equips();
                    curItem = equips ? equips[slotId] : null;
                }
            }
            this._currentItem = curItem;

            if (typeof JsonEx !== "undefined" && typeof JsonEx.makeDeepCopy === "function") {
                try {
                    const temp = JsonEx.makeDeepCopy(leader);
                    if (slotId >= 0 && typeof temp.forceChangeEquip === "function") {
                        temp.forceChangeEquip(slotId, item);
                    }
                    this._tempActor = temp;
                } catch (e) {
                    this._tempActor = null;
                }
            }
        }
        this.refresh();
    }

    refresh() {
        this.contents.clear();
        if (!this._item || !this._actor) return;

        const w = this.innerWidth;
        const h = this.innerHeight;
        const lineHeight = 26;

        // 1. Titre & Slot
        this.contents.fontSize = 15;
        this.changeTextColor("#00eeff");
        const slotName = this.getSlotName(this._slotId);
        this.drawText(`📊 COMPARAISON [ ${slotName} ]`, 0, 0, w, "left");

        // 2. Paramètres comparés (ATK, DEF, MAT, MDF, AGI, LUK, MHP, MMP)
        const paramsToShow = [2, 3, 4, 5, 6, 7]; // ATK, DEF, MAT, MDF, AGI, LUK
        // Ajouter HP/MP si modification
        if (this._tempActor) {
            if (typeof this._tempActor.mhp !== "undefined" && typeof this._actor.mhp !== "undefined" && this._tempActor.mhp !== this._actor.mhp) paramsToShow.unshift(0);
            if (typeof this._tempActor.mmp !== "undefined" && typeof this._actor.mmp !== "undefined" && this._tempActor.mmp !== this._actor.mmp) paramsToShow.unshift(1);
        }

        const colW = Math.floor(w / 2);
        let row = 0;
        let col = 0;
        const startY = 28;

        this.contents.fontSize = 13;
        for (const paramId of paramsToShow) {
            const paramName = (typeof TextManager !== "undefined" && typeof TextManager.param === "function")
                ? TextManager.param(paramId)
                : `Param ${paramId}`;
            const curVal = (typeof this._actor.param === "function") ? this._actor.param(paramId) : 0;
            const newVal = (this._tempActor && typeof this._tempActor.param === "function") ? this._tempActor.param(paramId) : curVal;
            const diff = newVal - curVal;

            const px = col * colW;
            const py = startY + row * lineHeight;

            // Nom du paramètre
            this.changeTextColor((typeof ColorManager !== "undefined" && typeof ColorManager.systemColor === "function") ? ColorManager.systemColor() : "#b4dcff");
            this.drawText(paramName, px, py, 60, "left");

            // Valeurs : cur → new
            this.changeTextColor("#ffffff");
            this.drawText(String(curVal), px + 62, py, 30, "right");

            this.changeTextColor("rgba(200, 200, 200, 0.7)");
            this.drawText("→", px + 96, py, 16, "center");

            const diffColor = (diff > 0) ? "#22c55e" : (diff < 0 ? "#ef4444" : "#ffffff");
            this.changeTextColor(diffColor);
            const diffSign = diff > 0 ? `+${diff}` : String(diff);
            const displayNew = (diff !== 0) ? `${newVal} (${diffSign})` : String(newVal);
            this.drawText(displayNew, px + 114, py, colW - 118, "left");

            col++;
            if (col >= 2) {
                col = 0;
                row++;
                if (startY + (row + 1) * lineHeight > h - 22) break;
            }
        }

        // 3. Différence de masse (Stock vs Porté) & Capacité de portage
        const curStock = this._currentItem
            ? ((typeof DataManager.itemStockWeight === "function") ? DataManager.itemStockWeight(this._currentItem) : DataManager.itemWeight(this._currentItem))
            : 0;
        const newStock = (typeof DataManager.itemStockWeight === "function")
            ? DataManager.itemStockWeight(this._item)
            : DataManager.itemWeight(this._item);

        const curWorn = this._currentItem
            ? ((typeof DataManager.itemWornWeight === "function") ? DataManager.itemWornWeight(this._currentItem) : 0)
            : 0;
        const newWorn = (typeof DataManager.itemWornWeight === "function")
            ? DataManager.itemWornWeight(this._item)
            : 0;

        const curBonus = this._currentItem
            ? ((typeof DataManager.itemWeightBonus === "function") ? DataManager.itemWeightBonus(this._currentItem) : 0)
            : 0;
        const newBonus = (typeof DataManager.itemWeightBonus === "function")
            ? DataManager.itemWeightBonus(this._item)
            : 0;

        const footerY = h - 22;
        this.contents.fontSize = 12;

        if (newBonus > 0 || curBonus > 0) {
            // Équipement augmentant la capacité de port (sac, harnais, exosquelette)
            this.changeTextColor("rgba(180, 220, 255, 0.8)");
            this.drawText("Capacité port :", 0, footerY, 95, "left");

            this.changeTextColor("#ffffff");
            this.drawText(`${curBonus > 0 ? "+" + curBonus : "0"} →`, 96, footerY, 40, "left");

            this.changeTextColor("#22c55e");
            this.drawText(`+${newBonus} UM`, 138, footerY, 60, "left");

            // Indication du poids en stock
            this.changeTextColor("rgba(200, 200, 200, 0.7)");
            this.drawText(`(Stock: ${newStock} UM)`, 202, footerY, w - 204, "left");
        } else if (newWorn > 0 || curWorn > 0) {
            // Équipement avec poids résiduel corporel
            this.changeTextColor("rgba(180, 220, 255, 0.8)");
            this.drawText("Poids résiduel :", 0, footerY, 95, "left");

            this.changeTextColor("#ffffff");
            this.drawText(`${curWorn} → ${newWorn} UM`, 96, footerY, 80, "left");

            const wornDiff = newWorn - curWorn;
            if (wornDiff !== 0) {
                const wColor = wornDiff < 0 ? "#22c55e" : "#f59e0b";
                const wSign = wornDiff > 0 ? `+${wornDiff}` : `${wornDiff}`;
                this.changeTextColor(wColor);
                this.drawText(`(${wSign} UM)`, 180, footerY, 60, "left");
            }
            this.changeTextColor("rgba(200, 200, 200, 0.7)");
            this.drawText(`(Stock: ${newStock} UM)`, 244, footerY, w - 246, "left");
        } else {
            // Équipement standard dont le poids de stock est annulé une fois porté
            this.changeTextColor("rgba(180, 220, 255, 0.8)");
            this.drawText("Poids en stock :", 0, footerY, 95, "left");

            this.changeTextColor("#ffffff");
            this.drawText(`${curStock} → ${newStock} UM`, 96, footerY, 85, "left");

            this.changeTextColor("#22c55e");
            this.drawText(`(0 UM porté)`, 185, footerY, w - 187, "left");
        }
        this.resetTextColor();
    }

    getSlotName(slotId) {
        if (slotId < 0) return "Inconnu";
        if (typeof $dataSystem !== "undefined" && $dataSystem.equipTypes) {
            const leader = this._actor;
            const slots = (leader && typeof leader.equipSlots === "function") ? leader.equipSlots() : [];
            const etypeId = slots[slotId];
            if (etypeId && $dataSystem.equipTypes[etypeId]) {
                return $dataSystem.equipTypes[etypeId];
            }
        }
        return `Slot ${slotId + 1}`;
    }
}

if (typeof window !== "undefined") {
    window.Window_InventoryCompare = Window_InventoryCompare;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = Window_InventoryCompare;
}
