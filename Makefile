
start: nohup.pid

nohup.pid:
	sudo setcap CAP_NET_BIND_SERVICE=+eip /bin/python3.10
	nohup ./experiment.py & echo $$! > $@;

stop: nohup.pid
	kill `cat $<`&& rm $<

test:
	sudo setcap CAP_NET_BIND_SERVICE=+eip /bin/python3.10
	./experiment.py
