//=============================================================================
// SC4_Game_DateFormatter.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Formateur d'horloge galactique et calendrier Neotori / 40K.
 * @author SimCraft
 * 
 * @help
 * ============================================================================
 * SC4_Game_DateFormatter.js
 * ============================================================================
 * Fournit les fonctions statiques de formatage de l'horloge galactique et
 * du calendrier stellaire selon les standards Neotori et 40K.
 * ============================================================================
 */

class Game_DateFormatter {
    /**
     * Formate la date au style stellaire Neotori :
     * Era:[Millenaire]-cycle:[an]-séquence:[mois]/[DECADE]/[JR DE LA DECADE] - [Hr:min]
     * @param {Game_Date} gameDate
     * @returns {string}
     */
    static formatNeotori(gameDate) {
        if (!gameDate) return "";
        const year = gameDate.getYear();
        const era = Math.floor(year / 1000) + 1;
        const cycle = year;
        const sequence = String(gameDate.getMonth()).padStart(2, '0');
        const decade = gameDate.getDecadeIndex();
        const jrDecade = (gameDate.getDayMonth() % 10) + 1;
        const hr = String(gameDate.getHr()).padStart(2, '0');
        const min = String(gameDate.getMin()).padStart(2, '0');
        return `Era:${era}-cycle:${cycle}-séquence:${sequence}/${decade}/${jrDecade} - [${hr}:${min}]`;
    }

    /**
     * Rétrocompatibilité 40K : redirige vers le formatage Neotori
     * @param {Game_Date} gameDate
     * @returns {string}
     */
    static format40K(gameDate) {
        return this.formatNeotori(gameDate);
    }

    static getHrWording(gameDate) {
        if (!gameDate) return "";
        const hr = String(gameDate.getHr()).padStart(2, '0');
        const min = String(gameDate.getMin()).padStart(2, '0');
        return `${hr}:${min}`;
    }

    static getShortDate(gameDate) {
        if (!gameDate) return "";
        const day = gameDate.getDayMonth() + 1;
        const month = gameDate.getMonth();
        const year = gameDate.getYear();
        return `${day}/${month}/${year} - ${this.getHrWording(gameDate)}`;
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { Game_DateFormatter };
}
