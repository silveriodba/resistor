FROM alpine:latest
MAINTAINER Toni Moreno <toni.moreno@gmail.com>

ADD ./resistor-last.tar.gz /

VOLUME ["/opt/resistor/conf", "/opt/resistor/log"]

EXPOSE 6090

WORKDIR /opt/resistor
COPY ./resistor.toml ./conf/
COPY ./resinjector.toml ./conf/
COPY ./start.sh /
COPY ./start_resinjector.sh /

ENTRYPOINT ["/start.sh"]
