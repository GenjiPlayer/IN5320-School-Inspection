# IN5320 School Inspection Application

## What This App Does

We built a mobile app for school inspectors in Edutopia to make their jobs easier. Instead of dealing with paper forms and clipboards, inspectors can now use their phones to record inspections, figure out which schools need visits, and see how schools are performing against national standards. Everything saves directly into Edutopia's DHIS2 system, so the data flows straight into their national education database.

## The Main Features

### Recording Inspections

The inspection form has two tabs to keep things organized. 

The **Facilities Tab** is for yes/no questions: does the school have electricity, handwashing stations, computer labs? If they have something, you rate its condition from 1-5. This gives context beyond just "yes it exists", you can note if the electricity works but the wiring is sketchy.

The **Resources Tab** is where you count stuff: how many classrooms, seats, textbooks, and toilets. These numbers are what we use to calculate the five Edutopia standards that Edutiopia uses to measure school quality.

The form validates everything before you submit, so you can't accidentally send incomplete data. When you hit submit, it posts to two different DHIS2 programs, one for facilities and one for resources. Getting this to work was a bit tricky because DHIS2 expects actual boolean values (true/false) for the yes/no fields, not strings. We handle that conversion automatically in the background.

### Planning School Visits

The visit planner shows all schools in your cluster on an interactive map. Schools are color-coded so you can immediately see which ones need attention:
- Green = visited recently (last 30 days)
- Yellow = due soon (30-90 days ago)
- Red = overdue (90+ days ago)  
- Gray = never been visited

The app calculates "days since last visit" by finding each school's most recent inspection in DHIS2 and comparing it to today's date. Schools automatically sort with the most overdue at the top, so you know where to focus.

You can search for specific schools, filter by time ranges, or just browse the list. Click on any school and it expands to show details from the last inspection super helpful for preparing before you show up. 

One thing we added that wasn't strictly necessary: some schools in DHIS2 are split into "Lower Basic" and "Upper Basic" as separate entities. We merge those together so you see one unified school instead of two confusing entries.

### Looking at the Data

We have two analytics dashboards that turn raw inspection data into something useful.

**Individual School Analytics** lets you pick one school and see how it's doing. You get metrics for toilets, seats, textbooks, and classrooms with color-coded status badges, green means good, orange means below standard, red means critical. Click "Show details" on any metric and you get a chart showing how that resource has changed over the past year, with lines showing the minimum standard and cluster average for comparison.

**Cluster Analytics** is where you can compare multiple schools or look at entire clusters. There are two modes:

In **Cluster View**, you compare Jambalaya vs Pepper(dummy data) clusters on the five Edutopia standards:
1. Seat-to-Learner Ratio (need at least 1:1)
2. Textbook-to-Learner Ratio (need at least 1:1)  
3. Learners per Classroom (max 53:1)
4. Learners per Teacher (max 45:1)
5. Learners per Toilet (max 25:1)

Each standard shows the current value, whether it meets the threshold, and you can expand it to see trends over time.

In **School Comparison** mode, you can check multiple schools within one cluster to see them side-by-side. Really useful for finding which schools are doing well or spotting patterns in resource distribution.

We also included a **School Registry** (browsable list of all schools sorted by urgency) and **Inspection Reports** (searchable history of all submitted inspections).

## How We Built It

### Tech Stack

Built with React 18 using hooks for state management. We went with React because it works great on mobile and integrates well with the DHIS2 UI library. DHIS2 UI gives us pre-made components (buttons, forms, cards) that match DHIS2's design style.

For styling, we used CSS Modules so each component's styles stay separate. Everything is mobile-first since inspectors use phones in the field, but it scales up nicely on tablets and desktops too.

Charts are done with Highcharts (handles touch interactions really well), and the map uses Leaflet.js (lightweight, no API keys needed).

### Working with DHIS2

All the data comes from Edutopia's DHIS2 instance through their REST API. We're hitting three main programs:
- School Inspection Program (for facility data)
- Resource Inspection Program (for resource counts)  
- Teacher Registration Program (to calculate learner-to-teacher ratios)

When you submit an inspection, we fire off two POST requests to `/api/tracker` one for each program. Each request has a properly formatted event with a unique ID we generate on the client side.

To read data, we use `/api/tracker/events.json` to grab inspection events, `/api/analytics.json` for learner enrollment numbers (which aggregates across grade levels and genders automatically), and `/api/organisationUnits` to get the list of schools and their map coordinates.

### What we did

**Dynamic form building** - Instead of hardcoding data element IDs, we fetch the program metadata when the form loads and build a mapping of codes to IDs. Makes the form work even if DHIS2's configuration changes.

**Smart validation** - We validate everything before submission: required fields, number ranges, logical consistency (can't have zero learners if you've entered boys and girls).

**Ratio calculations** - All five Edutopia standards get calculated from the raw data, with proper handling for division by zero and formatting to two decimal places.

**Time-series aggregation** - For cluster analytics, we group all events by month across all schools, accumulate the totals, then calculate ratios for each month. That's how we get those trend lines.

**Map performance** - Loading 100+ schools could be slow, so we fetch everything in one batch on load, then do all the searching and filtering in memory. Makes it feel instant when you interact with it.

## What's Not Finished

**Learner numbers from 2020** - The analytics API pulls enrollment data from 2020 because that's what the assignment docs specified. That data is obviously outdated now, and a lot of schools show zero learners because they weren't set up in DHIS2 back then. Using recent data would be better, but the test instance doesn't have much recent enrollment data anyway.

**Sparse time-series** - Schools typically get inspected once or twice a year, so those 12-month charts only have one or two data points. That's just reality inspections don't happen that often.

**Partial features** - We calculate Gender Parity Index but don't show it in the UI (ran out of time). Offline support has the LocalStorage code written but not the sync mechanism. Some filter options in the visit planner are placeholder UI they'd need more metadata in DHIS2 to actually work.

**No auto-refresh** - The app loads data when components mount but doesn't refresh automatically. You can just reload the page to see new data.

## Tech We Used

- React 18
- DHIS2 UI Library
- Highcharts
- Leaflet.js
- CSS Modules
- DHIS2 Web API

## What We'd Add Next

If we had more time, we'd make it a proper Progressive Web App so it works offline, add photo uploads for documenting facility conditions, generate printable PDF reports, add push notifications for overdue inspections, and support other languages.

Overall, this app shows how you can turn educational monitoring from paper forms and spreadsheets into something actually useful. School inspectors get a tool that makes their job easier, and education officials get real data to make better decisions about where to invest resources.
