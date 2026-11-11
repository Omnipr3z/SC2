//=============================================================================
// SC4_Game_ScActor.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v2.0.0] Classe acteur unifiée SimCraft (Game_ScActor) avec composants lazy-load et parsing _meta.
 * @author SimCraft
 * @help
 * ============================================================================
 * Game_ScActor.js (SC4 Niveau 2)
 * ============================================================================
 * Classe acteur souveraine pour SimCraft 4, héritant de Game_Actor.
 * Unifie l'ensemble des acteurs (Héros, PNJ, Factions, Compagnons).
 *
 * Fonctionnalités clés :
 * 1. Parsing unique des notetags à la création dans un dictionnaire `_meta`.
 * 2. Architecture modulaire en 6 sous-composants instanciés en Lazy-Loading pur :
 *    - equipment : Game_ScActorEquipment
 *    - inventory : Game_ScActorInventory
 *    - combat    : Game_ScActorCombat
 *    - social    : Game_ScActorSocial
 *    - location  : Game_ScActorLocation
 *    - character : Game_ScActorCharacter
 * 3. Absorption intégrale des logiques de Game_Hero (Paperdoll, composite cache).
 * 4. Support natif des factions comme entités institutionnelles (<faction>).
 * ============================================================================
 */

class Game_ScActor extends Game_Actor {
    /**
     * Initialise l'acteur avec son identifiant et ses métadonnées.
     * @param {number} actorId 
     */
    setup(actorId) {
        super.setup(actorId);
        this.initMeta();
        this.initScComponents();

        // Enregistrement automatique au Hub Hero si c'est un héros
        if (this.isHero() && typeof window !== "undefined" && window.$heroHub) {
            window.$heroHub.register(actorId, this);
        }
    }

    // ========================================================================
    // 1. PARSING UNIQUE DES NOTETAGS (_meta)
    // ========================================================================

    /**
     * Extrait les notetags de la base de données une seule fois lors de la création.
     */
    initMeta() {
        this._meta = {};
        const actorData = (typeof this.actor === "function") ? this.actor() : ($dataActors ? $dataActors[this._actorId] : null);
        if (!actorData || !actorData.note) return;

        // 1. Extraire les paires <Key: Value>
        const pairRegex = /<([^:>]+):\s*([^>]+)>/g;
        let match;
        while ((match = pairRegex.exec(actorData.note)) !== null) {
            const key = match[1].trim().toLowerCase();
            const value = match[2].trim();
            this._meta[key] = value;
        }

        // 2. Extraire les drapeaux simples <Flag> (ex: <Hero>, <Face>, <Faction>)
        const flagRegex = /<([a-zA-Z0-9_]+)>/g;
        while ((match = flagRegex.exec(actorData.note)) !== null) {
            const flag = match[1].trim().toLowerCase();
            if (this._meta[flag] === undefined) {
                this._meta[flag] = true;
            }
        }
    }

    /**
     * Accède à une métadonnée typée de l'acteur sans regex runtime.
     * @param {string} key Nom de la clé (insensible à la casse)
     * @param {*} [defaultValue=null]
     * @returns {*}
     */
    meta(key, defaultValue = null) {
        if (!this._meta) this.initMeta();
        const k = String(key).trim().toLowerCase();
        return this._meta[k] !== undefined ? this._meta[k] : defaultValue;
    }

    /**
     * Vérifie la présence d'un drapeau booléen dans les métadonnées.
     * @param {string} flag Nom du drapeau
     * @returns {boolean}
     */
    hasMeta(flag) {
        if (!this._meta) this.initMeta();
        const k = String(flag).trim().toLowerCase();
        return Boolean(this._meta[k]);
    }

    /**
     * Définit ou modifie dynamiquement une métadonnée en cours de jeu.
     * @param {string} key 
     * @param {*} value 
     */
    setMeta(key, value) {
        if (!this._meta) this.initMeta();
        const k = String(key).trim().toLowerCase();
        this._meta[k] = value;
    }

    /** Rétrocompatibilité : parseNotetag délègue directement à meta */
    parseNotetag(key, defaultValue = null) {
        return this.meta(key, defaultValue);
    }

    /** Rétrocompatibilité : hasNotetag délègue directement à hasMeta */
    hasNotetag(flag) {
        return this.hasMeta(flag);
    }

    // ========================================================================
    // 2. LAZY LOADING DES SOUS-COMPOSANTS (Composants à la demande)
    // ========================================================================

