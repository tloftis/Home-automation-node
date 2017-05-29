'use strict';

exports.reset = function(){
    (process.send || function(){})({
        command: 'reset'
    });
};

exports.reconnect = function(){
    (process.send || function(){})({
        command: 'reconnect'
    });
};