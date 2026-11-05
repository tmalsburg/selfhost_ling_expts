#!/usr/bin/env python3

# Optimized Backend for jsPsych Experiments
# Serves the experiment from the directory it is started in, on every device.

import io
import os
import csv
import sys
import uuid
import fcntl
import logging

# Set up logging to provide clear feedback in the console/log files
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Initialize gevent for high-concurrency async support
try:
    from gevent import monkey
    monkey.patch_all()
    SERVER_TYPE = 'gevent'
except ImportError:
    logging.warning("gevent not found. Falling back to default server (not recommended for production).")
    SERVER_TYPE = 'wsgiref'

from bottle import route, request, response, run, static_file, HTTPError

# --- CONFIGURATION ---
MAX_DATA = 1024 * 5000  # Allow up to 5MB payloads
DATA_DIR = "data"       # Subdirectory for results
LIST_COUNTER = os.path.join(DATA_DIR, "list_counter.txt")
# ---------------------


def ensure_data_dir():
    """Create the results directory, or fail loudly if the path is unusable."""
    if os.path.exists(DATA_DIR):
        if not os.path.isdir(DATA_DIR):
            raise HTTPError(500, f"Critical error: '{DATA_DIR}' exists but is not a directory.")
    else:
        os.makedirs(DATA_DIR)
        logging.info(f"Created directory: {DATA_DIR}")


def no_store(result):
    """
    Mark a response as uncacheable.  Participants must never be served a stale
    copy of the experiment after a mid-study fix, and it saves a hard refresh
    on every edit during development.

    static_file() returns its own HTTPResponse, which bottle sends instead of
    the thread-local `response`, so the header has to be set on the returned
    object rather than on `response`.
    """
    setter = getattr(result, 'set_header', None)
    if setter is not None:
        setter('Cache-Control', 'no-store, must-revalidate')
    else:
        response.set_header('Cache-Control', 'no-store, must-revalidate')
    return result


@route('/')
def serve_index():
    """
    Serves the primary entry point.
    Prioritizes 'experiment.html' or 'index.html' in the current working directory.
    """
    for filename in ["experiment.html", "index.html"]:
        if os.path.exists(filename):
            logging.info(f"Serving entry point: {filename}")
            return no_store(static_file(filename, root='.'))
    return HTTPError(404, "No experiment.html or index.html found in the current directory.")


# data/list_counter.txt holds the rotation position and, per list, how many
# participants started it and how many completed it, in a form that can be
# read directly:
#
#   next_participant 7
#
#   list  started  completed
#   1           2          2
#   2           2          1
#   ...
#
# Lines starting with # are explanations, rewritten on every update.  A file
# from an older version of this server holds a bare number (the rotation
# position) and is read as such, so a running study continues where it was.
LIST_COUNTER_NOTES = (
    "# Latin square lists, kept up to date by server.py.  Do not edit while\n"
    "# the experiment is running.\n"
    "#\n"
    "# next_participant: participants assigned a list so far; the next one\n"
    "#   gets list (next_participant mod number of lists) + 1.\n"
    "# started:   participants who were given this list.\n"
    "# completed: of those, how many sent their data.\n"
    "# started - completed = dropouts (and reloads of the page).\n"
    "#\n"
    "# Delete this file to start again at list 1 with all counts at zero.\n"
    "\n"
)


def read_list_counter(f):
    """Parse list_counter.txt (either format) into a dict."""
    f.seek(0)
    text = f.read()
    state = {"next": 0, "started": {}, "completed": {}}
    if text.strip().isdigit():                 # older format: a bare number
        state["next"] = int(text.strip())
        return state
    for line in text.splitlines():
        parts = line.split()
        if not parts or parts[0].startswith("#"):
            continue
        if parts[0] == "next_participant" and len(parts) == 2 and parts[1].isdigit():
            state["next"] = int(parts[1])
        elif len(parts) == 3 and all(p.isdigit() for p in parts):
            state["started"][int(parts[0])] = int(parts[1])
            state["completed"][int(parts[0])] = int(parts[2])
    return state


def write_list_counter(f, state):
    lists = sorted(set(state["started"]) | set(state["completed"]))
    lines = [LIST_COUNTER_NOTES,
             f"next_participant {state['next']}\n\n",
             "list  started  completed\n"]
    for n in lists:
        lines.append(f"{n:<4} {state['started'].get(n, 0):>8} {state['completed'].get(n, 0):>10}\n")
    f.seek(0)
    f.truncate()
    f.write("".join(lines))
    f.flush()
    os.fsync(f.fileno())


def update_list_counter(update):
    """
    Read list_counter.txt, apply update(state), write it back, and return
    what update() returned.  The whole read-modify-write runs under an
    exclusive lock, because gevent may switch greenlets on any file I/O and
    two participants arriving at the same moment must not get the same list.
    """
    ensure_data_dir()
    fd = os.open(LIST_COUNTER, os.O_RDWR | os.O_CREAT, 0o644)
    with os.fdopen(fd, 'r+', encoding='utf-8') as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        try:
            state = read_list_counter(f)
            result = update(state)
            write_list_counter(f, state)
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)
    return result


