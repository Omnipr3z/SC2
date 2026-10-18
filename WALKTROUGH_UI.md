# UI

## fichier de localisation
 
Un flag \L[KEY] doit permettre de remplacer le contenu par un texte contenu dans un fichier de localisation json data/SC/Localisation_[LANGUAGE].json dans les fenetre message. [LANGUAGE] fait reference au language du jeu $gameSystem.locale.

Les methodes de TextManager qui affiche les vocable doivent aussi etre parsé avec \L[KEY]. Par exemple si je met dans l'editeur "\L[newgame]" cela doit etre remplacé par la donnée de data/SC/Localisation_[LANGUAGE].json.
Seulement le flag est replacé le reste du texte si il y'en a reste.

Il doit y avoir une option pour regler le language de francais et anglais.

Le jeu se lance avec les parametre sauvegardé en dernier

* Cela doit aussi fonctionner pour les nom, description des different items, arme, armure, competence, statut,... et partout ou il y a des texte qui doivent etre affiché ingame

Tu oeux créér ses fichiers json et les adapter au contenu deja existant en francais et anglais. Tu peux déjà remplacer les données vanilla des texte du menu et menu title.

## Buble message

Dans la precedente version de SCE j'avais developpé un systeme de message bulle pour les persos

C:\SERVER\htdocs\SimCraft\SCE\project\js\plugins\simcraft\gui_modules\bubbleMsg\

et un systeme de fenetre de choix rotative

C:\SERVER\htdocs\SimCraft\SCE\project\js\plugins\simcraft\gui_modules\ringCmd\

l'idée est de transferer cela dans la nouvelle version 

* tu peux revoir la methode utiliser fais ce qui semble plus pertinent
* il faut des classe ES7 quand c'est possible
* la police d'ecriture (font) et l'apparence doit etre spécifique et parametrable via un parametre de plugin et modifiable via une methode interface simple (par defaut celle de base)
* le system se substitue au fenetre de base de message de manière contextuelle (un param $gameSystem modifiable à la volée ?). Par defaut les fenetre de base doivent fonctionner comme en vanilla
* Si possible integrer directement des flags dans le message pour definir le type de fenetre et la cible :
    * \A : la target est le player
    * \E[EVENT_ID] : la target est l'event dont c'est l'id !!!la fenetre doit se placer sur l'ecran au plus près si l'event est en dehors de l'ecran
    * \PX[], \PY[] : en vanilla elle servent à definir la position normalelemnt mais en mode bubble elle definisse la target
    * \L[key] pour du texte localisé cetteadaptation doit se faire en premier parce que le texte traduit peut contenir d'autre flag à modifier après (genre des \n[1], \v[5]...)
* Il faut supprimer les dependance aux autres scripts du script d'origine SCE dans la nouvelle version, les surcharge du code de base se font dans le fichier dedié dans la nouvelle version.

### ✅ Statut d'implémentation (Validé 100%)

1. **Système de Localisation Multi-Langue** :
   - Fichiers créés : `data/SC/Localisation_FR.json` et `data/SC/Localisation_EN.json`.
   - Plugin créé : `js/plugins/SC4_Localization.js`.
   - Traitement prioritaire de `\L[KEY]` dans `Window_Base.prototype.convertEscapeCharacters` et `TextManager`.
   - Getters réactifs dynamiques sur `name` et `description` des objets de base de données (`$dataItems`, `$dataWeapons`, `$dataArmors`, `$dataSkills`, `$dataStates`).
   - Sélecteur de langue dans `Window_Options` (Français / English) synchronisé avec `ConfigManager.locale` et `$gameSystem.locale`.
   - Titre et commandes localisés dans `SC4_TitleScreen.js`.
   - Tests validés : `UNIT_TESTS/test_step16_localization.js`.

2. **Système Bubble Message** :
   - Plugin créé : `js/plugins/SC4_BubbleMessage.js` (`Window_BubbleMsg extends Window_Message`).
   - Flags pris en charge :
     - `\A` : Cible le joueur (`$gamePlayer`).
     - `\E[EVENT_ID]` : Cible l'événement désigné.
     - `\PX[X]`, `\PY[Y]` : Cible des coordonnées d'écran précises.
     - `\L[KEY]` : Résolu en amont avant les autres flags.
   - Dimensionnement dynamique avec `textSizeEx` ajusté au contenu texte et portrait face.
   - Edge Clamping : Positionnement au bord le plus proche si l'événement ou le personnage est hors-écran.
   - Suivi dynamique de la cible en mouvement dans `update()`.
   - Rétablissement automatique du mode vanilla standard quand aucun flag n'est actif.
   - Contrôle dynamique via `$gameSystem.setBubbleMessageMode(true/false)` et configuration de police/skin via `Window_BubbleMsg.setConfig({...})`.

3. **Système Ring Command** :
   - Plugin créé : `js/plugins/SC4_RingCommand.js` (`Window_RingCommand extends Window_Command`).
   - Disposition circulaire avec animation fluide d'ouverture Ease-Out du rayon (`_radius` vers `_targetRadius`).
   - Support des icônes d'icônetier natif RMMZ (index numérique), des emojis et des chaînes courtes.
   - Navigation angulaire intuitive et rebouclage propre.
   - Intégration sur la carte (`Scene_Map`) avec ouverture contextuelle lors d'un clic/touch sur le héros (`isTouchOnPlayer`).
   - Activable/désactivable à la volée via `$gameSystem.setRingMenuEnabled(true/false)`.
   - Tests validés : `UNIT_TESTS/test_step17_bubble_ring.js` (62 tests unitaires validés).
   - Suite globale : 21 suites de tests sur 21 validées avec succès (`UNIT_TESTS/run_all_tests.js`).
