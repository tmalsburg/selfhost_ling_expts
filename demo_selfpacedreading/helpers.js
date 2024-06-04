
// Functions for loading and parsing stimuli in .tsv format:

function fetchURLContentSync(url) {
    var request = new XMLHttpRequest();
    request.open('GET', url, false);  // Set the third parameter to false for a synchronous request
    request.send(null);  // Sending the request

    if (request.status === 200) {
        return request.responseText;
    } else {
        throw new Error('Request failed: ' + request.statusText);
    }
}

function parseTSV(tsv) {
  // Assuming the structure of your TSV and proceeding without using
  // an external parser for simplicity:
  const lines = tsv.trim().split('\n').map(line => line.split('\t'));

  const target_sentences = lines.map(line => [
    parseInt(line[0], 10), line[1], line[2], line[3]]);

  return target_sentences;
}

function loadStimuli(url) {
  const tsv = fetchURLContentSync(url);
  return parseTSV(tsv);
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
    throw new Error("Latin square design looks unbalanced.");
  }
  
  // Checks that each condition is present only once:
  const [item, conditions] = conditionsMap.entries().next().value;
  if (new Set(conditions).size < conditions.length) {
    throw new Error("At least one condition appears multiple times per item.");
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

function randomLatinSquareList(target_sentences) {
  const lists = latinSquareLists(target_sentences);
  const keys = Object.keys(lists);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  return lists[randomKey];
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
    }]
  }
}

// Function for storing the results on the server:

/* Send data data to store script: */
async function saveData(data){
  const response = await fetch('/store', {
    method:  "POST",
    cache:   "no-cache",
    headers: {"Content-Type": "text/csv"},
    body:    data
  })
  // await new Promise(r => setTimeout(r, 4000));
  document.getElementById("jspsych-content").innerHTML = await response.text();
}

