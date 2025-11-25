# IN5320-School-Inspection

Devs from school inspectors worst nightmare


## Functionality

### 1. School Inspection Data Collection
- **Two-part inspection form** with validation:
  - **Facilities Tab**: Records availability and condition of electricity, handwashing facilities, and computer labs (yes/no with condition ratings)
  - **Resources Tab**: Captures counts of classrooms, seats, textbooks, and toilets
- **Real-time validation**: Ensures all mandatory fields are completed before submission
- **Dual program submission**: Automatically submits data to two separate DHIS2 programs:
  - School Inspection Program for facilities
  - Resource Inspection Program for physical resources
- **User feedback**: Clear success/error messages and loading states during submission

### 2. School Visit Planner
- **Interactive map visualization** using Leaflet showing all schools in the Jambalaya Cluster
- **Color-coded markers** indicating visit status:
  - Green: Recently visited (< 30 days)
  - Yellow: Due soon (30-90 days)
  - Red: Overdue (> 90 days)
  - Gray: Never visited
- **Smart filtering system**:
  - Search by school name with autocomplete suggestions
  - Filter by days since last visit (0-30, 30-90, 90+ days)
  - Status filters (overdue, up-to-date)
- **School details panel**: Expandable cards showing:
  - Last visitation date
  - Days since last visit
  - Inspection status (overdue/up-to-date)
  - Total learners enrolled
  - Quick action button to schedule inspection
- **Sorted list view**: Schools automatically sorted by urgency (most overdue first)

### 3. School Inspection Analytics Dashboard

#### Individual School Analytics
- **Resource availability tracking** for selected schools:
  - Toilet capacity
  - Seating availability
  - Textbook availability
  - Classroom capacity
- **Status indicators** with color-coded badges:
  - Green (✓): Meets standard
  - Orange (!): Below standard
  - Red (⚠): Critical shortage
- **Time-series charts**: Track resource availability over time with Highcharts
- **Comparison with cluster average**: See how each school compares to cluster-wide statistics
- **Actionable recommendations**: Specific guidance based on current metrics

#### Cluster Analytics Dashboard
- **Dual view modes**:
  - **Cluster View**: Compare Jambalaya vs Pepper clusters
  - **School Comparison**: Select multiple schools within a cluster for detailed comparison
- **Five Edutopia Minimum Standards** with visual indicators:
  1. **Seat-to-Learner Ratio** (Standard: 1:1 minimum)
  2. **Textbook-to-Learner Ratio** (Standard: 1:1 minimum)
  3. **Learner-to-Classroom Ratio** (Standard: <53:1 maximum)
  4. **Learner-to-Teacher Ratio** (Standard: <45:1 maximum)
  5. **Learner-to-Toilet Ratio** (Standard: <25:1 maximum)
- **Interactive visualizations**:
  - Time-series line charts showing trends over 12 months
  - Comparison bar charts for multiple clusters/schools
  - Standard reference lines showing compliance thresholds
- **Cluster summary statistics**: Total schools, learners, and teachers
- **Expandable metric cards**: Click "See details" to view charts and recommendations

### 4. Additional Features
- **School Registry**: Browse all schools in the Jambalaya Cluster with inspection status
- **Inspection Reports**: View all submitted inspections with searchable history
- **Mobile-first design**: Optimized for field use on smartphones and tablets
- **Persistent navigation**: Sticky header and footer for easy access to all features

## Implementation

### Architecture
- **Frontend Framework**: React with DHIS2 UI components
- **State Management**: React hooks (useState, useEffect)
- **Styling**: CSS Modules for component-scoped styling
- **API Integration**: RESTful calls to DHIS2 Web API
- **Data Visualization**: Highcharts for analytics dashboards
- **Mapping**: Leaflet.js for interactive school location maps

### DHIS2 Integration
- **Authentication**: Basic authentication with admin credentials
- **Programs Used**:
  - School Inspection Program 
  - Resource Inspection Program
- **Data Sources**:
  - `/api/tracker/events.json` - Event data for inspections and resources
  - `/api/analytics.json` - Aggregate learner enrollment data
  - `/api/organisationUnits` - School hierarchy and metadata
- **Data Submission**: POST to `/api/tracker` endpoint with proper event structure

### Key Technical Components

#### Data Collection
- Dynamic form field mapping from DHIS2 program metadata
- Boolean value conversion for facility availability (yes/no → true/false)
- Validation using `inspectionUtils.js` helper functions

#### School Visit Planner
- Real-time calculation of days since last visit
- GeoJSON coordinate parsing for map markers
- School name normalization (merging Upper/Lower Basic schools)

#### Analytics
- Multi-source data aggregation (learners, teachers, resources)
- Ratio calculations with proper null handling
- Time-series data grouping by month
- Statistical comparison (mean, standard deviation) across clusters
- Color-coded status determination based on Edutopia standards

### File Structure
```
src/
├── App.jsx                          # Main app with navigation
├── Inspection.jsx                   # Data collection form
├── inspectionUtils.js               # Validation & payload building
├── VisitationPlanner.jsx            # School visit planning with map
├── MapView.jsx                      # Leaflet map component
├── Analytics.jsx                    # Individual school analytics
├── ClusterAnalytics.jsx             # Multi-school/cluster comparison
├── InspectionReports.jsx            # Historical inspection data
├── SchoolRegistry.jsx               # School list and details
├── [Component].module.css           # Component-specific styles
```

## Missing Functionality & Known Issues

### Missing Features
1. **Gender Parity Index**: Not fully implemented in cluster analytics (standard defined but not displayed in UI)
2. **Offline support**: Local storage functions exist
4. **School context filters**: Accessibility challenges and administrative changes filters are UI-only placeholders
5. **Follow-up marking**: Checkbox in Analytics summary doesn't persist to DHIS2
6. **Learner enrollment by grade/gender**: Analytics endpoint used but demographic breakdown not displayed

### Known Issues
2. **Time-series charts**: Some schools show no data points due to missing historical events
3. **Map performance**: Initial load can be slow when fetching data for 100+ schools
4. **Data freshness**: No automatic refresh - users must reload page to see newly submitted inspections
5. **Error handling**: Some API failures fail silently (logged to console but not shown to user)
6. **Learner count discrepancy**: Analytics API returns 2020 data; current year data may not be available for all schools

### Things That Don't Work As Intended
1. **School comparison time-series**: When comparing multiple schools, individual time-series aren't shown (only aggregated)
2. **Map popup details**: Clicking markers shows basic info but doesn't fetch latest inspection data

## Future Improvements
- Implement Progressive Web App (PWA) for offline capability
- Create printable PDF reports from analytics
- Add photo upload for facility condition documentation
- Implement push notifications for overdue inspections
- Multi-language support (English, Wolof, Mandinka)

## Technologies Used
- React 18
- DHIS2 UI Library
- Highcharts
- Leaflet.js
- CSS Modules
- DHIS2 Web API

## Credits
Developed as part of the IN5320 course assignment at the University of Oslo, using The Gambia's DHIS2 instance for real-world educational data management.
