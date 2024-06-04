
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

// Welcome screen:
pages.push({
  type: jsPsychHtmlKeyboardResponse,
  choices: [" "],
  stimulus: `
<center><b>Welcome to this survey.</b></center>

<p>This survey is conducted by STUDENT X as part of a project at the Institute of Linguistics of the University of Stuttgart.  The study's purpose is to advance our understanding of human language.</p>

<ul>
  <li><b>Anonymity:</b> All data is collected anonymously and strictly for academic research purposes.  We are committed to maintaining your privacy. </li>
  <li><b>Eligibility:</b> Participation is open to individuals who are 18 years of age or older. </li>
  <li><b>Compatibility:</b> This survey is optimized for laptops and desktop computers and necessitates the use of a physical keyboard. </li>
  <li><b>Inquiries:</b> Should you have any questions or comments, do not hesitate to reach out to us via email at address@e-mail.com.  We value your feedback and are here to assist. </li>
</ul>

<p><b>Consent:</b>
If you agree to participate under these conditions, please press space bar to proceed.
</p>`});

// Brief survey on English exposure:
pages.push({
  type: jsPsychHtmlKeyboardResponse,
  choices: [" "],
  stimulus: `
<p>Before we start, some quick questions about your language background.</p>

<p>Press space bar to proceed.</p>
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
<p><b>Instructions:</b> You will see a number of
sentences, one at a time, and rate on a 5-point scale how easy or
difficult each sentence is to comprehend.  Indicate your choice and
then press the "Continue" button to proceed.</p>

<p>Press space bar to proceed.</p>
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
<p>You're done.  Thank you!</p>

<p>Press space bar to send us the results.</p>
`});

// Run experiment:
jsPsych.run(pages);

// (setq js-indent-level 2)
