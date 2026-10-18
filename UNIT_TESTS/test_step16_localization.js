//=============================================================================
// test_step16_localization.js
// Tests unitaires pour l'Étape 16 : Système de localisation multi-langue (\L[KEY])
//=============================================================================

const fs = require('fs');
const path = require('path');

// Configuration de l'environnement global simulé
global.window = global;

global.Graphics = { width: 1280, height: 720, boxWidth: 1280, boxHeight: 720 };
global.Rectangle = class Rectangle {
    constructor(x, y, width, height) {
        this.x = x || 0;
        this.y = y || 0;
        this.width = width || 0;
        this.height = height || 0;
    }
};

global.ConfigManager = {
    locale: "FR",
    makeData: function() {
        return { locale: this.locale };
    },
    applyData: function(config) {
        this.locale = (config && config.locale) ? String(config.locale).toUpperCase() : "FR";
    },
    save: function() {}
};

global.Game_System = class Game_System {
    constructor() {
        this._locale = "FR";
    }
};
global.$gameSystem = new global.Game_System();

global.Window_Base = class Window_Base {
    convertEscapeCharacters(text) {
        text = text.replace(/\\/g, "\x1b");
        text = text.replace(/\x1b\x1b/g, "\\");
        text = text.replace(/\x1bV\[(\d+)\]/gi, (_, n) => `VAL_${n}`);
        return text;
    }
};

global.Window_Selectable = class Window_Selectable extends global.Window_Base {
    constructor() {
        super();
        this._index = 0;
    }
    index() { return this._index; }
    select(i) { this._index = i; }
    refresh() {}
};

global.Window_Command = class Window_Command extends global.Window_Selectable {
    constructor() {
        super();
        this._list = [];
        this.makeCommandList();
    }
    clearCommandList() { this._list = []; }
    makeCommandList() {}
    addCommand(name, symbol, enabled = true, ext = null) {
        this._list.push({ name, symbol, enabled, ext });
    }
    commandName(index) { return this._list[index] ? this._list[index].name : ""; }
    commandSymbol(index) { return this._list[index] ? this._list[index].symbol : ""; }
    refresh() {
        this.clearCommandList();
        this.makeCommandList();
    }
};

global.Window_Options = class Window_Options extends global.Window_Command {
    makeCommandList() {
        this.addGeneralOptions();
    }
    addGeneralOptions() {}
    statusText(index) { return ""; }
    processOk() {}
    cursorRight() {}
    cursorLeft() {}
};

global.TextManager = {
    basic: function(id) { return `Basic_${id}`; },
    param: function(id) { return `Param_${id}`; },
    command: function(id) {
        if (id === 18) return "\\L[newgame]";
        return `Cmd_${id}`;
    },
    message: function(id) { return `Msg_${id}`; },
    get newGame() { return this.command(18); }
};

global.SoundManager = {
    playCursor: () => {},
    playOk: () => {}
};

global.$dataSystem = {
    terms: {
        basic: [],
        params: [],
        commands: { 18: "\\L[newgame]" },
        messages: {}
    }
};

// Chargement du plugin de localisation
const ROOT_DIR = path.resolve(__dirname, '..');
const localizationCode = fs.readFileSync(path.join(ROOT_DIR, 'js/plugins/SC4_Localization.js'), 'utf8');
eval(localizationCode);

console.log("==============================================================");
console.log("--- TEST ÉTAPE 16 : SYSTÈME DE LOCALISATION MULTI-LANGUE ---");
console.log("==============================================================");

// 1. Test du chargement des fichiers de localisation
if (!SC4_Localization.isLoaded()) {
    console.error("❌ Les dictionnaires FR et EN auraient dû être chargés.");
    process.exit(1);
}
console.log("✅ 1. Chargement synchrone des dictionnaires Localisation_FR.json et Localisation_EN.json : OK");

// 2. Test de récupération des textes via getText()
SC4_Localization.setLocale("FR");
if (SC4_Localization.getText("newgame") !== "Débuter") {
    console.error(`❌ getText("newgame") attendu 'Débuter' en FR, obtenu: ${SC4_Localization.getText("newgame")}`);
    process.exit(1);
}
if (SC4_Localization.getText("title.newGame") !== "Débuter") {
    console.error(`❌ getText("title.newGame") attendu 'Débuter' en FR, obtenu: ${SC4_Localization.getText("title.newGame")}`);
    process.exit(1);
}

SC4_Localization.setLocale("EN");
if (SC4_Localization.getText("newgame") !== "New Game") {
    console.error(`❌ getText("newgame") attendu 'New Game' en EN, obtenu: ${SC4_Localization.getText("newgame")}`);
    process.exit(1);
}
if (SC4_Localization.getText("title.newGame") !== "New Game") {
    console.error(`❌ getText("title.newGame") attendu 'New Game' en EN, obtenu: ${SC4_Localization.getText("title.newGame")}`);
    process.exit(1);
}
console.log("✅ 2. Résolution des clés plates et hiérarchiques (FR/EN) : OK");

