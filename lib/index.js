'use strict';

const mainModuleName = 'xcraft';

const path = require('path');
const util = require('util');
const EventEmitter = require('events').EventEmitter;

const clc = require('cli-color');

let currentModulesNames = [];
let currentLevel = 0;
let currentUseColor = true;
let currentUseDatetime = false;
let currentDecorate = true;

const levelsText = ['Verb', 'Info', 'Warn', 'Err', 'Dbg'];
const levels = {
  true: [
    clc.cyanBright.bold(levelsText[0]),
    clc.greenBright.bold(levelsText[1]),
    clc.yellowBright.bold(levelsText[2]),
    clc.redBright.bold(levelsText[3]),
    clc.magentaBright.bold(levelsText[4]),
  ],
  false: levelsText,
};
let xBusLog = null;
let xJournal = null;
let modesInitialized = false;

// http://stackoverflow.com/a/29581862
function getCallerFile() {
  const originalFunc = Error.prepareStackTrace;

  let callerfile;
  try {
    const err = new Error();
    let currentfile;

    Error.prepareStackTrace = function (err, stack) {
      return stack;
    };

    currentfile = err.stack.shift().getFileName();

    while (err.stack.length) {
      callerfile = err.stack.shift().getFileName();

      if (currentfile !== callerfile) {
        break;
      }
    }
  } catch (ex) {
    /* ignore exceptions */
  }

  Error.prepareStackTrace = originalFunc;
  return callerfile;
}

function Log(mod, resp) {
  EventEmitter.call(this);
  /** @private */ this._moduleName = mod;
  /** @private */ this._currentLevel = -1;
  /** @private */ this._currentDecorate = null;
  /** @private */ this._busLog = null;
  /** @private */ this._journal = null;
  /** @private */ this._resp = resp;

  const table = (level, table) => {
    const asTable = require('as-table');
    this._log(level, '%s', asTable.configure({dash: '-'})(table));
  };

  this.__proto__.verb.table = function (data) {
    table(0, data);
  }.bind(this);

  this.__proto__.info.table = function (data) {
    table(1, data);
  }.bind(this);

  this.__proto__.warn.table = function (data) {
    table(2, data);
  }.bind(this);

  this.__proto__.err.table = function (data) {
    table(3, data);
  }.bind(this);

  this.__proto__.dbg.table = function (data) {
    table(4, data);
  }.bind(this);
}

util.inherits(Log, EventEmitter);

/** @private */
Log.prototype._testLevel = function (level) {
  if (this._currentLevel >= 0) {
    return level >= this._currentLevel;
  }
  return level >= currentLevel;
};

/** @private */
Log.prototype._loadBusLog = function () {
  if (!xBusLog) {
    initModes();
    this._busLog = null;
    return 0;
  }

  if (this._busLog) {
    return xBusLog.getModes();
  }

  if (!this._resp) {
    return 0;
  }

  if (xBusLog) {
    this._busLog = xBusLog(this, this._resp);
    return xBusLog.getModes();
  }

  return 0;
};

/** @private */
Log.prototype._loadJournal = function () {
  if (xJournal === false) {
    this._journal = null;
    return false;
  }

  if (this._journal) {
    return true;
  }

  journalize();
  if (xJournal) {
    this._journal = xJournal(this);
    return true;
  }

  return false;
};

Log.prototype.getModule = function () {
  let module = this._moduleName;

  const callerFile = getCallerFile();
  let caller = callerFile.replace(/.*xcraft-[a-z]+-([a-z0-9]+).*/, '$1');

  if (caller === callerFile) {
    caller = path.basename(callerFile).replace(/\.js$/, '');
  }

  if (this._moduleName && this._moduleName.search(caller) === -1) {
    module += `/${caller}`;
  }

  return module;
};

/** @private */
Log.prototype._log = function (level, format, ...params) {
  this._loadJournal();
  const busModes = this._loadBusLog();
  const testLevel = this._testLevel(level);
  let mustContinue = false;

  if (xBusLog) {
    mustContinue = level === 3 && busModes & xBusLog.modes.overwatch;
    if (!mustContinue) {
      mustContinue = busModes & xBusLog.modes.event;
    }
  }
  if (!mustContinue) {
    mustContinue = testLevel;
  }

  if (!mustContinue) {
    return;
  }

  if (
    currentModulesNames.length &&
    !currentModulesNames.includes(this._moduleName.replace(/[./].*/, ''))
  ) {
    return;
  }

  const whiteBrightBold = (str) =>
    currentUseColor ? clc.whiteBright.bold(str) : str;
  const white = (str) => (currentUseColor ? clc.white(str) : str);

  if (!format) {
    format = '';
  }

  let overwatch = null;
  if (typeof format === 'object') {
    if (format._xcraftOverwatch) {
      overwatch = format;
      format = overwatch.err;
      if (overwatch.goblin) {
        format +=
          `\n Goblin callstack` +
          `\n    id     = ${overwatch.goblin.id}` +
          `\n    quest  = ${overwatch.goblin.goblin}.${overwatch.goblin.quest}`;
        if (overwatch.goblin.callerGoblin) {
          format += `\n    caller = ${overwatch.goblin.callerGoblin}.${overwatch.goblin.callerQuest}`;
        }
      }
    } else {
      format = util.inspect(format);
    }
  }

  format = format.replace(/\n$/, '');

  const mod = this.getModule();
  const xcraft = mainModuleName;
  const time = new Date().toISOString();
  let args = [
    white(xcraft + ' [%s]%s%s: ') + format,
    whiteBrightBold(mod),
    currentUseDatetime ? ' (' + time.toISOString() + ') ' : ' ',
    levels[currentUseColor][level],
  ];

  args = args.concat(params);

  this.emit(this.getLevels()[level], {
    module: mod,
    moduleName: this._moduleName,
    time: time,
    message: util.format(format, ...params),
    rawArgs: args,
    decorate:
      this._currentDecorate !== null ? this._currentDecorate : currentDecorate,
    overwatch,
  });
};

