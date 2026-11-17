#!/bin/sh
# Railway wrapper for Invidious, run under the image's tini.
# Upstream: "Invidious must be restarted often, at least once a day, ideally every hour."
# So this waits for Postgres, then keeps Invidious running in a loop and restarts it every
# RESTART_EVERY seconds (default 3600), or sooner when the container reaches MEMORY_PCT of its
# memory limit (default 90). If Invidious crashes it comes straight back, and the container never
# exits, so Railway's restart-retry cap is never used up.
set -u
every=${RESTART_EVERY:-3600}
pct=${MEMORY_PCT:-90}
max=$(cat /sys/fs/cgroup/memory.max 2>/dev/null || echo max)
pid=

stop() {
	[ -n "$pid" ] && kill "$pid" 2>/dev/null && wait "$pid" 2>/dev/null
	exit 0
}
trap stop TERM INT

until nc -z "${PGHOST:?PGHOST is not set}" 5432; do
	echo "railway: waiting for postgres"
	sleep 2 & wait $!
done

while :; do
	/invidious/invidious &
	pid=$!
	started=$(date +%s)
	while kill -0 "$pid" 2>/dev/null; do
		sleep 15 & wait $!
		if [ "$max" != max ]; then
			cur=$(cat /sys/fs/cgroup/memory.current 2>/dev/null || echo 0)
			if [ $((cur * 100 / max)) -ge "$pct" ]; then
				echo "railway: memory at $((cur * 100 / max))% of the limit, restarting invidious"
				kill "$pid" 2>/dev/null
				break
			fi
		fi
		if [ $(($(date +%s) - started)) -ge "$every" ]; then
			echo "railway: scheduled restart after ${every}s"
			kill "$pid" 2>/dev/null
			break
		fi
	done
	wait "$pid" 2>/dev/null
	echo "railway: invidious stopped, starting it again"
	sleep 2 & wait $!
done
