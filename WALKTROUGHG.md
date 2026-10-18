# GUNFIGHT SYSTEM

Avant de parler du gun fight à proprement parler on va revenir sur ce qui est déjà en place.

Le clic droit met le perso en mode garde. Il ne peut plus se deplacé avec la souris seulement avec les fleches. Le clic gauche qui servait normalement au déplacement rapide, devient la touche d'attaque.
Pour le gun fight on va faire la meme chose mais on va utiliser la souris pour viser. Seulement les arme auront beaucoup plus de subtilité que l'attaque simple. Lorsque le joueur clic une case celui ci doit tirer l'attaque prevu par l'arme (comme pour les attaque de base dejà implémentées). Qu'il clic dessus ou en dehors (ou hors portée) l'animation d'attaque (<visual_attack>) doit etre joué sur le perso. Si le projectile envoyé par l'arme touche l'ennemi alors cela fait des l'attaque sur l'ennemi.

# Les armes

Les armes vont avoir des statistiques supplementaires qui seront inscrite en notetags.


## Statistiques de combat

```
<skillId:[NUMBER]>
```
C'est l'id de l'attaque qui est associée à cette arme


```
<range:[VALUE]>
```

C'est la portée de l'arme en case si elle est absente ou 0 ou false cela signifie que c'est une arme de corps à corps comme la main nue. En l'absence la portée est illimité.

```
<rateOfFire:[NUMBER]>
```

C'est le nombre de frames de delai minimum entre chaque tir.

```
<specialAnim:[NAME]>
```
Lorsque cette valeur est renseignée, le character adoptera une image particulière en mode marche, course etgarde/visée (clic droit enfoncé mais pas encore de tir) en plus ce celle d'attaque lié à la competence de l'arme. `[race]_[sex]_guard_[Name]`

```
<heavy>
```

Si presente le perso ne peut pas bouger et tirer en meme temps.

```
<snipe>
```

Si presente le perso ne peut pas visé (mode garde) et bouger en meme temps.

```<shootSe:[FILENAME], [VOL], [PITCH]>```

Le son de détonation/tir de l'arme.

## Reload

```
<reload:[BOOLEAN]>
```

`true` signifie que l'arme doit utiliser des munitions et un systeme de rechargement autrement il peut etre utilisé en illimité sans recharger. La touche de rechargement sera `R`. Si le joueur dispose de suffisement de munitions/ chargeur alors il recharge sinon l'animation se joue mais pas de rechargement (l'audio differe, voir plus bas). Pendant la recharge le joueur ne peut pas courir.

```
<reloadAction:[NAME]>
```

Lorsqu'il est en train de recharger, le character du perso sera reload (`[Race]_[sex]_reload_[NAME]`) ou (`[Race]_[sex]_walkreload_[NAME]`) et en animation "pas à pas".
Ces images ajoutent une nouvelle compexité dans la gestion du sprite. la premier concerne l'animation de rechargement static du character et l'autre celle quand il se deplace (si il peut se deplacer en rechargeant).

```
<reloadMove:[BOOLEAN]>
```

Si il n'est pas `true` cela signifie qu'il ne peut pas se déplacer en rechargeant 

```
<ammoId:[ID_ITEM]>
```
Id de l'item (objet de base) servant de chargeur ou de munition individuelle pour cette arme. Si cette valeur est apsente ou false cela signifie qu'il faut recharger mais cela ne consome pas d'item

```
<ammoCap:[NUMBER]>
```

* C'est la capacité max en munition d'une charge complete.

```
<reloadMode:[TYPE]>
```

* Il ya plusieurs type de rechargements:
    * `1by1`: balle par balle, (comme pour un revolver à barillet) ou un fusil double canon : Pour recharger il faudra rester appuyer sur la touche R le temps que les balles soient charger une par une jusqu'au max. dans ce mode le perso pourra bouger en rechargeant.
    * `total`: par chargeur, il suffira d'appuyer sur R pour que le chargeur soit à bloc. 

```
<rechargeTime:[NUMBER]>
```

C'est le temps en frames qu'il faut pour charger (pour une munition en mode 1by1 ou pour le chargeur entier autrement)

```
<reloadSe:[FILENAME, [VOL], [PITCH]]>
```
Le son SE jouer à chaque rechargement.

```
<outOfAmmo:[FILENAME], [VOL], [PITCH]>
```
Le son au tir a sec

```
<emptySe:[FILENAME], [VOL], [PITCH]>
```
Le son jouer au rechargement à sec.

* Où stocker les balles restantes du chargeur ?

stocker l'état du chargeur directement sur l'acteur pour son arme équipée (ex: actor._loadedAmmo = ammoCap).
Quand l'arme est équipée pour la première fois, son chargeur est plein par défaut. Sauvegarde des balles par arme differente dans un  actor._weaponAmmo = { [weaponId]: currentAmmo }

* Consommation de l'item (<ammoId>) 

En mode 1by1 : 1 item consommé dans l'inventaire = 1 balle chargée.
En mode total : 1 item est un chargeur complet (on verra plus tard la création de chargeur par le regroupement de plusieurs balles mais ca c'est une autre feature - le craft)

* Affichage dans le HUD

Il faut un autre hud et il va etre un peux technique. mais pour l'instant cré juste le hud avec:

    * icon et nom de l'arme
    * nombre de munition dans le chargeur.
    * nombre de munitions en stock

* Structure des images reload :

8direction et 3 frames _reload et _walkreload

* En mode 1by1 (maintien de R), si le joueur relâche R au bout de 2 balles sur 6, le rechargement s'interrompt-il immédiatement en conservant les 2 balles chargées ? (C'est l'intérêt d'un rechargement balle par balle).

Ba c'est tout l'interet en effet

* En mode total, les munitions ne sont ajoutées qu'à la fin complète du temps <rechargeTime>. Si le joueur prend un coup ou tire avant la fin, le rechargement est interrompu.

oui il est interrompu par le coup mais je ne l'ai pas precisé mais tant qu'il n'a pas recharger il ne doit meme pas pouvoir tiré. En 1by1 il peut entre chaque rechagement donc lorsqu'il a relaché R et que le delai est fini pour la balle en cours

* Est-ce qu'on gère des armes automatiques (le joueur maintient le clic gauche enfoncé et l'arme tire en continu au rythme de rateOfFire) et des armes semi-auto (nécessite de relâcher et recliquer) ?

