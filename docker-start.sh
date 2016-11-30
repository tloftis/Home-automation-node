#!/bin/bash

docker stop node
docker rm node

docker run \
	--device /dev/mem:/dev/mem \
	--device /dev/ttyAMA0:/dev/ttyAMA0 \
	--privileged \
	--name node \
	-v /root/Home-automation-node/data:/root/node/data/ \
	-d \
	-p 2000:2000 \
	6222 \
	node /root/node/app.js
