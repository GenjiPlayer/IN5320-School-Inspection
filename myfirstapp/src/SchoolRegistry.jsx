import React, { useState, useEffect, useRef } from "react";
import {
    Card,
    Button,
    InputField,
    IconChevronDown24,
    IconHome24,
    IconCalendar24,
    IconAdd24,
    IconFlag24,
    IconError24,
    IconClockHistory24,
    CircularLoader,
    NoticeBox,
    IconEdit24
} from "@dhis2/ui";

import classes from "./SchoolRegistry.module.css";

export default function SchoolRegistry({
    setActivePage,
    setHeaderColor,
    setHeaderTitle,
}) {

    const [search, setSearch] = useState("");
    const [schools, setSchools] = useState([]);
    const [visitData, setVisitData] = useState([]);
    const [openSchoolId, setOpenSchoolId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const searchRef = useRef(null);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const RESOURCE_PROGRAM_ID = "uvpW17dnfUS";

    useEffect(() => {
        setHeaderColor("#FB8C00");
        setHeaderTitle("School Registry");
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

    useEffect(() => { fetchSchools(); }, []);

    const fetchSchools = async () => {
        try {
            const res = await fetch(
                "https://research.im.dhis2.org/in5320g20/api/organisationUnits?filter=level:eq:5&filter=parent.name:eq:Jambalaya%20Cluster&fields=id,name&pageSize=200",
                { headers: { Authorization: "Basic " + btoa("admin:district") } }
            );

            const json = await res.json();
            const list = json.organisationUnits || [];
            setSchools(list);
            await fetchLastVisits(list);

        } catch (err) {
            setError(`Failed to fetch schools: ${err.message}`);
            setLoading(false);
        }
    };

    const fetchLastVisits = async (list) => {
        const results = [];

        for (const s of list) {
            try {
                const res = await fetch(
                    `https://research.im.dhis2.org/in5320g20/api/tracker/events.json?program=${RESOURCE_PROGRAM_ID}&orgUnit=${s.id}&order=occurredAt:desc&pageSize=1`,
                    { headers: { Authorization: "Basic " + btoa("admin:district") } }
                );

                const json = await res.json();
                const lastEvent = json?.events?.[0];

                results.push({
                    id: s.id,
                    name: s.name,
                    lastVisitDate:
                        lastEvent?.occurredAt || lastEvent?.eventDate || null,
                });

            } catch {
                console.warn("Failed visit fetch for", s.name);
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

    const sorted = [...visitData].sort((a, b) => {
        const ao = isOverdue(a.lastVisitDate);
        const bo = isOverdue(b.lastVisitDate);
        if (ao !== bo) return ao ? -1 : 1;
        return new Date(b.lastVisitDate || 0) - new Date(a.lastVisitDate || 0);
    });

    const filtered = sorted.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase())
    );

    const suggestions =
        showSuggestions
            ? sorted.filter((s) =>
                  s.name.toLowerCase().includes(search.toLowerCase())
              )
            : [];

    const selectSuggestion = (school) => {
        setSearch(school.name);
        setOpenSchoolId(school.id);
        setShowSuggestions(false);
    };


    if (loading) {
        return (
            <div className={classes.loadingWrapper}>
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
        <div className={classes.container}>

            {/* SEARCH AREA */}
            <Card className={classes.searchCard}>
                <div className={classes.searchRow}>

                    <div ref={searchRef} className={classes.searchWrapper}>
                        <div className={classes.searchInputContainer}>
                            <InputField
                                placeholder="Search for school..."
                                value={search}
                                onChange={({ value }) => {
                                    setSearch(value);
                                    setShowSuggestions(true);
                                }}
                                onFocus={() => setShowSuggestions(true)}
                            />

                            {search.length > 0 && (
                                <button
                                    className={classes.clearButton}
                                    onClick={() => {
                                        setSearch("");
                                        setShowSuggestions(false);
                                        searchRef.current?.querySelector("input")?.focus();
                                    }}
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {showSuggestions && suggestions.length > 0 && (
                            <div className={classes.suggestionsDropdown}>
                                {suggestions.map((s) => (
                                    <div
                                        key={s.id}
                                        className={classes.suggestionItem}
                                        onClick={() => selectSuggestion(s)}
                                    >
                                        {s.name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <Button
                        className={classes.editIconButton}
                        secondary
                        icon={<IconEdit24 />}
                    />
                </div>
            </Card>

            {/* SCHOOL LIST */}
            <div className={classes.schoolList}>
                {filtered.map((school) => {
                    const isOpen = openSchoolId === school.id;

                    return (
                        <Card key={school.id} className={classes.schoolCard}>
                            
                            <div className={classes.schoolCardContent}>

                                <div className={classes.schoolIcon}>
                                    <IconHome24 />
                                </div>

                                <div className={classes.schoolRight}>

                                    <div className={classes.schoolName}>{school.name}</div>

                                    {isOverdue(school.lastVisitDate) ? (
                                        <div className={classes.statusRow}>
                                            <IconError24 />
                                            <span className={classes.textRed}>Inspection overdue</span>
                                        </div>
                                    ) : (
                                        <div className={classes.statusRow}>
                                            <IconFlag24 />
                                            <span className={classes.textOrange}>Marked for follow-up</span>
                                        </div>
                                    )}

                                    <div className={classes.nextInspectionRow}>
                                        <IconCalendar24 />
                                        {school.lastVisitDate
                                            ? new Date(school.lastVisitDate).toLocaleDateString()
                                            : "No visits recorded"}
                                    </div>

                                    <div
                                        className={classes.showMore}
                                        onClick={() =>
                                            setOpenSchoolId(isOpen ? null : school.id)
                                        }
                                    >
                                        <IconChevronDown24
                                            className={`${classes.showMoreIcon} ${
                                                isOpen ? classes.rotateUp : ""
                                            }`}
                                        />
                                        {isOpen ? "Show less" : "Show more"}
                                    </div>

                                    {isOpen && (
                                        <>
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
                                                    <span className={classes.detailLabel}>Phone:</span>
                                                    <span className={classes.detailValue}>+234 123 111 6785</span>
                                                </div>

                                                <div className={classes.detailLine}>
                                                    <span className={classes.detailLabel}>Address:</span>
                                                    <span className={classes.detailValue}>
                                                        Street Streetname 12, District
                                                    </span>
                                                </div>
                                            </div>

                                            {/* ACTION BUTTONS */}
                                            <div className={classes.actionsSection}>
                                 <Button
    primary
    icon={<IconAdd24 />}
    className={classes.actionButtonDHIS2}
    onClick={() => {
        setActivePage("inspection");
    }}
>
    New school inspection
</Button>


                                                <Button
                                                    secondary
                                                    icon={<IconCalendar24 />}
                                                    className={classes.actionButtonDHIS2}
                                                >
                                                    Schedule visitation
                                                </Button>

                                                <Button
                                                    secondary
                                                    icon={<IconClockHistory24 />}
                                                    className={classes.actionButtonDHIS2}
                                                >
                                                    Previous reports
                                                </Button>
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
