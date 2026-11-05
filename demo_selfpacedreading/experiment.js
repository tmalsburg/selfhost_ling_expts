
// This experiment loosely replicates Gibson & Thomas (1999).

// =========================================================================
// YOUR STUDY -- everything in this part can be changed.
//
//   Settings ................ how the experiment behaves
//   Practice sentences ...... PRACTICE_ITEMS
//   Texts shown on screen ... STUDY_INFO, then one set of screens for
//                             computers (DESKTOP_TEXTS) and one for phones
//                             and tablets (MOBILE_TEXTS), END_TITLE /
//                             END_MESSAGE, WRONG_DEVICE_TEXT
//   Questionnaire ........... SURVEY_INTRO, SURVEY_FORM
//
// The same link works on computers, phones and tablets.  The experiment
// detects the device by itself: on a computer everything is answered with
// the keyboard (touchscreen and mouse do nothing), on a phone or tablet by
// tapping (the keyboard does nothing).  The sentences and the font size are
// the same on both; the texts are not, and phones and tablets always read
// one word at a time in the centre (mode 3).
//
// The sentences themselves are in the stimulus files (STIMULUS_FILE and
// FILLER_FILE below), the look (font, size, margins, colours) at the top of
// style.css.
// =========================================================================

// ---- Settings ------------------------------------------------------------
// The reasoning behind each setting is in README.md, "Settings".

// Stimulus files, in this directory.  Give the name without extension: the
// experiment uses name.tsv or, if there is none, name.csv, and detects tab-
// or comma-separated from the content.  (A name with .tsv or .csv is used
// exactly as given.)  The filler file is optional; without it there are no
// fillers.
const STIMULUS_FILE = "target_sentences";
const FILLER_FILE = "fillers";

// Reading
const SPR_PRESENTATION_MODE = 1;  // 1 = moving window, 2 = cumulative,
// 3 = one word at a time in the centre.  Computers only: phones and tablets
// always use mode 3.
const ADVANCE_KEY = " ";          // key that shows the next word (" " = space bar)

// Comprehension questions
// Share of sentences followed by a question: 0 = never, 1 = after every one.
// The questions are spread evenly over the conditions.
const QUESTION_PROBABILITY = 0.33;
// The same for the practice sentences (1 = after every practice sentence).
const PRACTICE_QUESTION_PROBABILITY = 1;
// true = always ask a sentence's own question (QuestionText column), whatever
// QUESTION_PROBABILITY says.  Keep false unless you have a reason.
const ALWAYS_ASK_ITEM_QUESTIONS = false;
// Sentences without their own question get this general one (false = none).
const ALLOW_GLOBAL_QUESTIONS = true;
const GLOBAL_QUESTION_TEXT = "Was this sentence comprehensible?";
// How every question in the experiment is answered:
//   "yesno" = press KEY_YES or KEY_NO; scored against the CorrectAnswer column
//   "text"  = type an answer; saved as typed, never scored automatically
const QUESTION_RESPONSE_TYPE = "yesno";
const KEY_YES = "j";              // the instructions and on-screen labels
const KEY_NO = "f";               // are generated from these two

// Devices
// Which devices may take part: "desktop" = computers and laptops (keyboard),
// "mobile" = phones and tablets (touch).  Anyone on another device sees
// WRONG_DEVICE_TEXT and is not assigned a list.
const ALLOWED_DEVICES = ["desktop", "mobile"];

// Questionnaire
// true = show the questionnaire (SURVEY_FORM below) after the reading task.
// Do not change this during data collection: it changes the results columns.
const SURVEY_ENABLED = true;

// ---- Practice sentences --------------------------------------------------
// Shown before the main experiment, in this order, each followed by a
// question (see PRACTICE_QUESTION_PROBABILITY).  A practice sentence without
// a question gets GLOBAL_QUESTION_TEXT.  Not saved as experimental items:
// practice rows carry item_id 0 and list_label "practice" in the results.
const PRACTICE_ITEMS = [
  { sentence: "The cat sat on the mat.", question: "Was the cat on the mat?" },
  { sentence: "The weather is very nice today.", question: "Is it raining today?" },
  { sentence: "Apples grow on trees." }
];

// ---- Texts shown on screen -----------------------------------------------
// Written in Markdown: **bold**, *italic*, "- " for a bullet point, "#" for a
// heading.  ${...} inserts a value from the settings above -- keep those, or
// the screen will name keys the experiment does not use.
//
// Every screen exists twice: DESKTOP_TEXTS for computers (answered with the
// keyboard) and MOBILE_TEXTS for phones and tablets (answered by tapping).
// Each participant sees only the set for their device.  Change both when you
// change one.

// Filled in from the settings above; nothing to change here.
const KEYS_USED = QUESTION_RESPONSE_TYPE === "text" ? "" :
  ` (Space, ${KEY_NO.toUpperCase()}, ${KEY_YES.toUpperCase()})`;
