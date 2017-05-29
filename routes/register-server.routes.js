'use strict';

var config = rootRequire('libs/config.js');
var drivers = rootRequire('controllers/driver-controller.js');

module.exports = function(app) {
    app.route('/api/register')
        .get(config.exists)
        .put(config.registerToServer);

    app.route('/api/drivers/:driverId').all(config.verifyToken)
        .delete(drivers.removeDriver);

    app.route('/api/server').all(config.verifyToken)
        .get(config.serverInfo)
        .put(config.configServer);

    app.param('driverId', drivers.driverById);
};