import React, { useState, useEffect } from 'react';
import {
    Button,
    CircularLoader,
    NoticeBox,
    InputField,
    SingleSelectField,
    SingleSelectOption,
    Radio,
    FieldSet,
    Legend,
    IconArrowLeft24,
} from "@dhis2/ui";

import classes from "./Inspection.module.css";

const API_BASE = "https://research.im.dhis2.org/in5320g20/api";
const CREDENTIALS = "Basic " + btoa("admin:district");
const SCHOOL_INSPECTION_PROGRAM_ID = "UxK2o06ScIe";
const RESOURCE_PROGRAM_ID = "uvpW17dnfUS";

export default function Inspection({ setActivePage }) {
    const [schools, setSchools] = useState([]);
    const [selectedSchool, setSelectedSchool] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState(0);

    const [programStageId, setProgramStageId] = useState("");
    const [resourceProgramStageId, setResourceProgramStageId] = useState("");
    const [dataElementIds, setDataElementIds] = useState([]);

    const [schoolForm, setSchoolForm] = useState({
        reportDate: "",
        hasComputerLab: "",
        compLabCondition: "",
        hasElectricity: "",
        elecCondition: "",
        hasHandwash: "",
        handwashCondition: "",
        hasLibrary: "",
        libraryCondition: "",
        hasPlayground: "",
        playgroundCondition: "",
        classroomsTotal: "",
        classroomsClean: "",
        teacherToilets: "",
    });

    const [resourceForm, setResourceForm] = useState({
        reportDate: "",
        toilets: "",
        seats: "",
        books: "",
        classrooms: "",
    });

    useEffect(() => {
        fetchSchools();
        fetchProgramMetadata();
        fetchResourceProgramMetadata();
    }, []);

    const fetchSchools = async () => {
        try {
            const res = await fetch(
                `${API_BASE}/organisationUnits?filter=level:eq:5&filter=parent.name:eq:Jambalaya%20Cluster&fields=id,name&pageSize=200`,
                { headers: { Authorization: CREDENTIALS } }
            );
            const data = await res.json();
            setSchools(data.organisationUnits || []);
        } catch (err) {
            setError("Failed to load schools");
        } finally {
            setLoading(false);
        }
    };

    const fetchProgramMetadata = async () => {
        try {
            const res = await fetch(
                `${API_BASE}/programs/${SCHOOL_INSPECTION_PROGRAM_ID}?fields=programStages[id,programStageDataElements[dataElement[id]]]`,
                { headers: { Authorization: CREDENTIALS } }
            );
            const data = await res.json();
            setProgramStageId(data.programStages[0].id);
            setDataElementIds(data.programStages[0].programStageDataElements.map(el => el.dataElement.id));
        } catch (err) {
            console.error("Failed to fetch program metadata", err);
        }
    };

    const fetchResourceProgramMetadata = async () => {
        try {
            const res = await fetch(
                `${API_BASE}/programs/${RESOURCE_PROGRAM_ID}?fields=programStages[id]`,
                { headers: { Authorization: CREDENTIALS } }
            );
            const data = await res.json();
            setResourceProgramStageId(data.programStages[0].id);
        } catch (err) {
            console.error("Failed to fetch resource program metadata", err);
        }
    };

    const generateUID = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let uid = chars.charAt(Math.floor(Math.random() * 52));
        for (let i = 0; i < 10; i++) {
            uid += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return uid;
    };

    const handleSchoolInspectionSubmit = async () => {
        if (!selectedSchool || !schoolForm.reportDate) {
            alert("Please select a school and report date");
            return;
        }

        setSubmitting(true);

        const dataValues = [
            { dataElement: dataElementIds[0], value: schoolForm.hasComputerLab },
            { dataElement: dataElementIds[1], value: schoolForm.compLabCondition },
            { dataElement: dataElementIds[2], value: schoolForm.hasElectricity },
            { dataElement: dataElementIds[3], value: schoolForm.elecCondition },
            { dataElement: dataElementIds[4], value: schoolForm.hasHandwash },
            { dataElement: dataElementIds[5], value: schoolForm.handwashCondition },
            { dataElement: dataElementIds[6], value: schoolForm.hasLibrary },
            { dataElement: dataElementIds[7], value: schoolForm.libraryCondition },
            { dataElement: dataElementIds[8], value: schoolForm.classroomsTotal },
            { dataElement: dataElementIds[9], value: schoolForm.classroomsClean },
            { dataElement: dataElementIds[10], value: schoolForm.hasPlayground },
            { dataElement: dataElementIds[11], value: schoolForm.playgroundCondition },
            { dataElement: dataElementIds[12], value: schoolForm.teacherToilets },
        ].filter(dv => dv.value !== "" && dv.value !== null);

        const event = {
            event: generateUID(),
            program: SCHOOL_INSPECTION_PROGRAM_ID,
            programStage: programStageId,
            orgUnit: selectedSchool,
            occurredAt: new Date(schoolForm.reportDate).toISOString(),
            status: "ACTIVE",
            dataValues: dataValues,
        };

        try {
            const res = await fetch(`${API_BASE}/tracker?async=false`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: CREDENTIALS,
                },
                body: JSON.stringify({ events: [event] }),
            });

            if (res.ok) {
                alert("School inspection submitted successfully!");
                setActivePage("dashboard");
            } else {
                alert("Failed to submit inspection");
            }
        } catch (err) {
            alert("Error submitting inspection: " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleResourceInspectionSubmit = async () => {
        if (!selectedSchool || !resourceForm.reportDate) {
            alert("Please select a school and report date");
            return;
        }

        setSubmitting(true);

        const event = {
            event: generateUID(),
            program: RESOURCE_PROGRAM_ID,
            programStage: resourceProgramStageId,
            orgUnit: selectedSchool,
            occurredAt: new Date(resourceForm.reportDate).toISOString(),
            status: "COMPLETED",
            dataValues: [
                { dataElement: "slYohGwjQme", value: resourceForm.toilets },
                { dataElement: "fgUU2XNkGvI", value: resourceForm.seats },
                { dataElement: "m9k3VefvGQw", value: resourceForm.books },
                { dataElement: "mlbyc3CWNyb", value: resourceForm.classrooms },
                { dataElement: "x0Tro6yJ41w", value: "0" }
            ]
        };

        try {
            const res = await fetch(`${API_BASE}/tracker?async=false`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: CREDENTIALS,
                },
                body: JSON.stringify({ events: [event] }),
            });

            if (res.ok) {
                alert("Resource inspection submitted successfully!");
                setActivePage("dashboard");
            } else {
                alert("Failed to submit inspection");
            }
        } catch (err) {
            alert("Error submitting inspection: " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className={classes.loadingWrapper}>
                <CircularLoader />
            </div>
        );
    }

    if (error) {
        return <NoticeBox error title="Error">{error}</NoticeBox>;
    }

    const conditionOptions = [
        { code: "1", name: "Strongly disagree" },
        { code: "2", name: "Disagree" },
        { code: "3", name: "Undecided" },
        { code: "4", name: "Agree" },
        { code: "5", name: "Strongly agree" }
    ];

    const tabs = ["School Inspection", "Resource Count"];

    return (
        <div className={classes.pageWrapper}>
            <div className={classes.pageHeader}>
                <Button small icon={<IconArrowLeft24 />} onClick={() => setActivePage("dashboard")} />
                <h2>New Inspection</h2>
            </div>

            <div className={classes.tabCard}>
                <div className={classes.tabBar}>
                    {tabs.map((tab, idx) => (
                        <button
                            key={idx}
                            className={activeTab === idx ? classes.tabButtonActive : classes.tabButton}
                            onClick={() => setActiveTab(idx)}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className={classes.formCard}>
                <SingleSelectField
                    label="Select School"
                    selected={selectedSchool}
                    onChange={({ selected }) => setSelectedSchool(selected)}
                    required
                >
                    <SingleSelectOption value="" label="Choose a school..." />
                    {schools.map(school => (
                        <SingleSelectOption key={school.id} value={school.id} label={school.name} />
                    ))}
                </SingleSelectField>

                {activeTab === 0 ? (
                    <div className={classes.formSection}>
                        <InputField
                            label="Report Date"
                            type="date"
                            value={schoolForm.reportDate}
                            onChange={(e) => setSchoolForm({ ...schoolForm, reportDate: e.value })}
                            required
                        />

                        {[
                            { name: "hasComputerLab", label: "Computer lab for learners", condition: "compLabCondition" },
                            { name: "hasElectricity", label: "Electricity supply", condition: "elecCondition" },
                            { name: "hasHandwash", label: "Handwashing facilities", condition: "handwashCondition" },
                            { name: "hasLibrary", label: "Library", condition: "libraryCondition" },
                            { name: "hasPlayground", label: "Yard/playground", condition: "playgroundCondition" },
                        ].map((item) => (
                            <FieldSet key={item.name}>
                                <Legend>{item.label}</Legend>
                                <Radio
                                    label="Yes"
                                    checked={schoolForm[item.name] === "true"}
                                    onChange={() => setSchoolForm({ ...schoolForm, [item.name]: "true" })}
                                />
                                <Radio
                                    label="No"
                                    checked={schoolForm[item.name] === "false"}
                                    onChange={() => setSchoolForm({ ...schoolForm, [item.name]: "false" })}
                                />
                                <SingleSelectField
                                    label="Condition"
                                    selected={schoolForm[item.condition]}
                                    onChange={(e) => setSchoolForm({ ...schoolForm, [item.condition]: e.selected })}
                                >
                                    {conditionOptions.map((opt) => (
                                        <SingleSelectOption key={opt.code} label={opt.name} value={opt.code} />
                                    ))}
                                </SingleSelectField>
                            </FieldSet>
                        ))}

                        <InputField
                            label="Total classrooms"
                            type="number"
                            value={schoolForm.classroomsTotal}
                            onChange={(e) => setSchoolForm({ ...schoolForm, classroomsTotal: e.value })}
                        />
                        <InputField
                            label="Clean and secure classrooms"
                            type="number"
                            value={schoolForm.classroomsClean}
                            onChange={(e) => setSchoolForm({ ...schoolForm, classroomsClean: e.value })}
                        />
                        <InputField
                            label="Toilets for teachers"
                            type="number"
                            value={schoolForm.teacherToilets}
                            onChange={(e) => setSchoolForm({ ...schoolForm, teacherToilets: e.value })}
                        />

                        <div className={classes.navigationButtons}>
                            <Button onClick={() => setActivePage("dashboard")}>Cancel</Button>
                            <Button primary onClick={handleSchoolInspectionSubmit} disabled={submitting}>
                                {submitting ? "Submitting..." : "Submit Inspection"}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className={classes.formSection}>
                        <InputField
                            label="Report Date"
                            type="date"
                            value={resourceForm.reportDate}
                            onChange={(e) => setResourceForm({ ...resourceForm, reportDate: e.value })}
                            required
                        />
                        <InputField
                            label="Number of Toilets"
                            type="number"
                            value={resourceForm.toilets}
                            onChange={(e) => setResourceForm({ ...resourceForm, toilets: e.value })}
                        />
                        <InputField
                            label="Number of Seats"
                            type="number"
                            value={resourceForm.seats}
                            onChange={(e) => setResourceForm({ ...resourceForm, seats: e.value })}
                        />
                        <InputField
                            label="Number of Books"
                            type="number"
                            value={resourceForm.books}
                            onChange={(e) => setResourceForm({ ...resourceForm, books: e.value })}
                        />
                        <InputField
                            label="Number of Classrooms"
                            type="number"
                            value={resourceForm.classrooms}
                            onChange={(e) => setResourceForm({ ...resourceForm, classrooms: e.value })}
                        />

                        <div className={classes.navigationButtons}>
                            <Button onClick={() => setActivePage("dashboard")}>Cancel</Button>
                            <Button primary onClick={handleResourceInspectionSubmit} disabled={submitting}>
                                {submitting ? "Submitting..." : "Submit Resource Count"}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}