
import React, { useState, useEffect } from "react";
import {
    InputField,
    SingleSelectField,
    SingleSelectOption,
    Button,
    NoticeBox,
    Radio,
    FieldSet,
    Legend,
    CenteredContent,
    CircularLoader,
} from "@dhis2/ui";

export function Inspection() {
    const [programStageId, setProgramStageId] = useState("");
    const [schools, setSchools] = useState([]);
    const [selectedSchool, setSelectedSchool] = useState("");
    const [loading, setLoading] = useState(true);
    const [dataElementIds, setDataElementIds] = useState([]);
    const [form, setForm] = useState({
        reportDate: "",
        hasComputerLab: "",
        compLabCondition: "",
        hasElectricity: "",
        elecCondition: "",
        hasHandwash: "",
        handwashCondition: "",
        classroomsTotal: "",
        classroomsClean: "",
        hasYard: "",
        yardCondition: "",
        teacherToilets: "",
    });
    const [errors, setErrors] = useState([]);

    useEffect(() => {
        const fetchSchools = async () => {
            try {
                const res = await fetch(
                    "https://research.im.dhis2.org/in5320g18/api/organisationUnits?filter=level:eq:5&filter=parent.name:eq:Jambalaya%20Cluster&fields=id,name,parent[id,name]&paging=false",
                    {
                        headers: {
                            Authorization: "Basic " + btoa("admin:district"),
                        },
                    }
                );
                const data = await res.json();
                setSchools(data.organisationUnits || []);
            } catch (err) {
                console.error("Error fetching schools:", err);
            }
        };
        fetchSchools();
    }, []);
    useEffect(() => {
        const fetchDataElements = async () => {
            try {
                const res = await fetch(
                    "https://research.im.dhis2.org/in5320g18/api/programs/UxK2o06ScIe?fields=programStages[id,programStageDataElements[dataElement[id,name,code]]]",
                    {
                        headers: {
                            Authorization: "Basic " + btoa("admin:district"),
                        },
                    }
                );
                const data = await res.json();
                const stageId = data.programStages[0].id;
                setProgramStageId(stageId);
                console.log("📋 Program Stage ID:", stageId);

                const ids = data.programStages[0].programStageDataElements.map(
                    (el) => el.dataElement.id
                );
                setDataElementIds(ids);
                console.log("📋 Data Element IDs:", ids);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching data elements:", err);
                setLoading(false);
            }
        };
        fetchDataElements();
    }, []);

    const handleChange = (name, value) => setForm({ ...form, [name]: value });

    const validateInputs = () => {
        const errs = [];
        if (!selectedSchool) errs.push("You must select a school");
        if (!form.reportDate) errs.push("Report date is required");
        if (!form.hasComputerLab) errs.push("Computer lab question is required");
        if (!form.hasElectricity) errs.push("Electricity question is required");
        if (!form.hasHandwash) errs.push("Handwashing facilities question is required");
        if (!form.hasYard) errs.push("Yard/playground question is required");
        const numberFields = ["classroomsTotal", "classroomsClean", "teacherToilets"];
        numberFields.forEach((f) => {
            if (form[f] && (isNaN(form[f]) || Number(form[f]) < 0))
                errs.push(`${f} must be a valid positive number`);
        });
        return errs;
    };
    const trySubmitEvent = async (payload) => {
        const base = "https://research.im.dhis2.org/in5320g18/api";
        const url = `${base}/tracker?async=false`;

        try {
            console.log("📤 Submitting payload:", JSON.stringify(payload, null, 2));

            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Basic " + btoa("admin:district"),
                },
                body: JSON.stringify(payload),
            });

            const result = await res.json();
            console.log("📥 Full API Response:", JSON.stringify(result, null, 2));

            if (res.ok) {
                if (result.status === "ERROR") {
                    console.error("❌ Validation errors:", result.validationReport);
                    return false;
                }

                if (result.stats) {
                    console.log("📊 Stats:", result.stats);
                }

                return true;
            } else {
                console.error("❌ Failed:", result);
                return false;
            }
        } catch (err) {
            console.error("⚠️ Network error:", err);
            return false;
        }
    };

    const handleSubmit = async () => {
        const validationErrors = validateInputs();
        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }
        setErrors([]);

        const selectedSchoolObj = schools.find(s => s.id === selectedSchool);
        console.log("🏫 Submitting to school:", selectedSchoolObj?.name, `(${selectedSchool})`);
        console.log("📅 Report date:", form.reportDate);
        const dataValues = [
            { dataElement: dataElementIds[0], value: form.hasComputerLab },
            { dataElement: dataElementIds[1], value: form.compLabCondition },
            { dataElement: dataElementIds[2], value: form.hasElectricity },
            { dataElement: dataElementIds[3], value: form.elecCondition },
            { dataElement: dataElementIds[4], value: form.hasHandwash },
            { dataElement: dataElementIds[5], value: form.handwashCondition },
            { dataElement: dataElementIds[8], value: form.classroomsTotal },
            { dataElement: dataElementIds[9], value: form.classroomsClean },
            { dataElement: dataElementIds[10], value: form.hasYard },
            { dataElement: dataElementIds[11], value: form.yardCondition },
            { dataElement: dataElementIds[12], value: form.teacherToilets },
        ].filter(dv => dv.value !== "" && dv.value !== null && dv.value !== undefined);


        const event = {
            program: "UxK2o06ScIe",
            programStage: programStageId,
            orgUnit: selectedSchool,
            occurredAt: new Date(form.reportDate).toISOString(),
            status: "ACTIVE",
            dataValues: dataValues,
        };

        const payload = { events: [event] };
        const success = await trySubmitEvent(payload);

        if (success) {
            setForm({
                reportDate: "",
                hasComputerLab: "",
                compLabCondition: "",
                hasElectricity: "",
                elecCondition: "",
                hasHandwash: "",
                handwashCondition: "",
                classroomsTotal: "",
                classroomsClean: "",
                hasYard: "",
                yardCondition: "",
                teacherToilets: "",
            });
            setSelectedSchool("");
        }
    };

    const checkEvents = async () => {
        if (!selectedSchool) {
            alert("Please select a school first");
            return;
        }

        try {
            const res = await fetch(
                `https://research.im.dhis2.org/in5320g18/api/events?orgUnit=${selectedSchool}&program=UxK2o06ScIe&pageSize=50`,
                {
                    headers: {
                        Authorization: "Basic " + btoa("admin:district"),
                    },
                }
            );
            const data = await res.json();
            console.log("📋 Events for this school:", data);
            alert(`Found ${data.events?.length || 0} events for this school. Check console for details.`);
        } catch (err) {
            console.error("Error fetching events:", err);
        }
    };

    if (loading) {
        return (
            <CenteredContent>
                <CircularLoader />
            </CenteredContent>
        );
    }

    const yesNoOptions = [
        { label: "Yes", value: "true" },
        { label: "No", value: "false" },
    ];
    const conditionOptions = [
        { code: "1", name: "Strongly disagree" },
        { code: "2", name: "Disagree" },
        { code: "3", name: "Undecided" },
        { code: "4", name: "Agree" },
        { code: "5", name: "Strongly agree" }
    ];

    return (
        <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
            <h2>New School Inspection</h2>

            <SingleSelectField
                label="Organisation Unit (School)"
                selected={selectedSchool}
                onChange={(e) => setSelectedSchool(e.selected || "")}
                placeholder="Choose a school"
            >
                {schools.map((school) => (
                    <SingleSelectOption key={school.id} label={school.name} value={school.id} />
                ))}
            </SingleSelectField>

            <InputField
                label="Report Date"
                type="date"
                value={form.reportDate}
                onChange={(e) => handleChange("reportDate", e.value)}
            />

            {[
                { name: "hasComputerLab", label: "The school has a computer lab for learners", condition: "compLabCondition" },
                { name: "hasElectricity", label: "The school has an electricity supply", condition: "elecCondition" },
                { name: "hasHandwash", label: "The school has handwashing facilities", condition: "handwashCondition" },
                { name: "hasYard", label: "The school has a yard/playground", condition: "yardCondition" },
            ].map((item) => (
                <FieldSet key={item.name}>
                    <Legend>{item.label}</Legend>
                    {yesNoOptions.map((opt) => (
                        <Radio
                            key={opt.value}
                            label={opt.label}
                            checked={form[item.name] === opt.value}
                            onChange={() => handleChange(item.name, opt.value)}
                        />
                    ))}
                    <SingleSelectField
                        label="Condition"
                        selected={form[item.condition]}
                        onChange={(e) => handleChange(item.condition, e.selected)}
                        placeholder="Select condition"
                    >
                        {conditionOptions.map((opt) => (
                            <SingleSelectOption key={opt.code} label={opt.name} value={opt.code} />
                        ))}
                    </SingleSelectField>
                </FieldSet>
            ))}

            <InputField
                label="Total number of classrooms"
                type="number"
                value={form.classroomsTotal}
                onChange={(e) => handleChange("classroomsTotal", e.value)}
            />
            <InputField
                label="Number of classrooms that are clean and secure"
                type="number"
                value={form.classroomsClean}
                onChange={(e) => handleChange("classroomsClean", e.value)}
            />
            <InputField
                label="Number of toilets for teachers"
                type="number"
                value={form.teacherToilets}
                onChange={(e) => handleChange("teacherToilets", e.value)}
            />

            <div style={{ display: "flex", gap: 10 }}>
                <Button primary onClick={handleSubmit}>
                    Submit Inspection
                </Button>
            </div>

            {errors.length > 0 && (
                <NoticeBox error title="Validation Errors">
                    {errors.map((e, i) => (
                        <div key={i}>{e}</div>
                    ))}
                </NoticeBox>
            )}
        </div>
    );
}