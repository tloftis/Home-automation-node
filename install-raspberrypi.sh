curl -s https://packagecloud.io/install/repositories/Hypriot/Schatzkiste/script.deb.sh | sudo bash
sudo apt-get install docker-hypriot=1.10.3-1

systemctl unmask docker.service
systemctl unmask docker.socket
systemctl start docker.service
service docker start

if $(uname -m | grep -Eq ^armv6); then
	cat ./docker-build-armv6.sh | /bin/bash
else
	cat ./docker-build-armv7U.sh | /bin/bash
fi

cat docker-start.sh | /bin/bash

echo "/etc/init.d/docker start" > /etc/rc.local
