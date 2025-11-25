import React, {useEffect, useMemo, useState} from "react";
import {
    Button,
    Card,
    CircularLoader,
    IconCheckmarkCircle24,
    IconHome24,
    IconInfo24,
    IconInfoFilled24,
    IconStar24,
    IconUserGroup24,
    IconVisualizationColumn24,
    IconWarningFilled24,
    InputField,
    NoticeBox,
    SingleSelectField,
    SingleSelectOption,
    Tab,
    TabBar,
    TextAreaField
} from "@dhis2/ui";
import classes from "./Inspection.module.css";
import {
    buildEventPayload,
    calculateRatios,
    EDUTOPIA_STANDARDS,
    formatRatio,
    getRatioStatus,
    PROGRAM_CONFIG,
    saveInspectionLocally,
    validateInspectionForm,
    buildResourceEventPayload
} from "./inspectionUtils";

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
    const [dataElementMapResource, setDataElementMapResource] = useState({});
    const [programStageIdResource, setProgramStageIdResource] = useState("");
    // Form data
    const [formData, setFormData] = useState({
        schoolId: "",
        inspectionDate: new Date().toISOString().split("T")[0],
        electricity: "",
        handwash: "",
        computer: "",
        observations: "",
    });

    const [formDataResource, setResourceData] = useState({
        classrooms: "",
        seats: "",
        toilets: "",
        textbooks: "",

    })



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
        fetchSchools();
    }, []);

    // Fetch program stage and data elements
    useEffect(() => {
        const fetchProgramConfigInspection = async () => {
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
                    mapping[code] = psde.dataElement.id;
                });
                setDataElementMap(mapping);
                console.log(data)
                setLoading(false);
            } catch (err) {
                console.error("Error fetching program config:", err);
                setLoading(false);
            }
        };
        fetchProgramConfigInspection();
    }, []);


    useEffect(() => {
        const fetchProgramConfigResources = async () => {
            try {
                const res = await fetch(
                    `${PROGRAM_CONFIG.apiBase}/programs/${PROGRAM_CONFIG.programIdResource}?fields=programStages[id,programStageDataElements[dataElement[id,code]]]`,
                    {
                        headers: {
                            Authorization: `Basic ${PROGRAM_CONFIG.credentials}`,
                        },
                    }
                );
                const data = await res.json();

                const stageId = data.programStages[0].id;
                setProgramStageIdResource(stageId);
                const mapping = {};
                data.programStages[0].programStageDataElements.forEach((psde) => {
                    const code = psde.dataElement.code;
                    mapping[code] = psde.dataElement.id;
                });
                console.log(data)
                setDataElementMapResource(mapping);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching program config:", err);
                setLoading(false);
            }
        };
        fetchProgramConfigResources();
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
            return formData.electricity !== "" && formData.handwash !== "" &&
                formData.computer !== "";
        }
        return true;
    };

    // ========================================
    // EVENT HANDLERS
    // ========================================

    const handleFieldChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setResourceData(prev => ({ ...prev, [field]: value }))
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
            return;
        }

        setSubmitting(true);
        setSubmitStatus(null);

        try {
            // ========== SUBMIT EVENT 1: School Inspection (electricity, handwashing, computer) ==========
            const payload1 = buildEventPayload(formData, programStageId, dataElementMap);

            const res1 = await fetch(
                `${PROGRAM_CONFIG.apiBase}/tracker?async=false`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Basic ${PROGRAM_CONFIG.credentials}`,
                    },
                    body: JSON.stringify(payload1),
                }
            );

            const result1 = await res1.json();

            if (!res1.ok || result1.status === "ERROR") {
                console.error("DHIS2 validation error (School Inspection):", result1);
                throw new Error("Failed to submit school inspection data");
            }

            // ========== SUBMIT EVENT 2: Resource Inspection (classrooms, seats, books, toilets) ==========
            const payload2 = buildResourceEventPayload(
                formDataResource,
                programStageIdResource,
                dataElementMapResource,
                formData.schoolId,
                formData.inspectionDate
            );

            const res2 = await fetch(
                `${PROGRAM_CONFIG.apiBase}/tracker?async=false`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Basic ${PROGRAM_CONFIG.credentials}`,
                    },
                    body: JSON.stringify(payload2),
                }
            );

            const result2 = await res2.json();

            if (!res2.ok || result2.status === "ERROR") {
                console.error("DHIS2 validation error (Resource Inspection):", result2);
                throw new Error("Failed to submit resource inspection data");
            }

            // ========== SUCCESS ==========
            setSubmitStatus({
                type: "success",
                message: `Inspection successfully recorded for ${selectedSchool?.name}!`,
            });

            // Reset form
            setTimeout(() => {
                resetForm();
                resetFormResource();
                setActiveStep(0);
            }, 2000);

        } catch (err) {
            console.error("Submission error:", err);

            // Try to save locally for offline support
            const localKey = saveInspectionLocally({
                ...formData,
                ...formDataResource,
                schoolName: selectedSchool?.name,
            });

            setSubmitStatus({
                type: "warning",
                message: `Could not sync with server. Inspection saved locally (${localKey}). Will sync when connection is restored.`,
            });
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            schoolId: "",
            inspectionDate: new Date().toISOString().split("T")[0],
            electricity: "",
            handwash: "",
            computer: "",
            observations: "",
        });
        setErrors({});
        setTouched({});
        setActiveStep(0);
        setSubmitStatus(null);
    };

    const resetFormResource = () => {
        setResourceData({
            classrooms: "",
            seats: "",
            toilets: "",
            textbooks: "",
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
                                value={formDataResource.classrooms}
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
                                value={formDataResource.seats}
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
                                value={formDataResource.toilets}
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
                                value={formDataResource.textbooks}
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
                            <SingleSelectOption value= "yes" label="Yes" />
                            <SingleSelectOption value="no" label="No" />
                        </SingleSelectField>

                        <SingleSelectField
                            label="Handwashing Facilities"
                            placeholder="Select..."
                            selected={formData.handwash}
                            onChange={({ selected }) => handleFieldChange("handwash", selected)}
                            onBlur={() => handleBlur("handwash")}
                            error={touched.handwash && !!errors.handwash}
                            validationText={touched.handwash && errors.handwash}
                            required
                        >
                            <SingleSelectOption value="yes" label="Yes" />
                            <SingleSelectOption value="no" label="No" />
                        </SingleSelectField>

                        <SingleSelectField
                            label="Computer Lab"
                            placeholder="Select..."
                            selected={formData.computer}
                            onChange={({ selected }) => handleFieldChange("computer", selected)}
                            onBlur={() => handleBlur("computer")}
                            error={touched.computer && !!errors.computer}
                            validationText={touched.computer && errors.computer}
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
                                <div className={formData.handwash === "yes" ? classes.facilityYes : classes.facilityNo}>
                                    {formData.handwash === "yes" ? "✓" : "✗"} Handwashing
                                </div>
                                <div className={formData.computer=== "yes" ? classes.facilityYes : classes.facilityNo}>
                                    {formData.computer === "yes" ? "✓" : "✗"} Computer Lab
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
