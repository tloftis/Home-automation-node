'use strict';

//Configuration File Locations
var inputConfigLoc = './input-config.json',
    outputConfigLoc = './output-config.json',
    idConfigLoc = './config.json';

var node = require(idConfigLoc),
    g = require('wiring-pi'),
    fs = require('fs'),
    os = require('os'),
    _ = require('lodash'),
    request = require('request'),
    chalk = require('chalk'),
    interfaces = os.networkInterfaces(),
    pinCount = (node.pinCount ? node.pinCount : 26),
    registeredPins = {};

for(var i = 1; i <= pinCount; i++){
    registeredPins[i] = false;
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

function writeConfig(fileLoc, obj, callback){
    if(!callback) callback = function(){};

    var objStr = JSON.stringify(obj, null, 4);

    fs.writeFile(fileLoc, objStr, function(err) {
        callback(err);
    });
}

g.setup('gpio');
exports.gpio = g;

exports.getId = function(){
    return node.id;
};

exports.registerPin = function(pin, obj){
    pin = +pin;

    if(!registeredPins[pin]){
        return registeredPins[pin] = true;
    }

    return false;
};

exports.unRegisterPin = function(pin){
    registeredPins[+pin] = false;
    return true;
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

exports.saveInputs = function(inputs){
    writeConfig(inputConfigLoc, inputs);
};

exports.saveOutput = function(outputs){
    writeConfig(outputConfigLoc, outputs);
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