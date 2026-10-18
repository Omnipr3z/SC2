# Navigation & Quetes

Dans la precedente version de SCE, j'avait mis au point un system de navigation spatiale.
Pour commmencer on va revoir l'existant et je voudrais que tu m'en fasse une review.

C:\SERVER\htdocs\SimCraft\SCE\project\js\plugins\simcraft\modules\galaxy\

Retour de review

La methode Number.prototype.approach je l'avait faite parce que je trouve que cette methode manque au js natif et je m'en sert dans plein de plugin. Je sais que ce n'est pas une bonne pratique mais rmmz le fait donc... Neanmoins on pourrait greffer ca à une classe Utils (je crois qu'il y en a une de base dans rmmz)

Dans la version sce je croit que je n'avait fait que la scene de voyage dans le system. Il faudrait une scene de voyage entre les differents system dans une scene dedié et la possibilité de passer en subsystem et en system via l'interface. J'avait deja beaucoup complexifié le moteur. Et j'avait relié beaucoup de systeme au simple voyage. La Game_Date c'est pratique et ca reservira on peut l'importer. La gestion des indicateur de quete aussi. Il me faudrait un point de tout les system annexes que j'avais relié au voyage spatiale dans l'ancienne version pour decidé ce qu'on garde et ce qu'on met en suspend.

1. Système Temporel & Calendrier

On adapte c'est assez simple et pratique pour le futur.

2. StoryManager & 3. Balise de quetes

Ca servira au journal de quete c'est un essentiel. Mais il faudra bien concervé la separation des responsabilités: le StoryManager (declenche temporellement les quetes) du QuestManager (repertorie et surveille l'avancement). Biensure il faudra que les indicateur soient present sur les map galactique et sectoriel.

4. Parralaxes

A faire mais pas prioritaire on met en suspend pour l'instant.

5. Console et compartiment du vaisseau

Pas prioritaire non plus de toute façon on commence la demo dans un petit vaisseau et il faudra adapter selon les vaisseaux du coup on suspend.

6. Moteur Carburant

Oui ca s'etait cool on garde

7. 8. 9. Capitaine Ressources & UI

Ca ca devra etre repensé pour l'instant Tu peux garder mais on devra ameliorer ca.

## Transition entre les niveaux

Sur la map galactique les differents systeme sont representés par des etoiles reliés par de lignes (genre consteallation ftl ou starbound) lorsque le vaiseau voyage entre plusieurs system il ne pas changer de niveau. En quittant la scene il se retrouve dans le vaisseau.

Si il se trouve sur une étoile/systeme, en cliquant il peut utiliser un bouton zoom in et passer à la partie systeme. Pour la transition galactique->system un zoomin avec fade.

Pareille si il est sur en orbite d'une planete ou d'un point precis il peut passer au subsystem. La transition c'est un zoom

La map de subsystem sera la planet zoomé avec des indicateur de point of interest (sprites children?) mais aucune interaction sur le system de voyage spatiale. Pour atterir ca se passera ailleurs. Le perso devra aller jusqu'au hangar (via la scene_map) et selectionner son vaisseau pour atterir. Là ca ouvrira la scene_subsytem avec l'option atterir mais pas l'option de zoomout vers le system.

Les partie system et Subsystem auront aussi l'option de zoomout pour revenir au niveau superieur.

Les touche page haut et page bas pourront aussi servir (elles sont dejà referencé dans rmmz vanilla).


