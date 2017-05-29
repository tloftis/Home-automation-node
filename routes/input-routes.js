'use strict';

var config = rootRequire('libs/config.js');
var inputs = rootRequire('controllers/input-controller.js');
var drivers = rootRequire('controllers/driver-controller.js');

module.exports = function(app) {
	app.route('/api/input').all(config.verifyToken)
		.get(inputs.status)
        .put(inputs.updateInputs)
        .post(inputs.addNewInput);

	app.route('/api/input/drivers').all(config.verifyToken)
		.get(drivers.inputDrivers)
		.post(drivers.saveInputDriver);

	app.route('/api/input/:inputPin').all(config.verifyToken)
		.put(inputs.updateInput)
		.delete(inputs.removeInput);

	// Finish by binding the user middleware
	app.param('inputPin', inputs.getInputById);
};