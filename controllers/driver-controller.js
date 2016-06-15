'use strict';

//Gets the absolute location of the folder contained by a require file selector
function rationalizePaths(array){
    var path;

    for(var i = 0, len = array.length; i < len; i++){
        path = require.resolve(array[i]);
        array[i] = { index: path, config: path.replace(/index\.js/, 'config.json')};
        array[i].name = (require(array[i].config) || {}).name;
    }

    return array;
}

var master = require('../config.js'),
    extend = require('util')._extend,
    glob = require('glob'),
    zlib = require('zlib'),
    tar = require('tar'),
    fstream = require("fstream"),
    fs = require('fs'),
    outputDriverLocs = [],
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
    inputDriverLocs = rationalizePaths(glob.sync('../drivers/inputs/*/index.js', { cwd: __dirname }));

    for(var i = 0; i < inputDriverLocs.length; i++){
        driver = require(inputDriverLocs[i].index);
        config = require(inputDriverLocs[i].config);

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
    outputDriverLocs = rationalizePaths(glob.sync('../drivers/outputs/*/index.js', { cwd: __dirname }));

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

function arrayToBuffer(arr) {
    var buffer = new Buffer(arr.length);

    for (var i = 0; i < buffer.length; ++i) {
        buffer[i] = arr[i];
    }

    return buffer;
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
exports.saveOutputDriver = function(req, res){
    var data = req.body.driver;

    if(!data || !data instanceof Array){
        return res.status(400).send({
            message: 'Driver not supplied!'
        });
    }

    function onError(err){
        return res.status(400).send({
            message: err.message
        });
    }

    var extractor = tar.Extract({path: './drivers/outputs'})
        .on('error', onError);

    var fileStream = new require('stream').PassThrough();
    fileStream.end(arrayToBuffer(data));

    fileStream
        .on('error', onError)

        .pipe(zlib.createUnzip())
        .on('error', onError)

        .pipe(extractor)
        .on('error', onError)
        .on('finish', function(){
            updateOutputDrivers();
            res.jsonp(outputDrivers);
        });
};

exports.outputDrivers = function(req, res){
    res.jsonp(outputDrivers);
};

//REST functions
exports.saveInputDriver = function(req, res){
    var data = req.body.driver;

    if(!data || !data instanceof Array){
        return res.status(400).send({
            message: 'Driver not supplied!'
        });
    }

    function onError(err){
        return res.status(400).send({
            message: err.message
        });
    }

    var extractor = tar.Extract({path: './drivers/inputs'})
        .on('error', onError);

    var fileStream = new require('stream').PassThrough();
    fileStream.end(arrayToBuffer(data));

    fileStream
        .on('error', onError)

        .pipe(zlib.createUnzip())
        .on('error', onError)

        .pipe(extractor)
        .on('error', onError)
        .on('finish', function(){
            updateInputDrivers();
            res.jsonp(inputDrivers);
        });
};

exports.inputDrivers = function(req, res){
    res.jsonp(inputDrivers);
};

return exports;
