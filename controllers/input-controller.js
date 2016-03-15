'use strict';

var monitoredPins = {};//Holds callbacks for when pins change state
var config = require('../config.js'),
    _ = require('lodash'),
    async = require('async');

//This monitores the pins held by the monitoredPins array checking them every 10 ms
var inputInterval = setInterval(function(){
	var key;
	
	//The key is the pin number
	for(key in monitoredPins){
		monitoredPins[key].inter(config.gpio.digitalRead(+key));
	}
}, 10);

//Okay, I admit this may be a bit of a custer to look at, but it is very flexable
//Specify the pin the input is on, and specify a callback that fires every time the input pin state changes, giving the current value as an arg	
function digChange(pinConfig, funct){
	var pin = +pinConfig.pin; //this is here to make sure nothing gets changed out of scope, although that should only happen if it is an obj

	//If the pin is already being monitored then just add to the list of callbacks
	if(monitoredPins[pin]){
		monitoredPins[pin].functs.push(funct);
	}else{
		//Here the pin is set to be an input by hardware, a var past is made to store the state last read by the software 
		//a interval will come by and call inter giving the current state of the pin as input, that is compared with the past value
		//If they don't match, then the state must have changed, call all calbacks, then update the past var to the new val
        config.gpio.pinMode(pin, config.gpio.INPUT);
        pinConfig.val = +(+config.gpio.digitalRead(pin) === +!pinConfig.invVal);
		monitoredPins[pin] = {};

        //just feed this function with the pins current state and it will fire and update if it had changed
		monitoredPins[pin].inter = function(now){
            now = +(+now === +!pinConfig.invVal); //this will inverse if invVal is true

			if(now !== pinConfig.val){
				for(var i = 0; i < monitoredPins[pin].functs.length; i++){
					monitoredPins[pin].functs[i](now);
				}

                pinConfig.val = now;
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
		//removeCallback = function(){};
		return funct;
	};
}

var listners = [];

function setListeners(callback){
    if(!callback) callback = function () {};

    var inputs = config.getInputs(),
        i = 0;

    //remove all listeners currently
    for(i = 0; i < listners.length; i++){
        listners[i]();
    }

    //empty listenrs list after reset
    listners = [];

    //repopulate listners with new ones
    async.each(inputs, function(input, next){
        listners.push(digChange(input, function(now){
            config.alertInputChange(input);
        }));

        next();
    }, callback);
}

setListeners();

//REST functions

exports.status = function(req, res){
    var inputs = config.getInputs();

    for(var i = 0; i < inputs.length;i++){
        inputs[i].id = config.getId();
    }

    res.jsonp(inputs);
};

exports.addNewInput = function(req, res){
    var newInput = req.body.input;

    if(newInput && newInput.pin){
        if(!newInput.location){
            newInput.location = '';
        }
        if(!newInput.description){
            newInput.description = '';
        }
        if(!newInput.name){
            newInput.name = '';
        }
        if(!newInput.invVal){
            newInput.invVal = false;
        }

        if (config.addInput(newInput)){
            setListeners();
            return res.send(newInput);
        }

        return res.status(400).send("Pin already in use, cannot add input");
    }

    return res.status(400).send("Input configuration is incorrect!");
};

exports.updateInputs = function(req, res){
    setListeners();
    return res.send("Successfully updated input pin configurations");
};

exports.updateInput = function(req, res){
    var oldInput = req.input;
    var newInput = req.body.input;

    config.updateInput(oldInput, newInput);
    setListeners();

    return res.send(oldInput);
};

exports.removeInput = function(req, res){
    var newInput = req.input;

    if (config.removeInput(newInput)){
        setListeners();
        return res.send(newInput);
    }

    return res.status(400).send("Unable to remove input!");
};

exports.getInputByPin = function (req, res, next, pin) {
    if (!pin) {
        return res.status(400).send({
            message: 'Input pin is invalid'
        });
    }

    req.input = config.getInputByPin(pin);

    if (!req.input) {
        return res.status(400).send({
            message: 'Input not found'
        });
    }

    next();
};
