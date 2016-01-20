'use strict';

var mongoose = require('mongoose');

var db = mongoose.connect('mongodb://localhost/plane-game-dev', function(err) {
	if (err) {
		console.error('\x1b[31m', 'Could not connect to MongoDB!');
		console.log(err);
	}
});

var app = require('express')(db);

require('./models/pin-model');
require('./routes/outlet-routes')(app);

app.listen(2000, function(){
	console.log('Server up and running!');
});
