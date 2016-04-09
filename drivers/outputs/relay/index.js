'use strict';

var _ = require('lodash'),
    master = require('../../../config.js');

function set(pin, newVal){
    master.gpio.digitalWrite(+pin.pin, +newVal);
}

exports.setup = function(output) {
    var config = output.config,
        exports = {};

    if(!master.registerPin(config.pin)){
        return false;
    }

    master.gpio.pinMode(+config.pin, master.gpio.OUTPUT);

    exports.update = function (val) {
        set(config, val);
        output.val = (+val === 1);
        return output;
    };

    return exports;
};

exports.id = "relay";