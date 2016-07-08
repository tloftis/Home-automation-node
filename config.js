'use strict';

//Configuration File Locations
var inputConfigLoc = './input-config.json',
    outputConfigLoc = './output-config.json',
    idConfigLoc = './config.json';

var node = require(idConfigLoc),
    fs = require('fs'),
    os = require('os'),
    crypto = require('crypto'),
    request = require('request'),
    chalk = require('chalk'),
    interfaces = os.networkInterfaces(),
    pinCount = (node.pinCount ? node.pinCount : 26),
    registeredPins = {};

for(var i = 1; i <= pinCount; i++){
    registeredPins[i] = false;
}

var error = function(str, obj) { console.log(chalk.bold.red(str), obj || ''); },
    info = function(str, obj) { console.log(chalk.blue.bold.underline(str), obj || ''); },
    success = function(str, obj) { console.log(chalk.green.bold(str), obj || ''); };

var types = {
    number: typeof 1,
    string: typeof '',
    boolean: typeof true,
    object: typeof {},
    array: typeof []
};

exports.error = error;
exports.info = info;
exports.success = success;

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

    if(!objStr){
        return callback(new Error('Missing config data'));
    }

    fs.writeFile(fileLoc, objStr, function(err) {
        callback(err);
    });
}

function updateNode(newConfig){
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
}

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

exports.unRegisterPin = function(pin){
    registeredPins[+pin] = false;
    return true;
};

//If a change occurs before the post request is sent, it is bounced to the end of the callback list
var callbackList = [];
var busy = false;

exports.alertInputChange = function(id, type, value){
    if(busy){
        callbackList.push(function(){
            exports.alertInputChange(id, type, value)
        });

        return;
    }

    busy = true;

    if(!node.server) {
        error('No server currently registered');
        busy = false;
        return;
    }

    var info = {
        url: 'https://' + node.server + '/api/input/' + id,
        form: { value: value, type: (type || typeof value) },
        timeout: 10000,
        rejectUnhauthorized : false
    };
	
    request.post(info, function(err, resp, body){
        if(err){
            error('Error updating server with input ' + id + '!');
        }

        busy = false;

        if(callbackList.length){
            return callbackList.splice(0,1)[0]();
        }
    });
};

exports.requestServerUpdate = function(id, type, value){
    var info = {
        url: 'https://' + node.server + '/api/node/' + node.id,
        form: { },
        timeout: 10000,
        rejectUnhauthorized : false
    };

    request.post(info, function(err, resp, body){
        if(err){
            error('Error talking to the server  "' + node.server || 'Unregistered' + '"!');
        }else{
            success('Updated the server with the current configuration!');
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
    //Remove the driver property before saving, it isn't needed
    var strippedInputs = inputs.map(function(obj){
        var newObj = {};

        for(var key in obj){
            if(key !== 'driver'){
                newObj[key] = obj[key];
            }
        }

        return newObj;
    });

    writeConfig(inputConfigLoc, strippedInputs);
};

exports.saveOutputs = function(outputs){
    //Remove the driver property before saving, it isn't needed
    var strippedOutputs = outputs.map(function(obj){
        var newObj = {};

        for(var key in obj){
            if(key !== 'driver'){
                newObj[key] = obj[key];
            }
        }

        return newObj;
    });

    writeConfig(outputConfigLoc, strippedOutputs);
};

exports.writeConfig = writeConfig;

//REST Api

exports.registerServer = function(req, res){
    node.server = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    node.server =  node.server.match(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g)[0];
    info('Registered new server, IP:' + node.server);
    writeConfig(idConfigLoc, node);
    return res.send(node);
};

exports.configServer = function(req, res){
    var newNode = req.body.node;
    updateNode(newNode, node);
    return res.send(node);
};

exports.serverInfo = function(req, res){
    return res.send(node);
};

exports.genId = function(){
    return crypto.randomBytes(25).toString('hex');
};

exports.reset = function(){
    process.send({
        command: 'reset'
    });
};

exports.types = types;

return exports;
