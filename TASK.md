# Task

## Overview

Create a static web app using SvelteKit (preferred) or another JS framework with the functionality
listed below. Assume this code will be integrated into an existing application and will be
maintained and updated by others in the future.

## Requirements

- There should be a CSV file input
- The file should be processed client-side
- From the CSV file, calculate the average of “ResultValue” where “CharacteristicName" is equal to "Temperature, water” for any “MonitoringLocationID” input
- Display the result

There are two CSV files included which are examples of the kinds of CSVs we must ingest. Don't read these files (they are large!) but we will refer to
them for end-to-end tests.

    * sample/doi.org_10.25976_3vfm-jp51.csv
    * sample/doi.org_10.25976_vahx-dq27.csv
