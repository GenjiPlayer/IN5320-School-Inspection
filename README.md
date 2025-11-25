# IN5320 School Inspection Application
**Devs from school inspectors worst nightmare**

## Project Overview

This application provides a comprehensive digital solution for school inspectors in Edutopia to conduct inspections, plan school visits, and analyze educational performance across the Jambalaya and Pepper clusters  (Dummy data).

## Core Functionality

### School Inspection Data Collection

The inspection form is designed for ease of use on mobile devices during field visits, organized into two logical tabs for efficient data capture.

The **Facilities Tab** records infrastructure availability and condition: electricity, handwashing facilities, and computer labs. Each facility present receives a five-point condition rating, providing qualitative context beyond simple presence/absence data. The **Resources Tab** captures quantitative counts of classrooms, seats, textbooks, and toilets—essential metrics for calculating the five Edutopia minimum standards.

Real-time validation ensures data quality before submission. The application automatically posts data to two DHIS2 programs: the School Inspection Program for facility data and the Resource Inspection Program for physical resources. A key technical achievement was implementing dynamic boolean conversion—DHIS2 expects true/false values for facility fields, so our payload builder automatically converts user selections ("yes"/"no") to the appropriate format during submission.

### School Visit Planner

The Visit Planner helps inspectors prioritize visits across their assigned cluster through an interactive Leaflet map combined with a filterable list view. Schools appear as color-coded markers: green for recently visited (< 30 days), yellow for due soon (30-90 days), red for overdue (> 90 days), and gray for never visited. This visual encoding enables quick identification of schools requiring immediate attention.

The application calculates days since last visit by querying each school's most recent inspection event and computing the time difference. Schools automatically sort by urgency, placing the most overdue at the top. Inspectors can search by school name, filter by time ranges, and apply status filters to refine their view.

Each school card expands to reveal detailed information from the last inspection, enabling inspectors to prepare effectively before field visits. The system intelligently handles schools that exist as separate Lower Basic and Upper Basic entities in DHIS2, merging them into unified entries for a more intuitive user experience.

### School Inspection Analytics

The analytics component transforms raw inspection data into actionable insights through two complementary dashboards.

**Individual School Analytics** displays resource availability metrics (toilets, seats, textbooks, classrooms) with color-coded status indicators: green checkmarks for meeting standards, orange warnings for below-standard resources, and red alerts for critical shortages. Expanding any metric reveals a time-series chart showing performance over 12 months, overlaid with minimum thresholds and cluster averages for context.

**Cluster Analytics** enables comparison across schools or between clusters through two view modes. In **Cluster View**, inspectors compare aggregate metrics between Jambalaya and Pepper clusters, viewing total counts and the five Edutopia minimum standards:

1. **Seat-to-Learner Ratio** ≥ 1:1
2. **Textbook-to-Learner Ratio** ≥ 1:1
3. **Learner-to-Classroom Ratio** ≤ 53:1
4. **Learner-to-Teacher Ratio** ≤ 45:1
5. **Learner-to-Toilet Ratio** ≤ 25:1

Each standard displays its current value, status assessment, and official threshold. Expandable metric cards reveal time-series trends and comparison charts. In **School Comparison** mode, inspectors select multiple schools within a cluster for side-by-side analysis, useful for identifying high-performing schools and analyzing resource distribution patterns.

### Supporting Features

The **School Registry** provides a browsable list of all schools sorted by inspection urgency, with expandable cards showing status, contact information, and quick-action buttons. The **Inspection Reports** feature offers a searchable archive of all submitted inspections, with each report displaying complete data values labeled with human-readable field names fetched dynamically from DHIS2.

Throughout the application, a persistent mobile-optimized navigation system provides quick access to major features through a sticky header and footer tab bar.

## Technical Implementation

### Architecture

The application uses React 18 with functional components and hooks for state management, chosen for its robust ecosystem and excellent mobile performance. The DHIS2 UI library provides pre-styled components following DHIS2 design guidelines. CSS Modules scope styles to individual components, preventing conflicts and improving maintainability. The mobile-first design ensures usability on small screens with responsive breakpoints for larger devices.

Highcharts handles data visualization with excellent browser compatibility and touch support. Leaflet.js provides lightweight mapping functionality without requiring API keys.

### DHIS2 Integration

All data flows through RESTful API calls to Edutopias DHIS2 instance. The application interacts with three programs:

- **School Inspection Program** for facility data
- **Resource Inspection Program** for resource counts
- **Teacher Registration Program** for learner-to-teacher ratios

When submitting inspections, the application makes two sequential POST requests to `/api/tracker`, one for each program. Each includes properly formatted event payloads with unique client-side generated UIDs.

For reading data, `/api/tracker/events.json` retrieves inspection events filtered by program and organization unit. Learner enrollment comes from `/api/analytics.json`, which aggregates data across grade levels, genders, and age groups. Organization unit hierarchy data from `/api/organisationUnits` provides school lists and GeoJSON coordinates for mapping.

### Key Technical Solutions

**Dynamic Form Construction** fetches program metadata on mount, creating a code-to-ID mapping that makes the form resilient to DHIS2 configuration changes. **Validation System** checks required fields, validates ranges, and performs consistency checks before allowing submission. **Ratio Calculations** handle division-by-zero gracefully and format values appropriately for each standard. **Time-Series Aggregation** groups events by month across all schools, producing data structures for Highcharts rendering. **Map Performance** optimizations handle 100+ schools smoothly through batch loading and in-memory filtering.

## Known Limitations

**Learner Data Period**: The analytics API uses 2020 enrollment data as specified in assignment documentation. More recent periods would provide current data, though the test instance has limited recent enrollment records.

**Partial Features**: Gender Parity Index calculations are implemented but not displayed in the UI. Offline support includes LocalStorage functions but not the full synchronization mechanism. Advanced filtering options (performance-based, contextual) have UI elements but require additional DHIS2 metadata configuration to function fully.

**Data Refresh**: The application loads data on component mount but doesn't automatically refresh. Users can reload the page to see newly submitted data.

## Technologies Used

- React 18
- DHIS2 UI Library
- Highcharts
- Leaflet.js
- CSS Modules
- DHIS2 Web API

## Future Enhancements

The application provides a solid foundation with clear pathways for enhancement: implementing Progressive Web App capabilities for offline use, adding photo documentation for facility conditions, creating printable PDF reports, implementing push notifications for overdue inspections, and adding multi-language support.
