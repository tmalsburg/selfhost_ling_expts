
// Functions for loading and parsing stimulus files (.tsv or .csv):

function fetchURLContentSync(url, optional = false) {
    var request = new XMLHttpRequest();
    request.open('GET', url, false);  // Set the third parameter to false for a synchronous request
    request.send(null);  // Sending the request

    if (request.status === 200) {
        return request.responseText;
    } else if (optional && request.status === 404) {
        return null;
    } else {
        throw new Error('Request failed: ' + request.statusText);
    }
}

// Extensions tried, in order, when a stimulus file is named without one.
const STIMULUS_EXTENSIONS = ['.tsv', '.csv'];

// Splits delimited text into rows of cells (same reader as the self-paced
// reading demo).  A cell may be wrapped in double quotes; then it may
// contain the delimiter (e.g. a comma inside a sentence in a .csv file),
// and "" inside it is a literal quote.  Unquoted cells are trimmed.
function parseDelimitedRows(content, delimiter) {
  // Strip a BOM (Excel writes one) and normalise line endings to \n.
  content = String(content).replace(/^﻿/, '').replace(/\r\n?/g, '\n');

  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;        // this cell was given in quotes
  let in_quotes = false;     // currently inside them
  let seen_content = false;  // anything other than leading space in this cell

  const endField = () => {
    row.push(quoted ? field : field.trim());
    field = ''; quoted = false; seen_content = false;
  };
  const endRow = () => { endField(); rows.push(row); row = []; };

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (in_quotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') { field += '"'; i++; }  // escaped quote
        else in_quotes = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"' && !seen_content) { in_quotes = true; quoted = true; field = ''; continue; }
    if (ch === delimiter) { endField(); continue; }
    if (ch === '\n') { endRow(); continue; }
    field += ch;
    if (!/\s/.test(ch)) seen_content = true;
  }
  endRow();

  // Drop empty rows (trailing newline, blank lines).
  return rows.filter(cells => cells.some(c => c !== ''));
}

// Tab-separated if the first non-empty line contains a tab, otherwise
// comma-separated.  Decided from the content, not the extension, so a
// ".csv" that is really tab-separated (a common Excel export) still works.
function sniffDelimiter(content) {
  const first = String(content).replace(/^﻿/, '').split(/\r\n?|\n/)
    .find(line => line.trim() !== '');
  return first !== undefined && first.indexOf('\t') === -1 && first.indexOf(',') !== -1
    ? ',' : '\t';
}

// Columns of a stimulus file, the same as in the self-paced reading demo:
//
//   ItemID        required  item number or name (1, F01)
//   List          required  the Latin square variant (a-d, 1-4)
//   Sentence      required  the sentence
//   QuestionText  optional  (not used by this experiment)
//   Condition     optional  descriptive name of the variant (garden-path);
//                           recorded with each rating, not used for the
//                           Latin square
//
// Without a header row the columns are read in the order ItemID, List,
// Sentence, QuestionText.  With a header row they may be in any order and
// are recognised by name; Condition needs a header row.  Names are compared
// ignoring case, spaces, underscores and punctuation, so "Item ID",
// "item_id" and "ItemID" are the same.
//
// Fillers: rows with List 0 in the target file are fillers.  The filler
// file needs no List column: without a header row it is read as ItemID,
// Sentence, QuestionText; filler IDs may be plain numbers (1, 2, 3, ...),
// even the same numbers as target items.  Every filler gets List 0.
const STIMULUS_COLUMN_ALIASES = {
  item_id:   ["itemid", "item", "itemno", "itemnumber", "items", "id",
              "nr", "nummer", "itemnr", "itemnummer", "رقم", "رقمالجملة", "المعرف"],
  list:      ["list", "lists", "liste", "listen", "version", "versions",
              "قائمة", "القائمة", "نسخة"],
  condition: ["condition", "cond", "conditions",
              "bedingung", "bedingungen", "kondition", "شرط", "الشرط", "الحالة"],
  sentence:  ["sentence", "sentencetext", "sentences", "text", "stimulus", "stim",
              "satz", "satztext", "stimulustext", "جملة", "الجملة", "النص"],
  question:  ["questiontext", "question", "comprehensionquestion", "questions",
              "frage", "fragetext", "verstaendnisfrage", "سؤال", "السؤال"]
};