const HOW_TO_ANSWER_DESKTOP = QUESTION_RESPONSE_TYPE === "text"
  ? `- Type your answer into the box and press Enter, or use the Continue button.`
  : `- To answer "Yes", press **${KEY_YES.toUpperCase()}**.\n- To answer "No", press **${KEY_NO.toUpperCase()}**.`;
const HOW_TO_ANSWER_MOBILE = QUESTION_RESPONSE_TYPE === "text"
  ? `- Type your answer into the box, then tap **Continue**.`
  : `- To answer, tap **Yes** or **No**.`;

// About the study: shown on the first screen on every device.
const STUDY_INFO = `This survey is **conducted** by STUDENT X as part of a project at the Institute of Linguistics of the University of Stuttgart. The study's purpose is to advance our understanding of human language.

- **Anonymity:** All data is collected anonymously and strictly for academic research purposes. We are committed to maintaining your privacy.
- **Eligibility:** Participation is open to individuals who are 18 years of age or older.
- **Inquiries:** Should you have any questions or comments, do not hesitate to reach out to us via email at address@e-mail.com. We value your feedback and are here to assist.`;

// ---- On a computer: everything is answered with the keyboard ----
const DESKTOP_TEXTS = {
  // First screen: information about the study and consent.
  welcome: `#Welcome to this survey.

${STUDY_INFO}
- **How to take part:** You will use your keyboard${KEYS_USED}.

**Consent:** If you agree to participate under these conditions, please press the space bar to proceed.`,

  // Second screen: how the task works.
  instructions: `**Instructions:**
You will be presented with a text on your screen, one word at a time.
- To move to the next word, press the **space bar**.
- After **some** of the sentences, you will be asked a question about the sentence.
- There is no way to tell in advance which sentences are followed by a question, so please read every one carefully.
${HOW_TO_ANSWER_DESKTOP}
- Try to maintain a steady reading pace that reflects your natural reading speed.

We will start with a few **practice trials**, where a question follows every sentence.

Press the space bar to proceed.`,

  // Between the practice and the main experiment.
  break: `The practice is over. We will now start the main experiment.

Press the space bar to begin.`,

  // Last screen before the results are sent.
  finish: `You're done. Thank you!

Press the space bar to send us the results. Please wait for the confirmation before closing the window.`
};

// ---- On a phone or tablet: everything is answered by tapping ----
// Each screen has a button under it; `button` is its label.
const MOBILE_TEXTS = {
  welcome: `#Welcome to this survey.

${STUDY_INFO}
- **How to take part:** You will tap the screen. Please hold your phone upright and keep it that way until the end.

**Consent:** If you agree to participate under these conditions, please tap the button below to proceed.`,
  welcome_button: "I agree",

  instructions: `**Instructions:**
You will be presented with a text on your screen, one word at a time.
- To move to the next word, **tap anywhere on the screen**.
- After **some** of the sentences, you will be asked a question about the sentence.
- There is no way to tell in advance which sentences are followed by a question, so please read every one carefully.
${HOW_TO_ANSWER_MOBILE}
- Try to maintain a steady reading pace that reflects your natural reading speed.

We will start with a few **practice trials**, where a question follows every sentence.`,
  instructions_button: "Start the practice",

  break: `The practice is over. We will now start the main experiment.`,
  break_button: "Begin",

  finish: `You're done. Thank you!

Tap the button below to send us the results. Please wait for the confirmation before closing the window.`,
  finish_button: "Send my results"
};

// Shown once the results have been saved -- the very last thing participants
// see.  END_MESSAGE is HTML, not Markdown.
const END_TITLE = "Thank you for taking part!";
const END_MESSAGE = `
  <p>Your responses have been saved. You may now close this browser window.</p>
  <p>If you have any questions about the study, contact us at
     <a href="mailto:address@e-mail.com">address@e-mail.com</a>.</p>`;

// Shown instead of the experiment on a device ALLOWED_DEVICES excludes.
// HTML, not Markdown.
const WRONG_DEVICE_TEXT = `
  <h1>Please use a different device</h1>
  <p>This study cannot be done on this device. Please open the same link on
     a computer with a keyboard.</p>`;


// ---- Questionnaire (only if SURVEY_ENABLED) -----------------------------
// Shown after the reading task.  Every field's `name` becomes a column in
// the results file, survey_<name> -- e.g. name="age" gives survey_age -- so
// a field can be added, removed or renamed here and nothing else needs to
// change.  `required` makes a field obligatory.
const SURVEY_INTRO = `**Almost done.** Before we save your responses, please tell us a little about yourself. This helps us describe who took part; it cannot be linked back to you.`;

