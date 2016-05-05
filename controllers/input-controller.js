'use strict';

var config = require('../config.js'),
    inputConfigs = require('../input-config.json'),
    driverController = require('./driver-controller.js'),
    inputsHash = {},
    inputs = [];

function isNumber(val){
    return typeof val === 'number';
}

function isBoolean(val){
    return typeof val === 'boolean';
}

function isString(val){
    return typeof val === 'string';
}

function isDefined(val){
    return typeof val !== 'undefined';
}

function addInput(inputConfig){
    var driver = driverController.getInputDriver(inputConfig.driverId);

    if(driver){
        if(!inputConfig.id){ inputConfig.id = config.genId(); }

        inputConfig.driver = new driver.setup(inputConfig.config, function(val){
            config.alertInputChange(inputConfig.id, driver.type, val);
        });

        inputsHash[inputConfig.id] = inputConfig;
        inputs.push(inputConfig);
        return inputConfig;
    }

    return false;
}

function setupInputs(){
    inputsHash = {};
    inputs = [];

    for(var i = 0; i < inputConfigs.length; i++){
        addInput(inputConfigs[i])
    }

    config.saveInputs(inputs);
}

setupInputs();

function updateConfig(oldConfig, newConfig){
    var modified = false;

    if(isDefined(newConfig.name)){
        oldConfig.name = newConfig.name + '';
        modified = true;
    }

    if(isDefined(newConfig.location)){
        oldConfig.location = newConfig.location + '';
        modified = true;
    }

    if(isDefined(newConfig.description)){
        oldConfig.description = newConfig.description + '';
        modified = true;
    }

    if(isDefined(newConfig.config)){
        oldConfig.driver.updateConfig(newConfig.config);
        oldConfig.config = oldConfig.driver.getConfig();
        modified = true;
    }

    if(modified){
        config.saveInputs(inputs);
    }

    return modified;
}

//REST functions

exports.status = function(req, res){
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
