'use strict';

var config = require('../config.js');
var drivers = require('../controllers/driver-controller');

module.exports = function(app) {
    app.route('/api/register')
        .post(config.registerServer);

    app.route('/api/drivers/:driverId')
        .delete(drivers.removeDriver);

    app.route('/api/server')
        .get(config.serverInfo)
        .put(config.configServer);

    app.param('driverId', drivers.driverById);
};