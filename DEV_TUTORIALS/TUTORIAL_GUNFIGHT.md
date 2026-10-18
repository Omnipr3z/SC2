# 🔫 TUTORIEL DÉVELOPPEUR : SYSTÈME DE COMBAT À DISTANCE (GUNFIGHT)

Le système **Gunfight** de SimCraft 4 gère l'ensemble des armes à feu, la balistique de projectiles 8-directions, les mécaniques de tir (coup par coup et rafale), la gestion des chargeurs et du rechargement, ainsi que les interfaces HUD dédiées.

---

## 🎯 1. Contrôles & Mécaniques en Jeu

- **Clic Droit (Maintenu)** : Mode Visée / Garde.
  - Le héros s'oriente vers le curseur de la souris.
  - Le déplacement à la souris est verrouillé (seul le déplacement au clavier/flèches reste actif).
  - Le sprite adopte la posture visée `_guard_[specialAnim]`.
- **Clic Gauche** : Tir vers la position du curseur de la souris (ou attaque de base si arme de mêlée).
- **Touche `R`** : Déclenche le rechargement de l'arme équipée.
  - En mode `1by1` : Maintenir `R` pour insérer les munitions une par une jusqu'au relâchement ou plein.
  - En mode `total` : Une seule impulsion lance le rechargement complet du chargeur.

---

## 🏷️ 2. Notetags des Armes (`$dataWeapons`)

Pour configurer une arme dans l'éditeur RPG Maker MZ (champ **Note** de l'onglet Armes) :

### A. Statistiques de Tir et Comportement
```text
<skillId:ID>
<range:CASES>
<rateOfFire:FRAMES>
<burst>
<heavy>
<snipe>
<specialAnim:NOM>
<shootSe:FICHIER, VOLUME, PITCH>
```

| Notetag | Type | Description |
| :--- | :--- | :--- |
| `<skillId:12>` | Entier | ID de la compétence (Skill) exécutée lors du tir (dégâts, formule, effets). |
| `<range:8>` | Entier | Portée maximale du projectile en nombre de cases (0 ou omis = infini / mêlée). |
| `<rateOfFire:15>` | Entier | Cadence de tir : délai minimum en frames (ex: 15 frames = 4 tirs/seconde à 60 FPS). |
| `<burst>` | Flag | **Tir automatique / rafale** : permet de maintenir le clic gauche enfoncé pour tirer en continu au rythme du `rateOfFire`. Sans ce flag, l'arme est en semi-automatique (nécessite de relâcher et recliquer). |
| `<heavy>` | Flag | Arme lourde : impossible de se déplacer et de tirer simultanément. |
| `<snipe>` | Flag | Mode tireur d'élite : impossible de se déplacer tout en maintenant la visée (clic droit). |
| `<specialAnim:riffle>` | Chaîne | Préfixe de la planche d'animation du héros pour la marche, course et visée (`[race]_[sex]_guard_riffle`, etc.). |
| `<shootSe:Gun1, 90, 100>` | Audio | Effet sonore déclenché à chaque tir (nom du fichier dans `audio/se/`, volume 0-100, pitch 50-150). |

---

### B. Gestion des Munitions & Rechargement (Reload)
```text
<reload:true>
<reloadMode:1by1>
<ammoId:45>
<ammoCap:6>
<rechargeTime:40>
<reloadAction:onehandgun>
<reloadMove:true>
<reloadSe:Reload1, 80, 100>
<outOfAmmo:DryFire, 80, 100>
<emptySe:EmptyClick, 80, 100>
```

