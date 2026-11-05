
## A simple experiment demonstrating a judgment task in jsPsych

This experiment loosely replicates [Gibson & Thomas (1999)](http://dx.doi.org/10.1080/016909699386293) which investigated the missing-verb illusion: Main finding is that double-center embedded sentences in which the middle VP is missing are judged as comprehensible (or rather incomprehensible) as the analogous grammatical sentences.

Example:

1. The ancient manuscript that the grad student who the new card catalog had confused a great deal was studying in the library was missing a page.	
2. The ancient manuscript that the grad student who the new card catalog was studying in the library was missing a page.	
3. The ancient manuscript that the grad student who the new card catalog had confused a great deal was missing a page.	
4. The ancient manuscript that the grad student who the new card catalog had confused a great deal was studying in the library.	

To run the experiment execute `make start`.  For detailed instructions see [here](https://github.com/tmalsburg/selfhost_ling_expts).  Results will be stored in the subdirectory `data`: the ratings in one file per participant (`results_<uuid>.csv`, one row per sentence) and the language-background questions in `survey.csv` (one row per participant), linked by `participant_id`.  To combine all participants into one file with their survey answers added, run `Rscript R/combine_results.R demo_judgment_task/data` from the top of the repository; it writes `data/combined.csv`.  Lists of the Latin square design are handed out in rotation by the server (`/get_list` in `server.py`), so the number of participants per list differs by at most one.  `data/list_counter.txt` shows, for each list, how many participants started it and how many completed it (sent their data); the difference is the dropouts.  The columns `list` and `list_assignment` in the results record which list a participant saw and whether it came from the rotation (`server_rotation`) or, if the server lacks that route, from a random draw (`random_fallback`).  Delete `data/list_counter.txt` to restart the rotation for a new study.

### Stimuli

The file names are set at the top of `experiment.js`: `STIMULUS_FILE` (default `"target_sentences"`) and `FILLER_FILE` (default `"fillers"`), without extension.  The experiment uses `<name>.tsv` or, if there is none, `<name>.csv`.  The delimiter (tab or comma) is detected from the file's content, and quoted fields with commas inside are read correctly.

The columns are the same as in the self-paced reading demo, so one stimulus file works in both.  Three are required, **ItemID**, **List** and **Sentence**:

| Column | Required | Content |
| :--- | :---: | :--- |
| ItemID | yes | Item number or name (`1`, `F01`) |
| List | yes | The Latin square variant of the item, e.g. `a`–`d` or `1`–`4` |
| Sentence | yes | The sentence |
| QuestionText | no | Not used by this experiment |
| Condition | no | A descriptive name for the variant (`grammatical`, `missing-VP2`); recorded in the `condition` column of the results (`NA` without it), not used for the Latin square |

Without a header row the columns are read in the order ItemID, List, Sentence, QuestionText; Condition needs a header row.  With a header row the columns may be in any order, and names are matched without regard to case, spaces or underscores (`ItemID`, `item_id`, `Item ID`; German and Arabic names are recognised too).  A row without ItemID, List or Sentence stops the experiment with an error naming the row.

**Target sentences** (`target_sentences.tsv`), without a header row, tab-separated:

```
01	a	The ancient manuscript that the grad student who the new card catalog had confused a great deal was studying in the library was missing a page.
01	b	The ancient manuscript that the grad student who the new card catalog was studying in the library was missing a page.
```

The same with a header row, comma-separated (`target_sentences.csv`), with the optional Condition column:

```
ItemID,List,Condition,Sentence
01,a,grammatical,The ancient manuscript that the grad student who the new card catalog had confused a great deal was studying in the library was missing a page.
01,b,missing-VP1,The ancient manuscript that the grad student who the new card catalog was studying in the library was missing a page.
```

Every item needs every List label exactly once (here `a`–`d`), and the number of items should be a multiple of the number of List labels, so that each list has the same number of sentences per variant.

**Fillers** (optional) are not part of the Latin square: every participant sees every filler, mixed in with the targets, and fillers carry `list` 0 in the results.  They can go in either place, or both:

- **The filler file** (`fillers.tsv` or `fillers.csv`).  It needs **no List column**: without a header row it is read as ItemID, Sentence, QuestionText.  Filler IDs may be plain numbers (`1`, `2`, `3`, …), even the same numbers as target items; `list` 0 tells them apart.

  ```
  1	The children, tired after the trip, fell asleep in the car.
  2	The letter that the secretary typed was sent the next morning.
  ```

  or with a header row:

  ```
  ItemID,Sentence
  1,"The children, tired after the trip, fell asleep in the car."
  2,The letter that the secretary typed was sent the next morning.
  ```

- **The target file**, for a study that keeps targets and fillers together: give the filler rows **List `0`**.

  ```
  ItemID,List,Sentence
  01,a,The ancient manuscript that the grad student who the new card catalog had confused a great deal was studying in the library was missing a page.
  1,0,"The children, tired after the trip, fell asleep in the car."
  ```

List `0` is therefore reserved for fillers and cannot be used as a Latin square label.  Filler files in the older layout with a List column (e.g. `F01	filler	…`) are still read correctly.

Structure:
- `experiment.html` is boring: it only loads the experiment.
- `experiment.js`: This is where the experiment is defined.
- `style.css`: Customization of jsPsych appearance.
- `helpers.js`: Some helper functions for loading stimuli from `.tsv` or `.csv`, creating the Latin square, and for sending the results back to the server.
- `target_sentences.tsv`: Is where the stimuli are stored.
- `fillers.tsv` or `fillers.csv` (optional): Filler sentences, shown to every participant.

The experiment is served with the script `server.py` described [here](https://github.com/tmalsburg/selfhost_ling_expts).