const SURVEY_FORM = `
          <div class="survey-form">
            <div class="survey-row">
              <label class="survey-label" for="q-age">Age</label>
              <input id="q-age" type="number" name="age" min="18" max="120" step="1" required>
            </div>

            <div class="survey-row">
              <label class="survey-label" for="q-gender">Gender</label>
              <select id="q-gender" name="gender" required>
                <option value="">–</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="non-binary">Non-binary</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>

            <div class="survey-row">
              <label class="survey-label" for="q-native_language">Native language(s)</label>
              <input id="q-native_language" type="text" name="native_language" required>
            </div>

            <div class="survey-row">
              <label class="survey-label" for="q-other_languages">Other languages you speak</label>
              <input id="q-other_languages" type="text" name="other_languages">
            </div>

            <div class="survey-row">
              <label class="survey-label" for="q-handedness">Handedness</label>
              <select id="q-handedness" name="handedness">
                <option value="">–</option>
                <option value="right">Right-handed</option>
                <option value="left">Left-handed</option>
                <option value="ambidextrous">Ambidextrous</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>

            <div class="survey-row survey-row-wide">
              <label class="survey-label" for="q-comments">Anything you would like to tell us? (optional)</label>
              <textarea id="q-comments" name="comments" rows="3"></textarea>
            </div>
          </div>
        `;

// =========================================================================
// PROGRAM CODE -- no need to edit anything below this line.
// =========================================================================

async function runExperiment() {
  // How the program runs, in order.  Each step is one function below.
  //
  //   1. startSession()          participant ID, start time, device
  //                              (computer or phone/tablet)
  //   2. loadStimulusFiles()     target sentences, fillers, checks
  //   3. drawParticipantList()   this participant's Latin square list, shuffled
  //   4. buildTimeline()         welcome -> instructions -> practice -> break
  //                              -> sentences -> questionnaire -> finish
  //        addSentenceTrials()   fixation + sentence (+ question) per item
  //   5. finishSession()         when the last screen is done:
  //        buildResultRows()     one CSV row per word and per question
  //        saveData()            (helpers.js) send it to the server
  const session = startSession();
  // Lets style.css lay the page out for the device (.device-desktop /
  // .device-mobile); the plugin and this file set no styles themselves.
  document.documentElement.classList.add("device-" + session.device);

  try {
    // Before a list is drawn, so a turned-away participant does not use up
    // a place in the list rotation.
    if (!ALLOWED_DEVICES.includes(session.device)) {
      document.body.innerHTML = `<div class="end-screen">${WRONG_DEVICE_TEXT}</div>`;
      return;
    }

    // Filled in below; jsPsych only reads it once the session has ended.
    let study = null;
    const jsPsych = initJsPsych({
      show_progress_bar: true,
      on_finish: () => finishSession(jsPsych, session, study)
    });

    // Keep the browser from scrolling the page when the response keys are used:
    preventScrollKeys([ADVANCE_KEY]);

    const files = loadStimulusFiles();
    const list = drawParticipantList(jsPsych, files.target_sentences, files.fillers);
    study = {
      ...files, ...list, practice_stimuli: practiceStimuli(),
      device: session.device
    };

    await loadExperimentFont();

    jsPsych.run(buildTimeline(study));

  } catch (e) {
    console.error(e);
    document.body.innerHTML = `<div class="load-error">
      <h1>Error loading experiment</h1>
      <p>${e.message}</p>
      <p>Please check the console for more details.</p>
    </div>`;
  }
}

// ---- 1. Session ------------------------------------------------------------

function startSession() {
  const join_date = new Date();
  return {
    participant_id: "P" + Math.random().toString(36).substr(2, 8).toUpperCase(),
    join_time: join_date.toISOString(),
    join_time_local: localTimestamp(join_date),
    timezone: participantTimeZone(),
    start_perf: performance.now(),
    // "desktop" (keyboard) or "mobile" (touch) -- see detectDevice() in
    // helpers.js.  Fixed for the whole session.
    device: detectDevice()
  };
}

// Phones and tablets always read in mode 3 (one word at a time, centred),
// whatever SPR_PRESENTATION_MODE says; computers use SPR_PRESENTATION_MODE.
// Modes 1 and 2 put a whole line of text on a narrow screen, and mode 2 is
// the one a participant can defeat by tapping through the sentence and
// reading it at the end -- on the device where tapping is cheapest.  The
// mode actually used is written to every row as `presentation_mode`.
const MOBILE_PRESENTATION_MODE = 3;

function presentationMode(device) {
  return device === "mobile" ? MOBILE_PRESENTATION_MODE : SPR_PRESENTATION_MODE;
}

// ---- 2. Stimulus files -------------------------------------------------------