Aussi:
* La localisation des quetes doit etre plus precise et indiqué le sytem, le subsystem et le point of interest. Les quetes peuvent avoir des localisations multiples (par ex il faut se rendre à plusieurs endroits ou recuperer un items qui se trouve à plusieurs endroits ou un choix de resolution). Ainsi il faut pouvoir activé désactiver les localisation au fil de l'accomplissement.
* Les deplacement doivent etre persistant hors de la scene. Lorsque le joueur quitte la scene les deplacement du vaisseau doivent continuer sur la scene_map en aveugle. Comme ca il peut vaquer à d'autre occupation pendant le voyage.
* Lorsque le vaisseau est en deplacement sur le system et que le joueur clic sur un autre system pour y voyagé le vaiseau passe immédiatement en vol intersystem et les deplacement intra system sont abandonnés. Un message d'avertissmeent serait bien.
* Les system doivent disposer d'un point d'arrivée ou le vaisseau y est automatiquement placé à l'arrivée dans le systeme

Revus de test:

* Les icons de quetes sont beaucoup trop gros. Il doivent etre  4 fois plus petits.
* J'avais aussi mis un effet d'animation dessus. Je veux grossi et degrossi legerement et fade out en degrossisement fadein en grossissant (cligontement pas trop rapide).
* Les icone de quete sont afffiché au dessus de la cible. J'avais fait qu'ils soient centré sur elles.
* Je ne peux pas acceder au subsysteme d'Ankaros Prime meme en orbite. Meme avec l'interface de voyage je devrais pouvoir malgré qu'il n'y ai pas d'option d'atterrisage. Si cette partie n'est pas faite autant la faire maintenant.
* Les points of interest doivent etre ajouter au json des planets
* Il faut une interface rapide pour acceder a la scene desubsector avec l'option d'atterrissage depuis la scene_map 

Puisque j'y pense il faut reflechir au contact avec les vaisseaux autres. Mais pas tout de suite on le fait propose moi juste des strategies.

Revus 2:
Petit point hors sujet:
- La scene_title doit avoir sa propre police pas celle par defaut du jeu. Elle doit pouvoir etre parametrée en parametre de plugin comme pour bubbleMsg

Tu as pris des initiative que je n'ai pas demandé.
- Je t'ai dis que je voulais que les subsystem soit accessible en orbite pas autrement. Pourquoi tu as changer ca.
- Pourquoi tu as ajusté la vitesse je ne t'ai rien demandé
- pour l'acces rapide je parlais pas d'une touche du clavier je parlais d'un methode interface que je peux utiliser dans un event sur la map du hangar.
- pour les POI il faut les repertorié dans le planêtes pas dans les quetes ! Dans les quete il doit y avoir juste une reference au POI. C'est plus simple.
- les POI corresponde à des maps ingame (du coup elle doivent figurer dans leur data) et aussi un id d'event à activer pour l'atterrissage (par defaut 1). Lorsque le joueur atterir ca le rend invisible, ca le teleporte sur la map indiquée et ca active le selfswitch A de l'event indiqué dans les data du POI.
- Dans l'interface de sous secteur, sur la fenetre qui decrit le sous secteur, si il y a une quete active elle doit y etre inscrite. De meme l'icon qui pointe le POI dit etre masqué si un indicateur de quete s'y trouve deja (pas la peine de superposer les icones)

Question:
- Pour les vaisseau tiers, sont ils affiché sur les scene de voyage pour l'instant ?
- Je voudrais que comme pour les planete on puisse se mettre en orbite sauf que pour le texte "En contact".

Revue 3:

- Les pOI hors quetes doivent etre aussi dimensionné à 0.25%
- Dans la vu subsystem l'image du vaisseau doit aussi etre affichée mais a coté de la planete centrale pas dessus.
- Petit point sur les POI en mode vu subsystem. La planete etant en rotation les POI doivent suivre cette rotation du coup. 
- sur la scene galactique ca serait bien de voir le vaiseaus se deplacer sur les ligne pendant le saut warp.
- Je voudrais que le temps continue de passer meme quand le vaisseau est statique ou en orbite. Il doit juste s'accelérer quand le vaisseau est en mouvement. La rotation de planete doit s'aligné sur le temps de Game_Date. Le temps ne doit donc plus passer en fonction du mouvement.
- Dans l'update de la scene_map je voudrais aussi que le temps de Game_Date passe
