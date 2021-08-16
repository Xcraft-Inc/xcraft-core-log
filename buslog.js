'use strict';

const xLog = require('.');

let appId = '$';
let tribe = '';
try {
  const xHost = require('xcraft-core-host');
  appId = xHost.appId;
  tribe = xHost.appArgs().tribe ? `-${xHost.appArgs().tribe}` : '';
} catch (ex) {
  if (ex.code !== 'MODULE_NOT_FOUND') {
    throw ex;
  }
}

const cmd = {};
const cmdNamespace = `${appId}${tribe}`;
const enableApp = `${cmdNamespace}.enable`;
const disableApp = `${cmdNamespace}.disable`;
const modulenamesApp = `${cmdNamespace}.modulenames`;
const verbosityApp = `${cmdNamespace}.verbosity`;

const enable = (name) => (msg, resp) => {
  const modes = msg.data && msg.data.modes;
  xLog.setEnable(true, modes);
  resp.events.send(`buslog.${name}.${msg.id}.finished`);
};

cmd.enable = enable('enable');
cmd[enableApp] = enable(enableApp);

const disable = (name) => (msg, resp) => {
  const modes = msg.data && msg.data.modes;
  xLog.setEnable(false, modes);
  resp.events.send(`buslog.${name}.${msg.id}.finished`);
};

cmd.disable = disable('disable');
cmd[disableApp] = disable(disableApp);

const modulenames = (name) => (msg, resp) => {
  const moduleNames = msg.data.modulenames || [];
  xLog.setModuleNames(moduleNames);
  resp.events.send(`buslog.${name}.${msg.id}.finished`);
};

cmd.modulenames = modulenames('modulenames');
cmd[modulenamesApp] = modulenames(modulenamesApp);

const verbosity = (name) => (msg, resp) => {
  const level = msg.data.level;
  xLog.setGlobalVerbosity(level);
  resp.events.send(`buslog.${name}.${msg.id}.finished`);
};

cmd.verbosity = verbosity('verbosity');
cmd[verbosityApp] = verbosity(verbosityApp);

const rc = {
  enable: {
    parallel: true,
    desc: 'enable buslog',
    options: {
      params: {
        optional: 'modes...',
      },
    },
  },
  disable: {
    parallel: true,
    desc: 'disable buslog',
    options: {
      params: {
        optional: 'modes...',
      },
    },
  },
  modulenames: {
    parallel: true,
    desc: 'set filtering based on module names',
    options: {
      params: {
        optional: 'modulenames...',
      },
    },
  },
  verbosity: {
    parallel: true,
    desc: 'set verbosity level',
    options: {
      params: {
        required: 'level',
      },
    },
  },
};

rc[enableApp] = rc.enable;
rc[disableApp] = rc.disable;
rc[modulenamesApp] = rc.modulenames;
rc[verbosityApp] = rc.verbosity;

/**
 * Retrieve the list of available commands.
 *
 * @returns {Object} The list and definitions of commands.
 */
exports.xcraftCommands = function () {
  return {
    handlers: cmd,
    rc,
  };
};
