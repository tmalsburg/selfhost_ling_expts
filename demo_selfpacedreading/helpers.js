// =========================================================================
// helpers.js -- the machinery behind experiment.js.
//
// NO NEED TO EDIT THIS FILE.  Everything a study changes is in the YOUR
// STUDY block at the top of experiment.js (settings, texts, practice
// sentences, questionnaire) and at the top of style.css (the look).
//
// Contents, in file order.  * = called from experiment.js.
//
//   1. Loading stimulus files ....... loadStimuli*  (reads .tsv/.csv, any
//                                     delimiter, optional header row)
//   2. Latin square ................. assignedLatinSquareList*  (which list a
//                                     participant gets), checkLatinSquare
//   3. Comprehension questions ...... assignQuestionTrials*  (which sentences
//                                     get a question), normalizeYesNo*,
//                                     validateCorrectAnswers*
//   4. Device and reading display ... detectDevice*  (computer or phone),
//                                     splitRegions*, validateRegions*
//                                     ({braces}), preventScrollKeys*, md*
//   5. Saving the results ........... saveData*  (sends to the server, shows
//                                     the closing screen, offers a retry)
//   6. Small utilities .............. localTimestamp*, participantTimeZone*,
//                                     csvFrom*
// =========================================================================

// ---- 1. Loading stimulus files -------------------------------------------
//
// Three things are deliberately *not* assumed about a stimulus file:
//
//   - its extension.  `loadStimuli("target_sentences")` tries .tsv and .csv in
//     turn and uses whichever exists, because people export from Excel,
//     LibreOffice and R and each offers a different default.
//   - its delimiter.  Sniffed from the content, not the extension: a file
//     called .csv that is actually tab-separated (a common Excel export on a
//     German locale) reads correctly.
//   - its column order.  A header row, if present, is recognised by name, so
//     columns may be renamed and reordered and extra ones ignored.  A file
//     with no header is read positionally, exactly as before.

function fetchURLContentSync(url, opts) {
    opts = opts || {};
    var request = new XMLHttpRequest();
    request.open('GET', url, false);  // Set the third parameter to false for a synchronous request
    try {
      request.send(null);  // Sending the request
    } catch (e) {
      if (opts.optional) return null;
      throw e;
    }

    if (request.status === 200) {
        return request.responseText;
    } else if (opts.optional) {
        return null;   // caller is probing for a file that may not exist
    } else {
        throw new Error('Request failed: ' + request.statusText);
    }
}

// Extensions tried, in order, when a stimulus file is named without one.
const STIMULUS_EXTENSIONS = ['.tsv', '.csv'];

/**
 * Split delimited text into rows of cells, following RFC 4180: a field may be
 * wrapped in double quotes, a doubled quote inside such a field is a literal
 * quote, and a quoted field may contain the delimiter and newlines.
 *
 * The naive `line.split(delimiter)` this replaces truncated any .csv sentence
 * at its first comma and silently pushed the remainder into the question
 * column — and these stimuli are full of commas.
 *
 * Unquoted cells are trimmed; quoted cells are returned verbatim, so leading
 * or trailing spaces can be preserved deliberately by quoting them.
 */
function parseDelimitedRows(content, delimiter) {
  // Strip a BOM (Excel writes one) and normalise CRLF / lone CR to LF, so the
  // state machine below only ever has to think about one line terminator.
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

  // Drop rows that are entirely empty (trailing newline, blank separator lines).
  return rows.filter(cells => cells.some(c => c !== ''));
}

/**
 * Guess the delimiter from the first row that has content.  A tab anywhere in
 * it means tab-separated; otherwise comma.  Checked on the first row rather
 * than the whole file so that a tab inside one sentence of a .csv cannot flip
 * the whole file to TSV.
 */
function sniffDelimiter(content) {
  const first = String(content).replace(/^﻿/, '').split(/\r\n?|\n/).find(l => l.trim() !== '');
  if (first === undefined) return '\t';
  if (first.indexOf('\t') !== -1) return '\t';
  if (first.indexOf(',') !== -1) return ',';
  return '\t';   // single-column file; either works
}

/**
 * Column names recognised in a header row, per field.  Compared after
 * lowercasing and removing everything that is not a letter or digit, so
 * "Item ID", "item_id" and "ItemID" are the same name.
 *
 * Single-letter aliases are deliberately absent: a headerless file whose first
 * row starts `01  a  The ancient...` would otherwise look like a header
 * declaring an "a" column.
 */
