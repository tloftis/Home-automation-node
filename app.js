'use strict';

var app = require('express')();
var bodyParser = require('body-parser')

app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
	extended: true
})); 

require('./models/pin-model');
require('./routes/outlet-routes')(app);

app.listen(2000, function(){
	console.log('Server up and running!');
});
