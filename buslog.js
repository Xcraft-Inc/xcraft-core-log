'use strict';

const xLog = require('.');

const cmd = {};

cmd.enable = function(msg, resp) {
  xLog.setEnable(true);
  resp.events.send(`buslog.enable.${msg.id}.finished`);
};

cmd.disable = function(msg, resp) {
  xLog.setEnable(false);
  resp.events.send(`buslog.disable.${msg.id}.finished`);
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
    },
  };
};
