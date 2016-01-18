'use strict';

var g = require('wiring-pi');
var app = require('express')();
var _ = require('lodash');

setup('gpio');

var topPin = 3, //Pin to run top outlet relay off of
	bottomPin = 2, //Pin to run bottom outlet relay off of
	topInput = 4, //button to turn top off/on
	bottomInput = 17; //button to turn bottom off/on

g.pinMode(topPin, g.OUTPUT);
g.pinMode(bottomPin, g.OUTPUT);

var vals = [];

function set(pin, newVal){
	vals[pin] = newVal;
	g.digitalWrite(pin, newVal);
};

function toggle(pin){
	var val = +!vals[pin];
	console.log('toggleing ' + pin + ' setting value to ' + val);
	set(pin, val);
};

set(topPin, 1);
set(bottomPin, 1);

function digChange(pin, funct){
	g.pinMode(pin, g.INPUT);
	var past = g.digitalRead(pin);

	var inter = function(){
		var now = g.digitalRead(pin);
		
		if(now !== past){
			funct(now);
			past = now;
		}
	};	

	var val = setInterval(inter, 1);	
	
	return function(){
		clearInterval(val);
	};
}

digChange(topInput, function(val){
	if(!val){
		toggle(topPin);
	}
});

digChange(bottomInput, function(val){
	if(!val){
		toggle(bottomPin);
	}
});

app.get('/', function(req, res){
	var stat = '';	
	stat += ('Current Status: ') + '\n';
	stat += ('Top Outlet: ' + ((vals[topPin] === 1) ? 'on' : 'off') + '\n');
	stat += ('Bottom Outlet: ' + ((vals[bottomPin]) ? 'on' : 'off')) + '\n';
	res.send(stat);
	console.log('Gave status');
});

app.get('/api/set', function(req, res){
	var pin = req.query.pin;
	var val = req.query.val;
	
	if(_.isNumber(pin)){
		if(_.isNumber(var)){
			if(val < 0){ val = 0 };
			if(val > 1){ val = 1 };
			set(pin, var);
		}else{
			toggle(pin);
		}
	
		return res.send('set pin ' + pin + ' to ' + vals[pin]);	
	}
	
	res.send('Missing or incorrect pin');
});

app.get('/api/top/toggle', function(req, res){
	toggle(topPin);
	var out = 'Top outlet now ' + ((vals[topPin] === 1) ? 'on' : 'off';)
	res.send(out);
	console.log('Top outlet toggled');
});

app.get('/api/bottom/toggle', function(req, res){
	toggle(bottomPin);
	var out = 'Bottom outlet now ' + ((vals[bottomPin] === 1) ? 'on' : 'off');
	res.send(out);
	console.log('Bottom outlet toggled');
});

app.get('/api/bottom/on', function(req, res){
	set(bottomPin, 1);
	res.send('Bottom Outlet now on');
	console.log('Bottom Outlet now on');
});

app.get('/api/top/on', function(req, res){
	set(topPin, 1);
	res.send('Top Outlet now on');
	console.log('Top Outlet now on');
});

app.get('/api/bottom/off', function(req, res){
	set(bottomPin, 0);
	res.send('Bottom Outlet now off');
	console.log('Bottom Outlet now off');
});

app.get('/api/top/off', function(req, res){
	set(topPin, 0);
	res.send('Top Outlet now off');
	console.log('Top Outlet now off');
});

app.listen(2000, function(){
	console.log('Server up and running!');
});
