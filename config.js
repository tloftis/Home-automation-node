'use strict';

//Configuration File Locations
var inputConfigLoc = './input-config.json',
    outputConfigLoc = './output-config.json',
    idConfigLoc = './config.json';

var outputs = require(outputConfigLoc),
    inputs = require(inputConfigLoc),
    nodeId = require(idConfigLoc),
    g = require('wiring-pi'),
    fs = require('fs'),
    os = require('os'),
    _ = require('lodash'),
    request = require('request'),
    interfaces = os.networkInterfaces(),
    i = 0,
    serverIp;

for (var j in interfaces) {
    for (i in interfaces[j]) {
        var address = interfaces[j][i];

        if (address.family === 'IPv4' && !address.internal) {
            nodeId.id = address.mac;
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
    return nodeId.id;
};

exports.getOutputs = function (){
    return outputs;
};

exports.getOutputByName = function (name){
    var output = false;

    for(i = 0; i < outputs.length; i++){
        if(outputs[i].name === name){
            output = outputs[i];
        }
    }

    return output;
};

exports.getOutputByPin = function (pin){
    var output = false;
    pin = +pin;

    for(i = 0; i < outputs.length; i++){
        if(+outputs[i].pin === pin){
            output = outputs[i];
        }
    }

    return output;
};

exports.getOutputByLocation = function (location){
    var output = false;

    for(i = 0; i < outputs.length; i++){
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

    for(i = 0; i < inputs.length; i++){
        if(inputs[i].name === name){
            input = inputs[i];
        }
    }

    return input;
};

exports.getInputByPin = function (pin){
    var input = false;
    pin = +pin;

    for(i = 0; i < inputs.length; i++){
        if(+inputs[i].pin === pin){
            input = inputs[i];
        }
    }

    return input;
};

exports.getInputByLocation = function (location){
    var input = false;

    for(i = 0; i < inputs.length; i++){
        if(inputs[i].location === location){
            input = inputs[i];
        }
    }

    return input;
};

//If a change occurs before the post request is sent, it is bounced to the end of the callback list
//A clone is made of the object since the object keeps it's reference to the original object and would
//update otherwise just resending the old data back over and over again until req responds or serverIp is undefined
var busy = false;
exports.alertInputChange = function(pinConfig, resend){
    if(busy) return setTimeout(function(){ exports.alertInputChange(_.clone(pinConfig), true) }, 0);
    busy = true;

    if(!serverIp) {
        if(!resend) console.log('No server currently registered');
        busy = false;
        return;
    }

    var info = {
        url: 'https://' + serverIp + '/api/node/input/update',
        form: { config: pinConfig },
        timeout: 5000
    };

    request.post(info, function(err, resp, body){
        if(err){
            console.log('Error updating server ' + serverIp + '!');
            serverIp = undefined;
        }

        busy = false;
    });
};

exports.getServer = function(){
    return serverIp;
};

exports.setServer = function(ip){
    return serverIp = ip;
};

exports.addInput = function(inputConfig){
    var foundInput = exports.getInputByPin(inputConfig.pin);

    if(!foundInput && !exports.getOutputByPin(inputConfig.pin)) {
        inputs.push(inputConfig);
        writeConfig(inputConfigLoc, inputs);
        return true;
    }

    return false;
};

exports.addOutput = function(outputConfig){
    var foundOutput = exports.getOutputByPin(outputConfig.pin);

    if(!foundOutput && !exports.getInputByPin(outputConfig.pin)) {
        outputs.push(outputConfig);
        return true;
    }

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

    writeConfig(outputConfigLoc, outputs);

    return true;
};

exports.removeOutput = function(outputConfig){
    var index = outputs.indexOf(outputConfig);

    if(index != -1) {
        outputs.splice(index, 1);
        writeConfig(outputConfigLoc, outputs);
        return true;
    }

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

    writeConfig(inputConfigLoc, inputs);

    return true;
};

exports.removeInput = function(inputConfig){
    var index = inputs.indexOf(inputConfig);

    if(index != -1) {
        inputs.splice(index, 1);
        writeConfig(inputConfigLoc, inputs);
        return true;
    }

    return false;
};

exports.registerServer = function(req, res){
    serverIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    serverIp =  serverIp.match(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g)[0];
    return res.send('Registered IP ' + serverIp);
};

exports.registerServerRest = function(req, res){
    var regInfo = {
        serverIp: serverIp,
        id: nodeId.id,
        isOutput: nodeId.isOutput,
        isInput: nodeId.isInput,
        isRfid: nodeId.isRfid
    };

    return res.send(regInfo);
};

return exports;