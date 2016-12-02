#!/bin/bash

docker stop node
docker rm node

docker run \
	--device /dev/mem:/dev/mem \
	--device /dev/ttyAMA0:/dev/ttyAMA0 \
	--privileged \
	--name node \
        --mac-address=$(echo $FQDN|md5sum|sed 's/^\(..\)\(..\)\(..\)\(..\)\(..\).*$/02:\1:\2:\3:\4:\5/') \
        -v $(pwd)/drivers:/root/node/drivers/ \
	-v $(pwd)/data:/root/node/data/ \
	-d \
	-p 2000:2000 \
	--restart=unless-stopped \
	node \
	node /root/node/app.js
