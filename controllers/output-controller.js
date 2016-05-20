'use strict';

var config = require('../config.js'),
    outputConfigs = require('../output-config.json'),
    driverController = require('./driver-controller.js'),
    outputsHash = {},
    outputs = [],
    badOutputs = [];

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

function addOutput(outputConfig){
    var driver = driverController.getOutputDriver(outputConfig.driverId);

    if(driver){
        outputConfig.driver = new driver.setup(outputConfig.config);

        if(outputConfig.driver instanceof Error){
            config.error('Output Driver Failure:', outputConfig.driver);
            return;
        }

        if(!outputConfig.id){ outputConfig.id = config.genId(); }
        outputsHash[outputConfig.id] = outputConfig;
        outputs.push(outputConfig);

        return outputConfig;
    }

    return false;
}

function setupOutputs(){
    outputsHash = {};
    outputs = [];

    for(var i = 0; i < outputConfigs.length; i++){
        addOutput(outputConfigs[i])
    }

    config.saveOutputs(outputs);
}

setupOutputs();

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

    if(isDefined(newConfig.driverId) && (newConfig.driverId !== oldConfig.driverId)){
        var newDriver = driverController.getOutputDriver(newConfig.driverId);

        if(newDriver && isDefined(newConfig.config)){
            oldConfig.driver.destroy();
            oldConfig.driver = new driver.setup(newConfig.config);
            modified = true;
        }
    }else{
        if(isDefined(newConfig.config) && !compareObjectShallow(oldConfig.config, newConfig.config)){
            oldConfig.driver.updateConfig(newConfig.config);
            oldConfig.config = oldConfig.driver.getConfig();
            modified = true;
        }
    }

    if(modified){
        config.saveOutputs(outputs);
    }

    return modified;
}

function compareObjectShallow(obj1, obj2){
    if(typeof obj1 !== 'object' || typeof obj2 !== 'object'){
        return false;
    }

    for(var key in obj1){
        if(!obj2[key] || (obj2[key] !== obj1[key])){
            return false
        }
    }

    return true;
}

//REST functions
exports.updateOutputs = function(req, res){
    setupOutputs();
    return res.send('Successfully updated outputs');
};

exports.updateOutput = function(req, res){
    var oldOutput = req.output;
    var newOutput = req.body.output;

    if(newOutput && updateConfig(oldOutput, newOutput)){
        return res.send(oldOutput);
    }

    return res.status(400).send("Error updating output.");
};

exports.addNewOutput = function(req, res){
    var newOutput = req.body.output;

    if(newOutput && newOutput.driverId){
        if(!newOutput.location){
            newOutput.location = '';
        }
        if(!newOutput.description){
            newOutput.description = '';
        }
        if(!newOutput.name){
            newOutput.name = '';
        }

        if(newOutput = addOutput(newOutput)){
            return res.send(newOutput);
        }

        return res.status(400).send("Error Adding Output");
    }

    return res.status(400).send("Output configuration is incorrect!");
};

exports.removeOutput = function(req, res){
    var newOutput = req.output;
    newOutput.driver.destroy();
    outputs.splice(outputs.indexOf(newOutput), 1);
    config.saveOutputs(outputs);
    return res.send(newOutput);
};

exports.set = function(req, res){
    var newOutput = req.output,
        value = req.body ? req.body.value : undefined;

    if(isDefined(value)){
        newOutput.config = newOutput.driver.set(value);
        config.saveOutputs(outputs);
        return res.send(newOutput);
    }

    return res.status(400).send("Unable to set output, no value given!");
};

exports.status = function(req, res){
	res.jsonp(outputs);
};

exports.getOutputById = function (req, res, next, id) {
    if (!id) {
        return res.status(400).send({
            message: 'Output id is invalid'
        });
    }

    req.output = outputsHash[id];

    if (!req.output) {
        return res.status(400).send({
            message: 'Output not found'
        });
    }
    next();
};
