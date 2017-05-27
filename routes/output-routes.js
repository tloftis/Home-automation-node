'use strict';

var config = rootRequire('libs/config.js');
var outputs = rootRequire('controllers/output-controller');
var drivers = rootRequire('controllers/driver-controller');

module.exports = function(app) {
    app.route('/api/output')
        .get(outputs.status)
        .put(outputs.updateOutputs)
        .post(outputs.addNewOutput);

    app.route('/api/output/drivers')
        .get(drivers.outputDrivers)
        .post(drivers.saveOutputDriver);

    app.route('/api/output/:outputId').
        put(outputs.updateOutput).
        delete(outputs.removeOutput);

    app.route('/api/output/:outputId/set')
        .post(outputs.set);

    app.param('outputId', outputs.getOutputById);
};
