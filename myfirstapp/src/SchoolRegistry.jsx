// Updated SchoolRegistry.jsx
// Full copy-paste version with working School Inspection navigation
// and Resource Inspection modal.

import React, { useState, useEffect } from "react";
import {
    Card,
    Button,
    InputField,
    IconArrowLeft24,
    IconChevronDown24,
    IconHome24,
    IconCalendar24,
    IconAdd24,
    IconFlag24,
    IconInfoFilled24,
    IconClockHistory24,
    CircularLoader,
    NoticeBox,
    Modal,
    ModalTitle,
    ModalContent,
    ModalActions,
} from "@dhis2/ui";

import classes from "./SchoolRegistry.module.css";

export default function SchoolRegistry({ setActivePage }) {
    const [search, setSearch] = useState("");
    const [schools, setSchools] = useState([]);
    const [visitData, setVisitData] = useState([]);
    const [openSchoolId, setOpenSchoolId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [openResourceModal, setOpenResourceModal] = useState(false);
    const [resourceDate, setResourceDate] = useState("");
    const [resourceInputs, setResourceInputs] = useState({
        classrooms: "",
        seats: "",
        toilets: "",
        books: "",
    });

    const RESOURCE_PROGRAM_ID = "uvpW17dnfUS";

    useEffect(() => {
        fetchSchools();
    }, []);

    const toggleOpen = (id) => {
        setOpenSchoolId((prev) => (prev === id ? null : id));
    };

    const fetchSchools = async () => {
        try {
            const res = await fetch(
                "https://research.im.dhis2.org/in5320g20/api/organisationUnits?filter=level:eq:5&filter=parent.name:eq:Jambalaya%20Cluster&fields=id,name&pageSize=200",
                {
                    headers: {
                        Authorization: "Basic " + btoa("admin:district"),
                    },
                }
            );

            const json = await res.json();
            const schoolList = json.organisationUnits || [];
            setSchools(schoolList);

            await fetchLastVisits(schoolList);
        } catch (err) {
            setError(`Failed to fetch schools: ${err.message || err}`);
            setLoading(false);
        }
    };

    const fetchLastVisits = async (list) => {
        const results = [];

        for (const s of list) {
            try {
                const res = await fetch(
                    `https://research.im.dhis2.org/in5320g20/api/tracker/events.json?program=${RESOURCE_PROGRAM_ID}&orgUnit=${s.id}&order=occurredAt:desc&pageSize=1`,
                    {
                        headers: {
                            Authorization: "Basic " + btoa("admin:district"),
                        },
                    }
                );

                const json = await res.json();
                const lastEvent = json?.events?.[0];

                results.push({
                    id: s.id,
                    name: s.name,
                    lastVisitDate:
                        lastEvent?.occurredAt || lastEvent?.eventDate || null,
                });
            } catch (e) {
                console.error("Event fetch failed for", s.name);
            }
        }

        setVisitData(results);
        setLoading(false);
    };

    const isOverdue = (date) => {
        if (!date) return true;
        const diff = (Date.now() - new Date(date)) / (1000 * 60 * 60 * 24);
        return diff > 90;
    };

    const sortedData = [...visitData].sort((a, b) => {
        const aO = isOverdue(a.lastVisitDate);
        const bO = isOverdue(b.lastVisitDate);
        if (aO && !bO) return -1;
        if (!aO && bO) return 1;
        return new Date(b.lastVisitDate || 0) - new Date(a.lastVisitDate || 0);
    });

    const filtered = sortedData.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase())
    );

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
        <div className={classes.pageWrapper}>
            <div className={classes.pageHeader}>
                <Button
                    small
                    icon={<IconArrowLeft24 />}
                    onClick={() => setActivePage("dashboard")}
                />
                <h2>School Registry</h2>
            </div>

            <Card className={classes.searchCard}>
                <InputField
                    placeholder="Search for school"
                    value={search}
                    onChange={({ value }) => setSearch(value)}
                />

                <Button
                    primary
                    icon={<IconAdd24 />}
                    className={classes.searchAddBtn}
                    onClick={() => console.log("Add school clicked")}
                >
                    Add new school
                </Button>
            </Card>

            <div className={classes.schoolList}>
                {filtered.map((school) => (
                    <Card key={school.id} className={classes.schoolCard}>
                        <div className={classes.schoolCardContent}>
                            <div className={classes.schoolIcon}>
                                <IconHome24 />
                            </div>

                            <div className={classes.schoolRight}>
                                <div className={classes.schoolName}>{school.name}</div>

                                {isOverdue(school.lastVisitDate) ? (
                                    <div className={classes.statusRow}>
                                        <IconInfoFilled24 className={classes.iconRed} />
                                        <span className={classes.textRed}>
                                            Inspection overdue
                                        </span>
                                    </div>
                                ) : (
                                    <div className={classes.statusRow}>
                                        <IconFlag24 className={classes.iconOrange} />
                                        <span className={classes.textOrange}>
                                            Marked for follow-up
                                        </span>
                                    </div>
                                )}

                                <div className={classes.nextInspectionRow}>
                                    <IconCalendar24 />
                                    {school.lastVisitDate
                                        ? "Next inspection " +
                                        new Date(
                                            school.lastVisitDate
                                        ).toLocaleDateString()
                                        : "No visits recorded"}
                                </div>

                                <div
                                    className={classes.showMore}
                                    onClick={() => toggleOpen(school.id)}
                                >
                                    <IconChevronDown24
                                        className={`${classes.showMoreIcon} ${
                                            openSchoolId === school.id
                                                ? classes.rotateUp
                                                : ""
                                        }`}
                                    />
                                    {openSchoolId === school.id
                                        ? "Show less"
                                        : "Show more"}
                                </div>

                                {openSchoolId === school.id && (
                                    <div className={classes.detailsWrapper}>
                                        <div className={classes.detailLine}>
                                            <span className={classes.detailLabel}>
                                                Date of last visitation:
                                            </span>
                                            <span className={classes.detailValue}>
                                                {school.lastVisitDate
                                                    ? new Date(
                                                        school.lastVisitDate
                                                    ).toLocaleDateString()
                                                    : "No visits recorded"}
                                            </span>
                                        </div>

                                        <div className={classes.detailLine}>
                                            <span className={classes.detailLabel}>
                                                Phone:
                                            </span>
                                            <span className={classes.detailValue}>
                                                +234 123 111 6785
                                            </span>
                                        </div>

                                        <div className={classes.detailLine}>
                                            <span className={classes.detailLabel}>
                                                Address:
                                            </span>
                                            <span className={classes.detailValue}>
                                                Street Streetname 12, District
                                            </span>
                                        </div>

                                        {/* School Inspection */}
                                        <Button
                                            primary
                                            icon={<IconAdd24 />}
                                            className={classes.actionButtonDHIS2}
                                            onClick={() => setActivePage("inspection")}
                                        >
                                            New school inspection
                                        </Button>

                                        {/* Resource Inspection */}
                                        <Button
                                            icon={<IconAdd24 />}
                                            className={classes.actionButtonDHIS2}
                                            onClick={() => setOpenResourceModal(true)}
                                        >
                                            New resource count
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
                                )}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Resource Inspection Modal */}
            {openResourceModal && (
                <Modal onClose={() => setOpenResourceModal(false)}>
                    <ModalTitle>Resource Inspection</ModalTitle>
                    <ModalContent>
                        <InputField
                            label="Inspection Date"
                            type="date"
                            value={resourceDate}
                            onChange={({ value }) => setResourceDate(value)}
                            required
                        />

                        <InputField
                            label="Number of Classrooms"
                            type="number"
                            value={resourceInputs.classrooms}
                            onChange={({ value }) =>
                                setResourceInputs((prev) => ({
                                    ...prev,
                                    classrooms: value,
                                }))
                            }
                        />

                        <InputField
                            label="Number of Seats"
                            type="number"
                            value={resourceInputs.seats}
                            onChange={({ value }) =>
                                setResourceInputs((prev) => ({
                                    ...prev,
                                    seats: value,
                                }))
                            }
                        />

                        <InputField
                            label="Number of Toilets"
                            type="number"
                            value={resourceInputs.toilets}
                            onChange={({ value }) =>
                                setResourceInputs((prev) => ({
                                    ...prev,
                                    toilets: value,
                                }))
                            }
                        />

                        <InputField
                            label="Number of Textbooks"
                            type="number"
                            value={resourceInputs.books}
                            onChange={({ value }) =>
                                setResourceInputs((prev) => ({
                                    ...prev,
                                    books: value,
                                }))
                            }
                        />
                    </ModalContent>

                    <ModalActions>
                        <Button onClick={() => setOpenResourceModal(false)}>
                            Cancel
                        </Button>
                        <Button
                            primary
                            onClick={() => {
                                console.log("Submitting resource inspection:", {
                                    date: resourceDate,
                                    ...resourceInputs,
                                });

                                setOpenResourceModal(false);
                            }}
                        >
                            Submit
                        </Button>
                    </ModalActions>
                </Modal>
            )}
        </div>
    );
}
