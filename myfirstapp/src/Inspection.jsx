import React, { useState } from "react";
import { Menu, MenuItem } from "@dhis2/ui";

export function Inspection() {
    const [selectedItem, setSelectedItem] = useState(null);

    return (
        <div style={{ display: "flex", gap: "20px" }}>
            <div style={{ minWidth: "250px" }}>
                <p>Hello</p>
            </div>
        </div>
    );
}
