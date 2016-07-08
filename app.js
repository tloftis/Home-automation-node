'use strict';
var cp = require('child_process');

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