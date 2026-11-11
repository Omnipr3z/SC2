//=============================================================================
// SC4_Game_ScActorSubCom.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Sous-composant SubCom (carnet de contacts & disponibilité) pour Game_ScActor.
 * @author SimCraft
 * @help
 * ============================================================================
 * Game_ScActorSubCom.js
 * ============================================================================
 * Composant délégué gérant le profil de communication SubCom d'un acteur :
 * - Carnet d'identifiants de contacts connus (`_contacts`, 0 contact par défaut).
 * - Disponibilité aux appels SubCom (`_availableForCall` / `availableForSubComCall()`).
 * - Filtrage automatique : acteurs décédés, membres de l'équipe ou présents
 *   sur la carte courante ne peuvent pas être appelés à distance via SubCom.
 * ============================================================================
 */

const _scActorSubComMap = new WeakMap();

class Game_ScActorSubCom {
    /**
     * @param {Game_ScActor} actor Acteur parent
     */
    constructor(actor) {
        this.setActor(actor);
        this._contacts = [];
        this._availableForCall = true;
    }

    /**
     * Définit ou ré-associe l'acteur parent sans créer de référence circulaire énumérable.
     * @param {Game_ScActor|number} actor
     */
    setActor(actor) {
        this._actorId = (typeof actor === "number")
            ? actor
            : (actor && typeof actor.actorId === "function" ? actor.actorId() : 0);
        if (actor && typeof actor === "object") {
            _scActorSubComMap.set(this, actor);
        }
    }

    /**
     * @returns {Game_ScActor|null} Acteur parent
     */
    actor() {
        const mapped = _scActorSubComMap.get(this);
        if (mapped) return mapped;
        if (this._actorId && typeof $gameActors !== "undefined" && $gameActors && typeof $gameActors.actor === "function") {
            return $gameActors.actor(this._actorId);
        }
        return null;
    }

    /**
     * @returns {number}
     */
    actorId() {
        if (this._actorId) return this._actorId;
        const a = this.actor();
        return (a && typeof a.actorId === "function") ? a.actorId() : 0;
    }

    /**
     * Vérifie si l'acteur donné (ou cet acteur par défaut) est décédé.
     * @param {number} [targetActorId]
     * @returns {boolean}
     */
    isActorDead(targetActorId = null) {
        const id = (targetActorId !== null && targetActorId !== undefined) ? Number(targetActorId) : this.actorId();
        if (!id || id <= 0) return false;
        const target = (id === this.actorId())
            ? this.actor()
            : ((typeof $gameActors !== "undefined" && $gameActors && typeof $gameActors.actor === "function")
                ? $gameActors.actor(id)
                : null);
        return Boolean(target && typeof target.isDead === "function" && target.isDead());
    }

    /**
     * Purge automatiquement les contacts décédés du registre.
     * @returns {number} Nombre d'entrées retirées
     */
    pruneDeadContacts() {
        if (!Array.isArray(this._contacts) || this._contacts.length === 0) return 0;
        const before = this._contacts.length;
        const myId = this.actorId();
        this._contacts = this._contacts.filter(id => id > 0 && id !== myId && !this.isActorDead(id));
        return before - this._contacts.length;
    }

    /**
     * Liste des IDs d'acteurs enregistrés dans les contacts de cet acteur.
     * Purge automatiquement les contacts décédés à la lecture.
     * @returns {number[]}
     */
    contacts() {
        this.pruneDeadContacts();
        return this._contacts.slice();
    }

    /**
     * Vérifie si un acteur est déjà présent dans les contacts SubCom.
     * @param {number} targetActorId
     * @returns {boolean}
     */
    hasContact(targetActorId) {
        const id = Number(targetActorId) || 0;
        if (id <= 0 || id === this.actorId()) return false;
        return this._contacts.includes(id) && !this.isActorDead(id);
    }

