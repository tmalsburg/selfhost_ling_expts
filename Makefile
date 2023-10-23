
.PHONY=start stop test

PYTHON3=$(shell readlink -f `which python3`)

start: nohup.pid

nohup.pid:
	sudo setcap CAP_NET_BIND_SERVICE=+eip $(PYTHON3)
	nohup python3 server.py & echo $$! > $@;

stop: nohup.pid
	kill `cat $<` && rm $<

test:
	sudo setcap CAP_NET_BIND_SERVICE=+eip $(PYTHON3)
	python3 server.py
