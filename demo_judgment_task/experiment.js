
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

let stimuli = [];
stimuli = stimuli.concat(randomLatinSquareList(target_sentences));
jsPsych.randomization.shuffle(stimuli);

// Structure of experiment:

let pages = [];

// Welcome screen:
pages.push({
  type: jsPsychHtmlKeyboardResponse,
  choices: [" "],
  stimulus: `
<p style='width: 700px;'>Welcome to this survey.</p>

<p style='width: 700px;'>This study is conducted by STUDENT X as part of a student project at the Institute of Linguistics of the University of Stuttgart.  All data data is collected anonymously and for research purposes.  You may only participate if you are 18 years of age or older.  For questions or comments, please contact us at address@e-mail.com.</p>

<p style='width: 700px;'>Note that this survey is designed for laptops and desktop computers. It will therefore require a keyboard.</p>

<p style='width: 700px;'>If you consent, press space bar to proceed.</p>
`});

// Brief survey on English exposure:
pages.push({
  type: jsPsychHtmlKeyboardResponse,
  choices: [" "],
  stimulus: `
<p style='width: 700px;'>Before we start, some quick questions about your language background.</p>

<p style='width: 700px;'>Press space bar to proceed.</p>
`});

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

// Ask native language:
pages.push({
  type: jsPsychSurveyHtmlForm,
  preamble: '<p>What is your native language?</br>If you have multiple, please separate them with commas.</p>',
  html: '<input type="text" id="test-resp-box" name="response" size="20"/>',
  autofocus: 'test-resp-box'
});

// Ask other languages:
pages.push({
  type: jsPsychSurveyHtmlForm,
  preamble: '<p>What other languages do you speak?</br>If multiple, please separate them with commas.</p>',
  html: '<input type="text" id="test-resp-box" name="response" size="20"/>',
  autofocus: 'test-resp-box'
});

// Instructions for judgment task:
pages.push({
  type: jsPsychHtmlKeyboardResponse,
  choices: [" "],
  stimulus: `
<p style='width: 700px;'><b>Instructions:</b> You will see a number of
sentences, one at a time, and rate on a 5-point scale how easy or
difficult each sentence is to comprehend.  Indicate your choice and
then press the "Continue" button to proceed.</p>

<p style='width: 700px;'>Press space bar to proceed.</p>
`});

// Experimental trials:
for ([i,c,s,q] of stimuli) {
  pages.push(likertPage(s))
}

// Thank-you screen:
pages.push({
  type: jsPsychHtmlKeyboardResponse,
  choices: [" "],
  stimulus: `
<p style='width: 700px;'>You're done.  Thank you!</p>

<p style='width: 700px;'>Press space bar to send us the results.</p>
`});

// Run experiment:
jsPsych.run(pages);

