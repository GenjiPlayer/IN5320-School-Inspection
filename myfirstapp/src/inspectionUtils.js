// ========================================
// INSPECTION UTILITIES
// Edutopia School Inspection Helper Module
// ========================================

// ========================================
// CONSTANTS & STANDARDS
// ========================================

export const EDUTOPIA_STANDARDS = {
    learnersPerTeacher: { max: 45, label: "Learner-to-Teacher Ratio", threshold: "<45:1" },
    learnersPerClassroom: { max: 53, label: "Learner-to-Classroom Ratio", threshold: "<53:1" },
    seatsPerLearner: { min: 1.0, label: "Seat-to-Learner Ratio", threshold: "1:1" },
    textbooksPerLearner: { min: 1.0, label: "Textbook-to-Learner Ratio", threshold: "1:1" },
    learnersPerToilet: { max: 25, label: "Learner-to-Toilet Ratio", threshold: "<25:1" },
    genderParityIndex: { target: 1.0, tolerance: 0.1, label: "Gender Parity Index", threshold: "1.0 ±0.1" },
};

export const PROGRAM_CONFIG = {
    programId: "UxK2o06ScIe",
    programIdResource: "uvpW17dnfUS",
    apiBase: "https://research.im.dhis2.org/in5320g20/api",
    credentials: btoa("admin:district"),
};

// Data element codes mapping
export const DATA_ELEMENTS = {
    LEARNERS_BOYS: "boysEnrolled",
    LEARNERS_GIRLS: "girlsEnrolled",
    TEACHERS_MALE: "maleTeachers",
    TEACHERS_FEMALE: "femaleTeachers",
    CLASSROOMS: "classrooms",
    SEATS: "seats",
    TOILETS: "toilets",
    TEXTBOOKS: "textbooks",
    ELECTRICITY: "electricity",
    HANDWASHING: "handwashing",
    COMPUTER_LAB: "computerLab",
    OBSERVATIONS: "observations",
};

// ========================================
// VALIDATION FUNCTIONS
// ========================================

/**
 * Validates a numeric field
 */
export const validateNumber = (value, fieldName, options = {}) => {
    const { min = 0, max = Infinity, required = false, allowZero = true } = options;

    if (value === "" || value === null || value === undefined) {
        if (required) return `${fieldName} is required`;
        return null;
    }

    const num = Number(value);

    if (isNaN(num)) {
        return `${fieldName} must be a valid number`;
    }

    if (!allowZero && num === 0) {
        return `${fieldName} cannot be zero`;
    }

    if (num < min) {
        return `${fieldName} must be at least ${min}`;
    }

    if (num > max) {
        return `${fieldName} cannot exceed ${max}`;
    }

    return null;
};

/**
 * Validates the entire inspection form
 */
