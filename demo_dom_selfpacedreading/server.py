#!/usr/bin/env python3

# Optimized Backend for jsPsych Experiments
# Serves the experiment from the directory it is started in, on every device.

import os
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


@route('/get_list')
def get_list():
    """
    Hand out Latin square lists in rotation: participant k receives list
    k mod n.  Assigning lists independently at random lets the list Ns drift
    apart over a study; rotating keeps them within one participant of each
    other.

    The counter is kept on disk so it survives a server restart, and the
    read-modify-write is protected by an exclusive lock because gevent may
    switch greenlets on any file I/O.
    """
    try:
        n_lists = int(request.query.get('n', 4))
    except (TypeError, ValueError):
        raise HTTPError(400, "Parameter 'n' must be an integer.")
    if n_lists < 1:
        raise HTTPError(400, "Parameter 'n' must be at least 1.")

    ensure_data_dir()

    fd = os.open(LIST_COUNTER, os.O_RDWR | os.O_CREAT, 0o644)
    with os.fdopen(fd, 'r+') as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        try:
            raw = f.read().strip()
            counter = int(raw) if raw.isdigit() else 0
            assigned = counter % n_lists
            f.seek(0)
            f.truncate()
            f.write(str(counter + 1))
            f.flush()
            os.fsync(f.fileno())
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)

    logging.info(f"Assigned list index {assigned} of {n_lists}.")
    return str(assigned)


# The survey file, appended to rather than written once per participant.
#
# One row per participant in one growing table is what makes the demographics
# readable; the alternative -- repeating the same six answers on every trial row
# -- is what this replaced.  participant_id links each row to the trials in
# results.csv.
SURVEY_FILE = os.path.join(DATA_DIR, "survey.csv")

# All participants' trials go here, one growing long-format table, ready to
# analyse without a merge step.
#
# A shared file is only safe if no write can damage the whole table, so three
# things protect it here, and all three matter:
#
#   1. An exclusive flock around the whole read-header-and-append sequence.
#      gevent switches greenlets on any file I/O, so two participants finishing
#      in the same instant would otherwise interleave mid-line.
#   2. The append is rolled back to the previous file size if the write raises
#      part-way, so a failed submission cannot leave a truncated final row
#      behind for everyone else's data to be read against.
#   3. A submission whose header does not match the file's is NOT appended.
#      It goes to its own results_<uuid>.csv instead — misaligning columns is
#      the one failure that is invisible at analysis time, and the mismatch is
#      real information (the experiment changed mid-study).
RESULTS_FILE = os.path.join(DATA_DIR, "results.csv")


def append_results(content):
    """
    Append one participant's trials to data/results.csv.

    Returns True when appended, False when the payload's header does not match
    the header already in the file — the caller then writes that participant to
    a file of their own rather than corrupting the shared table.
    """
    lines = [ln for ln in content.splitlines() if ln.strip()]
    if len(lines) < 2:
        raise HTTPError(400, "Results payload needs a header and at least one row.")

    ensure_data_dir()
    fd = os.open(RESULTS_FILE, os.O_RDWR | os.O_CREAT | os.O_APPEND, 0o644)
    with os.fdopen(fd, "r+", encoding="utf-8") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        try:
            f.seek(0)
            existing_header = f.readline().rstrip("\r\n")

            if existing_header == "":
                block = "\n".join(lines) + "\n"          # new file: header + rows
            elif existing_header != lines[0]:
                return False                              # columns changed mid-study
            else:
                block = "\n".join(lines[1:]) + "\n"      # rows only

            size_before = os.fstat(f.fileno()).st_size
            try:
                f.write(block)
                f.flush()
                os.fsync(f.fileno())
            except Exception:
                # Undo a partial append.  Without this a write that fails
                # half-way leaves a truncated row that every later read has to
                # cope with -- which is exactly how the previous shared file
                # was lost.
                f.truncate(size_before)
                f.flush()
                os.fsync(f.fileno())
                raise
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)
    return True


def append_survey(content):
    """
    Append one participant's questionnaire row to data/survey.csv.

    The payload carries a header and one data row.  The header is written only
    when the file is new; afterwards only the data rows are appended.

    Locked with the same exclusive flock the list counter uses: gevent switches
    greenlets on any file I/O, so two participants finishing at the same moment
    would otherwise interleave mid-line.  fsync before returning, because the
    200 this produces is a promise that the row is on disk.
    """
    lines = [ln for ln in content.splitlines() if ln.strip()]
    if len(lines) < 2:
        raise HTTPError(400, "Survey payload needs a header and one row.")

    ensure_data_dir()
    fd = os.open(SURVEY_FILE, os.O_RDWR | os.O_CREAT | os.O_APPEND, 0o644)
    with os.fdopen(fd, "r+", encoding="utf-8") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        try:
            f.seek(0, os.SEEK_END)
            if f.tell() == 0:
                f.write(lines[0] + "\n")
            for row in lines[1:]:
                f.write(row + "\n")
            f.flush()
            os.fsync(f.fileno())
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)


@route('/store', method="POST")
def store_data():
    """
    Captures experimental results.

    Trials are appended to one shared data/results.csv, so the file is ready to
    analyse without a merge step.  A participant whose column set differs from
    the file's is written to results_<uuid>.csv instead; see append_results().
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

        ensure_data_dir()

        if append_results(content):
            logging.info("Appended a participant's trials to %s", RESULTS_FILE)
            return "Your data has been recorded. You may now close this window."

        # Header mismatch: keep the data, keep the shared table intact, and say
        # so loudly -- this means the output columns changed during the study.
        filename = os.path.join(DATA_DIR, f"results_{uuid.uuid4()}.csv")
        with open(filename, "w", encoding='utf-8') as f:
            f.write(content)
            f.flush()
            os.fsync(f.fileno())

        logging.warning(
            "Column set differs from %s; wrote this participant to %s instead. "
            "The experiment's output columns changed mid-study -- merge the "
            "files by hand once you have decided which column set is right.",
            RESULTS_FILE, filename
        )
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
