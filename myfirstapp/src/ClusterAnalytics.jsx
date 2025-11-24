//BRUKER IKKE FAKTISK API DATA!!!

import React, { useState, useEffect } from "react";
import Highcharts from "highcharts";
import "highcharts/highcharts-more";
import HighchartsReact from "highcharts-react-official";
import {
    Card,
    CircularLoader,
    NoticeBox,
    Button,
    IconWarningFilled24,
    IconInfoFilled24,
    IconCheckmarkCircle24,
    IconArrowLeft24,
    SingleSelectField,
    SingleSelectOption,
    Checkbox,
} from "@dhis2/ui";
import classes from "./ClusterAnalytics.module.css";
import { DUMMY_CLUSTER_DATA } from "./DummyData";

export default function ClusterAnalytics({ setActivePage }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [clusters, setClusters] = useState([]);
    const [selectedCluster, setSelectedCluster] = useState("");
    const [comparisonClusters, setComparisonClusters] = useState([]);
    const [clusterDataMap, setClusterDataMap] = useState({});
    const [schoolDataMap, setSchoolDataMap] = useState({});
    const [openMetric, setOpenMetric] = useState(null);
    const [viewMode, setViewMode] = useState("cluster"); // "cluster" or "school"
    const [selectedSchools, setSelectedSchools] = useState([]);

    // ========== MINIMUM STANDARDS ==========
    const MINIMUM_STANDARDS = {
        seatToLearner: { min: 1.0, label: "1:1 (one seat per learner)" },
        textbookToLearner: { min: 1.0, label: "1:1 (one textbook per learner)" },
        learnersPerClassroom: { max: 53, label: "<53:1 (less than 53 learners per classroom)" },
        learnersPerTeacher: { max: 45, label: "<45:1 (less than 45 learners per teacher)" },
        learnersPerToilet: { max: 25, label: "<25:1 (maximum 25 learners per toilet)" },
        genderParityIndex: { target: 1.0, label: "1.0 (equal ratio of girls to boys)" },
    };

    // ========== FETCH CLUSTERS ==========
    useEffect(() => {
        fetchClusters();
    }, []);

    const fetchClusters = async () => {
        try {
            const clusterNames = Object.keys(DUMMY_CLUSTER_DATA);
            setClusters(clusterNames);

            if (clusterNames.length > 0) {
                setSelectedCluster(clusterNames[0]);
                processAllClusters();
            }

            setLoading(false);
        } catch (err) {
            setError("Failed to fetch clusters: " + err.message);
            setLoading(false);
        }
    };

    const processAllClusters = () => {
        const clusterMap = {};
        const schoolMap = {};

        Object.keys(DUMMY_CLUSTER_DATA).forEach((clusterName) => {
            clusterMap[clusterName] = processClusterData(
                DUMMY_CLUSTER_DATA[clusterName]
            );

            // Process individual schools
            DUMMY_CLUSTER_DATA[clusterName].schools.forEach((school) => {
                schoolMap[school.id] = processSchoolData(school, clusterName);
            });
        });

        setClusterDataMap(clusterMap);
        setSchoolDataMap(schoolMap);
    };

    // ========== PROCESS CLUSTER DATA WITH TIME-SERIES ==========
    const processClusterData = (data) => {
        const timeSeriesData = {};
        const aggregated = {
            totalSchools: data.schools.length,
            totalLearners: 0,
            totalTeachers: 0,
            totalClassrooms: 0,
            totalSeats: 0,
            totalTextbooks: 0,
            totalBoys: 0,
            totalGirls: 0,
            totalToilets: 0,
            schoolsWithElectricity: 0,
            schoolsWithHandwashing: 0,
            schoolsWithComputerLab: 0,
            ratios: [],
            timeSeries: [],
        };

        // Collect all events across schools
        data.schools.forEach((school) => {
            school.events.forEach((event) => {
                const date = event.occurredAt;

                if (!timeSeriesData[date]) {
                    timeSeriesData[date] = {
                        totalLearners: 0,
                        totalTeachers: 0,
                        totalClassrooms: 0,
                        totalSeats: 0,
                        totalTextbooks: 0,
                        totalBoys: 0,
                        totalGirls: 0,
                        totalToilets: 0,
                        schoolsWithElectricity: 0,
                        schoolsWithHandwashing: 0,
                        schoolsWithComputerLab: 0,
                        schoolCount: 0,
                    };
                }

                const values = {};
                event.dataValues.forEach((dv) => {
                    values[dv.dataElement] = dv.value;
                });

                const learners = parseInt(values.learners) || 0;
                const teachers = parseInt(values.teachers) || 0;
                const classrooms = parseInt(values.classrooms) || 0;
                const seats = parseInt(values.seats) || 0;
                const textbooks = parseInt(values.textbooks) || 0;
                const boys = parseInt(values.boysEnrolled) || 0;
                const girls = parseInt(values.girlsEnrolled) || 0;
                const toilets = parseInt(values.toilets) || 0;

                timeSeriesData[date].totalLearners += learners;
                timeSeriesData[date].totalTeachers += teachers;
                timeSeriesData[date].totalClassrooms += classrooms;
                timeSeriesData[date].totalSeats += seats;
                timeSeriesData[date].totalTextbooks += textbooks;
                timeSeriesData[date].totalBoys += boys;
                timeSeriesData[date].totalGirls += girls;
                timeSeriesData[date].totalToilets += toilets;

                if (values.electricity === "yes") timeSeriesData[date].schoolsWithElectricity++;
                if (values.handwashing === "yes") timeSeriesData[date].schoolsWithHandwashing++;
                if (values.computerLab === "yes") timeSeriesData[date].schoolsWithComputerLab++;

                timeSeriesData[date].schoolCount++;
            });

            // Use latest event for current ratios
            const latestEvent = school.events[school.events.length - 1];
            const values = {};
            latestEvent.dataValues.forEach((dv) => {
                values[dv.dataElement] = dv.value;
            });

            const learners = parseInt(values.learners) || 0;
            const teachers = parseInt(values.teachers) || 0;
            const classrooms = parseInt(values.classrooms) || 0;
            const seats = parseInt(values.seats) || 0;
            const textbooks = parseInt(values.textbooks) || 0;
            const boys = parseInt(values.boysEnrolled) || 0;
            const girls = parseInt(values.girlsEnrolled) || 0;
            const toilets = parseInt(values.toilets) || 0;

            aggregated.totalLearners += learners;
            aggregated.totalTeachers += teachers;
            aggregated.totalClassrooms += classrooms;
            aggregated.totalSeats += seats;
            aggregated.totalTextbooks += textbooks;
            aggregated.totalBoys += boys;
            aggregated.totalGirls += girls;
            aggregated.totalToilets += toilets;

            if (values.electricity === "yes") aggregated.schoolsWithElectricity++;
            if (values.handwashing === "yes") aggregated.schoolsWithHandwashing++;
            if (values.computerLab === "yes") aggregated.schoolsWithComputerLab++;

            aggregated.ratios.push({
                schoolName: school.name,
                learnersPerTeacher: learners / teachers,
                learnersPerClassroom: learners / classrooms,
                seatToLearner: seats / learners,
                textbookToLearner: textbooks / learners,
                learnersPerToilet: learners / toilets,
            });
        });

        // Convert time series to array and sort by date
        const sortedDates = Object.keys(timeSeriesData).sort();
        aggregated.timeSeries = sortedDates.map((date) => {
            const ts = timeSeriesData[date];
            return {
                date,
                avgLearnersPerTeacher: ts.totalLearners / ts.totalTeachers,
                avgLearnersPerClassroom: ts.totalLearners / ts.totalClassrooms,
                avgSeatToLearner: ts.totalSeats / ts.totalLearners,
                avgTextbookToLearner: ts.totalTextbooks / ts.totalLearners,
                avgLearnersPerToilet: ts.totalLearners / ts.totalToilets,
                genderParityIndex: ts.totalGirls / ts.totalBoys,
            };
        });

        // Calculate current averages
        aggregated.avgLearnersPerTeacher = aggregated.totalLearners / aggregated.totalTeachers;
        aggregated.avgLearnersPerClassroom = aggregated.totalLearners / aggregated.totalClassrooms;
        aggregated.avgSeatToLearner = aggregated.totalSeats / aggregated.totalLearners;
        aggregated.avgTextbookToLearner = aggregated.totalTextbooks / aggregated.totalLearners;
        aggregated.avgLearnersPerToilet = aggregated.totalLearners / aggregated.totalToilets;
        aggregated.genderParityIndex = aggregated.totalGirls / aggregated.totalBoys;

        return aggregated;
    };

    // ========== PROCESS INDIVIDUAL SCHOOL DATA ==========
    const processSchoolData = (school, clusterName) => {
        const timeSeries = school.events.map((event) => {
            const values = {};
            event.dataValues.forEach((dv) => {
                values[dv.dataElement] = dv.value;
            });

            const learners = parseInt(values.learners) || 0;
            const teachers = parseInt(values.teachers) || 0;
            const classrooms = parseInt(values.classrooms) || 0;
            const seats = parseInt(values.seats) || 0;
            const textbooks = parseInt(values.textbooks) || 0;
            const boys = parseInt(values.boysEnrolled) || 0;
            const girls = parseInt(values.girlsEnrolled) || 0;
            const toilets = parseInt(values.toilets) || 0;

            return {
                date: event.occurredAt,
                avgLearnersPerTeacher: learners / teachers,
                avgLearnersPerClassroom: learners / classrooms,
                avgSeatToLearner: seats / learners,
                avgTextbookToLearner: textbooks / learners,
                avgLearnersPerToilet: learners / toilets,
                genderParityIndex: girls / boys,
            };
        });

        // Get latest values
        const latestEvent = school.events[school.events.length - 1];
        const values = {};
        latestEvent.dataValues.forEach((dv) => {
            values[dv.dataElement] = dv.value;
        });

        const learners = parseInt(values.learners) || 0;
        const teachers = parseInt(values.teachers) || 0;
        const classrooms = parseInt(values.classrooms) || 0;
        const seats = parseInt(values.seats) || 0;
        const textbooks = parseInt(values.textbooks) || 0;
        const boys = parseInt(values.boysEnrolled) || 0;
        const girls = parseInt(values.girlsEnrolled) || 0;
        const toilets = parseInt(values.toilets) || 0;

        return {
            id: school.id,
            name: school.name,
            clusterName,
            totalLearners: learners,
            totalTeachers: teachers,
            totalClassrooms: classrooms,
            totalSeats: seats,
            totalTextbooks: textbooks,
            totalBoys: boys,
            totalGirls: girls,
            totalToilets: toilets,
            avgLearnersPerTeacher: learners / teachers,
            avgLearnersPerClassroom: learners / classrooms,
            avgSeatToLearner: seats / learners,
            avgTextbookToLearner: textbooks / learners,
            avgLearnersPerToilet: learners / toilets,
            genderParityIndex: girls / boys,
            timeSeries,
        };
    };

    // ========== TOGGLE FUNCTIONS ==========
    const toggleOpen = (key) => {
        setOpenMetric((prev) => (prev === key ? null : key));
    };

    const handleComparisonToggle = (clusterName) => {
        setComparisonClusters((prev) => {
            if (prev.includes(clusterName)) {
                return prev.filter((c) => c !== clusterName);
            } else {
                return [...prev, clusterName];
            }
        });
    };

    const handleSchoolToggle = (schoolId) => {
        setSelectedSchools((prev) => {
            if (prev.includes(schoolId)) {
                return prev.filter((s) => s !== schoolId);
            } else {
                return [...prev, schoolId];
            }
        });
    };

    // ========== STATUS HELPERS ==========
    const getStatusForMetric = (value, standard, metricKey) => {
        if (metricKey === "learnersPerTeacher" || metricKey === "learnersPerClassroom") {
            const max = standard.max;
            if (value <= max) return { severity: "adequate", label: "Meets standard" };
            if (value <= max * 1.2) return { severity: "limited", label: "Close to standard" };
            return { severity: "critical", label: "Below standard" };
        } else if (metricKey === "learnersPerToilet") {
            const max = standard.max;
            if (value <= max) return { severity: "adequate", label: "Meets standard" };
            if (value <= max * 1.2) return { severity: "limited", label: "Close to standard" };
            return { severity: "critical", label: "Below standard" };
        } else if (metricKey === "seatToLearner" || metricKey === "textbookToLearner") {
            const min = standard.min;
            if (value >= min) return { severity: "adequate", label: "Meets standard" };
            if (value >= min * 0.8) return { severity: "limited", label: "Close to standard" };
            return { severity: "critical", label: "Below standard" };
        } else if (metricKey === "genderParityIndex") {
            const target = standard.target;
            const diff = Math.abs(value - target);
            if (diff <= 0.1) return { severity: "adequate", label: "Balanced" };
            if (diff <= 0.2) return { severity: "limited", label: "Slight imbalance" };
            return { severity: "critical", label: "Significant imbalance" };
        }
        return { severity: "adequate", label: "OK" };
    };

    const renderStatusIcon = (severity) => {
        if (severity === "critical")
            return <IconWarningFilled24 className={classes.iconCritical} />;
        if (severity === "limited")
            return <IconInfoFilled24 className={classes.iconWarning} />;
        return <IconCheckmarkCircle24 className={classes.iconGood} />;
    };

    // ========== FORMAT RATIO VALUES ==========
    const formatRatio = (value, metricKey) => {
        if (metricKey === "genderParityIndex") {
            return value.toFixed(2);
        }
        return Math.round(value);
    };

    // ========== CHART CONFIGS ==========
    const createTimeSeriesChart = (metric, color, standard) => {
        let series = [];
        let categories = [];

        if (viewMode === "cluster") {
            // Cluster comparison mode
            const clustersToShow = [selectedCluster, ...comparisonClusters];
            const colors = [color, "#ff5722", "#9c27b0", "#00bcd4"];

            series = clustersToShow.map((clusterName, index) => {
                const clusterData = clusterDataMap[clusterName];
                if (!clusterData || !clusterData.timeSeries) return null;

                const dataValues = clusterData.timeSeries.map((ts) => {
                    const val = ts[metric.dataKey];
                    return metric.key === "genderParityIndex"
                        ? parseFloat(val.toFixed(2))
                        : Math.round(val);
                });

                return {
                    name: clusterName,
                    data: dataValues,
                    color: colors[index] || color,
                    marker: { radius: 5 },
                };
            }).filter(Boolean);

            categories = clusterDataMap[selectedCluster].timeSeries.map((ts) => ts.date);
        } else {
            // School comparison mode
            const colors = [color, "#ff5722", "#9c27b0", "#00bcd4", "#4caf50"];

            series = selectedSchools.map((schoolId, index) => {
                const schoolData = schoolDataMap[schoolId];
                if (!schoolData || !schoolData.timeSeries) return null;

                const dataValues = schoolData.timeSeries.map((ts) => {
                    const val = ts[metric.dataKey];
                    return metric.key === "genderParityIndex"
                        ? parseFloat(val.toFixed(2))
                        : Math.round(val);
                });

                return {
                    name: schoolData.name,
                    data: dataValues,
                    color: colors[index] || color,
                    marker: { radius: 5 },
                };
            }).filter(Boolean);

            if (selectedSchools.length > 0) {
                categories = schoolDataMap[selectedSchools[0]].timeSeries.map((ts) => ts.date);
            }
        }

        if (series.length === 0) return null;

        const plotLines = [];
        if (standard.max !== undefined) {
            plotLines.push({
                color: "#dc3545",
                dashStyle: "Dash",
                value: standard.max,
                width: 2,
                label: {
                    text: `Max: ${standard.max}`,
                    style: { color: "#dc3545", fontWeight: "bold" },
                },
            });
        }
        if (standard.min !== undefined) {
            plotLines.push({
                color: "#28a745",
                dashStyle: "Dash",
                value: standard.min,
                width: 2,
                label: {
                    text: `Min: ${standard.min}`,
                    style: { color: "#28a745", fontWeight: "bold" },
                },
            });
        }
        if (standard.target !== undefined) {
            plotLines.push({
                color: "#007bff",
                dashStyle: "Dash",
                value: standard.target,
                width: 2,
                label: {
                    text: `Target: ${standard.target}`,
                    style: { color: "#007bff", fontWeight: "bold" },
                },
            });
        }

        return {
            chart: { type: "line", height: 350 },
            title: { text: `${metric.label} Over Time` },
            xAxis: { categories, title: { text: "Date" } },
            yAxis: {
                title: { text: metric.label },
                plotLines,
            },
            tooltip: {
                shared: true,
                valueSuffix: metric.suffix || "",
            },
            legend: { enabled: true },
            credits: { enabled: false },
            series: series,
        };
    };

    const createComparisonChart = (metric, color, standard) => {
        let categoriesToCompare = [];
        let dataValues = [];
        let barColors = [];

        if (viewMode === "cluster") {
            const colors = [color, "#ff5722", "#9c27b0", "#00bcd4"];
            categoriesToCompare = [selectedCluster, ...comparisonClusters];
            dataValues = categoriesToCompare.map((clusterName, index) => {
                const data = clusterDataMap[clusterName];
                if (!data) return 0;
                const val = data[metric.valueKey];
                barColors.push(colors[index] || color);
                return metric.key === "genderParityIndex"
                    ? parseFloat(val.toFixed(2))
                    : Math.round(val);
            });
        } else {
            const colors = [color, "#ff5722", "#9c27b0", "#00bcd4", "#4caf50"];
            categoriesToCompare = selectedSchools.map((schoolId) => schoolDataMap[schoolId]?.name || "Unknown");
            dataValues = selectedSchools.map((schoolId, index) => {
                const data = schoolDataMap[schoolId];
                if (!data) return 0;
                const val = data[metric.valueKey];
                barColors.push(colors[index] || color);
                return metric.key === "genderParityIndex"
                    ? parseFloat(val.toFixed(2))
                    : Math.round(val);
            });
        }

        const plotLines = [];
        if (standard.max !== undefined) {
            plotLines.push({
                color: "#dc3545",
                dashStyle: "Dash",
                value: standard.max,
                width: 2,
                label: {
                    text: `Max: ${standard.max}`,
                    style: { color: "#dc3545", fontWeight: "bold" },
                },
            });
        }
        if (standard.min !== undefined) {
            plotLines.push({
                color: "#28a745",
                dashStyle: "Dash",
                value: standard.min,
                width: 2,
                label: {
                    text: `Min: ${standard.min}`,
                    style: { color: "#28a745", fontWeight: "bold" },
                },
            });
        }

        return {
            chart: { type: "column", height: 350 },
            title: { text: `${metric.label} - ${viewMode === "cluster" ? "Cluster" : "School"} Comparison` },
            xAxis: {
                categories: categoriesToCompare,
                title: { text: viewMode === "cluster" ? "Clusters" : "Schools" },
            },
            yAxis: {
                title: { text: metric.label },
                plotLines,
            },
            legend: { enabled: false },
            credits: { enabled: false },
            series: [
                {
                    name: metric.label,
                    data: dataValues,
                    colorByPoint: true,
                    colors: barColors,
                },
            ],
        };
    };

    // ========== GET AVAILABLE SCHOOLS ==========
    const getAvailableSchools = () => {
        if (!selectedCluster || !DUMMY_CLUSTER_DATA[selectedCluster]) return [];
        return DUMMY_CLUSTER_DATA[selectedCluster].schools;
    };

    // ========== GET CURRENT DATA ==========
    const getCurrentData = () => {
        if (viewMode === "cluster") {
            return clusterDataMap[selectedCluster];
        } else {
            // For school mode, show aggregate of selected schools
            if (selectedSchools.length === 0) return null;

            const aggregated = {
                totalLearners: 0,
                totalTeachers: 0,
                totalSchools: selectedSchools.length,
            };

            selectedSchools.forEach((schoolId) => {
                const school = schoolDataMap[schoolId];
                if (school) {
                    aggregated.totalLearners += school.totalLearners;
                    aggregated.totalTeachers += school.totalTeachers;
                }
            });

            // Calculate averages for selected schools
            const schoolsData = selectedSchools.map((id) => schoolDataMap[id]).filter(Boolean);
            if (schoolsData.length === 0) return null;

            return {
                ...aggregated,
                avgLearnersPerTeacher: schoolsData.reduce((sum, s) => sum + s.avgLearnersPerTeacher, 0) / schoolsData.length,
                avgLearnersPerClassroom: schoolsData.reduce((sum, s) => sum + s.avgLearnersPerClassroom, 0) / schoolsData.length,
                avgSeatToLearner: schoolsData.reduce((sum, s) => sum + s.avgSeatToLearner, 0) / schoolsData.length,
                avgTextbookToLearner: schoolsData.reduce((sum, s) => sum + s.avgTextbookToLearner, 0) / schoolsData.length,
                avgLearnersPerToilet: schoolsData.reduce((sum, s) => sum + s.avgLearnersPerToilet, 0) / schoolsData.length,
                genderParityIndex: schoolsData.reduce((sum, s) => sum + s.genderParityIndex, 0) / schoolsData.length,
            };
        }
    };

    // ========== RENDER ==========
    if (loading) {
        return (
            <div className={classes.loadingWrapper}>
                <CircularLoader />
            </div>
        );
    }

    if (error) {
        return (
            <div className={classes.pageWrapper}>
                <NoticeBox error title="Error">
                    {error}
                </NoticeBox>
            </div>
        );
    }

    const currentData = getCurrentData();

    // ========== DEFINE METRICS ==========
    const metrics = currentData ? [
        {
            key: "learnersPerTeacher",
            label: "Learner-to-Teacher Ratio",
            valueKey: "avgLearnersPerTeacher",
            dataKey: "avgLearnersPerTeacher",
            value: currentData.avgLearnersPerTeacher,
            description: "Indicates class size per teacher. Lower values suggest better individual attention.",
            standard: MINIMUM_STANDARDS.learnersPerTeacher,
            color: "#4caf50",
            suffix: ":1",
        },
        {
            key: "learnersPerClassroom",
            label: "Learner-to-Classroom Ratio",
            valueKey: "avgLearnersPerClassroom",
            dataKey: "avgLearnersPerClassroom",
            value: currentData.avgLearnersPerClassroom,
            description: "Shows classroom utilization. Lower values indicate less crowding.",
            standard: MINIMUM_STANDARDS.learnersPerClassroom,
            color: "#2196f3",
            suffix: ":1",
        },
        {
            key: "seatToLearner",
            label: "Seat-to-Learner Ratio",
            valueKey: "avgSeatToLearner",
            dataKey: "avgSeatToLearner",
            value: currentData.avgSeatToLearner,
            description: "Measures seating availability per learner.",
            standard: MINIMUM_STANDARDS.seatToLearner,
            color: "#ff9800",
            suffix: ":1",
        },
        {
            key: "textbookToLearner",
            label: "Textbook-to-Learner Ratio",
            valueKey: "avgTextbookToLearner",
            dataKey: "avgTextbookToLearner",
            value: currentData.avgTextbookToLearner,
            description: "Indicates textbook availability per learner.",
            standard: MINIMUM_STANDARDS.textbookToLearner,
            color: "#9c27b0",
            suffix: ":1",
        },
        {
            key: "learnersPerToilet",
            label: "Learner-to-Toilet Ratio",
            valueKey: "avgLearnersPerToilet",
            dataKey: "avgLearnersPerToilet",
            value: currentData.avgLearnersPerToilet,
            description: "Sanitation facility capacity per learner.",
            standard: MINIMUM_STANDARDS.learnersPerToilet,
            color: "#00bcd4",
            suffix: ":1",
        },
        {
            key: "genderParityIndex",
            label: "Gender Parity Index (GPI)",
            valueKey: "genderParityIndex",
            dataKey: "genderParityIndex",
            value: currentData.genderParityIndex,
            description: "Ratio of girls to boys enrolled.",
            standard: MINIMUM_STANDARDS.genderParityIndex,
            color: "#e91e63",
            suffix: "",
        },
    ] : [];

    return (
        <div className={classes.pageWrapper}>
            {/* HEADER */}
            <div className={classes.pageHeader}>
                <Button
                    small
                    icon={<IconArrowLeft24 />}
                    onClick={() => setActivePage("dashboard")}
                />
                <h2>Cluster Analytics</h2>
            </div>

            {/* VIEW MODE SELECTOR */}
            <Card className={classes.viewModeCard}>
                <div className={classes.viewModeButtons}>
                    <Button
                        onClick={() => setViewMode("cluster")}
                        primary={viewMode === "cluster"}
                    >
                        Compare Clusters
                    </Button>
                    <Button
                        onClick={() => setViewMode("school")}
                        primary={viewMode === "school"}
                    >
                        Compare Schools
                    </Button>
                </div>
            </Card>

            {/* CLUSTER SELECTOR */}
            {viewMode === "cluster" && (
                <Card className={classes.selectorCard}>
                    <div className={classes.selectorRow}>
                        <div className={classes.mainSelector}>
                            <SingleSelectField
                                label="Primary Cluster"
                                selected={selectedCluster}
                                onChange={({ selected }) => setSelectedCluster(selected)}
                            >
                                {clusters.map((cluster) => (
                                    <SingleSelectOption
                                        key={cluster}
                                        value={cluster}
                                        label={cluster}
                                    />
                                ))}
                            </SingleSelectField>
                        </div>
                    </div>

                    <div className={classes.comparisonSection}>
                        <p className={classes.comparisonLabel}>Compare with:</p>
                        {clusters
                            .filter((c) => c !== selectedCluster)
                            .map((cluster) => (
                                <Checkbox
                                    key={cluster}
                                    label={cluster}
                                    checked={comparisonClusters.includes(cluster)}
                                    onChange={() => handleComparisonToggle(cluster)}
                                />
                            ))}
                    </div>
                </Card>
            )}

            {/* SCHOOL SELECTOR */}
            {viewMode === "school" && (
                <Card className={classes.selectorCard}>
                    <div className={classes.selectorRow}>
                        <div className={classes.mainSelector}>
                            <SingleSelectField
                                label="Select Cluster"
                                selected={selectedCluster}
                                onChange={({ selected }) => {
                                    setSelectedCluster(selected);
                                    setSelectedSchools([]);
                                }}
                            >
                                {clusters.map((cluster) => (
                                    <SingleSelectOption
                                        key={cluster}
                                        value={cluster}
                                        label={cluster}
                                    />
                                ))}
                            </SingleSelectField>
                        </div>
                    </div>

                    <div className={classes.comparisonSection}>
                        <p className={classes.comparisonLabel}>Select schools to compare:</p>
                        {getAvailableSchools().map((school) => (
                            <Checkbox
                                key={school.id}
                                label={school.name}
                                checked={selectedSchools.includes(school.id)}
                                onChange={() => handleSchoolToggle(school.id)}
                            />
                        ))}
                    </div>
                </Card>
            )}

            {/* NO DATA MESSAGE - ONLY IN SCHOOL MODE */}
            {!currentData && viewMode === "school" && (
                <NoticeBox warning title="No Schools Selected">
                    Please select at least one school from the list above to view analytics.
                </NoticeBox>
            )}

            {/* INFO CARD */}
            {currentData && (
                <Card className={classes.infoCard}>
                    <h3 className={classes.clusterTitle}>
                        {viewMode === "cluster" ? selectedCluster : `${selectedSchools.length} School(s) Selected`}
                    </h3>
                    <div className={classes.clusterStats}>
                        {viewMode === "cluster" && (
                            <div className={classes.statItem}>
                                <span className={classes.statLabel}>Schools</span>
                                <span className={classes.statValue}>{currentData.totalSchools}</span>
                            </div>
                        )}
                        <div className={classes.statItem}>
                            <span className={classes.statLabel}>Total Learners</span>
                            <span className={classes.statValue}>{currentData.totalLearners}</span>
                        </div>
                        <div className={classes.statItem}>
                            <span className={classes.statLabel}>Total Teachers</span>
                            <span className={classes.statValue}>{currentData.totalTeachers}</span>
                        </div>
                    </div>
                </Card>
            )}

            {/* METRICS */}
            {currentData && (
                <div className={classes.metricsContainer}>
                {metrics.map((metric) => {
                    const status = getStatusForMetric(
                        metric.value,
                        metric.standard,
                        metric.key
                    );
                    const isExpanded = openMetric === metric.key;

                    return (
                        <Card key={metric.key} className={classes.metricCard}>
                            <div className={classes.metricHeader}>
                                <div className={classes.metricIconWrapper}>
                                    {renderStatusIcon(status.severity)}
                                </div>
                                <div className={classes.metricTextBlock}>
                                    <div className={classes.metricLabel}>
                                        {metric.label}
                                    </div>
                                    <div className={classes.metricValue}>
                                        {formatRatio(metric.value, metric.key)}{metric.suffix}
                                    </div>
                                    <div className={classes.metricStatus}>
                                        {status.label}
                                    </div>
                                    <div className={classes.metricStandard}>
                                        Standard: {metric.standard.label}
                                    </div>
                                </div>
                            </div>

                            <p className={classes.metricDescription}>
                                {metric.description}
                            </p>

                            <Button
                                small
                                onClick={() => toggleOpen(metric.key)}
                                className={classes.detailsButton}
                            >
                                {isExpanded ? "Hide details" : "See details"}
                            </Button>

                            {isExpanded && (
                                <div className={classes.expandedContent}>
                                    {/* TIME SERIES CHART */}
                                    <div className={classes.chartWrapper}>
                                        <HighchartsReact
                                            highcharts={Highcharts}
                                            options={createTimeSeriesChart(
                                                metric,
                                                metric.color,
                                                metric.standard
                                            )}
                                        />
                                    </div>

                                    {/* COMPARISON CHART */}
                                    {((viewMode === "cluster" && comparisonClusters.length > 0) ||
                                        (viewMode === "school" && selectedSchools.length > 1)) && (
                                        <div className={classes.chartWrapper}>
                                            <HighchartsReact
                                                highcharts={Highcharts}
                                                options={createComparisonChart(
                                                    metric,
                                                    metric.color,
                                                    metric.standard
                                                )}
                                            />
                                        </div>
                                    )}

                                    {/* RECOMMENDATION */}
                                    <Card className={classes.recommendationCard}>
                                        <h4 className={classes.recommendationTitle}>Recommendation</h4>
                                        <div className={classes.recommendationText}>
                                            {status.severity === "critical" && (
                                                <p>
                                                    This metric is <strong>below standard</strong>{" "}
                                                    and requires immediate attention. Consider
                                                    resource reallocation or targeted interventions.
                                                </p>
                                            )}
                                            {status.severity === "limited" && (
                                                <p>
                                                    This metric is <strong>close to standard</strong>.
                                                    Plan follow-up actions to meet the minimum requirement.
                                                </p>
                                            )}
                                            {status.severity === "adequate" && (
                                                <p>
                                                    This metric <strong>meets the standard</strong>.
                                                    Continue monitoring and maintain current levels.
                                                </p>
                                            )}
                                        </div>
                                    </Card>
                                </div>
                            )}
                        </Card>
                    );
                })}
                </div>
            )}
        </div>
    );
}
