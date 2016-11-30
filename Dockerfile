#FROM debian:jessie #For most systems
FROM resin/rpi-raspbian:jessie #For Raspberry PI

# Install dependencies
RUN apt-get update; \
    apt-get install -y \
    git-core \
    build-essential \
    lirc \
    curl \
    ca-certificates \
    --no-install-recommends; \
    rm -rf /var/lib/apt/lists/*

COPY . /root/node

RUN echo "lirc_dev" >> /etc/modules; \
    echo "lirc_rpi gpio_in_pin=23 gpio_out_pin=22" >> /etc/modules; \
    /bin/mkdir -p /etc/lirc/; \
    mv /root/node/hardware.conf /etc/lirc/hardware.conf ; \
    echo "dtoverlay=lirc-rpi,gpio_in_pin=23,gpio_out_pin=22" >> /boot/config.txt; \
    /etc/init.d/lirc stop; \
    /etc/init.d/lirc start

RUN curl https://deb.nodesource.com/setup_6.x --insecure | /bin/bash; \
    apt-get update; \
    apt-get install nodejs -y --no-install-recommends; \
    rm -rf /var/lib/apt/lists/*

RUN cd /root/node; \
    rm -rf node_modules; \
    rm -rf drivers; \
    rm -rf data; \
    npm install

# Define working directory
#WORKDIR /root/node
#VOLUME /root/node

# Define default command
CMD ["bash"]
