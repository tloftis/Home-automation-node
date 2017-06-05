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

var node = rootRequire('data/config.json', {}),
    logging = rootRequire('libs/logging.js'),
    //proccessComm = rootRequire('libs/process-comm.js'),
    fs = require('fs'),
    async = require('async'),
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

//I use async very little, eventually I would like to remove it as a lib and just make my own version, only because I would enjoy it
//So I just wrap this function with my own for now
function asyncParallel (array, funct, callback) {
    async.parallel((array || []).map(function (val) {
        return function (next){
            funct(val, next);
        }
    }), callback);
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

    fs.writeFileSync(fileLoc, objStr, {flag:'w'});
    callback();
}

function updateNode(newConfig){
    if(!newConfig){
        newConfig = {};
    }

    if(newConfig.name){
        node.name = newConfig.name;
    }

    if(newConfig.description){
        node.description = newConfig.description;
    }

    if(newConfig.location){
        node.location = newConfig.location;
    }

    /* Want to handle these separately, don't want them touched other than the init web page
    if(newConfig.server){
        node.server = newConfig.server;
    }

    if(newConfig.serverToken){
        node.serverToken = newConfig.serverToken;
    }*/

    writeConfig(idConfigLoc, node);

    logging.info('Updated node config: ' + node.name, node);
    return true;
}

exports.genId = function(){
    return crypto.randomBytes(25).toString('hex');
};

if(!node.token){
    node.token = exports.genId();
    updateNode()
}

exports.getId = function(){
    return node.id;
};

exports.getNode = function(){
    return node;
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

    if(!Object.keys(node.server).length) {
        logging.error('No server currently registered');
        busy = false;
        return;
    }

    asyncParallel(Object.keys(node.server), function (server, next){
        var info = {
            headers: {
                'X-Token': node.token
            },
            url: 'https://' + server + '/api/input/' + id,
            form: { value: value, type: (type || typeof value) },
            timeout: 10000,
            rejectUnhauthorized : false
        };

        request.post(info, function(err, resp, body){
            if(err){
                return logging.error('Error updating server: ' + server + ' with input ' + id + '!', err);
                //proccessComm.reconnect(); Not sure the purpose of this call, just going to comment it out and yolo
            }

            if(resp.statusCode !== 200){
                return logging.error('Error updating server: ' + server + ' with input ' + id + '!', body);
            }

            next();
        });
    }, function(){
        busy = false;

        if (callbackList.length) {
            return callbackList.splice(0,1)[0]();
        }
    });
};

exports.requestServerUpdate = function(callback){
    asyncParallel(Object.keys(node.server), function (server, next){
        var info = {
            headers: {
                'X-Token': node.token
            },
            url: 'https://' + server + '/api/node',
            form: { port: process.env.PORT || 2000},
            timeout: 10000,
            rejectUnhauthorized : false
        };

        request.post(info, function(err, resp, body){
            if(err){
                logging.error('Error talking to the server  "' + server || 'Unregistered' + '"!', err);
            } else if (resp.statusCode !== 200) {
                logging.error('Error talking to the server: ' + server, body);
            } else {
                logging.success('Updated the server with the current configuration!', body);
            }

            next();
        });
    }, function(){
        if(typeof callback === 'function'){
            callback();
        }
    });
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

exports.setServer = function(req, res){
    if(!node.server instanceof Object){
        node.server = {};
    }

    var ip = req.strippedIp,
        port = (req.body || {}).port;

    if (!ip || !+port) {
        return res.status(400).send({
            message: 'Improper call, missing or containing extra data'
        });
    }

    node.server[ip + ':' + port] = true;
    updateNode();
    return res.send({ message: 'Registered'});
};

exports.registerToServer = function(req, res){
    if(node.serverToken){
        return res.status(400).send({
            message: 'Server Already Set, user configured server or empty config on device manually'
        })
    }

    node.serverToken = req.body.token;

    exports.requestServerUpdate(function(err){
        if(err){
            delete node.serverToken;

            return res.status(400).send({
                message: err.message
            })
        }

        updateNode();
        return res.send({ message: "Node Registered to server Successfully"});
    });
};

exports.configServer = function(req, res){
    var newNode = req.body.node;
    updateNode(newNode, node);
    return res.send(node);
};

exports.serverInfo = function(req, res){
    return res.send(node);
};

exports.verifyToken = function(req, res, next){
    var token = req.headers['x-token'],
        ip = req.strippedIp;

    if(token !== node.serverToken){
        logging.error('Token Verification Failed', ip);

        return res.status(400).send({
            message: 'Improper token: Rejected'
        });
    }

    next();
};

exports.types = types;

return exports;
