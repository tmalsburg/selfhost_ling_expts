## Create a virtual server on bwCloud

The cloud hosting service bwCloud is available to members of universities in the state of Baden-Württemberg, Germany.  If you don’t have access, try DigitalOcean (explained [here](https://github.com/tmalsburg/web_stroop_task#create-a-virtual-server-a-droplet-on-digitalocean-alternative-1)).  You can also use any other server running Ubuntu or any Linux distribution derived from Ubuntu or Debian.

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
      - Select the file containing your public key under “Load Public Key from a file”.  On Linux, this file can be found at: `~/.ssh/id_rsa.pub`.  On MacOS it’s probably in the same location.
      - Click “Import Key Pair” at the bottom left.
   - Click “Launch Instance”.  The new instance will then appear in the list of instances.

### Archiving the bwCloud virtual server after study completion

1. Visit [bwCloud](https://portal.bw-cloud.org/project/instances/).
2. Select “Instances” in the menu on the left.
3. From the “Actions” menu in the line of your virtual server instance, select “Shelve Instance”.  A snapshot of the instance will be saved and the computing resources will be released so that others can use them.  The instance will now be listed with status “Shelved Offloaded”.  After shelving the instance, you can no longer access it, so make sure that you retrieve the data before shelving.  If necessary, it is possible to reactivate (“unshelve”) the instance later.

