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
    fs = require('fs'),
    async = require('async'),
    npmExec = require('child_process').exec,
    outputDriverLocs = [],
    inputDriverLocs = [];

var outputDrivers = [],
    inputDrivers = [],
    outputDriversHash = {},
    inputDriversHash = {};

function updateInputDrivers(call){
    var driver,
        packages = {},
        dirs = fs.readdirSync('node_modules');

    inputDrivers = [];
    inputDriversHash = {};
    inputDriverLocs = rationalizePaths(glob.sync('../drivers/inputs/*/index.js', { cwd: __dirname }));

    inputDriverLocs.forEach(function(inDriver){
        driver = require(inDriver.config);

        if(!driver.id){
            driver.id = master.genId();
            master.writeConfig(inDriver.config, driver);
        }

        driver.notReady = 0;
        inputDrivers.push(driver);
        inputDriversHash[driver.id] = driver;

        (driver.packages instanceof Array ? driver.packages : []).forEach(function(pack){
            if(dirs.indexOf(pack)=== -1){
                driver.notReady++;

                if(packages[pack]){
                    packages[pack].push(driver);
                }else{
                    packages[pack] = [driver];
                }
            }
        });

        if(!driver.notReady){
            extend(driver, require(inDriver.index));
        }else{
            driver.tempIndex = inDriver.index;
        }
    });

    async.each(Object.keys(packages), function(pack, finish){
        npmExec('npm install ' + pack, function(err, std, str){
            packages[pack].forEach(function(driver){
                driver.notReady--;

                if(!driver.notReady){
                    extend(driver, require(driver.tempIndex));
                    delete driver.tempIndex;
                }
            });

            finish();
        });
    }, function(){
        if(call){ call(); }
    });
}

function updateOutputDrivers(call){
    var driver,
        packages = {},
        dirs = fs.readdirSync('node_modules');

    outputDrivers = [];
    outputDriversHash = {};
    outputDriverLocs = rationalizePaths(glob.sync('../drivers/outputs/*/index.js', { cwd: __dirname }));

    outputDriverLocs.forEach(function(outDriver){
        driver = require(outDriver.config);

        if(!driver.id){
            driver.id = master.genId();
            master.writeConfig(outDriver.config, driver);
        }

        driver.notReady = 0;
        outputDrivers.push(driver);
        outputDriversHash[driver.id] = driver;

        (driver.packages instanceof Array ? driver.packages : []).forEach(function(pack){
            if(dirs.indexOf(pack)=== -1){
                driver.notReady++;

                if(packages[pack]){
                    packages[pack].push(driver);
                }else{
                    packages[pack] = [driver];
                }
            }
        });

        if(!driver.notReady){
            extend(driver, require(outDriver.index));
        }else{
            driver.tempIndex = outDriver.index;
        }
    });

    async.each(Object.keys(packages), function(pack, finish){
        npmExec('npm install ' + pack, function(err, std, str){
            packages[pack].forEach(function(driver){
                driver.notReady--;

                if(!driver.notReady){
                    extend(driver, require(driver.tempIndex));
                    delete driver.tempIndex;
                }
            });

            finish();
        });
    }, function(){
        if(call){ call(); }
    });
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
    function onError(err){
        return res.status(400).send({
            message: err.message
        });
    }

    var extractor = tar.Extract({path: './drivers/outputs'})
        .on('error', onError);

    req
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
    function onError(err){
        return res.status(400).send({
            message: err.message
        });
    }

    var extractor = tar.Extract({path: './drivers/inputs'})
        .on('error', onError);

    req
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
