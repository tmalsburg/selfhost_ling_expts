
// Set up jsPsych session:

const jsPsych = initJsPsych({
  show_progress_bar: true,
});

// Structure of experiment:

let pages = [];

// Thank-you screen:
pages.push({
  type: jsPsychHtmlKeyboardResponse,
  choices: [" "],
  stimulus: `<p>The reCapcha appears on the next page.  Note that you need to edit the "site key" in the file <code>recapcha.html</code> for this to work.<br/><br/>  To obtain a site key, visit https://cloud.google.com/security/products/recaptcha and click on "Get started".</p>

<p>Press space bar to continue.</p>`});

// reCaptcha v2:
pages.push({
  type: jsPsychExternalHtml,
  url: "recaptcha.html",
  cont_btn: "proceed_button",
  force_refresh: true,
  execute_script: true
});

// Thank-you screen:
pages.push({
  type: jsPsychHtmlKeyboardResponse,
  choices: [" "],
  stimulus: `<p>You're apparently human.  Congratulation!</p>

<p>Press space bar to finish.<p>`});

// Run experiment:
jsPsych.run(pages);

