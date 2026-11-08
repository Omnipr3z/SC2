//=============================================================================
// RPG Maker MZ - SC4Space_Game_GalacticRepoBase
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Classe de base unifiée pour la hiérarchie spatiale SimCraft.
 * @author SimCraft
 * 
 * @help SC4Space_Game_GalacticRepoBase.js
 * 
 * Modèle de base pour l'architecture hiérarchique spatiale SimCraft 4 :
 * Galaxy -> Sectors -> Planetary Systems -> Planets -> POIs.
 * 
 * Triple fonction des GalacticRepos :
 * 1. Modèle d'objet (données métier, attributs déclaratifs JSON, état dynamique).
 * 2. Instanciation & intégration en cascade de ses sous-objets.
 * 3. Hub bidirectionnel (navigation descendante vers les enfants et ascendante vers les parents).
 */

class Game_GalacticRepoBase {
    get selfDataName() {
        const selfName = this.constructor.name;
        if (selfName.includes("Game_")) {
            return selfName.replace("Game_", "$data");
        }
        return `$data${selfName}`;
    }

    get id() { return this._id !== null && this._id !== undefined ? this._id : (this._data ? this._data.id : "NO_ID"); }
    get name() { return this._name || (this._data && this._data.name) || "NO_NAME"; }
    get description() { return this._description || (this._data && this._data.description) || ""; }
    get data() { return this._data; }
    get parentId() { return this._parentId; }
    get hasSubObjects() { return this._hasSubObjects; }
    get subObjects() { return this._subObjects; }

    constructor(data = null, parentId = null) {
        this.initMembers();
        this.setup(data, parentId);
    }

    // ========================================================================
    // 1. INITIALISATION & CONFIGURATION
    // ========================================================================

    initMembers() {
        // Attributs de base
        this._parentId = null;
        this._data = {};
        this._savedDataKeys = [];

        // Attributs de cascade des sous-objets
        this._hasSubObjects = false;
        this._subObjectsClassName = null;
        this._subObjectsDatabaseSourceName = null;
        this._subObjectsIdsKey = "";
        this._subObjects = [];

        // Données d'identité communes
        this._id = null;
        this._name = "";
        this._description = "";
    }

    setupData(data) {
        const selfName = this.constructor.name;
        if (!data) {
            const dataSrc = typeof window !== "undefined" ? window[this.selfDataName] : (typeof global !== "undefined" ? global[this.selfDataName] : null);
            if (dataSrc) {
                if (Array.isArray(dataSrc)) {
                    const first = dataSrc.find(o => o && o.id !== undefined) || dataSrc[1];
                    if (first) {
                        this._data = first;
                        return true;
                    }
                } else if (typeof dataSrc === "object") {
                    this._data = dataSrc;
                    return true;
                }
            }
            if (typeof DEBUGTOOL !== "undefined") {
                DEBUGTOOL.error(`No default data found in ${this.selfDataName} for ${selfName} constructor`);
            }
            this.errorReturn(selfName, "NO_ID", data);
            return false;
        } else {
            this._data = data;
            return true;
        }
    }

    setup(data, parentId = null) {
        this._parentId = parentId || null;

        if (!this.setupData(data)) return null;
        if (this.throwsGlobalError(this._data, parentId)) return null;

        this._id = this._data.id !== undefined ? this._data.id : "NO_ID";
        this._name = this._data.name || "";
        this._description = this._data.description || "";

        // Chargement en cascade des sous-objets
        if (this._hasSubObjects) {
            this.initSubObjects();
        }
        return this;
    }

    getDatasource() {
        const dataSrcName = this._subObjectsDatabaseSourceName;
        let ds = typeof window !== "undefined" ? window[dataSrcName] : (typeof global !== "undefined" ? global[dataSrcName] : null);
        if (!ds && this._data && Array.isArray(this._data.systems)) {
            ds = this._data.systems;
        }
        return ds;
    }

    initSubObjects() {
        this._subObjects = [];
        const selfName = this.constructor.name;
        const idsKey = this._subObjectsIdsKey;
        let dataIds = this._data[idsKey];

        if (!Array.isArray(dataIds) && Array.isArray(this._data.systems)) {
            dataIds = this._data.systems.map(s => (s && s.id !== undefined ? s.id : s));
            this._data[idsKey] = dataIds;
        }

        if (!Array.isArray(dataIds)) {
            if (typeof DEBUGTOOL !== "undefined") {
                DEBUGTOOL.error(`Ids key "${idsKey}" is not an array in ${selfName} id:${this._id}`);
            }
            return;
        }

        const datasource = this.getDatasource();
        const SubClass = this.resolveSubObjectClass();
        if (!SubClass) {
            if (typeof DEBUGTOOL !== "undefined") {
                DEBUGTOOL.error(`Constructor class "${this._subObjectsClassName}" not found for ${selfName} id:${this._id}`);
            }
            return;
        }

        dataIds.forEach(id => {
            const instanceData = Array.isArray(datasource)
                ? datasource.find(o => o && (o.id === id || String(o.id) === String(id)))
                : (datasource ? datasource[id] : null);

            if (this.throwsSubObjectError(id, instanceData)) return;

            try {
                const childInstance = new SubClass(instanceData, this._id);
                this._subObjects.push(childInstance);
            } catch (e) {
                if (typeof DEBUGTOOL !== "undefined") {
                    DEBUGTOOL.error(`Exception while instantiating ${this._subObjectsClassName} id:${id} in ${selfName} id:${this._id}: ${e.message}`);
                }
            }
        });
    }

