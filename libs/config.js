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
    serverCert = path.normalize(rootDir + '/data/server-certs.json'),
    idConfigLoc = path.normalize(rootDir + '/data/config.json');

//TODO: remove the pincount concept, this will be made to run on any hardware with node and docker
var node = rootRequire('data/config.json', {}),
    logging = rootRequire('libs/logging.js'),
    fs = require('fs'),
    async = require('async'),
    crypto = require('crypto'),
    request = require('request'),
    pinCount = (node.pinCount ? node.pinCount : 26),
    registeredPins = {};

try {
    node.serverCerts = rootRequire('data/server-certs.json').map(function(baseCert){
        return Buffer.from(baseCert, 'base64').toString();
    });
} catch (err){
    node.serverCerts = [];
}

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

//I use async very little, eventually I would like to remove it as a lib and just make my own version, only because I would enjoy it
//So I just wrap this function with my own for now
function asyncParallel (array, funct, callback) {
    async.parallel((array || []).map(function (val) {
        return function (next){
            funct(val, next);
        }
    }), callback);
}

function hashPassword (password) {
    return crypto.pbkdf2Sync(password || '', new Buffer('thesalt', 'base64'), 10000, 64, 'SHA1').toString('base64');
}

//TODO: remove this block comment because it is no longer relevant, but who really knows this projects is very
// much not professional
//Still a crap shoot if it actually works consistently
//This should just be a random hash that is saved to some config somewhere
/*objForEach(interfaces, function(interF){
    interF.forEach(function (address) {
        if (address.family === 'IPv4' && !address.internal) {
            ;
        }
    })
});*/

function cloneObj(obj) {
    var newObj = {};

    Object.keys(obj).forEach(function (key) {
        newObj[key] = obj[key];
    });

    return newObj;
}

function writeConfig(fileLoc, obj, callback){
    if(!callback) {
        callback = function(){};
    }

    var objClone = cloneObj(obj);
    delete objClone['serverCerts'];
    var objStr = JSON.stringify(obj, null, 4);

    if(!objStr.trim()){
        return callback(new Error('Missing config data'));
    }

    fs.writeFileSync(fileLoc, objStr, { flag:'w' });
    callback();
}

//I don't remember why this exists as a function, I will keep it because maybe it will come back to me
function writeServerPem(fileLoc, pem, callback){
    if(!callback) callback = function(){};

    var objStr = JSON.stringify(obj, null, 4);

    if(!pem.trim()){
        return callback(new Error('Missing config data'));
    }

    fs.writeFileSync(fileLoc, pem, {flag:'w'});
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

    if (typeof newConfig.enableWebInterface === 'boolean') {
        node.enableWebInterface = newConfig.enableWebInterface;
    }

    writeConfig(idConfigLoc, node);

    logging.info('Updated node config: ' + node.name, node);
    return true;
}

exports.setPassword = function(pass){
    node.password = hashPassword(pass);
    updateNode();
};

exports.testPassword = function(pass){
    return node.password === hashPassword(pass);
};

exports.genId = function(){
    return crypto.randomBytes(30).toString('hex');
};

if (!node.id) {
    node.id = exports.genId() + exports.genId();
}

exports.getId = function(){
    return node.id;
};

exports.getNode = function(){
    return node;
};

//TODO: remove this function
exports.registerPin = function(pin){
    pin = +pin;

    if(!registeredPins[pin]){
        return registeredPins[pin] = true;
    }

    return false;
};

//TODO: remove this function
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
        var options = exports.getDefaultRequest(node.server[server]);
        options.url = 'https://' + server + '/api/input/' + id;
        options.form =  { value: value, type: (type || typeof value) };

        request.post(options, function(err, resp, body){
            if(err){
                logging.error('Error updating server: ' + server + ' with input ' + id + '!', err);
                return next();
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
        var options = exports.getDefaultRequest(node.server[server]);
        options.url = 'https://' + server + '/api/node';
        options.form =  { port: process.env.PORT || 2000};

        request.post(options, function(err, resp, body){
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

exports.getDefaultRequest = function(token) {
    return {
        headers: {
            'X-TOKEN': token,
            'X-NODE-ID': node.id
        },
        timeout: 10000,
        ca: node.serverCerts,
        checkServerIdentity: function(host, key){
            //console.log(key.raw.toString());
        },
        rejectUnhauthorized : true
    };
};

exports.saveCerts = function(certs){
    writeConfig(serverCert, (certs || []).map(function(cert){
        return new Buffer(cert).toString('base64');
    }));
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
        addr = (req.body || {}).addr,
        token = (req.body || {}).servToken;

    if (!addr || !token) {
        return res.status(400).send({
            message: 'Improper call, missing or containing extra data'
        });
    }

    node.server[addr] = token;
    updateNode();
    return res.send({ message: 'Registered'});
};

exports.addCert = function(req, res){
    if (!req.body.cert) {
        return res.status(400).send({
            message: 'Missing data'
        });
    }

    var cert = Buffer.from(req.body.cert, 'base64').toString();

    if(!(1 + node.serverCerts.indexOf(cert))){
        node.serverCerts.push(cert);
        exports.saveCerts(node.serverCerts);
    }

    return res.send({ message: 'Registered'});
};

exports.registerToServer = function(req, res){
    node.token = req.body.token;
    node.addr = req.body.addr;

    node.server[ip + ':' + port] = node.token;

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

exports.addServer = function(req, res){
    if(!node.server instanceof Object){
        node.server = {};
    }

    var ip = req.strippedIp,
        port = (req.body || {}).port,
        token = (req.body || {}).token;

    if (!ip || !token) {
        return res.status(400).send({
            message: 'Improper call, missing or containing extra data'
        });
    }

    var addr = ip.split(':')[0] + ':' + (ip.split(':')[1] || port);

    node.server[addr] = token;
    updateNode();
    return res.send({ message: 'Registered'});
};

exports.serverInfo = function(req, res){
    return res.send(node);
};

exports.types = types;

return exports;