function loadStimulusFiles() {
  // Load stimuli.  The filename is given without an extension: loadStimuli()
  // tries .tsv and .csv and uses whichever exists, and sniffs the
  // delimiter from the file itself, so a study can ship whatever format its
  // authors work in.
  const all_rows = loadStimuli(STIMULUS_FILE);
  if (!all_rows || all_rows.length === 0) {
    throw new Error(`Could not load ${STIMULUS_FILE}(.tsv|.csv) or it is empty.`);
  }

  // Fillers are optional.  They come from either place, or both:
  //   - the filler file (FILLER_FILE): no List column needed, and IDs may be
  //     plain numbers (1, 2, 3, ...), even the same numbers as target items;
  //   - rows with List 0 in the target file, for a study that keeps targets
  //     and fillers in one file.
  //
  // They are NOT part of the Latin square.  Every participant sees every
  // filler, identical across lists — that is the point of a filler — so they
  // are excluded from latinSquareLists() and appended to whichever list the
  // participant drew.  In the data they are marked by `list = 0` (and
  // list_label 0), meaning "belongs to no list"; target rows carry L1...Ln.
  // A filler and a target with the same ItemID are therefore told apart by
  // `list`.
  const target_sentences = all_rows.filter(row => row[1] !== "0");
  target_sentences.extra_columns = all_rows.extra_columns;
  if (target_sentences.length === 0) {
    throw new Error(`${STIMULUS_FILE}: no target sentences (every row has List 0).`);
  }
  const filler_file = loadStimuli(FILLER_FILE, { optional: true, filler: true });
  const fillers = [...all_rows.filter(row => row[1] === "0"), ...filler_file];
  fillers.extra_columns = filler_file.extra_columns;
  // Identity, not a column: the rows keep the same five-element shape as the
  // targets, and a Set survives the shuffle below that mixes the two together.
  const filler_rows = new Set(fillers);
  // Optional multi-word regions, marked with {braces} in the Sentence
  // column -- see splitRegions() in helpers.js.  Flags typos such as a
  // missing closing brace.
  validateRegions([...target_sentences, ...fillers]);
  // Extra stimulus columns, in the order they appear in the file: the target
  // file's order first, then any column only the filler file has.  This is
  // the order they will appear in the results CSV.
  const stim_extra_columns = [
    ...(target_sentences.extra_columns || []),
    ...(fillers.extra_columns || []).filter(
      n => !(target_sentences.extra_columns || []).includes(n))
  ];
  // One row's worth of extras, every column present so the CSV stays
  // rectangular: a row from a file without that column, and every practice
  // row, gets NA rather than a ragged line.
  const stimExtras = trial => {
    const out = {};
    stim_extra_columns.forEach(name => {
      out["stim_" + name] = (trial.stim_extra && trial.stim_extra[name]) ?? "NA";
    });
    return out;
  };
  if (fillers.length > 0) {
    console.info(`${fillers.length} filler sentences loaded (List 0); shown to every participant.`);
  }

  return { target_sentences, fillers, filler_rows, stimExtras };
}

// ---- 3. This participant's list ----------------------------------------------

function drawParticipantList(jsPsych, target_sentences, fillers) {
  // Compose list.  The server hands out lists in rotation so that the lists
  // fill up evenly; it falls back to random assignment if unavailable.
  const assignment = assignedLatinSquareList(target_sentences);
  if (!assignment || !assignment.stimuli) {
    throw new Error("Latin square randomization failed to produce a list.");
  }
  // Fillers go in before the shuffle, so they are interleaved with the
  // targets rather than blocked at one end.
  const stimuli = jsPsych.randomization.shuffle([...assignment.stimuli, ...fillers]);

  return { assignment, stimuli };
}

function practiceStimuli() {
  // Practice items (PRACTICE_ITEMS above) in the same row shape as the
  // stimulus file: [ItemID, List, Sentence, QuestionText].  Item 0 and the
  // label "practice" mark them in the results.
  return PRACTICE_ITEMS.map(item =>
    item.question === undefined
      ? [0, "practice", item.sentence]
      : [0, "practice", item.sentence, item.question]);
}

async function loadExperimentFont() {
  // Load the experiment font (embedded in style.css) before the first
  // trial.  Browsers fetch a webfont only once text needs it, so without
  // this the first sentence could be laid out -- and its line breaks
  // measured -- in a fallback font.  The size is not chosen here: it is
  // fixed in style.css (--spr-font-size).
  if (document.fonts) {
    const family = getComputedStyle(document.documentElement)
      .getPropertyValue('--spr-font-family').trim();
    try {
      await Promise.all(['400', '700', 'italic 400'].map(face =>
        document.fonts.load(`${face} 16px ${family}`)));
    } catch (err) {
      console.warn('Experiment font failed to load:', err);
    }
    if (!document.fonts.check(`16px ${family}`)) {
      console.warn(`Experiment font (${family}) is not available; ` +
        `the browser is using a fallback font.`);
    }
  }
}

// ---- 4. The timeline -----------------------------------------------------------

