
## What is this?

In this document, I explain how to set up  and host browser-based experiments.  This approach uses [jsPsych](https://www.jspsych.org) for designing the experiment and a simple but effective Python-script to serve it on the web.  This repository also includes demo experiments showing how standard (psycho)linguistic paradigms can be implemented.  Feel free to use these demos as templates for your own experiments.

## Terms of use

Use this guide and software at your own risk.  This guide, the script for serving the experiment online (`server.py`), and the `Makefile` are shared under the CC BY 4.0 license.  If you base for your own research on these materials, please acknowledge it.

## Short instructions

Currently, the following demo experiments are available:
- [A super basic Stroop task, good starting point](https://github.com/tmalsburg/selfhost_ling_expts/tree/main/demo_stroop_task)
- [An acceptability judgment task](https://github.com/tmalsburg/selfhost_ling_expts/tree/main/demo_judgment_task)
- [An experiment using the self-paced reading paradigm](https://github.com/tmalsburg/selfhost_ling_expts/tree/main/demo_selfpacedreading)

To run the demo experiments (detailed instructions and explanations below):
1. Copy this repository to the server on which you’d like to run the experiment.
2. Install required software: `sudo apt install make python3-bottle python3-gevent`
3. In a command shell, enter the directory of the experiment that you’d like to test.
4. Execute `make start`.  The experiment will now be served at the IP address of the server, either on port 80 (unencrypted) or on port 443 (encrypted) if the experiment directory contains a TLS certificate (`cert.pem`) and a TLS key (`key.pem`).
5. Point your web browser to the address of the server to test.
6. Execute `make stop` to shut down the web server.
7. Collected data can be found in the subdirectory `data`.


## Overview

The sample experiments are implemented using [jsPsych](https://www.jspsych.org) which is one of the standard packages for implementing web-based experiments.  An alternative package that also looks promising is [lab.js](https://lab.js.org/).

[Bottle](https://bottlepy.org/docs/dev/) and [gevent](https://pypi.org/project/gevent/) are Python packages that we use to serve the experiment to the web and to store the results on the server.

- [Bottle](https://bottlepy.org/docs/dev/) is the Python web framework used for serving the experiment and storing the collected data.  Bottle was chosen because it is easy to use and well-documented.
- [gevent](https://pypi.org/project/gevent/) is our web server and handles network connections.  Gevent, too, is easy to use but at the same time it scales really well if needed.  I supports asynchronous processing and can simultaneously serve hundreds or even thousands of users.

The script `server.py` serves the experiment and stores the results in the subdirectory `data`.

Below are detailed instructions showing how to install and run the experiments.  You’ll need a virtual server running Ubuntu Linux (or similar).  Follow the instructions below for [DigitalOcean](https://www.digitalocean.com), a commercial cloud service provider.  People working at a University in Baden-Württemberg may try [bwCloud](bwCloud.md), a cloud service offered by the state.

## Create a virtual server (a “Droplet”) on DigitalOcean

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

## Install required software on the virtual server

1. Log into the virtual server using SSH in a terminal:
   - Copy the instance’s IP address from the list of instances (e.g., `193.196.54.221`).
   - Open a terminal and enter this command `ssh root@193.196.54.221` but with the actual IP address of your instance.  In this command, `root` is the default username used in DigitalOcean servers.  When using a bwCloud server, replace `root` with `ubuntu`.
   - SSH will warn you that the “authenticity of host XYZ can’t be established”.  That’s normal when you connect the first time.  Answer “yes” when asked whether you’d like to continue.
   - If all goes well, SSH will connect to the virtual server and show its command prompt, for instance, `root@test_instance:~$` on DigitalOcean or `ubuntu@test_instance:~$` on bwCloud.
2. Install required software packages: `sudo apt update && sudo apt install make python3-bottle python3-gevent r-cran-dplyr`

Done. You can now terminate the connection to the server by entering `exit`.  This will bring you back to the command prompt of your computer.

## Install the demo experiments on the virtual server

1. Connect to the virtual server: `ssh root@193.196.54.221`
2. To copy the demo experiments to the virtual server, simply clone its git repository: `git clone git@github.com:tmalsburg/selfhost_ling_expts.git`
3. Enter `ls selfhost_ling_expts` to see all files.  You should see:
   - `Makefile`: a file for starting and stopping the HTTP server that serves the experiment over the web
   - `README.md`: the file you’re currently reading
   - `server.py`: the script for serving the experiment and storing results on disk
   - `demo_stroop_task`: directory containing the simple stroop task
   - `demo_judgment_task`: directory containing the simple judgment task

## Run and test the stroop task

1. Enter the directory containing the experiment: `cd selfhost_ling_expts/demo_stroop_task`
2. To start the web server enter: `make start`
3. The server will use encrypted connections (`https://…`) if the directory contains a certificate and key (`cert.pem` and `key.pem`).  This will avoid messages show in some browser saying that the connection cannot be trusted.
4. You can now access the experiment in the browser at an URL like `http://193.196.54.221/` (unencrypted) or `https://193.196.54.221/` (encrypted) but using the IP address of your virtual server instance.
5. After you worked through the experiment, you will find a new file in the subdirectory `data` named something like `1244af49-9db5-410f-92bb-e4ecef23fc61.csv`.  This file contains the results of your test run.  The name of the file is a so-called [UUID](https://en.wikipedia.org/wiki/Universally_unique_identifier) which is (for all practical purposes) globally unique.

## Stop the experiment

1. Enter the directory containing the experiment: `cd selfhost_ling_expts/demo_stroop_task`
2. To stop the server enter: `make stop`

## Compiling all individual result files into one file

1. Enter the directory `data`.
2. Then execute: `Rscript combine_results.R`

This will create a new file `combined.tsv` with two additional columns:

- `participant_id`: This column contains the file name of each participant’s individual results file.  Since the file name is a [UUID](https://en.wikipedia.org/wiki/Universally_unique_identifier), this ID is practically guaranteed to be unique.  However, if someone participates multiple times in the same experiment, they’ll get multiple IDs, so there is not necessarily a 1-to-1 mapping between these IDs and actual people.
- `ctime`: contains the individual results file’s creation time.

The individual results will appear in chronological order in `combined.tsv`.

**Note:** For `ctime`, the script uses the time when the file was created on disk.  For this time to be accurate, the script must be run on the machine where the experiment was conducted.  If you transfer the files to another computer with (e.g., using `scp`), the times will no longer reflect the original creation time, but the time at which the files were copied.  So the suggested workflow is: First combine all results into one file.  Then transfer that file to wherever you’d like to process the data further.

## Technical comments for advanced users

The PID (process id) of the server process will be stored in `nohup.pid` and log messages, including errors, in `nohup.out`.

For testing, use (which blocks the shell):
``` sh :eval no
make test
```

## Acknowledgements

Thanks go to Judith Tonhauser, who provided useful comments and suggestions and helped test the software in this repository.
