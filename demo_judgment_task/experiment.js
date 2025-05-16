
// This experiment loosely replicates Gibson & Thomas (1999).

// Set up jsPsych session:

const jsPsych = initJsPsych({
  show_progress_bar: true,
  on_finish: async function(){
    await saveData(jsPsych.data.get().csv());
  }
});

// Load stimuli:

const target_sentences = loadStimuli("target_sentences.tsv")

// Compose list:

let stimuli = randomLatinSquareList(target_sentences);
stimuli = jsPsych.randomization.shuffle(stimuli);

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
});

// Ask native languages:
pages.push({
  type: jsPsychSurveyText,
  questions: [{prompt: "What are your native languages?", name: "native", required: true},
              {prompt: "What other languages do you speak?", name: "otherlang"}],
});

// Instructions for judgment task:
pages.push({
  type: jsPsychHtmlKeyboardResponse,
  choices: [" "],
  stimulus: md(`**Instructions:** You will see a number of sentences, one at a time, and rate on a 5-point scale how easy or difficult each sentence is to comprehend.  Indicate your choice and then press the "Continue" button to proceed.

Press space bar to proceed.`)});

// Experimental trials:
for ([i,c,s,q] of stimuli) {
  pages.push({
    type: jsPsychSurveyLikert,
    questions: [{
      prompt: s,
      labels: ["Easy", "Somewhat easy", "Neutral", "Somewhat hard", "Hard"]}],
    data: { stimulus: s }
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