export const validateInspectionForm = (formData) => {
    const errors = {};

    // Required fields
    if (!formData.schoolId) {
        errors.schoolId = "Please select a school";
    }

    if (!formData.inspectionDate) {
        errors.inspectionDate = "Inspection date is required";
    } else {
        const inspDate = new Date(formData.inspectionDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (inspDate > today) {
            errors.inspectionDate = "Inspection date cannot be in the future";
        }
    }

    // Learner counts
    const boysError = validateNumber(formData.boysEnrolled, "Boys enrolled", { required: true, min: 0 });
    if (boysError) errors.boysEnrolled = boysError;

    const girlsError = validateNumber(formData.girlsEnrolled, "Girls enrolled", { required: true, min: 0 });
    if (girlsError) errors.girlsEnrolled = girlsError;

    // Teacher counts
    const maleTeachersError = validateNumber(formData.maleTeachers, "Male teachers", { required: true, min: 0 });
    if (maleTeachersError) errors.maleTeachers = maleTeachersError;

    const femaleTeachersError = validateNumber(formData.femaleTeachers, "Female teachers", { required: true, min: 0 });
    if (femaleTeachersError) errors.femaleTeachers = femaleTeachersError;

    // Physical resources
    const classroomsError = validateNumber(formData.classrooms, "Classrooms", { required: true, min: 1, allowZero: false });
    if (classroomsError) errors.classrooms = classroomsError;

    const seatsError = validateNumber(formData.seats, "Seats/desks", { required: true, min: 0 });
    if (seatsError) errors.seats = seatsError;

    const toiletsError = validateNumber(formData.toilets, "Toilets", { required: true, min: 1, allowZero: false });
    if (toiletsError) errors.toilets = toiletsError;

    const textbooksError = validateNumber(formData.textbooks, "Textbooks", { required: true, min: 0 });
    if (textbooksError) errors.textbooks = textbooksError;

    // Logical validations
    const totalLearners = (Number(formData.boysEnrolled) || 0) + (Number(formData.girlsEnrolled) || 0);
    const totalTeachers = (Number(formData.maleTeachers) || 0) + (Number(formData.femaleTeachers) || 0);

    if (totalLearners === 0 && !errors.boysEnrolled && !errors.girlsEnrolled &&
        formData.boysEnrolled !== "" && formData.girlsEnrolled !== "") {
        errors.boysEnrolled = "Total learners cannot be zero (at least one must be greater than 0)";
    }

    if (totalTeachers === 0 && !errors.maleTeachers && !errors.femaleTeachers &&
        formData.maleTeachers !== "" && formData.femaleTeachers !== "") {
        errors.maleTeachers = "Total teachers cannot be zero (at least one must be greater than 0)";
    }

    // Facilities
    if (!formData.electricity) {
        errors.electricity = "Please indicate if the school has electricity";
    }

    if (!formData.handwashing) {
        errors.handwashing = "Please indicate if the school has handwashing facilities";
    }

    if (!formData.computerLab) {
        errors.computerLab = "Please indicate if the school has a computer lab";
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
};

// ========================================
// RATIO CALCULATIONS
// ========================================

/**
 * Calculate all inspection ratios
 */
export const calculateRatios = (formData) => {
    const totalLearners = (Number(formData.boysEnrolled) || 0) + (Number(formData.girlsEnrolled) || 0);
    const totalTeachers = (Number(formData.maleTeachers) || 0) + (Number(formData.femaleTeachers) || 0);
    const classrooms = Number(formData.classrooms) || 0;
    const seats = Number(formData.seats) || 0;
    const toilets = Number(formData.toilets) || 0;
    const textbooks = Number(formData.textbooks) || 0;
    const boys = Number(formData.boysEnrolled) || 0;
    const girls = Number(formData.girlsEnrolled) || 0;
    const maleTeachers = Number(formData.maleTeachers) || 0;
    const femaleTeachers = Number(formData.femaleTeachers) || 0;

    return {
        learnersPerTeacher: totalTeachers > 0 ? totalLearners / totalTeachers : null,
        learnersPerClassroom: classrooms > 0 ? totalLearners / classrooms : null,
        seatsPerLearner: totalLearners > 0 ? seats / totalLearners : null,
        textbooksPerLearner: totalLearners > 0 ? textbooks / totalLearners : null,
        learnersPerToilet: toilets > 0 ? totalLearners / toilets : null,
        learnerGPI: boys > 0 ? girls / boys : null,
        teacherGPI: maleTeachers > 0 ? femaleTeachers / maleTeachers : null,
        totalLearners,
        totalTeachers,
    };
};

/**
 * Get status for a specific ratio
 */
export const getRatioStatus = (ratioKey, value) => {
    if (value === null || value === undefined) {
        return { status: "unknown", label: "N/A", color: "#6b7280" };
    }

    const standard = EDUTOPIA_STANDARDS[ratioKey];

    if (!standard) {
        return { status: "unknown", label: "N/A", color: "#6b7280" };
    }

    // Handle "max" type ratios (lower is better)
    if (standard.max !== undefined) {
        if (value <= standard.max) {
            return { status: "adequate", label: "Meets Standard", color: "#4caf50" };
        } else if (value <= standard.max * 1.2) {
            return { status: "warning", label: "Close to Standard", color: "#ff9800" };
        } else {
            return { status: "critical", label: "Below Standard", color: "#f44336" };
        }
    }

    // Handle "min" type ratios (higher is better)
    if (standard.min !== undefined) {
        if (value >= standard.min) {
            return { status: "adequate", label: "Meets Standard", color: "#4caf50" };
        } else if (value >= standard.min * 0.8) {
            return { status: "warning", label: "Close to Standard", color: "#ff9800" };
        } else {
            return { status: "critical", label: "Below Standard", color: "#f44336" };
        }
    }

    // Handle "target" type ratios (GPI)
    if (standard.target !== undefined) {
        const diff = Math.abs(value - standard.target);
        if (diff <= standard.tolerance) {
            return { status: "adequate", label: "Balanced", color: "#4caf50" };
        } else if (diff <= standard.tolerance * 2) {
            return { status: "warning", label: "Slight Imbalance", color: "#ff9800" };
        } else {
            return { status: "critical", label: "Significant Imbalance", color: "#f44336" };
        }
    }

    return { status: "unknown", label: "N/A", color: "#6b7280" };
};

/**
 * Format ratio value for display
 */
export const formatRatio = (value, decimals = 1) => {
    if (value === null || value === undefined || isNaN(value)) {
        return "N/A";
    }
    return value.toFixed(decimals);
};

// ========================================
// DHIS2 EVENT PAYLOAD GENERATION
// ========================================

/**
 * Transform form data into DHIS2 event payload
 */
export const buildEventPayload = (formData, programStageId, dataElementMap) => {
    const dataValues = [];

    // Helper to add data value
    const addDataValue = (code, value) => {
        const dataElementId = dataElementMap[code];
        if (dataElementId && value !== null && value !== undefined && value !== "") {
            dataValues.push({
                dataElement: dataElementId,
                value: String(value),
            });
        }
    };

    // Add all form fields
    addDataValue(DATA_ELEMENTS.LEARNERS_BOYS, formData.boysEnrolled);
    addDataValue(DATA_ELEMENTS.LEARNERS_GIRLS, formData.girlsEnrolled);
    addDataValue(DATA_ELEMENTS.TEACHERS_MALE, formData.maleTeachers);
    addDataValue(DATA_ELEMENTS.TEACHERS_FEMALE, formData.femaleTeachers);
    addDataValue(DATA_ELEMENTS.CLASSROOMS, formData.classrooms);
    addDataValue(DATA_ELEMENTS.SEATS, formData.seats);
    addDataValue(DATA_ELEMENTS.TOILETS, formData.toilets);
    addDataValue(DATA_ELEMENTS.TEXTBOOKS, formData.textbooks);
    addDataValue(DATA_ELEMENTS.ELECTRICITY, formData.electricity);
    addDataValue(DATA_ELEMENTS.HANDWASHING, formData.handwashing);
    addDataValue(DATA_ELEMENTS.COMPUTER_LAB, formData.computerLab);
    addDataValue(DATA_ELEMENTS.OBSERVATIONS, formData.observations);

    const event = {
        program: PROGRAM_CONFIG.programId,
        programStage: programStageId,
        orgUnit: formData.schoolId,
        occurredAt: new Date(formData.inspectionDate).toISOString(),
        status: "ACTIVE",
        dataValues,
    };

    return { events: [event] };
};

// ========================================
// INSPECTION REPORT GENERATION
// ========================================

/**
 * Generate comprehensive inspection summary
 */
export const generateInspectionSummary = (formData, schoolName) => {
    const ratios = calculateRatios(formData);

    const summary = {
        school: schoolName,
        date: formData.inspectionDate,

        // Demographics
        demographics: {
            totalLearners: ratios.totalLearners,
            boys: Number(formData.boysEnrolled) || 0,
            girls: Number(formData.girlsEnrolled) || 0,
            totalTeachers: ratios.totalTeachers,
            maleTeachers: Number(formData.maleTeachers) || 0,
            femaleTeachers: Number(formData.femaleTeachers) || 0,
        },

        // Physical resources
        resources: {
            classrooms: Number(formData.classrooms) || 0,
            seats: Number(formData.seats) || 0,
            toilets: Number(formData.toilets) || 0,
            textbooks: Number(formData.textbooks) || 0,
        },

        // Facilities
        facilities: {
            electricity: formData.electricity === "yes",
            handwashing: formData.handwashing === "yes",
            computerLab: formData.computerLab === "yes",
        },

        // Calculated ratios
        ratios: {
            learnersPerTeacher: {
                value: ratios.learnersPerTeacher,
                formatted: formatRatio(ratios.learnersPerTeacher),
                status: getRatioStatus("learnersPerTeacher", ratios.learnersPerTeacher),
                standard: EDUTOPIA_STANDARDS.learnersPerTeacher,
            },
            learnersPerClassroom: {
                value: ratios.learnersPerClassroom,
                formatted: formatRatio(ratios.learnersPerClassroom),
                status: getRatioStatus("learnersPerClassroom", ratios.learnersPerClassroom),
                standard: EDUTOPIA_STANDARDS.learnersPerClassroom,
            },
            seatsPerLearner: {
                value: ratios.seatsPerLearner,
                formatted: formatRatio(ratios.seatsPerLearner, 2),
                status: getRatioStatus("seatsPerLearner", ratios.seatsPerLearner),
                standard: EDUTOPIA_STANDARDS.seatsPerLearner,
            },
            textbooksPerLearner: {
                value: ratios.textbooksPerLearner,
                formatted: formatRatio(ratios.textbooksPerLearner, 2),
                status: getRatioStatus("textbooksPerLearner", ratios.textbooksPerLearner),
                standard: EDUTOPIA_STANDARDS.textbooksPerLearner,
            },
            learnersPerToilet: {
                value: ratios.learnersPerToilet,
                formatted: formatRatio(ratios.learnersPerToilet),
                status: getRatioStatus("learnersPerToilet", ratios.learnersPerToilet),
                standard: EDUTOPIA_STANDARDS.learnersPerToilet,
            },
            learnerGPI: {
                value: ratios.learnerGPI,
                formatted: formatRatio(ratios.learnerGPI, 2),
                status: getRatioStatus("genderParityIndex", ratios.learnerGPI),
                standard: EDUTOPIA_STANDARDS.genderParityIndex,
            },
            teacherGPI: {
                value: ratios.teacherGPI,
                formatted: formatRatio(ratios.teacherGPI, 2),
                status: getRatioStatus("genderParityIndex", ratios.teacherGPI),
                standard: EDUTOPIA_STANDARDS.genderParityIndex,
            },
        },

        // Overall assessment
        overallStatus: calculateOverallStatus(ratios),

        // Observations
        observations: formData.observations || "",

        // Recommendations
        recommendations: generateRecommendations(ratios, formData),
    };

    return summary;
};

/**
 * Calculate overall inspection status
 */
const calculateOverallStatus = (ratios) => {
    const statuses = [
        getRatioStatus("learnersPerTeacher", ratios.learnersPerTeacher).status,
        getRatioStatus("learnersPerClassroom", ratios.learnersPerClassroom).status,
        getRatioStatus("seatsPerLearner", ratios.seatsPerLearner).status,
        getRatioStatus("textbooksPerLearner", ratios.textbooksPerLearner).status,
        getRatioStatus("learnersPerToilet", ratios.learnersPerToilet).status,
        getRatioStatus("genderParityIndex", ratios.learnerGPI).status,
    ].filter(s => s !== "unknown");

    const criticalCount = statuses.filter(s => s === "critical").length;
    const warningCount = statuses.filter(s => s === "warning").length;

    if (criticalCount >= 2) {
        return { status: "critical", label: "Needs Urgent Attention", color: "#f44336" };
    } else if (criticalCount >= 1 || warningCount >= 3) {
        return { status: "warning", label: "Needs Improvement", color: "#ff9800" };
    } else if (warningCount >= 1) {
        return { status: "moderate", label: "Adequate with Minor Concerns", color: "#2196f3" };
    } else {
        return { status: "good", label: "Meets All Standards", color: "#4caf50" };
    }
};

/**
 * Generate actionable recommendations
 */
const generateRecommendations = (ratios, formData) => {
    const recommendations = [];

    // Teacher shortage
    const teacherStatus = getRatioStatus("learnersPerTeacher", ratios.learnersPerTeacher);
    if (teacherStatus.status === "critical") {
        recommendations.push({
            priority: "high",
            area: "Staffing",
            issue: `Severe teacher shortage (${formatRatio(ratios.learnersPerTeacher)}:1 learners per teacher)`,
            action: "Urgently recruit additional teachers or request deployment from the district education office.",
        });
    } else if (teacherStatus.status === "warning") {
        recommendations.push({
            priority: "medium",
            area: "Staffing",
            issue: `Teacher ratio approaching critical levels (${formatRatio(ratios.learnersPerTeacher)}:1)`,
            action: "Plan for teacher recruitment in the next term.",
        });
    }

    // Classroom shortage
    const classroomStatus = getRatioStatus("learnersPerClassroom", ratios.learnersPerClassroom);
    if (classroomStatus.status === "critical") {
        recommendations.push({
            priority: "high",
            area: "Infrastructure",
            issue: `Severe classroom shortage (${formatRatio(ratios.learnersPerClassroom)}:1 learners per classroom)`,
            action: "Consider temporary classrooms or double-shift schedules. Request infrastructure development funding.",
        });
    }

    // Seating shortage
    const seatsStatus = getRatioStatus("seatsPerLearner", ratios.seatsPerLearner);
    if (seatsStatus.status === "critical") {
        const shortage = Math.round(ratios.totalLearners - Number(formData.seats));
        recommendations.push({
            priority: "high",
            area: "Learning Materials",
            issue: `Severe seating shortage (approximately ${shortage} seats needed)`,
            action: "Request immediate furniture support from the district. Consider community contributions for temporary seating.",
        });
    }

    // Textbook shortage
    const textbookStatus = getRatioStatus("textbooksPerLearner", ratios.textbooksPerLearner);
    if (textbookStatus.status === "critical") {
        const shortage = Math.round(ratios.totalLearners - Number(formData.textbooks));
        recommendations.push({
            priority: "medium",
            area: "Learning Materials",
            issue: `Textbook shortage (approximately ${shortage} textbooks needed)`,
            action: "Submit textbook requisition to district education office for the next term.",
        });
    }

    // Sanitation issues
    const toiletStatus = getRatioStatus("learnersPerToilet", ratios.learnersPerToilet);
    if (toiletStatus.status === "critical") {
        recommendations.push({
            priority: "high",
            area: "Sanitation",
            issue: `Inadequate toilet facilities (${formatRatio(ratios.learnersPerToilet)}:1 learners per toilet)`,
            action: "Prioritize construction of additional toilet facilities. Apply for WASH program support.",
        });
    }

    // Gender imbalance
    const gpiStatus = getRatioStatus("genderParityIndex", ratios.learnerGPI);
    if (gpiStatus.status === "critical") {
        const issue = ratios.learnerGPI < 0.9
            ? "Significantly fewer girls than boys enrolled"
            : "Significantly fewer boys than girls enrolled";
        recommendations.push({
            priority: "medium",
            area: "Gender Equity",
            issue: issue,
            action: "Investigate barriers to enrollment. Implement targeted community sensitization programs.",
        });
    }

    // Missing facilities
    if (formData.electricity === "no") {
        recommendations.push({
            priority: "low",
            area: "Facilities",
            issue: "No electricity supply",
            action: "Explore solar power options or request grid connection from local authorities.",
        });
    }

    if (formData.handwashing === "no") {
        recommendations.push({
            priority: "medium",
            area: "Health & Hygiene",
            issue: "No handwashing facilities",
            action: "Install basic handwashing stations with soap. Critical for health and hygiene.",
        });
    }

    if (formData.computerLab === "no") {
        recommendations.push({
            priority: "low",
            area: "Digital Learning",
            issue: "No computer lab available",
            action: "Consider partnership with NGOs for computer donations and digital literacy programs.",
        });
    }

    // If everything is good
    if (recommendations.length === 0) {
        recommendations.push({
            priority: "none",
            area: "Overall",
            issue: "All standards met",
            action: "Maintain current performance levels. Continue monitoring key indicators.",
        });
    }

    return recommendations;
};

// ========================================
// LOCAL STORAGE (OFFLINE SUPPORT)
// ========================================

/**
 * Save inspection to local storage
 */
export const saveInspectionLocally = (inspectionData) => {
    try {
        const key = `inspection_${Date.now()}`;
        const data = {
            ...inspectionData,
            savedAt: new Date().toISOString(),
            synced: false,
        };
        localStorage.setItem(key, JSON.stringify(data));
        return key;
    } catch (error) {
        console.error("Failed to save inspection locally:", error);
        return null;
    }
};

/**
 * Get all unsynced inspections
 */
export const getUnsyncedInspections = () => {
    try {
        const keys = Object.keys(localStorage).filter(k => k.startsWith("inspection_"));
        return keys.map(key => ({
            key,
            data: JSON.parse(localStorage.getItem(key)),
        })).filter(item => !item.data.synced);
    } catch (error) {
        console.error("Failed to retrieve unsynced inspections:", error);
        return [];
    }
};

/**
 * Mark inspection as synced
 */
export const markInspectionSynced = (key) => {
    try {
        const data = JSON.parse(localStorage.getItem(key));
        data.synced = true;
        data.syncedAt = new Date().toISOString();
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error("Failed to mark inspection as synced:", error);
    }
};
