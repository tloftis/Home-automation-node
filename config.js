'use strict';

//Configuration File Locations
var inputConfigLoc = './input-config.json',
    outputConfigLoc = './output-config.json',
    idConfigLoc = './config.json';

var outputs = require(outputConfigLoc),
    inputs = require(inputConfigLoc),
    node = require(idConfigLoc),
    g = require('wiring-pi'),
    fs = require('fs'),
    os = require('os'),
    _ = require('lodash'),
    request = require('request'),
    chalk = require('chalk'),
    interfaces = os.networkInterfaces(),
    pinCount = (node.pinCount ? node.pinCount : 26),
    registeredPins = {},
    outputDriverLocs = [
        "./drivers/outputs/relay/index.js"
    ],
    inputDriversLocs = [];

var driverConfig;

var outputDrivers = [],
    inputDrivers = [],
    driverId = 1;

for(var i = 1; i <= pinCount; i++){
    registeredPins[i] = false;
}

for(var i = 0; i <= outputDriverLocs.length; i++){
    outputDrivers.push({
        driver: require(outputDriverLocs[i]),
        id: driverId++
    });
}

for(var i = 0; i <= inputDriversLocs.length; i++){
    inputDrivers.push({
        driver: require(inputDriverLocs[i]),
        id: driverId++
    });
}

var error = function(str) { console.log(chalk.bold.red(str)); },
    info = function(str) { console.log(chalk.blue.bold.underline(str)); },
    success = function(str) { console.log(chalk.green.bold(str)); };

//lets unsecure communication through for server talk, probably not that safe
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

for (var j in interfaces) {
    for (i in interfaces[j]) {
        var address = interfaces[j][i];

        if (address.family === 'IPv4' && !address.internal) {
            node.id = address.mac;
        }
    }
}

g.setup('gpio');

function writeConfig(fileLoc, obj, callback){
    if(!callback) callback = function(){};

    var objStr = JSON.stringify(obj, null, 4);

    fs.writeFile(fileLoc, objStr, function(err) {
        callback(err);
    });
}

exports.gpio = g;

exports.getId = function(){
    return node.id;
};

exports.registerPin = function(pin){
    pin = +pin;

    if(!registeredPins[pin]){
        return registeredPins[pin] = true;
    }

    return false;
};

exports.getOutputs = function (){
    return outputs;
};

exports.getOutputByName = function (name){
    var output = false;

    for(var i = 0; i < outputs.length; i++){
        if(outputs[i].name === name){
            output = outputs[i];
        }
    }

    return output;
};

exports.getOutputByPin = function (pin){
    var output = false;
    pin = +pin;

    for(var i = 0; i < outputs.length; i++){
        if(+outputs[i].pin === pin){
            output = outputs[i];
        }
    }

    return output;
};

exports.getOutputByLocation = function (location){
    var output = false;

    for(var i = 0; i < outputs.length; i++){
        if(outputs[i].location === location){
            output = outputs[i];
        }
    }

    return output;
};

exports.getInputs = function (){
    return inputs;
};

exports.getInputByName = function (name){
    var input = false;

    for(var i = 0; i < inputs.length; i++){
        if(inputs[i].name === name){
            input = inputs[i];
        }
    }

    return input;
};

exports.getInputByPin = function (pin){
    var input = false;
    pin = +pin;

    for(var i = 0; i < inputs.length; i++){
        if(+inputs[i].pin === pin){
            input = inputs[i];
        }
    }

    return input;
};

exports.getInputByLocation = function (location){
    var input = false;

    for(var i = 0; i < inputs.length; i++){
        if(inputs[i].location === location){
            input = inputs[i];
        }
    }

    return input;
};

//If a change occurs before the post request is sent, it is bounced to the end of the callback list
//A clone is made of the object since the object keeps it's reference to the original object and would
//update otherwise just resending the old data back over and over again until req responds or node.server is undefined
var callbackList = [];
var busy = false;

exports.alertInputChange = function(pinConfig, resend){
    if(busy){
        var cPinConfig = _.clone(pinConfig);

        callbackList.push(function(){
            exports.alertInputChange(cPinConfig, true)
        });

        return;
    }

    busy = true;

    if(!node.server) {
        if(!resend) console.log('No server currently registered');
        busy = false;
        return;
    }

    var info = {
        url: 'https://' + node.server + '/api/node/' + exports.getId() + '/update',
        form: { config: pinConfig },
        timeout: 10000,
        rejectUnhauthorized : false
    };

    request.post(info, function(err, resp, body){
        if(err){
            error('Error updating server with input change of input ' + pinConfig.name + ', pin: ' + pinConfig.pin + '!');
        }

        busy = false;

        if(callbackList.length){
            return callbackList.splice(0,1)[0]();
        }
    });
};

