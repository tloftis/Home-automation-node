'use strict';

var config = require('../config.js');

module.exports = function(app) {
    app.route('/api/register')
        .post(config.registerServer);

    app.route('/api/server')
        .get(config.serverInfo)
        .put(config.configServer);
};