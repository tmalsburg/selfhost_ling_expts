
## A simple experiment demonstrating a self-paced reading task in jsPsych

This experiment conceptually replicates [Gibson & Thomas (1999)](http://dx.doi.org/10.1080/016909699386293) which investigated the missing-verb illusion: Main finding is that double-center embedded sentences in which the middle VP is missing are judged as comprehensible (or rather incomprehensible) as the analogous grammatical sentences.  Gibson and Thomas used a rating task, but here we use centered self-paced reading which makes the task almost impossibly difficult.

Example:

1. The ancient manuscript that the grad student who the new card catalog had confused a great deal was studying in the library was missing a page.	
2. The ancient manuscript that the grad student who the new card catalog was studying in the library was missing a page.	
3. The ancient manuscript that the grad student who the new card catalog had confused a great deal was missing a page.	
4. The ancient manuscript that the grad student who the new card catalog had confused a great deal was studying in the library.	

To run the experiment execute `make start`.  For detailed instructions see [here](https://github.com/tmalsburg/selfhost_ling_expts).  Results will be stored in the subdirectory `data`, with one file per participant.  Lists of the Latin square design are selected randomly.

Structure:
- `experiment.html` is boring: it only loads the experiment.
- `experiment.js`: This is where the experiment is defined.
- `style.css`: Customization of jsPsych appearance.
- `helpers.js`: Some helper functions for loading stimuli from `.tsv`, creating the Latin square, and for sending the results back to the server.
- `target_sentences.tsv`: Is where the stimuli are stored.

The experiment is served with the script `server.py` described [here](https://github.com/tmalsburg/selfhost_ling_expts).
