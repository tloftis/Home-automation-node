'use strict';

var monitoredPins = {};//Holds callbacks for when pins change state
var master = require('../../../config.js'),
    async = require('async');

//This monitores the pins held by the monitoredPins array checking them every 10 ms
var inputInterval = setInterval(function(){
    var key;

    //The key is the pin number
    for(key in monitoredPins){
        monitoredPins[key].inter(master.gpio.digitalRead(+key));
    }
}, 10);

//Specify the pin the input is on, and specify a callback that fires every time the input pin state changes, giving the current value as an arg
function digChange(pinConfig, funct){
    var pin = +pinConfig.pin; //this is here to make sure nothing gets changed out of scope, although that should only happen if it is an obj

    //If the pin is already being monitored then just add to the list of callbacks
    if(monitoredPins[pin]){
        monitoredPins[pin].functs.push(funct);
    }else{
        //a interval will come by and call inter giving the current state of the pin as input, that is compared with the past value
        //If they don't match, then the state must have changed, call all calbacks, then update the past var to the new val
        pinConfig.val = master.gpio.digitalRead(pin);
        monitoredPins[pin] = {};

        //just feed this function with the pins current state and it will fire and update if it had changed
        monitoredPins[pin].inter = function(now){
            now = (+now === 1);

            if(+now !== +pinConfig.val){
                for(var i = 0; i < monitoredPins[pin].functs.length; i++){
                    monitoredPins[pin].functs[i](now);
                }

                pinConfig.val = now;
            }
        };

        monitoredPins[pin].functs = [funct];
    }

    //Returns a function that when called removes the callback and returns the callback function
    return function removeCallback(){
        var index = monitoredPins[pin].functs.indexOf(funct);
        if(index !== -1){
            monitoredPins[pin].functs.splice(index, 1);

            if(!monitoredPins[pin].functs.length){
                delete monitoredPins[pin];
            }
        }

        //Remove the operation of this function so it can't be repeatedly called and then return
        //removeCallback = function(){};
        return funct;
    };
}

function isNumber(val){
    return typeof val === 'number';
}

function isBoolean(val){
    return typeof val === 'boolean';
}

exports.config = {
    pin: {
        name: 'Pin',
        required: true,
        pin: true
    }
};

var setup = function(config, listener) {
    var _this = this;

    if(!config || !+config.pin || isNaN(+config.pin)){ //There is no 0 pin, so this should always fail be because of an error
        return new Error('No Pin Specified!');
    }

    config.pin = +config.pin;

    if(!master.registerPin(config.pin)){
        return new Error('Unable to register on specified pin');
    }

    master.gpio.pinMode(config.pin, master.gpio.INPUT);

    _this.config = {};
    _this.config.pin = config.pin;
    _this.listener = digChange(this.config, listener); //This sets the val property of this.config
};

setup.prototype.updateConfig = function(config){
    var _this = this;

    if(config.pin && isNaN(+config.pin) && (+config.pin !== _this.config.pin)){ //There is no 0 pin, so this should always fail be because of an error
        config.pin = +config.pin;

        if(master.registerPin(config.pin)){
            master.unRegisterPin(_this.config.pin);
            _this.config.pin = config.pin;
            _this.listener = digChange(this.config, _this.listener()); //This sets the val property of this.config
        }
    }

    return _this.config;
};

setup.prototype.destroy = function(){
    var _this = this;
    _this.listener();
    master.unRegisterPin(_this.config.pin);
};

setup.prototype.getConfig = function(){
    var _this = this;
    return _this.config;
};

exports.setup = setup;