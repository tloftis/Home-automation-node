'use strict';

var master = require('../config.js'),
    extend = require('util')._extend,
    outputDriverLocs = [
        '../drivers/outputs/relay'
    ],
    inputDriverLocs = [];

var outputDrivers = [],
    inputDrivers = [],
    outputDriversHash = {},
    inputDriversHash = {};

function updateInputDrivers(){
    var driver,
        config;
    inputDrivers = [];
    inputDriversHash = {};

    for(var i = 0; i < inputDriverLocs.length; i++){
        driver = require(inputDriverLocs[i]);
        config = require(inputDriverLocs[i] + '/config.json');

        if(!config.id){
            config.id = master.genId();
            console.log(config);
            master.writeConfig(inputDriverLocs[i] + '/config.json', config);
        }

        extend(driver, config);
        inputDrivers.push(driver);
        inputDriversHash[driver.id] = driver;
    }
}

function updateOutputDrivers(){
    var driver,
        config;
    outputDrivers = [];
    outputDriversHash = {};

    for(var i = 0; i < outputDriverLocs.length; i++){
        driver = require(outputDriverLocs[i]);
        config = require(outputDriverLocs[i] + '/config.json');

        if(!config.id){
            config.id = master.genId();
            master.writeConfig(outputDriverLocs[i] + '/config.json', config);
        }

        extend(driver, config);
        outputDrivers.push(driver);
        outputDriversHash[driver.id] = driver;
    }
}

updateOutputDrivers();
updateInputDrivers();

exports.getOutputDrivers = function(id){
    return outputDrivers;
};

exports.getInputDrivers = function(id){
    return inputDrivers;
};

exports.getOutputDriver = function(id){
    return outputDriversHash[id];
};

exports.getInputDriver = function(id){
    return inputDriversHash[id];
};

return exports;