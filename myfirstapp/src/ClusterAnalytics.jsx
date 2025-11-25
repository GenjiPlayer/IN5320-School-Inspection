// src/ClusterAnalytics.jsx
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

// IMPORT Analytics.module.css for consistent styling
import classes from "./Analytics.module.css";

// ========== API CONFIGURATION ==========
const API_BASE = "https://research.im.dhis2.org/in5320g20/api";
const CREDENTIALS = "Basic " + btoa("admin:district");
const RESOURCE_PROGRAM_ID = "uvpW17dnfUS";
const LEARNER_DATA_ELEMENT = "ue3QIMOAC7G";
const TEACHER_PROGRAM = "rmuGQ7kBQBU";

const DATA_ELEMENTS = {
    SEATS: "fgUU2XNkGvI",
    BOOKS: "m9k3VefvGQw",
    CLASSROOMS: "mlbyc3CWNyb",
    TOILETS: "slYohGwjQme",
};

const CLUSTERS = {
    "Jambalaya Cluster": { id: "Jj1IUjjPaWf" },
    "Pepper Cluster": { id: "GWRcrane4FY" }
};

// ========== MINIMUM STANDARDS ==========
const MINIMUM_STANDARDS = {
    seatToLearner: { min: 1.0, label: "1:1 (one seat per learner)" },
    textbookToLearner: { min: 1.0, label: "1:1 (one textbook per learner)" },
    learnersPerClassroom: { max: 53, label: "<53:1 (less than 53 learners per classroom)" },
    learnersPerTeacher: { max: 45, label: "<45:1 (less than 45 learners per teacher)" },
    learnersPerToilet: { max: 25, label: "<25:1 (maximum 25 learners per toilet)" },
    genderParityIndex: { target: 1.0, label: "1.0 (equal ratio of girls to boys)" },
};

// ========== HELPER FUNCTIONS ==========
const getStatusForMetric = (value, standard) => {
    if (value === null || value === undefined || isNaN(value)) {
        return { severity: "unknown", label: "No data" };
    }

    if (standard.min !== undefined) {
        if (value >= standard.min) {
            return { severity: "adequate", label: "Meets standard" };
        } else if (value >= standard.min * 0.8) {
            return { severity: "limited", label: "Below standard" };
        } else {
            return { severity: "critical", label: "Critical shortage" };
        }
    }

    if (standard.max !== undefined) {
        if (value <= standard.max) {
            return { severity: "adequate", label: "Meets standard" };
        } else if (value <= standard.max * 1.2) {
            return { severity: "limited", label: "Above standard" };
        } else {
            return { severity: "critical", label: "Critical overcrowding" };
        }
    }

    if (standard.target !== undefined) {
        const tolerance = standard.tolerance || 0.1;
        if (Math.abs(value - standard.target) <= tolerance) {
            return { severity: "adequate", label: "Balanced" };
        } else if (Math.abs(value - standard.target) <= tolerance * 2) {
            return { severity: "limited", label: "Slight imbalance" };
        } else {
            return { severity: "critical", label: "Significant imbalance" };
        }
    }

    return { severity: "unknown", label: "No data" };
};

const renderStatusIcon = (severity) => {
    if (severity === "critical") {
        return <IconWarningFilled24 color="#d32f2f" />;
    }
    if (severity === "limited") {
        return <IconInfoFilled24 color="#fb8c00" />;
    }
    if (severity === "adequate") {
        return <IconCheckmarkCircle24 color="#43a047" />;
    }
    return <IconInfoFilled24 color="#757575" />;
};

const formatRatio = (value) => {
    if (value === null || value === undefined || isNaN(value)) return "N/A";
    return Number(value).toFixed(2);
};

const getSeverityColor = (severity) => {
    if (severity === "critical") return "#d32f2f";
    if (severity === "limited") return "#fb8c00";
    if (severity === "adequate") return "#43a047";
    return "#757575";
};

const calculateClusterStats = (timeSeries, metricKey) => {
    if (!timeSeries || timeSeries.length === 0) return null;

    const values = timeSeries.map((p) => p[metricKey]).filter((v) => v != null && v > 0);
    if (values.length === 0) return null;

    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return { avg, stdDev };
};