    /**
     * Ajoute un contact au carnet SubCom de cet acteur.
     * Refuse les IDs invalides, l'auto-référence et les acteurs décédés.
     * @param {number} targetActorId
     * @returns {boolean}
     */
    addContact(targetActorId) {
        const id = Number(targetActorId) || 0;
        const myId = this.actorId();
        if (id <= 0 || id === myId) return false;
        if (this.isActorDead(id)) return false;
        if (!this._contacts.includes(id)) {
            this._contacts.push(id);
            return true;
        }
        return false;
    }

    /**
     * Retire un contact du carnet SubCom.
     * @param {number} targetActorId
     * @returns {boolean}
     */
    removeContact(targetActorId) {
        const id = Number(targetActorId) || 0;
        const idx = this._contacts.indexOf(id);
        if (idx >= 0) {
            this._contacts.splice(idx, 1);
            return true;
        }
        return false;
    }

    /**
     * Indique si cet acteur est techniquement joignable par SubCom (true par défaut).
     * @returns {boolean}
     */
    availableForSubComCall() {
        return Boolean(this._availableForCall);
    }

    isAvailableForCall() {
        return this.availableForSubComCall();
    }

    get availableForCall() {
        return Boolean(this._availableForCall);
    }

    set availableForCall(val) {
        this._availableForCall = Boolean(val);
    }

    /**
     * Définit la disponibilité de cet acteur pour les appels SubCom.
     * @param {boolean} available
     * @returns {boolean}
     */
    setAvailableForSubComCall(available) {
        this._availableForCall = Boolean(available);
        return this._availableForCall;
    }

    /**
     * Détermine si cet acteur est physiquement aux côtés du joueur (équipe ou carte courante).
     * Un acteur présent dans la party ou incarné sur la carte ne peut pas être joint par radio.
     * @returns {boolean}
     */
    isPresentNearPlayer() {
        const id = this.actorId();
        if (!id || id <= 0) return false;

        // 1. Présent dans l'équipe (leader, followers, réserve)
        if (typeof $gameParty !== "undefined" && $gameParty) {
            const members = typeof $gameParty.allMembers === "function"
                ? $gameParty.allMembers()
                : (typeof $gameParty.members === "function" ? $gameParty.members() : []);
            if (Array.isArray(members) && members.some(m => m && typeof m.actorId === "function" && m.actorId() === id)) {
                return true;
            }
        }

        // 2. Incarné physiquement sur la carte active via $heroHub
        if (typeof $heroHub !== "undefined" && $heroHub && typeof $heroHub.findActorCharacter === "function") {
            if ($heroHub.findActorCharacter(id)) {
                return true;
            }
        } else if (typeof $gameMap !== "undefined" && $gameMap && typeof $gameMap.events === "function") {
            for (const ev of $gameMap.events()) {
                if (ev && typeof ev.actorId === "function" && ev.actorId() === id) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Indique si le joueur peut actuellement passer un appel sortant vers cet acteur.
     * @returns {boolean}
     */
    canBeCalledByPlayer() {
        if (this.isActorDead()) return false;
        if (!this.availableForSubComCall()) return false;
        if (this.isPresentNearPlayer()) return false;
        return true;
    }

    /**
     * Sérialisation whitelistée (déléguée depuis Game_ScActor).
     * @returns {object}
     */
    makeSavefileData() {
        this.pruneDeadContacts();
        return {
            contacts: this._contacts.slice(),
            availableForCall: Boolean(this._availableForCall)
        };
    }

    /**
     * Désérialisation ciblée des données SubCom.
     * @param {object} data
     */
    loadSavefileData(data) {
        if (!data || typeof data !== "object") return;
        const myId = this.actorId();
        if (Array.isArray(data.contacts)) {
            this._contacts = [...new Set(data.contacts.map(Number).filter(id => id > 0 && id !== myId))];
        }
        if (data.availableForCall !== undefined) {
            this._availableForCall = Boolean(data.availableForCall);
        }
    }
}

if (typeof window !== "undefined") {
    window.Game_ScActorSubCom = Game_ScActorSubCom;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = Game_ScActorSubCom;
}

