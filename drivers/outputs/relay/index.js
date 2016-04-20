'use strict';

var _ = require('lodash'),
    master = require('../../../config.js'),
    name = 'Relay';

function set(pin, newVal){
    master.gpio.digitalWrite(+pin.pin, +newVal);
}

exports.name = name;
exports.type = 'boolean';
exports.config = {
    pin: {
        name: 'Pin',
        type: 'number',
        required: true
    },
    name: {
        name: 'Name',
        type: 'string',
        required: false
    },
    location: {
        name: 'Location',
        type: 'string',
        required: false
    },
    val: {
        name: 'Current Value',
        type: 'boolean',
        required: false
    }
};

//config{ pin };
var setup = function(config) {
    var _this = this;

    if(!config || !+config.pin){ //There is no 0 pin, so this should always fail be because of an error
        return new Error('No Pin Specified!');
    }

    config.pin = +config.pin;

    if(!master.registerPin(config.pin)){
        return new Error('Unable to register on specified pin');
    }

    master.gpio.pinMode(config.pin, master.gpio.OUTPUT);
    this.config = {};
    this.config.pin = config.pin;
    this.config.location = config.location;
    this.config.name = config.name;
    this.set(config.val);
};

setup.prototype.set = function(val){
    set(this.config, val);
    this.config.val = (+val === 1);
    return this.config;
};

setup.prototype.updateConfig = function(config){
    var _this = this;
    config.pin = +config.pin;

    if(config.pin && (config.pin !== this.config.pin)){
        if(master.registerPin(config.pin)){
            master.unRegisterPin(this.config.pin);
            this.config.pin = config.pin;
            this.set(this.config.val);
        }
    }

    if(typeof config.val !== 'undefined' && (config.val !== this.config.val)){
        this.set(config.val);
    }

    if(config.location){
        this.config.location = config.location;
    }

    if(config.name){
        this.config.name = config.name;
    }

    return this.config;
};

setup.prototype.getConfig = function(){
    var _this = this;

    return {
        name: name,
        config: _this.config
    };
};

exports.setup = setup;