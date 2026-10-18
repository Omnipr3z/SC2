# 🎮 SIMCRAFT 4 — GUIDE DE DÉVELOPPEMENT & TUTORIELS SYSTÈMES

Bienvenue dans le répertoire de documentation technique et de tutoriels pour les développeurs et créateurs de contenu sur **SimCraft 4 (SC4)**.

Cette suite de guides détaille le fonctionnement, la syntaxe des notetags/flags, la structure des fichiers de données JSON et les API scriptables de chaque module clé du moteur.

---

## 📚 Sommaire des Tutoriels

| Module | Description | Guide Développeur |
| :--- | :--- | :--- |
| 🔫 **Gunfight System** | Système complet d'armes à feu, munitions, rechargement (1by1 / total), balistique de projectiles, raycast, HUDs arme et acteur, visée et tir en rafale. | [Tutoriel Gunfight](./TUTORIAL_GUNFIGHT.md) |
| 🌐 **Localisation Multi-Langue** | Système de traduction dynamique avec flag `\L[KEY]`, dictionnaires JSON (FR/EN), intégration réactive TextManager et base de données, menu Options. | [Tutoriel Localisation](./TUTORIAL_LOCALIZATION.md) |
| 💬 **Bubble Messages** | Fenêtres de message flottantes en bulle (`Window_BubbleMsg`), ciblage dynamique (`\A`, `\E[id]`, `\PX`, `\PY`), auto-taille et edge-clamping hors-écran. | [Tutoriel Bubble Messages](./TUTORIAL_BUBBLE_MESSAGE.md) |
| ⭕ **Ring Command Menu** | Fenêtre de commandes circulaire rotative (`Window_RingCommand`), animation d'ouverture Ease-Out, icônes, navigation angulaire et trigger tactile/souris sur la carte. | [Tutoriel Ring Command](./TUTORIAL_RING_COMMAND.md) |
| 🎒 **Conteneurs & Multi-Inventaires** | Gestion des inventaires secondaires (`Game_Inventories`), conteneurs persistants vs auto-erase, support items/armes/armures, sauvegarde/chargement. | [Tutoriel Conteneurs](./TUTORIAL_CONTAINERS_INVENTORIES.md) |
| 🚀 **Navigation & Simulation Spatiale** | Navigation multi-échelles (Galaxie FTL, Système Solaire, Sous-système), sauts Warp animés, physique orbitale `$gameDate`, mode Hangar et atterrissage sur POI. | [Tutoriel Navigation Spatiale](./TUTORIAL_SPACE_TRAVEL.md) |
| 📜 **Système de Quêtes & Balises** | Gestionnaire `$gameQuests`, déclencheur temporel `$storyManager`, balises spatiales multi-échelles, objectifs hiérarchiques et alertes radio cockpit. | [Tutoriel Quêtes & Balises](./TUTORIAL_QUEST_SYSTEM.md) |

---

## 🛠️ Architecture & Conventions Globales SC4

1. **Classes ES6/ES7 Modernes** : Tous les systèmes utilisent la syntaxe standard de classes JavaScript (`class ... extends ...`), sans dépendances obsolètes externes.
2. **Compatibilité Native RMMZ** : Tous les comportements par défaut restent conformes aux standards de RPG Maker MZ tant qu'un flag ou une option de personnalisation n'est pas invoqué.
3. **Journalisation Conditionnelle (`DEBUGTOOL`)** :
   Les messages de log utilisent le module centralisé `DEBUGTOOL.log(message, flag)` avec des catégories dédiées (`'gunfight'`, `'ui'`, etc.) pouvant être activées ou filtrées à la volée.
4. **Persistance des Paramètres Joueur** :
   Les préférences utilisateur (langue, visibilité de HUDs, mode de messages) sont persistées proprement via `ConfigManager` et `$gameSystem`.
5. **Validation par Tests Unitaires** :
   Toute modification d'un système doit être validée en exécutant le runner global :
   ```bash
   node UNIT_TESTS/run_all_tests.js
   ```

---

*Consultez chaque tutoriel individuel ci-dessus pour les spécifications techniques complètes, les exemples de notetags et les commandes de test.*
