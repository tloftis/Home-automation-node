'use strict';

var config = rootRequire('libs/config.js');
var outputs = rootRequire('controllers/output-controller.js');
var drivers = rootRequire('controllers/driver-controller.js');

module.exports = function(app) {
    app.route('/api/output').all(config.verifyToken)
        .get(outputs.status)
        .put(outputs.updateOutputs)
        .post(outputs.addNewOutput);

    app.route('/api/output/drivers').all(config.verifyToken)
        .get(drivers.outputDrivers)
        .post(drivers.saveOutputDriver);

    app.route('/api/output/:outputId').all(config.verifyToken)
        .put(outputs.updateOutput)
        .delete(outputs.removeOutput);

    app.route('/api/output/:outputId/set').all(config.verifyToken)
        .post(outputs.set);

    app.param('outputId', outputs.getOutputById);
};
