import React, { useState, useEffect, useRef } from "react";
import classes from "./VisitationPlanner.module.css";
import MapView from "./MapView";
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
    IconChevronDown24,
    IconCalendar24,
    IconFileDocument24,
    IconApps24,
    IconAdd24,
    IconFilter24,
    IconCross16,
    Divider
} from "@dhis2/ui";
import { PROGRAM_CONFIG } from "./inspectionUtils";

export default function VisitationPlanner() {
    const searchRef = useRef(null);
    const mapViewRef = useRef(null);
    const plannerContainerRef = useRef(null);
    const schoolListRef = useRef(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [expandedSchools, setExpandedSchools] = useState([]);
    const [filterModalOpen, setFilterModalOpen] = useState(false);
    const [selectedFilters, setSelectedFilters] = useState({
        status: [],
        performance: [],
        resources: [],
        context: []
    });
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [activeRange, setActiveRange] = useState(null);

    const [allSchools, setAllSchools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const RESOURCE_PROGRAM_ID = "uvpW17dnfUS";

    useEffect(() => {
        fetchClustersAndSchools();
    }, []);

    useEffect(() => {
        function handleClickOutside(event) {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Block all scroll events except inside the school list and map
    useEffect(() => {
        const preventScroll = (e) => {
            // Allow scrolling inside the school list
            if (schoolListRef.current && schoolListRef.current.contains(e.target)) {
                return;
            }

            // Allow scrolling inside the suggestions dropdown
            if (searchRef.current && searchRef.current.contains(e.target)) {
                return;
            }

            // Allow map interactions (dragging, zooming)
            if (mapViewRef.current && mapViewRef.current.contains(e.target)) {
                return;
            }

            // Block all other scroll attempts
            e.preventDefault();
            e.stopPropagation();
        };

        const container = plannerContainerRef.current;
        if (container) {
            // Prevent wheel events (mouse scroll and touchpad)
            container.addEventListener("wheel", preventScroll, { passive: false });

            // Prevent touch scroll on mobile
            container.addEventListener("touchmove", preventScroll, { passive: false });
        }

        // Also apply to document body as a fallback
        document.body.addEventListener("wheel", preventScroll, { passive: false });
        document.body.addEventListener("touchmove", preventScroll, { passive: false });

        return () => {
            if (container) {
                container.removeEventListener("wheel", preventScroll);
                container.removeEventListener("touchmove", preventScroll);
            }
            document.body.removeEventListener("wheel", preventScroll);
            document.body.removeEventListener("touchmove", preventScroll);
        };
    }, []);

    const extractBaseName = (name) => {
        let cleaned = name;
        cleaned = cleaned.replace(/\s+-\s+level\s*\d*/gi, "");
        cleaned = cleaned.replace(/\s+-\s+grade\s*\d*/gi, "");
        cleaned = cleaned.replace(/\s+[A-Z]+\d+$/gi, "");
        return cleaned.trim() || name;
    };

    const fetchClustersAndSchools = async () => {
        try {
            const schoolRes = await fetch(
                `${PROGRAM_CONFIG.apiBase}/organisationUnits?filter=level:eq:5&fields=id,name,geometry,parent&paging=false`,
                { headers: { Authorization: `Basic ${PROGRAM_CONFIG.credentials}` } }
            );
            const schoolData = await schoolRes.json();
            await fetchSchoolsWithVisitData(schoolData.organisationUnits || []);
        } catch (err) {
            setError("Failed to fetch data: " + err.message);
            setLoading(false);
        }
    };

    const fetchSchoolsWithVisitData = async (schoolList) => {
        const results = [];
        for (const school of schoolList) {
            try {
                const res = await fetch(
                    `${PROGRAM_CONFIG.apiBase}/tracker/events.json?program=${RESOURCE_PROGRAM_ID}&orgUnit=${school.id}&order=occurredAt:desc&pageSize=1`,
                    { headers: { Authorization: `Basic ${PROGRAM_CONFIG.credentials}` } }
                );
                const data = await res.json();
                const lastEvent = data.events?.[0];

                const lastVisitDate = lastEvent?.occurredAt || lastEvent?.eventDate || null;
                let lastVisitDays = lastVisitDate
                    ? Math.floor((Date.now() - new Date(lastVisitDate).getTime()) / (86400000))
                    : 999;

                let markerColor = "red";
                if (lastVisitDays === 999) markerColor = "gray";
                else if (lastVisitDays <= 30) markerColor = "green";
                else if (lastVisitDays <= 90) markerColor = "yellow";

                let lat = 13.4432;
                let lng = -15.3101;
                if (school.geometry?.coordinates) {
                    const [lngCoord, latCoord] = school.geometry.coordinates;
                    lat = latCoord;
                    lng = lngCoord;
                }

                results.push({
                    id: school.id,
                    name: school.name,
                    lastVisitDate,
                    lastVisitDays,
                    lat,
                    lng,
                    markerColor,
                    learners: Math.floor(Math.random() * 500) + 200,
                    parentName: school.parent?.name || "Unknown Cluster"
                });
            } catch {}
        }

        // Merge by base name
        const merged = new Map();
        results.forEach(school => {
            const base = extractBaseName(school.name);
            if (!merged.has(base)) {
                merged.set(base, { ...school, name: base });
            } else {
                const ex = merged.get(base);
                if (school.lastVisitDays < ex.lastVisitDays) {
                    ex.lastVisitDate = school.lastVisitDate;
                    ex.lastVisitDays = school.lastVisitDays;
                    ex.markerColor = school.markerColor;
                    ex.lat = school.lat;
                    ex.lng = school.lng;
                }
                ex.learners += school.learners;
            }
        });

        setAllSchools([...merged.values()]);
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
        setActiveRange(null);
        setSelectedSchool(null);

        // Zoom out to show all schools
        setTimeout(() => {
            if (mapViewRef.current) {
                mapViewRef.current.recenter();
            }
        }, 100);
    };

    const sortedSchools = [...allSchools].sort((a, b) => b.lastVisitDays - a.lastVisitDays);

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

        // For now: performance/resources/context pass-through
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

    // Auto-zoom to filtered schools when filters change
    useEffect(() => {
        if (!mapViewRef.current || loading) return;

        // If a specific school is selected, don't auto-zoom
        if (selectedSchool) return;

        // If no filters are active, recenter to default view
        const hasActiveFilters =
            activeRange !== null ||
            selectedFilters.status.length > 0 ||
            selectedFilters.performance.length > 0 ||
            selectedFilters.resources.length > 0 ||
            selectedFilters.context.length > 0;

        if (!hasActiveFilters && allSchools.length > 0) {
            // No filters - zoom out to show all schools
            setTimeout(() => {
                if (mapViewRef.current) {
                    mapViewRef.current.recenter();
                }
            }, 100);
        } else if (filteredSchools.length > 0) {
            // Filters are active - fit to filtered schools
            setTimeout(() => {
                if (mapViewRef.current) {
                    mapViewRef.current.fitToFilteredSchools(filteredSchools);
                }
            }, 100);
        }
    }, [activeRange, selectedFilters, selectedSchool, filteredSchools.length, loading, allSchools.length]);

    if (loading) {
        return <div className={classes.loadingContainer}><CircularLoader /></div>;
    }
    if (error) {
        return <div className={classes.errorContainer}><NoticeBox error>{error}</NoticeBox></div>;
    }

    return (
        <div className={classes.plannerContainer} ref={plannerContainerRef}>
            {/* MAP */}
            <div className={classes.mapSection}>
                <MapView
                    ref={mapViewRef}
                    schools={filteredSchools}
                    selectedSchool={selectedSchool}
                    onMarkerClick={(s) => setSelectedSchool(s)}
                />

                {/* SEARCH */}
                <div className={classes.searchBarFloating}>
                    <div className={classes.searchWrapper} ref={searchRef}>
                        <Input
                            type="text"
                            placeholder="Search schools..."
                            value={searchQuery}
                            onChange={({ value }) => {
                                setSearchQuery(value);
                                setShowSuggestions(true);
                            }}
                            onFocus={() => setShowSuggestions(true)}
                        />

                        {showSuggestions && (
                            <div className={classes.suggestionsDropdown}>
                                {filteredSchools.slice(0, 10).map((s) => (
                                    <div
                                        key={s.id}
                                        className={classes.suggestionItem}
                                        onClick={() => {
                                            setSelectedSchool(s);
                                            setExpandedSchools([s.id]);
                                            setSearchQuery(s.name);
                                            setShowSuggestions(false);
                                        }}
                                    >
                                        <span>{s.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <Button icon={<IconFilter24 />} onClick={() => setFilterModalOpen(true)} />
                </div>
            </div>

            {/* FILTER MODAL */}
            {filterModalOpen && (
                <Modal onClose={() => setFilterModalOpen(false)} large>
                    <ModalTitle>Filters</ModalTitle>
                    <ModalContent>
                        {/* Status Section */}
                        <div style={{ marginBottom: '24px' }}>
                            <h3 style={{ marginBottom: '12px' }}>Status</h3>
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
                        <div style={{ marginBottom: '24px' }}>
                            <h3 style={{ marginBottom: '12px' }}>Performance & standards</h3>
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
                        <div style={{ marginBottom: '24px' }}>
                            <h3 style={{ marginBottom: '12px' }}>Resource changes</h3>
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
                        <div style={{ marginBottom: '24px' }}>
                            <h3 style={{ marginBottom: '12px' }}>School context</h3>
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
                            onClick={() => {
                                setFilterModalOpen(false);
                                setSelectedSchool(null); // Clear selected school to trigger auto-zoom
                            }}
                        >
                            Apply
                        </Button>
                    </ModalActions>
                </Modal>
            )}

            {/* BOTTOM SHEET */}
            <div className={classes.bottomSheetPanel}>
                {/* Range filter (0–30 / 30–90 / 90+) */}
                <div style={{ padding: '16px 16px 0 16px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#4a5568' }}>
                        Days since last visit
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        {ranges.map((r) => (
                            <div
                                key={r.id}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '16px',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    border: '1px solid #e2e8f0',
                                    backgroundColor: activeRange === r.id ? '#3b82f6' : '#ffffff',
                                    color: activeRange === r.id ? '#ffffff' : '#4a5568',
                                    fontWeight: activeRange === r.id ? '500' : '400',
                                    transition: 'all 0.2s'
                                }}
                                onClick={() => {
                                    const newRange = activeRange === r.id ? null : r.id;
                                    setActiveRange(newRange);
                                    setSelectedSchool(null); // Clear selected school to trigger auto-zoom
                                }}
                            >
                                {r.label}
                            </div>
                        ))}
                    </div>

                    {/* Filter Badge Pills - only show selected filters */}
                    {(selectedFilters.status.length > 0 ||
                        selectedFilters.performance.length > 0 ||
                        selectedFilters.resources.length > 0 ||
                        selectedFilters.context.length > 0) && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                            {selectedFilters.status.map((filterId) => {
                                const filter =
                                    filterOptions.status.find(
                                        (f) => f.id === filterId
                                    );
                                return (
                                    <div
                                        key={filterId}
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                            backgroundColor: '#e0f2fe',
                                            color: '#0369a1',
                                            fontWeight: '500'
                                        }}
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
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                            backgroundColor: '#fef3c7',
                                            color: '#92400e',
                                            fontWeight: '500'
                                        }}
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
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                            backgroundColor: '#dbeafe',
                                            color: '#1e40af',
                                            fontWeight: '500'
                                        }}
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
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                            backgroundColor: '#f3e8ff',
                                            color: '#6b21a8',
                                            fontWeight: '500'
                                        }}
                                    >
                                        {filter?.label}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* SCROLLABLE LIST */}
                <div className={classes.schoolListScrollable} ref={schoolListRef}>
                    {filteredSchools.map((s) => {
                        const isExpanded = expandedSchools.includes(s.id);
                        const urgent = s.lastVisitDays > 180;

                        return (
                            <div key={s.id} className={classes.schoolCard}>
                                <div
                                    className={classes.schoolCardHeader}
                                    onClick={() => {
                                        setExpandedSchools(prev =>
                                            prev.includes(s.id)
                                                ? prev.filter(id => id !== s.id)
                                                : [...prev, s.id]
                                        );
                                        setSelectedSchool(s);
                                        if (mapViewRef.current) mapViewRef.current.flyToSchool(s);
                                    }}
                                >
                                    <div>
                                        <div className={classes.schoolName}>
                                            {s.name}
                                            {urgent && <span className={classes.urgentBadge}>URGENT</span>}
                                        </div>
                                        <div className={classes.schoolMeta}>
                                            {s.parentName} • {s.lastVisitDays === 999 ? "Never" : s.lastVisitDays + " days"}
                                        </div>
                                    </div>

                                    <IconChevronDown24
                                        className={`${classes.chevronIcon} ${isExpanded ? classes.chevronRotate : ""}`}
                                    />
                                </div>

                                {isExpanded && (
                                    <>
                                        <Divider />
                                        <div className={classes.schoolDetails}>
                                            <div className={classes.detailsGrid}>
                                                <div>
                                                    <span className={classes.detailLabel}>Total learners</span>
                                                    <span className={classes.detailValue}>{s.learners}</span>
                                                </div>
                                                <div>
                                                    <span className={classes.detailLabel}>Last visit</span>
                                                    <span className={classes.detailValue}>
                                                        {s.lastVisitDays === 999 ? "Never" : s.lastVisitDate}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className={classes.actionButtons}>
                                                <Button small icon={<IconCalendar24 />}>Schedule</Button>
                                                <Button small icon={<IconFileDocument24 />}>History</Button>
                                            </div>
                                            <div className={classes.actionButtons}>
                                                <Button small icon={<IconApps24 />}>Resources</Button>
                                                <Button small icon={<IconAdd24 />}>Add to route</Button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}

                    {filteredSchools.length === 0 && (
                        <div className={classes.emptyState}>No schools match these filters.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
