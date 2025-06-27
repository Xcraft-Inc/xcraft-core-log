# 📘 xcraft-core-log

## Aperçu

Le module `xcraft-core-log` est le système de journalisation central du framework Xcraft. Il fournit une interface unifiée pour la gestion des logs avec support de différents niveaux de verbosité, filtrage par modules, coloration syntaxique, et intégration avec les systèmes de bus et de journalisation persistante de Xcraft.

## Sommaire

- [Structure du module](#structure-du-module)
- [Fonctionnement global](#fonctionnement-global)
- [Exemples d'utilisation](#exemples-dutilisation)
- [Interactions avec d'autres modules](#interactions-avec-dautres-modules)
- [Configuration avancée](#configuration-avancée)
- [Détails des sources](#détails-des-sources)

## Structure du module

Le module est organisé autour de plusieurs composants principaux :

- **Logger principal** (`lib/index.js`) : Classe `Log` qui gère l'affichage et la distribution des messages
- **Interface bus** (`buslog.js`) : Commandes exposées sur le bus Xcraft pour contrôler le logging à distance
- **Configuration** (`config.js`) : Options configurables via `xcraft-core-etc`

Le système supporte 5 niveaux de log : `verb` (0), `info` (1), `warn` (2), `err` (3), et `dbg` (4).

## Fonctionnement global

Le logger fonctionne selon un modèle d'événements où chaque instance de `Log` :

1. **Filtre les messages** selon le niveau de verbosité et les modules autorisés
2. **Formate les messages** avec coloration, horodatage et identification du module
3. **Distribue les logs** vers différentes sorties :
   - Console standard (stdout/stderr)
   - Bus Xcraft ([xcraft-core-buslog]) pour la supervision
   - Journal persistant ([xcraft-core-journal]) pour l'archivage

Le système détecte automatiquement le module appelant en analysant la pile d'appels et peut filtrer les logs par nom de module. La détection se base sur le pattern `xcraft-[type]-[nom]` dans le chemin du fichier.

## Exemples d'utilisation

### Utilisation basique dans un module

```javascript
const xLog = require('xcraft-core-log')('mon-module');

// Différents niveaux de log
xLog.verb('Message de débogage détaillé');
xLog.info('Information générale');
xLog.warn('Avertissement important');
xLog.err('Erreur critique');
xLog.dbg('Debug technique');

// Vérification du niveau avant log coûteux
if (xLog.isVerb()) {
  xLog.verb('Calcul complexe: %j', calculComplexe());
}
```

### Affichage de tableaux

```javascript
const data = [
  {nom: 'Alice', age: 30, ville: 'Paris'},
  {nom: 'Bob', age: 25, ville: 'Lyon'},
];

xLog.info.table(data);
// Affiche un tableau formaté avec bordures ASCII
```

### Configuration de verbosité locale

```javascript
const xLog = require('xcraft-core-log')('mon-module');

// Verbosité locale (ne s'applique qu'à cette instance)
xLog.setVerbosity(2, true); // Seuls warn et err seront affichés

// Désactiver la décoration pour cette instance
xLog.setDecorate(false, true);
```

### Gestion des erreurs avec contexte Goblin

```javascript
const errorWithContext = {
  _xcraftOverwatch: true,
  err: 'Erreur dans le traitement',
  goblin: {
    id: 'user-123',
    goblin: 'user',
    quest: 'updateProfile',
    callerGoblin: 'desktop',
    callerQuest: 'handleUserAction',
  },
};

xLog.err(errorWithContext);
// Affiche l'erreur avec la pile d'appels Goblin complète
```

### Contrôle via le bus Xcraft

```javascript
// Depuis un autre module via le bus
await this.quest.cmd('buslog.enable', {modes: ['event', 'overwatch']});
await this.quest.cmd('buslog.verbosity', {level: 1});
await this.quest.cmd('buslog.modulenames', {modulenames: ['user', 'desktop']});
```

## Interactions avec d'autres modules

### Avec xcraft-core-buslog

Le module s'intègre automatiquement avec [xcraft-core-buslog] pour :

- Transmettre les logs via le bus Xcraft
- Supporter les modes de supervision (event, overwatch)
- Permettre le contrôle à distance du logging
- Afficher des barres de progression

### Avec xcraft-core-journal

Intégration optionnelle pour la persistance des logs :

- Sauvegarde automatique des logs en fichier
- Configuration via `journalize: true`
- Chargement différé du module journal

### Avec xcraft-core-etc

Utilise le système de configuration pour :

- Charger les paramètres de logging au démarrage
- Appliquer les modes et filtres configurés
- Gérer la configuration interactive

### Avec xcraft-core-host

Récupère automatiquement :

- L'identifiant d'application (`appId`)
- Le nom de la tribu pour les commandes spécialisées
- Gestion gracieuse si le module n'est pas disponible

## Configuration avancée

| Option       | Description                              | Type      | Valeur par défaut |
| ------------ | ---------------------------------------- | --------- | ----------------- |
| `journalize` | Active la sauvegarde des logs en fichier | `boolean` | `false`           |
| `modes`      | Modes buslog à activer au démarrage      | `array`   | `[]`              |

## Détails des sources

### `lib/index.js`

Le fichier principal expose une factory qui crée des instances de logger pour chaque module. La classe `Log` hérite d'`EventEmitter` et fournit un système de logging complet avec détection automatique du module appelant.

#### État et modèle de données

Chaque instance de `Log` maintient :

- `_moduleName` : Nom du module propriétaire
- `_currentLevel` : Niveau de verbosité local (-1 = utilise le niveau global)
- `_currentDecorate` : Activation locale de la décoration (null = utilise le paramètre global)
- `_busLog` : Instance du logger bus (chargement différé)
- `_journal` : Instance du journal persistant (chargement différé)
- `_resp` : Objet de réponse pour les commandes bus

Variables globales :

- `currentModulesNames` : Liste des modules autorisés pour le filtrage
- `currentLevel` : Niveau de verbosité global (0-3)
- `currentUseColor` : Activation de la coloration syntaxique
- `currentUseDatetime` : Activation de l'horodatage
- `currentDecorate` : Activation de la décoration des messages

#### Méthodes publiques

- **`verb(format, ...args)`** — Log de niveau verbose (0), pour les détails de débogage. Supporte également `verb.table(data)` pour l'affichage tabulaire.
- **`info(format, ...args)`** — Log informatif (1), pour les messages généraux. Supporte également `info.table(data)` pour l'affichage tabulaire.
- **`warn(format, ...args)`** — Log d'avertissement (2), pour les situations suspectes. Supporte également `warn.table(data)` pour l'affichage tabulaire.
- **`err(format, ...args)`** — Log d'erreur (3), pour les erreurs critiques. Supporte également `err.table(data)` pour l'affichage tabulaire.
- **`dbg(format, ...args)`** — Log de debug (4), pour le débogage technique. Supporte également `dbg.table(data)` pour l'affichage tabulaire.
- **`isVerb()`, `isInfo()`, `isWarn()`, `isErr()`** — Teste si le niveau correspondant est actif
- **`progress(topic, position, length)`** — Affiche une barre de progression via buslog
- **`setVerbosity(level, onlyLocal)`** — Définit le niveau de verbosité (0-3)
- **`setDecorate(decorate, onlyLocal)`** — Active/désactive la décoration des messages
- **`setResponse(resp)`** — Définit l'objet de réponse pour les commandes bus
- **`color(useColor)`** — Active/désactive la coloration syntaxique globalement
- **`datetime(useDatetime)`** — Active/désactive l'horodatage globalement
- **`getModule()`** — Retourne le nom complet du module avec détection automatique du fichier appelant
- **`getLevels()`** — Retourne la liste des niveaux disponibles en minuscules
- **`getModuleName()`** — Retourne le nom du module configuré

#### Méthodes statiques du module

- **`setEnable(enable, modes)`** — Active/désactive le buslog avec modes optionnels
- **`setModuleNames(moduleNames)`** — Configure le filtrage global par noms de modules
- **`setGlobalVerbosity(level)`** — Définit le niveau de verbosité global

### `buslog.js`

Interface de commandes exposées sur le bus Xcraft pour contrôler le logging à distance. Le module génère automatiquement des commandes génériques et spécialisées par application.

#### Méthodes publiques

- **`enable(modes)`** — Active le buslog avec les modes spécifiés (optionnel)
- **`disable(modes)`** — Désactive le buslog pour les modes spécifiés (optionnel)
- **`modulenames(modulenames)`** — Configure le filtrage par noms de modules
- **`verbosity(level)`** — Définit le niveau de verbosité global (requis)

Chaque commande existe en version générique (`buslog.enable`) et spécialisée par application (`${appId}${tribe}.enable`). Toutes les commandes supportent l'exécution en parallèle et envoient un événement de fin d'exécution.

---

_Ce document a été mis à jour pour refléter la structure actuelle du module._

[xcraft-core-buslog]: https://github.com/Xcraft-Inc/xcraft-core-buslog
[xcraft-core-journal]: https://github.com/Xcraft-Inc/xcraft-core-journal
[xcraft-core-etc]: https://github.com/Xcraft-Inc/xcraft-core-etc