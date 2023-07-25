
library(tidyverse)

# Be advised that the log file's structure is messy due to its
# inconsistent format and potential disruptions from hacking attempts.
# The analyses below are provided with an understanding of these
# uncertainties and should not be interpreted as precise.

setwd("R")

# Remove obvious hacking attempts and error messages (which do not
# follow the standard access log format):
system("grep -a ' - - ' nohup.out > nohup_filtered.out")

c(100, 101, 102, 103, 122,
  200, 201, 202, 203, 204, 205, 206, 207, 208, 226,
  300, 301, 302, 303, 304, 305, 306, 307, 308,
  400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412,
    413, 414, 415, 416, 417, 418, 419, 420, 421, 422, 423, 424, 425,
    426, 427, 428, 429, 430, 431, 451,
  500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511) -> http_response_codes

# Read filtered nohub.out:

read_delim("nohup_filtered.out", delim=" ", quote="\"",
           escape_backslash=FALSE, escape_double=FALSE,
           col_names=c("IP", "client", "userid", "date", "time", "request",
                       "code", "size", "latency")) |>
  mutate(
    datetime = paste(date, time),
    datetime = as.POSIXct(datetime, format="[%Y-%m-%d %H:%M:%S]"),
    code = factor(code, levels=http_response_codes)) |>
  select(-date, -time) -> d
head(d)

# Tally of HTTP response codes (anything that didn't look like a HTTP
# response code is NA):
table(d$code) |> (\(x) x[x!=0])()

# How many times was the experiment requested (counting access to
# jquery but ignoring cache hits):
d |>
  filter(code %in% "200") |>
  filter(request == "GET /shared/js/jquery-1.11.1.min.js HTTP/1.1") ->
  d.jquery
nrow(d.jquery)

# How many times was the data submitted for storage (counting access to
# /store):
d |>
  filter(code %in% "200") |>
  filter(request == "POST /store HTTP/1.1") ->
  d.store
nrow(d.store)

# IP addresses that downloaded jquery multiple times:
d.jquery[duplicated(d.jquery$IP) | duplicated(d.jquery$IP, fromLast=TRUE),] |>
  arrange(IP, datetime)
# Some downloaded it in a short interval (perhaps trying a different
# browser), some in larger intervals up to multiple days.

# How many non-cached loads of the experiment resulted in data being
# submitted?  We're assuming that each participant has a unique IP
# address and participated only once.  (We can't distinguish multiple
# clients who're using the same IP.)

d.jquery |>
  distinct(IP, .keep_all=TRUE) |>
  mutate(stored_data = IP %in% unique(d.store$IP)) |>
  group_by(stored_data) |>
  summarize(
    n = length(code))