Log.prototype.verb = function (...args) {
  this._log(0, ...args);
};

Log.prototype.isVerb = function () {
  return this._testLevel(0);
};

Log.prototype.info = function (...args) {
  this._log(1, ...args);
};

Log.prototype.isInfo = function () {
  return this._testLevel(1);
};

Log.prototype.warn = function (...args) {
  this._log(2, ...args);
};

Log.prototype.isWarn = function () {
  return this._testLevel(2);
};

Log.prototype.err = function (...args) {
  this._log(3, ...args);
};

Log.prototype.isErr = function () {
  return this._testLevel(3);
};

Log.prototype.dbg = function (...args) {
  this._log(4, ...args);
};

Log.prototype.progress = function (topic, position, length) {
  if (!this._busLog) {
    this._loadBusLog();
  }

  if (this._busLog) {
    this._busLog.progress(topic, position, length);
  }
};

Log.prototype.setDecorate = function (decorate, onlyLocal) {
  if (onlyLocal) {
    this._currentDecorate = !!decorate;
  } else {
    currentDecorate = !!decorate;
  }
};

Log.prototype.setVerbosity = function (level, onlyLocal) {
  if (level < 0 || level > 3) {
    return;
  }

  if (onlyLocal) {
    this._currentLevel = level;
  } else {
    currentLevel = level;
  }
};

Log.prototype.setResponse = function (resp) {
  this._resp = resp;
};

Log.prototype.color = function (useColor) {
  currentUseColor = useColor;
};

Log.prototype.datetime = function (useDatetime) {
  currentUseDatetime = useDatetime;
};

Log.prototype.getLevels = function () {
  return levelsText.map(function (level) {
    return level.toLowerCase();
  });
};

Log.prototype.getModuleName = function () {
  return this._moduleName;
};

module.exports = function (mod, resp) {
  const logger = new Log(mod, resp);

  logger.getLevels().forEach((level, index) => {
    logger.on(level, (msg) => {
      if (logger._testLevel(index)) {
        const message = msg.decorate ? msg.rawArgs : [msg.message];
        if (level === 3) {
          console.error.apply(console.error, message);
        } else {
          console.log.apply(console.log, message);
        }
      }
    });
  });

  return logger;
};

function initModes() {
  if (modesInitialized === true) {
    return;
  }

  const xEtc = require('xcraft-core-etc')();
  if (!xEtc) {
    return;
  }

  modesInitialized = true;
  const logConfig = xEtc.load('xcraft-core-log');
  if (logConfig && logConfig.modes && logConfig.modes.length) {
    module.exports.setEnable(true, logConfig.modes);
  }
}

function journalize() {
  if (xJournal || xJournal === false) {
    return;
  }

  const xEtc = require('xcraft-core-etc')();
  if (!xEtc) {
    return;
  }

  xJournal = false;
  const logConfig = xEtc.load('xcraft-core-log');
  if (logConfig && logConfig.journalize) {
    try {
      xJournal = require('xcraft-core-journal');
    } catch (ex) {
      if (ex.code !== 'MODULE_NOT_FOUND') {
        throw ex;
      }
    }
  }
}

module.exports.setEnable = function (en, modes) {
  const changeModes = (modes) =>
    modes
      ? modes.reduce((flags, mode) => (flags |= xBusLog.modes[mode]), 0)
      : undefined;

  if (en && xBusLog) {
    xBusLog.addModes(changeModes(modes));
    return true;
  }
  if (!en && !xBusLog) {
    return false;
  }

  if (en) {
    try {
      xBusLog = require('xcraft-core-buslog');
      xBusLog.addModes(changeModes(modes));
    } catch (ex) {
      if (ex.code !== 'MODULE_NOT_FOUND') {
        throw ex;
      }
    }
  } else {
    xBusLog.delModes(changeModes(modes));
  }
  return en;
};

module.exports.setModuleNames = function (moduleNames) {
  if (moduleNames && !Array.isArray(moduleNames)) {
    moduleNames = [moduleNames];
  }
  currentModulesNames = moduleNames || [];
};

module.exports.setGlobalVerbosity = function (level) {
  if (level < 0 || level > 3) {
    return;
  }

  currentLevel = level;
};
