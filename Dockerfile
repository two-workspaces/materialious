FROM wardpearce/materialious-full:1.18.11

# Holds sign-ups open only until the admin registers.
COPY railway-start.mjs /app/railway-start.mjs

ENV PORT=3000 \
    ADDRESS_HEADER=X-Real-IP \
    HISTORY_CULLING=365

CMD ["node", "/app/railway-start.mjs"]
