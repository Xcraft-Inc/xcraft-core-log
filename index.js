'use strict';

var mainModuleName = 'xcraft';

var util         = require ('util');
var EventEmitter = require ('events').EventEmitter;

var clc = require ('cli-color');

var currentLevel = 1;
var currentUseColor = true;
var currentUseDatetime = false;

var levelsText = ['Verb', 'Info', 'Warn', 'Err'];
var levels = {
  true: [
    clc.cyanBright   (levelsText[0]),
    clc.greenBright  (levelsText[1]),
    clc.yellowBright (levelsText[2]),
    clc.redBright    (levelsText[3])
  ],
  false: levelsText
};

function Log (mod) {
  EventEmitter.call (this);
  this._moduleName = mod;
}

util.inherits (Log, EventEmitter);

Log.prototype._testLevel = function (level) {
  return level >= currentLevel;
};

Log.prototype._log = function (level, format) {
  if (!this._testLevel (level)) {
    return;
  }

  var whiteBrightBold = function (str) {
    return currentUseColor ? clc.whiteBright.bold (str) : str;
  };

  if (typeof format === 'object') {
    format = util.inspect (format);
  }

  var xcraft = whiteBrightBold (mainModuleName);
  var args = [
    xcraft + ' [%s]%s%s: ' + format,
    whiteBrightBold (this._moduleName),
    currentUseDatetime ? ' (' + new Date ().toISOString () + ') ' : ' ',
    levels[currentUseColor][level]
  ];
  args = args.concat (Array.prototype.slice.call (arguments, 2));
  args[0] = args[0].replace (/\n$/, '');

  this.emit (levelsText[level], args);
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

Log.prototype.verbosity = function (level) {
  if (level < 0 || level > 3) {
    return;
  }
  currentLevel = level;
};

Log.prototype.color = function (useColor) {
  currentUseColor = useColor;
};

Log.prototype.datetime = function (useDatetime) {
  currentUseDatetime = useDatetime;
};

module.exports = function (mod) {
  var logger = new Log (mod);

  levelsText.forEach (function (level) {
    logger.on (level, function (args) {
      console.log.apply (console.log, args);
    });
  });

  return logger;
};