function buildTimeline(study) {
  const device = study.device;
  // One screen of text: on a computer it waits for the space bar, on a phone
  // or tablet for a tap on its button (see DESKTOP_TEXTS / MOBILE_TEXTS).
  const textScreen = name => device === "mobile"
    ? {
      type: jsPsychHtmlButtonResponse,
      stimulus: md(MOBILE_TEXTS[name]),
      choices: [MOBILE_TEXTS[name + "_button"]]
    }
    : {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: md(DESKTOP_TEXTS[name]),
      choices: [" "]
    };

  // Structure of experiment:
  let pages = [];

  pages.push(textScreen("welcome"));
  pages.push(textScreen("instructions"));

  addSentenceTrials(pages, study.practice_stimuli, true, PRACTICE_QUESTION_PROBABILITY, study.filler_rows, device);

  pages.push(textScreen("break"));

  addSentenceTrials(pages, study.stimuli, false, QUESTION_PROBABILITY, study.filler_rows, device);

  // Demographic questionnaire.  One page, one trial: survey-html-form hands
  // back an object keyed by each input's `name`, and those names become
  // `survey_*` columns automatically, so adding a field here needs no change
  // in on_finish.
  //
  // Only the two questions that are covariates in the analysis are required;
  // the rest can be left blank, and the categorical ones carry an explicit
  // "prefer not to say" rather than forcing a choice.  Remove `required` if
  // your ethics approval calls for every question to be skippable.
  if (SURVEY_ENABLED) {
    pages.push({
      type: jsPsychSurveyHtmlForm,
      preamble: md(SURVEY_INTRO),
      html: SURVEY_FORM,
      button_label: "Continue",
      // The reshaping loop finds this trial by the flag, never by position.
      data: { is_survey: true }
    });
  }

  pages.push(textScreen("finish"));

  return pages;
}

