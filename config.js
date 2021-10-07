'use strict';

/**
 * Retrieve the inquirer definition for xcraft-core-etc
 */
module.exports = [
  {
    type: 'confirm',
    name: 'journalize',
    message: 'enable file logging',
    default: false,
  },
  {
    type: 'checkbox',
    name: 'modes',
    message: 'modes to enable for buslog',
    default: [],
  },
];
