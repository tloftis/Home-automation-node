curl -s https://packagecloud.io/install/repositories/Hypriot/Schatzkiste/script.deb.sh | sudo bash
sudo apt-get install docker-hypriot=1.10.3-1

systemctl unmask docker.service
systemctl unmask docker.socket
systemctl start docker.service
service docker start
