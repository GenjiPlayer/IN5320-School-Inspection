import React, { useState } from "react";
import {
    Button,
    ButtonStrip,
    Card,
    IconCalendar24,
    IconEditItems24,
    IconHome24,
    IconUserGroup24,
    IconArrowRight24,
    IconArrowLeft24,
    IconLocation24,
    IconAdd24,
    IconVisualizationColumn24,
    IconClock24,
    IconApps24,
    IconFolder24,
    IconSync24,
    IconSettings24,
} from "@dhis2/ui";

import classes from "./App.module.css";
import Inspection from "./Inspection.jsx";
import Analytics from "./Analytics.jsx";
import SchoolPlanner from "./SchoolPlanner.jsx";

/* HEADER */
function Header() {
    return (
        <div className={classes.appHeader}>
            <h1>School Inspection</h1>
            <div className={classes.rightButtons}>
                <Button small icon={<IconSync24 />} />
                <Button small icon={<IconSettings24 />} />
            </div>
        </div>
    );
}

/* FOOTER */
function Footer({ activePage, setActivePage }) {
    return (
        <footer className={classes.footerNav}>
            <ButtonStrip middle>
                <Button
                    className={
                        activePage === "dashboard"
                            ? classes.footerButtonActive
                            : classes.footerButton
                    }
                    icon={<IconApps24 />}
                    small
                    onClick={() => setActivePage("dashboard")}
                >
                    Programs
                </Button>

                <Button className={classes.footerButton} icon={<IconUserGroup24 />} small>
                    Contacts
                </Button>

                <Button className={classes.footerButton} icon={<IconCalendar24 />} small>
                    Calendar
                </Button>

                <Button className={classes.footerButton} icon={<IconEditItems24 />} small>
                    Notes
                </Button>
            </ButtonStrip>
        </footer>
    );
}

/* MAIN APP */
export default function App() {
    const [activePage, setActivePage] = useState("dashboard");

    function renderPage() {
        switch (activePage) {
            case "inspection":
                return <Inspection setActivePage={setActivePage} />;
            case "analytics":
                return <Analytics />;
            case "planner":
                return <SchoolPlanner />;
            default:
                return <Dashboard setActivePage={setActivePage} />;
        }
    }

    return (
        <div className={classes.container}>
            <Header />
            <main className={classes.main}>{renderPage()}</main>
            <Footer activePage={activePage} setActivePage={setActivePage} />
        </div>
    );
}

/* DASHBOARD */
function Dashboard({ setActivePage }) {
    return (
        <div className={classes.containerCard}>

            {/* TODAY’S SCHEDULE */}
            <Card className={classes.scheduleCard}>
                <div className={classes.scheduleHeaderRow}>
                    <div className={classes.cardHeader}>Today’s Schedule</div>
                    <div>
                        <Button small icon={<IconArrowLeft24 />} />
                        <Button small icon={<IconArrowRight24 />} />
                    </div>
                </div>

                <div className={classes.scheduleItem}>
                    <div className={classes.scheduleIcon}>
                        <IconLocation24 />
                    </div>

                    <div>
                        <div className={classes.schoolName}>Campama LBS</div>
                        <div className={classes.schoolAddress}>Schoolstreet 231, district</div>
                        <div className={classes.schoolTime}>08:15 – 10:00</div>
                    </div>
                </div>
            </Card>

            {/* NEW INSPECTION BUTTON */}
            <Button
                primary
                large
                icon={<IconAdd24 />}
                className={classes.newInspectionBtn}
                onClick={() => setActivePage("inspection")}
            >
                New Inspection
            </Button>

            {/* PROGRAM CARDS */}
            <div className={classes.programWrapper}>
                <div className={classes.programList}>

                    {/* School Registry */}
                    <div
                        className={classes.programCardWrapper}
                        onClick={() => setActivePage("inspection")}
                    >
                        <Card className={classes.programCard}>
                            <div className={classes.programContent}>
                                <div
                                    className={classes.programIcon}
                                    style={{background: "#FFCC80" }}
                                >
                                    <IconHome24 />
                                </div>
                                <div className={classes.programText}>School Registry</div>
                            </div>
                        </Card>
                    </div>

                    {/* Visitation Planner */}
                    <div
                        className={classes.programCardWrapper}
                        onClick={() => setActivePage("planner")}
                    >
                        <Card className={classes.programCard}>
                            <div className={classes.programContent}>
                                <div
                                    className={classes.programIcon}
                                    style={{ background: "#FFA2A2" }}
                                >
                                    <IconClock24 />
                                </div>
                                <div className={classes.programText}>Visitation Planner</div>
                            </div>
                        </Card>
                    </div>

                    {/* Analytics */}
                    <div
                        className={classes.programCardWrapper}
                        onClick={() => setActivePage("analytics")}
                    >
                        <Card className={classes.programCard}>
                            <div className={classes.programContent}>
                                <div
                                    className={classes.programIcon}
                                    style={{ background: "#4DB6AC" }}
                                >
                                    <IconVisualizationColumn24 />
                                </div>
                                <div className={classes.programText}>Analytics</div>
                            </div>
                        </Card>
                    </div>

                    {/* Reports */}
                    <div
                        className={classes.programCardWrapper}
                        onClick={() => setActivePage("inspection")}
                    >
                        <Card className={classes.programCard}>
                            <div className={classes.programContent}>
                                <div
                                    className={classes.programIcon}
                                    style={{ background: "#A5D6A7" }}
                                >
                                    <IconFolder24 />
                                </div>
                                <div className={classes.programText}>Inspection Reports</div>
                            </div>
                        </Card>
                    </div>

                </div>
            </div>
        </div>
    );
}