    resolveSubObjectClass() {
        if (typeof this._subObjectsClassName === "function") {
            return this._subObjectsClassName;
        }
        if (typeof window !== "undefined" && window[this._subObjectsClassName]) {
            return window[this._subObjectsClassName];
        }
        if (typeof global !== "undefined" && global[this._subObjectsClassName]) {
            return global[this._subObjectsClassName];
        }
        return null;
    }

    // ========================================================================
    // 2. HUB DE NAVIGATION VERS LES ANCESTRES (PARENTS)
    // ========================================================================

    get galaxy() {
        if (typeof window !== "undefined" && window.$gameGalaxy) return window.$gameGalaxy;
        if (typeof global !== "undefined" && global.$gameGalaxy) return global.$gameGalaxy;
        return null;
    }

    get parent() {
        if (this._parentId === null || this._parentId === undefined) return null;
        const gal = this.galaxy;
        if (!gal) return null;

        // Si this est un Secteur : parent est Galaxy
        if (this.constructor.name === "Game_Sector") return gal;
        // Si this est un Système : parent est son Secteur
        if (this.constructor.name === "Game_PlanetarySystem") {
            return typeof gal.getSector === "function" ? gal.getSector(this._parentId) : null;
        }
        // Si this est une Planète : parent est son Système
        if (this.constructor.name === "Game_Planet") {
            return typeof gal.getSystem === "function" ? gal.getSystem(this._parentId) : null;
        }
        // Si this est un POI : parent est sa Planète
        if (this.constructor.name === "Game_POI") {
            return gal.getPlanet ? gal.getPlanet(this._parentId) : null;
        }
        return null;
    }

    // --- ACCÈS CENTRALISÉ À LA LOCALISATION COURANTE DU JOUEUR (VIA GALAXY / ACTEUR) ---
    currentSectorId() { return this.galaxy ? this.galaxy.currentSectorId() : 1; }
    currentSector() { return this.galaxy ? this.galaxy.currentSector() : null; }
    currentSystemId() { return this.galaxy ? this.galaxy.currentSystemId() : 1; }
    currentSystem() { return this.galaxy ? this.galaxy.currentSystem() : null; }
    currentPlanetId() { return this.galaxy ? this.galaxy.currentPlanetId() : null; }
    currentPlanet() { return this.galaxy ? this.galaxy.currentPlanet() : null; }
    currentPOIId() { return this.galaxy ? this.galaxy.currentPOIId() : null; }
    currentPOI() { return this.galaxy ? this.galaxy.currentPOI() : null; }

    // ========================================================================
    // 3. HUB DE NAVIGATION VERS LES SOUS-OBJETS (ENFANTS)
    // ========================================================================

    getSubObjects() {
        if (this.throwsSubObjectGetterError()) return [];
        return this._subObjects;
    }

    getSubObject(id) {
        if (this.throwsSubObjectGetterError(id)) return null;
        return this._subObjects.find(sub => sub && (sub.id === id || String(sub.id) === String(id))) || null;
    }

    hasSubObject(id) {
        return Boolean(this.getSubObject(id));
    }

    // ========================================================================
    // 4. VÉRIFICATIONS D'INTÉGRITÉ & ASSERTIONS FAIL-FAST (DEBUGTOOL)
    // ========================================================================

    throwsSubObjectGetterError(id = null) {
        const selfName = this.constructor.name;
        const selfId = this._id;

        if (!this._hasSubObjects) {
            if (typeof DEBUGTOOL !== "undefined") {
                DEBUGTOOL.error(`No "hasSubObjects" enabled in ${selfName} id:${selfId}`);
            }
            return this.errorReturn(selfName, selfId, this);
        }

        const dataIds = (this._data && this._data[this._subObjectsIdsKey]) || [];

        if (this._subObjects.length === 0) {
            if (dataIds.length > 0) {
                if (typeof DEBUGTOOL !== "undefined") {
                    DEBUGTOOL.warn(`SubObjects declared in data (${dataIds.length}) but none instantiated in ${selfName} id:${selfId}`);
                }
            }
            return id !== null && id !== undefined;
        }

        if (id !== null && id !== undefined) {
            const isIdInIds = dataIds.includes(id) || dataIds.some(i => String(i) === String(id));
            const childExists = this._subObjects.some(s => s && (s.id === id || String(s.id) === String(id)));

            if (!isIdInIds || !childExists) {
                if (typeof DEBUGTOOL !== "undefined") {
                    DEBUGTOOL.error(`SubObject id:${id} (${this._subObjectsClassName}) not found in ${selfName} id:${selfId}`);
                }
                return this.errorReturn(selfName, selfId, { searchedId: id, availableIds: dataIds });
            }
        }
        return false;
    }

