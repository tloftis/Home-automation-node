'use strict';

var outlet = require('../controllers/outlet-controler');

module.exports = function(app) {
	app.route('/api/set')
		.post(outlet.set);

	app.route('/api/status')
		.get(outlet.status);
}