Très bon ajout, le coup par coup et le tire rafale il faut ajouter un flag <burst>

* Comportement au tir à sec (Clic à 0 balle)

En plus de jouer le son <outOfAmmo> le joueur doit selon un reglage dans les options du jeu
Option A (Survie / Manuel) : Rien de plus, le joueur doit consciemment appuyer sur R pour recharger.
L'Option B (Confort shooter) : Le clic à vide déclenche automatiquement la recharge si le joueur a des munitions dans son sac pourrait etre implementé comme un mode facile dans les options du jeu (sous AZERTY/QWERTY).

## Projectiles

Pour la V1, un raycast case par case en 8 directions (avec vérification de traversée de mur) est ultra efficace, fiable et parfaitement aligné avec les planches 8 directions du héros.

```
<projectileImg:[NAME]>
```

C'est le nom de l'image utilisé pour le projectile contenue dans img/characters/composite/projectiles/

* Suggestion : On peut prévoir une vitesse par défaut (ex: 16 px/frame) et un notetag facultatif <projectileSpeed:[NUMBER]>.
 
 Bonne idée on ajoute ca. On adaptera la valeur par defaut selon le rendu

 * Orientation du sprite du projectile : Est-ce une image unique qu'on fait pivoter selon l'angle de tir (sprite.rotation = angle), ou une planche 8 directions ?

 J'y pense mais il faut le prevoir pour après. on verra aussi les trajectoire de lancé (grenades trow), les projectiles qui on un mouvement rotatif... A prevoir pour la suite. Pas trop de features d'un coup sinon c'est l'enfer à tester. Mais tu peux anticipé cette prochaine etape dans la manière dont tu concoit le truc.

 * ou placer le hud arme

 Bas- droite

 * Dans RPG Maker MZ, la couche "R" correspond aux Region IDs (peints avec l'onglet R de l'éditeur).

Oui on oubli la feature des obstacle. j'ai mis ca pour plutard. On pourra aussi gérer les couvert avec le reperage des ia des sprites à ce moment là.

* Syntaxe des Notetags audio

Le crochet c'eetait purement indicatif pour te dire ce que ca contient. pas de crochet

* Transition Mêlée / Arme à feu

Pas de range = comportement de base. Mais j'ai prevu un truc pour plus tard

### Review test

* il semble que les arme à burst fonctionne mais pas  les autre pour le tir. Je pense que ca ne prend pas quand j'appui en coup par coup.
* Aussi, je voudrais que les balle traverse les zone d'eau meme si elle son bloquante.

### Review 2

* Bon je voudais un peu réarranger, j'arrive plus à m'y retrouver dans les fichier. Le naming du fichier va etre modifier pour inclure le path des repertoires pour organiser les layers avec moins de nom a rallonge. Pour la couche de base et les equipements au lieu d'utiliser un nom prefixé [race]_[sexe], race et sex doivent devenir des repertoires [race]/[sexe]/.... Projectile et face reste à la racine
* Dans la presedente modif tu a utiliser dash plutot que run n'utilise pas de nom disparate utilise run (utilise run partout, je veux utiliser dash pour autre chose)

## Step G1

Les base posée on va commencé à améliorer le système.

### Projectiles

La balle par defaut fonctionne mais il faut ajuster certains trucs.

* En orientation horizontale et diagonale le sprite du projectile est mal aligné avec l'arme du sprite. il faudrait le decaler de -26px (vers le haut) en horizontal dans les directions diagonales haut-gauche et haut-droite et lateral (droite et gauche). Pour les diagonales bas-droite et bas-gauche, -36px.
* j'aimerai bien que le projectile aparaisse en fondu sur les 64 premiers pixels de mouvement

