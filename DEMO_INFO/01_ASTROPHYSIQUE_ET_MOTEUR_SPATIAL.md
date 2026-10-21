# 🌌 SimCraft Engine (SC4) — Carnet Scientifique & Didactique
## Volet 1 : L'Astrophysique du Moteur Spatial — Entre Rigueur Scientifique et Confort de Jeu

> *"La science-fiction n'est pas seulement une évasion vers l'imaginaire, c'est un pont jeté entre les lois immuables de l'Univers et la soif humaine de contemplation et de découverte."*

---

### 1. Introduction : La Démarche de Hard Sci-Fi Accessible

SimCraft 4 (SC4) est pensé comme une œuvre de **science-fiction immersive et sensorielle**. Contrairement aux jeux d'action spatiale purement "arcade" où les planètes sont de simples décors statiques en arrière-plan, SimCraft simule un **univers stellaire dynamique, déterministe et cohérent**.

Ce document explicite les fondements physiques et astrophysiques réels qui ont servi de socle au moteur de jeu, tout en expliquant en toute transparence les compromis visuels et ergonomiques indispensables adoptés pour que l'expérience reste jouable, belle et captivante.

Cette approche a une **réelle portée didactique** : elle offre aux élèves, collégiens et passionnés de sciences un modèle interactif vivant pour appréhender la mécanique céleste.

---

### 2. L'Unité Astronomique (UA) : De la Réalité à l'Écran

#### Dans la Réalité Astronomique :
Dans notre système solaire, mesurer les distances interplanétaires en kilomètres donnerait des chiffres gigantesques et illisibles (la Terre se trouve à environ $149\,597\,870\text{ km}$ du Soleil). Les astronomes ont donc défini l'**Unité Astronomique (UA)** comme la distance moyenne entre la Terre et son étoile.
- $1\text{ UA} \approx 150\text{ millions de km}$.
- Mercure est à environ $0{,}39\text{ UA}$.
- Jupiter est à environ $5{,}2\text{ UA}$.
- Neptune est à environ $30\text{ UA}$.

