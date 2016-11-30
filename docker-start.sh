#!/bin/bash

docker stop node
docker rm node

docker run \
	--device /dev/mem:/dev/mem \
	--device /dev/ttyAMA0:/dev/ttyAMA0 \
	--privileged \
	-v /root/Home-automation-node/data:/root/node/data/ \
	-ti \
	-p 2000:2000 \
	2144412d2673 \
	/bin/bash #node /root/node/app.js
