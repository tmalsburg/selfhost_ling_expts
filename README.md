
## What is this?

A guide explaining how to set up a self-hosted web experiment using [jsPsych](https://www.jspsych.org), [bottle](https://bottlepy.org/docs/dev/), and [gevent](https://pypi.org/project/gevent/).  Includes a little demo experiment for illustration.

## Terms of use

Use this guide and software at your own risk.  This guide, the script for serving the experiment online (`server.py`), and the `Makefile` are shared under the CC BY 4.0 license.  If you base for your own research on these materials, please acknowledge it.

## Overview

Our sample experiment is implemented using [jsPsych](https://www.jspsych.org) which is one of the standard packages for implementing web experiments.  An alternative package that also looks promising is [lab.js](https://lab.js.org/).

[Bottle](https://bottlepy.org/docs/dev/) and [gevent](https://pypi.org/project/gevent/) are Python packages that we use to serve the experiment to the web and to store the results on the server.

- [Bottle](https://bottlepy.org/docs/dev/) is the Python web framework used for serving the experiment and storing the collected data.  Bottle was chosen because it is easy to use and well-documented.
- [gevent](https://pypi.org/project/gevent/) is our web server and handles network connections.  Gevent, too, is easy to use but at the same time it scales really well if needed.  I supports asynchronous processing and can simultaneously serve hundreds or even thousands of users.

The example experiment implements a minimal [Stroop task](https://en.wikipedia.org/wiki/Stroop_effect) and consists of the following components:

- `server.py`: The script that serves the experiment and stores the results in the subdirectory `data`.
- `experiment.html`: The experiment, implemented with HTML and jsPsych.
- `img`: Directory containing the images shown in the experiment.
- `jsPsych`: Directory containing the jsPsych package.
- `Makefile`: Recipe for starting and stopping the experiment.

Below are instructions showing how to install and run the experiment.  You’ll need a virtual server running Ubuntu Linux.  Follow the instruction for either [DigitalOcean](https://www.digitalocean.com), a commercial cloud service provider, or for [bwCloud](https://www.bw-cloud.org), a cloud service offered by the state of Baden-Württemberg.  bwCloud is only relevant for people working at universities in Baden-Württemberg.  Note that it’s sometimes not possible to create new servers on bwCloud due to resource constraints.

## Create a virtual server (a “Droplet”) on DigitalOcean (alternative 1)

1. Visit https://www.digitalocean.com and create an account.
2. Log in and visit the management interface at: https://cloud.digitalocean.com/projects
3. In the menu pane on the left select “Droplets”.
4. Click blue button “Create Droplet”.
5. Configure Droplet:
   - Choose geographic region where the Droplet should be hosted (“Frankfurt”).
   - As operating system choose Ubuntu (latest version).
   - Select “Size” of Droplet.  “Shared CPU / Basic” plan is usually enough.
   - Under CPU options, choose “Regular”.  Scroll the horizontal list of available plans all the way to the left and choose the cheapest plan (USD 4, at the time of writing).
   - In the section “Choose Authentication Method”, you can choose “SSH Key” or “Password”.  The former is more secure and more convenient once it’s set up.  The latter is potentially insecure (depending on the password) but slightly easier to set up.  The “SSH Key” method is strongly recommended.  On Linux, the file containing your key can be found at: `~/.ssh/.id_rsa.pub`.  On MacOS it’s probably in the same location.  No idea where it would be on Windows, but DigitalOcean show some instructions for all operating systems when you click on the button “New SSH Key”.
   - The options that they offer in the next section are typically not needed.
   - In the section “Finalize Details” you can choose how many Droplets you want to create (usually 1) and given each a name.
   - Finally click the button “Create Droplet” at the bottom right.

## Create a bwCloud virtual server (alternative 2)

The cloud hosting service bwCloud is available to members of universities in the state of Baden-Württemberg, Germany.  If you don’t have access, try DigitalOcean (next section).  You can also use any other server running Ubuntu or any of its derivatives.

1. Visit [bwCloud](https://portal.bw-cloud.org/project/instances/) and log in with your university’s username/password.
2. Select “Instances” in the menu on the left.
3. Click on “Launch Instance” (top right).
4. Configure new instance (= a virtual server):
   - “Details” tab:
     - Instance Name (e.g., `test_instance`)
     - Description
   - “Source” tab: Select “Ubuntu 22.04” (or whatever the latest version is).  To select it, click on the button with the arrow pointing to the top.
   - “Flavor” tab: Here you can select the size of the server (how much memory and so on).  For most experiments `m1.nano` will be easily enough.
   - “Key Pair” tab: Here you have to upload your “SSH” key.  That’s a file containing your SSH public key.  (SSH is the program that we will use to access the virtual server’s command prompt.)
      - Click on “Import Key Pair”.
      - Enter a name for the key under “Key Pair Name”.
      - Select “SSH Key” under “Key Type”.
      - Select the file containing your public key under “Load Public Key from a file”.  On Linux, this file can be found at: `~/.ssh/.id_rsa.pub`.  On MacOS it’s probably in the same location.
      - Click “Import Key Pair” at the bottom left.
   - Click “Launch Instance”.  The new instance will then appear in the list of instances.

### Archiving the bwCloud virtual server after study completion

1. Visit [bwCloud](https://portal.bw-cloud.org/project/instances/).
2. Select “Instances” in the menu on the left.
3. From the “Actions” menu in the line of your virtual server instance, select “Shelve Instance”.  A snapshot of the instance will be saved and the computing resources will be released so that others can use them.  The instance will now be listed with status “Shelved Offloaded”.  After shelving the instance, you can no longer access it, so make sure that you retrieve the data before shelving.  If necessary, it is possible to reactivate (“unshelve”) the instance later.

## Install required software on the virtual server

1. Log into the virtual server using SSH in a terminal:
   - Copy the instance’s IP address from the list of instances (e.g., `193.196.54.221`).
   - Open a terminal and enter this command `ssh root@193.196.54.221` but with the actual IP address of your instance.  In this command, `root` is the default username used in DigitalOcean servers.  When using a bwCloud server, replace `root` with `ubuntu`.
   - SSH will warn you that the “authenticity of host XYZ can’t be established”.  That’s normal when you connect the first time.  Answer “yes” when asked whether you’d like to continue.
   - If all goes well, SSH will connect to the virtual server and show its command prompt, for instance, `root@test_instance:~$` on DigitalOcean or `ubuntu@test_instance:~$` on bwCloud.
2. Install packages needed to run the experiment: `sudo apt update && sudo apt install make python3-bottle python3-gevent`

Done. You can now terminate the connection to the server by entering `exit`.  This will bring you back to the command prompt of your computer.

## Install the experiment on the virtual server

1. Connect to the virtual server: `ssh root@193.196.54.221`
2. To copy the template experiment to the virtual server, simply clone its git repository: `git clone git@github.com:tmalsburg/web_stroop_task.git experiment`
3. Enter `ls experiment` to see all files in the new directory `experiment`.  You should see:
   - `Makefile`: a file for starting and stopping the HTTP server that serves the experiment over the web
   - `README.md`: the file you’re currently reading
   - `experiment.html`: the file containing the experiment
   - `server.py`: the script for serving the experiment and storing results on disk
   - `images`: the directory containing images used in the experiment
   - `jspsych`: the directory containing the jsPsych package

## Run and test the experiment

1. Enter the directory containing the experiment: `cd experiment`
2. To start the web server enter: `make start`
3. You can now access the experiment in the browser at an URL like `http://193.196.55.166/` but using the IP address of your virtual server instance.
4. After you worked through the experiment, you will find a new file in the subdirectory `experiment/data` named something like `1244af49-9db5-410f-92bb-e4ecef23fc61.csv`.  This file contains the results of your test run.  The name of the file is a so-called [UUID](https://en.wikipedia.org/wiki/Universally_unique_identifier) which is (for all practical purposes) globally unique.

## Stop the experiment

1. Enter the directory containing the experiment: `cd experiment`
2. To stop the server enter: `make stop`

## Compiling all individual result files into one file

1. Enter the directory `data`.
2. Execute this command: `Rscript combine_results.R`

This will create a new file `combined.tsv` with two additional columns:

- `participant_id`: This column contains the file name of each participant’s individual results file.  Since the file name is a [UUID](https://en.wikipedia.org/wiki/Universally_unique_identifier), this ID is practically guaranteed to be unique.  However, if someone participates multiple times in the same experiment, they’ll get multiple IDs, so there is not necessarily a 1-to-1 mapping of these IDs to actual people.
- `ctime`: contains the individual results file’s creation time.

The individual results will appear in chronological order in `combined.tsv`.

**Note:** The script uses the time when the files were created on disk.  For these times to be accurate, the script must run on the machine where the experiment is running.  If you transfer the files to another computer with (e.g. using `scp`), the times will no longer reflect the original creation time, but the time at which the files were copied.  So the suggestion workflow is: First combine all results into one file.  Then transfer that file to wherever you’d like to further process it.

## Technical comments for advanced users

The PID of the server process will be stored in `nohup.pid` and the log messages in `nohup.out`.

For testing, use (which blocks the shell):
``` sh :eval no
make test
```

## Acknowledgements

Judith Tonhauser provided useful comments and suggestions.
