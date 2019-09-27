'use strict';

var mainModuleName = 'xcraft';

const path = require('path');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var clc = require('cli-color');

let currentModulesNames = [];
var currentLevel = 0;
var currentUseColor = true;
var currentUseDatetime = false;

var levelsText = ['Verb', 'Info', 'Warn', 'Err', 'Dbg'];
var levels = {
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

// http://stackoverflow.com/a/29581862
function getCallerFile() {
  const originalFunc = Error.prepareStackTrace;

  let callerfile;
  try {
    const err = new Error();
    let currentfile;

    Error.prepareStackTrace = function(err, stack) {
      return stack;
    };

    currentfile = err.stack.shift().getFileName();

    while (err.stack.length) {
      callerfile = err.stack.shift().getFileName();

      if (currentfile !== callerfile) {
        break;
      }
    }
  } catch (ex) {}

  Error.prepareStackTrace = originalFunc;
  return callerfile;
}

function Log(mod, resp) {
  EventEmitter.call(this);
  this._moduleName = mod;
  this._currentLevel = -1;
  this._busLog = null;
  this._resp = resp;
}

util.inherits(Log, EventEmitter);

Log.prototype._testLevel = function(level) {
  if (this._currentLevel >= 0) {
    return level >= this._currentLevel;
  }
  return level >= currentLevel;
};

Log.prototype._loadBusLog = function() {
  if (!xBusLog) {
    this._busLog = null;
    return false;
  }

  if (this._busLog) {
    return true;
  }

  if (!this._resp) {
    return false;
  }

  if (xBusLog) {
    this._busLog = xBusLog(this, this._resp);
    return true;
  }

  return false;
};

Log.prototype.getModule = function() {
  let module = this._moduleName;

  const callerFile = getCallerFile();
  let caller = callerFile.replace(/.*xcraft-[a-z]+-([a-z0-9]+).*/, '$1');

  if (caller === callerFile) {
    caller = path.basename(callerFile);
  }

  if (this._moduleName && this._moduleName.search(caller) === -1) {
    module += `/${caller}`;
  }

  return module;
};

Log.prototype._log = function(level, format, ...params) {
  const isBus = this._loadBusLog();

  /* Continue if busLog is available. */
  if (!isBus && !this._testLevel(level)) {
    return;
  }

  if (
    currentModulesNames.length &&
    !currentModulesNames.includes(this._moduleName.replace(/[./].*/, ''))
  ) {
    return;
  }

  var whiteBrightBold = function(str) {
    return currentUseColor ? clc.whiteBright.bold(str) : str;
  };

  if (typeof format === 'object') {
    format = util.inspect(format);
  }

  format = format.replace(/\n$/, '');

  const mod = this.getModule();
  var xcraft = mainModuleName;
  var time = new Date();
  var args = [
    xcraft + ' [%s]%s%s: ' + format,
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
  });
};

Log.prototype.verb = function(...args) {
  this._log(0, ...args);
};

Log.prototype.info = function(...args) {
  this._log(1, ...args);
};

Log.prototype.warn = function(...args) {
  this._log(2, ...args);
};

Log.prototype.err = function(...args) {
  this._log(3, ...args);
};

Log.prototype.dbg = function(...args) {
  this._log(4, ...args);
};

Log.prototype.progress = function(topic, position, length) {
  if (!this._busLog) {
    this._loadBusLog();
  }

  if (this._busLog) {
    this._busLog.progress(topic, position, length);
  }
};

Log.prototype.setVerbosity = function(level, onlyLocal) {
  if (level < 0 || level > 3) {
    return;
  }

  if (onlyLocal) {
    this._currentLevel = level;
  } else {
    currentLevel = level;
  }
};

Log.prototype.setResponse = function(resp) {
  this._resp = resp;
};

Log.prototype.color = function(useColor) {
  currentUseColor = useColor;
};

Log.prototype.datetime = function(useDatetime) {
  currentUseDatetime = useDatetime;
};

Log.prototype.getLevels = function() {
  return levelsText.map(function(level) {
    return level.toLowerCase();
  });
};

Log.prototype.getModuleName = function() {
  return this._moduleName;
};

module.exports = function(mod, resp) {
  var logger = new Log(mod, resp);

  logger.getLevels().forEach((level, index) => {
    logger.on(level, msg => {
      if (logger._testLevel(index)) {
        console.log.apply(console.log, msg.rawArgs);
      }
    });
  });

  return logger;
};

module.exports.setEnable = function(en) {
  if (en && xBusLog) {
    return true;
  }
  if (!en && !xBusLog) {
    return false;
  }

  if (en) {
    xBusLog = require('xcraft-core-buslog');
  } else {
    xBusLog = null;
  }
  return en;
};

module.exports.setModuleNames = function(moduleNames) {
  if (moduleNames && !Array.isArray(moduleNames)) {
    moduleNames = [moduleNames];
  }
  currentModulesNames = moduleNames || [];
};

module.exports.setGlobalVerbosity = function(level) {
  if (level < 0 || level > 3) {
    return;
  }

  currentLevel = level;
};
