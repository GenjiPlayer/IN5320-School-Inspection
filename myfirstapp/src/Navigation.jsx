import React from "react";
import { Menu, MenuItem } from "@dhis2/ui";

export function Navigation(props) {
    return (
        <Menu>
            <MenuItem
                label="Inspection"
                active={props.activePage === "Inspection"}
                onClick={() => props.activePageHandler("Inspection")}
            />
            <MenuItem
                label="School Planner"
                active={props.activePage === "SchoolPlanner"}
                onClick={() => props.activePageHandler("SchoolPlanner")}
            />
            <MenuItem
                label="Analytics"
                active={props.activePage === "Analytics"}
                onClick={() => props.activePageHandler("Analytics")}
            />
        </Menu>
    );
}