'use strict';

var mainModuleName = 'xcraft';

var util         = require ('util');
var EventEmitter = require ('events').EventEmitter;

var clc = require ('cli-color');

var currentLevel = 0;
var currentUseColor = true;
var currentUseDatetime = false;

var levelsText = ['Verb', 'Info', 'Warn', 'Err'];
var levels = {
  true: [
    clc.cyanBright.bold   (levelsText[0]),
    clc.greenBright.bold  (levelsText[1]),
    clc.yellowBright.bold (levelsText[2]),
    clc.redBright.bold    (levelsText[3])
  ],
  false: levelsText
};


// http://stackoverflow.com/a/29581862
function getCallerFile () {
  const originalFunc = Error.prepareStackTrace;

  let callerfile;
  try {
    const err = new Error ();
    let currentfile;

    Error.prepareStackTrace = function (err, stack) {
      return stack;
    };

    currentfile = err.stack.shift ().getFileName ();

    while (err.stack.length) {
      callerfile = err.stack.shift ().getFileName ();

      if (currentfile !== callerfile) {
        break;
      }
    }
  } catch (ex) {}

  Error.prepareStackTrace = originalFunc;
  return callerfile;
}

function Log (mod, response) {
  EventEmitter.call (this);
  this._moduleName = mod;
  this._currentLevel = -1;
  this._busLog = null;
  this._response = response;
}

util.inherits (Log, EventEmitter);

Log.prototype._testLevel = function (level) {
  if (this._currentLevel >= 0) {
    return level >= this._currentLevel;
  }
  return level >= currentLevel;
};

Log.prototype._loadBusLog = function () {
  if (this._busLog) {
    return true;
  }

  if (!this._response) {
    return false;
  }

  try {
    this._busLog  = require ('xcraft-core-buslog') (this, this._response);
  } catch (ex) {
    if (ex.code !== 'MODULE_NOT_FOUND') {
      throw ex;
    }
    return false;
  }
  return true;
};

Log.prototype.getModule = function () {
  let module = this._moduleName;

  const caller = getCallerFile ()
    .replace (/.*xcraft-[a-z]+-([a-z0-9]+).*/, '$1');

  if (this._moduleName && this._moduleName.search (caller) === -1) {
    module += `/${caller}`;
  }

  return module;
};

Log.prototype._log = function (level, format) {
  const isBus = this._loadBusLog ();

  /* Continue is busLog is available. */
  if (!isBus && !this._testLevel (level)) {
    return;
  }

  var whiteBrightBold = function (str) {
    return currentUseColor ? clc.whiteBright.bold (str) : str;
  };

  if (typeof format === 'object') {
    format = util.inspect (format);
  }

  format = format.replace (/\n$/, '');

  const mod = this.getModule ();
  var xcraft = mainModuleName;
  var time = new Date ();
  var args = [
    xcraft + ' [%s]%s%s: ' + format,
    whiteBrightBold (mod),
    currentUseDatetime ? ' (' + time.toISOString () + ') ' : ' ',
    levels[currentUseColor][level]
  ];
  var userArgs = Array.prototype.slice.call (arguments, 2);
  args = args.concat (userArgs);
  userArgs.unshift (format);

  this.emit (this.getLevels ()[level], {
    module:     mod,
    moduleName: this._moduleName,
    time:       time,
    message:    util.format.apply (this, userArgs),
    rawArgs:    args
  });
};

Log.prototype.verb = function () {
  this._log.apply (this, [0].concat (Array.prototype.slice.call (arguments)));
};

Log.prototype.info = function () {
  this._log.apply (this, [1].concat (Array.prototype.slice.call (arguments)));
};

Log.prototype.warn = function () {
  this._log.apply (this, [2].concat (Array.prototype.slice.call (arguments)));
};

Log.prototype.err = function () {
  this._log.apply (this, [3].concat (Array.prototype.slice.call (arguments)));
};

Log.prototype.progress = function (topic, position, length) {
  if (!this._busLog) {
    this._loadBusLog ();
  }

  if (this._busLog) {
    this._busLog.progress (topic, position, length);
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

Log.prototype.setResponse = function (response) {
  this._response = response;
};

Log.prototype.color = function (useColor) {
  currentUseColor = useColor;
};

Log.prototype.datetime = function (useDatetime) {
  currentUseDatetime = useDatetime;
};

Log.prototype.getLevels = function () {
  return levelsText.map (function (level) {
    return level.toLowerCase ();
  });
};

Log.prototype.getModuleName = function () {
  return this._moduleName;
};

module.exports = function (mod, response) {
  var logger = new Log (mod, response);

  logger.getLevels ().forEach ((level, index) => {
    logger.on (level, (msg) => {
      if (logger._testLevel (index)) {
        console.log.apply (console.log, msg.rawArgs);
      }
    });
  });

  return logger;
};
