<<<<<<< HEAD
import React, { useState, useEffect } from 'react';
import {
    Table,
    TableHead,
    TableRowHead,
    TableCellHead,
    TableBody,
    TableRow,
    TableCell,
    CircularLoader,
    NoticeBox,
    Button,
    Modal,
    ModalTitle,
    ModalContent,
    ModalActions,
    ButtonStrip,
    InputField,
    SingleSelectField,
    SingleSelectOption,
    Radio,
    FieldSet,
    Legend,
=======
import React, { useState, useEffect, useMemo } from "react";
import {
    Card,
    InputField,
    SingleSelectField,
    SingleSelectOption,
    Button,
    NoticeBox,
    CircularLoader,
    IconCheckmarkCircle24,
    IconWarningFilled24,
    IconInfoFilled24,
    IconArrowLeft24,
    TabBar,
    Tab,
    TextAreaField,
    IconInfo24,
    IconUserGroup24,
    IconStar24,
    IconHome24,
    IconVisualizationColumn24
>>>>>>> Tina
} from "@dhis2/ui";
import classes from "./Inspection.module.css";
import {
    validateInspectionForm,
    calculateRatios,
    getRatioStatus,
    formatRatio,
    buildEventPayload,
    saveInspectionLocally,
    PROGRAM_CONFIG,
    EDUTOPIA_STANDARDS,
} from "./inspectionUtils";

<<<<<<< HEAD
export default function Inspection() {
    const [schools, setSchools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [inspectionType, setInspectionType] = useState(null);

    // Resource inspection state
    const [resourceForm, setResourceForm] = useState({
        reportDate: "",
        toilets: "",
        seats: "",
        books: "",
        classrooms: ""
    });

    // School inspection state
    const [schoolForm, setSchoolForm] = useState({
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

    const [programStageId, setProgramStageId] = useState("");
    const [dataElementIds, setDataElementIds] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [submitErrors, setSubmitErrors] = useState([]);

    const RESOURCE_PROGRAM_ID = 'uvpW17dnfUS';
    const SCHOOL_INSPECTION_PROGRAM_ID = 'UxK2o06ScIe';

    // Fetch schools
    useEffect(() => {
=======
/**
 * IMPROVED INSPECTION COMPONENT
 *
 * Features:
 * - Multi-step form with validation
 * - Real-time ratio calculations
 * - Visual feedback for standards compliance
 * - Offline support with local storage
 * - Comprehensive inspection summary
 * - Mobile-friendly responsive design
 */
export default function Inspection({ setActivePage }) {
    // ========================================
    // STATE MANAGEMENT
    // ========================================

    // Form step management
    const [activeStep, setActiveStep] = useState(0);

    // Loading states
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Data from API
    const [schools, setSchools] = useState([]);
    const [programStageId, setProgramStageId] = useState("");
    const [dataElementMap, setDataElementMap] = useState({});

    // Form data
    const [formData, setFormData] = useState({
        schoolId: "",
        inspectionDate: new Date().toISOString().split("T")[0],
        boysEnrolled: "",
        girlsEnrolled: "",
        maleTeachers: "",
        femaleTeachers: "",
        classrooms: "",
        seats: "",
        toilets: "",
        textbooks: "",
        electricity: "",
        handwashing: "",
        computerLab: "",
        observations: "",
    });

    // Validation
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    // Success/error messages
    const [submitStatus, setSubmitStatus] = useState(null); // { type: 'success'|'error', message: '' }

    // ========================================
    // DATA FETCHING
    // ========================================

    // Fetch schools
    useEffect(() => {
        const fetchSchools = async () => {
            try {
                const res = await fetch(
                    `${PROGRAM_CONFIG.apiBase}/organisationUnits?filter=level:eq:5&filter=parent.name:eq:Jambalaya%20Cluster&fields=id,name&paging=false`,
                    {
                        headers: {
                            Authorization: `Basic ${PROGRAM_CONFIG.credentials}`,
                        },
                    }
                );
                const data = await res.json();
                setSchools(data.organisationUnits || []);
            } catch (err) {
                console.error("Error fetching schools:", err);
            }
        };
>>>>>>> Tina
        fetchSchools();
        fetchSchoolInspectionDataElements();
    }, []);

<<<<<<< HEAD
    const fetchSchools = async () => {
        try {
            const res = await fetch(
                "https://research.im.dhis2.org/in5320g20/api/organisationUnits?filter=level:eq:5&filter=parent.name:eq:Jambalaya%20Cluster&fields=id,name&pageSize=1000",
                {
                    headers: {
                        Authorization: 'Basic ' + btoa('admin:district'),
                    },
                }
            );

            const data = await res.json();
            const schoolList = data.organisationUnits || [];
            setSchools(schoolList);
            setLoading(false);
        } catch (err) {
            setError("Failed to fetch schools: " + err.message);
            setLoading(false);
        }
    };

    const fetchSchoolInspectionDataElements = async () => {
        try {
            const res = await fetch(
                `https://research.im.dhis2.org/in5320g20/api/programs/${SCHOOL_INSPECTION_PROGRAM_ID}?fields=programStages[id,programStageDataElements[dataElement[id,name,code]]]`,
                {
                    headers: {
                        Authorization: "Basic " + btoa("admin:district"),
                    },
                }
            );
            const data = await res.json();

            const stageId = data.programStages[0].id;
            setProgramStageId(stageId);

            const ids = data.programStages[0].programStageDataElements.map(
                (el) => el.dataElement.id
            );
            setDataElementIds(ids);
            console.log("📋 School Inspection Program Stage ID:", stageId);
            console.log("📋 School Inspection Data Element IDs:", ids);
        } catch (err) {
            console.error("Error fetching data elements:", err);
        }
    };

    const handleSchoolClick = (school) => {
        setSelectedSchool(school);
        setShowModal(true);
        setInspectionType(null);
    };

    const handleInspectionTypeSelect = (type) => {
        setInspectionType(type);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedSchool(null);
        setInspectionType(null);
        setResourceForm({
            reportDate: "",
            toilets: "",
            seats: "",
            books: "",
            classrooms: ""
        });
        setSchoolForm({
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
        setSubmitErrors([]);
    };

    // Resource inspection submission
    const submitResourceInspection = async () => {
        const errors = [];
        if (!resourceForm.reportDate) errors.push("Report date is required");
        if (!resourceForm.toilets) errors.push("Number of toilets is required");
        if (!resourceForm.seats) errors.push("Number of seats is required");
        if (!resourceForm.books) errors.push("Number of books is required");
        if (!resourceForm.classrooms) errors.push("Number of classrooms is required");

        if (errors.length > 0) {
            setSubmitErrors(errors);
=======
    // Fetch program stage and data elements
    useEffect(() => {
        const fetchProgramConfig = async () => {
            try {
                const res = await fetch(
                    `${PROGRAM_CONFIG.apiBase}/programs/${PROGRAM_CONFIG.programId}?fields=programStages[id,programStageDataElements[dataElement[id,code]]]`,
                    {
                        headers: {
                            Authorization: `Basic ${PROGRAM_CONFIG.credentials}`,
                        },
                    }
                );
                const data = await res.json();

                const stageId = data.programStages[0].id;
                setProgramStageId(stageId);

                // Create mapping of codes to IDs
                const mapping = {};
                data.programStages[0].programStageDataElements.forEach((psde) => {
                    const code = psde.dataElement.code;
                    const id = psde.dataElement.id;
                    mapping[code] = id;
                });
                setDataElementMap(mapping);

                setLoading(false);
            } catch (err) {
                console.error("Error fetching program config:", err);
                setLoading(false);
            }
        };
        fetchProgramConfig();
    }, []);

    // ========================================
    // COMPUTED VALUES
    // ========================================

    // Calculate ratios in real-time
    const ratios = useMemo(() => calculateRatios(formData), [formData]);

    // Get selected school name
    const selectedSchool = schools.find(s => s.id === formData.schoolId);

    // Check if current step is valid
    const isStepValid = (step) => {
        if (step === 0) {
            // Basic info - only require school and date
            return formData.schoolId !== "" && formData.inspectionDate !== "";
        } else if (step === 1) {
            // Demographics - only require that fields are filled
            return formData.boysEnrolled !== "" && formData.girlsEnrolled !== "" &&
                   formData.maleTeachers !== "" && formData.femaleTeachers !== "";
        } else if (step === 2) {
            // Resources - only require that fields are filled
            return formData.classrooms !== "" && formData.seats !== "" &&
                   formData.toilets !== "" && formData.textbooks !== "";
        } else if (step === 3) {
            // Facilities - only require that facilities are selected
            return formData.electricity !== "" && formData.handwashing !== "" &&
                   formData.computerLab !== "";
        }
        return true;
    };

    // ========================================
    // EVENT HANDLERS
    // ========================================

    const handleFieldChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setTouched(prev => ({ ...prev, [field]: true }));

        // Clear error for this field
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleBlur = (field) => {
        setTouched(prev => ({ ...prev, [field]: true }));
    };

    const handleNextStep = () => {
        if (activeStep < 4) {
            setActiveStep(activeStep + 1);
        }
    };

    const handlePreviousStep = () => {
        if (activeStep > 0) {
            setActiveStep(activeStep - 1);
        }
    };

    const handleSubmit = async () => {
        // Final validation
        const validation = validateInspectionForm(formData);

        if (!validation.isValid) {
            setErrors(validation.errors);

            // Create detailed error message
            const errorMessages = Object.values(validation.errors).join(", ");
            setSubmitStatus({
                type: "error",
                message: `Please fix the following errors: ${errorMessages}`
            });

            // Find first step with error
            for (let i = 0; i < 4; i++) {
                if (!isStepValid(i)) {
                    setActiveStep(i);
                    break;
                }
            }
>>>>>>> Tina
            return;
        }

        setSubmitting(true);
<<<<<<< HEAD
        setSubmitErrors([]);

        const event = {
            program: RESOURCE_PROGRAM_ID,
            orgUnit: selectedSchool.id,
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
            const res = await fetch(
                "https://research.im.dhis2.org/in5320g20/api/tracker?async=false",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Basic " + btoa("admin:district"),
                    },
                    body: JSON.stringify({ events: [event] }),
                }
            );

            const result = await res.json();
            console.log("📤 Resource Inspection API Response:", result);

            if (res.ok && result.status !== "ERROR") {
                alert("Resource inspection submitted successfully!");
                handleCloseModal();
            } else {
                console.error("❌ Submission failed:", result);
                setSubmitErrors(["Failed to submit inspection. Check console for details."]);
            }
        } catch (err) {
            console.error("❌ Network error:", err);
            setSubmitErrors(["Network error: " + err.message]);
        } finally {
            setSubmitting(false);
        }
    };

    // School inspection submission
    const submitSchoolInspection = async () => {
        const errors = [];
        if (!schoolForm.reportDate) errors.push("Report date is required");
        if (!schoolForm.hasComputerLab) errors.push("Computer lab question is required");
        if (!schoolForm.hasElectricity) errors.push("Electricity question is required");
        if (!schoolForm.hasHandwash) errors.push("Handwashing facilities question is required");
        if (!schoolForm.hasYard) errors.push("Yard/playground question is required");

        if (errors.length > 0) {
            setSubmitErrors(errors);
            return;
        }

        setSubmitting(true);
        setSubmitErrors([]);

        const dataValues = [
            { dataElement: dataElementIds[0], value: schoolForm.hasComputerLab },
            { dataElement: dataElementIds[1], value: schoolForm.compLabCondition },
            { dataElement: dataElementIds[2], value: schoolForm.hasElectricity },
            { dataElement: dataElementIds[3], value: schoolForm.elecCondition },
            { dataElement: dataElementIds[4], value: schoolForm.hasHandwash },
            { dataElement: dataElementIds[5], value: schoolForm.handwashCondition },
            { dataElement: dataElementIds[8], value: schoolForm.classroomsTotal },
            { dataElement: dataElementIds[9], value: schoolForm.classroomsClean },
            { dataElement: dataElementIds[10], value: schoolForm.hasYard },
            { dataElement: dataElementIds[11], value: schoolForm.yardCondition },
            { dataElement: dataElementIds[12], value: schoolForm.teacherToilets },
        ].filter(dv => dv.value !== "" && dv.value !== null && dv.value !== undefined);

        const event = {
            program: SCHOOL_INSPECTION_PROGRAM_ID,
            programStage: programStageId,
            orgUnit: selectedSchool.id,
            occurredAt: new Date(schoolForm.reportDate).toISOString(),
            status: "ACTIVE",
            dataValues: dataValues,
        };

        try {
            const res = await fetch(
                "https://research.im.dhis2.org/in5320g20/api/tracker?async=false",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Basic " + btoa("admin:district"),
                    },
                    body: JSON.stringify({ events: [event] }),
                }
            );

            const result = await res.json();
            console.log("📤 School Inspection API Response:", result);

            if (res.ok && result.status !== "ERROR") {
                alert("School inspection submitted successfully!");
                handleCloseModal();
            } else {
                console.error("❌ Submission failed:", result);
                setSubmitErrors(["Failed to submit inspection. Check console for details."]);
            }
        } catch (err) {
            console.error("❌ Network error:", err);
            setSubmitErrors(["Network error: " + err.message]);
=======
        setSubmitStatus(null);

        try {
            // Build payload
            const payload = buildEventPayload(formData, programStageId, dataElementMap);

            // Submit to DHIS2
            const res = await fetch(
                `${PROGRAM_CONFIG.apiBase}/tracker?async=false`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Basic ${PROGRAM_CONFIG.credentials}`,
                    },
                    body: JSON.stringify(payload),
                }
            );

            const result = await res.json();

            if (res.ok && result.status !== "ERROR") {
                // Success
                setSubmitStatus({
                    type: "success",
                    message: `Inspection successfully recorded for ${selectedSchool?.name}!`,
                });

                // Reset form
                setTimeout(() => {
                    resetForm();
                }, 2000);
            } else {
                // DHIS2 validation error
                console.error("DHIS2 validation error:", result);

                // Try to save locally for offline support
                const localKey = saveInspectionLocally({
                    ...formData,
                    schoolName: selectedSchool?.name,
                });

                setSubmitStatus({
                    type: "warning",
                    message: `Could not sync with server. Inspection saved locally (${localKey}). Will sync when connection is restored.`,
                });
            }
        } catch (error) {
            console.error("Submit error:", error);

            // Save locally
            const localKey = saveInspectionLocally({
                ...formData,
                schoolName: selectedSchool?.name,
            });

            setSubmitStatus({
                type: "error",
                message: `Network error. Inspection saved locally (${localKey}). Will sync when connection is restored.`,
            });
>>>>>>> Tina
        } finally {
            setSubmitting(false);
        }
    };

<<<<<<< HEAD
    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", padding: "50px" }}>
                <CircularLoader />
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: "20px" }}>
                <NoticeBox error title="Error loading data">
                    {error}
                </NoticeBox>
            </div>
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
        <div style={{ padding: "20px" }}>
            <h1>School Inspection</h1>
            <p>Select a school to perform a resource inspection or school facilities inspection.</p>

            <Table>
                <TableHead>
                    <TableRowHead>
                        <TableCellHead>School Name</TableCellHead>
                        <TableCellHead>Actions</TableCellHead>
                    </TableRowHead>
                </TableHead>

                <TableBody>
                    {schools.map((school) => (
                        <TableRow key={school.id}>
                            <TableCell>{school.name}</TableCell>
                            <TableCell>
                                <Button small onClick={() => handleSchoolClick(school)}>
                                    Inspect
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            {/* Modal for inspection type selection and forms */}
            {showModal && (
                <Modal large onClose={handleCloseModal}>
                    <ModalTitle>
                        {inspectionType ?
                            `${inspectionType === 'resource' ? 'Resource' : 'School'} Inspection - ${selectedSchool?.name}` :
                            `Choose Inspection Type - ${selectedSchool?.name}`
                        }
                    </ModalTitle>
                    <ModalContent>
                        {!inspectionType ? (
                            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', padding: '40px' }}>
                                <Button large onClick={() => handleInspectionTypeSelect('resource')}>
                                    Resource Inspection
                                </Button>
                                <Button large onClick={() => handleInspectionTypeSelect('school')}>
                                    School Inspection
                                </Button>
                            </div>
                        ) : inspectionType === 'resource' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <InputField
                                    label="Report Date"
                                    type="date"
                                    value={resourceForm.reportDate}
                                    onChange={(e) => setResourceForm({ ...resourceForm, reportDate: e.value })}
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
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <InputField
                                    label="Report Date"
                                    type="date"
                                    value={schoolForm.reportDate}
                                    onChange={(e) => setSchoolForm({ ...schoolForm, reportDate: e.value })}
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
                                                checked={schoolForm[item.name] === opt.value}
                                                onChange={() => setSchoolForm({ ...schoolForm, [item.name]: opt.value })}
                                            />
                                        ))}
                                        <SingleSelectField
                                            label="Condition"
                                            selected={schoolForm[item.condition]}
                                            onChange={(e) => setSchoolForm({ ...schoolForm, [item.condition]: e.selected })}
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
                                    value={schoolForm.classroomsTotal}
                                    onChange={(e) => setSchoolForm({ ...schoolForm, classroomsTotal: e.value })}
                                />
                                <InputField
                                    label="Number of classrooms that are clean and secure"
                                    type="number"
                                    value={schoolForm.classroomsClean}
                                    onChange={(e) => setSchoolForm({ ...schoolForm, classroomsClean: e.value })}
                                />
                                <InputField
                                    label="Number of toilets for teachers"
                                    type="number"
                                    value={schoolForm.teacherToilets}
                                    onChange={(e) => setSchoolForm({ ...schoolForm, teacherToilets: e.value })}
                                />
                            </div>
                        )}

                        {submitErrors.length > 0 && (
                            <NoticeBox error title="Validation Errors" style={{ marginTop: '20px' }}>
                                {submitErrors.map((e, i) => (
                                    <div key={i}>{e}</div>
                                ))}
                            </NoticeBox>
                        )}
                    </ModalContent>
                    <ModalActions>
                        <ButtonStrip>
                            <Button onClick={handleCloseModal}>Cancel</Button>
                            {inspectionType && (
                                <Button
                                    primary
                                    onClick={inspectionType === 'resource' ? submitResourceInspection : submitSchoolInspection}
                                    disabled={submitting}
                                >
                                    {submitting ? 'Submitting...' : 'Submit Inspection'}
                                </Button>
                            )}
                        </ButtonStrip>
                    </ModalActions>
                </Modal>
=======
    const resetForm = () => {
        setFormData({
            schoolId: "",
            inspectionDate: new Date().toISOString().split("T")[0],
            boysEnrolled: "",
            girlsEnrolled: "",
            maleTeachers: "",
            femaleTeachers: "",
            classrooms: "",
            seats: "",
            toilets: "",
            textbooks: "",
            electricity: "",
            handwashing: "",
            computerLab: "",
            observations: "",
        });
        setErrors({});
        setTouched({});
        setActiveStep(0);
        setSubmitStatus(null);
    };

    // ========================================
    // RENDER HELPERS
    // ========================================

    const renderRatioIndicator = (ratioKey, value, label) => {
        const status = getRatioStatus(ratioKey, value);
        const standard = EDUTOPIA_STANDARDS[ratioKey];

        if (value === null) {
            return null;
        }

        return (
            <div className={classes.ratioIndicator}>
                <div className={classes.ratioHeader}>
                    <span className={classes.ratioLabel}>{label}</span>
                    {status.status === "adequate" && <IconCheckmarkCircle24 style={{ color: status.color }} />}
                    {status.status === "warning" && <IconWarningFilled24 style={{ color: status.color }} />}
                    {status.status === "critical" && <IconWarningFilled24 style={{ color: status.color }} />}
                </div>
                <div className={classes.ratioValue} style={{ color: status.color }}>
                    {formatRatio(value, ratioKey.includes("GPI") ? 2 : 1)}
                    {ratioKey.includes("PerLearner") || ratioKey.includes("GPI") ? "" : ":1"}
                </div>
                <div className={classes.ratioStatus} style={{ color: status.color }}>
                    {status.label}
                </div>
                <div className={classes.ratioStandard}>
                    Standard: {standard.threshold}
                </div>
            </div>
        );
    };

    // ========================================
    // LOADING STATE
    // ========================================

    if (loading) {
        return (
            <div className={classes.loadingWrapper}>
                <CircularLoader />
            </div>
        );
    }

    // ========================================
    // RENDER COMPONENT
    // ========================================

    return (
        <div className={classes.pageWrapper}>
            {/* HEADER */}
            <div className={classes.pageHeader}>
                {setActivePage && (
                    <Button
                        small
                        icon={<IconArrowLeft24 />}
                        onClick={() => setActivePage("dashboard")}
                    >
                    </Button>
                )}
                <h2>School Inspection Form</h2>
            </div>

            {/* SUBMIT STATUS */}
            {submitStatus && (
                <NoticeBox
                    title={submitStatus.type === "success" ? "Success" : submitStatus.type === "error" ? "Error" : "Warning"}
                    warning={submitStatus.type === "warning"}
                    error={submitStatus.type === "error"}
                    valid={submitStatus.type === "success"}
                >
                    {submitStatus.message}
                </NoticeBox>
>>>>>>> Tina
            )}

            {/* PROGRESS TABS */}
<Card className={classes.tabCard}>
    <TabBar fixed>

        <Tab
            selected={activeStep === 0}
            onClick={() => setActiveStep(0)}
        >
            <IconInfo24/>
        </Tab>

        <Tab
            selected={activeStep === 1}
            onClick={() => setActiveStep(1)}
            disabled={!isStepValid(0)}
        >
            <IconUserGroup24 />
        </Tab>

        <Tab
            selected={activeStep === 2}
            onClick={() => setActiveStep(2)}
            disabled={!isStepValid(0) || !isStepValid(1)}
        >
            <IconStar24 />
        </Tab>

        <Tab
            selected={activeStep === 3}
            onClick={() => setActiveStep(3)}
            disabled={!isStepValid(0) || !isStepValid(1) || !isStepValid(2)}
        >
            <IconHome24 />
        </Tab>

        <Tab
            selected={activeStep === 4}
            onClick={() => setActiveStep(4)}
            disabled={!isStepValid(0) || !isStepValid(1) || !isStepValid(2) || !isStepValid(3)}
        >
            <IconVisualizationColumn24 />
        </Tab>

    </TabBar>
</Card>


            {/* STEP 0: BASIC INFO */}
            {activeStep === 0 && (
                <Card className={classes.formCard}>
                    <h3>Basic Information</h3>
                    <p className={classes.sectionDescription}>
                        Select the school you're inspecting and the inspection date.
                    </p>

                    <div className={classes.formSection}>
                        <SingleSelectField
                            label="School"
                            placeholder="Select a school"
                            selected={formData.schoolId}
                            onChange={({ selected }) => handleFieldChange("schoolId", selected)}
                            onBlur={() => handleBlur("schoolId")}
                            error={touched.schoolId && errors.schoolId}
                            validationText={touched.schoolId && errors.schoolId}
                            required
                        >
                            {schools.map(school => (
                                <SingleSelectOption
                                    key={school.id}
                                    value={school.id}
                                    label={school.name}
                                />
                            ))}
                        </SingleSelectField>

                        <InputField
                            label="Inspection Date"
                            type="date"
                            value={formData.inspectionDate}
                            onChange={({ value }) => handleFieldChange("inspectionDate", value)}
                            onBlur={() => handleBlur("inspectionDate")}
                            error={touched.inspectionDate && !!errors.inspectionDate}
                            validationText={touched.inspectionDate && errors.inspectionDate}
                            required
                            helpText="Date when this inspection is being conducted"
                        />
                    </div>

                    <div className={classes.navigationButtons}>
                        <Button
                            primary
                            onClick={handleNextStep}
                            disabled={!isStepValid(0)}
                        >
                            Next: Demographics
                        </Button>
                    </div>
                </Card>
            )}

            {/* STEP 1: DEMOGRAPHICS */}
            {activeStep === 1 && (
                <Card className={classes.formCard}>
                    <h3>Demographics</h3>
                    <p className={classes.sectionDescription}>
                        Enter the number of learners and teachers. This data is used to calculate key ratios.
                    </p>

                    <div className={classes.formSection}>
                        <h4 className={classes.subsectionTitle}>Learner Enrollment</h4>
                        <div className={classes.formRow}>
                            <InputField
                                label="Boys Enrolled"
                                type="number"
                                min="0"
                                value={formData.boysEnrolled}
                                onChange={({ value }) => handleFieldChange("boysEnrolled", value)}
                                onBlur={() => handleBlur("boysEnrolled")}
                                error={touched.boysEnrolled && !!errors.boysEnrolled}
                                validationText={touched.boysEnrolled && errors.boysEnrolled}
                                required
                            />
                            <InputField
                                label="Girls Enrolled"
                                type="number"
                                min="0"
                                value={formData.girlsEnrolled}
                                onChange={({ value }) => handleFieldChange("girlsEnrolled", value)}
                                onBlur={() => handleBlur("girlsEnrolled")}
                                error={touched.girlsEnrolled && !!errors.girlsEnrolled}
                                validationText={touched.girlsEnrolled && errors.girlsEnrolled}
                                required
                            />
                        </div>

                        {ratios.totalLearners > 0 && (
                            <div className={classes.infoBox}>
                                <IconInfoFilled24 />
                                <span>Total learners: <strong>{ratios.totalLearners}</strong></span>
                            </div>
                        )}

                        <h4 className={classes.subsectionTitle}>Teaching Staff</h4>
                        <div className={classes.formRow}>
                            <InputField
                                label="Male Teachers"
                                type="number"
                                min="0"
                                value={formData.maleTeachers}
                                onChange={({ value }) => handleFieldChange("maleTeachers", value)}
                                onBlur={() => handleBlur("maleTeachers")}
                                error={touched.maleTeachers && !!errors.maleTeachers}
                                validationText={touched.maleTeachers && errors.maleTeachers}
                                required
                            />
                            <InputField
                                label="Female Teachers"
                                type="number"
                                min="0"
                                value={formData.femaleTeachers}
                                onChange={({ value }) => handleFieldChange("femaleTeachers", value)}
                                onBlur={() => handleBlur("femaleTeachers")}
                                error={touched.femaleTeachers && !!errors.femaleTeachers}
                                validationText={touched.femaleTeachers && errors.femaleTeachers}
                                required
                            />
                        </div>

                        {ratios.totalTeachers > 0 && (
                            <div className={classes.infoBox}>
                                <IconInfoFilled24 />
                                <span>Total teachers: <strong>{ratios.totalTeachers}</strong></span>
                            </div>
                        )}
                    </div>

                    <div className={classes.navigationButtons}>
                        <Button onClick={handlePreviousStep}>
                            Previous
                        </Button>
                        <Button
                            primary
                            onClick={handleNextStep}
                            disabled={!isStepValid(1)}
                        >
                            Next: Resources
                        </Button>
                    </div>
                </Card>
            )}

            {/* STEP 2: RESOURCES */}
            {activeStep === 2 && (
                <Card className={classes.formCard}>
                    <h3>Resources</h3>
                    <p className={classes.sectionDescription}>
                        Enter the number of classrooms, seats, toilets, and textbooks available.
                    </p>

                    <div className={classes.formSection}>
                        <div className={classes.formRow}>
                            <InputField
                                label="Classrooms"
                                type="number"
                                min="1"
                                value={formData.classrooms}
                                onChange={({ value }) => handleFieldChange("classrooms", value)}
                                onBlur={() => handleBlur("classrooms")}
                                error={touched.classrooms && !!errors.classrooms}
                                validationText={touched.classrooms && errors.classrooms}
                                required
                                helpText="Total number of classrooms"
                            />
                            <InputField
                                label="Seats/Desks"
                                type="number"
                                min="0"
                                value={formData.seats}
                                onChange={({ value }) => handleFieldChange("seats", value)}
                                onBlur={() => handleBlur("seats")}
                                error={touched.seats && !!errors.seats}
                                validationText={touched.seats && errors.seats}
                                required
                                helpText="Total seating capacity"
                            />
                        </div>

                        <div className={classes.formRow}>
                            <InputField
                                label="Toilets"
                                type="number"
                                min="1"
                                value={formData.toilets}
                                onChange={({ value }) => handleFieldChange("toilets", value)}
                                onBlur={() => handleBlur("toilets")}
                                error={touched.toilets && !!errors.toilets}
                                validationText={touched.toilets && errors.toilets}
                                required
                                helpText="Total number of toilets"
                            />
                            <InputField
                                label="Textbooks"
                                type="number"
                                min="0"
                                value={formData.textbooks}
                                onChange={({ value }) => handleFieldChange("textbooks", value)}
                                onBlur={() => handleBlur("textbooks")}
                                error={touched.textbooks && !!errors.textbooks}
                                validationText={touched.textbooks && errors.textbooks}
                                required
                                helpText="Total textbooks available"
                            />
                        </div>
                    </div>

                    <div className={classes.navigationButtons}>
                        <Button onClick={handlePreviousStep}>
                            Previous
                        </Button>
                        <Button
                            primary
                            onClick={handleNextStep}
                            disabled={!isStepValid(2)}
                        >
                            Next: Facilities
                        </Button>
                    </div>
                </Card>
            )}

            {/* STEP 3: FACILITIES */}
            {activeStep === 3 && (
                <Card className={classes.formCard}>
                    <h3>Facilities</h3>
                    <p className={classes.sectionDescription}>
                        Indicate which facilities are available at the school.
                    </p>

                    <div className={classes.formSection}>
                        <SingleSelectField
                            label="Electricity Supply"
                            placeholder="Select..."
                            selected={formData.electricity}
                            onChange={({ selected }) => handleFieldChange("electricity", selected)}
                            onBlur={() => handleBlur("electricity")}
                            error={touched.electricity && !!errors.electricity}
                            validationText={touched.electricity && errors.electricity}
                            required
                        >
                            <SingleSelectOption value="yes" label="Yes" />
                            <SingleSelectOption value="no" label="No" />
                        </SingleSelectField>

                        <SingleSelectField
                            label="Handwashing Facilities"
                            placeholder="Select..."
                            selected={formData.handwashing}
                            onChange={({ selected }) => handleFieldChange("handwashing", selected)}
                            onBlur={() => handleBlur("handwashing")}
                            error={touched.handwashing && !!errors.handwashing}
                            validationText={touched.handwashing && errors.handwashing}
                            required
                        >
                            <SingleSelectOption value="yes" label="Yes" />
                            <SingleSelectOption value="no" label="No" />
                        </SingleSelectField>

                        <SingleSelectField
                            label="Computer Lab"
                            placeholder="Select..."
                            selected={formData.computerLab}
                            onChange={({ selected }) => handleFieldChange("computerLab", selected)}
                            onBlur={() => handleBlur("computerLab")}
                            error={touched.computerLab && !!errors.computerLab}
                            validationText={touched.computerLab && errors.computerLab}
                            required
                        >
                            <SingleSelectOption value="yes" label="Yes" />
                            <SingleSelectOption value="no" label="No" />
                        </SingleSelectField>

                        <TextAreaField
                            label="Inspector's Observations (Optional)"
                            placeholder="Enter any additional observations or notes..."
                            value={formData.observations}
                            onChange={({ value }) => handleFieldChange("observations", value)}
                            rows={5}
                            helpText="Document any noteworthy conditions, concerns, or achievements"
                        />
                    </div>

                    <div className={classes.navigationButtons}>
                        <Button onClick={handlePreviousStep}>
                            Previous
                        </Button>
                        <Button
                            primary
                            onClick={handleNextStep}
                            disabled={!isStepValid(3)}
                        >
                            Review & Submit
                        </Button>
                    </div>
                </Card>
            )}

            {/* STEP 4: REVIEW & SUBMIT */}
            {activeStep === 4 && (
                <div>
                    <Card className={classes.summaryCard}>
                        <h3>Inspection Summary</h3>
                        <p className={classes.sectionDescription}>
                            Review all information before submitting. This summary will be shared with the head teacher.
                        </p>

                        {/* School Info */}
                        <div className={classes.summarySection}>
                            <h4>School Information</h4>
                            <div className={classes.summaryRow}>
                                <span className={classes.summaryLabel}>School:</span>
                                <span className={classes.summaryValue}>{selectedSchool?.name || "N/A"}</span>
                            </div>
                            <div className={classes.summaryRow}>
                                <span className={classes.summaryLabel}>Date:</span>
                                <span className={classes.summaryValue}>{formData.inspectionDate}</span>
                            </div>
                        </div>

                        {/* Demographics */}
                        <div className={classes.summarySection}>
                            <h4>Demographics</h4>
                            <div className={classes.summaryGrid}>
                                <div>
                                    <div className={classes.summaryLabel}>Total Learners</div>
                                    <div className={classes.summaryValue}>{ratios.totalLearners}</div>
                                    <div className={classes.summaryDetail}>
                                        Boys: {formData.boysEnrolled} | Girls: {formData.girlsEnrolled}
                                    </div>
                                </div>
                                <div>
                                    <div className={classes.summaryLabel}>Total Teachers</div>
                                    <div className={classes.summaryValue}>{ratios.totalTeachers}</div>
                                    <div className={classes.summaryDetail}>
                                        Male: {formData.maleTeachers} | Female: {formData.femaleTeachers}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Resources */}
                        <div className={classes.summarySection}>
                            <h4>Physical Resources</h4>
                            <div className={classes.summaryGrid}>
                                <div>
                                    <div className={classes.summaryLabel}>Classrooms</div>
                                    <div className={classes.summaryValue}>{formData.classrooms}</div>
                                </div>
                                <div>
                                    <div className={classes.summaryLabel}>Seats/Desks</div>
                                    <div className={classes.summaryValue}>{formData.seats}</div>
                                </div>
                                <div>
                                    <div className={classes.summaryLabel}>Toilets</div>
                                    <div className={classes.summaryValue}>{formData.toilets}</div>
                                </div>
                                <div>
                                    <div className={classes.summaryLabel}>Textbooks</div>
                                    <div className={classes.summaryValue}>{formData.textbooks}</div>
                                </div>
                            </div>
                        </div>

                        {/* Facilities */}
                        <div className={classes.summarySection}>
                            <h4>Facilities</h4>
                            <div className={classes.facilitiesGrid}>
                                <div className={formData.electricity === "yes" ? classes.facilityYes : classes.facilityNo}>
                                    {formData.electricity === "yes" ? "✓" : "✗"} Electricity
                                </div>
                                <div className={formData.handwashing === "yes" ? classes.facilityYes : classes.facilityNo}>
                                    {formData.handwashing === "yes" ? "✓" : "✗"} Handwashing
                                </div>
                                <div className={formData.computerLab === "yes" ? classes.facilityYes : classes.facilityNo}>
                                    {formData.computerLab === "yes" ? "✓" : "✗"} Computer Lab
                                </div>
                            </div>
                        </div>

                        {/* Observations */}
                        {formData.observations && (
                            <div className={classes.summarySection}>
                                <h4>Observations</h4>
                                <p className={classes.observationsText}>{formData.observations}</p>
                            </div>
                        )}
                    </Card>

                    {/* All Ratios */}
                    <Card className={classes.ratiosCard}>
                        <h3>Performance Indicators</h3>
                        <div className={classes.ratiosGrid}>
                            {renderRatioIndicator("learnersPerTeacher", ratios.learnersPerTeacher, "Learners per Teacher")}
                            {renderRatioIndicator("learnersPerClassroom", ratios.learnersPerClassroom, "Learners per Classroom")}
                            {renderRatioIndicator("seatsPerLearner", ratios.seatsPerLearner, "Seats per Learner")}
                            {renderRatioIndicator("textbooksPerLearner", ratios.textbooksPerLearner, "Textbooks per Learner")}
                            {renderRatioIndicator("learnersPerToilet", ratios.learnersPerToilet, "Learners per Toilet")}
                            {renderRatioIndicator("genderParityIndex", ratios.learnerGPI, "Learner GPI")}
                        </div>
                    </Card>

                    <div className={classes.navigationButtons}>
                        <Button onClick={handlePreviousStep}>
                            Previous
                        </Button>
                        <Button
                            primary
                            onClick={handleSubmit}
                            loading={submitting}
                            disabled={submitting}
                        >
                            {submitting ? "Submitting..." : "Submit Inspection"}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}