def list_of_submission(content):
    """
    The Latin square list (1, 2, ...) a results file belongs to, read from
    its `list` column: 3 in the judgment demo, "L3" in the self-paced reading
    demo, where fillers carry 0.  None if the file has no such column.
    """
    try:
        for row in csv.DictReader(io.StringIO(content)):
            value = str(row.get("list") or "").strip().lstrip("Ll")
            if value.isdigit() and int(value) > 0:
                return int(value)
    except csv.Error:
        pass
    return None


@route('/get_list')
def get_list():
    """
    Hand out Latin square lists in rotation: participant k receives list
    k mod n.  Assigning lists independently at random lets the list Ns drift
    apart over a study; rotating keeps them within one participant of each
    other.  Returns the list index counted from 0.
    """
    try:
        n_lists = int(request.query.get('n', 4))
    except (TypeError, ValueError):
        raise HTTPError(400, "Parameter 'n' must be an integer.")
    if n_lists < 1:
        raise HTTPError(400, "Parameter 'n' must be at least 1.")

    def assign(state):
        assigned = state["next"] % n_lists
        state["next"] += 1
        for n in range(1, n_lists + 1):           # show every list, even at 0
            state["started"].setdefault(n, 0)
        state["started"][assigned + 1] += 1
        return assigned

    assigned = update_list_counter(assign)
    logging.info(f"Assigned list {assigned + 1} of {n_lists}.")
    return str(assigned)


# Data layout, the same as on exphost:
#
#   data/results_<uuid>.csv   one file per participant, trials only, written
#                             once and never touched again.  Reading times are
#                             the irreplaceable part of a session, so a failed
#                             or interrupted write can cost at most one
#                             participant's data, and withdrawing a participant
#                             means deleting one file.
#   data/survey.csv           the questionnaire, one row per participant in one
#                             shared table, linked to the trial files by
#                             participant_id.
SURVEY_FILE = os.path.join(DATA_DIR, "survey.csv")


def append_survey(content):
    """
    Append one participant's questionnaire row to data/survey.csv.

    Parsed with the csv module, never split by line: the questionnaire ends
    with a free-text comments box, and a participant who presses Enter in it
    sends a newline *inside* a quoted field.  Splitting by line cut that row in
    two and left survey.csv with rows that do not match the header.

    The header is written only when the file is new.  Locked with an exclusive
    flock, because gevent switches greenlets on any file I/O and two
    participants finishing at the same moment would otherwise interleave
    mid-line.  fsync before returning, because the 200 that follows is a
    promise that the row is on disk.
    """
    parsed = [r for r in csv.reader(io.StringIO(content)) if any(c.strip() for c in r)]
    if len(parsed) < 2:
        raise HTTPError(400, "Survey payload needs a header and one row.")
    header, rows = parsed[0], parsed[1:]

    ensure_data_dir()
    fd = os.open(SURVEY_FILE, os.O_RDWR | os.O_CREAT | os.O_APPEND, 0o644)
    with os.fdopen(fd, "r+", encoding="utf-8") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        try:
            # LF line endings to match the rest of the file (csv.writer
            # defaults to CRLF).  QUOTE_ALL because the experiment quotes every
            # field it sends; an answer with deliberate leading or trailing
            # spaces written back unquoted would be trimmed by R's readers.
            w = csv.writer(f, lineterminator="\n", quoting=csv.QUOTE_ALL)
            f.seek(0, os.SEEK_END)
            if f.tell() == 0:
                w.writerow(header)
            for row in rows:
                w.writerow(row)
            f.flush()
            os.fsync(f.fileno())
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)


def write_results(content):
    """
    Write one participant's trials to a new data/results_<uuid>.csv.

    Stored exactly as received.  A random uuid4 name means two participants
    can never write to the same file, so no lock is needed.  fsync before
    returning, for the same reason as append_survey().  Returns the path.
    """
    ensure_data_dir()
    path = os.path.join(DATA_DIR, f"results_{uuid.uuid4()}.csv")
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
        f.flush()
        os.fsync(f.fileno())
    return path


