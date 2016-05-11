'use strict';

var config = require('../config.js');
var outputs = require('../controllers/output-controller');
var drivers = require('../controllers/driver-controller');

module.exports = function(app) {
    app.route('/api/output')
        .get(outputs.status)
        .put(outputs.updateOutputs)
        .post(outputs.addNewOutput);

    app.route('/api/output/drivers')
        .get(drivers.outputDrivers);

    app.route('/api/output/:outputId').
        put(outputs.updateOutput).
        delete(outputs.removeOutput);

    app.route('/api/output/:outputId/set')
        .post(outputs.set);

    // Finish by binding the user middleware
    app.param('outputId', outputs.getOutputById);
};
