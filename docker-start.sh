#!/bin/bash

docker stop node
docker rm node

docker run \
	--device /dev/mem:/dev/mem \
	--device /dev/ttyAMA0:/dev/ttyAMA0 \
	--privileged \
	--name node \
        -v /root/Home-automation-node/drivers:/root/node/drivers/ \
	-v /root/Home-automation-node/data:/root/node/data/ \
	-ti \
	-p 2000:2000 \
	node \
	/bin/bash #node /root/node/app.js
