#!/usr/bin/env python3

# Demo of bottle + gevent.
# Based on https://bottlepy.org/docs/dev/async.html

import os, sys, uuid

from gevent import monkey; monkey.patch_all()
from bottle import route, request, run, static_file, HTTPError

# The following functions serve the parts of the experiment:

# The @route part specified the path in the URL used in the browser.
# The subsequent functions locates and loads the data from the hard
# drive.
@route('/')
def experiment():
    return static_file("experiment.html", root='')

@route('/images/<filename:re:.+\.png>')
def send_image(filename):
    return static_file(filename, root='images/', mimetype='image/png')

@route('/jspsych/<filename:re:.+\.(js|css)>')
def jspsych(filename):
    return static_file(filename, root='jspsych/')

# The function below stores the collected data in directory `data`
# with a random filename following the pattern `results_XYZ.csv`.

# Accept no more than max_data bytes in POST requests:
max_data = 1024 * 5000

@route('/store', method="POST")
def store():
    b = request.body
    filedata = b.read(max_data).decode()
    # If we can read more, they payload was too large:
    if len(b.read(1)) != 0:
        raise HTTPError(413, 'Too much data.  Please contact the person conducting the experiment.')
    if os.path.exists("data"):
        if not os.path.isdir("data"):
            raise RuntimeError("A file named 'data' exists where a directory with that name is expected.")
    else:
        os.mkdir("data")
    filename = f"data/results_{uuid.uuid4()}.csv"
    with open(filename, "x") as f:
        f.write(filedata)

try:
    run(host='0.0.0.0', port=80, server='gevent')
except OSError as err:
    if err.args[0] == 98:
        print("ERROR: The IP address is already in use.  End other process and try again.  Quitting.")
    else:
        print(err)
    os.remove("nohup.pid")
    sys.exit(-1)

