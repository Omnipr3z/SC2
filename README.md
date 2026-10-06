

# Plan de dev
- Hub_Hero: un hub pour gérer les differentes entité associé aux  Game_Hero facilement
- Bitmap_Composite: Le script qui snap les images des diferentes parties du body pour composé les images du sprite
- Sprite_Hero: Un sprite custom chargé d'animer le sprite du heros à l'ecran (Gestion des frames, directions, decoupe de l'image...)
- Character_Hero: l'animateur le sprite l'ecoute et reagit en fonction. Il doit pouvoir être utilisé en remplacement du character_base de RMMZ correspondant à l'objet (Game_Player, Game_Follower, Event_Character, Game_Vehicle, ...). Pour la première version, j'utiliserai que le Game_Player pour tester mais le but est de pouvoir l'utiliser pour tous les personnages. Il sera aussi utilisé pour les PNJ et certain events.
- Game_Hero: Une version herité de Game_Actor adapté aux persos custom. Les actor doivent être géré par ce Game_Hero et non par le Game_Actor de RMMZ quand il ont le flag `Hero` dans les notetags. De plus, les sprites des heros doivent être géré par le Character_Hero et non par le Sprite_Character de RMMZ.
- Pour les events, je pense à les associé à un actor pour gérer les personnages custom, ou soit il faut revoir comment fonctionnent les events et y integrer la possibilité d'utiliser les entités custom. Pour l'instant, je vais faire simple et me focus sur le Game_Player.

# Strategie de Surcharge
Dans Game_Actors, lors de la création d'un acteur, le syteme scan les notetags et si il a le flag Hero (toute casse de caractères) dans son notetag, il va instancier le Game_Hero.
Pour le Sprite et le character il va utiliser le Character_Hero, qui lui même utilisera le Sprite_Hero et le Bitmap_Composite lors du chargement de la map, pour générer l'image du personnage.

## Configuration des personnages
Un personnage sera défini par son notetag, qui indiquera l'ensemble des informations necessaires au Character_Hero pour fonctionner.

### Flag Hero
Ce notetag définira que le personnage est un hero et donc géré par le Game_Hero.
```
<Hero> 
```
Les autres personnages fonctionne avec la version native de RMMZ.

### Race
Ce notetag définira la race du personnage.
```
<Race: [RACE_NAME]> 
```
Où RACE_NAME sera une chaine de caractere identifiant la race et donc les parties du corps du personnage et leur agencement. Par exemple "Human". 

### Sex
Ce notetag définira le sexe du personnage.
```
<Sex: [SEX_NAME]> 
```
Où SEX_NAME sera une chaine de caractere identifiant le sexe du personnage. Par exemple "Male".

## Selection de l'image de base du composite

L'image de base du composite est défini par la race et le sexe du personnage.

```img/characters/composite/[RACE_NAME]_[SEX_NAME]_[ACTION_NAME].png```

Où RACE_NAME sera une chaine de caractere identifiant la race et SEX_NAME sera une chaine de caractere identifiant le sexe du personnage. Par exemple "human_male".

Pour l'instant, on ne va pas se focus sur l'action. Pour commencer, on va ce focus sur l'action "walk" par defaut, plus tard, on pourra ajouter d'autres actions.

De meme, on verra après pour la gestion des paperdoll d'equipements, on utilise le bitmap composite pour créer une image de composite sans autre couche que celle de base pour le moment. ON ajoutera les autres features après.

## Structure de l'image

La structure de l'image est la suivante:
- une image de 8 lignes de 3 frames (pied gauche en avant, pied centré, pied droit en avant) de 96*96 pixels.

    - chaque ligne correspond à une direction.
    - chaque colonne correspond à un frame.
    - la frame du milieu (index 1) est la frame de repos.

| Ligne (Index) | Direction | Nom | Orientation |
|---------------|-----------|-----|-------------|
| 0             | 2         | Bas (South) | Face caméra (standard RMMZ) |
| 1             | 4         | Gauche (West) | Profil gauche (standard RMMZ) |
| 2             | 6         | Droite (East) | Profil droit (standard RMMZ) |
| 3             | 8         | Haut (North) | Dos caméra (standard RMMZ) |
| 4             | 1         | Bas-Gauche (South-West) | Diagonale avant-gauche |
| 5             | 3         | Bas-Droite (South-East) | Diagonale avant-droite |
| 6             | 7         | Haut-Gauche (North-West) | Diagonale arrière-gauche |
| 7             | 9         | Haut-Droite (North-East) | Diagonale arrière-droite |

# Mechanique de controle du personnage

Pour l'instant, je vais testé sur un seul perso, celui du Game_Player. Il faut donc adapter les control du joueur pour qu'il gère les 8 directions et les 3 frames par direction. De plus, il faudra penser à l'event camera et à la manière de gérer les collisions et les mouvements du joueur. Pour l'instant on laisse le système de base.

# Indications IA

- Je ne veux pas de structure lourde comme pour l'ancienne version de SCE. Va au plus simple, au plus efficient. Privilégie des solutions légères, rapides et modulaires. Évite la complexité inutile, le sur-engin, et tout ce qui n'est pas strictement nécessaire au bon fonctionnement du système. Ne rajoute pas de couches d'abstraction ou de fonctionnalités supplémentaires si ce n'est pas indispensable. Je vais penser les differentes fonctionnalités et l'archi globale au fur et à mesure et te demander de les implémenter au fur et à mesure. Grace à ça, tu pourras me proposer de nouvelle chose en tenant compte de l'architecture mise en place et de ses limites.



# ETAPE 2

## Le Paperdoll & le Bitmap_Composite

Le Paperdoll est le système de gestion des images des personnages. Il est composé de plusieurs parties combiné par le Bitmap_Composite.

Pour ce faire on va reprendre la classe de l'ancienne version (C:\SERVER\htdocs\SimCraft\SCE\project\js\plugins\simcraft\core\componants\Bitmap_Composite.js) en la copiant dans le dossier actuel et en l'adaptant à la nouvelle logique. Il faudra l'adapter aux standards de RMMZ (import d'image, gestion des bitmaps, etc...). Il faudra aussi l'adapter au contexte actuel. C'est à dire qu'il faudra l'adapter au 8 directions (au lieu de 4), à la séparation des differentes images d'actions (walk, wait, run, etc...) . On va commencer par l'action "walk" par defaut. Pour l'instant, on ne va pas se focus sur les autres actions. On verra après pour comment gérer les actions, mais le but est de pouvoir l'adapter par la suite (a voir pour la gestion du cache).

