#!/bin/bash

docker stop node
docker rm node

docker run \
	--device /dev/mem:/dev/mem \
	--device /dev/ttyAMA0:/dev/ttyAMA0 \
	--privileged \
	-ti \
	node \
	/bin/bash
