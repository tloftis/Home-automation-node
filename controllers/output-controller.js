'use strict';

var _ = require('lodash'),
    config = require('../config.js'),
    outputConfigs = require('./output-config.json'),
    driverController = require('./driver-controller.js'),
    outputIds = 0,
    outputsHash = {},
    ouputs = [];

function addOutput(driverName, config){
    var driver = driverController.getDrivers(driverName);

    if(driver){
        var output = outputsHash[outputIds++] = new driver.setup(config);

        output.id = outputIds;
        ouputs.push(output);
        return output;
    }
}

function setupOutputs(){
    var driver;
    outputsHash = {};
    ouputs = [];

    for(var i = 0; i < outputConfigs.length; i++){
        addOutput(outputConfigs[i].name, outputConfigs[i].config)
    }
}

setupOutputs();

//REST functions

exports.updateOutputs = function(req, res){
    setupOutputs();
    return res.send('Successfully updated output pin configurations');
};

exports.updateOutput = function(req, res){
    var oldOutput = req.output;
    var newOutput = req.body.output;

    if(newOutput){
        return res.send(oldOutput.updateConfig(newOutput)); //should be updated
    }

    return res.send("Error updating output.");
};

exports.addNewOutput = function(req, res){
    var output = req.body;

    if(output && output.driver && output.config){
        var newOutput;

        if(newOutput = addOutput(output.driver, output.config)){
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
    var outputs = config.getOutputs();

    for(var i = 0; i < outputs.length;i++){
        outputs[i].id = config.getId();
    }

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