L'image de base, celle qu'on a implémenté precedement est le corps du personnage. Son zindex est 50 (Par defaut) pour pouvoir ajouter des couches derrière et devant dans le futur. On va partir du principe que les différentes parties du corps sont stockées dans des fichiers .png separés et organisés de la meme maniere que l'image de base.

L'organisation des images est la suivante:
- une image de 8 lignes de 4 frames (pied gauche en avant, pied centré, pied droit en avant, pied gauche en arriere?) de 96*96 pixels.

    - chaque ligne correspond à une direction.
    - chaque colonne correspond à un frame.
    - la frame du milieu (index 1) est la frame de repos.

### Face

Pour commencer on va ajouter un notetag au hero pour définir l'utilisation d'un visage du personnage:
```
<Face>
```
Si cette note tag est presente, le personnage utilisera une image de visage au dessus de l'image de base (zindex 60). Le nom du fichier et son chemin et defini comme suit :
```
img/characters/composite/faces/[ACTOR_ID]_[ACTION_NAME].png
```
Où ACTOR_ID sera l'id de l'acteur et ACTION_NAME sera une chaine de caractere identifiant l'action. Par defaut, l'action est "walk". On verra plus tard la gestion des action.

J'ai créé l'image face de l'acteur 1 : img/characters/composite/faces/1_walk.png.

### Equipements

