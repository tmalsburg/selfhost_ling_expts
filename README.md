
## What is this?

Sample experiment illustrating a self-hosted web experiment using [jsPsych](https://www.jspsych.org/), [bottle](https://bottlepy.org/docs/dev/), [gevent](https://pypi.org/project/gevent/). 

## Architecture

The experiment is implemented in **jsPsych** which has become (I think) one of the standard packages for implementing web experiments.  (An alternative package that also looks promising is [lab.js](https://lab.js.org/)).

**Bottle** is the Python web framework for serving the experiment and storing the data.  Bottle was chosen because it is simple and easy to use.

As the web server we use **gevent**.  Gevent, too, is easy to use but at the same time it scales really well if needed (supports asynchronous processing and can therefore simultaneously serve hundreds or even thousands of users).

This present example experiment consists of the following components:

- `experiment.py`: The script that serves the experiment and stores the results (in `data`).
- `static/experiment.html`: The experiment (implemented with HTML and jsPsych).
- `static/img`: Directory containing the images used in the experiment.
- `static/jsPsych`: Directory containing jsPsych package.
- `Makefile`: Recipe for starting and stopping the experiment.

## Create a bwCloud virtual server

1. Visit [bwCloud](https://portal.bw-cloud.org/project/instances/) and log in with your Uni Stuttgart username/password.
2. Select “Instances” in the menu on the left.
3. Click on “Launch Instance” (top right).
4. Configure new instance (= a virtual server):
   - “Details” tab:
     - Instance Name (e.g., `test_instance`)
     - Description
   - “Source” tab: Select “Ubuntu 22.04” (or whatever the latest version is).  To select it, click on the button with the arrow pointing to the top.
   - “Flavor” tab: Here you can select the size of the server (how much memory and so on).  For most experiments `m1.nano` will be enough.
   - “Key Pair” tab: Here you have to upload your “SSH” key.  That’s a file containing your SSH public key.
      - Click on “Import Key Pair”.
      - Enter a name for the key under “Key Pair Name”.
      - Select “SSH Key” under “Key Type”.
      - Select the file containing your public key under “Load Public Key from a file”.  On Linux, this file can be found at: `~/ssh/.id_rsa.pub`.  On MacOS it’s probably in the same location.
      - Click “Import Key Pair” at the bottom left.
   - Click “Launch Instance”.  The new instance will then appear in the list of instances.
5. To test the new instance, try logging into it using ssh in a terminal:
   - Copy the instance’s IP address from the list of instances.  The IP address will look like this: `193.196.54.221`
   - Open a terminal and enter this command `ssh ubuntu@193.196.54.221` but with the actual IP address of your instance.  Note that `ubuntu` is your username on the virtual server.
   - Ssh will warn you that the “authenticity of host XYZ can’t be established”.  That’s normal when you connect the first time.  Answer “yes” when asked whether you’d like to continue.
   - If all goes well, ssh will connect to the virtual server and show its command prompt, e.g: `ubuntu@test_instance:~$`
6. Install some packages that will be needed to run the experiment: `sudo apt update && sudo apt install make python3-bottle python3-gevent`

Done. You can now terminate the connection to the server by entering `exit`.  This will bring you back to the command prompt of your computer.

## Install the experiment on the virtual server

1. Connect to the virtual server: `ssh ubuntu@193.196.54.221`
2. To copy the template experiment to the virtual server, simply clone its git repository: `git clone https://github.com/tmalsburg/web_stroop_task.git experiment`
3. Enter `ls experiment` to see all files in the new directory `experiment`.  You should see:
   - `Makefile`: a file for starting and stopping the HTTP server that serves the experiment over the web
   - `README.md`: the file you’re currently reading
   - `experiment.html`: the file containing the experiment
   - `experiment.py`: the script for serving the experiment and storing results on disk
   - `images`: the directory containing images used in the experiment
   - `jspsych`: the directory containing the jsPsych package

## Run the experiment

1. Connect to the virtual server: `ssh ubuntu@193.196.54.221`
2. Enter the directory containing the experiment: `cd experiment`
3. To start the server enter: `make start`

You can now access the experiment in the browser at an URL similar to `http://193.196.55.166/` but using the IP address of the virtual server instance.

For testing, do the experiment until the end.  If everything works, you will find a new file in the subdirectory `experiment/data` named something like `1244af49-9db5-410f-92bb-e4ecef23fc61.csv`.

## Stop the experiment

1. Connect to the virtual server: `ssh ubuntu@193.196.54.221`
2. Enter the directory containing the experiment: `cd experiment`
3. To start the server enter: `make stop`

## Archive the experiment when the data collection has finished and the data has been retrieved from the virtual server

1. Visit [bwCloud](https://portal.bw-cloud.org/project/instances/) and log in with your Uni Stuttgart username/password.
2. Select “Instances” in the menu on the left.
3. From the “Actions” menu in the line of your virtual server instance, select “Shelve Instance”.  A snapshot of the instance will be saved and the computing resources will be released so that others can use them.  The instance will now be listed with status “Shelved Offloaded”.  After shelving the instance, you can no longer access it, so make sure that you retrieve the data before shelving.  If necessary, it is possible to reactivate (“unshelve”) the instance later.

## Technical comments for advanced users

The PID of the server process will be stored in `nohup.pid` and the log messages in `nohup.out`.

For testing, use (which blocks the shell):
``` sh :eval no
make test
```