// One fixation + sentence (+ comprehension question) per stimulus row, added
// to `pages`.
function addSentenceTrials(pages, stim_list, is_practice, question_probability, filler_rows, device) {
  // Which sentences carry a question is drawn once for the whole block, so
  // the count is fixed and balanced over conditions; only the identity of
  // the probed items varies between participants.
  const ask = assignQuestionTrials(stim_list, question_probability);
  // Surface typos in the CorrectAnswer column now, while piloting, rather
  // than as an unexplained accuracy dip after data collection.
  validateCorrectAnswers(stim_list);
  // Answering a question changes what precedes the *next* sentence, so
  // whether one intervened is logged rather than left in the residual.
  let previous_had_question = null;

  stim_list.forEach((stim, index) => {
    const id = stim[0];
    // Column 2 of the stimulus file: the Latin square variant of this item.
    const list_label = stim[1];
    // Optional descriptive label ("garden-path"), absent from most files.
    const cond = stim.condition ?? "NA";
    const sent = stim[2];
    const specific_question = stim[3]; // Column 4 (optional)
    // Column 5 (optional): the expected answer, in whatever notation the
    // stimulus file uses — Yes/No, 1/0, true/false.  Normalised here so the
    // comparison below is against the same canonical form the response is
    // recorded in.  null means "nothing to score", either because the cell
    // is empty or because it could not be read (already reported above).
    const correct_answer = normalizeYesNo(stim[4]);
    // Set-membership rather than a column, so the stimulus file format is
    // unchanged.  Only used to write `list = 0` on these rows.
    const is_filler = filler_rows.has(stim);

    if (!sent) return;

    // Determine question text.  A designed probe from the stimulus file is
    // asked unconditionally unless configured otherwise; the generic
    // attention-check question is asked only on the sampled trials.
    let question_text = null;
    let question_is_item_specific = false;
    if (specific_question) {
      if (ALWAYS_ASK_ITEM_QUESTIONS || ask[index]) {
        question_text = specific_question;
        question_is_item_specific = true;
      }
    } else if (ALLOW_GLOBAL_QUESTIONS && ask[index]) {
      question_text = GLOBAL_QUESTION_TEXT;
    }
    const question_shown = question_text !== null;

    // An answer only scores the question it was written for.  A row with a
    // CorrectAnswer but an empty QuestionText gets the generic "Was this
    // sentence comprehensible?", which has no right answer — scoring that
    // against the item's answer marks a fifty-fifty judgement right or
    // wrong and quietly corrupts the accuracy.
    const scored_answer = question_is_item_specific ? correct_answer : null;

    // Fixation
    pages.push({
      type: jsPsychHtmlKeyboardResponse,
      // Same box as a sentence, so the asterisk lands on the sentence's
      // line -- see .spr-fixation in style.css.
      stimulus: '<div class="spr-container"><span class="spr-fixation"></span></div>',
      choices: [],
      trial_duration: 500
    });

    // Reading
    pages.push({
      type: jsPsychDomSelfPacedReading,
      sentence: sent,
      regions: splitRegions(sent),
      presentation_mode: presentationMode(device),
      // Keys on a computer, taps on a phone or tablet -- never both.
      input: device === "mobile" ? "touch" : "keyboard",
      choices: [ADVANCE_KEY],
      data: {
        item_id: id,
        list_label: list_label,
        condition: cond,
        is_practice: is_practice,
        is_filler: is_filler,
        stim_extra: stim.extra,
        question_shown: question_shown,
        prev_question_shown: previous_had_question
      }
    });

    // Question (only if text exists)
    if (question_text) {
      // `is_question` is what the reshaping loop in on_finish keys on.  It
      // must be set on every question trial type, whatever the response
      // format, or that trial's data never reaches the CSV.
      const question_data = {
        item_id: id,
        list_label: list_label,
        condition: cond,
        is_practice: is_practice,
        is_filler: is_filler,
        stim_extra: stim.extra,
        is_question: true,
        question_shown: true,
        prev_question_shown: previous_had_question,
        correct_response: scored_answer
      };

      if (QUESTION_RESPONSE_TYPE === "text") {
        pages.push({
          type: jsPsychSurveyText,
          questions: [{
            prompt: `<p class="spr-question-text">${question_text}</p>`,
            name: 'answer',
            // Computer: a one-line box, Enter submits.  Phone/tablet: a
            // box that grows downward as the answer gets longer (sized in
            // style.css); Continue submits.
            rows: device === "mobile" ? 2 : 1,
            columns: device === "mobile" ? 20 : 50,
            required: true
          }],
          button_label: 'Continue',
          data: question_data,
          on_load: () => {
            // Browsers that cannot grow a box from CSS alone (no
            // `field-sizing`, e.g. older Safari) get the same effect here.
            if (device !== "mobile" || CSS.supports("field-sizing", "content")) return;
            const box = document.querySelector("#jspsych-content textarea");
            if (!box) return;
            box.addEventListener("input", () => {
              box.style.height = "auto";
              box.style.height = box.scrollHeight + "px";
            });
          },
          on_finish: function (data) {
            // survey-text hands back an object keyed by the question name.
            // Flatten it to the raw string so `response` holds the same
            // kind of value for every question type.
            const typed = (data.response && data.response.answer) ?? "";
            // Stored verbatim — leading and trailing spaces included — so
            // nothing is lost before manual scoring.  Only the emptiness
            // test is done on the trimmed value.
            data.response = String(typed).trim() === "" ? "NA" : String(typed);
            // Never auto-scored: `correct` stays NA for text trials and
            // they are excluded from the accuracy columns.
            data.correct = null;
          }
        });
      } else if (device === "mobile") {
        // Phone or tablet: two buttons, No on the left and Yes on the right
        // -- the same sides as the F and J keys on a computer.
        const answers = ["No", "Yes"];
        pages.push({
          type: jsPsychHtmlButtonResponse,
          stimulus: `
            <div class="comp-question">
              <p class="spr-question-text">${question_text}</p>
            </div>
          `,
          choices: answers,
          button_html: answer => `
            <button class="comp-btn comp-btn-${answer.toLowerCase()}">
              <span class="comp-btn-box">${answer}</span>
            </button>`,
          // Without "flex" the plugin lays the buttons out with inline
          // styles; with it the layout is left to style.css.
          button_layout: "flex",
          data: question_data,
          on_finish: function (data) {
            // The plugin records the index of the button tapped.  A null
            // response must not be silently scored as "No".
            const response_text = answers[data.response] ?? "NA";
            data.response = response_text;
            if (scored_answer && response_text !== "NA") {
              data.correct = (response_text === scored_answer);
            }
          }
        });
      } else {
        pages.push({
          type: jsPsychHtmlKeyboardResponse,
          stimulus: `
            <div class="comp-question">
              <p class="spr-question-text">${question_text}</p>
              <div class="comp-btn-container">
                <div id="btn-no" class="comp-btn comp-btn-no">
                  <div class="comp-btn-box">${KEY_NO.toUpperCase()}</div>
                  <div class="comp-btn-label">No</div>
                </div>
                <div id="btn-yes" class="comp-btn comp-btn-yes">
                  <div class="comp-btn-box">${KEY_YES.toUpperCase()}</div>
                  <div class="comp-btn-label">Yes</div>
                </div>
              </div>
            </div>
          `,
          choices: [KEY_NO, KEY_YES],
          data: question_data,
          on_finish: function (data) {
            // A null response (trial ended without a keypress) must not be
            // silently scored as "No".
            let response_text = "NA";
            if (data.response === KEY_YES) response_text = "Yes";
            else if (data.response === KEY_NO) response_text = "No";
            data.response = response_text;

            // Only score when the stimulus file defined an expected answer
            // *for the question that was actually asked*.  Both sides are
            // already canonical "Yes"/"No" here.
            if (scored_answer && response_text !== "NA") {
              data.correct = (response_text === scored_answer);
            }
          }
        });
      }
    }

    previous_had_question = question_shown;
  });
}

// ---- 5. At the end: results ----------------------------------------------------