const STIMULUS_COLUMN_ALIASES = {
  item_id:   ["itemid", "item", "itemno", "itemnumber", "items", "id",
              // German / Arabic: studies here are run in these languages and a
              // spreadsheet is usually headed in the language it was written in.
              "nr", "nummer", "itemnr", "itemnummer", "رقم", "رقمالجملة", "المعرف"],
  // The Latin square column.  Its values (a/b/c/d, 1/2/3/4) are the variants of
  // an item that are counterbalanced across participants.  Called "list"
  // because that is what it is called in the stimulus spreadsheets this is
  // written for.
  list:      ["list", "lists", "liste", "listen", "version", "versions",
              "قائمة", "القائمة", "نسخة"],
  // Optional, and a different thing entirely: a descriptive label for what the
  // variant *is* ("garden-path" / "non-garden-path"), carried through to the
  // results untouched.  It plays no part in the Latin square.
  condition: ["condition", "cond", "conditions",
              "bedingung", "bedingungen", "kondition", "شرط", "الشرط", "الحالة"],
  // "Sentence" is the canonical name; "SentenceText" stays accepted so files
  // written against the older documentation keep working.
  sentence:  ["sentence", "sentencetext", "sentences", "text", "stimulus", "stim",
              "satz", "satztext", "stimulustext", "جملة", "الجملة", "النص"],
  question:  ["questiontext", "question", "comprehensionquestion", "questions",
              "frage", "fragetext", "verstaendnisfrage", "سؤال", "السؤال"],
  answer:    ["correctanswer", "answer", "correct", "expectedanswer", "answers",
              "antwort", "richtigeantwort", "loesung", "جواب", "الجواب", "الإجابة", "الاجابة"]
};