Les equipements devront etre géré de la meme maniere, c'est à dire que chaque equipement devra avoir une image et etre défini par un notetag dans la base de données des armes et armures. Les vetements devront etre géré de la meme maniere, c'est à dire que chaque vetement devra avoir une image et etre défini par un notetag dans la base de données des vetements.

Comme pour l'ancienne version, on va utilisé les notetags des armes et armures pour définir le chemin et le nom des images et on va utilisé les notetags des vetements pour définir le chemin et le nom des images. 

Les notetags sont de la forme suivante:
```
<visual_equip: [FILENAME], [zindex]>

```
Un meme equipement peut avoir plusieurs couches (ex: une armure et un vetement, ou plusieurs couches de vetements). On va utiliser des notetags différents pour chaque couche. Pour que le bitmap composite puisse les assembler dans le bon ordre, on utilise le zindex.

Où FILENAME sera une chaine de caractere identifiant le nom du fichier image.

Pour recomposer le chemin vers les images des differentes couches, on va procéder comme suit:
```
img/characters/composite/equipments/[RACE_NAMED]_[SEX_NAME]_[FILENAME]_[ACTION_NAME].png
```
Où RACE_NAMED sera le nom de la race de l'acteur, SEX_NAME sera le sexe de l'acteur, FILENAME sera le nom du fichier image et ACTION_NAME sera une chaine de caractere identifiant l'action. Par defaut, l'action est "walk". On verra plus tard la gestion des actions.

J'ai créé l'image pour l'armure de l'acteur 1 : img/characters/composite/equipments/human_male_flak_walk.png.

J'ai mit les balises dans le notetag dans l'editeur de RMMZ

## Norme
Le But etant de recréer de l'ordre dans le SC4, il faut qu'on se mette d'accord sur plusieurs choses:
- Chaque fichier .js devra etre commenté de facon à comprendre son utilité et son fonctionnement.
- Les fichiers contiennent uniquement une classe et sont nommés de facon cohérente avec la classe qu'il contiennent. Pour les patches et les surcharge des classes natives, on utilisera un seul fichier "SC4_[FILENAME]_Patches.js" et on mettra dedans tout les patches pour les differentes classes (en les ordonnant par classe).
Où FILENAME sera le nom du fichier natif patché. Par exemple, "RMMZ_windows_Patches.js" ou "RMMZ_objects_Patches.js".

# ETAPE 3

## COntrole des directions du personnage

Le clic gauche permet de se deplacer et nativement il permet d'ouvrir le menu. Mais je souhaite modifier ce comportement. Je veux que le clic gauche permette de se deplacer et que le clic droit permette d'orienter le personnage vers la position cliqué (direction fixe sans deplacement).

(je sais pas si tu as corrigé l'inversion tout à l'heure, il faut que je change le clic gauche et le clic droit dans le cas contraire)
Je precise:
- le menu ne s'ouvre plus avec le clic.
- il faut pouvoir recuperer la position du clic gauche et du clic droit.
- si l'acteur est en mouvement (automatique via clic gauche) vers une direction, le clic droit stop ce mouvement et oriente le personnage vers la direction de la position du curseur.
- Lorsque la direction est fixé par le clic droit (en le maintenant enfoncé), le clic gauche ne deplace plus le personnage. Il peut néanmoins se deplacer avec les touches directionnelles mais il reste orienté vers vers la direction du curseur en se deplacant.
- Dans l'etape suivante nous feront une action spéciale avec le clic gauche quand le clic droit est maintenu enfoncé au lieu d'indiqué le lieu de deplacement. En gros, il faut ajouter une fonction qui permet de vérifier si le clic droit est maintenu enfoncé et si c'est le cas, on utilise le clic gauche pour faire autre chose. Sinon, on utilise le clic gauche pour deplacer le personnage vers la position cliquée.
- Le clic gauche sera la touche pour faire une attaque dans la direction du clic droit maintenu.

## Indication
Pour l'instant, on ne se focus pas sur le déplacement ou l'orientation pas l'action d'attaque.



