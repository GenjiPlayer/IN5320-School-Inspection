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
} from "@dhis2/ui";

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
        fetchSchools();
        fetchSchoolInspectionDataElements();
    }, []);

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
            return;
        }

        setSubmitting(true);
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
        } finally {
            setSubmitting(false);
        }
    };

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
            )}
        </div>
    );
}