'use strict';

var app = require('express')();
var bodyParser = require('body-parser');
var config = require('./config.js');
var port = 2000;

global.rootDir = __dirname;

app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
	extended: true,
	parameterLimit: 10000,
	limit: 1024*1024*10
}));

require('./routes/input-routes')(app);
require('./routes/output-routes')(app);
require('./routes/register-server.routes')(app);

app.listen(port, function(){
	console.log('Server up and running!');
});