# ETAPE 4

## Action d'attaque

Bon on va faire une action d'attaque.

L'action d'attaque utilise une autre image composite pour l'acteur.
```
<visual_attack>
<duration>[DURATION]</duration>
<frames>[NUMBER]</frames>
<action_name>[ACTION_NAME]</action_name>
</visual_attack>
```
Où NUMBER sera le nombre de tiles de l'action d'attaque (par defaut 4, mais on peut en utiliser moins ou plus) et ACTION_NAME sera une chaine de caractere identifiant le nom du fichier image. Si ACTION_NAME n'est pas défini, on utilisera "atk" par defaut. DURATION sera le nombre de frames que dure chaque tile de l'action d'attaque. Par defaut, c'est 4 frames.

J'ai créé l'image pour l'action d'attaque de l'acteur 1 : img/characters/composite/human_male_atk.png

Et son equipement dedié pour le papperdoll : img/characters/composite/equipments/human_male_flak_atk.png

Et la face dedié pour le papperdoll : img/characters/composite/faces/1_atk.png

Lorsque la touche d'atk (clic droit maintenu + clic gauche) est pressée, le personnage doit effectuer son action d'attaque. Pour cela il faut déjà :
- arrêter le mouvement du personnage (qu'il soit en mouvement ou non)
- orienter le personnage vers la position cliquée
- effectuer son action d'attaque


Le sprite lors de l'action d'attaque affiche les tuiles de l'image d'attaque avec le pattern 0 à (NUMBER - 1) et la direction correspondante à la direction du personnage. A la fin de l'action d'attaque, le personnage doit revenir à son etat de repos (pattern 0) et sa direction doit rester la meme.

# ETAPE 5

## FOLLOWER

C'est deja ok mais je voudrais un petit ajustement.

Je voudrais pouvoir controler les actions des followers via des commande de mouvement /appel de script (this.playAction({action: "[ACTION_NAME]", duration: [DURATION], frames: [NUMBER]}))

Exemple de commande :
```
this.playAction({action: "atk", duration: 4, frames: 4})
```

Où ID sera l'id de l'acteur du follower et ACTION_NAME sera le nom de l'action à effectuer...

- Lorsque l'acteur est dans la party, l'action s'execute sur lui
- Lorsque l'acteur n'est pas dans la party, il ne se passe rien. Il faudra faire autrement pour les evenements acteurs.

# ETAPE 6

## EVENT ACTOR

Certains events pourrait incarner des actors avec un notetag dans la page active (<actor: [ACTOR_ID]>)

Pour les evenements acteurs, il faudra utiliser les images du personnage de la bdd avec le paperdoll si c'est un hero ou juste son character classic sinon.

Si la commande de mouvement /appel de script (this.playAction({actorId: [ACTOR_ID], action: "[ACTION_NAME]", duration: [DURATION], frames: [NUMBER]})) fait reference à cet actor et que celui ci n'est pas dans la party, l'action se lance sur l'event au lieu du follower.

De plus, si l'actor est dans l'équipe, l'event doit etre invisible (il faut un notetag pour le rendre visible <actor_visible> si besoin).

## Indications

Les character on surement des methode commune qui ont la meme logique entre le player, les followers, les events. Veille à utiliser les heritages des super classes et des classe parente quand c'est utile pour DRY.

# ETAPE 7

# Gestion de l'equipe

Je voudrais pouvoir ajouter et retirer les membres de la party de manière dynamique.

- Tout d'abord lorsque le player à un follower et qu'il se tourne vers sa direction, cela ne doit pas effectuer le mouvement directement mais lui faire face dans un premier temps, de meme lorsque on clique sur le follower jsute derriere le hero. Je voudrais pouvoir interagir avec le follower comme avec un event.

- Lorsque je clique gauche sur le heros sans clic droit le follower le plus proche, un choix s'affiche :
(on pettra plusieurs choix mais pour l'instant que 1) "Demander de rester"/"Ne rien faire".
Lorsque le joueur choisit demander de rester:
- Un event de cette map a le notag <actor:[ID_DU_FOLLOWER]: cet evtn teleporte est teleporté à la postion exact du follower (direction comprise mais que sur les axes x et y pas diagonal). Le follower est retiré de la party

De meme sur pour l'event qui a le notag <actor:[ID_DU_HERO]>, j'aimerai un methode joinPlayerParty() qui, si l'actor n'est pas dans la party, ajoute l'actor à la party. Il faudrait qu'avant d'etre ajouté l'event se deplace jusqu'à la position ou le follower doit apparaitre (si il est deja dans la party, il ne se passe rien).

- Aucun event ne porte le notetag avec l'ID du follower (un message s'affiche "je ne peux pas rester ici")

# ETAPE 8

# Course

Je voudrais que lorsque le joueur est en train de courir (dash ou run je sais plus) au lieu d'utiliser walk il utilise l'action dash. Et de même pour le follower.

Le events pas contre ca doit etre en fonction de la vitesse de deplacement parametré de l'event (rapide ou plus
 vite).

 J'ai créé les images d'action de course pour le hero :
 - img/characters/composite/human_male_run.png
 - img/characters/composite/equipments/human_male_flak_run.png
 - img/characters/composite/faces/1_run.png
