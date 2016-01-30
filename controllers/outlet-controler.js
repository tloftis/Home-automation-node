'use strict';

var g = require('wiring-pi');
var _ = require('lodash');
var monitoredPins = {};//Holds callbacks for when pins change state

g.setup('gpio');

var pins = require('../config.json');
if(!_.isArray(pins)) throw new Error('Configuration file is inncorrect');

pins.forEach(function(pin){
	g.pinMode(+pin.pin, g.OUTPUT);
	set(pin, pin.val);

	//This sets up the physical button input
	if(!_.isUndefined(pin.inputPin)){
		digChange(pin.inputPin, function(val){
			if(!val){
				toggle(pin);
			}
		});
	}
});

function getConfig(pinNum){
	var i = 0,
		pinLen = pins.length,
		pin = {};

	for(i=0; i<pinLen; i++){
		pin = pins[i];
		
		if(+pin.pin == +pinNum){
			return pin;
		}	
	}
}

function set(pin, newVal){
	pin.val = newVal;
	g.digitalWrite(+pin.pin, +newVal);
};

function toggle(pin){
	set(pin, +!pin.val);
};

//This monitores the pins held by the monitoredPins array checking them every 10 ms
var inputInterval = setInterval(function(){
	var key;
	
	//The key is the pin number
	for(key in monitoredPins){
		monitoredPins[key].inter(g.digitalRead(+key));
	}
}, 10);

//Okay, I admit this may be a bit of a custer to look at, but it is very flexable
//Specify the pin the input is on, and specify a callback that fires every time the input pin state changes, giving the current value as an arg	
function digChange(pinNum, funct){
	var pin = pinNum; //this is here to make sure nothing gets changed out of scope, although that should only happen if it is an obj

	//If the pin is already being monitored then just add to the list of callbacks
	if(monitoredPins[pin]){
		monitoredPins[pin].functs.push(funct);
	}else{
		//Here the pin is set to be an input by hardware, a var past is made to store the state last read by the software 
		//a interval will come by and call inter giving the current state of the pin as input, that is compared with the past value
		//If they don't match, then the state must have changed, call all calbacks, then update the past var to the new val
		g.pinMode(pin, g.INPUT);
		var past = g.digitalRead(pin);
		monitoredPins[pin] = {};

		monitoredPins[pin].inter = function(now){
			if(now !== past){
				for(var i = 0; i < monitoredPins[pin].functs.length; i++){
					monitoredPins[pin].functs[i](now);
				}
				
				past = now;
			}
		};
		
		monitoredPins[pin].functs = [funct];	
	}

	//Returns a function that when called removes the callback and returns the callback function
	return function removeCallback(){
		var index = monitoredPins[pin].functs.indexOf(funct);
		if(index !== -1){
			monitoredPins[pin].functs.splice(index, 1);
			
			if(!monitoredPins[pin].functs.length){
				delete monitoredPins[pin];	
			}
		}
		
		//Remove the operation of this function so it can't be repeatedly called and then return
		removeCallback = function(){};
		return funct;
	};
}

exports.set = function(req, res){
	var pinConfig = getConfig(req.body.pin);
	var val = req.body.val;

	if(pinConfig){
		if(_.isNumber(val) || _.isBoolean(val)){
			if(val < 0){ val = 0 };
			if(val > 1){ val = 1 };
			set(pinConfig, +val);
		}else{
			toggle(pinConfig);
		}
	
		return res.send(pinConfig);	
	}
	
	res.status(400).send('Missing or incorrect pin');
};

exports.status = function(req, res){
	res.jsonp(pins);
};
