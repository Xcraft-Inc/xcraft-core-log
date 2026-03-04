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
- [Licence](#licence)

## Structure du module

Le module est organisé autour de plusieurs composants principaux :

- **Logger principal** (`lib/index.js`) : Classe `Log` qui gère l'affichage et la distribution des messages
- **Interface bus** (`buslog.js`) : Commandes exposées sur le bus Xcraft pour contrôler le logging à distance
- **Configuration** (`config.js`) : Options configurables via [`xcraft-core-etc`][xcraft-core-etc]

Le système supporte 5 niveaux de log : `verb` (0), `info` (1), `warn` (2), `err` (3), et `dbg` (4).

## Fonctionnement global

Le logger fonctionne selon un modèle d'événements où chaque instance de `Log` :

1. **Filtre les messages** selon le niveau de verbosité et les modules autorisés
2. **Formate les messages** avec coloration, horodatage et identification du module appelant
3. **Distribue les logs** vers différentes sorties :
   - Console standard (stdout/stderr)
   - Bus Xcraft ([xcraft-core-buslog]) pour la supervision
   - Journal persistant ([xcraft-core-journal]) pour l'archivage

Le système détecte automatiquement le module appelant en analysant la pile d'appels (`getCallerFile`) et peut filtrer les logs par nom de module. La détection se base sur le pattern `xcraft-[type]-[nom]` dans le chemin du fichier appelant.

Lors d'un log, le système évalue d'abord si le message doit être émis :

- Si le mode `overwatch` est actif sur le buslog, les erreurs (niveau 3) passent toujours
- Si le mode `event` est actif, tous les messages passent vers le bus
- Sinon, le niveau de verbosité courant détermine le filtrage

Les modules [xcraft-core-buslog] et [xcraft-core-journal] sont chargés de manière différée (lazy loading) au premier log qui les requiert.

## Exemples d'utilisation

### Utilisation basique dans un module

```javascript
const xLog = require('xcraft-core-log')('mon-module');

xLog.verb('Message de débogage détaillé');
xLog.info('Information générale');
xLog.warn('Avertissement important');
xLog.err('Erreur critique');
xLog.dbg('Debug technique');

// Vérification du niveau avant un calcul coûteux
if (xLog.isVerb()) {
  xLog.verb('Résultat complexe: %j', calculComplexe());
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

// Verbosité locale uniquement pour cette instance
xLog.setVerbosity(2, true); // Seuls warn et err seront affichés

// Désactiver la décoration pour cette instance
xLog.setDecorate(false, true);
```

### Gestion des erreurs avec contexte Goblin (overwatch)

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
// Depuis un acteur, via le bus
await this.quest.cmd('buslog.enable', {modes: ['event', 'overwatch']});
await this.quest.cmd('buslog.verbosity', {level: 1});
await this.quest.cmd('buslog.modulenames', {modulenames: ['user', 'desktop']});
await this.quest.cmd('buslog.disable', {modes: ['event']});
```

## Interactions avec d'autres modules

### Avec xcraft-core-buslog

Le module s'intègre automatiquement avec [xcraft-core-buslog] pour :

- Transmettre les logs via le bus Xcraft
- Supporter les modes de supervision (`event`, `overwatch`)
- Permettre le contrôle à distance du logging
- Afficher des barres de progression via `progress()`

### Avec xcraft-core-journal

Intégration optionnelle pour la persistance des logs :

- Sauvegarde automatique des logs en fichier
- Activée via l'option de configuration `journalize: true`
- Chargement différé du module journal au premier log

### Avec xcraft-core-etc

Utilise le système de configuration pour :

- Charger les paramètres de logging au démarrage (`initModes`, `journalize`)
- Appliquer les modes et filtres configurés
- Gérer la configuration interactive

### Avec xcraft-core-host

Récupère automatiquement lors du chargement de `buslog.js` :

- L'identifiant d'application (`appId`) pour nommer les commandes bus
- Le nom de la tribu (`tribe`) pour les commandes spécialisées
- Gestion gracieuse si le module n'est pas disponible (`MODULE_NOT_FOUND` ignoré)

## Configuration avancée

| Option       | Description                              | Type      | Valeur par défaut |
| ------------ | ---------------------------------------- | --------- | ----------------- |
| `journalize` | Active la sauvegarde des logs en fichier | `boolean` | `false`           |
| `modes`      | Modes buslog à activer au démarrage      | `array`   | `[]`              |

## Détails des sources

### `lib/index.js`

Le fichier principal expose une factory qui crée des instances de logger pour chaque module. La classe `Log` hérite d'`EventEmitter` et fournit un système de logging complet avec détection automatique du module appelant via l'analyse de la pile d'appels.

Chaque instance écoute ses propres événements de niveau (verb, info, warn, err, dbg) et écrit sur `console.log` ou `console.error` (pour le niveau `err`) selon que le message doit être décoré ou non.

#### État et modèle de données

**Variables d'instance (`Log`) :**

- `_moduleName` : Nom du module propriétaire
- `_currentLevel` : Niveau de verbosité local (`-1` = utilise le niveau global)
- `_currentDecorate` : Activation locale de la décoration (`null` = utilise le paramètre global)
- `_busLog` : Instance du logger bus (chargement différé)
- `_journal` : Instance du journal persistant (chargement différé)
- `_resp` : Objet de réponse pour les commandes bus

**Variables globales (partagées par toutes les instances) :**

- `currentModulesNames` : Liste des modules autorisés pour le filtrage
- `currentLevel` : Niveau de verbosité global (`0`–`3`)
- `currentUseColor` : Activation de la coloration syntaxique
- `currentUseDatetime` : Activation de l'horodatage ISO dans les messages
- `currentDecorate` : Activation de la décoration des messages

#### Méthodes publiques

- **`verb(format, ...args)`** — Log de niveau verbose (0) pour les détails fins. Supporte `verb.table(data)` pour l'affichage tabulaire ASCII.
- **`info(format, ...args)`** — Log informatif (1) pour les messages généraux. Supporte `info.table(data)`.
- **`warn(format, ...args)`** — Log d'avertissement (2) pour les situations suspectes. Supporte `warn.table(data)`.
- **`err(format, ...args)`** — Log d'erreur (3) pour les erreurs critiques. Supporte les objets `_xcraftOverwatch` pour enrichir le message avec le contexte Goblin. Supporte `err.table(data)`.
- **`dbg(format, ...args)`** — Log de debug (4) pour le débogage technique. Supporte `dbg.table(data)`.
- **`isVerb()`, `isInfo()`, `isWarn()`, `isErr()`** — Teste si le niveau correspondant est actif selon la verbosité courante.
- **`progress(topic, position, length)`** — Transmet une progression via buslog si disponible.
- **`setVerbosity(level, onlyLocal)`** — Définit le niveau de verbosité (0–3). Si `onlyLocal` est `true`, n'affecte que cette instance.
- **`setDecorate(decorate, onlyLocal)`** — Active/désactive la décoration des messages. Si `onlyLocal` est `true`, n'affecte que cette instance.
- **`setResponse(resp)`** — Définit l'objet de réponse pour l'intégration buslog.
- **`color(useColor)`** — Active/désactive la coloration syntaxique globalement.
- **`datetime(useDatetime)`** — Active/désactive l'affichage de l'horodatage ISO globalement.
- **`getModule()`** — Retourne le nom complet du module avec détection automatique du fichier appelant.
- **`getLevels()`** — Retourne la liste des niveaux disponibles en minuscules : `['verb', 'info', 'warn', 'err', 'dbg']`.
- **`getModuleName()`** — Retourne le nom du module tel que configuré à la création.

#### Méthodes statiques du module

- **`setEnable(enable, modes)`** — Active ou désactive le buslog avec des modes optionnels (chaînes correspondant aux clés de `xBusLog.modes`).
- **`setModuleNames(moduleNames)`** — Configure le filtrage global par noms de modules (tableau ou chaîne unique).
- **`setGlobalVerbosity(level)`** — Définit le niveau de verbosité global (0–3).

### `buslog.js`

Interface de commandes exposées sur le bus Xcraft pour contrôler le logging à distance. Ce fichier exporte `xcraftCommands` et est donc chargé automatiquement par le serveur Xcraft au démarrage.

Le module génère automatiquement des commandes en double : une version générique (`buslog.enable`) et une version spécialisée par application (`${appId}${tribe}.enable`), permettant de cibler une application précise dans un environnement multi-application.

Toutes les commandes sont déclarées `parallel: true` et envoient un événement `buslog.<name>.<id>.finished` à leur terme.

#### Commandes exposées

- **`enable(modes?)`** — Active le buslog avec les modes spécifiés (ex. `event`, `overwatch`). Les modes sont optionnels.
- **`disable(modes?)`** — Désactive le buslog pour les modes spécifiés. Les modes sont optionnels.
- **`modulenames(modulenames?)`** — Configure le filtrage des logs par noms de modules. Sans argument, réinitialise le filtre.
- **`verbosity(level)`** — Définit le niveau de verbosité global. Le paramètre `level` est requis.

## Licence

Ce module est distribué sous [licence MIT](./LICENSE).

---

_Ce contenu a été généré par IA_

[xcraft-core-buslog]: https://github.com/Xcraft-Inc/xcraft-core-buslog
[xcraft-core-journal]: https://github.com/Xcraft-Inc/xcraft-core-journal
[xcraft-core-etc]: https://github.com/Xcraft-Inc/xcraft-core-etc
