
library(dplyr, quietly = TRUE)
library(readr, quietly = TRUE)

Sys.setenv(TZ="Europe/Paris")

if (file.exists("combined.tsv")) {
  stop("File 'combined.tsv' already exists.")
}

list.files(".", pattern = "results_.+\\.csv$") |>
  lapply(function(file_path) {
    message("Reading ", file_path, " ...")
    d <- readr::read_csv(file_path, show_col_types = FALSE)
    d$participant_id <- strsplit(file_path, "[_\\.]")[[1]][2]
    ctime <- file.info(file_path)$ctime
    ctime <- format(as.POSIXct(ctime, origin="1970-01-01", tz="UTC"),
                    "%Y-%m-%d %H:%M:%S %Z", tz="Europe/Paris")
    d$ctime <- format(ctime)
    d
  }) |>
  (\(.) do.call(rbind, .))() |>
  arrange(ctime) |>
  write_tsv(file="combined.tsv")

message("Wrote all results to file 'combined.tsv'.")
