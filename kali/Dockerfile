FROM kalilinux/kali-rolling

# Por defecto NO se instala kali-linux-default (varios GB, el build superaba el
# timeout). Si quieres el metapaquete completo: docker build --build-arg KALI_METAPACKAGE=kali-linux-default …
ARG KALI_METAPACKAGE=""
ENV DEBIAN_FRONTEND=noninteractive

# CTF_TOOLS is installed explicitly. The container runs with --network internal
# after this build, so anything missing here can't be apt-installed later at
# runtime — every tool a challenge references must be baked in now.
ARG CTF_TOOLS="nmap tshark wireshark-common tcpdump aircrack-ng hashcat hashcat-utils hcxtools hcxdumptool reaver bully mdk4 macchanger pixiewps john crunch net-tools iproute2 iw wireless-tools dsniff netcat-traditional coreutils xxd binutils bsdextrautils file jq less nano vim-tiny curl openssl python3-pip"

RUN apt-get update \
    && apt-get install -y --no-install-recommends ${KALI_METAPACKAGE} ${CTF_TOOLS} ca-certificates python3 tini \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Herramientas de los retos agregados el 22 oct (esteganografía: metadatos,
# datos tras el final del archivo y LSB con PIL). Capa aparte a propósito: así
# Docker reutiliza la caché de la instalación grande de arriba.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libimage-exiftool-perl binwalk python3-pil \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY kali/ctf /usr/local/bin/ctf
COPY kali/wispr.bashrc /etc/wispr.bashrc
RUN chmod 0755 /usr/local/bin/ctf \
    && chmod 0644 /etc/wispr.bashrc \
    && useradd --uid 1000 --create-home --shell /bin/bash kali \
    && cp /etc/wispr.bashrc /home/kali/.bashrc \
    && chown kali:kali /home/kali/.bashrc

USER kali
WORKDIR /workspace
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sleep", "infinity"]
