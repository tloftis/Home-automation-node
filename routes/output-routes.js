'use strict';

var config = require('../config.js');
var outputs = require('../controllers/output-controller');

module.exports = function(app) {
    app.route('/api/output')
        .get(outputs.status)
        .put(outputs.updateOutputs)
        .post(outputs.addNewOutput);

    app.route('/api/output/:outputId').
        put(outputs.updateOutput).
        delete(outputs.removeOutput);

    app.route('/api/output/set/:outputId')
        .post(outputs.set);

    // Finish by binding the user middleware
    app.param('outputId', outputs.getOutputById);
};
