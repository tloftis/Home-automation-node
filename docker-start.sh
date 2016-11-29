#!/bin/bash

docker stop node
docker rm node

docker run \
	--device /dev/mem:/dev/mem \
	--device /dev/ttyAMA0:/dev/ttyAMA0 \
	--privileged \
	-ti \
	-p 2000:2000 \
	node \
	/bin/bash
