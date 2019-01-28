'use strict';

const xLog = require('.');

const cmd = {};

cmd.enable = function(msg, resp) {
  xLog.setEnable(true);
  resp.log.warn('buslog enabled, server performances can be impacted');
  resp.events.send(`buslog.enable.${msg.id}.finished`);
};

cmd.disable = function(msg, resp) {
  xLog.setEnable(false);
  resp.log.warn('buslog disabled, server returning in normal state');
  resp.events.send(`buslog.disable.${msg.id}.finished`);
};

cmd.vebosity = function(msg, resp) {
  const level = msg.data.level;
  xLog.setVerbosity(level);
  resp.events.send(`buslog.vebosity.${msg.id}.finished`);
};

/**
 * Retrieve the list of available commands.
 *
 * @returns {Object} The list and definitions of commands.
 */
exports.xcraftCommands = function() {
  return {
    handlers: cmd,
    rc: {
      enable: {
        parallel: true,
        desc: 'enable buslog',
      },
      disable: {
        parallel: true,
        desc: 'disable buslog',
      },
      vebosity: {
        parallel: true,
        desc: 'set verbosity level',
        options: {
          params: {
            required: 'level',
          },
        },
      },
    },
  };
};
