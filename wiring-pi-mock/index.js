'use strict';

function isDefined(val){
    return typeof val !== 'undefined';
}

var service = function(){
	var _this = this;
	_this._mode = '';
	_this.pins = [];
	
	_this.INPUT = 0;
	_this.OUTPUT = 1;
};

service.prototype.setup = function(data){
    var _this = this;
	_this.mode = data;
};

service.prototype.digitalRead = function(pin){
	var _this = this;
	if(!_this.mode){ throw new Error('Pin Mode Not specified'); }
	
	var pinConfig = _this.pins[pin];
	
	if(!isDefined(pinConfig)){
		return new Error('Pin Mode not defined yet!, use pinMode');
	}
	
	if(pinConfig.mode !== 1){
		return new Error('Pin in wrong pinMode');
	}
	
	return pinConfig.val;
};

service.prototype.digitalWrite = function(pin, val){
	var _this = this;
	if(!_this.mode){ throw new Error('Pin Mode Not specified'); }
	
	var pinConfig = _this.pins[pin];
	
	if(!isDefined(pinConfig)){
		return new Error('Pin Mode not defined yet!, use pinMode');
	}
	
	if(pinConfig.mode !== 0){
		return new Error('Pin in wrong pinMode');
	}
	
	return pinConfig.val = +val;
};

service.prototype.pinMode = function(pin, mode){
	var _this = this;
	if(!_this.mode){ throw new Error('Pin Mode Not specified'); }

	
	_this.pins[pin] = { val: 0, mode: mode};
};

module.exports = new service();