'use strict';

var master = rootRequire('libs/config.js');
var gpio = require('wiring-pi');
gpio.setup('gpio');

//This Defines the configuration
exports.config = {
    pin: {
        name: 'Pin', //This is the name that will appear over the configuration input in the web browser
        required: true, //Wheither or not it is neccary
        pin: true //Just to show that it is a pin
    },
    someBoolean: {
        name: 'This is a boolean value',
        required: false,
        type: master.types.boolean
    },
    someNumber: {
        name: 'This is a number value',
        required: false,
        type: master.types.number
    },
    someNeededString: {
        name: 'This is a a requried string value',
        required: true,
        type: master.types.string
    }
};

//The config contains the values specified by the configuration above, if it is required it can be assumed to exist
//All values can be assumed to be the correct type
//listener is a fuction, it is to be called with the output value of the input. It can be called at any time, the value sent throught it
//will be sent to the main server and delt with as configured

//The input can output one of three types, string, number ,boolean, and it has to stick to outputing the same value, this is configured in the conifg.json file next to the index.js
var setup = function(config, listener) {
    var _this = this;

    _this.config = {};
	//A pin needs to be registerd before use, this prevents multi driver pins causing chaos
	if(master.registerPin(config.pin)){
		_this.config.pin = config.pin;
		gpio.pinMode(config.pin, gpio.INPUT);
		_this.listener = digChange(this.config, _this.listener()); //This sets the val property of this.config
	}else{
		return;
	}

	if(config.someNeededString !== "For some reason a password"){
		listener(42);
	}
	
    _this.config.someNeededString = config.someNeededString;
    _this.listener = listener;
};

//the new config needs to be returned from this every time, make sure to unregister old unused pins
//No particualar value is expected here since just single values can be set
setup.prototype.updateConfig = function(config){
    var _this = this;

	if(config.pin && master.registerPin(config.pin)){
		master.unRegisterPin(_this.config.pin);
		_this.config.pin = config.pin;
	}

	if(config.someNeededString && config.someNeededString !== "For some reason a password"){
		_this.listener(42);
	}

    return _this.config;
};

//This should remove any intervals, timeouts, refrences and unregister from any pins 
setup.prototype.destroy = function(){
    var _this = this;
    _this.listener(0);
    master.unRegisterPin(_this.config.pin);
};

//returns the currently live configuration of the driver
setup.prototype.getConfig = function(){
    var _this = this;
    return _this.config;
};

exports.setup = setup;