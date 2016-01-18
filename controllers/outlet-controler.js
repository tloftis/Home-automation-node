'use strict';

var g = require('wiring-pi');
var _ = require('lodash');

setup('gpio');

var topPin = 3, //Pin to run top outlet relay off of
	bottomPin = 2, //Pin to run bottom outlet relay off of
	topInput = 4, //button to turn top off/on
	bottomInput = 17; //button to turn bottom off/on

var pins = [];

var pinConfig = {
	name: 'Bottom Outlet',
	location: 'Downstairs, living room, south wall',
	pin: 3,
	inputPin, 4,
	val: 0
};

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

exports.set = function(req, res){
	var pin = req.query.pin;
	var val = req.query.val;
	
	if(_.isNumber(pin)){
		if(_.isNumber(var) || _.isBoolean(val)){
			if(val < 0){ val = 0 };
			if(val > 1){ val = 1 };
			set(pin, +var);
		}else{
			toggle(pin);
		}
	
		return res.send('set pin ' + pin + ' to ' + vals[pin]);	
	}
	
	res.send('Missing or incorrect pin');
};

exports.status = function(req, res){
	toggle(topPin);
	var out = 'Top outlet now ' + ((vals[topPin] === 1) ? 'on' : 'off';)
	res.send(out);
	console.log('Top outlet toggled');
};
