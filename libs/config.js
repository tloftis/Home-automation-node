'use strict';
//TODO: fix id grabbing method and how config locations are passed in
//TODO: Seprate out functions to new lib files to make them more module like and not monolithic
//TODO: there exist an error where configs get erased, and I am not sure how, seems like it should be impossible, but somehow it is
//TODO: Either fix up how the mac address is gotten, or most likely drop it and go with a unique hash like the ids for inputs/outputs
//TODO: Just better overall handling of all functions, its way to janky as it is, needs to be very robust and have less funcationality
//TODO: More secure methods of communication, right now it doesn't check certs because I use self signed, and that just doesn't cut it, very insecure

var path = require('path');

var inputConfigLoc = path.normalize(rootDir + '/data/input-config.json'),
    outputConfigLoc = path.normalize(rootDir + '/data/output-config.json'),
    idConfigLoc = path.normalize(rootDir + '/data/config.json');

var node = rootRequire(idConfigLoc),
    logging = rootRequire('libs/logging.js'),
    proccessComm = rootRequire('libs/proccess-comm.js'),
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

var types = {
    number: typeof 1,
    string: typeof '',
    boolean: typeof true,
    object: typeof {},
    array: typeof []
};

//Trust all the certs, because I use unsigned and am a horrible security person
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

//Something like this should be built into JS, maybe it is and I just don't read documentation enough
function objForEach(obj, funct){
    Object.keys(obj).forEach(function(key){ funct(obj[key]); });
}

//Still a crap shoot if it actually works consistently
//This should just be a random hash that is saved to some config somewhere
objForEach(interfaces, function(interF){
    interF.forEach(function (address) {
        if (address.family === 'IPv4' && !address.internal) {
            node.id = address.mac;
        }
    })
});

function writeConfig(fileLoc, obj, callback){
    if(!callback) callback = function(){};

    var objStr = JSON.stringify(obj, null, 4);

    if(!objStr.trim()){
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

    logging.info('Updated node config: ' + node.name + ', location:' + node.location);
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
        logging.error('No server currently registered');
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
            logging.error('Error updating server with input ' + id + '!');
            proccessComm.reconnect();
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
            logging.error('Error talking to the server  "' + node.server || 'Unregistered' + '"!');
            proccessComm.reconnect();
        }else{
            logging.success('Updated the server with the current configuration!');
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

    writeConfig(inputConfigLoc, strippedInputs|| []);
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

    writeConfig(outputConfigLoc, strippedOutputs || []);
};

exports.writeConfig = writeConfig;

//REST Api

exports.registerServer = function(req, res){
    node.server = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    node.server =  node.server.match(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g)[0];
    logging.info('Registered new server, IP:' + node.server);
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

exports.types = types;

return exports;
