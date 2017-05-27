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

var master = rootRequire('libs/config.js'),
    logging = rootRequire('libs/logging.js'),
    extend = require('util')._extend,
    glob = require('glob'),
    zlib = require('zlib'),
    tar = require('tar'),
    fs = require('fs'),
    path = require('path'),
    async = require('async'),
    outputDriverLocs = [],
    inputDriverLocs = [];

var outputDrivers = [],
    inputDrivers = [],
    outputDriversHash = {},
    inputDriversHash = {},
    packCount = 0,
    totalPackCount = 0,
    totalErrorPackCount = 0,
    installingPacks = {};

var npmFolder = path.normalize(rootDir + '/node_modules');

var npmExec = function(pack){
    if(installingPacks[pack]){
        return;
    }

    installingPacks[pack] = true;
    totalPackCount++;
    packCount++;
    logging.info('Installing NPM package ' + pack);

    require('child_process').exec('npm install ' + pack + ' --prefix ' + rootDir, function(err, std, str){
        packCount--;

        if(err){
            logging.error('Failed installing ' + pack, err);
            totalErrorPackCount++;
        }else if(str.indexOf('npm ERR!') !== -1){
            logging.error('Error installing ' + pack, str);
            totalErrorPackCount++;
        }else{
            logging.success('NPM Package ' + pack + ' Installed!');
        }


        if(!packCount){
            if(!totalErrorPackCount || totalErrorPackCount !== totalPackCount){
                master.reset();
            }
        }
    })
};

function updateInputDrivers(){
    var driver,
        packages = {},
        allInstalled = true,
        dirs = fs.readdirSync(npmFolder);

    inputDrivers = [];
    inputDriversHash = {};
    inputDriverLocs = rationalizePaths(glob.sync('../drivers/inputs/*/index.js', { cwd: __dirname }));

    inputDriverLocs.forEach(function(inDriver){
        allInstalled = true;

        driver = require(inDriver.config);
        driver.dir = inDriver.config.replace(/config\.json/, '');

        if(!driver.id){
            driver.id = master.genId();
            master.writeConfig(inDriver.config, driver);
        }

        (driver.packages instanceof Array ? driver.packages : []).forEach(function(pack){
            if(dirs.indexOf(pack) === -1){
                packages[pack] = true;
                allInstalled = false;
            }
        });

        if(allInstalled){
            inputDrivers.push(driver);
            inputDriversHash[driver.id] = driver;
            extend(driver, require(inDriver.index));
        }
    });

    Object.keys(packages).forEach(function(pack){
        npmExec(pack);
    });
}

function updateOutputDrivers(){
    var driver,
        packages = {},
        allInstalled = true,
        dirs = fs.readdirSync(npmFolder);

    outputDrivers = [];
    outputDriversHash = {};
    outputDriverLocs = rationalizePaths(glob.sync('../drivers/outputs/*/index.js', { cwd: __dirname }));

    outputDriverLocs.forEach(function(outDriver){
        allInstalled = true;

        driver = require(outDriver.config);
        driver.dir = outDriver.config.replace(/config\.json/, '');

        if(!driver.id){
            driver.id = master.genId();
            master.writeConfig(outDriver.config, driver);
        }

        (driver.packages instanceof Array ? driver.packages : []).forEach(function(pack){
            if(dirs.indexOf(pack)=== -1){
                packages[pack] = true;
                allInstalled = false;
            }
        });

        if(allInstalled){
            outputDrivers.push(driver);
            outputDriversHash[driver.id] = driver;
            extend(driver, require(outDriver.index));
        }
    });

    Object.keys(packages).forEach(function(pack){
        npmExec(pack);
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

function deleteDriver(driver, callback){
    rmdirAsync(driver.dir, function(err){
        if(!err){
            logging.success('Driver ' + driver.name + ' deleted successfully!', driver);
            var index = inputDrivers.indexOf(driver);

            if(index !== -1){
                inputDrivers.splice(index, 1);
                delete inputDriversHash[driver.id];
            }else{
                index = outputDrivers.indexOf(driver);
                if(index !== -1){ outputDrivers.splice(index, 1); }
                delete outputDriversHash[driver.id];
            }
        }else{
            logging.error('Error attempting to delete driver!', err);
        }

        if(callback){ callback(err); }
    });
}

exports.deleteDriver = deleteDriver;

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

exports.removeDriver = function(req, res){
    var driver = req.driver;

    deleteDriver(driver, function(err){
        if(!err){
            return res.jsonp(driver);
        }

        return res.status(400).send({
            message: 'Error deleting Driver : ' + err.message
        });
    });
};

exports.inputDrivers = function(req, res){
    res.jsonp(inputDrivers);
};

exports.driverById = function(req, res, next, id){
    if (!id) {
        return res.status(400).send({
            message: 'Driver id is invalid'
        });
    }

    req.driver = outputDriversHash[id] || inputDriversHash[id];

    if (!req.driver) {
        return res.status(400).send({
            message: 'Driver not found'
        });
    }

    next();
};
var rmdirAsync = function(path, callback) {
    fs.readdir(path, function(err, files) {
        if(err) {
            // Pass the error on to callback
            callback(err, []);
            return;
        }
        var wait = files.length,
            count = 0,
            folderDone = function(err) {
                count++;
                // If we cleaned out all the files, continue
                if( count >= wait || err) {
                    fs.rmdir(path,callback);
                }
            };
        // Empty directory to bail early
        if(!wait) {
            folderDone();
            return;
        }

        // Remove one or more trailing slash to keep from doubling up
        path = path.replace(/\/+$/,"");
        files.forEach(function(file) {
            var curPath = path + "/" + file;
            fs.lstat(curPath, function(err, stats) {
                if( err ) {
                    callback(err, []);
                    return;
                }
                if( stats.isDirectory() ) {
                    rmdirAsync(curPath, folderDone);
                } else {
                    fs.unlink(curPath, folderDone);
                }
            });
        });
    });
};

return exports;
