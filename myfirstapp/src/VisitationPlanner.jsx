import React, { useState, useEffect, useRef } from "react";
import {
    Card,
    Button,
    InputField,
    CircularLoader,
    NoticeBox,
    IconArrowLeft24,
    IconHome24,
    IconChevronDown24,
    IconCalendar24,
} from "@dhis2/ui";

import classes from "./VisitationPlanner.module.css";
import MapView from "./MapView.jsx";

const API_BASE = "https://research.im.dhis2.org/in5320g20/api";
const CREDENTIALS = "Basic " + btoa("admin:district");
const RESOURCE_PROGRAM_ID = "uvpW17dnfUS";
const JAMBALAYA_CLUSTER_ID = "Jj1IUjjPaWf";

export default function VisitationPlanner({ setActivePage }) {
    const [schools, setSchools] = useState([]);
    const [visitData, setVisitData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [openSchoolId, setOpenSchoolId] = useState(null);
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const searchRef = useRef(null);

    useEffect(() => {
        fetchSchools();
    }, []);

    useEffect(() => {
        function handleOutside(e) {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, []);

    const fetchSchools = async () => {
        try {
            const res = await fetch(
                `${API_BASE}/organisationUnits?fields=id,name,geometry&filter=parent.id:eq:${JAMBALAYA_CLUSTER_ID}&filter=geometry:!null:all`,
                { headers: { Authorization: CREDENTIALS } }
            );
            const data = await res.json();
            const schoolList = data.organisationUnits || [];
            setSchools(schoolList);
            await fetchLastVisits(schoolList);
        } catch (err) {
            setError("Failed to fetch schools");
            setLoading(false);
        }
    };

    const fetchLastVisits = async (schoolList) => {
        const results = [];

        for (const school of schoolList) {
            try {
                const res = await fetch(
                    `${API_BASE}/tracker/events.json?program=${RESOURCE_PROGRAM_ID}&orgUnit=${school.id}&order=occurredAt:desc&pageSize=1`,
                    { headers: { Authorization: CREDENTIALS } }
                );
                const data = await res.json();
                const lastEvent = data.events?.[0];
                const lastVisitDate = lastEvent?.occurredAt || lastEvent?.eventDate || null;

                const daysSinceVisit = lastVisitDate
                    ? Math.floor((Date.now() - new Date(lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
                    : 999;

                let markerColor = "#4caf50"; // Green - recently visited
                if (daysSinceVisit > 90) markerColor = "#ff9800"; // Orange - overdue
                if (daysSinceVisit > 180) markerColor = "#f44336"; // Red - severely overdue

                const [lng, lat] = school.geometry?.coordinates || [0, 0];

                results.push({
                    id: school.id,
                    name: school.name,
                    lastVisitDate: lastVisitDate,
                    lastVisitDays: daysSinceVisit,
                    markerColor: markerColor,
                    lat: lat,
                    lng: lng,
                    learners: 0, // Placeholder
                });
            } catch (err) {
                console.error("Error fetching events for", school.name, err);
            }
        }

        setVisitData(results);
        setLoading(false);
    };

    const isOverdue = (date) => {
        if (!date) return true;
        const days = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
        return days > 90;
    };

    const sortedData = [...visitData].sort((a, b) => {
        return b.lastVisitDays - a.lastVisitDays; // Most overdue first
    });

    const filteredData = sortedData.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase())
    );

    const suggestions = showSuggestions && search.length > 0
        ? sortedData.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())).slice(0, 5)
        : [];

    const toggleOpen = (id) => {
        setOpenSchoolId((prev) => (prev === id ? null : id));
    };

    const handleSchoolClick = (school) => {
        setSelectedSchool(school);
        setOpenSchoolId(school.id);
    };

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}>
                <CircularLoader />
            </div>
        );
    }

    if (error) {
        return (
            <NoticeBox error title="Error loading data">
                {error}
            </NoticeBox>
        );
    }

    return (
        <div className={classes.plannerContainer}>
            <div className={classes.pageHeader}>
                <Button small icon={<IconArrowLeft24 />} onClick={() => setActivePage("dashboard")} />
                <h2>Visitation Planner</h2>
            </div>

            {/* SEARCH BAR */}
            <div className={classes.searchContainer} ref={searchRef}>
                <InputField
                    className={classes.searchInput}
                    placeholder="Search schools..."
                    value={search}
                    onChange={({ value }) => {
                        setSearch(value);
                        setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                />

                {suggestions.length > 0 && (
                    <div className={classes.suggestionsDropdown}>
                        {suggestions.map((s) => (
                            <div
                                key={s.id}
                                className={classes.suggestionItem}
                                onClick={() => {
                                    setSearch(s.name);
                                    setSelectedSchool(s);
                                    setOpenSchoolId(s.id);
                                    setShowSuggestions(false);
                                }}
                            >
                                <span className={classes.suggestionIcon}>🏫</span>
                                <span className={classes.suggestionName}>{s.name}</span>
                                <span className={classes.suggestionMeta}>
                                    {s.lastVisitDays === 999 ? "Never" : `${s.lastVisitDays}d ago`}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* MAP */}
            <div className={classes.mapWrapper}>
                <MapView
                    schools={filteredData}
                    selectedSchool={selectedSchool}
                    onMarkerClick={handleSchoolClick}
                />
            </div>

            {/* SCHOOL LIST */}
            <div className={classes.schoolListContainer}>
                {filteredData.map((school) => {
                    const isOpen = openSchoolId === school.id;

                    return (
                        <Card key={school.id} className={classes.schoolCard}>
                            <div className={classes.schoolCardContent}>
                                <div className={classes.schoolIcon}>
                                    <IconHome24 />
                                </div>

                                <div className={classes.schoolRight}>
                                    <div className={classes.schoolName}>{school.name}</div>

                                    <div className={classes.statusRow}>
                                        <span className={classes.textGray}>
                                            {school.lastVisitDays === 999
                                                ? "Never visited"
                                                : `Last visit: ${school.lastVisitDays} days ago`}
                                        </span>
                                    </div>

                                    <div className={classes.showMore} onClick={() => toggleOpen(school.id)}>
                                        <IconChevronDown24
                                            className={`${classes.showMoreIcon} ${isOpen ? classes.rotateUp : ""}`}
                                        />
                                        {isOpen ? "Show less" : "Show more"}
                                    </div>

                                    {isOpen && (
                                        <div className={classes.detailsWrapper}>
                                            <div className={classes.detailLine}>
                                                <span className={classes.detailLabel}>Last visitation:</span>
                                                <span className={classes.detailValue}>
                                                    {school.lastVisitDate
                                                        ? new Date(school.lastVisitDate).toLocaleDateString()
                                                        : "No visits recorded"}
                                                </span>
                                            </div>

                                            <div className={classes.detailLine}>
                                                <span className={classes.detailLabel}>Status:</span>
                                                <span className={classes.detailValue}>
                                                    {isOverdue(school.lastVisitDate)
                                                        ? "Overdue for inspection"
                                                        : "Up to date"}
                                                </span>
                                            </div>

                                            <div className={classes.actionButtons}>
                                                <Button
                                                    primary
                                                    className={classes.actionButtonDHIS2}
                                                    onClick={() => setActivePage("inspection")}
                                                >
                                                    Schedule visit
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}