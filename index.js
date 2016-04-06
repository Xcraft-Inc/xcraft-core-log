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
  if (!this._response) {
    return;
  }

  try {
    this._busLog  = require ('xcraft-core-buslog') (this, this._response);
  } catch (ex) {
    if (ex.code !== 'MODULE_NOT_FOUND') {
      throw ex;
    }
  }
};

Log.prototype._log = function (level, format) {
  if (!this._testLevel (level)) {
    return;
  }

  if (!this._busLog) {
    this._loadBusLog ();
  }

  var whiteBrightBold = function (str) {
    return currentUseColor ? clc.whiteBright.bold (str) : str;
  };

  if (typeof format === 'object') {
    format = util.inspect (format);
  }

  format = format.replace (/\n$/, '');

  var xcraft = mainModuleName;
  var time = new Date ();
  var args = [
    xcraft + ' [%s]%s%s: ' + format,
    whiteBrightBold (this._moduleName),
    currentUseDatetime ? ' (' + time.toISOString () + ') ' : ' ',
    levels[currentUseColor][level]
  ];
  var userArgs = Array.prototype.slice.call (arguments, 2);
  args = args.concat (userArgs);

  userArgs.unshift (format);

  this.emit (this.getLevels ()[level], {
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

  logger.getLevels ().forEach (function (level) {
    logger.on (level, function (msg) {
      console.log.apply (console.log, msg.rawArgs);
    });
  });

  return logger;
};
