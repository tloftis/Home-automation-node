'use strict';

var outputDriverLocs = [
        "./drivers/outputs/relay/index.js"
    ],
    inputDriversLocs = [];

var driverConfig;

var outputDrivers = [],
    inputDrivers = [],
    outputDriversHash = {},
    inputDriversHash = {};

function updateInputDrivers(){
    var driver;

    for(var i = 0; i <= inputDriverLocs.length; i++){
        driver = require(inputDriverLocs[i]);

        inputDrivers.push(driver);
        inputDriversHash[driver.name] = driver;
    }
}

function updateOutputDrivers(){
    var driver;

    for(var i = 0; i <= outputDriverLocs.length; i++){
        driver = require(outputDriverLocs[i]);

        outputDrivers.push(driver);
        outputDriversHash[driver.name] = driver;
    }
}

updateOutputDrivers();
updateInputDrivers();

exports.getDriver = function(name){
    return outputDriversHash[name];
};

return exports;