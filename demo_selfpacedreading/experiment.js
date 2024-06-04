
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

// Instructions for judgment task:
pages.push({
  type: jsPsychHtmlKeyboardResponse,
  choices: [" "],
  stimulus: `
<p><b>Instructions:</b>
<ul>
<li>You will be presented with a text on your screen, one word at a time.</li>
<li>To move to the next word, press space bar.</li>
<li>After each sentence, you will be asked whether the sentence was comprehensible.  Some may not be.</li>
<li>Try to maintain a steady reading pace that reflects your natural reading speed. Do not rush, but also try not to read significantly slower than you normally would.</li>
</ul>

<p>Press space bar to proceed.</p>
`});

// Experimental trials:
for ([i,c,s,q] of stimuli) {

  // Self-paced reading:
  pages.push({
    type: jsPsychSelfPacedReading,
    sentence: s,
    mask_type: 3,
    canvas_size: [1000, 400]
  });

  // Ask comprehensible:
  pages.push({
    type: jsPsychSurveyMultiChoice,
    questions: [{
      prompt: "Was this sentence comprehensible?",
      options: ['Yes', 'No'],
      required: true
    }]});

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