- img/characters/composite/faces/2_run.png

# ETAPE 9

## Combat / Gun Fight - Phase 1 : Punching-ball de mêlée à mains nues

Système de combat ARPG en temps réel au corps-à-corps sans arme avec gestionnaire centralisé `FightManager` et ennemi punching-ball passif.

### 1. Classe FightManager (`js/plugins/FightManager.js`)
- Singleton accessible globalement via `window.$fightManager`.
- Répertorie et indexe tous les `ActorEvent` présents sur la carte courante (`actorEvents()`).
- Détecte les cibles hostiles vivantes au contact direct devant le joueur (`findHostileTargetInFront()`).
- Historise et enregistre les résultats de combat (`lastResult()`, `resultsHistory()`).

### 2. Notetags des événements (page active ou note d'événement)
- `<actor:[ACTOR_ID]>` : Lie l'événement à un acteur du système SimCraft.
- `<role:[neutral/hostile/ally/civilian]>` : Rôle d'interaction (par défaut `"neutral"`).
- `<enemy:[ENNEMY_ID]>` : Si hostile, instancie un battler `Game_Enemy` avec ses statistiques issues de la base de données RMMZ (`$dataEnemies[ENNEMY_ID]`).

### 3. Notetags dans la base de données des héros (`Actors.json`)
- `<attackId:[SKILL_ID]>` : ID de la compétence utilisée pour l'attaque (par défaut `1` si omis).

### 4. Déclenchement de l'attaque à mains nues
- Condition : Le joueur n'est équipé d'aucune arme (`hasNoWeapons() === true`).
- Déclenchement automatique lors de l'action `atk` (clic gauche / touche d'action) au contact direct d'un acteur hostile.
- Résolution par le moteur natif de RMMZ via `Game_Action.prototype.apply` contre le `Game_Enemy`.

### 5. Retours visuels et physiques
- **Orientation** : L'événement ennemi fait face au joueur avec direction fixe (`turnTowardCharacter`, `setDirectionFix(true)`).
- **Animation** : L'animation de la compétence (ex: animation 1) est jouée sur l'événement (`$gameTemp.requestAnimation`).
- **Ennemi survivant** :
  - `event.playAction({ action: "hurt", duration: 8, frames: 3 })`.
  - Recul (knockback) d'une case en arrière avec direction fixe.
  - Retour en `walk` pattern 1 (idle) et déverrouillage de la direction fixe à la fin de l'action.
- **Ennemi vaincu (`isDead`)** :
  - `event.playAction({ action: "down", duration: 10, frames: 3 })`.
  - À la fin de l'action `down`, activation automatique de l'interrupteur local `C` (`$gameSelfSwitches.setValue([mapId, eventId, "C"], true)`).