// Called by jsPsych once the last screen is done.
async function finishSession(jsPsych, session, study) {
  const end_date = new Date();
  const end_time = end_date.toISOString();
  const end_time_local = localTimestamp(end_date);
  const total_duration_sec = Math.round((performance.now() - session.start_perf) / 1000);
  const raw_data = jsPsych.data.get().values();
  const clean_rows = buildResultRows(raw_data, session, study,
    { end_time, end_time_local, total_duration_sec });
  const survey_columns = surveyColumns(raw_data);
  const { participant_id, join_time, timezone } = session;

  if (clean_rows.length === 0) {
    await saveData("No experimental data collected.", { title: END_TITLE, message: END_MESSAGE });
    return;
  }

  const csv_content = csvFrom(clean_rows);

  // The questionnaire, as its own one-row payload.  join_time and
  // timezone come along so the survey table can be read on its own
  // without joining to the trials; everything else stays there.  The
  // key back into the trial file is participant_id.
  const survey_row = Object.keys(survey_columns).length ? csvFrom([{
    participant_id: participant_id,
    join_time: join_time,
    timezone: timezone,
    ...survey_columns
  }]) : null;

  // Trials first, deliberately.  The reading times are the
  // irreplaceable part of a session; the demographics can be asked
  // again. Sending them in this order means a failure of the second
  // POST can never put the first at risk.
  await saveData(csv_content, {
    title: END_TITLE, message: END_MESSAGE, survey: survey_row
  });
}

// Session-level comprehension scores, written onto every row.
function scoreComprehension(raw_data) {
  // Comprehension accuracy, computed before the rows are built so it can
  // be written onto every one of them.
  //
  // Only questions that carry a CorrectAnswer in the stimulus file are
  // scorable: the generic "Was this sentence comprehensible?" has no
  // right answer, and counting it as wrong would be meaningless.
  // Practice is excluded — it is where the task is being learned.
  // Unanswered questions are counted separately rather than scored as
  // errors, so a participant who never responded is visible as missing
  // data instead of appearing to have answered everything wrong.
  const is_question_trial = trial => trial.is_question === true;

  let n_questions_asked = 0;
  let n_questions_scored = 0;
  let n_questions_correct = 0;
  let n_questions_unanswered = 0;

  raw_data.forEach(trial => {
    if (!is_question_trial(trial) || trial.is_practice) return;
    n_questions_asked++;
    if (trial.response === 'NA') {
      n_questions_unanswered++;
      return;
    }
    if (trial.correct === undefined || trial.correct === null) return;
    n_questions_scored++;
    if (trial.correct) n_questions_correct++;
  });

  // NA, not 0: no scorable question is not the same as none correct.
  const accuracy = n_questions_scored > 0
    ? Math.round(1000 * n_questions_correct / n_questions_scored) / 1000
    : "NA";

  console.info(
    `Comprehension accuracy: ${n_questions_correct}/${n_questions_scored} ` +
    `scored (${accuracy}); ${n_questions_asked} questions asked, ` +
    `${n_questions_unanswered} unanswered.`
  );

  return {
    n_questions_asked, n_questions_scored, n_questions_correct,
    n_questions_unanswered, accuracy
  };
}

// The questionnaire answers, one survey_<name> entry per form field.
function surveyColumns(raw_data) {
  // Demographic answers, flattened to one `survey_<name>` column each.
  // These go into their own file, one row per participant: repeated on
  // every trial row they were the same six values written a hundred and
  // seventy times, which made the results file unreadable and put the
  // demographics nowhere anyone would look for them.  Derived from the
  // response object rather than from a hard-coded list, so a field added
  // to the form in the timeline appears in the CSV by itself — the
  // reshaping loop is exactly where new data goes missing silently.
  const survey_trial = raw_data.find(trial => trial.is_survey === true);
  const survey_columns = {};
  if (survey_trial && survey_trial.response) {
    Object.keys(survey_trial.response).forEach(field => {
      const value = survey_trial.response[field];
      // Blank optional answers are missing data, not empty strings.
      survey_columns["survey_" + field] =
        (value === null || value === undefined || String(value).trim() === "") ? "NA" : value;
    });
  }
  return survey_columns;
}

