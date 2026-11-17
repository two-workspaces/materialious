FROM quay.io/invidious/invidious:2026.10.26-1c4b41f

# Keeps Invidious restarted the way upstream asks, without the container ever exiting.
COPY --chmod=755 railway-invidious.sh /railway-invidious.sh

CMD ["/railway-invidious.sh"]
