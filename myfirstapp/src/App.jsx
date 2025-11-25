import React, { useState, useEffect } from "react";
import {
    Button,
    ButtonStrip,
    Card,
    IconCalendar24,
    IconEditItems24,
    IconHome24,
    IconUserGroup24,
    IconAdd24,
    IconVisualizationColumn24,
    IconClock24,
    IconApps24,
    IconFolder24,
    IconSync24,
    IconSettings24,
    IconArrowLeft24,
    LogoIconWhite
} from "@dhis2/ui";

import classes from "./App.module.css";
import Inspection from "./Inspection.jsx";
import InspectionReports from "./InspectionReports.jsx";
import Analytics from "./Analytics.jsx";
import VisitationPlanner from "./VisitationPlanner";
import SchoolRegistry from "./SchoolRegistry.jsx";

/* ===========================
      HEADER
=========================== */
function Header({
                    headerColor,
                    headerTitle,
                    headerTextColor,
                    headerIconColor,
                    activePage,
                    setActivePage
                }) {
    return (
        <div
            className={classes.appHeader}
            style={{
                backgroundColor: headerColor,
                "--header-icon-color": headerIconColor,
                "--header-text-color": headerTextColor
            }}
        >
            <div className={classes.headerLeft}>
                {activePage === "dashboard" ? (
                    <LogoIconWhite className={classes.headerLogo} />
                ) : (
                    <div
                        className={classes.backIcon}
                        onClick={() => setActivePage("dashboard")}
                    >
                        <IconArrowLeft24 />
                    </div>
                )}

                <h1 style={{ color: "var(--header-text-color)" }}>
                    {headerTitle}
                </h1>
            </div>

            <div className={classes.rightButtons}>
                <div className={classes.headerIconButton}><IconSync24 /></div>
                <div className={classes.headerIconButton}><IconSettings24 /></div>
            </div>
        </div>
    );
}

/* ===========================
      FOOTER
=========================== */
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

/* ===========================
      MAIN APP
=========================== */
export default function App() {
    const [activePage, setActivePage] = useState("dashboard");
    const [headerColor, setHeaderColor] = useState("#2D6693");
    const [headerTitle, setHeaderTitle] = useState("School Inspection");
    const [headerTextColor, setHeaderTextColor] = useState("#FFFFFF");
    const [headerIconColor, setHeaderIconColor] = useState("#FFFFFF");

    function renderPage() {
        switch (activePage) {
            case "registry":
                return (
                    <SchoolRegistry
                        setActivePage={setActivePage}
                        setHeaderColor={setHeaderColor}
                        setHeaderTextColor={setHeaderTextColor}
                        setHeaderIconColor={setHeaderIconColor}
                        setHeaderTitle={setHeaderTitle}
                    />
                );

            case "inspectionReports":
                return (
                    <InspectionReports
                        setActivePage={setActivePage}
                        setHeaderColor={setHeaderColor}
                        setHeaderTextColor={setHeaderTextColor}
                        setHeaderIconColor={setHeaderIconColor}
                        setHeaderTitle={setHeaderTitle}
                    />
                );

            case "planner":
                return (
                    <VisitationPlanner
                        setActivePage={setActivePage}
                        setHeaderColor={setHeaderColor}
                        setHeaderTextColor={setHeaderTextColor}
                        setHeaderIconColor={setHeaderIconColor}
                        setHeaderTitle={setHeaderTitle}
                    />
                );

            case "analytics":
                return (
                    <Analytics
                        setActivePage={setActivePage}
                        setHeaderColor={setHeaderColor}
                        setHeaderTextColor={setHeaderTextColor}
                        setHeaderIconColor={setHeaderIconColor}
                        setHeaderTitle={setHeaderTitle}
                    />
                );

            case "inspection":
                return (
                    <Inspection
                        setActivePage={setActivePage}
                        setHeaderColor={setHeaderColor}
                        setHeaderTextColor={setHeaderTextColor}
                        setHeaderIconColor={setHeaderIconColor}
                        setHeaderTitle={setHeaderTitle}
                    />
                );

            default:
                return (
                    <Dashboard
                        setActivePage={setActivePage}
                        setHeaderColor={setHeaderColor}
                        setHeaderTextColor={setHeaderTextColor}
                        setHeaderIconColor={setHeaderIconColor}
                        setHeaderTitle={setHeaderTitle}
                    />
                );
        }
    }

    return (
        <div className={classes.appWrapper} style={{ backgroundColor: headerColor }}>
            <Header
                headerColor={headerColor}
                headerTitle={headerTitle}
                headerTextColor={headerTextColor}
                headerIconColor={headerIconColor}
                activePage={activePage}
                setActivePage={setActivePage}
            />

            <div className={classes.mainWrapper}>{renderPage()}</div>

            <Footer activePage={activePage} setActivePage={setActivePage} />
        </div>
    );
}

