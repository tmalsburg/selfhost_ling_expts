# Combine all participants of one experiment into one file.
#
# Usage, from the top of the repository:
#
#   Rscript R/combine_results.R demo_judgment_task/data
#   Rscript R/combine_results.R demo_selfpacedreading/data
#
# or from inside an experiment's directory:  Rscript ../R/combine_results.R
# (the data directory defaults to ./data).
#
# What it does:
#   1. Reads every results_<uuid>.csv in the data directory (one file per
#      participant) and stacks them.  Files whose columns differ (because the
#      experiment was changed during data collection) are still combined;
#      columns a file lacks are filled with NA.
#   2. Adds the answers from survey.csv to every row of the same participant,
#      matched by participant_id.
#   3. Writes the result to <data directory>/combined.csv and prints the
#      number of participants per Latin square list.
#
# Base R only, so it runs on any machine with R and nothing to install.
# Rerun it whenever new participants have come in; combined.csv is
# overwritten.

args <- commandArgs(trailingOnly = TRUE)
data_dir <- if (length(args) >= 1) args[1] else "data"
if (!dir.exists(data_dir)) stop("No directory '", data_dir, "'.")

# Everything is read as text first and converted once at the end: guessing
# types per file fails when the same column looks numeric in one file and
# not in another, and it would strip leading zeros from IDs like "01".
read_as_text <- function(path) {
  read.csv(path, colClasses = "character", check.names = FALSE,
           fileEncoding = "UTF-8")
}

# Stack data frames whose columns may differ, keeping the column order of
# their first appearance.
stack <- function(parts) {
  all_cols <- unique(unlist(lapply(parts, names)))
  parts <- lapply(parts, function(d) {
    for (col in setdiff(all_cols, names(d))) d[[col]] <- rep(NA_character_, nrow(d))
    d[all_cols]
  })
  do.call(rbind, parts)
}

# ---- 1. Trials -------------------------------------------------------------

files <- list.files(data_dir, pattern = "^results_.+\\.csv$", full.names = TRUE)
if (length(files) == 0) stop("No results_*.csv files in '", data_dir, "'.")

unreadable <- character(0)
parts <- lapply(files, function(path) {
  d <- tryCatch(read_as_text(path), error = function(e) NULL)
  # A file that is not a valid CSV (e.g. a broken submission the server
  # stored as received) is left out and listed, never silently dropped.
  if (is.null(d)) {
    unreadable <<- c(unreadable, basename(path))
    return(NULL)
  }
  # Files saved before the experiment recorded a participant_id: use the
  # random part of the file name instead, which is unique per participant.
  if (!"participant_id" %in% names(d)) {
    d$participant_id <- rep(sub("^results_(.+)\\.csv$", "\\1", basename(path)), nrow(d))
  }
  d$source_file <- rep(basename(path), nrow(d))
  d
})
if (length(unreadable) > 0) {
  warning(length(unreadable), " file(s) are not valid CSV and were left out; ",
          "check them by hand: ", paste(unreadable, collapse = ", "), call. = FALSE)
}
parts <- Filter(Negate(is.null), parts)
if (length(parts) == 0) stop("None of the results files could be read.")
trials <- stack(parts)

# The same participant in two files means the experiment was submitted
# twice; keep both, but say so.
per_id <- tapply(trials$source_file, trials$participant_id,
                 function(x) length(unique(x)))
if (any(per_id > 1)) {
  warning("participant_id in more than one results file (kept all): ",
          paste(names(per_id)[per_id > 1], collapse = ", "), call. = FALSE)
}

# ---- 2. Survey -------------------------------------------------------------

survey_path <- file.path(data_dir, "survey.csv")
if (file.exists(survey_path)) {
  survey <- read_as_text(survey_path)

  # A participant can only appear twice if a submission was repeated; use
  # their last row.
  dup <- duplicated(survey$participant_id, fromLast = TRUE)
  if (any(dup)) {
    warning("Several survey rows for: ",
            paste(unique(survey$participant_id[dup]), collapse = ", "),
            "; using the last one of each.", call. = FALSE)
    survey <- survey[!dup, , drop = FALSE]
  }

  no_survey <- setdiff(unique(trials$participant_id), survey$participant_id)
  if (length(no_survey) > 0) {
    message("No survey row for ", length(no_survey), " participant(s): ",
            paste(no_survey, collapse = ", "))
  }
  no_trials <- setdiff(survey$participant_id, trials$participant_id)
  if (length(no_trials) > 0) {
    message("Survey row but no results file for ", length(no_trials),
            " participant(s): ", paste(no_trials, collapse = ", "))
  }

  # Columns already in the trial data (list, join_time, ...) are not
  # added a second time.
  row_of <- match(trials$participant_id, survey$participant_id)
  for (col in setdiff(names(survey), names(trials))) {
    trials[[col]] <- survey[[col]][row_of]
  }
} else {
  message("No survey.csv in '", data_dir, "'; combining results only.")
}

# ---- 3. Write --------------------------------------------------------------

# Numbers become numbers again, everything else stays text.  Columns with
# leading zeros ("01") stay text, so IDs are not altered.
trials[] <- lapply(trials, function(x) {
  if (any(grepl("^0[0-9]", x))) x else type.convert(x, as.is = TRUE)
})

out_path <- file.path(data_dir, "combined.csv")
write.csv(trials, out_path, row.names = FALSE, na = "NA", fileEncoding = "UTF-8")

n_participants <- length(unique(trials$participant_id))
message("Wrote ", nrow(trials), " rows from ", n_participants,
        " participant(s) to ", out_path)

# Participants per Latin square list, to check the balance.  Filler rows in
# the self-paced reading data carry list 0 and are not counted.
if ("list" %in% names(trials)) {
  lists <- unique(trials[!trials$list %in% c("0", 0, NA), c("participant_id", "list")])
  message("Participants per list:")
  print(table(list = lists$list))
}
