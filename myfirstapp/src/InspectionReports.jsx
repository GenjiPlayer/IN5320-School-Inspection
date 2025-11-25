import React, { useState, useEffect } from "react";
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
    IconChevronUp24,
} from "@dhis2/ui";

import classes from "./InspectionReports.module.css";

const API_BASE = "https://research.im.dhis2.org/in5320g20/api";
const CREDENTIALS = "Basic " + btoa("admin:district");
const PROGRAM_ID = "UxK2o06ScIe";

export default function InspectionReports({ setActivePage }) {
    const [reports, setReports] = useState([]);
    const [schools, setSchools] = useState([]);
    const [deLabelMap, setDeLabelMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [openReportId, setOpenReportId] = useState(null);

    // ---------- API HELPERS ----------
    const fetchSchools = async () => {
        const res = await fetch(
            `${API_BASE}/organisationUnits?paging=false&fields=id,name`,
            { headers: { Authorization: CREDENTIALS } }
        );
        const data = await res.json();
        return data.organisationUnits || [];
    };

    const fetchEvents = async () => {
        const res = await fetch(
            `${API_BASE}/tracker/events.json?program=${PROGRAM_ID}&paging=false&fields=event,orgUnit,occurredAt,dataValues[dataElement,value]`,
            { headers: { Authorization: CREDENTIALS } }
        );
        const data = await res.json();
        return data.events || [];
    };

    const fetchProgramMeta = async () => {
        const res = await fetch(
            `${API_BASE}/programs/${PROGRAM_ID}?fields=programStages[programStageDataElements[dataElement[id,displayName,shortName,code]]]`,
            { headers: { Authorization: CREDENTIALS } }
        );
        const data = await res.json();

        const map = {};
        if (data.programStages?.length > 0) {
            data.programStages[0].programStageDataElements.forEach((psde) => {
                const de = psde.dataElement;
                map[de.id] =
                    de.displayName || de.shortName || de.code || de.id;
            });
        }
        return map;
    };

    // ---------- LOAD DATA ----------
    useEffect(() => {
        const loadAll = async () => {
            try {
                setLoading(true);
                const [schoolList, eventList, labelMap] = await Promise.all([
                    fetchSchools(),
                    fetchEvents(),
                    fetchProgramMeta(),
                ]);

                const schoolMap = {};
                schoolList.forEach((s) => (schoolMap[s.id] = s.name));

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
                setSchools(schoolList);
                setDeLabelMap(labelMap);
            } catch {
                setError("Failed to load inspection reports");
            } finally {
                setLoading(false);
            }
        };

        loadAll();
    }, []);

    // ---------- FILTER ----------
    const filteredReports = reports.filter((r) =>
        r.schoolName.toLowerCase().includes(search.toLowerCase())
    );

    const toggleOpen = (id) => {
        setOpenReportId((prev) => (prev === id ? null : id));
    };

    // ---------- RENDER ----------
    if (loading)
        return (
            <div className={classes.loadingWrapper}>
                <CircularLoader />
            </div>
        );

    if (error)
        return (
            <NoticeBox error title="Error loading reports">
                {error}
            </NoticeBox>
        );

    return (
        <div className={classes.pageWrapper}>
            {/* SEARCH + START BUTTON */}
            <Card className={classes.searchCard}>
                <InputField
                    placeholder="Search by school name..."
                    value={search}
                    onChange={({ value }) => setSearch(value)}
                />

                <Button
                    primary
                    icon={<IconAdd24 />}
                    className={classes.addButton}
                    onClick={() => setActivePage("inspection")}
                >
                    Start new inspection
                </Button>
            </Card>

            {/* REPORT LIST */}
            <div className={classes.reportList}>
                {filteredReports.length === 0 && (
                    <NoticeBox title="No reports found">
                        Try a different search term or submit a new inspection.
                    </NoticeBox>
                )}

                {filteredReports.map((report) => {
                    const isOpen = openReportId === report.id;

                    return (
                        <Card key={report.id} className={classes.reportCard}>
                            <div className={classes.reportContent}>
                                <div className={classes.iconCircle}>
                                    <IconHome24 />
                                </div>

                                <div className={classes.textColumn}>
                                    <h3 className={classes.schoolName}>
                                        {report.schoolName}
                                    </h3>

                                    <div className={classes.rowBetween}>
                                        <div className={classes.dateRow}>
                                            <IconCalendar24 />
                                            <span
                                                className={classes.dateLabel}
                                            >
                                                Last visit:
                                            </span>
                                            <span>
                                                {new Date(
                                                    report.date
                                                ).toLocaleDateString(
                                                    "en-GB",
                                                    {
                                                        day: "2-digit",
                                                        month: "short",
                                                        year: "numeric",
                                                    }
                                                )}
                                            </span>
                                        </div>

                                        <div
                                            className={classes.showMore}
                                            onClick={() =>
                                                toggleOpen(report.id)
                                            }
                                        >
                                            {isOpen ? (
                                                <>
                                                    Hide details
                                                    <IconChevronUp24
                                                        className={
                                                            classes.showMoreIcon
                                                        }
                                                    />
                                                </>
                                            ) : (
                                                <>
                                                    Show details
                                                    <IconChevronDown24
                                                        className={
                                                            classes.showMoreIcon
                                                        }
                                                    />
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {isOpen && (
                                <div className={classes.reportDetails}>
                                    <h4>Recorded values</h4>

                                    <ul className={classes.valuesList}>
                                        {report.values.length === 0 && (
                                            <li
                                                className={
                                                    classes.emptyValues
                                                }
                                            >
                                                No data values recorded for
                                                this event.
                                            </li>
                                        )}

                                        {report.values.map((dv, idx) => {
                                            const label =
                                                deLabelMap[dv.dataElement] ||
                                                dv.dataElement;

                                            return (
                                                <li
                                                    key={`${dv.dataElement}-${idx}`}
                                                    className={
                                                        classes.valueRow
                                                    }
                                                >
                                                    <span
                                                        className={
                                                            classes.valueLabel
                                                        }
                                                    >
                                                        {label}
                                                    </span>
                                                    <span
                                                        className={
                                                            classes.valueText
                                                        }
                                                    >
                                                        {dv.value}
                                                    </span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
