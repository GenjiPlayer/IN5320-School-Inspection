import React, { useState, useEffect, useRef } from "react";
import classes from "./VisitationPlanner.module.css";
import MapView from "./MapView"; // Leaflet map component
import {
    Input,
    Button,
    Modal,
    ModalTitle,
    ModalContent,
    ModalActions,
    Checkbox,
    CircularLoader,
    NoticeBox,
    IconHome24,
    IconChevronDown24,
    IconArrowLeft24
} from "@dhis2/ui";

export default function VisitationPlanner({ setActivePage }) {
    // Filter & UI state
    const searchRef = useRef(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedSchools, setExpandedSchools] = useState([]);
    const [filterModalOpen, setFilterModalOpen] = useState(false);
    const [selectedFilters, setSelectedFilters] = useState({
        status: [],
        performance: [],
        resources: [],
        context: [],
    });
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [activeRange, setActiveRange] = useState(null); // 0–30 / 30–90 / 90+

    // API data state
    const [allSchools, setAllSchools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const RESOURCE_PROGRAM_ID = "uvpW17dnfUS";

    useEffect(() => {
        fetchClustersAndSchools();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

// Close suggestions when clicking outside search box
useEffect(() => {
    function handleClickOutside(event) {
        if (searchRef.current && !searchRef.current.contains(event.target)) {
            setShowSuggestions(false);
        }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);


    const fetchClustersAndSchools = async () => {
        try {
            // Fetch all schools at level 5 (all schools in the database)
            const schoolRes = await fetch(
                "https://research.im.dhis2.org/in5320g20/api/organisationUnits?filter=level:eq:5&fields=id,name,geometry,parent&paging=false",
                {
                    headers: {
                        Authorization: "Basic " + btoa("admin:district"),
                    },
                }
            );

            const schoolData = await schoolRes.json();
            const allSchoolsList = schoolData.organisationUnits || [];

            console.log(`Found ${allSchoolsList.length} schools total`);

            // Fetch last visit data for each school
            await fetchSchoolsWithVisitData(allSchoolsList);
        } catch (err) {
            setError(
                "Failed to fetch data: " +
                    (err instanceof Error ? err.message : String(err))
            );
            setLoading(false);
        }
    };

    const fetchSchoolsWithVisitData = async (schoolList) => {
        const results = [];

        for (const school of schoolList) {
            try {
                const res = await fetch(
                    `https://research.im.dhis2.org/in5320g20/api/tracker/events.json?program=${RESOURCE_PROGRAM_ID}&orgUnit=${school.id}&order=occurredAt:desc&pageSize=1`,
                    {
                        headers: {
                            Authorization:
                                "Basic " + btoa("admin:district"),
                        },
                    }
                );

                const data = await res.json();
                const lastEvent = data.events?.[0];
                const lastVisitDate =
                    lastEvent?.occurredAt ||
                    lastEvent?.eventDate ||
                    null;

                // Calculate days since last visit
                let lastVisitDays = null;
                if (lastVisitDate) {
                    const diffMs =
                        Date.now() -
                        new Date(lastVisitDate).getTime();
                    lastVisitDays = Math.floor(
                        diffMs / (1000 * 60 * 60 * 24)
                    );
                }

                // Determine marker color based on visit status
                let markerColor = "red"; // default: overdue
                if (lastVisitDays === null) {
                    markerColor = "gray"; // never visited
                } else if (lastVisitDays <= 30) {
                    markerColor = "green"; // recently visited
                } else if (lastVisitDays <= 90) {
                    markerColor = "yellow"; // due soon
                }

                // Extract coordinates from geometry
                let lat = 13.4432; // default Gambia coordinates
                let lng = -15.3101;
                if (school.geometry?.coordinates) {
                    const [lngCoord, latCoord] =
                        school.geometry.coordinates; // GeoJSON format: [lng, lat]
                    lat = latCoord;
                    lng = lngCoord;
                }

                results.push({
                    id: school.id,
                    name: school.name,
                    lastVisitDate,
                    lastVisitDays: lastVisitDays ?? 999, // Use high number if never visited
                    lat,
                    lng,
                    markerColor,
                    learners:
                        Math.floor(Math.random() * 500) + 200, // Placeholder - replace with actual data
                    parentId: school.parent?.id || null,
                    parentName:
                        school.parent?.name || "Unknown Cluster",
                });
            } catch (err) {
                console.error(
                    "Error fetching events for",
                    school.name,
                    err
                );
            }
        }

        // Merge schools with the same base name (e.g., "Bakadagi Lower Basic" and "Bakadagi Upper Basic")
        const mergedSchools = [];
        const schoolGroups = new Map();

        results.forEach((school) => {
            // Extract base school name (remove "Lower Basic", "Upper Basic", etc.)
            const baseName = school.name
                .replace(/\s+(Lower|Upper)\s+Basic.*$/i, "")
                .replace(/\s+Basic.*$/i, "")
                .trim();

            if (!schoolGroups.has(baseName)) {
                schoolGroups.set(baseName, {
                    ...school,
                    name: baseName,
                    originalNames: [school.name],
                    ids: [school.id],
                });
            } else {
                const existing = schoolGroups.get(baseName);
                existing.originalNames.push(school.name);
                existing.ids.push(school.id);

                // Keep the most recent visit date
                if (school.lastVisitDays < existing.lastVisitDays) {
                    existing.lastVisitDate = school.lastVisitDate;
                    existing.lastVisitDays = school.lastVisitDays;
                    existing.markerColor = school.markerColor;
                    existing.lat = school.lat;
                    existing.lng = school.lng;
                }

                // Sum learners
                existing.learners += school.learners;
            }
        });

        schoolGroups.forEach((school) => mergedSchools.push(school));

        setAllSchools(mergedSchools);
        setLoading(false);
    };

    const filterOptions = {
        status: [
            { id: "visitedThisMonth", label: "Visited this month" },
            { id: "visited3Months", label: "Visited last 3 months" },
            { id: "6monthsSince", label: "6+ months since visit" },
            { id: "1yearSince", label: "1+ year since visit" },
            { id: "urgentFollowUp", label: "Urgent follow-up" },
            { id: "neverVisited", label: "Never visited" },
        ],
        performance: [
            { id: "teacherShortage", label: "Teacher shortage" },
            { id: "classroomShortage", label: "Classroom shortage" },
            { id: "seatingShortage", label: "Seating shortage" },
            { id: "toiletShortage", label: "Toilet shortage" },
            { id: "textbookShortage", label: "Textbook shortage" },
        ],
        resources: [
            { id: "resourceDrop", label: "Resource drop" },
            { id: "resourceSurplus", label: "Resource surplus" },
        ],
        context: [
            { id: "newSchool", label: "New school" },
            { id: "newAdministration", label: "New administration" },
            { id: "hardToReach", label: "Hard to reach area" },
        ],
    };

    const ranges = [
        { id: "0-30", label: "0–30" },
        { id: "30-90", label: "30–90" },
        { id: "90+", label: "90+" },
    ];

    const handleFilterToggle = (category, filterId) => {
        setSelectedFilters((prev) => {
            const categoryFilters = prev[category];
            const isSelected = categoryFilters.includes(filterId);

            return {
                ...prev,
                [category]: isSelected
                    ? categoryFilters.filter((id) => id !== filterId)
                    : [...categoryFilters, filterId],
            };
        });
    };

    const clearAllFilters = () => {
        setSelectedFilters({
            status: [],
            performance: [],
            resources: [],
            context: [],
        });
    };

    // Get search suggestions based on search query
const searchSuggestions = showSuggestions
    ? allSchools
          .filter((school) =>
              searchQuery.trim().length === 0
                  ? true // show all when search is empty
                  : school.name
                        .toLowerCase()
                        .startsWith(searchQuery.toLowerCase())
          )
    : [];


    const handleSelectSchool = (school) => {
        setSelectedSchool(school);
        setSearchQuery(school.name);
        setShowSuggestions(false);
    };

    // Sort schools by last visit days (most overdue first)
    const sortedSchools = [...allSchools].sort(
        (a, b) => b.lastVisitDays - a.lastVisitDays
    );

    // Filtering logic: Days range + modal filters
    const filteredSchools = sortedSchools.filter((school) => {
        // 1) Range filter (0–30 / 30–90 / 90+)
        let matchesRange = true;
        if (activeRange === "0-30") {
            matchesRange = school.lastVisitDays <= 30;
        } else if (activeRange === "30-90") {
            matchesRange =
                school.lastVisitDays > 30 &&
                school.lastVisitDays <= 90;
        } else if (activeRange === "90+") {
            matchesRange = school.lastVisitDays > 90;
        }
        if (!matchesRange) return false;

        // 2) Modal filters
        const hasAnyModalFilter =
            selectedFilters.status.length > 0 ||
            selectedFilters.performance.length > 0 ||
            selectedFilters.resources.length > 0 ||
            selectedFilters.context.length > 0;

        if (!hasAnyModalFilter) return true;

        // Status filters
        let matchesStatus = true;
        if (selectedFilters.status.length > 0) {
            matchesStatus = false;
            for (const filterId of selectedFilters.status) {
                if (
                    filterId === "visitedThisMonth" &&
                    school.lastVisitDays <= 30
                ) {
                    matchesStatus = true;
                    break;
                }
                if (
                    filterId === "visited3Months" &&
                    school.lastVisitDays <= 90
                ) {
                    matchesStatus = true;
                    break;
                }
                if (
                    filterId === "6monthsSince" &&
                    school.lastVisitDays >= 180
                ) {
                    matchesStatus = true;
                    break;
                }
                if (
                    filterId === "1yearSince" &&
                    school.lastVisitDays >= 365
                ) {
                    matchesStatus = true;
                    break;
                }
                if (
                    filterId === "neverVisited" &&
                    school.lastVisitDays === 999
                ) {
                    matchesStatus = true;
                    break;
                }
            }
        }

        // For nå: performance/resources/context pass-through
        const matchesPerformance =
            selectedFilters.performance.length === 0;
        const matchesResources =
            selectedFilters.resources.length === 0;
        const matchesContext =
            selectedFilters.context.length === 0;

        return (
            matchesRange &&
            matchesStatus &&
            matchesPerformance &&
            matchesResources &&
            matchesContext
        );
    });

    if (loading) {
        return (
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100vh",
                }}
            >
                <CircularLoader />
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: "20px" }}>
                <NoticeBox error title="Error loading schools">
                    {error}
                </NoticeBox>
            </div>
        );
    }

    return (
        <div className={classes.plannerContainer}>
            <div className={classes.pageHeader}>
            <div className={classes.pageHeader}>
                <Button
                    small
                    icon={<IconArrowLeft24 />}
                    onClick={() => setActivePage("dashboard")}
                />
                <h2>Visitation Planner</h2>
            </div>
</div>

            {/* Search Bar and Filter Button */}
            <div className={classes.headerContainer}>
                <div className={classes.searchContainer} ref={searchRef}>

                    <Input
                        className={classes.searchInput}
                        type="text"
                        placeholder="Search schools..."
                        value={searchQuery}
                        onChange={({ value }) => {
                            setSearchQuery(value);
                            setShowSuggestions(true);
                            if (!value.trim()) {
                                setSelectedSchool(null);
                            }
                        }}
                        onFocus={() => {
    setShowSuggestions(true);
}}
                    />
                    {/* Search Suggestions Dropdown */}
                    {showSuggestions &&
                        searchSuggestions.length > 0 && (
                            <div
                                className={
                                    classes.suggestionsDropdown
                                }
                            >
                                {searchSuggestions.map((school) => (
                                    <div
                                        key={school.id}
                                        className={
                                            classes.suggestionItem
                                        }
                                        onClick={() =>
                                            handleSelectSchool(
                                                school
                                            )
                                        }
                                    >
                                      <span className={classes.suggestionIcon}>
    <IconHome24 />
</span>
                                        <span
                                            className={
                                                classes.suggestionName
                                            }
                                        >
                                            {school.name}
                                        </span>
                                        <span
                                            className={
                                                classes.suggestionMeta
                                            }
                                        >
                                            {school.lastVisitDays ===
                                            999
                                                ? "Never visited"
                                                : `${school.lastVisitDays} days ago`}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                </div>
                <Button onClick={() => setFilterModalOpen(true)}>
                    Filter
                </Button>
            </div>

            {/* Filter Modal */}
            {filterModalOpen && (
                <Modal
                    onClose={() => setFilterModalOpen(false)}
                    large
                >
                    <ModalTitle>Filters</ModalTitle>
                    <ModalContent>
                        {/* Status Section */}
                        <div className={classes.filterSection}>
                            <h3>Status</h3>
                            {filterOptions.status.map((option) => (
                                <Checkbox
                                    key={option.id}
                                    label={option.label}
                                    checked={selectedFilters.status.includes(
                                        option.id
                                    )}
                                    onChange={() =>
                                        handleFilterToggle(
                                            "status",
                                            option.id
                                        )
                                    }
                                />
                            ))}
                        </div>

                        {/* Performance & standards Section */}
                        <div className={classes.filterSection}>
                            <h3>Performance & standards</h3>
                            {filterOptions.performance.map(
                                (option) => (
                                    <Checkbox
                                        key={option.id}
                                        label={option.label}
                                        checked={selectedFilters.performance.includes(
                                            option.id
                                        )}
                                        onChange={() =>
                                            handleFilterToggle(
                                                "performance",
                                                option.id
                                            )
                                        }
                                    />
                                )
                            )}
                        </div>

                        {/* Resource changes Section */}
                        <div className={classes.filterSection}>
                            <h3>Resource changes</h3>
                            {filterOptions.resources.map(
                                (option) => (
                                    <Checkbox
                                        key={option.id}
                                        label={option.label}
                                        checked={selectedFilters.resources.includes(
                                            option.id
                                        )}
                                        onChange={() =>
                                            handleFilterToggle(
                                                "resources",
                                                option.id
                                            )
                                        }
                                    />
                                )
                            )}
                        </div>

                        {/* School context Section */}
                        <div className={classes.filterSection}>
                            <h3>School context</h3>
                            {filterOptions.context.map((option) => (
                                <Checkbox
                                    key={option.id}
                                    label={option.label}
                                    checked={selectedFilters.context.includes(
                                        option.id
                                    )}
                                    onChange={() =>
                                        handleFilterToggle(
                                            "context",
                                            option.id
                                        )
                                    }
                                />
                            ))}
                        </div>
                    </ModalContent>
                    <ModalActions>
                        <Button onClick={clearAllFilters}>
                            Clear all
                        </Button>
                        <Button
                            primary
                            onClick={() => setFilterModalOpen(false)}
                        >
                            Apply
                        </Button>
                    </ModalActions>
                </Modal>
            )}

            {/* MAP */}
            <div className={classes.mapWrapper}>
                <MapView
                    schools={filteredSchools}
                    selectedSchool={selectedSchool}
                />
            </div>

            {/* Range filter (0–30 / 30–90 / 90+) */}
            <div className={classes.filterBlock}>
                <div className={classes.filterLabel}>
                    Days since last visit
                </div>
                <div className={classes.rangeBadges}>
                    {ranges.map((r) => (
                        <div
                            key={r.id}
                            className={
                                activeRange === r.id
                                    ? classes.rangeBadgeActive
                                    : classes.rangeBadge
                            }
                            onClick={() =>
                                setActiveRange(
                                    activeRange === r.id
                                        ? null
                                        : r.id
                                )
                            }
                        >
                            {r.label}
                        </div>
                    ))}
                </div>
            </div>

            {/* Filter Badge Pills - only show selected filters */}
            {(selectedFilters.status.length > 0 ||
                selectedFilters.performance.length > 0 ||
                selectedFilters.resources.length > 0 ||
                selectedFilters.context.length > 0) && (
                <div className={classes.filterBadges}>
                    {selectedFilters.status.map((filterId) => {
                        const filter =
                            filterOptions.status.find(
                                (f) => f.id === filterId
                            );
                        return (
                            <div
                                key={filterId}
                                className={classes.badge}
                            >
                                {filter?.label}
                            </div>
                        );
                    })}
                    {selectedFilters.performance.map((filterId) => {
                        const filter =
                            filterOptions.performance.find(
                                (f) => f.id === filterId
                            );
                        return (
                            <div
                                key={filterId}
                                className={classes.badge}
                            >
                                {filter?.label}
                            </div>
                        );
                    })}
                    {selectedFilters.resources.map((filterId) => {
                        const filter =
                            filterOptions.resources.find(
                                (f) => f.id === filterId
                            );
                        return (
                            <div
                                key={filterId}
                                className={classes.badge}
                            >
                                {filter?.label}
                            </div>
                        );
                    })}
                    {selectedFilters.context.map((filterId) => {
                        const filter =
                            filterOptions.context.find(
                                (f) => f.id === filterId
                            );
                        return (
                            <div
                                key={filterId}
                                className={classes.badge}
                            >
                                {filter?.label}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* School List */}
 {/* School List */}
<div className={classes.schoolListContainer}>
    {filteredSchools.map((s) => {
        const isExpanded = expandedSchools.includes(s.id);

        return (
            <div
                key={s.id}
                className={`${classes.listRow} ${isExpanded ? classes.listRowExpanded : ""}`}
                onClick={() => {
                    // Expand/collapse row
                    setExpandedSchools((prev) =>
                        prev.includes(s.id)
                            ? prev.filter((id) => id !== s.id)
                            : [...prev, s.id]
                    );
                    setSelectedSchool(s); // Select for map highlight
                }}
            >
                {/* HEADER ROW */}
                <div className={classes.listRowHeader}>
                    <div>
                        <div className={classes.listRowName}>{s.name}</div>
                        <div className={classes.listRowSub}>
                            {s.parentName} —{" "}
                            {s.lastVisitDays === 999
                                ? "Never visited"
                                : `${s.lastVisitDays} days ago`}
                        </div>
                    </div>

                    <IconChevronDown24
                        className={`${classes.listRowChevron} ${
                            isExpanded ? "rotate" : ""
                        }`}
                    />
                </div>

                {/* EXPANDED DETAILS */}
                {isExpanded && (
                    <div className={classes.listDetails}>
                        <div className={classes.listDetailLine}>
                            <strong>Learners:</strong> {s.learners}
                        </div>

                        <Button
                            small
                            primary
                            className={classes.actionButtonDHIS2}
                        >
                            Schedule inspection
                        </Button>
                    </div>
                )}
            </div>
        );
    })}

    {filteredSchools.length === 0 && (
        <div style={{ padding: 12, color: "#777" }}>
            No schools match these filters.
        </div>
    )}
</div>

        </div>
    );
}
