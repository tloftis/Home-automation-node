'use strict';

var config = require('../config.js');
var inputs = require('../controllers/input-controller');

module.exports = function(app) {
	app.route('/api/input')
		.get(inputs.status)
        .put(inputs.updateInputs)
        .post(inputs.addNewInput);

	app.route('/api/input/:inputPin').
		put(inputs.updateInput).
		delete(inputs.removeInput);

	// Finish by binding the user middleware
	app.param('inputPin', inputs.getInputByPin);
};