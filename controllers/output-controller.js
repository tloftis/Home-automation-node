'use strict';

var config = require('../config.js'),
    outputConfigs = require('./output-config.json'),
    driverController = require('./driver-controller.js'),
    outputIds = 0,
    outputsHash = {},
    outputs = [];

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
        outputConfig.id = ++outputIds;
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

    if(isDefined(newConfig.config)){
        oldConfig.driver.updateConfig(newConfig.config);
        oldConfig.config = oldConfig.driver.getConfig();
        modified = true;
    }

    if(modified){
        master.saveOutput(outputs);
    }

    return modified;
}

/*
 var current;
 var compare;
 var type;

 for(var key in newConfig.config){
     current = newConfig.config[key];
     compare = oldConfig.config[key];

     if(compare){
         if(!compare.required || current){
             type = typeof current;

             if(compare.type === 'boolean'){

             }
         }
     }
 }
*/

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

    return res.send("Error updating output.");
};

exports.addNewOutput = function(req, res){
    var output = req.body;

    if(output && output.driverId && output.config){
        var newOutput;

        if(newOutput = addOutput(output.config)){
            return res.send(newOutput);
        }

        return res.status(400).send("Error Adding Output");
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
	res.jsonp(outputs);
};

exports.getOutputByPin = function (req, res, next, id) {
    if (!pin) {
        return res.status(400).send({
            message: 'Output pin is invalid'
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
