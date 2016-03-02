'use strict';

var config = require('../config.js');

module.exports = function(app) {
    app.route('/api/register')
        .post(config.registerServer)
        .get(config.registerServerRest);
};