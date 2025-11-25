import React, { useState, useEffect, useRef } from "react";
import {
    Card,
    Button,
    CircularLoader,
    NoticeBox,
    InputField,
    IconCalendar24,
    IconHome24,
    IconAdd24,
    IconChevronDown24,
    IconClockHistory24
} from "@dhis2/ui";

import classes from "./InspectionReports.module.css";

const API_BASE = "https://research.im.dhis2.org/in5320g20/api";
const CREDENTIALS = "Basic " + btoa("admin:district");
const PROGRAM_ID = "UxK2o06ScIe"; // same program as in Inspection.jsx

export default function InspectionReports({ setActivePage }) {
    const [reports, setReports] = useState([]);
    const [deLabelMap, setDeLabelMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [search, setSearch] = useState("");
    const [openReportId, setOpenReportId] = useState(null);

    const searchRef = useRef(null);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // ---------- API HELPERS ----------

    const fetchSchools = async () => {
        const res = await fetch(
            `${API_BASE}/organisationUnits?paging=false&fields=id,name`,
            {
                headers: { Authorization: CREDENTIALS },
            }
        );
        const data = await res.json();
        return data.organisationUnits || [];
    };

    const fetchEvents = async () => {
        const res = await fetch(
            `${API_BASE}/tracker/events.json?program=${PROGRAM_ID}&paging=false&fields=event,orgUnit,occurredAt,dataValues[dataElement,value]`,
            {
                headers: { Authorization: CREDENTIALS },
            }
        );
        const data = await res.json();
        return data.events || [];
    };

    const fetchProgramMeta = async () => {
        const res = await fetch(
            `${API_BASE}/programs/${PROGRAM_ID}?fields=programStages[programStageDataElements[dataElement[id,displayName,shortName,code]]]`,
            {
                headers: { Authorization: CREDENTIALS },
            }
        );
        const data = await res.json();
        const map = {};

        if (data.programStages && data.programStages.length > 0) {
            data.programStages[0].programStageDataElements.forEach((psde) => {
                const de = psde.dataElement;
                const label =
                    de.displayName || de.shortName || de.code || de.id;
                map[de.id] = label;
            });
        }

        return map;
    };

    // ---------- LOAD ALL DATA ON MOUNT ----------

    useEffect(() => {
        const loadAll = async () => {
            try {
                setLoading(true);
                setError(null);

                const [schoolList, eventList, labelMap] = await Promise.all([
                    fetchSchools(),
                    fetchEvents(),
                    fetchProgramMeta(),
                ]);

                const schoolMap = {};
                schoolList.forEach((s) => {
                    schoolMap[s.id] = s.name;
                });

                const formatted = eventList.map((ev) => ({
                    id: ev.event,
                    schoolName: schoolMap[ev.orgUnit] || ev.orgUnit,
                    date: ev.occurredAt,
                    values: ev.dataValues || [],
                }));

                formatted.sort(
                    (a, b) => new Date(b.date) - new Date(a.date)
                );

                setReports(formatted);
                setDeLabelMap(labelMap);
            } catch (err) {
                console.error(err);
                setError("Failed to load inspection reports");
            } finally {
                setLoading(false);
            }
        };

        loadAll();
    }, []);

    // ---------- CLICK OUTSIDE SEARCH (for suggestions) ----------
    useEffect(() => {
        function handleOutside(e) {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, []);

    // ---------- FILTERING + SUGGESTIONS ----------

    const filteredReports = reports.filter((r) =>
        r.schoolName.toLowerCase().includes(search.toLowerCase())
    );

    const suggestions =
        showSuggestions && search.length > 0
            ? reports.filter((r) =>
                  r.schoolName.toLowerCase().includes(search.toLowerCase())
              )
            : [];

    const selectSuggestion = (report) => {
        setSearch(report.schoolName);
        setOpenReportId(report.id);
        setShowSuggestions(false);
    };

    const toggleOpen = (id) => {
        setOpenReportId((prev) => (prev === id ? null : id));
    };

    // ---------- LOADING / ERROR ----------

    if (loading) {
        return (
            <div className={classes.loadingWrapper}>
                <CircularLoader />
            </div>
        );
    }

    if (error) {
        return (
            <NoticeBox error title="Error loading reports">
                {error}
            </NoticeBox>
        );
    }

    // ---------- RENDER ----------

    return (
        <div className={classes.container}>
            {/* SEARCH AREA */}
           <Card className={classes.searchCard}>
    <div className={classes.searchRow}>

        {/* SEARCH INPUT + AUTOCOMPLETE */}
        <div ref={searchRef} className={classes.searchWrapper}>
            <div className={classes.searchInputContainer}>
                <InputField
                    placeholder="Search by school name..."
                    value={search}
                    onChange={({ value }) => {
                        setSearch(value);
                        setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                />

                {/* CLEAR BUTTON */}
                {search.length > 0 && (
                    <button
                        className={classes.clearButton}
                        onClick={() => {
                            setSearch("");
                            setShowSuggestions(false);
                            searchRef.current
                                ?.querySelector("input")
                                ?.focus();
                        }}
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* AUTOCOMPLETE DROPDOWN */}
            {showSuggestions && suggestions.length > 0 && (
                <div className={classes.suggestionsDropdown}>
                    {suggestions.map((r) => (
                        <div
                            key={r.id}
                            className={classes.suggestionItem}
                            onClick={() => selectSuggestion(r)}
                        >
                            {r.schoolName}
                        </div>
                    ))}
                </div>
            )}
        </div>

    </div>
</Card>

            {/* REPORT LIST – styled like school list */}
            <div className={classes.schoolList}>
                {filteredReports.length === 0 && (
                    <NoticeBox title="No reports found">
                        Try a different search term or submit a new inspection.
                    </NoticeBox>
                )}

                {filteredReports.map((report) => {
                    const isOpen = openReportId === report.id;

                    return (
                        <Card
                            key={report.id}
                            className={classes.schoolCard}
                        >
                            <div className={classes.schoolCardContent}>
                                <div className={classes.schoolIcon}>
                                    <IconHome24 />
                                </div>

                                <div className={classes.schoolRight}>
                                    <div className={classes.schoolName}>
                                        {report.schoolName}
                                    </div>

                                    <div className={classes.nextInspectionRow}>
                                        <IconCalendar24 />
                                        {new Date(
                                            report.date
                                        ).toLocaleDateString("en-GB", {
                                            day: "2-digit",
                                            month: "short",
                                            year: "numeric",
                                        })}
                                    </div>

                                    <div
                                        className={classes.showMore}
                                        onClick={() => toggleOpen(report.id)}
                                    >
                                        <IconChevronDown24
                                            className={`${classes.showMoreIcon} ${
                                                isOpen ? classes.rotateUp : ""
                                            }`}
                                        />
                                        {isOpen ? "Show less" : "Show details"}
                                    </div>

                                    {isOpen && (
                                        <>
                                            <div className={classes.detailsWrapper}>
                                                {report.values.length === 0 && (
                                                    <div
                                                        className={
                                                            classes.detailLine
                                                        }
                                                    >
                                                        <span
                                                            className={
                                                                classes.detailValue
                                                            }
                                                        >
                                                            No data values
                                                            recorded for this
                                                            inspection.
                                                        </span>
                                                    </div>
                                                )}

                                                {report.values.map(
                                                    (dv, idx) => {
                                                        const label =
                                                            deLabelMap[
                                                                dv.dataElement
                                                            ] ||
                                                            dv.dataElement;
                                                        return (
                                                            <div
                                                                key={`${dv.dataElement}-${idx}`}
                                                                className={
                                                                    classes.detailLine
                                                                }
                                                            >
                                                                <span
                                                                    className={
                                                                        classes.detailLabel
                                                                    }
                                                                >
                                                                    {label}
                                                                </span>
                                                                <span
                                                                    className={
                                                                        classes.detailValue
                                                                    }
                                                                >
                                                                    {dv.value}
                                                                </span>
                                                            </div>
                                                        );
                                                    }
                                                )}
                                            </div>
                                        </>
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
