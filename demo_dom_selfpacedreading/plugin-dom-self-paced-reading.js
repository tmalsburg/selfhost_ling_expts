var jsPsychDomSelfPacedReading = (function (jspsych) {
  'use strict';

  const info = {
    name: 'dom-self-paced-reading',
    version: '3.1.0',
    parameters: {
      sentence: {
        type: jspsych.ParameterType.STRING,
        default: undefined,
      },
      // Optional: the units to present, e.g. multi-word regions.  Each is
      // shown, hidden and timed as one "word" and never split across lines.
      // When null the sentence is split at whitespace into single words.
      regions: {
        type: jspsych.ParameterType.STRING,
        array: true,
        default: null,
      },
      presentation_mode: {
        type: jspsych.ParameterType.INT,
        default: 2, // 1: masked, 2: cumulative, 3: centered
      },
      // How the participant moves on to the next word:
      //   "keyboard" = one of `choices`; touches and clicks do nothing
      //   "touch"    = a tap anywhere on the screen; keys do nothing
      // Only one is ever listened to, so a touchscreen laptop cannot be
      // tapped through and a phone cannot be driven from a keyboard.
      input: {
        type: jspsych.ParameterType.STRING,
        default: "keyboard",
      },
      // The keys that advance (input "keyboard" only).
      choices: {
        type: jspsych.ParameterType.KEYS,
        default: [" "],
      }
    },
    data: {
      rt: {
        type: jspsych.ParameterType.INT,
        array: true
      },
      words: {
        type: jspsych.ParameterType.STRING,
        array: true
      },
      sentence: {
        type: jspsych.ParameterType.STRING
      },
      presentation_mode: {
        type: jspsych.ParameterType.INT
      },
      input: {
        type: jspsych.ParameterType.STRING
      },
      // The size the sentence was actually rendered at, read back from the
      // page.  The plugin sets no size itself: it comes from style.css.
      font_size_px: {
        type: jspsych.ParameterType.FLOAT
      },
      // 1 if the sentence wrapped onto more than one line on this
      // participant's screen, else 0.  Always 0 in mode 3, which only ever
      // shows one word.
      line_break: {
        type: jspsych.ParameterType.INT
      },
      // Responses that arrived before the next word had been painted.  These
      // cannot be responses to that word, so they are not timed; the count is
      // logged so that key-mashing is visible during data screening.
      premature_responses: {
        type: jspsych.ParameterType.INT
      }
    }
  };

  class DomSelfPacedReadingPlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }

    trial(display_element, trial) {
      if (!trial.sentence) {
        console.error("No sentence provided to SPR plugin.");
        this.jsPsych.finishTrial();
        return;
      }

      const words = (Array.isArray(trial.regions) && trial.regions.length > 0)
        ? trial.regions
        : trial.sentence.trim().split(/\s+/);
      let current_word_index = -1;
      const rts = [];
      let start_time = null;
      let accepting_input = false;
      let premature_responses = 0;
      let keyboard_listener = null;
      let touch_area = null;
      const use_touch = trial.input === "touch";

      // All presentation (font, size, wrapping, masking, underline) lives in
      // style.css under these classes; the plugin only builds the structure
      // and moves the region classes.
      const container = document.createElement('div');
      container.id = 'spr-container';
      container.className = `spr-container spr-mode-${trial.presentation_mode}`;
      display_element.appendChild(container);

      // Each word is an outer span carrying the underline and an inner span
      // carrying the text, as in Ibex/PCIbex DashedSentence.  A masked word
      // hides only the inner span (`visibility: hidden`), so it keeps its
      // width: the line breaks are fixed before the first keypress and never
      // move during the trial, and hidden text cannot be revealed by
      // selecting it.  The separators are ordinary spaces, so the browser
      // wraps between words, never inside one.
      const word_elements = [];
      words.forEach((word, index) => {
        const word_span = document.createElement('span');
        word_span.id = `spr-word-${index}`;
        word_span.className = 'spr-word text-after-current-region';
        const text_span = document.createElement('span');
        text_span.className = 'spr-word-text';
        text_span.textContent = word;
        word_span.appendChild(text_span);
        container.appendChild(word_span);
        word_elements.push(word_span);

        if (index < words.length - 1) {
          container.appendChild(document.createTextNode(' '));
        }
      });

      // Read back what was rendered.  Layout is complete as soon as these are
      // read (the font was loaded before the experiment started), and masking
      // does not change it, so this is the layout the participant reads.
      const font_size = parseFloat(getComputedStyle(container).fontSize);
      // Mode 3 removes every non-current word from the layout, so only one
      // word is ever on screen and nothing can wrap.
      const line_break = trial.presentation_mode === 3 ? 0 :
        (new Set(word_elements.map(span => span.offsetTop)).size > 1 ? 1 : 0);

      const update_display = () => {
        word_elements.forEach((word_span, index) => {
          if (index < current_word_index) {
            word_span.className = 'spr-word text-before-current-region';
          } else if (index === current_word_index) {
            word_span.className = 'spr-word text-current-region';
          } else {
            word_span.className = 'spr-word text-after-current-region';
          }
        });
      };

      // Start the clock in the frame in which the new word is actually on
      // screen, not when its class is changed.  The first rAF callback runs
      // before the pending frame is painted, the second runs after it, so the
      // second is the earliest moment the participant could have seen the word.
      // Re-enabling input here also replaces the old fixed-millisecond
      // debounce: input is refused exactly while nothing new is visible.
      const arm_input = () => {
        requestAnimationFrame(() => requestAnimationFrame(() => {
          start_time = performance.now();
          accepting_input = true;
        }));
      };

      const end_trial = () => {
        if (keyboard_listener) {
          this.jsPsych.pluginAPI.cancelKeyboardResponse(keyboard_listener);
        }
        if (touch_area) {
          touch_events.forEach(type => touch_area.removeEventListener(type, on_touch));
        }
        document.removeEventListener('keydown', suppress_key_defaults, true);

        const trial_data = {
          rt: rts,
          words: words,
          sentence: trial.sentence,
          presentation_mode: trial.presentation_mode,
          input: use_touch ? "touch" : "keyboard",
          font_size_px: font_size,
          line_break: line_break,
          premature_responses: premature_responses
        };
        display_element.innerHTML = '';
        this.jsPsych.finishTrial(trial_data);
      };

      const advance = () => {
        if (!accepting_input) {
          premature_responses++;
          return;
        }
        accepting_input = false;

        // The very first press reveals word 0 and is therefore not a reading
        // time; from then on each press times the word it replaces.
        if (current_word_index >= 0) {
          rts.push(Math.round(performance.now() - start_time));
        }

        current_word_index++;

        if (current_word_index < words.length) {
          update_display();
          arm_input();
        } else {
          end_trial();
        }
      };

      // Stop the browser acting on the response keys (space scrolls the page,
      // which would move the text out from under the participant mid-trial).
      const suppress_key_defaults = (event) => {
        if (!Array.isArray(trial.choices)) return;
        const key = event.key.toLowerCase();
        if (trial.choices.some(choice => choice.toLowerCase() === key)) {
          event.preventDefault();
        }
      };
      document.addEventListener('keydown', suppress_key_defaults, true);

      // Touch: an invisible layer over the whole screen (.spr-touch-area in
      // style.css) takes the taps, so a tap anywhere advances and none can
      // land on the page underneath.  One pointerdown covers finger, pen and
      // mouse.  iOS 12 and older have no pointer events; registering only
      // pointerdown there would leave the trial with no listener and no
      // error, so they get touchstart/mousedown instead.  If both fire for
      // one tap, the second arrives before the next paint and is counted as
      // premature, not as a word.
      const touch_events = window.PointerEvent ? ['pointerdown'] : ['touchstart', 'mousedown'];
      const on_touch = (event) => {
        event.preventDefault();  // no zoom, scroll or text selection
        advance();
      };

      // Initial state: all masked/hidden
      update_display();
      arm_input();

      if (use_touch) {
        touch_area = document.createElement('div');
        touch_area.className = 'spr-touch-area';
        display_element.appendChild(touch_area);
        touch_events.forEach(type =>
          touch_area.addEventListener(type, on_touch, { passive: false }));
      } else {
        keyboard_listener = this.jsPsych.pluginAPI.getKeyboardResponse({
          callback_function: advance,
          valid_responses: trial.choices,
          persist: true,
          allow_held_key: false,
        });
      }
    }
  }
  DomSelfPacedReadingPlugin.info = info;

  return DomSelfPacedReadingPlugin;
})(window.jsPsychModule || window.jsPsych);