// Long format: one row per word and one per comprehension question.
function buildResultRows(raw_data, session, study, ended) {
  const { participant_id, join_time, join_time_local, timezone } = session;
  const { end_time, end_time_local, total_duration_sec } = ended;
  const { assignment, stimExtras } = study;
  const { n_questions_asked, n_questions_scored, n_questions_correct,
    n_questions_unanswered, accuracy } = scoreComprehension(raw_data);

  // The stimulus size is fixed in style.css, so it is the same on every
  // reading trial; take what the plugin read back from the page rather
  // than restating the CSS value here, so a changed stylesheet is still
  // logged correctly.
  const first_reading = raw_data.find(trial => trial.words && trial.words.length > 0);
  const session_font_size = first_reading ? first_reading.font_size_px : "NA";
  const clean_rows = [];

  // `??` rather than `||` throughout: item_id 0 and rt 0 are valid values
  // that `||` would silently turn into blanks.
  const shared = trial => ({
    participant_id: participant_id,
    join_time: join_time,
    end_time: end_time,
    // The same two instants as the participant's own clock showed them,
    // plus the zone they were in.  UTC above stays the column to sort
    // and compare on; these are the ones to read.
    join_time_local: join_time_local,
    end_time_local: end_time_local,
    timezone: timezone,
    total_duration_sec: total_duration_sec,
    // Session-level comprehension performance, repeated on every row so
    // it survives any per-row filtering at analysis time.
    n_questions_asked: n_questions_asked,
    n_questions_scored: n_questions_scored,
    n_questions_correct: n_questions_correct,
    n_questions_unanswered: n_questions_unanswered,
    accuracy: accuracy,
    // Fillers belong to no list — every participant sees all of them — so
    // they are marked `0` here rather than carrying the participant's
    // list. That is also what identifies a filler row in the output:
    // there is no separate is_filler column, because `list = 0` cannot
    // collide with the L1...Ln a target row carries.
    list: trial.is_filler ? 0 : assignment.list_name,
    list_assignment: assignment.assignment,
    // Rendering context, so between-participant display differences are
    // recoverable at analysis time instead of invisible.
    font_size_px: session_font_size,
    viewport_width_px: window.innerWidth,
    device_pixel_ratio: window.devicePixelRatio,
    // "desktop" (keyboard) or "mobile" (touch), and the presentation mode.
    // The texts and the way of responding differ between devices, so check
    // the device before pooling participants.
    device: session.device,
    presentation_mode: presentationMode(session.device),
    trial_index: trial.trial_index,
    item_id: trial.item_id ?? "",
    // The Latin square variant this row was drawn from -- column 2 of the
    // stimulus file.  This is the experimental contrast.
    list_label: trial.list_label ?? "NA",
    // The optional descriptive label from a Condition column, for studies
    // that want their variants named ("garden-path") rather than lettered.
    // NA when the stimulus file has no such column, which is the norm.
    condition: trial.condition ?? "NA",
    is_practice: trial.is_practice ?? false,
    // Which trials were probed is drawn per participant, so it cannot be
    // reconstructed from the item list afterwards.  prev_question_shown
    // lets the trial that *follows* a question be controlled for, and is
    // NA for the first sentence of a block, which follows nothing.
    question_probability: trial.is_practice ? PRACTICE_QUESTION_PROBABILITY : QUESTION_PROBABILITY,
    question_shown: trial.question_shown ?? "NA",
    prev_question_shown: trial.prev_question_shown ?? "NA",
    // 1 if this sentence wrapped onto more than one line on this
    // participant's screen, 0 if it fit on one.  The font size is fixed,
    // so whether a sentence wraps depends on screen width and sentence
    // length -- and length can differ by condition, so check this
    // against the condition before pooling.  NA on question rows.
    line_break: trial.line_break ?? "NA"
  });

  raw_data.forEach(trial => {
    // Process Reading Trials (identified by plugin name or item_id)
    if (trial.words && trial.words.length > 0) {
      const words = trial.words;
      const rts = trial.rt || [];

      words.forEach((word, i) => {
        clean_rows.push({
          ...shared(trial),
          type: "WORD",
          word_pos: i + 1,
          word: word,
          // NA, not 0: a missing reading time must not be analysed as an
          // instantaneous one.
          rt: rts[i] ?? "NA",
          response: "",
          correct: "",
          premature_responses: trial.premature_responses ?? 0,
          // Study-specific stimulus columns last, in the order they had
          // in the stimulus file, so the core column set above stays
          // identical from study to study.
          ...stimExtras(trial)
        });
      });
    }
    // Process Comprehension Questions.  Identified by the explicit
    // is_question flag rather than by the shape of the response: a typed
    // answer is an arbitrary string, so any test that enumerates the
    // possible responses drops free-text trials without a trace.
    else if (trial.is_question === true) {
      // NA rather than blank: for a question row `correct` applies but is
      // missing (unscored), which is not the same as the column being
      // inapplicable, as it is on a word row.
      let is_correct = "NA";
      if (trial.correct !== undefined && trial.correct !== null) {
        is_correct = trial.correct ? "true" : "false";
      }

      clean_rows.push({
        ...shared(trial),
        type: "QUESTION",
        word_pos: "",
        word: "",
        rt: Number.isFinite(trial.rt) ? Math.round(trial.rt) : "NA",
        response: trial.response ?? "NA",
        correct: is_correct,
        premature_responses: "",
        ...stimExtras(trial)
      });
    }
  });

  return clean_rows;
}

// Start everything.
//
// Waiting for the DOM is not a formality here.  Every script on this page is
// loaded in <head>, so at this point <body> does not exist yet.  If
// runExperiment() throws before its first await -- one malformed row in
// target_sentences.tsv is enough -- its own catch block tries to write the
// message into document.body and dies on null.  The participant is then shown
// a blank white page instead of the reason, and the person who sent them the
// link has nothing to go on either.  Waiting costs nothing and turns a silent
// failure into a legible one.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", runExperiment);
} else {
  runExperiment();
}