| Notetag | Valeur / Type | Description |
| :--- | :--- | :--- |
| `<reload:true>` | Booléen | Active la gestion des munitions et de la recharge (`false` = munitions infinies). |
| `<reloadMode:1by1>` | `1by1` ou `total` | **`1by1`** : Balle par balle (maintien de `R`). Chaque cycle ajoute 1 balle.<br>**`total`** : Chargeur complet (impulsion sur `R`). Tout le chargeur est rechargé d'un coup. |
| `<ammoId:45>` | Entier | ID de l'objet (Item) servant de munition ou de chargeur dans l'inventaire. |
| `<ammoCap:6>` | Entier | Capacité maximale du chargeur. |
| `<rechargeTime:40>` | Entier | Durée en frames du cycle de rechargement (par balle en `1by1`, ou totale en `total`). |
| `<reloadAction:riffle>` | Chaîne | Nom de l'action de rechargement pour le compositeur graphique (`..._reload_[NOM]` et `..._walkreload_[NOM]`). |
| `<reloadMove:true>` | Booléen | Permet au héros de marcher tout en rechargeant (`false` = immobilisé pendant la recharge). |
| `<reloadSe:FICHIER, V, P>` | Audio | Son joué à chaque balle chargée (ou lors du rechargement complet). |
| `<outOfAmmo:FICHIER, V, P>`| Audio | Son joué lors d'un tir à vide (chargeur à 0 balle). |
| `<emptySe:FICHIER, V, P>` | Audio | Son joué lors d'une tentative de recharge sans munitions en inventaire. |

---

### C. Balistique et Rendu du Projectile
```text
<projectileImg:bullet_handgun>
<projectileSpeed:16>
```

| Notetag | Description |
| :--- | :--- |
| `<projectileImg:bullet_handgun>` | Nom de l'image de projectile (stockée dans `img/characters/composite/projectile/`). |
| `<projectileSpeed:16>` | Vitesse de déplacement du sprite en pixels par frame (défaut : 16 px/frame). |

**Règles balistiques implémentées :**
- **Raycast 8 directions** : Le tir calcule la trajectoire exacte depuis la position d'arme du sprite jusqu'à la portée maximale ou un obstacle/ennemi.
- **Fade d'apparition progressif** : Le projectile apparaît en fondu transparent (`opacity 0 -> 255`) sur les 64 premiers pixels de sa trajectoire.
- **Z-Index dynamique** : Le sprite du projectile est affiché sous le Z-index du character tireur pour préserver la cohérence visuelle.
- **Calibrage des offsets** : Alignement automatique selon l'orientation (décalage vertical de -26px en horizontal et diagonales hautes, -36px en diagonales basses).

---

## 📊 3. Interfaces HUD (Arme & Acteur)

SimCraft 4 intègre deux affichages tête-haute (HUD) sur la carte :
1. **HUD d'Arme** (coin inférieur droit) :
   - Icône et nom de l'arme actuellement équipée.
   - Munitions restantes dans le chargeur actif (`X / CAP`).
   - Stock total de munitions disponibles dans l'inventaire.
2. **HUD d'Acteur** (coin supérieur gauche) :
   - Portrait paperdoll face 144x144, jauges de PV, PM, ATB/PT.

### Méthodes d'Activation / Désactivation à la Volée (Script Calls)

Vous pouvez masquer ou réafficher ces HUDs à tout moment (ex: lors d'une cinématique, dialogue ou menu) via de simples appels JavaScript :

```javascript
// --- HUD d'Arme ---
$gameSystem.setWeaponHudVisible(false); // Masque le HUD arme
$gameSystem.setWeaponHudVisible(true);  // Affiche le HUD arme
$gameSystem.toggleWeaponHud();          // Alterne l'état
const isWeapVisible = $gameSystem.isWeaponHudVisible();

// --- HUD d'Acteur ---
$gameSystem.setActorHudVisible(false);  // Masque le HUD acteur
$gameSystem.setActorHudVisible(true);   // Affiche le HUD acteur
$gameSystem.toggleActorHud();           // Alterne l'état
const isActorVisible = $gameSystem.isActorHudVisible();
```

---

## 🔍 4. Débogage & Logs (`DEBUGTOOL`)

Tous les logs de visée, trajectoires, tirs et rechargements sont indexés sous le tag `'gunfight'` :

```javascript
DEBUGTOOL.log("Tir effectué vers angle : " + angle, "gunfight");
```

Pour filtrer ou masquer ces logs en jeu :
- Dans les paramètres du plugin `DEBUGTOOL` : activer le mode sélectif et exclure `'gunfight'`, ou appeler en console :
  ```javascript
  DEBUGTOOL.removeAllowedKey("gunfight");
  DEBUGTOOL.addAllowedKey("gunfight");
  ```
