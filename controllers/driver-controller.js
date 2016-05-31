'use strict';

//Gets the absolute location of the folder contained by a require file selector
function rationalizePaths(array){
    var path;

    for(var i = 0, len = array.length; i < len; i++){
        path = require.resolve(array[i]);
        array[i] = { index: path, config: path.replace(/index\.js/, 'config.json')};
    }

    return array;
}

var master = require('../config.js'),
    extend = require('util')._extend,
    glob = require('glob'),
    outputDriverLocs = rationalizePaths(glob.sync('../drivers/outputs/*/index.js', { cwd: __dirname })),
    inputDriverLocs = rationalizePaths(glob.sync('../drivers/inputs/*/index.js', { cwd: __dirname }));

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
        driver = require(inputDriverLocs[i].index);
        config = require(inputDriverLocs[i].cofig);

        if(!config.id){
            config.id = master.genId();
            master.writeConfig(inputDriverLocs[i].config, config);
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
        driver = require(outputDriverLocs[i].index);
        config = require(outputDriverLocs[i].config);

        if(!config.id){
            config.id = master.genId();
            master.writeConfig(outputDriverLocs[i].config, config);
        }

        extend(driver, config);
        outputDrivers.push(driver);
        outputDriversHash[driver.id] = driver;
    }
}

updateOutputDrivers();
updateInputDrivers();

exports.getOutputDrivers = function(){
    return outputDrivers;
};

exports.getInputDrivers = function(){
    return inputDrivers;
};

exports.getOutputDriver = function(id){
    return outputDriversHash[id];
};

exports.getInputDriver = function(id){
    return inputDriversHash[id];
};

//REST functions
exports.outputDrivers = function(req, res){
    res.jsonp(outputDrivers);
};

exports.inputDrivers = function(req, res){
    res.jsonp(inputDrivers);
};

return exports;