exemple de tree réarrangé:
```
projectiles
faces
│   ├── 1_atk.png
│   ├── 1_down.png
│   ├── 1_guard.png
│   ├── 1_guard_onehandgun.png
│   ├── 1_guard_riffle.png
│   ├── 1_hurt.png
│   ├── 1_reload_onehandgun.png
│   ├── 1_reload_riffle.png
│   ├── 1_run.png
│   ├── 1_run_riffle.png
│   ├── 1_shot_onehandgun.png
│   ├── 1_shot_riffle.png
│   ├── 1_walk.png
│   ├── 1_walk_riffle.png
│   ├── 1_walkreload_onehandgun.png
│   ├── 1_walkreload_riffle.png
│   └── ...
├── human
│   └── male
│       ├── bodies (couches de base)
│       │   ├── atk.png
│       │   ├── down.png
│       │   ├── guard.png
│       │   ├── guard_onehandgun.png
│       │   ├── guard_riffle.png
│       │   ├── hurt.png
│       │   ├── reload_onehandgun.png
│       │   ├── reload_riffle.png
│       │   ├── run.png
│       │   ├── run_riffle.png
│       │   ├── shot_onehandgun.png
│       │   ├── shot_riffle.png
│       │   ├── walk.png
│       │   ├── walk_onehandgun.png
│       │   ├── walk_riffle.png
│       │   ├── walkreload_onehandgun.png
│       │   ├── walkreload_riffle.png
│       │   └── ...
│       └── equipments
│           ├── flak_atk.png
│           ├── flak_down.png
│           ├── flak_guard.png
│           ├── flak_hurt.png
│           ├── flak_run.png
│           ├── flak_walk.png
│           ├── hair1_atk.png
│           ├── hair1_down.png
│           ├── hair1_guard.png
│           ├── hair1_hurt.png
│           ├── hair1_run.png
│           ├── hair1_walk.png
│           ├── lasgun_down.png
│           ├── lasgun_down_riffle.png
│           ├── lasgun_guard_riffle.png
│           ├── lasgun_hurt.png
│           ├── lasgun_hurt_riffle.png
│           ├── lasgun_reload_riffle.png
│           ├── lasgun_run.png
│           ├── lasgun_run_riffle.png
│           ├── lasgun_shot_riffle.png
│           ├── lasgun_walk.png
│           ├── lasgun_walk_riffle.png
│           ├── lasgun_walkreload_riffle.png
│           ├── revolver_down.png
│           ├── revolver_guard.png
│           ├── revolver_guard_onehandgun.png
│           ├── revolver_hurt.png
│           ├── revolver_reload_onehandgun.png
│           ├── revolver_run.png
│           ├── revolver_run_onehandgun.png
│           ├── revolver_shot_onehandgun.png
│           ├── revolver_walk.png
│           ├── revolver_walk_onehandgun.png
│           ├── revolver_walkreload_onehandgun.png
│           └── ...
```

# Step G2

## Retour de test

Lorsque du gun fight j'ai quelque bugs :

- parfois quand je tir en rafale en restant appuyer sur le touche, entre plus sieurs tirs ou quand je n'est plus de munitions le character se deplace mais l'ecran ne le suit plus et il se retrouve décentré. Je voudrais qu'il y ai un processus à l'update de la scene ou de la map qui réajuste le scroll si le personnage se retrouve décentré et qu'il n'est pas au bord. Je crois savoir qu'il y a une methode update scroll ou un truc du genre qu'on pourrait rappeler ? Enfin je sait pas comment.

- EN tir en rafale l'animation d'action de la compétence s'execute comme y faut cependant entre chaque tir il reprend la posture walk du coup ca fait un genre de changement en boucle pas très esthetique. Ca serait bien qu'il y ai une verif si il est en rafale et qu'il clique toujours sur les deux clique il ne repasse pas tout de suite à walk. 

- a oui j'ai un peut modifier des detail dans le positionnement et le fade du projectile. n'ecrase pas.

# Notes importantes

* Il faut prevoir un log d'erreur pour les tests.
* N'effectue pas les modifs sur les données de jeu. Donnes moi les notetags à modifier et je le ferai.

## Pour la suite (pas tout de suite)

* par la suite nous verrons les adaptations du curseur en fonction du mode et de la portée
* les arme à animation multiples (aleatoire ou conditionnelle)
* les armes à chargement progressifs (type plasma de 40k ou gauss de fallout 4)
* les armes qui surcharge (degats) ou s'enraille
* le mode auto-targeting ou le joueur n'a pas besoin de viser avec son curseur et ca selectionne automatiquement l'ennemi le plus proche à portée.
* (Vecteur continu vers le curseur) : La balle part de la position du joueur directement vers la coordonnée (x, y) du clic souris (balistique fluide).
* Gestion des obstacles : La balle doit s'arrêter net si elle rencontre un mur bloquant (!$gameMap.isPassable) ou un obstacle de la couche R. Si elle n'atteint pas sa cible du coup pas d'impact
* Arme de corp à corps à energie et rechargement (epee energetique, sabre de feu ou laser...)
* voir les lance flammes
* grenades et mines
* reorganisé les composite par dossier plutot qu'avec des noms à rallonge

