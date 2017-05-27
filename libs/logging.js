'use strict';

var chalk = require('chalk');

var error = function(str, obj) { console.log(chalk.bold.red(str), obj || ''); },
    info = function(str, obj) { console.log(chalk.blue.bold.underline(str), obj || ''); },
    success = function(str, obj) { console.log(chalk.green.bold(str), obj || ''); };

module.exports = {
    error: error,
    info: info,
    success: success
};