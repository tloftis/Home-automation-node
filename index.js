'use strict';

var g = require('wiring-pi');
g.setup('gpio');

var pin = 3,
    val = 1;

g.pinMode(pin, g.OUTPUT);

function toggleLed(){
	g.digitalWrite(pin, val);
	val = +!val;
}

setInterval(toggleLed, 5000);

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
	
	return function(){ clearInterval(val) };
}

digChange(4, function(val){
	if(!val){
		toggleLed();
		console.log('relesed');
	}else{
		console.log('pressed');
	}
})

/*
setInterval(function(){
	pin += 1;
	if(pin > 10) pin = 0;
	g.pinMode(pin, g.OUTPUT);

	console.log(pin);
}, 3000);
*/
