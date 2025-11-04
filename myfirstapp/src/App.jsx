import React from "react";
import classes from "./App.module.css";
import { useState } from "react";
import { Inspection } from "./Inspection";
import { Navigation } from "./Navigation";

function MyApp() {
    const [activePage, setActivePage] = useState("Inspection");

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
                {activePage === "Inspection" && <Inspection />}
            </div>
        </div>
    );
}

export default MyApp;