import React from "react";
import classes from "./App.module.css";
import { useState } from "react";

import { Dashboard } from "./Dashboard";
import { Inspection } from "./Inspection";
import { Navigation } from "./Navigation";
import Analytics from "./Analytics"
import SchoolPlanner from "./SchoolPlanner";

function MyApp() {
    const [activePage, setActivePage] = useState("Dashboard");

    function activePageHandler(page) {
        setActivePage(page);
    }

    return (
        <div className={classes.container}>
            <div className={classes.left}>
                <Navigation
                    activePage={activePage}
                    activePageHandler={activePageHandler}
                />
            </div>
            <div className={classes.right}>
                {activePage === "Dashboard" && <Dashboard />}
                {activePage === "Inspection" && <Inspection />}
                {activePage === "Analytics" && <Analytics />}
                {activePage === "SchoolPlanner" && <SchoolPlanner />}
            </div>
        </div>
    );
}

export default MyApp;