    /**
     * Initialise les pointeurs des sous-composants à null (non-énumérables pour JsonEx).
     * Aucun objet lourd n'est instancié tant qu'il n'est pas expressément sollicité.
     */
    initScComponents() {
        Object.defineProperties(this, {
            _equipment: { value: null, writable: true, configurable: true, enumerable: false },
            _inventory: { value: null, writable: true, configurable: true, enumerable: false },
            _combat:    { value: null, writable: true, configurable: true, enumerable: false },
            _social:    { value: null, writable: true, configurable: true, enumerable: false },
            _subCom:    { value: null, writable: true, configurable: true, enumerable: false },
            _location:  { value: null, writable: true, configurable: true, enumerable: false },
            _character: { value: null, writable: true, configurable: true, enumerable: false },
        });
    }

    /** @returns {Game_ScActorEquipment} */
    get equipment() {
        if (!this._equipment && typeof Game_ScActorEquipment !== "undefined") {
            this._equipment = new Game_ScActorEquipment(this);
        } else if (this._equipment && typeof this._equipment.setActor === "function" && this._equipment.actor() !== this) {
            this._equipment.setActor(this);
        }
        return this._equipment;
    }

    /** @returns {Game_ScActorInventory} */
    get inventory() {
        if (!this._inventory && typeof Game_ScActorInventory !== "undefined") {
            this._inventory = new Game_ScActorInventory(this);
        } else if (this._inventory && typeof this._inventory.setActor === "function" && this._inventory.actor() !== this) {
            this._inventory.setActor(this);
        }
        return this._inventory;
    }

    /** @returns {Game_ScActorCombat} */
    get combat() {
        if (!this._combat && typeof Game_ScActorCombat !== "undefined") {
            this._combat = new Game_ScActorCombat(this);
        } else if (this._combat && typeof this._combat.setActor === "function" && this._combat.actor() !== this) {
            this._combat.setActor(this);
        }
        return this._combat;
    }

    /** @returns {Game_ScActorSocial} */
    get social() {
        if (!this._social && typeof Game_ScActorSocial !== "undefined") {
            this._social = new Game_ScActorSocial(this);
        } else if (this._social && typeof this._social.setActor === "function" && this._social.actor() !== this) {
            this._social.setActor(this);
        }
        return this._social;
    }

    /** @returns {Game_ScActorSubCom} */
    get subCom() {
        if (!this._subCom && typeof Game_ScActorSubCom !== "undefined") {
            this._subCom = new Game_ScActorSubCom(this);
        } else if (this._subCom && typeof this._subCom.setActor === "function" && this._subCom.actor() !== this) {
            this._subCom.setActor(this);
        }
        return this._subCom;
    }

    /** @returns {Game_ScActorLocation} */
    get location() {
        if (!this._location && typeof Game_ScActorLocation !== "undefined") {
            this._location = new Game_ScActorLocation(this);
        } else if (this._location && typeof this._location.setActor === "function" && this._location.actor() !== this) {
            this._location.setActor(this);
        }
        return this._location;
    }

    /** @returns {Game_ScActorCharacter} */
    get character() {
        if (!this._character && typeof Game_ScActorCharacter !== "undefined") {
            this._character = new Game_ScActorCharacter(this);
        } else if (this._character && typeof this._character.setActor === "function" && this._character.actor() !== this) {
            this._character.setActor(this);
        }
        return this._character;
    }

    // Méthodes de vérification de présence SANS déclencher l'instanciation
    hasEquipment() { return Boolean(this._equipment); }
    hasInventory() { return Boolean(this._inventory); }
    hasCombat() { return Boolean(this._combat); }
    hasSocial() { return Boolean(this._social); }
    hasSubCom() { return Boolean(this._subCom); }
    hasLocation() { return Boolean(this._location); }
    hasCharacter() { return Boolean(this._character); }

    // ========================================================================
    // SÉRIALISATION WHITELISTÉE SANS CYCLE (makeSavefileData / loadSavefileData)
    // ========================================================================

