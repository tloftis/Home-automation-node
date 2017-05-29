'use strict';

var config = rootRequire('libs/config.js');
var drivers = rootRequire('controllers/driver-controller.js');

module.exports = function(app) {
    app.route('/api/register')
        .get(config.exists)
        .post(config.registerServer);

    app.route('/api/drivers/:driverId')
        .delete(drivers.removeDriver);

    app.route('/api/server')
        .get(config.serverInfo)
        .put(config.configServer);

    app.param('driverId', drivers.driverById);
};