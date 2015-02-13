'use strict';

var mainModuleName = 'xcraft';

var currentLevel = 1;
var currentUseColor = true;
var currentUseDatetime = false;

module.exports = function (module) {
  var moduleName = module;
  var clc = require ('cli-color');
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

  var testLevel = function (level) {
    return level >= currentLevel;
  };

  var log = function (level, format) {
    if (!testLevel (level)) {
      return;
    }

    var whiteBrightBold = function (str) {
      return currentUseColor ? clc.whiteBright.bold (str) : str;
    };

    var xcraft = whiteBrightBold (mainModuleName);
    var args = [
      xcraft + ' [%s]%s%s: ' + format,
      whiteBrightBold (moduleName),
      currentUseDatetime ? ' (' + new Date ().toISOString () + ') ' : ' ',
      levels[currentUseColor][level]
    ];
    args = args.concat (Array.prototype.slice.call (arguments, 2));

    console.log.apply (this, args);
  };

  return {
    verb: function () {
      log.apply (this, [0].concat (Array.prototype.slice.call (arguments)));
    },

    info: function () {
      log.apply (this, [1].concat (Array.prototype.slice.call (arguments)));
    },

    warn: function () {
      log.apply (this, [2].concat (Array.prototype.slice.call (arguments)));
    },

    err: function () {
      log.apply (this, [3].concat (Array.prototype.slice.call (arguments)));
    },

    verbosity: function (level) {
      if (level < 0 || level > 3) {
        return;
      }
      currentLevel = level;
    },

    color: function (useColor) {
      currentUseColor = useColor;
    },

    datetime: function (useDatetime) {
      currentUseDatetime = useDatetime;
    }
  };
};