    /**
     * Extrait uniquement les données dynamiques et les états de ses sous-composants.
     * @returns {object}
     */
    makeSavefileData() {
        const data = {
            actorId: this._actorId,
            meta: this._meta || {}
        };
        if (this._equipment && typeof this._equipment.makeSavefileData === "function") {
            data.equipment = this._equipment.makeSavefileData();
        }
        if (this._inventory && typeof this._inventory.makeSavefileData === "function") {
            data.inventory = this._inventory.makeSavefileData();
        }
        if (this._combat && typeof this._combat.makeSavefileData === "function") {
            data.combat = this._combat.makeSavefileData();
        }
        if (this._social && typeof this._social.makeSavefileData === "function") {
            data.social = this._social.makeSavefileData();
        }
        if (this._subCom && typeof this._subCom.makeSavefileData === "function") {
            data.subCom = this._subCom.makeSavefileData();
        }
        if (this._location && typeof this._location.makeSavefileData === "function") {
            data.location = this._location.makeSavefileData();
        }
        if (this._character && typeof this._character.makeSavefileData === "function") {
            data.character = this._character.makeSavefileData();
        }
        return data;
    }

    /**
     * Restaure les états dynamiques de l'acteur et réhydrate ses sous-composants.
     * @param {object} data 
     */
    loadSavefileData(data) {
        if (!data || typeof data !== "object") return;
        if (data.meta) {
            this._meta = Object.assign(this._meta || {}, data.meta);
        }
        if (data.equipment && this.equipment && typeof this.equipment.loadSavefileData === "function") {
            this.equipment.loadSavefileData(data.equipment);
        }
        if (data.inventory && this.inventory && typeof this.inventory.loadSavefileData === "function") {
            this.inventory.loadSavefileData(data.inventory);
        }
        if (data.combat && this.combat && typeof this.combat.loadSavefileData === "function") {
            this.combat.loadSavefileData(data.combat);
        }
        if (data.social && this.social && typeof this.social.loadSavefileData === "function") {
            this.social.loadSavefileData(data.social);
        }
        if (data.subCom && this.subCom && typeof this.subCom.loadSavefileData === "function") {
            this.subCom.loadSavefileData(data.subCom);
        }
        if (data.location && this.location && typeof this.location.loadSavefileData === "function") {
            this.location.loadSavefileData(data.location);
        }
        if (data.character && this.character && typeof this.character.loadSavefileData === "function") {
            this.character.loadSavefileData(data.character);
        }
    }

    // ========================================================================
    // 3. IDENTITÉ, NATURE & RÔLES
    // ========================================================================

    /**
     * Indique si cet acteur est un héros Paperdoll jouable (<Hero>).
     * @returns {boolean}
     */
    isHero() {
        return this.hasMeta("hero");
    }

    /**
     * Indique si cet acteur représente une Faction (<Faction>).
     * @returns {boolean}
     */
    isFaction() {
        return this.hasMeta("faction");
    }

    /**
     * Race biologique ou technologique de l'acteur (<Race: Human>).
     * @returns {string}
     */
    race() {
        return this.meta("race", "Human");
    }

    /**
     * Sexe biologique (<Sex: Male>).
     * @returns {string}
     */
    sex() {
        return this.meta("sex", "Male");
    }

    /**
     * Indique si l'acteur utilise un visage composite (<Face>).
     * @returns {boolean}
     */
    hasFace() {
        return this.hasMeta("face");
    }

    // ========================================================================
    // 4. SURCHARGES ES6 DES MÉTHODES VANILLA RMMZ
    // (Uniquement les méthodes appelées nativement par le cœur de RMMZ)
    // ========================================================================

    /**
     * Délégué à Game_ScActorCombat pour déterminer la compétence d'attaque de base.
     */
    attackSkillId() {
        return this.combat ? this.combat.attackSkillId() : super.attackSkillId();
    }

    name() {
        const baseName = super.name();
        return (typeof SC4_Localization !== "undefined" && SC4_Localization && typeof SC4_Localization.parse === "function")
            ? SC4_Localization.parse(baseName)
            : baseName;
    }

    nickname() {
        const baseNick = super.nickname();
        return (typeof SC4_Localization !== "undefined" && SC4_Localization && typeof SC4_Localization.parse === "function")
            ? SC4_Localization.parse(baseNick)
            : baseNick;
    }

    profile() {
        const baseProfile = super.profile();
        return (typeof SC4_Localization !== "undefined" && SC4_Localization && typeof SC4_Localization.parse === "function")
            ? SC4_Localization.parse(baseProfile)
            : baseProfile;
    }
}

if (typeof window !== "undefined") {
    window.Game_ScActor = Game_ScActor;
    // Rétrocompatibilité totale : Game_Hero est désormais un alias de Game_ScActor unifié
    window.Game_Hero = Game_ScActor;
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = Game_ScActor;
}
