
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
  stimulus: md(`**Welcome to this survey.**

This survey is conducted by STUDENT X as part of a project at the Institute of Linguistics of the University of Stuttgart. The study's purpose is to advance our understanding of human language.

- **Anonymity:** All data is collected anonymously and strictly for academic research purposes. We are committed to maintaining your privacy.
- **Eligibility:** Participation is open to individuals who are 18 years of age or older.
- **Compatibility:** This survey is optimized for laptops and desktop computers and necessitates the use of a physical keyboard.
- **Inquiries:** Should you have any questions or comments, do not hesitate to reach out to us via email at address@e-mail.com. We value your feedback and are here to assist.

**Consent:** If you agree to participate under these conditions, please press the space bar to proceed.`)});

// Instructions for self-paced reading task:
pages.push({
  type: jsPsychHtmlKeyboardResponse,
  choices: [" "],
  stimulus: md(`**Instructions:**
You will be presented with a text on your screen, one word at a time.
- To move to the next word, press space bar.
- After each sentence, you will be asked whether the sentence was comprehensible.  Some may not be.
- Try to maintain a steady reading pace that reflects your natural reading speed. Do not rush, but also try not to read significantly slower than you normally would.

Press space bar to proceed.`)});

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
  stimulus: md(`You're done.  Thank you!

Press space bar to send us the results.`)});

// Run experiment:
jsPsych.run(pages);

// (setq js-indent-level 2)