    throwsGlobalError(data, parentId = null) {
        const selfName = this.constructor.name;
        const selfId = data ? data.id : "NO_ID";

        if (!data) {
            if (typeof DEBUGTOOL !== "undefined") {
                DEBUGTOOL.error(`No "data" provided to ${selfName} constructor (parentId:${parentId})`);
            }
            return this.errorReturn(selfName, selfId, data);
        }

        if (data.id === undefined || data.id === null) {
            if (typeof DEBUGTOOL !== "undefined") {
                DEBUGTOOL.error(`Missing mandatory "id" property in data for ${selfName}`);
            }
            return this.errorReturn(selfName, selfId, data);
        }

        if (this._hasSubObjects) {
            const idsKeyName = this._subObjectsIdsKey;
            if (!idsKeyName) {
                if (typeof DEBUGTOOL !== "undefined") {
                    DEBUGTOOL.error(`Key to list subObjects ids not defined in ${selfName} id:${selfId}`);
                }
                return this.errorReturn(selfName, selfId, data);
            }
            if (!this._subObjectsClassName) {
                if (typeof DEBUGTOOL !== "undefined") {
                    DEBUGTOOL.error(`Class name for subObjects not defined in ${selfName} id:${selfId}`);
                }
                return this.errorReturn(selfName, selfId, data);
            }
            if (!this._subObjectsDatabaseSourceName) {
                if (typeof DEBUGTOOL !== "undefined") {
                    DEBUGTOOL.error(`Database source name for subObjects not defined in ${selfName} id:${selfId}`);
                }
                return this.errorReturn(selfName, selfId, data);
            }

            let subObjectIdsList = data[idsKeyName];
            if (!Array.isArray(subObjectIdsList) && Array.isArray(data.systems)) {
                data[idsKeyName] = data.systems.map(s => (s && s.id !== undefined ? s.id : s));
                subObjectIdsList = data[idsKeyName];
            }
            if (!Array.isArray(subObjectIdsList)) {
                if (typeof DEBUGTOOL !== "undefined") {
                    DEBUGTOOL.error(`Property "${idsKeyName}" is not an Array in data provided for ${selfName} id:${selfId}`);
                }
                return this.errorReturn(selfName, selfId, data);
            }
            const dataSrc = this.getDatasource();
            if (!dataSrc) {
                if (typeof DEBUGTOOL !== "undefined") {
                    DEBUGTOOL.error(`Datasource "${this._subObjectsDatabaseSourceName}" not loaded in environment for ${selfName} id:${selfId}`);
                }
                return this.errorReturn(selfName, selfId, data);
            }
        }
        return false;
    }

    throwsSubObjectError(id, data) {
        if (!data) {
            const dataName = this._subObjectsDatabaseSourceName;
            const className = this._subObjectsClassName;
            const selfId = this._id;
            const selfName = this.constructor.name;

            if (typeof DEBUGTOOL !== "undefined") {
                DEBUGTOOL.error(`No entry with id:${id} in datasource "${dataName}" to create new ${className} in ${selfName} id:${selfId}`);
            }
            return true;
        }
        return false;
    }

    errorReturn(selfName, selfId, payload) {
        if (typeof DEBUGTOOL !== "undefined") {
            DEBUGTOOL.warn(`[FAIL-FAST] Error on ${selfName} id:${selfId}`, payload);
        }
        return true;
    }

    // ========================================================================
    // 5. SÉRIALISATION & PERSISTANCE
    // ========================================================================

    makeSavefileData() {
        let baseData = {
            id: this.id,
            name: this.name,
            description: this.description
        };

        if (Array.isArray(this._savedDataKeys)) {
            this._savedDataKeys.forEach(key => {
                if (this[key] !== undefined) {
                    baseData[key] = this[key];
                } else if (this._data && this._data[key] !== undefined) {
                    baseData[key] = this._data[key];
                }
            });
        }

        if (this._hasSubObjects && Array.isArray(this._subObjects)) {
            baseData.subObjects = this._subObjects.map(sub => sub.makeSavefileData());
        }

        return baseData;
    }

    loadSavefileData(data) {
        if (!data || typeof data !== "object") return;

        if (Array.isArray(this._savedDataKeys)) {
            this._savedDataKeys.forEach(key => {
                if (data[key] !== undefined) {
                    this[key] = data[key];
                }
            });
        }

        if (this._hasSubObjects && Array.isArray(data.subObjects)) {
            data.subObjects.forEach(subObjectData => {
                if (!subObjectData || subObjectData.id === undefined) return;
                const subObject = this.getSubObject(subObjectData.id);
                if (subObject) {
                    subObject.loadSavefileData(subObjectData);
                } else {
                    if (typeof DEBUGTOOL !== "undefined") {
                        DEBUGTOOL.warn(`SubObject id:${subObjectData.id} not found in ${this.constructor.name} id:${this.id} during save load.`);
                    }
                }
            });
        }
    }
}

window.Game_GalacticRepoBase = Game_GalacticRepoBase;
if (typeof module !== "undefined" && module.exports) {
    module.exports = Game_GalacticRepoBase;
}
