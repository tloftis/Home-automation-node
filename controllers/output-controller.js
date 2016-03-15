'use strict';

var _ = require('lodash'),
	monitoredPins = {},//Holds callbacks for when pins change state
    config = require('../config.js');

function setupOutputs(){
    var outputs = config.getOutputs();

    for(var i = 0; i < outputs.length; i++){
        config.gpio.pinMode(+outputs[i].pin, config.gpio.OUTPUT);
    }
}

setupOutputs();

function set(pin, newVal){
    pin.val = newVal;
    config.gpio.digitalWrite(+pin.pin, +newVal);
}

function toggle(pin){
    set(pin, +!pin.val);
}

//REST functions

exports.set = function(req, res){
	var pinConfig = false;

	if(req.body.pin){
		pinConfig = config.getOutputByPin(req.body.pin)
	}

	if(req.body.name && !pinConfig){
		pinConfig = config.getOutputByPin(req.body.name)
	}

	if(req.body.location && !pinConfig){
		pinConfig = config.getOutputByPin(req.body.location)
	}

	var val = req.body.val;

	if(pinConfig){
		if(!_.isUndefined(val)){
            val = +val;

			if(val < 0){ val = 0 }
			if(val > 1){ val = 1 }

			set(pinConfig, +val);
		}else{
			toggle(pinConfig);
		}

		return res.send(pinConfig);
	}

	res.status(400).send('Missing or incorrect Output finding parameters');
};

exports.updateOutputs = function(req, res){
    setupOutputs();
    return res.send('Successfully updated output pin configurations');
};

exports.updateOutput = function(req, res){
    var oldOutput = req.output;
    var newOutput = req.body.output;

    if(config.updateOutput(oldOutput, newOutput)){
        setupOutputs();
        return res.send(oldOutput); //should be updated
    }

    return res.send("Error updating output.");
};

exports.addNewOutput = function(req, res){
    var output = req.body.output,
        newOutput = {};

    if(output && output.pin){
        newOutput.pin = output.pin;

        if(output.name){
            newOutput.name = output.name;
        }

        if(output.location){
            newOutput.location = output.location;
        }

        if(output.description){
            newOutput.description = output.description;
        }

        if(output.val){
            newOutput.val = output.val;
        }

        if (config.addOutput(newOutput)){
            setupOutputs();
            return res.send(newOutput);
        }

        return res.status(400).send("Pin already in use, cannot add output");
    }

    return res.status(400).send("Output configuration is incorrect!");
};

exports.removeOutput = function(req, res){
    var newOutput = req.output;

    if (config.removeOutput(newOutput)){
        setupOutputs();
        return res.send(newOutput);
    }

    return res.status(400).send("Unable to remove output!");
};

exports.status = function(req, res){
    var outputs = config.getOutputs();

    for(var i = 0; i < outputs.length;i++){
        outputs[i].id = config.getId();
    }

	res.jsonp(outputs);
};

exports.getOutputByPin = function (req, res, next, pin) {
    if (!pin) {
        return res.status(400).send({
            message: 'Output pin is invalid'
        });
    }

    req.output = config.getOutputByPin(pin);

    if (!req.output) {
        return res.status(400).send({
            message: 'Output not found'
        });
    }
    next();
};