/* ===========================
      DASHBOARD
=========================== */
function Dashboard({
                       setActivePage,
                       setHeaderColor,
                       setHeaderTextColor,
                       setHeaderIconColor,
                       setHeaderTitle
                   }) {
    useEffect(() => {
        setHeaderColor("#2D6693");
        setHeaderTextColor("#FFFFFF");
        setHeaderIconColor("#FFFFFF");
        setHeaderTitle("School Inspection");
    }, [setHeaderColor, setHeaderTextColor, setHeaderIconColor, setHeaderTitle]);

    return (
        <div className={classes.containerCard}>
            <div className={classes.programWrapper}>
                <div className={classes.programList}>

                    {/* SCHOOL REGISTRY */}
                    <div
                        className={classes.programCardWrapper}
                        onClick={() => {
                            setHeaderColor("#FB8C00");
                            setHeaderTextColor("#FFFFFF");
                            setHeaderIconColor("#FFFFFF");
                            setHeaderTitle("School Registry");
                            setActivePage("registry");
                        }}
                    >
                        <Card className={classes.programCard}>
                            <div className={classes.programContent}>
                                <div className={`${classes.programIcon} ${classes.programIconOrange}`}>
                                    <IconHome24 />
                                </div>
                                <div className={classes.programText}>School Registry</div>
                            </div>
                        </Card>
                    </div>

                    {/* INSPECTION REPORTS */}
                    <div
                        className={classes.programCardWrapper}
                        onClick={() => {
                            setHeaderColor("#43A047");
                            setHeaderTextColor("#FFFFFF");
                            setHeaderIconColor("#FFFFFF");
                            setHeaderTitle("Inspection Reports");
                            setActivePage("inspectionReports");
                        }}
                    >
                        <Card className={classes.programCard}>
                            <div className={classes.programContent}>
                                <div className={`${classes.programIcon} ${classes.programIconGreen}`}>
                                    <IconFolder24 />
                                </div>
                                <div className={classes.programText}>Inspection Reports</div>
                            </div>
                        </Card>
                    </div>

                    {/* SCHOOL PLANNER */}
                    <div
                        className={classes.programCardWrapper}
                        onClick={() => {
                            setHeaderColor("#F45B55");
                            setHeaderTextColor("#FFFFFF");
                            setHeaderIconColor("#FFFFFF");
                            setHeaderTitle("School Visit Planner");
                            setActivePage("planner");
                        }}
                    >
                        <Card className={classes.programCard}>
                            <div className={classes.programContent}>
                                <div className={`${classes.programIcon} ${classes.programIconPink}`}>
                                    <IconClock24 />
                                </div>
                                <div className={classes.programText}>School Visit Planner</div>
                            </div>
                        </Card>
                    </div>

                    {/* ANALYTICS */}
                    <div
                        className={classes.programCardWrapper}
                        onClick={() => {
                            setHeaderColor("#00897B");
                            setHeaderTextColor("#FFFFFF");
                            setHeaderIconColor("#FFFFFF");
                            setHeaderTitle("School Analytics");
                            setActivePage("analytics");
                        }}
                    >
                        <Card className={classes.programCard}>
                            <div className={classes.programContent}>
                                <div className={`${classes.programIcon} ${classes.programIconTeal}`}>
                                    <IconVisualizationColumn24 />
                                </div>
                                <div className={classes.programText}>School Analytics</div>
                            </div>
                        </Card>
                    </div>

                    {/* NEW INSPECTION */}
                    <Button
                        primary
                        large
                        icon={<IconAdd24 />}
                        className={classes.newInspectionBtn}
                        onClick={() => {
                            setHeaderColor("#2D6693");
                            setHeaderTextColor("#FFFFFF");
                            setHeaderIconColor("#FFFFFF");
                            setHeaderTitle("New Inspection");
                            setActivePage("inspection");
                        }}
                    >
                        New Inspection
                    </Button>

                </div>
            </div>
        </div>
    );
}