#### Dans SimCraft 4 :
Pour donner une consistance "in-lore" crédible sans perdre le joueur dans des coordonnées abstraites, SimCraft standardise l'échelle spatiale suivante :
$$1\text{ UA} = 100\text{ pixels d'écran}$$

La carte d'un système planétaire ($1600 \times 1200\text{ px}$) représente ainsi une sphère d'influence stellaire d'environ $16 \times 12\text{ UA}$. Les vitesses des navires spatiaux sont également calculées dans cette métrique (ex: $0{,}8\text{ UA/h}$ en propulsion conventionnelle).

---

### 3. La 3ème Loi de Kepler : Pourquoi les Planètes Extérieures sont Lentes

#### Le Principe Physique :
Johannes Kepler a découvert au XVIIe siècle que **plus une planète est éloignée de son étoile, plus elle met de temps à accomplir son orbite**, non seulement parce que le périmètre de son orbite est plus grand, mais aussi parce que sa vitesse orbitale réelle diminue sous l'effet d'une gravité stellaire plus faible :
$$\frac{T^2}{a^3} = \text{constante}$$
*(où $T$ est la période de révolution et $a$ le demi-grand axe de l'orbite).*

Dans la réalité :
- Mercure fait le tour du Soleil en **88 jours**.
- La Terre en **365 jours** (1 an).
- Jupiter en **12 ans** terrestres.
- Neptune en **165 ans** terrestres !

#### L'Application dans SimCraft :
Pour rompre avec les coefficients aléatoires des prototypes où des planètes tournaient en quelques heures absurdes, SC4 applique une hiérarchie keplerienne harmonieuse adaptée à l'échelle temporelle d'un jeu vidéo :
1. **Planètes telluriques intérieures ($1{,}5$ à $2{,}8\text{ UA}$)** :
   - Année courte : **60 à 110 jours virtuels**.
   - Le joueur perçoit leur déplacement lors des voyages rapides.
2. **Planète médiane de référence (Neotori Prime à $3{,}7\text{ UA}$)** :
   - Calée sur l'étalon d'or : **exactement 360 jours virtuels** (l'année civile du calendrier Neotori).
3. **Géantes gazeuses extérieures ($4{,}8$ à $6{,}5\text{ UA}$)** :
   - Année majestueuse : **650 à 1 800 jours virtuels**.
   - Les géantes se meuvent avec une lenteur solennelle, renforçant le sentiment de gigantisme de l'espace.

---

### 4. Compromis Visuel : Pourquoi les Astres ne sont pas à l'Échelle Réelle

C'est ici que le jeu vidéo s'écarte sciemment de la réalité pour des impératifs d'ergonomie et d'esthétique.

#### Le Problème de l'Échelle Réelle :
Dans la réalité cosmique, **l'espace est composé à 99,99999% de vide absolu**.
- Le Soleil a un diamètre de $1\,392\,700\text{ km}$ (109 fois celui de la Terre).
- La Terre a un diamètre de $12\,742\text{ km}$.
- La Lune a un diamètre de $3\,474\text{ km}$ (environ 4 fois plus petite que la Terre).

Si nous appliquions strictement l'échelle réelle sur un écran d'ordinateur :
- Si l'étoile centrale faisait 300 pixels...
- La planète habitable ne ferait que **2,7 pixels** !
- Et sa lune ferait **0,7 pixel** (un simple point invisible) !
- Quant aux distances, la planète devrait être placée à plus de **30 mètres hors de votre écran** !

#### Le Choix Assumé de SimCraft :
1. **L'Étoile centrale est sous-dimensionnée** :
   - Zoom entre $0{,}6$ et $0{,}95$. Elle reste imposante et lumineuse mais n'écrase pas tout l'écran.
2. **Les Planètes sont dimensionnées pour la contemplation** :
   - Zoom entre $0{,}16$ et $0{,}28$ (soit $55$ à $100\text{ px}$). Leurs textures, atmosphères et reliefs sont nettement visibles et appréciables.
3. **Les Lunes et Satellites sont volontairement surdimensionnées** :
   - Zoom passé de $0{,}05$ (~18px) à **$0{,}12$ (~43px)**.
   - **Pourquoi ?** Parce qu'un satellite naturel dans SimCraft abrite des mines, des bases secrètes ou des avant-postes. Pour un confort de jeu optimal, il est indispensable que le joueur puisse distinguer la texture de la lune et cliquer dessus avec sa souris confortablement, **sans risque de "miss-click"**.
4. **Les Stations orbitales et Relais conservent une échelle humaine** :
   - Zoom entre $0{,}05$ et $0{,}08$ pour que leur silhouette artificielle contraste nettement avec les astres naturels.

---

### 5. L'Heure Solaire Locale & Le Cycle Jour/Nuit au Débarquement

#### Le Principe 2D de Phase Solaire :
Sur Terre, lorsqu'il est midi à Paris, il est minuit à l'autre bout du monde en Nouvelle-Zélande. Le jour et la nuit dépendent exclusivement de l'orientation de notre face planétaire par rapport aux rayons du Soleil.

SimCraft reproduit ce phénomène par un calcul trigonométrique pur en deux dimensions :
1. Vecteur directeur entre l'Étoile $(cx, cy)$ et la Planète $(px, py)$ :
   $$\theta_{\text{soleil}} = \text{atan2}(cy - py, cx - px)$$
2. Angle instantané du Point d'Intérêt (POI) à la surface :
   $$\theta_{\text{poi}} = \theta_{\text{base}} + \text{Angle}_{\text{rotation}}(t)$$
3. Déphasage relatif $\Delta\theta = \theta_{\text{poi}} - \theta_{\text{soleil}}$ :
   - Si $\Delta\theta \approx 0$ : Le POI fait face à l'étoile $\implies$ **12h00 (Plein Midi)**.
   - Si $\Delta\theta \approx \pm\pi$ : Le POI est tourné vers le vide stellaire $\implies$ **00h00 (Minuit)**.
   - Si $\Delta\theta \approx -\pi/2$ : La rotation amène le POI vers la lumière $\implies$ **06h00 (Aube)**.
   - Si $\Delta\theta \approx +\pi/2$ : Le POI bascule dans l'ombre $\implies$ **18h00 (Crépuscule)**.

Lors du débarquement, le moteur applique immédiatement la teinte atmosphérique RMMZ correspondante (`$gameScreen.startTint`).

---

### 6. La Loi en Carré Inverse & L'Obscurité des Ceintures d'Astéroïdes

#### Pourquoi les Belts et Stations lointaines n'ont pas de cycle Jour/Nuit :
La luminosité d'une étoile décroît selon le carré de la distance :
$$I \propto \frac{1}{d^2}$$
À la périphérie d'un système stellaire (dans les ceintures de glace ou d'astéroïdes analogues à notre ceinture de Kuiper), la lumière de l'étoile centrale est si affaiblie qu'elle n'éclaire plus qu'à la manière d'une grosse étoile brillante dans un ciel noir d'encre.

De plus, un astéroïde n'a pas d'atmosphère pour diffuser la lumière. En conséquence :
- SimCraft applique une **ambiance lumineuse fixe** (`fixedTint`) pour les ceintures et les stations spatiales.
- Le sol y baigne en permanence dans l'**obscurité froide du vide spatial** ou sous des **éclairages industriels artificiels**.

---

### 7. Résumé Pédagogique

| Concept Réel | Dans la Nature | Dans SimCraft 4 | Raison du Choix |
| :--- | :--- | :--- | :--- |
| **Distance** | Unité Astronomique (UA = 150M km) | $1\text{ UA} = 100\text{ px}$ | Lisibilité & repérage intuitif |
| **Orbite** | 3ème Loi de Kepler ($T^2 \propto a^3$) | Hiérarchie (60j int. $\rightarrow$ 360j Neotori $\rightarrow$ 1500j ext.) | Réalisme temporel immersif |
| **Dimensions** | Soleil = 109x Terre, Terre = 4x Lune | Étoiles réduites, Lunes agrandies ($0{,}12$) | Cliquabilité souris & texture visible |
| **Jour/Nuit** | Rotation axiale face au Soleil | Phase angulaire 2D $\Delta\theta$ | Continuité immédiate Sol / Espace |
| **Espace Lointain** | Atténuation en $1/d^2$, pas d'air | Ambiance fixe sombre (`[-40, -35, -20, 90]`) | Réalisme atmosphérique & tension |
