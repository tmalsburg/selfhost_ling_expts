
## A self-paced reading experiment for computers and phones

This experiment uses the same stimuli as the earlier jsPsych version of this demo: a conceptual replication of [Gibson & Thomas (1999)](http://dx.doi.org/10.1080/016909699386293) on the missing-verb illusion.  It differs in how the sentences are shown and in what it records:

- **The words are real text on the page**, rendered by a small custom jsPsych 8 plugin (`plugin-dom-self-paced-reading.js`) instead of being drawn on a canvas.  Long sentences wrap onto a second line like ordinary text.
- **Three presentation modes**, all self-paced (the participant advances every word; nothing is on a timer):
  1. moving window: only the current word is visible, the others are masked;
  2. cumulative: words stay visible once shown;
  3. centred: one word at a time in the middle of the screen.
- **One link for computers, phones and tablets.**  The experiment detects the device by itself.  On a computer everything is done with the keyboard; on a phone or tablet everything is done by tapping.  **Phones and tablets always use mode 3**; computers use the mode set in `experiment.js`.
- **One row per word** in the results, with the device, the presentation mode and the participant's list on every row.

To run the experiment, install the required software (`sudo apt install make python3-bottle python3-gevent`), enter this directory and execute `make test` (foreground, stop with Ctrl-C) or `make start` / `make stop` (background).  Then open the address shown in the shell.  For detailed instructions see [here](https://github.com/tmalsburg/selfhost_ling_expts).

The experiment is served by the shared `server.py` at the top of the repository, like the other demos.  It hands out the Latin square lists in rotation and stores the results as described under "Results" below.

Structure:
- `experiment.html` only loads the experiment.
- `experiment.js`: the experiment.  Everything a study needs to change is in the **YOUR STUDY** block at the top: settings, practice sentences, every text shown on screen and the questionnaire.  Nothing below that block needs editing.
- `plugin-dom-self-paced-reading.js`: the jsPsych plugin that presents a sentence word by word and records one reading time per word.
- `style.css`: how everything looks: font, size, margins, underlines and the three presentation modes.  The font (Inter) is embedded at the end of the file, so the experiment needs no font files and contacts no font service.
- `helpers.js`: loading the stimulus file, the Latin square, device detection and sending the results to the server.
- `target_sentences.tsv`: the stimuli.

### Computers, phones and tablets

| | Computer | Phone / tablet |
| :--- | :--- | :--- |
| Next word | space bar | tap anywhere on the screen |
| Questions | `F` = No, `J` = Yes | **No** button (left), **Yes** button (right) |
| Text screens | space bar | a button under the text |
| Presentation mode | `SPR_PRESENTATION_MODE` (1, 2 or 3) | always 3 |
| Texts | `DESKTOP_TEXTS` | `MOBILE_TEXTS` |

The device is decided once, at the start, by the device's primary input (the CSS media query `pointer: coarse`), not by the browser's name or the screen width.  A touchscreen laptop therefore counts as a computer, and an iPad counts as a tablet even though Safari on an iPad calls itself a Mac.  Only one kind of input is listened to: a computer ignores taps and clicks, a phone ignores the keyboard.

Phones are locked to mode 3 because modes 1 and 2 put a whole line of text on a narrow screen, and because mode 2 lets a participant tap through the sentence and read it at the end.  The lock is `MOBILE_PRESENTATION_MODE` in `experiment.js`.

`ALLOWED_DEVICES` restricts a study to computers or to phones and tablets.  A participant on another device sees `WRONG_DEVICE_TEXT` and is not assigned a list.

### Settings

All settings are at the top of `experiment.js`:

| Setting | Default | What it does |
| :--- | :--- | :--- |
| `SPR_PRESENTATION_MODE` | `2` | `1` moving window, `2` cumulative, `3` one word at a time in the centre (computers only) |
| `ADVANCE_KEY` | `" "` | Key that shows the next word |
| `QUESTION_PROBABILITY` | `0.33` | Share of sentences followed by a comprehension question |
| `PRACTICE_QUESTION_PROBABILITY` | `1` | The same for the practice sentences |
| `ALWAYS_ASK_ITEM_QUESTIONS` | `false` | `true` = always ask a sentence's own question (see below) |
| `ALLOW_GLOBAL_QUESTIONS` | `true` | Sentences without their own question get `GLOBAL_QUESTION_TEXT` |
| `GLOBAL_QUESTION_TEXT` | `"Was this sentence comprehensible?"` | The general question |
| `QUESTION_RESPONSE_TYPE` | `"yesno"` | `"yesno"` (scored) or `"text"` (typed answer, not scored) |
| `KEY_YES` / `KEY_NO` | `"j"` / `"f"` | Answer keys on a computer |
| `ALLOWED_DEVICES` | `["desktop", "mobile"]` | Computers, phones/tablets or both |
| `SURVEY_ENABLED` | `true` | Short questionnaire (age, gender, languages, handedness, comments) after the reading task |

Font, size, line width and colours are set at the top of `style.css` (`--spr-font-size`, `--spr-margin-fraction`, …).

**Questions follow a random subset of sentences**, because a question after every sentence changes how the sentences are read.  The subset is drawn per participant but stratified by condition: every condition gets the same number of questions.  With the 12 items and 4 conditions here, every participant answers exactly 4 questions in the main part, one per condition.  `ALWAYS_ASK_ITEM_QUESTIONS` should stay `false`, otherwise the number of questions depends on how many rows of the stimulus file carry a question.

The instructions and the on-screen key labels are generated from `KEY_YES`, `KEY_NO` and `ADVANCE_KEY`, so they always match the keys that are scored.

### Stimuli

The file names are set at the top of `experiment.js`: `STIMULUS_FILE` (default `"target_sentences"`) and `FILLER_FILE` (default `"fillers"`), without extension.  The experiment uses `<name>.tsv` or, if there is none, `<name>.csv`.  The delimiter (tab or comma) is detected from the file's content, and quoted fields with commas inside are read correctly.

The columns are the same as in the judgment demo, so one stimulus file works in both.  Three are required, **ItemID**, **List** and **Sentence**, and three are optional:

| Column | Required | Content |
| :--- | :---: | :--- |
| ItemID | yes | Item number or name (`1`, `F01`) |
| List | yes | The Latin square variant of the item, e.g. `a`–`d` or `1`–`4` |
| Sentence | yes | The sentence |
| QuestionText | no | A comprehension question for this item |
| CorrectAnswer | no | `Yes`/`No` (also `y`/`n`, `1`/`0`, `true`/`false`, `ja`/`nein`); makes the question count towards accuracy |
| Condition | no | A descriptive name for the variant (`garden-path`); recorded, not used for the Latin square |

Without a header row the first five columns are read in this order (ItemID, List, Sentence, QuestionText, CorrectAnswer), as in the earlier jsPsych version; Condition and any further columns need a header row.  With a header row the columns may be in any order, and names are matched without regard to case, spaces or underscores (`ItemID`, `item_id`, `Item ID`; German and Arabic names are recognised too).  Further columns are copied into the results as `stim_<name>`, which is a convenient way to carry per-item variables such as norming ratings into the analysis.

**Target sentences** (`target_sentences.tsv`), without a header row, tab-separated:

```
01	a	The ancient manuscript that the grad student who the new card catalog had confused a great deal was studying in the library was missing a page.	Was a page missing?	Yes
01	b	The ancient manuscript that the grad student who the new card catalog was studying in the library was missing a page.	Was a page missing?	Yes
```

The same with a header row, comma-separated (`target_sentences.csv`), with the optional Condition column:

```
ItemID,List,Condition,Sentence,QuestionText,CorrectAnswer
01,a,grammatical,The ancient manuscript that the grad student who the new card catalog had confused a great deal was studying in the library was missing a page.,Was a page missing?,Yes
01,b,missing-VP1,The ancient manuscript that the grad student who the new card catalog was studying in the library was missing a page.,Was a page missing?,Yes
```

The number of lists follows the number of variants per item, so a design with 2, 3, 6 or 8 conditions needs no change to the code.  Every item needs every List label exactly once, and conditions are balanced within each list when the number of items is a multiple of the number of List labels; the browser console warns otherwise.

**Regions:** words in curly braces are shown and timed as one unit: `the man who {I saw} left`.

**Fillers** (optional) are not part of the Latin square: every participant sees every filler, mixed in with the targets, and fillers carry `list` 0 (and `list_label` 0) in the results.  They can go in either place, or both:

- **The filler file** (`fillers.tsv` or `fillers.csv`).  It needs **no List column**: without a header row it is read as ItemID, Sentence, QuestionText, CorrectAnswer.  Filler IDs may be plain numbers (`1`, `2`, `3`, …), even the same numbers as target items; `list` 0 tells them apart.

  ```
  1	The children, tired after the trip, fell asleep in the car.	Were the children tired?	Yes
  2	The letter that the secretary typed was sent the next morning.
  ```

  or with a header row:

  ```
  ItemID,Sentence,QuestionText,CorrectAnswer
  1,"The children, tired after the trip, fell asleep in the car.",Were the children tired?,Yes
  2,The letter that the secretary typed was sent the next morning.,,
  ```

- **The target file**, for a study that keeps targets and fillers together: give the filler rows **List `0`**.

  ```
  ItemID,List,Sentence,QuestionText,CorrectAnswer
  01,a,The ancient manuscript that the grad student who the new card catalog had confused a great deal was studying in the library was missing a page.,Was a page missing?,Yes
  1,0,"The children, tired after the trip, fell asleep in the car.",Were the children tired?,Yes
  ```

List `0` is therefore reserved for fillers and cannot be used as a Latin square label.  Filler files in the older layout with a List column (e.g. `F01	filler	…`) are still read correctly.  Fillers with a QuestionText and CorrectAnswer count towards comprehension accuracy like targets.

### Results

All results are written to the subdirectory `data`:

- `results_<uuid>.csv`: one file per participant, written when the session ends, **one row per word** and one row per question.
- `survey.csv`: the questionnaire, one row per participant, linked to the results by `participant_id`.
- `list_counter.txt`: for each list, how many participants started it and how many completed it (sent their data); the difference is the dropouts.  It also holds the position in the list rotation.  Delete it to start again at list 1 with all counts at zero.

This is the same layout as on exphost.  Each participant's trials get a file of their own, so a failed or interrupted write can cost at most one participant's data, and a participant who withdraws is removed by deleting one file and their row in `survey.csv`.  To combine all participants into one file, with their survey answers added, run `Rscript R/combine_results.R demo_selfpacedreading/data` from the top of the repository; it writes `data/combined.csv`.  `server.py` locks `survey.csv` while appending, so participants who finish at the same moment cannot mix their rows; line breaks typed into the comments box stay inside the row.

The lists are handed out in rotation (`/get_list`), so the number of participants per list stays balanced.  If the experiment is served by a server without this endpoint, for example a plain static file server, lists are chosen at random and the `list_assignment` column says `random_fallback`.

The most important columns:

| Column | Content |
| :--- | :--- |
| `participant_id` | Random ID, one per session |
| `device` | `desktop` (computer) or `mobile` (phone or tablet) |
| `presentation_mode` | The mode this participant saw (always `3` on phones) |
| `list` | The participant's list, `L1`…`Ln`; **`0` marks a filler** |
| `item_id`, `list_label`, `condition` | The item and its variant |
| `is_practice` | `true` for the practice sentences (`item_id` 0) |
| `type` | `WORD` or `QUESTION` |
| `word_pos`, `word`, `rt` | Position, word (or region) and reading time in ms |
| `response`, `correct` | Answer to a question and whether it was correct |
| `question_shown`, `prev_question_shown` | Whether this sentence, and the one before, was followed by a question |
| `line_break` | `1` if the sentence wrapped onto a second line on this participant's screen |
| `accuracy`, `n_questions_*` | The participant's comprehension score, repeated on every row |
| `premature_responses` | Key presses or taps that came before the next word was on screen |
| `font_size_px`, `viewport_width_px`, `device_pixel_ratio` | The participant's screen |
| `stim_<name>` | Extra columns from the stimulus file |

Missing values are written as `NA`.  The reading time of a word is measured from the screen refresh in which the word appeared, not from the moment the program changed it.  The first key press of a sentence shows the first word and is not a reading time.

Because the font size is fixed, whether a sentence wraps depends on the screen width and on the length of the sentence, which can differ between conditions.  Check `line_break` (and `device`) before pooling.

### Notes

- On a computer, mode 2 can be keyed through quickly and the sentence read at the end.  Look for very short, uniform reading times when screening participants.
- jsPsych, its plugins and showdown are loaded from the unpkg CDN, as in the other demos.
- The font Inter is licensed under the SIL Open Font License 1.1; the licence text is in `style.css`.
