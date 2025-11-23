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
    IconArrowLeft24,
} from "@dhis2/ui";

import classes from "./InspectionReports.module.css";

export default function InspectionReports({ setActivePage }) {
    const [reports, setReports] = useState([]);
    const [schools, setSchools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");

    // Fetch ALL schools
    const fetchSchools = async () => {
        const res = await fetch(
            "https://research.im.dhis2.org/in5320g20/api/organisationUnits?paging=false&fields=id,name",
            {
                headers: { Authorization: "Basic " + btoa("admin:district") },
            }
        );
        const data = await res.json();
        return data.organisationUnits || [];
    };

    // Fetch inspection events
    const fetchEvents = async () => {
        const res = await fetch(
            "https://research.im.dhis2.org/in5320g20/api/tracker/events.json?program=UxK2o06ScIe&paging=false&fields=event,orgUnit,occurredAt,dataValues",
            {
                headers: { Authorization: "Basic " + btoa("admin:district") },
            }
        );
        const data = await res.json();
        return data.events || [];
    };

    useEffect(() => {
        const loadAll = async () => {
            try {
                setLoading(true);

                const [schoolList, eventList] = await Promise.all([
                    fetchSchools(),
                    fetchEvents(),
                ]);

                const schoolMap = {};
                schoolList.forEach((s) => (schoolMap[s.id] = s.name));

                const formatted = eventList.map((ev) => ({
                    schoolName: schoolMap[ev.orgUnit] || ev.orgUnit,
                    date: ev.occurredAt,
                    values: ev.dataValues || [],
                }));

                formatted.sort((a, b) => new Date(b.date) - new Date(a.date));

                setReports(formatted);
                setSchools(schoolList);
            } catch (err) {
                setError("Failed to load inspection reports");
            } finally {
                setLoading(false);
            }
        };

        loadAll();
    }, []);

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

    // Filter reports
    const filteredReports = reports.filter((r) =>
        r.schoolName.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className={classes.pageWrapper}>
            {/* HEADER */}
            <div className={classes.pageHeader}>
                <Button
                    small
                    icon={<IconArrowLeft24 />}
                    onClick={() => setActivePage("dashboard")}
                />
                <h2>Inspection Reports</h2>
            </div>

            {/* SEARCH + START INSPECTION */}
            <Card className={classes.searchCard}>
                <InputField
                    placeholder="Search..."
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
                {filteredReports.map((report, index) => (
                    <Card key={index} className={classes.reportCard}>
                        <div className={classes.reportContent}>
                            <div className={classes.iconCircle}>
                                <IconHome24 />
                            </div>

                            <div className={classes.reportText}>
                                <h3 className={classes.schoolName}>
                                    {report.schoolName}
                                </h3>

                                <div className={classes.dateRow}>
                                    <IconCalendar24 />
                                    <span>
                                        {new Date(report.date).toLocaleDateString(
                                            "en-GB",
                                            {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric",
                                            }
                                        )}
                                    </span>
                                </div>
                            </div>

                            <div className={classes.moreButton}>
                                Show more ▾
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
