FROM resin/rpi-raspbian:jessie

# Install dependencies
RUN apt-get update; \
    apt-get install -y \
    git-core \
    build-essential \
    lirc \
    curl \
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

RUN curl https://deb.nodesource.com/setup_5.x --insecure | /bin/bash; \
    apt-get update; \
    apt-get install nodejs; \
    rm -rf /var/lib/apt/lists/*

RUN cd /root/node; \
    rm -r node_modules; \
    npm install

# Define working directory
#WORKDIR /root/node
#VOLUME /root/node

# Define default command
CMD ["bash"]
