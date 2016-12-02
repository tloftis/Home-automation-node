curl -s https://packagecloud.io/install/repositories/Hypriot/Schatzkiste/script.deb.sh | sudo bash
sudo apt-get install docker-hypriot=1.10.3-1

systemctl unmask docker.service
systemctl unmask docker.socket
systemctl start docker.service
service docker start

if $(uname -m | grep -Eq ^armv6); then
	./docker-build-armv6.sh
else
	./docker-build-armv7U.sh
fi

./docker-start.sh

echo "service docker start" > /etc/rc.local