@route('/store', method="POST")
def store_data():
    """
    Captures experimental results: trials to a new data/results_<uuid>.csv,
    the questionnaire (?kind=survey) as one row of data/survey.csv.
    """
    try:
        body = request.body
        raw = body.read(MAX_DATA)

        # Check the size limit *before* decoding.  MAX_DATA counts bytes, and a
        # character outside ASCII takes several of them, so an oversized
        # payload can be cut in the middle of one.  Decoding first turned that
        # into a misleading "invalid encoding" 400 instead of the 413 it is —
        # and only for participants writing in a non-Latin script.
        if len(body.read(1)) != 0:
            logging.error("Rejected data: Payload exceeds 5MB limit.")
            raise HTTPError(413, "Payload too large.")

        content = raw.decode('utf-8')

        # `results` (default) or `survey`.  Whitelisted rather than used as a
        # filename component: anything taken from the query string and put in a
        # path is a traversal waiting to happen, and an unknown value is a
        # mistake worth reporting rather than silently treating as results.
        kind = request.query.get('kind', 'results')
        if kind not in ('results', 'survey'):
            raise HTTPError(400, "Unknown kind; expected 'results' or 'survey'.")

        if kind == 'survey':
            append_survey(content)
            logging.info("Appended a survey row to %s", SURVEY_FILE)
            return "Your data has been recorded. You may now close this window."

        path = write_results(content)
        logging.info("Wrote a participant's trials to %s", path)

        # Count the completion in list_counter.txt.  Only after the data is
        # safely on disk, and a failure here is logged but never reported to
        # the participant: the count is a convenience, the data is not.
        list_no = list_of_submission(content)
        if list_no is not None:
            try:
                def complete(state):
                    state["completed"][list_no] = state["completed"].get(list_no, 0) + 1
                update_list_counter(complete)
            except Exception:
                logging.exception("Data saved, but could not update %s:", LIST_COUNTER)

        return "Your data has been recorded. You may now close this window."

    except HTTPError:
        raise
    except UnicodeDecodeError:
        raise HTTPError(400, "Invalid data encoding (expected UTF-8).")
    except Exception:
        logging.exception("Internal error during data storage:")
        raise HTTPError(500, "Internal Server Error: Could not save data.")


# Registered last: this catch-all must not shadow the specific routes above.
@route('/<filename:path>')
def serve_assets(filename):
    """
    Serves static assets (JS, CSS, stimuli, etc.).
    Includes a security check for allowed file extensions.
    """
    # The results directory is never servable.  `.csv` has to stay in the
    # allowlist below because loadStimuli() supports .csv stimulus files, but
    # that same entry made every participant's data downloadable at
    # /data/results_<uuid>.csv.  There is no directory listing, so this was
    # only obscurity — and filenames written by older versions of this server
    # were short enough to guess.  Nothing under data/ is ever a page asset, so
    # reject the whole directory rather than trying to pattern-match results
    # files.
    #
    # normpath collapses "./data", "data//x" and similar spellings onto the
    # same first component; casefold because a stray "Data/" would otherwise
    # slip through on a case-insensitive filesystem.  Traversal out of the
    # directory ("../etc/passwd") is already refused by static_file's own root
    # check, which is what the extension allowlist below falls through to.
    first_component = os.path.normpath(filename).lstrip(os.sep).split(os.sep)[0]
    if first_component.casefold() == DATA_DIR.casefold():
        logging.warning(f"Blocked access to the results directory: {filename}")
        return HTTPError(403, "Access denied.")

    # The experiment itself needs no '.txt' (stimuli are .tsv or .csv); the
    # entry is harmless, since data/ is rejected above before any extension is
    # considered.
    allowed_exts = ('.js', '.tsv', '.png', '.css', '.html', '.json', '.csv', '.txt', '.woff2', '.woff', '.ttf', '.svg')
    if any(filename.lower().endswith(ext) for ext in allowed_exts):
        return no_store(static_file(filename, root='.'))

    logging.warning(f"Blocked access to restricted or missing file: {filename}")
    return HTTPError(403, "Access denied to this file type.")


def announce(scheme, port):
    """
    Print the address the experiment is actually reachable at, as an OSC 8
    terminal hyperlink so it can be clicked instead of retyped.

    Bottle's own banner advertises the *bind* address ("Listening on
    http://0.0.0.0:80/").  0.0.0.0 means "every interface", not a browsable
    host: handing it to a browser gives an invalid target, so that line is not
    a usable link.  The default port is left out of the URL for the same
    reason a browser hides it.
    """
    url = f"{scheme}://localhost/"
    if port not in (80, 443):
        url = f"{scheme}://localhost:{port}/"

    # OSC 8 is understood by VTE-based terminals (Ptyxis); everywhere else, and
    # when the output is redirected to a log file, fall back to the bare URL.
    if sys.stdout.isatty():
        url = f"\033]8;;{url}\033\\{url}\033]8;;\033\\"

    print(f"\n  Open the experiment here:  {url}\n", flush=True)


def start_server():
    """
    Detects SSL certificates and launches the appropriate HTTP or HTTPS server.
    """
    host = '0.0.0.0'
    cert_file = "cert.pem"
    key_file = "key.pem"

    try:
        # Check for SSL certificates to enable HTTPS
        if os.path.exists(cert_file) and os.path.exists(key_file):
            port = 443
            logging.info(f"Launching SECURE server on port {port}...")
            announce("https", port)
            run(host=host, port=port, server=SERVER_TYPE, certfile=cert_file, keyfile=key_file)
        else:
            port = 80
            logging.info(f"Launching server on port {port}...")
            announce("http", port)
            run(host=host, port=port, server=SERVER_TYPE)

    except OSError as e:
        if e.errno == 98:
            logging.error("Address already in use. Is another server running?")
        elif e.errno == 13:
            logging.error("Permission denied. Port 80/443 requires 'sudo' privileges.")
        else:
            logging.error(f"Failed to bind server: {e}")

        # Cleanup PID tracking if run via Makefile
        if os.path.exists("nohup.pid"):
            try:
                os.remove("nohup.pid")
            except OSError:
                pass
        sys.exit(1)


if __name__ == "__main__":
    start_server()
