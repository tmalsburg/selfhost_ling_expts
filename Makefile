
.PHONY=start stop test

PYTHON3=$(shell readlink -f `which python3`)

.SILENT:

start: stopsilent nohup.pid

nohup.pid: .SILENT
	sudo setcap CAP_NET_BIND_SERVICE=+eip $(PYTHON3)
	nohup $(PYTHON3) server.py & echo $$! > $@;
	echo "Experiment started."

stopsilent:
	test -f nohup.pid && kill `cat nohup.pid` && rm nohup.pid || true

stop:
	test -f nohup.pid && kill `cat nohup.pid` && rm nohup.pid && echo "Experiment stopped." || echo "No experiment running."

test:
	sudo setcap CAP_NET_BIND_SERVICE=+eip $(PYTHON3)
	$(PYTHON3) server.py
