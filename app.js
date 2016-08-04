'use strict';
var cp = require('child_process');
var Wireless = require('wireless');

var wireless = new Wireless({
    iface: 'wlan0',
    updateFrequency: 10, // Optional, seconds to scan for networks
    connectionSpyFrequency: 2, // Optional, seconds to scan if connected
    vanishThreshold: 2 // Optional, how many scans before network considered gone
});

var reset = function(callback){
    wireless.disable(function(err){
        wireless.enable(function(err){
            if(callback){ callback(err); }
        });
    });
}

if(typeof v8debug === 'object'){
	process.execArgv = ['--debug-brk=' + (--debugPort), '--nolazy'];
}

var child, setupTimeout;

function setupApp(){
	child = cp.fork(require.resolve('./node.js'));

	child.on('message', function(data) {
		if((data || {}).command){
			if(data.command === 'reset'){
				killApp();
				setupApp();
			}

			if(data.command === 'reconnect'){
				reset();
			}
		}
	});

	//If the process is killed by any random process this will restart it.
	child.on('close', function(){
		if(setupTimeout){
			clearTimeout(setupTimeout);
			setupTimeout = false;
		}

		setupTimeout = setTimeout(function(){
			setupApp();
			setupTimeout = false;
		}, 2000);
	});

	//If anything fails with the child, immediately kill and restart it
	child.on('error', function(err){
		killApp();
		console.log('Error Occurred in app, Restarting in 5 seconds!');

		if(setupTimeout){
			clearTimeout(setupTimeout);
			setupTimeout = false;
		}

		setupTimeout = setTimeout(function(){
			setupApp();
			setupTimeout = false;
		}, 5000);
	});
}

function killApp(){
	if(child){
		child.removeAllListeners('close');
		child.removeAllListeners('message');
		child.removeAllListeners('error');
		child.kill();
	}
}

setupApp();
