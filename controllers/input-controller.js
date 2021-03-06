'use strict';

var config = rootRequire('libs/config.js'),
    logging = rootRequire('libs/logging.js'),
    inputConfigs = rootRequire('data/input-config.json'),
    driverController = rootRequire('controllers/driver-controller.js'),
    inputsHash = {},
    inputs = [];

function isDefined(val){
    return typeof val !== 'undefined';
}

function addInput(inputConfig){
    var driver = driverController.getInputDriver(inputConfig.driverId);

    if((driver || {}).notReady){
        logging.error('Input Driver Not Ready:', driver);
        return false;
    }

    if(driver){
        if(!inputConfig.id){ inputConfig.id = config.genId(); }

        inputConfig.driver = new driver.setup(inputConfig.config, function(val){
            config.alertInputChange(inputConfig.id, driver.type, val);
        });

        if(inputConfig.driver instanceof Error){
            logging.error('Input Driver Failure:', inputConfig.driver);
            return;
        }

        inputsHash[inputConfig.id] = inputConfig;
        inputs.push(inputConfig);
        return inputConfig;
    }

    return false;
}

function setupInputs(){
    inputsHash = {};
    inputs = [];

    for(var i = 0; i < inputConfigs.length; i++){
        addInput(inputConfigs[i])
    }

    config.saveInputs(inputs);
}

setupInputs();

function updateConfig(oldConfig, newConfig){
    var modified = false;

    if(isDefined(newConfig.name)){
        oldConfig.name = newConfig.name + '';
        modified = true;
    }

    if(isDefined(newConfig.location)){
        oldConfig.location = newConfig.location + '';
        modified = true;
    }

    if(isDefined(newConfig.description)){
        oldConfig.description = newConfig.description + '';
        modified = true;
    }

    //Recasting type based on driver specification
    if(isDefined(newConfig.config)){
        var drive = driverController.getInputDriver(newConfig.driverId);

        if(drive.notReady){
            return;
        }

        if(drive){
            for(var key in newConfig.config){
                if(drive.config[key].type === 'boolean'){
                    if(newConfig.config[key] === 'true'){ newConfig.config[key] = true; }
                    if(newConfig.config[key] === 'false'){ newConfig.config[key] = false; }
                }

                if(drive.config[key].type === 'string'){
                    newConfig.config[key] += '';
                }

                if(drive.config[key].type === 'number' || drive.config[key].pin){
                    newConfig.config[key] = +newConfig.config[key];
                }
            }
        }else{
            return;
        }
    }

    if(isDefined(newConfig.driverId) && (newConfig.driverId !== oldConfig.driverId)){
        var newDriver = driverController.getInputDriver(newConfig.driverId);

        if(newDriver.notReady){
            return;
        }

        if(newDriver && isDefined(newConfig.config)){
            oldConfig.driver.destroy();

            oldConfig.driver = new newDriver.setup(newConfig.config, function(val){
                config.alertInputChange(oldConfig.id, newDriver.type, val);
            });

            oldConfig.driverId = newConfig.driverId;
            oldConfig.config = newConfig.config;
            modified = true;
        }
    }else{
        if(isDefined(newConfig.config) && !compareObjectShallow(oldConfig.config, newConfig.config)){
            oldConfig.driver.updateConfig(newConfig.config);
            oldConfig.config = newConfig.config;
            modified = true;
        }
    }

    if(modified){
        config.saveInputs(inputs);
    }

    return modified;
}

function compareObjectShallow(obj1, obj2){
    if(typeof obj1 !== 'object' || typeof obj2 !== 'object'){
        return false;
    }

    if(Object.keys(obj1).length !== Object.keys(obj2)){
        return false;
    }

    for(var key in obj1){
        if(!obj2[key] || (obj2[key] !== obj1[key])){
            return false
        }
    }

    return true;
}

//REST functions
exports.status = function(req, res){
    res.jsonp(inputs);
};

exports.addNewInput = function(req, res){
    var newInput = req.body.input;

    if(newInput && newInput.driverId){
        if(!newInput.location){
            newInput.location = '';
        }
        if(!newInput.description){
            newInput.description = '';
        }
        if(!newInput.name){
            newInput.name = '';
        }

        if(newInput = addInput(newInput)){
            config.saveInputs(inputs);
            return res.send(newInput);
        }

        return res.status(400).send("Error Adding Input");
    }

    return res.status(400).send("Input configuration is incorrect!");
};

exports.updateInputs = function(req, res){
    setupInputs();
    return res.send("Successfully updated input pin configurations");
};

exports.updateInput = function(req, res){
    var oldInput = req.input;
    var newInput = req.body.input;

    if(newInput && updateConfig(oldInput, newInput)){
        return res.send(oldInput);
    }

    return res.status(400).send("Error updating input.");
};

exports.removeInput = function(req, res){
    var newInput = req.input;
    newInput.driver.destroy();
    inputs.splice(inputs.indexOf(newInput), 1);
    config.saveInputs(inputs);
    return res.send(newInput);
};

exports.getInputById = function (req, res, next, id) {
    if (!id) {
        return res.status(400).send({
            message: 'Input id is invalid'
        });
    }

    req.input = inputsHash[id];

    if (!req.input) {
        return res.status(400).send({
            message: 'Input not found'
        });
    }

    next();
};