// 3. Test de parsing du flag \L[KEY] dans les chaînes de caractères
SC4_Localization.setLocale("FR");
const parsedFr = SC4_Localization.parse("Bienvenue dans SimCraft 4 : \\L[title.newGame] !");
if (parsedFr !== "Bienvenue dans SimCraft 4 : Débuter !") {
    console.error(`❌ Parsing FR invalide: obtenu '${parsedFr}'`);
    process.exit(1);
}

// Test avec minuscule \l[KEY]
const parsedMin = SC4_Localization.parse("Option : \\l[newgame]");
if (parsedMin !== "Option : Débuter") {
    console.error(`❌ Parsing avec drapeau minuscule invalide: obtenu '${parsedMin}'`);
    process.exit(1);
}

SC4_Localization.setLocale("EN");
const parsedEn = SC4_Localization.parse("Welcome to SimCraft 4: \\L[title.newGame]!");
if (parsedEn !== "Welcome to SimCraft 4: New Game!") {
    console.error(`❌ Parsing EN invalide: obtenu '${parsedEn}'`);
    process.exit(1);
}
console.log("✅ 3. Parsing du flag \\L[KEY] (insensible à la casse avec préservation du texte environnant) : OK");

// 4. Test d'intégration dans convertEscapeCharacters (priorité sur les autres flags)
SC4_Localization.setLocale("FR");
const win = new Window_Base();
const escaped = win.convertEscapeCharacters("Score: \\L[newgame] (Niveau \\V[1])");
if (escaped !== "Score: Débuter (Niveau VAL_1)") {
    console.error(`❌ convertEscapeCharacters invalide: obtenu '${escaped}'`);
    process.exit(1);
}
console.log("✅ 4. Priorité d'expansion de \\L[KEY] dans convertEscapeCharacters : OK");

// 5. Test d'intégration TextManager
SC4_Localization.setLocale("FR");
if (TextManager.newGame !== "Débuter") {
    console.error(`❌ TextManager.newGame attendu 'Débuter' en FR, obtenu: ${TextManager.newGame}`);
    process.exit(1);
}
SC4_Localization.setLocale("EN");
if (TextManager.newGame !== "New Game") {
    console.error(`❌ TextManager.newGame attendu 'New Game' en EN, obtenu: ${TextManager.newGame}`);
    process.exit(1);
}
console.log("✅ 5. Substitution automatique des vocables TextManager via \\L[KEY] : OK");

// 6. Test d'intégration sur les objets de base de données ($dataItems, $dataSkills, etc.)
const testItem = {
    id: 1,
    name: "\\L[item]",
    description: "Description : \\L[newgame]"
};
SC4_Localization.hookDatabaseObject(testItem);

SC4_Localization.setLocale("FR");
if (testItem.name !== "Objets" || testItem.description !== "Description : Débuter") {
    console.error(`❌ Objet de base de données en FR invalide: name='${testItem.name}', desc='${testItem.description}'`);
    process.exit(1);
}

SC4_Localization.setLocale("EN");
if (testItem.name !== "Items" || testItem.description !== "Description : New Game") {
    console.error(`❌ Objet de base de données en EN invalide: name='${testItem.name}', desc='${testItem.description}'`);
    process.exit(1);
}
console.log("✅ 6. Getters dynamiques réactifs sur nom et description d'objets de base de données : OK");

// 7. Test de l'option de langue dans Window_Options
SC4_Localization.setLocale("FR");
const optionsWin = new Window_Options();
const localeIdx = optionsWin._list.findIndex(cmd => cmd.symbol === "locale");
if (localeIdx === -1) {
    console.error("❌ La commande 'locale' n'a pas été trouvée dans Window_Options");
    process.exit(1);
}
if (optionsWin.statusText(localeIdx) !== "Français") {
    console.error(`❌ Statut attendu 'Français', obtenu: ${optionsWin.statusText(localeIdx)}`);
    process.exit(1);
}

// Bascule vers l'anglais
optionsWin.select(localeIdx);
optionsWin.processOk();
if (SC4_Localization.locale() !== "EN") {
    console.error(`❌ Après bascule, langue attendue 'EN', obtenue: ${SC4_Localization.locale()}`);
    process.exit(1);
}
if (optionsWin.statusText(localeIdx) !== "English") {
    console.error(`❌ Statut attendu 'English', obtenu: ${optionsWin.statusText(localeIdx)}`);
    process.exit(1);
}
if (ConfigManager.locale !== "EN") {
    console.error(`❌ ConfigManager.locale attendu 'EN', obtenu: ${ConfigManager.locale}`);
    process.exit(1);
}
if ($gameSystem.locale !== "EN") {
    console.error(`❌ $gameSystem.locale attendu 'EN', obtenu: ${$gameSystem.locale}`);
    process.exit(1);
}
console.log("✅ 7. Sélecteur de langue dans Window_Options et synchronisation ConfigManager / $gameSystem : OK");

console.log("\n==============================================================");
console.log("🎉 TOUS LES TESTS DE L'ÉTAPE 16 (LOCALISATION) SONT VALIDÉS !");
console.log("==============================================================");