exports.getServer = function(){
    return node.server;
};

exports.setServer = function(ip){
    return node.server = ip;
};

exports.addInput = function(inputConfig){
    var foundInput = exports.getInputByPin(inputConfig.pin);

    if(!foundInput && !exports.getOutputByPin(inputConfig.pin)) {
        inputs.push(inputConfig);
        writeConfig(inputConfigLoc, inputs);
        success('Successfully add new input: ' + inputConfig.name + ', pin:' + inputConfig.pin);
        return true;
    }

    error('Failed to add new input: ' + inputConfig.name + ', pin:' + inputConfig.pin);
    return false;
};

exports.addOutput = function(outputConfig){
    var foundOutput = exports.getOutputByPin(outputConfig.pin);

    if(!foundOutput && !exports.getInputByPin(outputConfig.pin)) {
        outputs.push(outputConfig);
        writeConfig(outputConfigLoc, outputs);
        success('Successfully add new output: ' + outputConfig.name + ', pin:' + outputConfig.pin);
        return true;
    }

    error('Failed to add new output: ' + outputConfig.name + ', pin:' + outputConfig.pin);
    return false;
};

exports.updateOutput = function(oldConfig, newConfig){
    if(!newConfig) return false;

    if(newConfig.location){
        oldConfig.location = newConfig.location;
    }

    if(newConfig.name){
        oldConfig.name = newConfig.name;
    }

    if(newConfig.description){
        oldConfig.description = newConfig.description;
    }

    if(newConfig.pin){
        if(!exports.getOutputByPin(newConfig.pin) && !exports.getInputByPin(newConfig.pin)) {
            oldConfig.pin = newConfig.pin;
        }
    }

    writeConfig(outputConfigLoc, outputs);
    info('Updated output: ' + oldConfig.name + ', pin:' + oldConfig.pin);

    return true;
};

exports.removeOutput = function(outputConfig){
    var index = outputs.indexOf(outputConfig);

    if(index != -1) {
        outputs.splice(index, 1);
        writeConfig(outputConfigLoc, outputs);
        success('Successfully removed output: ' + outputConfig.name + ', pin:' + outputConfig.pin);
        return true;
    }

    error('Failed to remove output: ' + outputConfig.name + ', pin:' + outputConfig.pin);
    return false;
};

exports.updateInput = function(oldConfig, newConfig){
    if(newConfig.location){
        oldConfig.location = newConfig.location;
    }
    if(newConfig.name){
        oldConfig.name = newConfig.name;
    }
    if(newConfig.description){
        oldConfig.description = newConfig.description;
    }
    if(newConfig.invVal){
        oldConfig.invVal = newConfig.invVal;
    }
    if(newConfig.pin){
        oldConfig.pin = newConfig.pin;
    }

    writeConfig(inputConfigLoc, inputs);

    info('Updated input: ' + oldConfig.name + ', pin:' + oldConfig.pin);
    return true;
};

exports.removeInput = function(inputConfig){
    var index = inputs.indexOf(inputConfig);

    if(index != -1) {
        inputs.splice(index, 1);
        writeConfig(inputConfigLoc, inputs);
        success('Successfully removed input: ' + inputConfig.name + ', pin:' + inputConfig.pin);
        return true;
    }

    error('Failed to removed input: ' + inputConfig.name + ', pin:' + inputConfig.pin);
    return false;
};

var updateNode = function(newConfig){
    if(newConfig.name){
        node.name = newConfig.name;
    }

    if(newConfig.description){
        node.description = newConfig.description;
    }

    if(newConfig.location){
        node.location = newConfig.location;
    }

    writeConfig(idConfigLoc, node);

    info('Updated node config: ' + node.name + ', location:' + node.location);
    return true;
};

exports.registerServer = function(req, res){
    node.server = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    node.server =  node.server.match(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g)[0];
    info('Registered new server, IP:' + node.server);
    writeConfig(idConfigLoc, node);
    return res.send('Registered IP ' + node.server);
};

exports.configServer = function(req, res){
    var newNode = req.body.node;
    updateNode(newNode, node);
    return res.send(node);
};

exports.serverInfo = function(req, res){
    return res.send(node);
};

return exports;