# Instructions for Claude Code

## Context

This is a coding test for a software team lead position with a non-profit organization. The organization will review our code in the next few days as part of my application for that position.

This app will never be used in production. We do not need to worry about security or authentication, for now.

It must also be minimal, easy to review, and well-documented.

Nevertheless, the app should show professionalism and Staff Engineer level foresight.

We should be able to do code this completely in just a few hours.

The task description is located in [TASK.md](./TASK.md).

## Setup

### Technologies

- nvm
- npm
- git
- Github Actions and Workflows
- Typescript
- SvelteKit
- http-server for local testing

### Code style

- Use prettier to format code.
  - Add a git pre-commit hook which runs prettier
- Destructure imports when possible (e.g., import {foo} from 'bar')

- Avoid large dependencies

### Testing

- All of these are development dependencies; use `npm` accordingly.
- install ts-node as a development dependency to execute TypeScript locally.
- Serve the app with the `http-server` library, e.g. `npx http-server -p 8000`, for manual testing.
- Unit tests: test SvelteKit components with Jest.
- Integration tests: use Playwright against a simple Chromium browser.
  - Add a dummy test which only loads the page and checks that the page title is as we expect.
- In package.json tests, set up "scripts" to:
  - run all unit tests (in our case, the Jest scripts).
  - runs all integration tests (in our case, the Playwright scripts)
    - run all tests, as we would in CI.
- Set up a Github Action which runs the tests on every push to `main`.
  - it should install packages and development dependencies with `npm ci`.
  - it should use the npm run script for all of ci, as defined above.

## Strategy

- When we reject a CSV file, or encounter an error, we throw an except which should bubble up to Svelte and display it in a dedicated area for errors, which has a red tint when displayed.
- Expect CSV files to always have a header line which names the columns. Reject the file if it does not.
- We will use the battle-tested `csv-parse` npm library and package it up for the client-side. We will never manipulate lines of the CSV directly.
  - For our first implementation we will simply ingest the entire file from an HTML File Input, though we should leave the door open for streaming and parsing.
- Strictness of parsing
  - We reject CSV files which do not have the following columns, case-insensitively. In our app's ingested data we will normalize the column names.
    - “ResultValue”
    - “CharacteristicName"
    - "MonitoringLocationID"
    - "MonitoringLocationName"
  - For the moment we will assume that MonitoringLocationID -> MonitoringLocationName pairs are always the same.
- Processing
  - Ingestion
    - There is no requirement to keep the data around after ingesting. Process it line by line and then let it go out of scope.
    - Have an monitoringLocations: Map of string -> string, are MonitoringLocationID and values are MonitoringLocationValues
    - Have a monitoringLocationData: Map of string -> Number[]
    - Process line by line:
      - Filter for lines with CharacteristicName = "Temperature, water", case insensitively.
      - As we see new MonitoringLocationIDs, add the value of MonitoringLocationName to monitoringLocations.
      - Collect the ResultValues in the appropriate entry in monitoringLocationData
    - When all lines have been processed:
      - Calculate the average and count of each entry in monitoringLocationData, and add it to monitoringLocationResults.
      - Calculate the average of all, using the average and count of each for a weighted average. and add that value with monitoringLocation = "-ALL-" to monitoringLocationResults.
      - Collect all values with “ResultValue” where “CharacteristicName" is equal to "Temperature, water”.
- The app will display:
  - A file Input element
    - Upon entering a file into that Input element, ingestion starts immediately. This will replace any data we have previously ingested.
  - Average Water Temperature
    - As calculated from the ingested data, this shows an entry from monitoringLocationResults. Set up a Svelte dependency for that on the file that was ingested.
  - Monitoring Location drop-down
    - This is populated from the ingested and processed data, namely monitoringLocations. Set up a Svelte dependency on the file that was ingested.
  - Upon selecting a new Monitoring Location, or the special "-ALL-" location, show the appropriate value from monitoringLocationResults in the Average Water Temperature field.
- In Svelte, we never expose any temporary CSV parse data. We do not want Svelte to be updating and repainting as we process the file. For now, we expose only the states of:
  - Empty File input
  - File input has had a file entered
  - We are processing the file
  - The results of processing (see Task.MD)
  - Errors encountered with the file (catch any error and bubble it here)

- Notes for LLMs
  - We will have some large CSVs. To preserve tokens, never read all of those CSV files yourself. If you want to peruse them, read the first 20 lines and stop.
