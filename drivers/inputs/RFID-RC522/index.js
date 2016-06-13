'use strict';

var master = require('../../../config.js');
exports.config = {};

var setup = function(config, listener) {
    var _this = this, pin;
    _this.pins = [11, 10, 9, 8, 25];

    for(var i =0; i < _this.pins.length;i++){
        pin = _this.pins[i];

        if(!master.registerPin(pin)){
            for(var j = 0; j < i; j++){
                master.unRegisterPin(_this.pins[j]);
            }

            return new Error('Required pin ' + pin + ' is being used by other hardware');
        }
    }
      
    require("rc522")(function(rfidSerialNumber){
        listener(rfidSerialNumber);
    });
};

setup.prototype.updateConfig = function(config){
    var _this = this;
    return _this.config;
};

setup.prototype.destroy = function(){
    var _this = this;

    for(var i =0; i < _this.pins.length;i++){
        master.unRegisterPin(_this.pins[i])
    }
};

setup.prototype.getConfig = function(){
    var _this = this;
    return _this.config;
};

exports.setup = setup;