// ========== MAIN COMPONENT ==========
export default function ClusterAnalytics({ setActivePage }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [clusters, setClusters] = useState([]);
    const [selectedCluster, setSelectedCluster] = useState("");
    const [comparisonClusters, setComparisonClusters] = useState([]);
    const [clusterDataMap, setClusterDataMap] = useState({});
    const [schoolDataMap, setSchoolDataMap] = useState({});
    const [viewMode, setViewMode] = useState("cluster");
    const [selectedSchools, setSelectedSchools] = useState([]);

    // ========== DATA FETCHING ==========
    useEffect(() => {
        fetchClusters();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchClusters = async () => {
        try {
            const clusterNames = Object.keys(CLUSTERS);
            setClusters(clusterNames);

            if (clusterNames.length > 0) {
                setSelectedCluster(clusterNames[0]);
                await processAllClusters();
            }

            setLoading(false);
        } catch (err) {
            setError("Failed to fetch clusters: " + err.message);
            setLoading(false);
        }
    };

    const processAllClusters = async () => {
        const clusterMap = {};
        const schoolMap = {};

        for (const clusterName of Object.keys(CLUSTERS)) {
            const clusterId = CLUSTERS[clusterName].id;
            const data = await fetchClusterData(clusterId, clusterName);
            clusterMap[clusterName] = data.clusterData;
            Object.assign(schoolMap, data.schoolDataMap);
        }

        setClusterDataMap(clusterMap);
        setSchoolDataMap(schoolMap);
    };

    const fetchClusterData = async (clusterId, clusterName) => {
        try {
            // Fetch schools in cluster
            const schoolsRes = await fetch(
                `${API_BASE}/organisationUnits?filter=parent.id:eq:${clusterId}&fields=id,name&pageSize=200`,
                { headers: { Authorization: CREDENTIALS } }
            );
            const schoolsData = await schoolsRes.json();
            const schools = schoolsData.organisationUnits || [];

            let totalLearners = 0;
            let totalTeachers = 0;
            let totalSeats = 0;
            let totalTextbooks = 0;
            let totalClassrooms = 0;
            let totalToilets = 0;

            const timeSeriesData = {};
            const schoolDataMap = {};

            // Fetch data for each school
            for (const school of schools) {
                const learnersRes = await fetch(
                    `${API_BASE}/analytics.json?dimension=dx:${LEARNER_DATA_ELEMENT}&dimension=ou:${school.id}&dimension=pe:2020`,
                    { headers: { Authorization: CREDENTIALS } }
                );
                const learnersData = await learnersRes.json();

                let learners = 0;
                if (learnersData.rows && learnersData.rows.length > 0) {
                    learnersData.rows.forEach(row => {
                        const value = parseInt(row[3], 10) || 0;
                        learners += value;
                    });
                }

                // Fetch teacher data
                const teachersRes = await fetch(
                    `${API_BASE}/tracker/events.json?program=${TEACHER_PROGRAM}&orgUnit=${school.id}&pageSize=1000`,
                    { headers: { Authorization: CREDENTIALS } }
                );
                const teachersData = await teachersRes.json();
                const teacherCount = teachersData.events?.length || 0;

                // Fetch resource data
                const resourcesRes = await fetch(
                    `${API_BASE}/tracker/events.json?program=${RESOURCE_PROGRAM_ID}&orgUnit=${school.id}&pageSize=100`,
                    { headers: { Authorization: CREDENTIALS } }
                );
                const resourcesData = await resourcesRes.json();
                const events = resourcesData.events || [];

                let totalSeatsSchool = 0;
                let totalTextbooksSchool = 0;
                let totalClassroomsSchool = 0;
                let totalToiletsSchool = 0;

                // Process each event for time series
                events.forEach((event) => {
                    const month = (event.occurredAt || event.eventDate || "").substring(0, 7);

                    if (!timeSeriesData[month]) {
                        timeSeriesData[month] = {
                            totalLearners: 0,
                            totalTeachers: 0,
                            totalSeats: 0,
                            totalTextbooks: 0,
                            totalClassrooms: 0,
                            totalToilets: 0,
                        };
                    }

                    const dataValues = event.dataValues || [];
                    const getVal = (id) => parseInt(dataValues.find(dv => dv.dataElement === id)?.value || 0, 10);

                    timeSeriesData[month].totalLearners += learners;
                    timeSeriesData[month].totalTeachers += teacherCount;
                    timeSeriesData[month].totalSeats += getVal(DATA_ELEMENTS.SEATS);
                    timeSeriesData[month].totalTextbooks += getVal(DATA_ELEMENTS.BOOKS);
                    timeSeriesData[month].totalClassrooms += getVal(DATA_ELEMENTS.CLASSROOMS);
                    timeSeriesData[month].totalToilets += getVal(DATA_ELEMENTS.TOILETS);
                });

                // Get latest values for this school
                const latestEvent = events[0];
                if (latestEvent) {
                    const dataValues = latestEvent.dataValues || [];
                    const getVal = (id) => parseInt(dataValues.find(dv => dv.dataElement === id)?.value || 0, 10);

                    totalSeatsSchool = getVal(DATA_ELEMENTS.SEATS);
                    totalTextbooksSchool = getVal(DATA_ELEMENTS.BOOKS);
                    totalClassroomsSchool = getVal(DATA_ELEMENTS.CLASSROOMS);
                    totalToiletsSchool = getVal(DATA_ELEMENTS.TOILETS);
                }

                // Add to cluster totals
                totalLearners += learners;
                totalTeachers += teacherCount;
                totalSeats += totalSeatsSchool;
                totalTextbooks += totalTextbooksSchool;
                totalClassrooms += totalClassroomsSchool;
                totalToilets += totalToiletsSchool;

                // Store individual school data
                schoolDataMap[school.id] = {
                    id: school.id,
                    name: school.name,
                    clusterName: clusterName,
                    totalLearners: learners,
                    totalTeachers: teacherCount,
                    totalSeats: totalSeatsSchool,
                    totalTextbooks: totalTextbooksSchool,
                    totalClassrooms: totalClassroomsSchool,
                    totalToilets: totalToiletsSchool,
                    ratios: {
                        seatToLearner: learners > 0 ? parseFloat((totalSeatsSchool / learners).toFixed(2)) : 0,
                        textbookToLearner: learners > 0 ? parseFloat((totalTextbooksSchool / learners).toFixed(2)) : 0,
                        learnersPerClassroom: totalClassroomsSchool > 0 ? parseFloat((learners / totalClassroomsSchool).toFixed(2)) : 0,
                        learnersPerTeacher: teacherCount > 0 ? parseFloat((learners / teacherCount).toFixed(2)) : 0,
                        learnersPerToilet: totalToiletsSchool > 0 ? parseFloat((learners / totalToiletsSchool).toFixed(2)) : 0,
                    },
                };
            }

            // Calculate time series with ratios
            const timeSeries = Object.keys(timeSeriesData).sort().map(month => {
                const data = timeSeriesData[month];
                return {
                    month,
                    learners: data.totalLearners,
                    teachers: data.totalTeachers,
                    seats: data.totalSeats,
                    books: data.totalTextbooks,
                    classrooms: data.totalClassrooms,
                    toilets: data.totalToilets,
                    seatToLearner: data.totalLearners > 0 ? parseFloat((data.totalSeats / data.totalLearners).toFixed(2)) : 0,
                    textbookToLearner: data.totalLearners > 0 ? parseFloat((data.totalTextbooks / data.totalLearners).toFixed(2)) : 0,
                    learnersPerClassroom: data.totalClassrooms > 0 ? parseFloat((data.totalLearners / data.totalClassrooms).toFixed(2)) : 0,
                    learnersPerTeacher: data.totalTeachers > 0 ? parseFloat((data.totalLearners / data.totalTeachers).toFixed(2)) : 0,
                    learnersPerToilet: data.totalToilets > 0 ? parseFloat((data.totalLearners / data.totalToilets).toFixed(2)) : 0,
                };
            });

            return {
                clusterData: {
                    name: clusterName,
                    totalSchools: schools.length,
                    totalLearners,
                    totalTeachers,
                    totalSeats,
                    totalTextbooks,
                    totalClassrooms,
                    totalToilets,
                    ratios: {
                        seatToLearner: totalLearners > 0 ? parseFloat((totalSeats / totalLearners).toFixed(2)) : 0,
                        textbookToLearner: totalLearners > 0 ? parseFloat((totalTextbooks / totalLearners).toFixed(2)) : 0,
                        learnersPerClassroom: totalClassrooms > 0 ? parseFloat((totalLearners / totalClassrooms).toFixed(2)) : 0,
                        learnersPerTeacher: totalTeachers > 0 ? parseFloat((totalLearners / totalTeachers).toFixed(2)) : 0,
                        learnersPerToilet: totalToilets > 0 ? parseFloat((totalLearners / totalToilets).toFixed(2)) : 0,
                    },
                    timeSeries
                },
                schoolDataMap
            };
        } catch (err) {
            console.error("Error fetching cluster data:", err);
            return {
                clusterData: {
                    name: clusterName,
                    totalSchools: 0,
                    totalLearners: 0,
                    totalTeachers: 0,
                    ratios: {},
                    timeSeries: []
                },
                schoolDataMap: {}
            };
        }
    };

    // ========== CHART GENERATION ==========
    const createTimeSeriesChart = (metricKey, label, color, currentValue, standard, timeSeries) => {
        if (!timeSeries || timeSeries.length === 0) return null;

        const clusterStats = calculateClusterStats(timeSeries, metricKey);
        const dataPoints = timeSeries.map((p) => p[metricKey]);
        const categories = timeSeries.map((p) => p.month);

        const areaData = clusterStats
            ? categories.map(() => [
                  Math.max(0, clusterStats.avg - clusterStats.stdDev),
                  clusterStats.avg + clusterStats.stdDev,
              ])
            : [];

        const clusterAvgData = clusterStats ? categories.map(() => clusterStats.avg) : [];

        const plotLines = [];
        if (standard.min !== undefined) {
            plotLines.push({
                color: "#d32f2f",
                dashStyle: "Dash",
                value: standard.min,
                width: 2,
                label: {
                    text: `Min: ${standard.min}`,
                    align: "right",
                    style: { color: "#d32f2f", fontWeight: "bold" },
                },
            });
        }
        if (standard.max !== undefined) {
            plotLines.push({
                color: "#d32f2f",
                dashStyle: "Dash",
                value: standard.max,
                width: 2,
                label: {
                    text: `Max: ${standard.max}`,
                    align: "right",
                    style: { color: "#d32f2f", fontWeight: "bold" },
                },
            });
        }
        if (standard.target !== undefined) {
            plotLines.push({
                color: "#1976d2",
                dashStyle: "Dot",
                value: standard.target,
                width: 2,
                label: {
                    text: `Target: ${standard.target}`,
                    align: "right",
                    style: { color: "#1976d2", fontWeight: "bold" },
                },
            });
        }

        const status = getStatusForMetric(currentValue, standard);
        const finalPointColor = getSeverityColor(status.severity);

        return {
            chart: { type: "line", height: 320, backgroundColor: "#ffffff" },
            title: { text: "" },
            xAxis: {
                categories,
                gridLineColor: "#f0f0f0",
            },
            yAxis: {
                title: { text: label },
                gridLineColor: "#e5e7eb",
                plotLines,
            },
            credits: { enabled: false },
            tooltip: {
                shared: true,
                crosshairs: true,
            },
            series: [
                clusterStats && {
                    name: "±1 SD",
                    data: areaData,
                    type: "arearange",
                    lineWidth: 0,
                    color: "#bbdefb",
                    fillOpacity: 0.3,
                    zIndex: 0,
                    marker: { enabled: false },
                    enableMouseTracking: false,
                },
                clusterStats && {
                    name: "Average",
                    data: clusterAvgData,
                    color: "#1976d2",
                    dashStyle: "Dash",
                    lineWidth: 2,
                    zIndex: 1,
                    marker: { enabled: false },
                },
                {
                    name: label,
                    data: dataPoints.map((val, idx) => ({
                        y: val,
                        marker: {
                            enabled: true,
                            radius: idx === dataPoints.length - 1 ? 6 : 4,
                            fillColor: idx === dataPoints.length - 1 ? finalPointColor : "#e0e0e0",
                        },
                        dataLabels: {
                            enabled: idx === dataPoints.length - 1,
                            format: "{y:.2f}",
                            backgroundColor: finalPointColor,
                            color: "#ffffff",
                            borderRadius: 3,
                            padding: 4,
                            style: {
                                fontSize: "11px",
                                fontWeight: "bold",
                            },
                        },
                    })),
                    color,
                    lineWidth: 2,
                    zIndex: 2,
                    dataLabels: { enabled: false },
                },
            ].filter(Boolean),
        };
    };

    const createComparisonChart = (metricKey, label, color, standard) => {
        const categories = [];
        const dataValues = [];

        if (viewMode === "cluster") {
            // Compare selected cluster with comparison clusters
            [selectedCluster, ...comparisonClusters].forEach((clusterName) => {
                const data = clusterDataMap[clusterName];
                if (data) {
                    categories.push(clusterName);
                    dataValues.push(data.ratios[metricKey] || 0);
                }
            });
        } else {
            // Compare selected schools
            selectedSchools.forEach((schoolId) => {
                const school = schoolDataMap[schoolId];
                if (school) {
                    categories.push(school.name);
                    dataValues.push(school.ratios[metricKey] || 0);
                }
            });
        }

        if (categories.length === 0) return null;

        const plotLines = [];
        if (standard.min !== undefined) {
            plotLines.push({
                color: "#d32f2f",
                dashStyle: "Dash",
                value: standard.min,
                width: 2,
                label: {
                    text: `Min: ${standard.min}`,
                    align: "right",
                    style: { color: "#d32f2f", fontWeight: "bold" },
                },
            });
        }
        if (standard.max !== undefined) {
            plotLines.push({
                color: "#d32f2f",
                dashStyle: "Dash",
                value: standard.max,
                width: 2,
                label: {
                    text: `Max: ${standard.max}`,
                    align: "right",
                    style: { color: "#d32f2f", fontWeight: "bold" },
                },
            });
        }

        return {
            chart: { type: "column", height: 320, backgroundColor: "#ffffff" },
            title: { text: "" },
            xAxis: {
                categories,
                gridLineColor: "#f0f0f0",
            },
            yAxis: {
                title: { text: label },
                gridLineColor: "#e5e7eb",
                plotLines,
            },
            credits: { enabled: false },
            tooltip: {
                shared: false,
            },
            series: [
                {
                    name: label,
                    data: dataValues,
                    color: color,
                },
            ],
        };
    };

    const generateRecommendation = (metricKey, value, standard) => {
        if (value === null || value === undefined || isNaN(value)) {
            return "No data available to generate recommendation.";
        }

        const status = getStatusForMetric(value, standard);
        if (status.severity === "adequate") {
            return "This metric meets the required standard. Continue monitoring.";
        }

        const currentData = getCurrentData();
        if (!currentData) return "Unable to generate recommendation.";

        if (metricKey === "seatToLearner" && standard.min !== undefined) {
            const deficit = standard.min - value;
            if (deficit > 0) {
                const learnersCount = currentData.totalLearners || 0;
                const additionalSeats = Math.ceil(deficit * learnersCount);
                return `Need for approximately ${additionalSeats} additional seats to reach a full 1:1 seating ratio across ${viewMode === "cluster" ? "the cluster" : "selected schools"}.`;
            }
        }

        if (metricKey === "textbookToLearner" && standard.min !== undefined) {
            const deficit = standard.min - value;
            if (deficit > 0) {
                const learnersCount = currentData.totalLearners || 0;
                const additionalBooks = Math.ceil(deficit * learnersCount);
                return `Need for approximately ${additionalBooks} additional textbooks to achieve 1:1 ratio.`;
            }
        }

        if (metricKey === "learnersPerClassroom" && standard.max !== undefined) {
            const excess = value - standard.max;
            if (excess > 0) {
                const neededClassrooms = Math.ceil(excess / standard.max);
                return `Approximately ${neededClassrooms} additional classroom(s) needed to reduce overcrowding.`;
            }
        }

        if (metricKey === "learnersPerTeacher" && standard.max !== undefined) {
            const excess = value - standard.max;
            if (excess > 0) {
                const learnersCount = currentData.totalLearners || 0;
                const additionalTeachers = Math.ceil(learnersCount / standard.max - (currentData.totalTeachers || 0));
                return `Need for approximately ${additionalTeachers} additional teacher(s) to meet the standard ratio.`;
            }
        }

        if (metricKey === "learnersPerToilet" && standard.max !== undefined) {
            const excess = value - standard.max;
            if (excess > 0) {
                const learnersCount = currentData.totalLearners || 0;
                const additionalToilets = Math.ceil(learnersCount / standard.max - (currentData.totalToilets || 0));
                return `Need for approximately ${additionalToilets} additional toilet(s) to meet hygiene standards.`;
            }
        }

        return "This metric requires attention to meet standards.";
    };

    // ========== HANDLERS ==========
    const handleComparisonToggle = (clusterName) => {
        setComparisonClusters((prev) =>
            prev.includes(clusterName)
                ? prev.filter((c) => c !== clusterName)
                : [...prev, clusterName]
        );
    };

    const handleSchoolToggle = (schoolId) => {
        setSelectedSchools((prev) =>
            prev.includes(schoolId)
                ? prev.filter((id) => id !== schoolId)
                : [...prev, schoolId]
        );
    };

    const getAvailableSchools = () => {
        return Object.values(schoolDataMap).filter(
            (s) => s.clusterName === selectedCluster
        );
    };

    const getCurrentData = () => {
        if (viewMode === "cluster") {
            return clusterDataMap[selectedCluster];
        } else {
            // Combine data from selected schools
            if (selectedSchools.length === 0) return null;

            const combined = {
                totalLearners: 0,
                totalTeachers: 0,
                totalSeats: 0,
                totalTextbooks: 0,
                totalClassrooms: 0,
                totalToilets: 0,
                ratios: {},
            };

            selectedSchools.forEach((id) => {
                const school = schoolDataMap[id];
                if (school) {
                    combined.totalLearners += school.totalLearners || 0;
                    combined.totalTeachers += school.totalTeachers || 0;
                    combined.totalSeats += school.totalSeats || 0;
                    combined.totalTextbooks += school.totalTextbooks || 0;
                    combined.totalClassrooms += school.totalClassrooms || 0;
                    combined.totalToilets += school.totalToilets || 0;
                }
            });

            // Calculate combined ratios
            combined.ratios = {
                seatToLearner: combined.totalLearners > 0 ? parseFloat((combined.totalSeats / combined.totalLearners).toFixed(2)) : 0,
                textbookToLearner: combined.totalLearners > 0 ? parseFloat((combined.totalTextbooks / combined.totalLearners).toFixed(2)) : 0,
                learnersPerClassroom: combined.totalClassrooms > 0 ? parseFloat((combined.totalLearners / combined.totalClassrooms).toFixed(2)) : 0,
                learnersPerTeacher: combined.totalTeachers > 0 ? parseFloat((combined.totalLearners / combined.totalTeachers).toFixed(2)) : 0,
                learnersPerToilet: combined.totalToilets > 0 ? parseFloat((combined.totalLearners / combined.totalToilets).toFixed(2)) : 0,
            };

            return combined;
        }
    };

    // ========== METRICS CONFIGURATION ==========
    const currentData = getCurrentData();
    const currentTimeSeries = viewMode === "cluster" && clusterDataMap[selectedCluster]
        ? clusterDataMap[selectedCluster].timeSeries
        : [];

    const metrics = currentData
        ? [
              {
                  key: "learnersPerTeacher",
                  label: "Teacher Shortage",
                  color: "#d32f2f",
                  standard: MINIMUM_STANDARDS.learnersPerTeacher,
                  description: "Average number of learners per teacher.",
              },
              {
                  key: "learnersPerClassroom",
                  label: "Classroom Capacity",
                  color: "#ef6c00",
                  standard: MINIMUM_STANDARDS.learnersPerClassroom,
                  description: "Average number of learners per classroom.",
              },
              {
                  key: "seatToLearner",
                  label: "Seating Availability",
                  color: "#43a047",
                  standard: MINIMUM_STANDARDS.seatToLearner,
                  description: "Number of seats per learner.",
              },
              {
                  key: "textbookToLearner",
                  label: "Textbook Availability",
                  color: "#fb8c00",
                  standard: MINIMUM_STANDARDS.textbookToLearner,
                  description: "Number of textbooks per learner.",
              },
              {
                  key: "learnersPerToilet",
                  label: "Toilet Ratio",
                  color: "#00897b",
                  standard: MINIMUM_STANDARDS.learnersPerToilet,
                  description: "Average number of learners per toilet.",
              },
          ].map((m) => ({
              ...m,
              value: currentData.ratios[m.key],
          }))
        : [];

    const problemMetrics = metrics.filter((m) => {
        const s = getStatusForMetric(m.value, m.standard);
        return s.severity === "critical" || s.severity === "limited";
    });

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
            <div className={classes.container}>
                <NoticeBox error title="Error">
                    {error}
                </NoticeBox>
            </div>
        );
    }

    return (
        <div className={classes.container}>

            {/* VIEW MODE TOGGLE */}
            <Card style={{ marginBottom: "16px", padding: "16px" }}>
                <div style={{ display: "flex", gap: "12px" }}>
                    <Button
                        onClick={() => {
                            setViewMode("cluster");
                            setSelectedSchools([]);
                        }}
                        primary={viewMode === "cluster"}
                    >
                        Cluster View
                    </Button>
                    <Button
                        onClick={() => setViewMode("school")}
                        primary={viewMode === "school"}
                    >
                        School Comparison
                    </Button>
                </div>
            </Card>

            {/* SELECTOR CARD */}
            {viewMode === "cluster" ? (
                <Card style={{ marginBottom: "16px", padding: "16px" }}>
                    <SingleSelectField
                        label="Select cluster"
                        selected={selectedCluster}
                        onChange={({ selected }) => {
                            setSelectedCluster(selected);
                            setComparisonClusters([]);
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

                    <div style={{ marginTop: "16px" }}>
                        <p style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>Compare with:</p>
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
            ) : (
                <Card style={{ marginBottom: "16px", padding: "16px" }}>
                    <SingleSelectField
                        label="Select base cluster"
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

                    <div style={{ marginTop: "16px" }}>
                        <p style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>Select schools to compare:</p>
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

            {/* NO DATA MESSAGE */}
            {!currentData && viewMode === "school" && (
                <NoticeBox warning title="No Schools Selected">
                    Please select at least one school from the list above to view analytics.
                </NoticeBox>
            )}

            {/* MAIN ANALYTICS CARD - USING ANALYTICS.JSX STRUCTURE */}
            {currentData && (
                <Card className={classes.mainCard}>
                    <div className={classes.header}>
                        <h2 className={classes.schoolTitle}>
                            {viewMode === "cluster"
                                ? selectedCluster
                                : `${selectedSchools.length} School(s) Selected`}
                        </h2>
                        <div style={{ display: "flex", gap: "24px", marginTop: "12px", fontSize: "14px", color: "#6e7a8a" }}>
                            {viewMode === "cluster" && (
                                <div>
                                    <strong>Schools:</strong> {currentData.totalSchools}
                                </div>
                            )}
                            <div>
                                <strong>Total Learners:</strong> {currentData.totalLearners}
                            </div>
                            <div>
                                <strong>Total Teachers:</strong> {currentData.totalTeachers}
                            </div>
                        </div>
                    </div>

                    {metrics.length === 0 && (
                        <div className={classes.noData}>
                            No data available for this selection.
                        </div>
                    )}

                    {metrics.length > 0 && (
                        <>
                            <div className={classes.metricsSection}>
                                {metrics.map((metric) => {
                                    const status = getStatusForMetric(metric.value, metric.standard);

                                    return (
                                        <div key={metric.key} className={classes.metricRow}>
                                            {/* METRIC HEADER */}
                                            <div className={classes.metricHeader}>
                                                <div className={classes.metricIcon}>
                                                    {renderStatusIcon(status.severity)}
                                                </div>

                                                <div className={classes.metricText}>
                                                    <div className={classes.metricTitle}>
                                                        {metric.label} – {status.label}
                                                    </div>
                                                    <div className={classes.metricSubtitle}>
                                                        Latest value:{" "}
                                                        <strong>
                                                            {metric.value != null
                                                                ? `${formatRatio(metric.value)}${
                                                                      metric.key === "seatToLearner" ||
                                                                      metric.key === "textbookToLearner"
                                                                          ? ":1"
                                                                          : ":1"
                                                                  }`
                                                                : "No data"}
                                                        </strong>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* SEVERITY BORDER */}
                                            <div
                                                className={`${classes.severityBorder} ${
                                                    classes[`severity${status.severity}`]
                                                }`}
                                            />

                                            {/* ALWAYS EXPANDED DETAILS */}
                                            <div className={classes.metricDetails}>
                                                {/* CHART HEADER */}
                                                <div
                                                    className={`${classes.chartHeader} ${
                                                        classes[`chartHeader${status.severity}`]
                                                    }`}
                                                >
                                                    <span className={classes.chartHeaderText}>
                                                        {metric.label}: {formatRatio(metric.value)}{" "}
                                                        {metric.standard.min !== undefined
                                                            ? `(Target ≥ ${metric.standard.min})`
                                                            : metric.standard.max !== undefined
                                                            ? `(Target ≤ ${metric.standard.max})`
                                                            : metric.standard.target !== undefined
                                                            ? `(Target = ${metric.standard.target})`
                                                            : ""}
                                                    </span>
                                                </div>

                                                {/* TIME SERIES CHART */}
                                                {viewMode === "cluster" && currentTimeSeries.length > 0 && createTimeSeriesChart(
                                                    metric.key,
                                                    metric.label,
                                                    metric.color,
                                                    metric.value,
                                                    metric.standard,
                                                    currentTimeSeries
                                                ) && (
                                                    <div className={classes.chartWrapper}>
                                                        <HighchartsReact
                                                            highcharts={Highcharts}
                                                            options={createTimeSeriesChart(
                                                                metric.key,
                                                                metric.label,
                                                                metric.color,
                                                                metric.value,
                                                                metric.standard,
                                                                currentTimeSeries
                                                            )}
                                                        />
                                                    </div>
                                                )}

                                                {/* COMPARISON CHART */}
                                                {((viewMode === "cluster" && comparisonClusters.length > 0) ||
                                                    (viewMode === "school" && selectedSchools.length > 1)) &&
                                                    createComparisonChart(metric.key, metric.label, metric.color, metric.standard) && (
                                                    <div className={classes.chartWrapper}>
                                                        <HighchartsReact
                                                            highcharts={Highcharts}
                                                            options={createComparisonChart(
                                                                metric.key,
                                                                metric.label,
                                                                metric.color,
                                                                metric.standard
                                                            )}
                                                        />
                                                    </div>
                                                )}

                                                {/* DESCRIPTION & RECOMMENDATION */}
                                                <div className={classes.metricAnalysis}>
                                                    <p className={classes.metricDescription}>
                                                        <strong>Description:</strong> {metric.description}
                                                    </p>

                                                    <p className={classes.recommendation}>
                                                        <strong>Recommendation:</strong>{" "}
                                                        {generateRecommendation(
                                                            metric.key,
                                                            metric.value,
                                                            metric.standard
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* SUMMARY SECTION */}
                            {problemMetrics.length > 0 && (
                                <>
                                    <div className={classes.divider} />

                                    <div className={classes.summarySection}>
                                        <div className={classes.summaryHeaderRow}>
                                            <h3 className={classes.summaryTitle}>Summary</h3>
                                        </div>

                                        <div className={classes.summaryCard}>
                                            <p className={classes.summaryIntro}>
                                                <strong>
                                                    {viewMode === "cluster"
                                                        ? selectedCluster
                                                        : "Selected schools"}
                                                </strong>{" "}
                                                {problemMetrics.length > 0 ? "show areas needing improvement:" : "meet basic standards."}
                                            </p>

                                            {problemMetrics.length > 0 && (
                                                <ul className={classes.summaryList}>
                                                    {problemMetrics.map((m) => (
                                                        <li key={m.key}>{m.label}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </Card>
            )}
        </div>
    );
}
