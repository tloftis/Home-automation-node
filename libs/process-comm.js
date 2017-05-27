'use strict';

exports.reset = function(){
    process.send({
        command: 'reset'
    });
};

exports.reconnect = function(){
    process.send({
        command: 'reconnect'
    });
};