// Removes separators and punctuation only, so German and Arabic names
// survive.
function normalizeColumnName(name) {
  return String(name).toLowerCase().replace(/[\s_\-.()\[\]{}:;,#"']/g, '');
}

// The first row is a header only if it names all required columns:
// ItemID, List and Sentence, or for a filler file ItemID and Sentence.
// Returns {field: column index} or null.
function detectHeader(cells, filler = false) {
  const found = {};
  cells.forEach((cell, i) => {
    const name = normalizeColumnName(cell);
    for (const [field, aliases] of Object.entries(STIMULUS_COLUMN_ALIASES)) {
      if (found[field] === undefined && aliases.includes(name)) found[field] = i;
    }
  });
  if (found.item_id === undefined || found.sentence === undefined ||
      (!filler && found.list === undefined)) {
    return null;
  }
  return found;
}

// A filler file without a header row may still be in the older layout
// ItemID, List, Sentence (with a label such as "filler" in every row).  That
// second column is then the same short word in every row, which a sentence
// column never is.
function hasFillerListColumn(rows) {
  return rows.length > 0 && rows.every(r =>
    r.length >= 3 && r[1] === rows[0][1] && !/\s/.test(r[1]) && r[1].length <= 20 &&
    String(r[2] ?? '').trim() !== '');
}

// Numeric item IDs ("01") become numbers, as before; others (e.g. "F01"
// for fillers) stay as they are.
function parseItemId(raw) {
  const s = String(raw ?? '').trim();
  return /^-?\d+$/.test(s) ? parseInt(s, 10) : s;
}

// Loads `name.tsv` or, if there is none, `name.csv` (a name that already
// ends in .tsv or .csv is used as given).  Returns rows of
// [item, list, sentence, question, condition]; question and condition are
// undefined when the file has no such column.  Options:
//   optional: true  a missing file gives an empty list instead of an error
//   filler: true    a filler file: no List column needed, every row List 0
function loadStimuli(name, { optional = false, filler = false } = {}) {
  const has_extension = STIMULUS_EXTENSIONS.some(ext => name.toLowerCase().endsWith(ext));
  const candidates = has_extension ? [name] : STIMULUS_EXTENSIONS.map(ext => name + ext);

  let content = null;
  let source = null;
  for (const candidate of candidates) {
    content = fetchURLContentSync(candidate, true);
    if (content !== null) { source = candidate; break; }
  }
  if (content === null) {
    if (optional) return [];
    throw new Error(`Could not load ${name}: tried ${candidates.join(', ')}.`);
  }

  const delimiter = sniffDelimiter(content);
  const rows = parseDelimitedRows(content, delimiter);
  const header = rows.length > 0 ? detectHeader(rows[0], filler) : null;
  const body = header ? rows.slice(1) : rows;
  const positions = header ||
    (filler && !hasFillerListColumn(body) ? { item_id: 0, sentence: 1, question: 2 }
                                          : { item_id: 0, list: 1, sentence: 2, question: 3 });
  const cell = (cells, field) => {
    const i = positions[field];
    const value = i === undefined ? undefined : cells[i];
    return value === undefined || String(value).trim() === '' ? undefined : String(value).trim();
  };

  // A row without all three required values is an error, not skipped in
  // silence: it usually means a header that was not recognised or a
  // wrongly split line, and would otherwise be shown as a sentence.
  const bad = [];
  const stimuli = [];
  body.forEach((cells, n) => {
    const item = cell(cells, 'item_id');
    const list = filler ? '0' : cell(cells, 'list');
    const sentence = cell(cells, 'sentence');
    if (item === undefined || list === undefined || sentence === undefined) {
      bad.push(`row ${n + (header ? 2 : 1)}: ${JSON.stringify(cells.slice(0, 3))}`);
      return;
    }
    stimuli.push([parseItemId(item), list, sentence,
                  cell(cells, 'question'), cell(cells, 'condition')]);
  });
  if (bad.length > 0) {
    throw new Error(`${source}: ${bad.length} row(s) without ` +
                    (filler ? 'ItemID or Sentence' : 'ItemID, List or Sentence') + ':\n' +
                    bad.join('\n'));
  }

  const layout = header ? 'header row read by name'
    : 'no header row (' + Object.keys(positions).join(', ') + ')';
  console.info(`${source}: ${stimuli.length} rows, ` +
               `${delimiter === '\t' ? 'tab' : 'comma'}-separated, ${layout}.`);
  return stimuli;
}

// Functions for preparing Latin square design:

function checkLatinSquare(target_sentences) {

  // Checks that all items have the same number of sentences:
  const countMap = new Map();
  target_sentences.forEach(sentence => {
    countMap.set(sentence[0], (countMap.get(sentence[0]) || 0) + 1);
  });
  const counts = [...countMap.values()];
  if (new Set(counts).size > 1) {
    throw new Error("All items need to have the same number of sentences.");
  }
  
  // Checks that all items have the same conditions:
  const conditionsMap = new Map();
  target_sentences.forEach(sentence => {
    if (!conditionsMap.has(sentence[0])) {
      conditionsMap.set(sentence[0], []);
    }
    conditionsMap.get(sentence[0]).push(sentence[1]);
  });
  const allConditions = [...conditionsMap.values()];
  const firstConditionSet = allConditions[0].sort().join(',');
  if (!allConditions.every(conditions => conditions.sort().join(',') === firstConditionSet)) {
    throw new Error("Latin square design looks unbalanced: every ItemID must have the same set of List labels.");
  }

  // Checks that each List label is present only once per item:
  const [item, conditions] = conditionsMap.entries().next().value;
  if (new Set(conditions).size < conditions.length) {
    throw new Error("At least one List label appears multiple times per item.");
  }
  
  return [Array.from(conditionsMap.keys()), conditions];
}

function latinSquareLists(target_sentences) {
  const [items, conditions] = checkLatinSquare(target_sentences);
  target_sentences.sort((a, b) => a[1].localeCompare(b[1]));
  target_sentences.sort((a, b) => a[0] - b[0]);

  const d = {};
  target_sentences.forEach(sentence => {
    if (!d[sentence[0]]) d[sentence[0]] = [];
    d[sentence[0]].push(sentence);
  });

  const lists = Array.from({ length: conditions.length }, () => []);
  let offset = 0;

  Object.keys(d).forEach(key => {
    const itemConditions = d[key];
    itemConditions.forEach((_, index) => {
      lists[index].push(itemConditions[(index + offset) % itemConditions.length]);
    });
    offset += 1;
  });

  const result = {};
  conditions.forEach((condition, index) => {
    result[condition] = lists[index];
  });

  return result;
}

// Asks the server for the next list in rotation (route /get_list in
// server.py), so participants are spread evenly over the lists instead
// of being assigned at random.  If the server has no such route, falls
// back to a random list and records that in `list_assignment`.
// Returns { list, list_assignment, stimuli }, with `list` counted from 1.
function assignedLatinSquareList(target_sentences) {
  const lists = latinSquareLists(target_sentences);
  const keys = Object.keys(lists).sort();

  let index = null;
  try {
    const request = new XMLHttpRequest();
    request.open('GET', '/get_list?n=' + keys.length, false);
    request.send(null);
    const parsed = parseInt(request.responseText, 10);
    if (request.status === 200 && parsed >= 0 && parsed < keys.length) {
      index = parsed;
    }
  } catch (e) {
    // Server unreachable; handled below.
  }

  let list_assignment = "server_rotation";
  if (index === null) {
    console.warn("List assignment route unavailable; assigning a list at random.");
    list_assignment = "random_fallback";
    index = Math.floor(Math.random() * keys.length);
  }

  return { list: index + 1, list_assignment, stimuli: lists[keys[index]] };
}

// Markdown to HTML converter (third-party package showdown):
function md(markdown) {
  var converter = new showdown.Converter();
  return converter.makeHtml(markdown);
}

// Functions for defining the experiment:

// Factory function for comprehensibility judgements with a 5-point
// Likert scale:
function likertPage(s) {
  return {
    type: jsPsychSurveyLikert,
    questions: [{
      prompt: s,
      labels: ["Easy", "Somewhat easy", "Neutral", "Somewhat hard", "Hard"],
    }],
    data: { stimulus: s }
  }
}

// Functions for storing the results on the server:

// The survey answers as one CSV row: the participant-level properties
// passed in `row` (participant_id etc.), then one column per question,
// named by the questions' `name`.  Survey pages are marked with
// data: { trial_part: "survey" } in experiment.js.
function surveyRow(jsPsych, row) {
  row = { ...row };
  jsPsych.data.get().filter({trial_part: "survey"}).values().forEach(trial => {
    for (const [question, answer] of Object.entries(trial.response)) {
      row[question] = answer === null || answer === undefined ? "" : String(answer);
    }
  });
  const quote = v => '"' + String(v).replace(/"/g, '""') + '"';
  return [Object.keys(row).map(quote).join(","),
          Object.values(row).map(quote).join(",")].join("\n");
}

// Sends the ratings first, then the survey row.  Ratings first because
// they are the irreplaceable part: if the survey fails, the ratings are
// already safe.  On any failure the participant is asked to keep the
// window open and can retry; a retry does not send the ratings twice.
async function saveData(trials, survey) {
  const target = document.getElementById("jspsych-content");

  const post = async (body, kind) => {
    try {
      const response = await fetch('/store?kind=' + kind, {
        method:  "POST",
        cache:   "no-cache",
        headers: {"Content-Type": "text/csv; charset=utf-8"},
        body:    body
      });
      if (!response.ok) return `Server responded ${response.status} ${response.statusText}.`;
      return null;
    } catch (error) {
      return String(error && error.message ? error.message : error);
    }
  };

  let trials_done = false;
  const attempt = async () => {
    let failed = null;
    if (!trials_done) {
      failed = await post(trials, "results");
      if (!failed) trials_done = true;
    }
    if (!failed) {
      failed = await post(survey, "survey");
    }
    if (failed) {
      target.innerHTML = `<p><strong>Your data has not been saved yet.  Please do not
        close this window</strong> and press the button to try again.</p>
        <p style="font-size: 0.8em">${failed}</p>
        <button type="button" id="retry-save" class="jspsych-btn">Try again</button>`;
      document.getElementById("retry-save").addEventListener("click", attempt);
      return;
    }
    target.innerHTML = "Your data has been recorded.<br>You may now close the browser window.";
  };
  await attempt();
}

