
library(readr, quietly = TRUE)

if (file.exists("combined.tsv")) {
  stop("File 'combined.tsv' already exists.  Aborting.")
}

list.files(".", pattern = "results_.+\\.csv$") |>
  lapply(function(fn) {
    d <- readr::read_csv(fn, show_col_types = FALSE)
    d$participant_id = strsplit(fn, "[_\\.]")[[1]][2]
    d
  }) |>
  (\(.) do.call(rbind, .))() |>
  write_tsv(file="combined.tsv")

message("Wrote all results to file 'combined.tsv'.")
