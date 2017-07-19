'use strict';

var config = rootRequire('libs/config.js');
var drivers = rootRequire('controllers/driver-controller.js');

module.exports = function(app) {
    app.route('/api/drivers/:driverId')
        .delete(drivers.removeDriver);

    app.route('/api/server')
        .get(config.serverInfo)
        .post(config.addServer)
        .put(config.configServer);

    app.param('driverId', drivers.driverById);
};