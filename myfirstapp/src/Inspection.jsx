
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
    // ============================================================================
    // STATE MANAGEMENT
    // ============================================================================

    // Stores the DHIS2 program stage ID (required for event submission)
    const [programStageId, setProgramStageId] = useState("");

    // List of all schools fetched from DHIS2 (organisation units at level 5)
    const [schools, setSchools] = useState([]);

    // Currently selected school ID from the dropdown
    const [selectedSchool, setSelectedSchool] = useState("");

    // Loading state to show spinner while fetching initial data
    const [loading, setLoading] = useState(true);

    // Array of data element IDs in the correct order (used for mapping form values to DHIS2)
    const [dataElementIds, setDataElementIds] = useState([]);

    // Form state containing all user inputs
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

    // Validation errors to display to the user
    const [errors, setErrors] = useState([]);

    // ============================================================================
    // DATA FETCHING - Runs once when component mounts
    // ============================================================================

    /**
     * Fetches the list of schools (organisation units) from DHIS2
     * Filters for level 5 units under "Jambalaya Cluster"
     */
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

    /**
     * Fetches program metadata including:
     * - Program Stage ID (required for event submission)
     * - Data Element IDs (used to map form fields to DHIS2 data elements)
     */
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

                // Extract and store program stage ID
                const stageId = data.programStages[0].id;
                setProgramStageId(stageId);
                console.log("📋 Program Stage ID:", stageId);

                // Extract data element IDs in order
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

    // ============================================================================
    // FORM HANDLING
    // ============================================================================

    /**
     * Updates form state when any input changes
     * @param {string} name - The form field name
     * @param {string} value - The new value
     */
    const handleChange = (name, value) => setForm({ ...form, [name]: value });

    /**
     * Validates all required form fields before submission
     * @returns {string[]} Array of error messages (empty if valid)
     */
    const validateInputs = () => {
        const errs = [];

        // Required field validations
        if (!selectedSchool) errs.push("You must select a school");
        if (!form.reportDate) errs.push("Report date is required");
        if (!form.hasComputerLab) errs.push("Computer lab question is required");
        if (!form.hasElectricity) errs.push("Electricity question is required");
        if (!form.hasHandwash) errs.push("Handwashing facilities question is required");
        if (!form.hasYard) errs.push("Yard/playground question is required");

        // Number field validations
        const numberFields = ["classroomsTotal", "classroomsClean", "teacherToilets"];
        numberFields.forEach((f) => {
            if (form[f] && (isNaN(form[f]) || Number(form[f]) < 0))
                errs.push(`${f} must be a valid positive number`);
        });

        return errs;
    };

    // ============================================================================
    // DHIS2 SUBMISSION
    // ============================================================================

    /**
     * Submits event data to DHIS2 Tracker API
     * @param {Object} payload - The event payload in DHIS2 format
     * @returns {boolean} True if submission succeeded, false otherwise
     */
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

            // Check for validation errors in successful HTTP response
            if (res.ok) {
                if (result.status === "ERROR") {
                    console.error("❌ Validation errors:", result.validationReport);
                    alert("Submission failed with validation errors. Check console for details.");
                    return false;
                }

                if (result.stats) {
                    console.log("📊 Stats:", result.stats);
                }

                alert("✅ Inspection submitted successfully!");
                return true;
            } else {
                console.error("❌ Failed:", result);
                alert(`Submission failed: ${result.message || 'Unknown error'}`);
                return false;
            }
        } catch (err) {
            console.error("⚠️ Network error:", err);
            alert("Network error. Check console for details.");
            return false;
        }
    };

    /**
     * Main form submission handler
     * Validates inputs, builds DHIS2 event payload, and submits to API
     */
    const handleSubmit = async () => {
        // Step 1: Validate all inputs
        const validationErrors = validateInputs();
        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }
        setErrors([]);

        // Step 2: Log submission details for debugging
        const selectedSchoolObj = schools.find(s => s.id === selectedSchool);
        console.log("🏫 Submitting to school:", selectedSchoolObj?.name, `(${selectedSchool})`);
        console.log("📅 Report date:", form.reportDate);

        // Step 3: Build data values array mapping form fields to data element IDs
        // Note: Indices match the order of data elements in programStageDataElements
        const dataValues = [
            { dataElement: dataElementIds[0], value: form.hasComputerLab },      // Has computer lab (Yes/No)
            { dataElement: dataElementIds[1], value: form.compLabCondition },    // Computer lab condition
            { dataElement: dataElementIds[2], value: form.hasElectricity },      // Has electricity (Yes/No)
            { dataElement: dataElementIds[3], value: form.elecCondition },       // Electricity condition
            { dataElement: dataElementIds[4], value: form.hasHandwash },         // Has handwashing (Yes/No)
            { dataElement: dataElementIds[5], value: form.handwashCondition },   // Handwashing condition
            { dataElement: dataElementIds[8], value: form.classroomsTotal },     // Total classrooms
            { dataElement: dataElementIds[9], value: form.classroomsClean },     // Clean classrooms
            { dataElement: dataElementIds[10], value: form.hasYard },            // Has yard (Yes/No)
            { dataElement: dataElementIds[11], value: form.yardCondition },      // Yard condition
            { dataElement: dataElementIds[12], value: form.teacherToilets },     // Teacher toilets
        ].filter(dv => dv.value !== "" && dv.value !== null && dv.value !== undefined);

        // Step 4: Build DHIS2 event object
        const event = {
            program: "UxK2o06ScIe",                          // School Inspection program ID
            programStage: programStageId,                     // Program stage ID (fetched on load)
            orgUnit: selectedSchool,                          // Selected school ID
            occurredAt: new Date(form.reportDate).toISOString(), // Event date in ISO format
            status: "ACTIVE",                                 // Event status
            dataValues: dataValues,                           // Form data mapped to data elements
        };

        // Step 5: Wrap event in payload structure required by Tracker API
        const payload = { events: [event] };

        // Step 6: Submit to DHIS2
        const success = await trySubmitEvent(payload);

        // Step 7: Reset form on successful submission
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

    // ============================================================================
    // RENDERING
    // ============================================================================

    // Show loading spinner while fetching initial data
    if (loading) {
        return (
            <CenteredContent>
                <CircularLoader />
            </CenteredContent>
        );
    }

    // Radio button options for Yes/No questions
    const yesNoOptions = [
        { label: "Yes", value: "true" },
        { label: "No", value: "false" },
    ];

    // Dropdown options for condition fields (agreement scale)
    // Codes are numeric strings (1-5) as required by DHIS2 optionSets
    const conditionOptions = [
        { code: "1", name: "Strongly disagree" },
        { code: "2", name: "Disagree" },
        { code: "3", name: "Undecided" },
        { code: "4", name: "Agree" },
        { code: "5", name: "Strongly agree" }
    ];

    // Configuration for Yes/No + Condition field groups
    const fieldGroups = [
        { name: "hasComputerLab", label: "The school has a computer lab for learners", condition: "compLabCondition" },
        { name: "hasElectricity", label: "The school has an electricity supply", condition: "elecCondition" },
        { name: "hasHandwash", label: "The school has handwashing facilities", condition: "handwashCondition" },
        { name: "hasYard", label: "The school has a yard/playground", condition: "yardCondition" },
    ];

    return (
        <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
            <h2>New School Inspection</h2>

            {/* School Selection */}
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

            {/* Report Date */}
            <InputField
                label="Report Date"
                type="date"
                value={form.reportDate}
                onChange={(e) => handleChange("reportDate", e.value)}
            />

            {/* Yes/No + Condition Field Groups */}
            {fieldGroups.map((item) => (
                <FieldSet key={item.name}>
                    <Legend>{item.label}</Legend>

                    {/* Yes/No Radio Buttons */}
                    {yesNoOptions.map((opt) => (
                        <Radio
                            key={opt.value}
                            label={opt.label}
                            checked={form[item.name] === opt.value}
                            onChange={() => handleChange(item.name, opt.value)}
                        />
                    ))}

                    {/* Condition Dropdown */}
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

            {/* Number Input Fields */}
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

            {/* Submit Button */}
            <Button primary onClick={handleSubmit}>
                Submit Inspection
            </Button>

            {/* Validation Error Display */}
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