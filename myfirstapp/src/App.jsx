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


// HEADER
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

// FOOTER
function Footer() {
    return (
        <footer className={classes.footerNav}>
            <ButtonStrip middle>
                <Button className={classes.footerButtonActive} icon={<IconApps24 />} small>
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

// MAIN APP
function MyApp() {
    return (
        <div className={classes.container}>

            <Header />

            <main className={classes.main}>

                <div className={classes.containerCard}>

                    {/*TODAY'S SCHEDULE CARD*/}
                    <Card className={classes.scheduleCard}>

                        {/* title + arrows */}
                        <div className={classes.scheduleHeaderRow}>
                            <div className={classes.cardHeader}>Today’s Schedule</div>

                            <div className={classes.scheduleNavButtons}>
                              <Button small icon={<IconArrowLeft24 />} />
                              <Button small icon={<IconArrowRight24 />} />
                          </div>
                        </div>

                        {/* Card content */}
                        <div className={classes.scheduleItem}>
                            <div className={classes.scheduleIcon}>
                                <IconLocation24 />
                            </div>

                            <div>
                                <div className={classes.schoolName}>Campama LBS</div>
                                <div className={classes.schoolAddress}>
                                    Schoolstreet 231, district
                                </div>
                                <div className={classes.schoolTime}>08:15 – 10:00</div>
                            </div>
                        </div>
                    </Card>

                    {/* NEW INSPECTION BUTTON*/}
                    <Button
                        primary
                        large
                        icon={<IconAdd24 />}
                        className={classes.newInspectionBtn}
                        style={{ width: "100%" }}
                    >
                        New Inspection
                    </Button>


                    {/* PROGRAM LIST */}
                    <div className={classes.programWrapper}>
                        <div className={classes.programList}>

                            <Card
                                className={classes.programCard}
                                onClick={() => console.log("School Registry")}
                            >
                                <div className={classes.programContent}>
                                    <div className={classes.programIcon} style={{ background: "#F5A45A" }}>
                                        <IconHome24 />
                                    </div>
                                    <div className={classes.programText}>School Registry</div>
                                </div>
                            </Card>

                            <Card
                                className={classes.programCard}
                                onClick={() => console.log("Visitation Planner")}
                            >
                                <div className={classes.programContent}>
                                    <div className={classes.programIcon} style={{ background: "#E36A5A" }}>
                                        <IconClock24 />
                                    </div>
                                    <div className={classes.programText}>Visitation Planner</div>
                                </div>
                            </Card>

                            <Card
                                className={classes.programCard}
                                onClick={() => console.log("Analytics")}
                            >
                                <div className={classes.programContent}>
                                    <div className={classes.programIcon} style={{ background: "#3B7F6A" }}>
                                        <IconVisualizationColumn24 />
                                    </div>
                                    <div className={classes.programText}>Analytics</div>
                                </div>
                            </Card>

                            <Card
                                className={classes.programCard}
                                onClick={() => console.log("Inspection Reports")}
                            >
                                <div className={classes.programContent}>
                                    <div className={classes.programIcon} style={{ background: "#A7D397" }}>
                                        <IconFolder24 />
                                    </div>
                                    <div className={classes.programText}>Inspection Reports</div>
                                </div>
                            </Card>

                        </div>
                    </div>

                </div>
            </main>

            <Footer />
        </div>
    );
}

export default MyApp;