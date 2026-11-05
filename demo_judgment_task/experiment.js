
// This experiment loosely replicates Gibson & Thomas (1999).

// Stimulus files, in this directory.  Give the name without extension: the
// experiment uses name.tsv or, if there is none, name.csv, and detects tab-
// or comma-separated from the content.  (A name with .tsv or .csv is used
// exactly as given.)  The filler file is optional; without it there are no
// fillers.
const STIMULUS_FILE = "target_sentences";
const FILLER_FILE = "fillers";

// Set up jsPsych session:

// At the end, two files are sent to the server, as on exphost:
//   - the ratings (one row per sentence) -> data/results_<uuid>.csv
//   - the language-background survey (one row) -> appended to data/survey.csv
// Both carry participant_id, which links them.
const jsPsych = initJsPsych({
  show_progress_bar: true,
  on_finish: async function(){
    const trials = jsPsych.data.get().filter({trial_type: "survey-likert"}).csv();
    const survey = surveyRow(jsPsych, {
      participant_id: participant_id,
      list: assignment.list,
      list_assignment: assignment.list_assignment
    });
    await saveData(trials, survey);
  }
});

const participant_id = "P" + Math.random().toString(36).substr(2, 8).toUpperCase();
jsPsych.data.addProperties({ participant_id: participant_id });

// Load stimuli:

// Fillers are optional.  They are not part of the Latin square: every
// participant sees all of them, and they carry list 0 in the results.  They
// come from either place, or both:
//   - the filler file (no List column needed; IDs may be 1, 2, 3, ...)
//   - rows with List 0 in the target file
const all_rows = loadStimuli(STIMULUS_FILE);
const target_sentences = all_rows.filter(row => row[1] !== "0");
const fillers = [...all_rows.filter(row => row[1] === "0"),
                 ...loadStimuli(FILLER_FILE, { optional: true, filler: true })];
if (target_sentences.length === 0) {
  throw new Error(`${STIMULUS_FILE}: no target sentences (every row has List 0).`);
}

// Compose list: the server hands out Latin square lists in rotation,
// then the fillers are added and everything is shuffled together.

const assignment = assignedLatinSquareList(target_sentences);
// `list` is set on each trial below (0 for fillers), not here: properties
// added here would overwrite the per-trial value.
jsPsych.data.addProperties({ list_assignment: assignment.list_assignment });
let stimuli = jsPsych.randomization.shuffle([...assignment.stimuli, ...fillers]);

// Structure of experiment:

let pages = [];

// Welcome and consent:
pages.push({
  type: jsPsychExternalHtml,
  url: "consent.html",
  cont_btn: "start_button",
  force_refresh: true,
  execute_script: true,
});

// `)});

// Brief survey on English exposure:
pages.push({
  type: jsPsychHtmlKeyboardResponse,
  choices: [" "],
  stimulus: md(`Before we start, some quick questions about your language background.

Press space bar to proceed.`)});

pages.push({
  type: jsPsychSurveyMultiChoice,
  questions: [
    {
      prompt: "Are you fluent in English?", 
      name: 'fluent', 
      options: ['not fluent', 'somewhat fluent', 'highly fluent'], 
      required: true
    }, 
    {
      prompt: "Do you speak English on a daily basis?", 
      name: 'spoken', 
      options: ['no', 'yes'], 
      required: true
    },
    {
      prompt: "Do you read English on a daily basis?", 
      name: 'reading', 
      options: ['no', 'yes'], 
      required: true
    },
    {
      prompt: "Do you write English on a daily basis?", 
      name: 'writing', 
      options: ['no', 'yes'], 
      required: true
    },
  ],
  data: { trial_part: "survey" }
});

// Ask native languages:
pages.push({
  type: jsPsychSurveyText,
  questions: [{prompt: "What are your native languages?", name: "native", required: true},
              {prompt: "What other languages do you speak?", name: "otherlang"}],
  data: { trial_part: "survey" }
});

// Instructions for judgment task:
pages.push({
  type: jsPsychHtmlKeyboardResponse,
  choices: [" "],
  stimulus: md(`**Instructions:** You will see a number of sentences, one at a time, and rate on a 5-point scale how easy or difficult each sentence is to comprehend.  Indicate your choice and then press the "Continue" button to proceed.

Press space bar to proceed.`)});

// Experimental trials:
// Each row: [item, list, sentence, question, condition].  `condition` is
// the optional Condition column of the stimulus file ("NA" without one).
// `list` in the results is the participant's list for target sentences and
// 0 for fillers.
for (const [item, list_label, sentence, question, condition] of stimuli) {
  pages.push({
    type: jsPsychSurveyLikert,
    questions: [{
      prompt: sentence,
      labels: ["Easy", "Somewhat easy", "Neutral", "Somewhat hard", "Hard"]}],
    data: {
      stimulus: sentence,
      condition: condition ?? "NA",
      list: list_label === "0" ? 0 : assignment.list
    }
  })
}

// Thank-you screen:
pages.push({
  type: jsPsychHtmlKeyboardResponse,
  choices: [" "],
  stimulus: md(`You're done.  Thank you!

Press space bar to send us the results.`)});

// Run experiment:
jsPsych.run(pages);

// (setq js-indent-level 2)
