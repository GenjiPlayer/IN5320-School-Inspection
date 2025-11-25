import React, { useState } from "react";
import {
    Button,
    ButtonStrip,
    Card,
    InputField,
    SingleSelect,
    SingleSelectOption,
    NoticeBox,
} from "@dhis2/ui";

import classes from "./Inspection.module.css";

/* ===========================
     DATA ELEMENT CONSTANTS
=========================== */
const DATA_ELEMENTS = {
    TOILETS: "kCMjTUb7F3A",
    SEATS: "Xx4fQvh3XZV",
    BOOKS: "E2wyFZ3A1zZ",
    CLASSROOMS: "mH6Z1aA7GvC",

    PRINCIPAL_PRESENT: "PQmA3s8dLLA",
    TEACHERS_PRESENT: "Pf8de92Zx1M",
    STUDENTS_PRESENT: "d0S9bhqZQfS"
};

const EVENT_PROGRAM = "YourProgramID"; // Replace with your program
const EVENT_STAGE = "YourStageID";     // Replace with your stage id

/* ===========================
      MAIN COMPONENT
=========================== */
export default function Inspection({
    setActivePage,
    setHeaderColor,
    setHeaderTextColor,
    setHeaderIconColor,
    setHeaderTitle
}) {
    const [inspectionType, setInspectionType] = useState("resources");

    const [resourceForm, setResourceForm] = useState({
        toilets: "",
        seats: "",
        books: "",
        classrooms: "",
    });

    const [schoolForm, setSchoolForm] = useState({
        principalPresent: "",
        teachersPresent: "",
        studentsPresent: "",
    });

    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    // Set header styling
    React.useEffect(() => {
        setHeaderColor("#2D6693");
        setHeaderTextColor("#FFFFFF");
        setHeaderIconColor("#FFFFFF");
        setHeaderTitle("New Inspection");
    }, []);

    /* ===========================
         FIELD CHANGE HANDLERS
    =========================== */
    function handleResourceChange(field, value) {
        setResourceForm({ ...resourceForm, [field]: value });
    }

    function handleSchoolChange(field, value) {
        setSchoolForm({ ...schoolForm, [field]: value });
    }

    /* ===========================
         DHIS2 POST HELPERS
    =========================== */
    async function postEvent(dataValues) {
        try {
            const res = await fetch("/api/events", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    program: EVENT_PROGRAM,
                    programStage: EVENT_STAGE,
                    orgUnit: "OrgUnitIDHere",  // Set dynamically later
                    eventDate: new Date().toISOString().split("T")[0],
                    dataValues
                })
            });

            if (!res.ok) throw new Error(await res.text());

            setSuccessMsg("Inspection submitted successfully!");
            setErrorMsg("");
        } catch (err) {
            setErrorMsg("Failed to submit inspection: " + err.message);
            setSuccessMsg("");
        }
    }

    /* ===========================
       SUBMIT HANDLERS (HEAD LOGIC)
    =========================== */
    function submitResourceInspection() {
        const dv = [
            { dataElement: DATA_ELEMENTS.TOILETS, value: resourceForm.toilets },
            { dataElement: DATA_ELEMENTS.SEATS, value: resourceForm.seats },
            { dataElement: DATA_ELEMENTS.BOOKS, value: resourceForm.books },
            { dataElement: DATA_ELEMENTS.CLASSROOMS, value: resourceForm.classrooms }
        ];

        postEvent(dv);
    }

    function submitSchoolInspection() {
        const dv = [
            { dataElement: DATA_ELEMENTS.PRINCIPAL_PRESENT, value: schoolForm.principalPresent },
            { dataElement: DATA_ELEMENTS.TEACHERS_PRESENT, value: schoolForm.teachersPresent },
            { dataElement: DATA_ELEMENTS.STUDENTS_PRESENT, value: schoolForm.studentsPresent },
        ];

        postEvent(dv);
    }

    /* ===========================
        FORM UI (TINA STYLE)
    =========================== */
    function renderResourceForm() {
        return (
            <Card className={classes.formCard}>
                <InputField
                    label="Toilets"
                    type="number"
                    value={resourceForm.toilets}
                    onChange={(e) => handleResourceChange("toilets", e.value)}
                />
                <InputField
                    label="Seats"
                    type="number"
                    value={resourceForm.seats}
                    onChange={(e) => handleResourceChange("seats", e.value)}
                />
                <InputField
                    label="Books"
                    type="number"
                    value={resourceForm.books}
                    onChange={(e) => handleResourceChange("books", e.value)}
                />
                <InputField
                    label="Classrooms"
                    type="number"
                    value={resourceForm.classrooms}
                    onChange={(e) => handleResourceChange("classrooms", e.value)}
                />

                <Button primary onClick={submitResourceInspection}>
                    Submit Resource Inspection
                </Button>
            </Card>
        );
    }

    function renderSchoolForm() {
        return (
            <Card className={classes.formCard}>
                <InputField
                    label="Principal Present"
                    type="number"
                    value={schoolForm.principalPresent}
                    onChange={(e) => handleSchoolChange("principalPresent", e.value)}
                />
                <InputField
                    label="Teachers Present"
                    type="number"
                    value={schoolForm.teachersPresent}
                    onChange={(e) => handleSchoolChange("teachersPresent", e.value)}
                />
                <InputField
                    label="Students Present"
                    type="number"
                    value={schoolForm.studentsPresent}
                    onChange={(e) => handleSchoolChange("studentsPresent", e.value)}
                />

                <Button primary onClick={submitSchoolInspection}>
                    Submit School Inspection
                </Button>
            </Card>
        );
    }

    /* ===========================
          MAIN RENDER
    =========================== */
    return (
        <div className={classes.pageWrapper}>
            <Card className={classes.selectionCard}>
                <SingleSelect
                    selected={inspectionType}
                    onChange={(val) => setInspectionType(val.selected)}
                    label="Inspection Type"
                >
                    <SingleSelectOption
                        value="resources"
                        label="Resource Inspection"
                    />
                    <SingleSelectOption
                        value="school"
                        label="School Inspection"
                    />
                </SingleSelect>
            </Card>

            {successMsg && <NoticeBox success title="Success">{successMsg}</NoticeBox>}
            {errorMsg && <NoticeBox error title="Error">{errorMsg}</NoticeBox>}

            {inspectionType === "resources" ? renderResourceForm() : renderSchoolForm()}
        </div>
    );
}