function normalizeColumnName(name) {
  // Strip separators and punctuation, not "everything that is not a-z0-9":
  // the latter reduces an Arabic or Greek header to the empty string, and a
  // German one loses its umlauts, so no header written in the language the
  // study is actually in would ever be recognised.
  return String(name).toLowerCase().replace(/[\s_\-.()\[\]{}:;,#"']/g, '');
}

/**
 * Decide whether the first row is a header, and return the column index of
 * each field.
 *
 * A row counts as a header only when it names all three *required* fields —
 * ItemID, List and Sentence.  That test has to be by name rather than
 * "the first cell is not a number", because item IDs are allowed to be strings
 * (F01, item_3), so a non-numeric first cell is no longer evidence of a header.
 *
 * A filler file needs no List column (`filler` = true): its header has to
 * name only ItemID and Sentence.
 *
 * Returns null when there is no header, in which case columns are positional.
 */
function detectHeader(cells, filler) {
  const found = {};
  cells.forEach((cell, i) => {
    const name = normalizeColumnName(cell);
    if (name === '') return;
    Object.keys(STIMULUS_COLUMN_ALIASES).forEach(field => {
      if (found[field] === undefined && STIMULUS_COLUMN_ALIASES[field].includes(name)) {
        found[field] = i;
      }
    });
  });

  if (found.item_id === undefined || found.sentence === undefined ||
      (!filler && found.list === undefined)) {
    return null;
  }
  return found;
}

/**
 * A filler file without a header row may still be in the older layout
 * ItemID, List, Sentence, ... (with a label such as "filler" in every row).
 * Its second column is then the same short word in every row, which a
 * sentence column never is.
 */
function hasFillerListColumn(rows) {
  return rows.length > 0 && rows.every(r =>
    r.length >= 3 && r[1] === rows[0][1] && !/\s/.test(r[1]) && r[1].length <= 20 &&
    String(r[2] === undefined ? '' : r[2]).trim() !== '');
}

/**
 * Item IDs may be numbers or strings.  A numeric-looking ID is returned as a
 * number so that "01" is still 1, exactly as `parseInt` made it before — an ID
 * that changed from 1 to "01" would not match the same item in data collected
 * earlier.
 * Anything else (F01, item_3) is kept as the string it is.
 */
function parseItemId(raw) {
  const s = String(raw === undefined || raw === null ? '' : raw).trim();
  if (s === '') return '';
  return /^-?\d+$/.test(s) ? parseInt(s, 10) : s;
}

/**
 * Parse stimulus text into rows of [item_id, condition, sentence, question,
 * answer].  The positional array is kept as the internal representation so
 * that nothing downstream has to change; only the parsing in front of it is
 * new.  Absent optional columns are `undefined`, which is what
 * validateCorrectAnswers() and the trial builder already expect.
 */
function parseDelimited(content, delimiter, opts) {
  opts = opts || {};
  const label = opts.label || 'stimulus file';
  const rows = parseDelimitedRows(content, delimiter);
  if (rows.length === 0) return [];

  const filler = opts.filler === true;
  const header = opts.header === false ? null : detectHeader(rows[0], filler);
  const body = header ? rows.slice(1) : rows;
  // Without a header: ItemID, List, Sentence, QuestionText, CorrectAnswer --
  // or, for a filler file, the same without List (unless the file still has
  // one; see hasFillerListColumn()).
  const positions = header ||
    (filler && !hasFillerListColumn(body)
      ? { item_id: 0, sentence: 1, question: 2, answer: 3 }
      : { item_id: 0, list: 1, sentence: 2, question: 3, answer: 4 });
  const at = (cells, field) => {
    const i = positions[field];
    return (i === undefined || i < 0) ? undefined : cells[i];
  };

  // Columns the parser does not recognise are carried through rather than
  // dropped, so a study can ship its own per-item variables (plausibility
  // norms, region counts, surprisal, item subtype) and have them land in the
  // results file without a join.  They keep the order they have in the file.
  //
  // Only possible with a header row: without one an extra column has no name
  // to carry.  The header text is sanitised, not because of the character set
  // (Arabic and German names are fine) but because the CSV writer joins column
  // names unquoted, so a comma or quote inside one would break the file.
  const recognised = header ? new Set(Object.values(header)) : new Set();
  const extra_columns = [];
  if (header) {
    rows[0].forEach((cell, i) => {
      if (recognised.has(i)) return;
      const name = String(cell).trim().toLowerCase().replace(/[\s,"';]+/g, '_');
      if (name !== '') extra_columns.push({ index: i, name: name });
    });
  }

  if (header) {
    const named = Object.keys(header).map(f => `${f}=col ${header[f] + 1}`).join(', ');
    console.info(`${label}: header row detected (${named}); columns read by name.`);
    if (extra_columns.length > 0) {
      console.info(
        `${label}: ${extra_columns.length} extra column(s) carried through as ` +
        extra_columns.map(c => 'stim_' + c.name).join(', ') + '.'
      );
    }
  } else if (rows[0].length > 5) {
    console.info(
      `${label}: rows have more than 5 columns but no header row was ` +
      `recognised, so columns 6+ are ignored. Add a header to carry them ` +
      `through as stim_* columns.`
    );
  }

  const skipped = [];
  const out = [];
  body.forEach((cells, n) => {
    const id = parseItemId(at(cells, 'item_id'));
    // Every filler is List 0, whatever (if anything) its file says.
    const list_label = filler ? '0' : at(cells, 'list');
    const sentence = at(cells, 'sentence');
    // Optional and header-only: there is no positional slot for it, because
    // the five positional columns are the format this started with.
    const condition = header ? at(cells, 'condition') : undefined;

    // A row is usable only with all three required fields.  Anything else is
    // reported rather than dropped in silence — a header that was not
    // recognised, or a row split wrongly, would otherwise become a stimulus.
    if (id === '' || !list_label || String(list_label).trim() === '' || !sentence || String(sentence).trim() === '') {
      skipped.push(`  row ${n + (header ? 2 : 1)}: ${JSON.stringify(cells.slice(0, 3))}`);
      return;
    }

    const row = [
      id,
      String(list_label).trim(),
      sentence,
      at(cells, 'question'),
      at(cells, 'answer')
    ];
    // Attached rather than positional, for the same reason as row.extra: the
    // five-element shape is what every caller indexes into.
    if (condition !== undefined && String(condition).trim() !== '') {
      row.condition = String(condition).trim();
    }
    // Attached as a property, not a sixth element: the five-element positional
    // shape is what every caller indexes into, and it stays exactly that.
    // Object key order is insertion order, which is file order here.
    if (extra_columns.length > 0) {
      row.extra = {};
      extra_columns.forEach(c => {
        const v = cells[c.index];
        row.extra[c.name] = (v === undefined || String(v).trim() === '') ? 'NA' : v;
      });
    }
    out.push(row);
  });

  if (skipped.length > 0) {
    console.warn(
      `${label}: ${skipped.length} row(s) skipped — ` +
      (filler ? `ItemID and Sentence are` : `ItemID, List and Sentence are all`) +
      ` required:\n` + skipped.join('\n')
    );
  }

  // The ordered names, so the caller can build the column list without
  // re-deriving it from the rows (and without losing columns that happen to be
  // empty on every row).
  out.extra_columns = extra_columns.map(c => c.name);
  return out;
}

/**
 * Load a stimulus file.
 *
 * `url` may be given with or without an extension.  Without one, .tsv and .csv
 * are tried in that order and the first that exists is used, so a study can
 * ship whichever of the two its authors work in.  The delimiter is then
 * sniffed from the file's own content, so a .csv that is really tab-separated
 * still reads correctly.
 *
 * Options: { optional: true } returns [] instead of throwing when no file is
 * found (used for fillers.*, which not every study has); { filler: true }
 * reads a filler file (no List column needed, every row gets List 0);
 * { delimiter: "," } overrides the sniffing; { header: false } forces
 * positional columns.
 *
 * Returns the parsed rows, with `.source` set to the filename actually used.
 */
function loadStimuli(url, opts) {
  opts = opts || {};
  const has_extension = STIMULUS_EXTENSIONS.some(ext => url.toLowerCase().endsWith(ext));
  const candidates = has_extension ? [url] : STIMULUS_EXTENSIONS.map(ext => url + ext);

  let content = null;
  let source = null;
  for (const candidate of candidates) {
    // Probing for a file that may not be there logs a 404 in the browser
    // console.  That is the browser's own network log, not an error in the
    // experiment, and cannot be suppressed from script.
    content = fetchURLContentSync(candidate, { optional: true });
    if (content !== null) { source = candidate; break; }
  }

  if (content === null) {
    if (opts.optional) return [];
    throw new Error(
      `Could not load ${url} — tried ${candidates.join(', ')}.`
    );
  }

  const delimiter = opts.delimiter || sniffDelimiter(content);
  const parsed = parseDelimited(content, delimiter, {
    label: source,
    header: opts.header,
    filler: opts.filler
  });
  console.info(
    `${source}: ${parsed.length} rows, ${delimiter === '\t' ? 'tab' : 'comma'}-separated.`
  );
  parsed.source = source;
  return parsed;
}

// ---- 2. Latin square: which list a participant gets ----------------------

/**
 * Sort order for List labels and ItemIDs: numbers numerically (1 < 2 < 10),
 * letters alphabetically (a < b < c).
 */
function compareLabels(a, b) {
  return a.toString().localeCompare(b.toString(), undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Appended to every checkLatinSquare() failure.
 *
 * An unrecognised header row is not skipped: item IDs may be strings and all
 * three of its cells are non-empty, so it parses as a stimulus and then trips
 * whichever balance check it happens to break first — usually the item-count
 * one, not the List label one.  Every message therefore carries the hint,
 * because which of them fires is an accident of the file.
 */
function headerHint() {
  return "\n\nIf the first row of the stimulus file is a header, its column names " +
    "were not recognised, so it was read as a stimulus. Recognised names for the " +
    "three required columns are:\n" +
    "  ItemID:   " + STIMULUS_COLUMN_ALIASES.item_id.join(', ') + "\n" +
    "  List:     " + STIMULUS_COLUMN_ALIASES.list.join(', ') + "\n" +
    "  Sentence: " + STIMULUS_COLUMN_ALIASES.sentence.join(', ') + "\n" +
    "Rename the header, remove it, or add the name to STIMULUS_COLUMN_ALIASES " +
    "in helpers.js.";
}

function checkLatinSquare(target_sentences) {

  // Checks that all items have the same number of sentences:
  const countMap = new Map();
  target_sentences.forEach(sentence => {
    countMap.set(sentence[0], (countMap.get(sentence[0]) || 0) + 1);
  });
  const counts = [...countMap.values()];
  if (new Set(counts).size > 1) {
    throw new Error(
      "All items need to have the same number of sentences." + headerHint()
    );
  }
  
  // Checks that all items have the same List labels:
  const labelsByItem = new Map();
  target_sentences.forEach(sentence => {
    if (!labelsByItem.has(sentence[0])) {
      labelsByItem.set(sentence[0], []);
    }
    labelsByItem.get(sentence[0]).push(sentence[1]);
  });
  const labelSets = [...labelsByItem.values()];

  // Sort the labels consistently for comparison
  const firstLabelSet = labelSets[0].sort(compareLabels).join(',');
  if (!labelSets.every(labels => labels.sort(compareLabels).join(',') === firstLabelSet)) {
    throw new Error(
      "Latin square design looks unbalanced: every ItemID must carry the same " +
      "set of List labels." + headerHint()
    );
  }

  // Checks that each List label is present only once per item:
  const firstEntry = labelsByItem.values().next().value;
  if (new Set(firstEntry).size < firstEntry.length) {
    throw new Error(
      "At least one List label appears multiple times per item." + headerHint()
    );
  }

  // The cyclic assignment below only balances the labels within a list when
  // the number of items is a multiple of the number of labels.  With 13 items
  // and 4 labels, for instance, one label appears 4 times per list and the
  // rest 3 times.
  const n_items = labelsByItem.size;
  const n_labels = firstEntry.length;
  if (n_items % n_labels !== 0) {
    console.warn(
      `${n_items} items over ${n_labels} List labels: the labels cannot be ` +
      `balanced within a list. Use a multiple of ${n_labels} items.`
    );
  }

  // Return items and the unique sorted List labels
  return [Array.from(labelsByItem.keys()), labelSets[0].sort(compareLabels)];
}

function latinSquareLists(target_sentences) {
  const [items, labels] = checkLatinSquare(target_sentences);

  // Sort target sentences primarily by ItemID and secondarily by List label.
  // compareLabels() and not `a[0] - b[0]`: item IDs may be strings (F01,
  // item_3), and subtracting those yields NaN, which makes the comparator
  // inconsistent and the list construction below nondeterministic — silently,
  // because the lists still come out the right size.  compareLabels() is
  // numeric-aware, so numeric IDs still order 2 before 10.
  target_sentences.sort((a, b) => {
    if (a[0] !== b[0]) return compareLabels(a[0], b[0]);
    return compareLabels(a[1], b[1]);
  });

  const d = {};
  target_sentences.forEach(sentence => {
    if (!d[sentence[0]]) d[sentence[0]] = [];
    d[sentence[0]].push(sentence);
  });

  const lists = Array.from({ length: labels.length }, () => []);
  let offset = 0;

  // Use the sorted items to ensure deterministic list generation.  Same reason
  // as above for not using parseInt(): a string ID gives NaN and the sort stops
  // being a sort.  Object keys are strings either way, so comparing them as
  // strings loses nothing.
  const sortedItemKeys = Object.keys(d).sort(compareLabels);

  sortedItemKeys.forEach(key => {
    const itemRows = d[key];
    itemRows.forEach((_, index) => {
      lists[index].push(itemRows[(index + offset) % itemRows.length]);
    });
    offset += 1;
  });

  const result = {};
  labels.forEach((label, index) => {
    result[label] = lists[index];
  });

  return result;
}

/**
 * Ask the server for the next list in rotation, so that participants are
 * distributed evenly over the lists instead of independently at random (which
 * lets list Ns drift apart over a study).  Falls back to random assignment if
 * the endpoint is unavailable, so the experiment still runs under any plain
 * static file server.
 *
 * Returns { list_name, list_index, n_lists, assignment, stimuli }.
 */
function assignedLatinSquareList(target_sentences) {
  const lists = latinSquareLists(target_sentences);
  // Sort explicitly rather than trusting Object.keys(): JavaScript returns
  // integer-like keys in ascending numeric order regardless of insertion order,
  // so with numeric labels (1, 2, 3) the key order and the order the lists
  // were built in are only accidentally the same.  compareLabels is the
  // same comparator used to build them, and handles both "a"/"b" and "1"/"10".
  const keys = Object.keys(lists).sort(compareLabels);

  let index = null;
  try {
    const request = new XMLHttpRequest();
    request.open('GET', '/get_list?n=' + keys.length, false);
    request.send(null);
    if (request.status === 200) {
      const parsed = parseInt(request.responseText, 10);
      if (Number.isInteger(parsed) && parsed >= 0 && parsed < keys.length) {
        index = parsed;
      }
    }
  } catch (e) {
    // Endpoint missing or unreachable; handled below.
  }

  const assignment = index === null ? "random_fallback" : "server_rotation";
  if (index === null) {
    console.warn("List assignment endpoint unavailable; assigning a list at random.");
    index = Math.floor(Math.random() * keys.length);
  }

  return {
    // latinSquareLists() keys its lists by List label, which would put an "a"
    // in the `list` column right next to an unrelated "c" in the `list_label`
    // column.  Report a positional name instead so the two cannot be confused.
    list_name: "L" + (index + 1),
    list_key: keys[index],
    list_index: index,
    n_lists: keys.length,
    assignment: assignment,
    stimuli: lists[keys[index]]
  };
}

// ---- 3. Comprehension questions ------------------------------------------

/**
 * Notation accepted in the CorrectAnswer column of the stimulus file.  Yes/No,
 * 1/0 and true/false are all in use in stimulus spreadsheets and none is more
 * correct than the others, so all of them are read rather than forcing one.
 * Extend either list to add a notation; entries are matched case-insensitively
 * after trimming.
 */
const YES_NO_TOKENS = {
  Yes: ["yes", "y", "1", "true", "t", "ja", "j", "نعم"],
  No:  ["no", "n", "0", "false", "f", "nein", "لا"]
};

/**
 * Map a CorrectAnswer cell onto the canonical "Yes"/"No" the response is
 * recorded as.
 *
 * Returns null for an empty cell (no correct answer defined — the question is
 * an attention probe with nothing to score) *and* for a cell that cannot be
 * read.  The caller has to tell those apart, because the second is a typo in
 * the stimulus file: scored naively it would mark every response to that item
 * wrong and quietly deflate the accuracy of every participant.  Hence
 * validateCorrectAnswers() below.
 */
function normalizeYesNo(value) {
  if (value === undefined || value === null) return null;
  const token = String(value).trim().toLowerCase();
  if (token === "") return null;
  if (YES_NO_TOKENS.Yes.includes(token)) return "Yes";
  if (YES_NO_TOKENS.No.includes(token)) return "No";
  return null;
}

/**
 * Check the CorrectAnswer column before the session starts and report cells
 * that are filled in but unreadable, so a typo surfaces during piloting rather
 * than as an unexplained dip in accuracy after data collection.
 *
 * @param {Array} stim_list  rows of [item_id, condition, sentence, question, answer]
 * @returns {Array}          the offending rows, empty when the column is clean
 */
function validateCorrectAnswers(stim_list) {
  const unreadable = [];
  const orphaned = [];

  stim_list.forEach(stim => {
    const raw = stim[4];
    const filled = raw !== undefined && raw !== null && String(raw).trim() !== "";
    if (!filled) return;                       // no answer defined: nothing to check

    if (normalizeYesNo(raw) === null) {
      unreadable.push({ item_id: stim[0], condition: stim[1], value: raw });
    }
    // An answer with no question to attach to.  Such a row still gets the
    // generic question, which has no right answer, so the answer is ignored —
    // but silently ignoring it would hide a half-finished stimulus file.
    if (!stim[3] || String(stim[3]).trim() === "") {
      orphaned.push({ item_id: stim[0], condition: stim[1], value: raw });
    }
  });

  const describe = rows => rows.map(r => `  item ${r.item_id} (${r.condition}): "${r.value}"`).join('\n');

  if (unreadable.length > 0) {
    console.warn(
      `Unreadable CorrectAnswer values in the stimulus file — these questions ` +
      `will be recorded as unscored (correct = NA) rather than wrong:\n` +
      describe(unreadable) +
      `\nAccepted: ${YES_NO_TOKENS.Yes.join(', ')} / ${YES_NO_TOKENS.No.join(', ')}.`
    );
  }

  if (orphaned.length > 0) {
    console.warn(
      `CorrectAnswer given but QuestionText empty — these rows get the generic ` +
      `question, which has no right answer, so the answer is ignored and the ` +
      `trial is left unscored:\n` + describe(orphaned)
    );
  }

  return { unreadable: unreadable, orphaned: orphaned };
}

/**
 * Decide which trials are followed by a comprehension question.
 *
 * Asking after every sentence makes the question predictable, and that is paid
 * for in the reading times themselves: a participant who knows a probe is
 * coming reads for the probe.  Probing a random subset keeps attention up
 * without letting the participant anticipate.
 *
 * The subset is drawn *stratified by condition* rather than by an independent
 * coin flip per trial, because the coin flip has two properties you do not
 * want:
 *
 *  - the number of questions differs between participants, so the amount of
 *    attention pressure — and the length of the session — becomes an
 *    uncontrolled subject variable;
 *  - within a participant the questions land unevenly across conditions.  With
 *    three items per condition per list, "three questions in condition a and
 *    none in condition d" is an ordinary draw, and answering a question changes
 *    both the trial it follows and the trial after it.  Randomising *which*
 *    items are probed is the point; letting condition ride along with it is not.
 *
 * Fixing the count per condition and randomising only which items fill it
 * removes both, and leaves the participant just as unable to predict any
 * individual trial.
 *
 * The count per condition is a whole number, so the realised rate is quantised:
 * with three items per condition it can only be 0, 1/3, 2/3 or 1.  Exact
 * balance across conditions is worth more than hitting the requested rate to
 * two decimals, so the rate is what gives — it is reported to the console and
 * written into the data rather than silently rounded away.
 *
 * @param {Array}  stim_list    rows of [item_id, condition, sentence, ...]
 * @param {number} probability  target proportion of trials carrying a question
 * @param {Object} [options]    { condition_index } — where the condition sits
 *                              in a row, default 1
 * @returns {boolean[]}         one flag per row, parallel to stim_list
 */
function assignQuestionTrials(stim_list, probability, options) {
  const opts = options || {};
  const condition_index = opts.condition_index ?? 1;

  const requested = Number(probability);
  if (!Number.isFinite(requested)) {
    throw new Error(`Question probability must be a number, got: ${probability}`);
  }
  const p = Math.min(1, Math.max(0, requested));

  const flags = new Array(stim_list.length).fill(false);
  if (stim_list.length === 0 || p === 0) return flags;
  if (p === 1) return flags.fill(true);

  const by_condition = new Map();
  stim_list.forEach((stim, index) => {
    const key = String(stim[condition_index]);
    if (!by_condition.has(key)) by_condition.set(key, []);
    by_condition.get(key).push(index);
  });

  by_condition.forEach(indices => {
    const k = Math.round(p * indices.length);
    // Fisher-Yates on a copy: which items are probed is the one thing that is
    // allowed to differ between participants.
    const shuffled = indices.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    shuffled.slice(0, k).forEach(index => { flags[index] = true; });
  });

  const n_asked = flags.filter(Boolean).length;
  const realised = n_asked / flags.length;
  if (Math.abs(realised - p) > 0.005) {
    console.info(
      `Comprehension questions: requested ${p}, realised ${realised.toFixed(3)} ` +
      `(${n_asked}/${flags.length}). The count per condition has to be a whole ` +
      `number, so the rate is quantised by the number of items per condition.`
    );
  }

  return flags;
}

// ---- 4. Device and reading display ---------------------------------------

/**
 * "mobile" when the participant's main input is a finger (phones, tablets,
 * iPads), otherwise "desktop".  Decided once per session; the result picks
 * how the participant responds (taps or keys) and which texts they see.
 *
 * It asks what the device's *primary* pointer is (`pointer: coarse` = a
 * finger), not what the browser calls itself and not how wide the screen
 * is:
 *   - A touchscreen laptop's primary pointer is its trackpad or mouse, so it
 *     counts as desktop and its touchscreen is never listened to.
 *   - A phone or tablet with a Bluetooth keyboard still counts as mobile:
 *     tapping works, the keyboard is ignored, nobody gets stuck.
 *   - iPads: Safari on an iPad presents itself as a Mac, so any test of the
 *     browser name calls it a computer.  Its pointer is reported as coarse
 *     even with a trackpad attached, which is enough; the touch-point test
 *     is a second line in case that ever changes (real Macs report 0).
 */
function detectDevice() {
  const coarse = typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;
  const ipad_as_mac = /Macintosh/.test(navigator.userAgent) &&
    navigator.maxTouchPoints > 1;
  return (coarse || ipad_as_mac) ? 'mobile' : 'desktop';
}


// Regions:
//
// A sentence can group words into a region with curly braces:
//
//   the man who {I saw} left
//
// gives the units  the · man · who · I saw · left.  A region is shown, hidden
// and timed as one unit (one keypress, one RT) and is never split across two
// lines -- PCIbex's "non-breaking region".  Words outside braces are read one
// by one as usual, and a sentence without braces is read word by word.
//
// Braces are the only marker, on purpose: they never occur in ordinary
// sentences, whereas * / - " and the like do, and treating those as markers
// would silently cut normal sentences into the wrong units.

/**
 * Split one sentence into the units it is read in.  Whitespace inside a
 * region is collapsed to single spaces; an empty pair `{}` is dropped.
 * Punctuation written straight against a region -- `the {old man}, who` --
 * belongs to that region rather than becoming a unit of its own.
 */
function splitRegions(sentence) {
  const text = String(sentence).trim();
  const words = part => part.split(/\s+/).filter(Boolean);
  if (!/\{[^{}]*\}/.test(text)) return words(text);

  // Alternates: text outside braces, text inside, outside, inside, ...
  const parts = text.split(/\{([^{}]*)\}/);
  const units = [];
  let attach_next = '';
  parts.forEach((part, index) => {
    if (index % 2 === 1) {
      const inner = part.trim().replace(/\s+/g, ' ');
      if (inner) units.push(attach_next + inner);
      attach_next = '';
      return;
    }
    let outside = part;
    // Text glued to the end of the previous region (no space after "}").
    if (index > 0 && units.length && outside && !/^\s/.test(outside)) {
      const glued = outside.match(/^\S+/)[0];
      units[units.length - 1] += glued;
      outside = outside.slice(glued.length);
    }
    // Text glued to the start of the next region (no space before "{").
    if (index < parts.length - 1 && outside && !/\s$/.test(outside)) {
      const glued = outside.match(/\S+$/)[0];
      attach_next = glued;
      outside = outside.slice(0, -glued.length);
    }
    units.push(...words(outside));
  });
  return units;
}

/**
 * Warn about braces that do not form proper pairs -- `{I saw` without its
 * `}`, or a `{` inside another region.  Such a sentence is still shown, but
 * the stray brace appears on screen as part of a word, which is almost
 * certainly a typo in the stimulus file.
 */
function validateRegions(stim_rows) {
  const bad = stim_rows.filter(stim => {
    const text = String(stim[2]);
    const left_over = text.replace(/\{[^{}]*\}/g, '');
    return /[{}]/.test(left_over);
  });
  if (bad.length > 0) {
    console.warn(
      `Regions: unmatched { or } in ${bad.length} sentence(s); the brace will ` +
      `be shown on screen. Items: ` + bad.map(stim => `${stim[0]}/${stim[1]}`).join(', ')
    );
  }
}

/**
 * Stop the browser scrolling the page when the participant uses the response
 * keys.  Typing in form fields is left alone so survey trials keep working.
 */
function preventScrollKeys(keys) {
  const blocked = (keys || [" ", "PageUp", "PageDown", "ArrowUp", "ArrowDown", "Home", "End"])
    .map(key => key.toLowerCase());

  document.addEventListener('keydown', event => {
    const target = event.target;
    const tag = (target && target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (target && target.isContentEditable)) {
      return;
    }
    if (blocked.includes(event.key.toLowerCase())) {
      event.preventDefault();
    }
  }, { capture: true });
}

// Markdown to HTML converter (third-party package showdown):
function md(markdown) {
  var converter = new showdown.Converter();
  return converter.makeHtml(markdown);
}

// ---- 5. Saving the results -----------------------------------------------

/**
 * POST the results and then show the closing screen.
 *
 * The closing screen is rendered only once the server has confirmed the write.
 * Telling a participant "thank you, you may close the window" before that is
 * worse than showing nothing: they close it, and the session is lost with no
 * sign that anything went wrong.  A failed save therefore says so, asks them
 * to keep the window open, and offers a retry — the data is still in memory,
 * so a second attempt after a dropped connection usually succeeds.
 *
 * Two payloads are sent when a questionnaire was shown: the trials, then the
 * survey row, as separate POSTs distinguished by `?kind=`.  They are sent in
 * that order on purpose.  Reading times cannot be collected again; demographics
 * can be asked again.  Sending the irreplaceable part first means a failure of
 * the second can never put the first at risk, and a retry re-sends only the
 * part that actually failed rather than duplicating what already landed.
 *
 * A server that does not understand `?kind=` is not a problem for the trial
 * POST: `kind=results` is the default there, and an older server simply ignores
 * an unknown query parameter.
 *
 * @param {string} data      the trial CSV to store
 * @param {Object} [options] { title, message, error_title, error_message, survey }
 */
async function saveData(data, options) {
  const opts = options || {};
  const target = document.getElementById("jspsych-content");

  const render = html => { if (target) target.innerHTML = html; };

  const showSuccess = () => render(`
    <div class="end-screen">
      <h1>${opts.title || "Thank you for taking part!"}</h1>
      ${opts.message || "<p>Your responses have been saved. You may now close this browser window.</p>"}
    </div>
  `);

  const showFailure = (detail, retry) => {
    render(`
      <div class="end-screen end-screen-error">
        <h1>${opts.error_title || "Your data has not been saved yet"}</h1>
        ${opts.error_message || `<p><strong>Please do not close this window.</strong> The connection to the
           server failed, so your responses have not been recorded. Press the button
           below to try again.</p>`}
        <p class="end-screen-detail">${detail}</p>
        <button type="button" id="retry-save" class="jspsych-btn">Try again</button>
      </div>
    `);
    const button = document.getElementById("retry-save");
    if (button) {
      button.addEventListener('click', () => {
        button.disabled = true;
        button.textContent = "Sending…";
        retry();
      });
    }
  };

  // One POST.  Returns null on success, or a human-readable reason.
  const post = async (body, kind) => {
    try {
      const response = await fetch('/store?kind=' + encodeURIComponent(kind), {
        method:  "POST",
        cache:   "no-cache",
        // The body is a JS string, which fetch always encodes as UTF-8, and the
        // server decodes it as UTF-8.  Declaring the charset makes that contract
        // explicit rather than relying on both ends defaulting the same way — it
        // is what keeps typed answers in Arabic, German or any other script
        // intact.
        headers: {"Content-Type": "text/csv; charset=utf-8"},
        body:    body
      });
      // fetch only rejects on a network-level failure; an HTTP 413 or 500 comes
      // back as a resolved response and would otherwise be reported as success.
      if (!response.ok) {
        return `Server responded ${response.status} ${response.statusText}.`;
      }
      await response.text();
      return null;
    } catch (error) {
      return String(error && error.message ? error.message : error);
    }
  };

  // Whether the trial POST has already succeeded, so a retry after a failed
  // survey POST does not send the reading times a second time and create a
  // duplicate participant.
  let trials_done = false;

  const attempt = async () => {
    if (!trials_done) {
      const failed = await post(data, "results");
      if (failed) { showFailure(failed, attempt); return false; }
      trials_done = true;
    }

    if (opts.survey) {
      const failed = await post(opts.survey, "survey");
      if (failed) { showFailure(failed, attempt); return false; }
    }

    showSuccess();
    return true;
  };

  return attempt();
}


// ---- 6. Small utilities: timestamps, time zone, CSV ----------------------

// Timestamps, time zone and CSV assembly: generic utilities, kept here
// rather than in experiment.js.

// Where the participant is, and what their clock reads there.
//
// `new Date().toISOString()` is always UTC -- that is what the trailing Z
// means -- so a run at 14:48 in Stuttgart is recorded as 12:48Z.  That is the
// right thing to *store*: UTC is unambiguous, has no DST gap, and orders
// correctly across participants in different countries.  What it cannot answer
// on its own is "what time of day was it for this person", which is the
// question that matters for a time-of-day covariate or for spotting someone
// who took part at 3am.
//
// So both are recorded.  The local form is ISO 8601 with an explicit offset
// (2026-09-09T14:48:57.850+02:00), which is simultaneously local *and*
// unambiguous -- unlike a bare local timestamp, it can always be converted
// back.  The IANA zone name is kept alongside it because the offset alone
// cannot distinguish zones that share one (+01:00 is Berlin in winter and
// Lagos all year), and because it is what R, Python and everything else expect
// as a zone identifier.
//
// Note this is the participant's own device clock and its own zone setting.
// Both can be wrong. The offset is what their machine believes, not a
// verified location, and nothing here is a geolocation lookup.
function localTimestamp(d) {
  const offset_min = -d.getTimezoneOffset();   // minutes east of UTC
  const sign = offset_min >= 0 ? "+" : "-";
  const pad = n => String(Math.floor(Math.abs(n))).padStart(2, "0");
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate())
    + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds())
    + "." + String(d.getMilliseconds()).padStart(3, "0")
    + sign + pad(offset_min / 60) + ":" + pad(offset_min % 60);
}

// "Europe/Berlin", "America/New_York", "Asia/Kolkata".  Supported everywhere
// that runs jsPsych 8, but guarded anyway: a browser with Intl stripped out
// would otherwise take the whole experiment down at line one.
function participantTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "NA";
  } catch (e) {
    return "NA";
  }
}

// One CSV row (or a header + row) from an object, using the same quoting rule
// as the trial file: strings quoted with doubled inner quotes, numbers and
// booleans left bare.
function csvFrom(rows) {
  const headers = Object.keys(rows[0]);
  const line = row => headers.map(h => {
    const val = row[h];
    return (typeof val === 'string') ? `"${val.replace(/"/g, '""')}"` : val;
  }).join(',');
  return [headers.join(','), ...rows.map(line)].join('\n');
}
