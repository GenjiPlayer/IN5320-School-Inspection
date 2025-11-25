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

// ========== API CONFIGURATION ==========
const API_BASE = "https://research.im.dhis2.org/in5320g20/api";
const CREDENTIALS = "Basic " + btoa("admin:district");
const RESOURCE_PROGRAM_ID = "uvpW17dnfUS";
const LEARNER_DATA_ELEMENT = "ue3QIMOAC7G";
const TEACHER_PROGRAM = "rmuGQ7kBQBU";

const CLUSTERS = {
    "Jambalaya Cluster": { id: "Jj1IUjjPaWf" },
    "Pepper Cluster": { id: "GWRcrane4FY" }
};

export default function ClusterAnalytics({ setActivePage }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [clusters, setClusters] = useState([]);
    const [selectedCluster, setSelectedCluster] = useState("");
    const [comparisonClusters, setComparisonClusters] = useState([]);
    const [clusterDataMap, setClusterDataMap] = useState({});
    const [schoolDataMap, setSchoolDataMap] = useState({});
    const [openMetric, setOpenMetric] = useState(null);
    const [viewMode, setViewMode] = useState("cluster");
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

    // ========== FETCH CLUSTERS FROM API ==========
    useEffect(() => {
        fetchClusters();
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
            let totalBoys = 0;
            let totalGirls = 0;

            const timeSeriesData = {};
            const schoolDataMap = {};

            // Fetch data for each school
            for (const school of schools) {
                // Fetch learner data
                const learnersRes = await fetch(
                    `${API_BASE}/analytics.json?dimension=dx:${LEARNER_DATA_ELEMENT}&dimension=ou:${school.id}&dimension=pe:LAST_12_MONTHS`,
                    { headers: { Authorization: CREDENTIALS } }
                );
                const learnersData = await learnersRes.json();

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

                // Process each event for time series
                events.forEach((event) => {
                    const date = (event.occurredAt || event.eventDate || "").substring(0, 7); // YYYY-MM

                    if (!timeSeriesData[date]) {
                        timeSeriesData[date] = {
                            totalLearners: 0,
                            totalTeachers: 0,
                            totalSeats: 0,
                            totalTextbooks: 0,
                            totalClassrooms: 0,
                            totalToilets: 0,
                            totalBoys: 0,
                            totalGirls: 0,
                        };
                    }

                    const dataValues = event.dataValues || [];
                    const learnerRows = learnersData.rows || [];
                    const learnerCount = parseInt(learnerRows[0]?.[3] || 0);

                    timeSeriesData[date].totalLearners += learnerCount;
                    timeSeriesData[date].totalTeachers += teacherCount;
                    timeSeriesData[date].totalSeats += parseInt(dataValues.find(dv => dv.dataElement === "fgUU2XNkGvI")?.value || 0);
                    timeSeriesData[date].totalTextbooks += parseInt(dataValues.find(dv => dv.dataElement === "m9k3VefvGQw")?.value || 0);
                    timeSeriesData[date].totalClassrooms += parseInt(dataValues.find(dv => dv.dataElement === "mlbyc3CWNyb")?.value || 0);
                    timeSeriesData[date].totalToilets += parseInt(dataValues.find(dv => dv.dataElement === "slYohGwjQme")?.value || 0);
                });

                // Get latest values for aggregation
                const latestEvent = events[0];
                if (latestEvent) {
                    const dataValues = latestEvent.dataValues || [];
                    const learnerRows = learnersData.rows || [];
                    const learners = parseInt(learnerRows[0]?.[3] || 0);

                    totalLearners += learners;
                    totalTeachers += teacherCount;
                    totalSeats += parseInt(dataValues.find(dv => dv.dataElement === "fgUU2XNkGvI")?.value || 0);
                    totalTextbooks += parseInt(dataValues.find(dv => dv.dataElement === "m9k3VefvGQw")?.value || 0);
                    totalClassrooms += parseInt(dataValues.find(dv => dv.dataElement === "mlbyc3CWNyb")?.value || 0);
                    totalToilets += parseInt(dataValues.find(dv => dv.dataElement === "slYohGwjQme")?.value || 0);

                    // Store individual school data
                    schoolDataMap[school.id] = {
                        id: school.id,
                        name: school.name,
                        clusterName: clusterName,
                        totalLearners: learners,
                        totalTeachers: teacherCount,
                        totalSchools: 1,
                        ratios: {
                            seatToLearner: learners > 0 ? parseFloat((totalSeats / learners).toFixed(2)) : 0,
                            textbookToLearner: learners > 0 ? parseFloat((totalTextbooks / learners).toFixed(2)) : 0,
                            learnersPerClassroom: totalClassrooms > 0 ? parseFloat((learners / totalClassrooms).toFixed(2)) : 0,
                            learnersPerTeacher: teacherCount > 0 ? parseFloat((learners / teacherCount).toFixed(2)) : 0,
                            learnersPerToilet: totalToilets > 0 ? parseFloat((learners / totalToilets).toFixed(2)) : 0,
                        },
                        timeSeries: []
                    };
                }
            }

            // Calculate time series with ratios
            const timeSeries = Object.keys(timeSeriesData).sort().map(month => {
                const data = timeSeriesData[month];
                return {
                    month,
                    ...data,
                    seatToLearner: data.totalLearners > 0 ? parseFloat((data.totalSeats / data.totalLearners).toFixed(2)) : 0,
                    textbookToLearner: data.totalLearners > 0 ? parseFloat((data.totalTextbooks / data.totalLearners).toFixed(2)) : 0,
                    learnersPerClassroom: data.totalClassrooms > 0 ? parseFloat((data.totalLearners / data.totalClassrooms).toFixed(2)) : 0,
                    learnersPerTeacher: data.totalTeachers > 0 ? parseFloat((data.totalLearners / data.totalTeachers).toFixed(2)) : 0,
                    learnersPerToilet: data.totalToilets > 0 ? parseFloat((data.totalLearners / data.totalToilets).toFixed(2)) : 0,
                };
            });

            return {
                clusterData: {
                    totalSchools: schools.length,
                    totalLearners,
                    totalTeachers,
                    totalClassrooms,
                    totalSeats,
                    totalTextbooks,
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

    // ========== HELPER FUNCTIONS (KEEP AS IS) ==========
    const toggleOpen = (metric) => {
        setOpenMetric((prev) => (prev === metric ? null : metric));
    };

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
        if (viewMode === "cluster") {
            return Object.values(schoolDataMap).filter(
                (s) => s.clusterName === selectedCluster
            );
        }
        return [];
    };

    const getStatusForMetric = (value, standard, metricKey) => {
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
        switch (severity) {
            case "adequate":
                return <IconCheckmarkCircle24 className={classes.iconGood} />;
            case "limited":
                return <IconInfoFilled24 className={classes.iconWarning} />;
            case "critical":
                return <IconWarningFilled24 className={classes.iconCritical} />;
            default:
                return <IconInfoFilled24 />;
        }
    };

    const formatRatio = (value, metricKey) => {
        if (value === null || value === undefined || isNaN(value)) {
            return "N/A";
        }
        return parseFloat(value).toFixed(2);
    };

    const createTimeSeriesChart = (metric, color, standard) => {
        const currentData = viewMode === "cluster"
            ? clusterDataMap[selectedCluster]
            : getCombinedSchoolData();

        if (!currentData || !currentData.timeSeries || currentData.timeSeries.length === 0) {
            return null;
        }

        const seriesData = currentData.timeSeries.map((point) => ({
            x: new Date(point.month + "-01").getTime(),
            y: point[metric.key] || 0,
        }));

        return {
            chart: { type: "line", height: 300 },
            title: { text: `${metric.label} Over Time` },
            xAxis: { type: "datetime" },
            yAxis: {
                title: { text: metric.label },
                plotLines: standard.max !== undefined
                    ? [{ value: standard.max, color: "red", dashStyle: "Dash", width: 2, label: { text: `Max: ${standard.max}` } }]
                    : standard.min !== undefined
                        ? [{ value: standard.min, color: "red", dashStyle: "Dash", width: 2, label: { text: `Min: ${standard.min}` } }]
                        : [],
            },
            series: [{ name: metric.label, data: seriesData, color: color }],
            credits: { enabled: false },
        };
    };

    const createComparisonChart = (metric, color, standard) => {
        const allData = viewMode === "cluster"
            ? [selectedCluster, ...comparisonClusters].map((name) => ({
                name,
                value: clusterDataMap[name]?.ratios[metric.key] || 0,
            }))
            : selectedSchools.map((id) => ({
                name: schoolDataMap[id]?.name || id,
                value: schoolDataMap[id]?.ratios[metric.key] || 0,
            }));

        return {
            chart: { type: "column", height: 300 },
            title: { text: `${metric.label} Comparison` },
            xAxis: { categories: allData.map((d) => d.name) },
            yAxis: {
                title: { text: metric.label },
                plotLines: standard.max !== undefined
                    ? [{ value: standard.max, color: "red", dashStyle: "Dash", width: 2 }]
                    : standard.min !== undefined
                        ? [{ value: standard.min, color: "red", dashStyle: "Dash", width: 2 }]
                        : [],
            },
            series: [{ name: metric.label, data: allData.map((d) => d.value), color: color }],
            credits: { enabled: false },
        };
    };

    const getCombinedSchoolData = () => {
        if (selectedSchools.length === 0) return null;

        const combined = {
            totalSchools: selectedSchools.length,
            totalLearners: 0,
            totalTeachers: 0,
            ratios: {},
            timeSeries: []
        };

        selectedSchools.forEach((id) => {
            const school = schoolDataMap[id];
            if (school) {
                combined.totalLearners += school.totalLearners || 0;
                combined.totalTeachers += school.totalTeachers || 0;
            }
        });

        // Calculate combined ratios
        const allRatios = selectedSchools.map(id => schoolDataMap[id]?.ratios).filter(Boolean);
        Object.keys(MINIMUM_STANDARDS).forEach(key => {
            const values = allRatios.map(r => r[key]).filter(v => v > 0);
            combined.ratios[key] = values.length > 0
                ? parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2))
                : 0;
        });

        return combined;
    };

    // ========== METRICS CONFIGURATION ==========
    const currentData = viewMode === "cluster"
        ? clusterDataMap[selectedCluster]
        : getCombinedSchoolData();

    const metrics = currentData
        ? [
            {
                key: "seatToLearner",
                label: "Seat-to-Learner Ratio",
                value: currentData.ratios.seatToLearner,
                standard: MINIMUM_STANDARDS.seatToLearner,
                description: "Number of seats available per learner",
                color: "#2196f3",
                suffix: ":1",
            },
            {
                key: "textbookToLearner",
                label: "Textbook-to-Learner Ratio",
                value: currentData.ratios.textbookToLearner,
                standard: MINIMUM_STANDARDS.textbookToLearner,
                description: "Number of textbooks available per learner",
                color: "#4caf50",
                suffix: ":1",
            },
            {
                key: "learnersPerClassroom",
                label: "Learners per Classroom",
                value: currentData.ratios.learnersPerClassroom,
                standard: MINIMUM_STANDARDS.learnersPerClassroom,
                description: "Average number of learners per classroom",
                color: "#ff9800",
                suffix: ":1",
            },
            {
                key: "learnersPerTeacher",
                label: "Learners per Teacher",
                value: currentData.ratios.learnersPerTeacher,
                standard: MINIMUM_STANDARDS.learnersPerTeacher,
                description: "Average number of learners per teacher",
                color: "#9c27b0",
                suffix: ":1",
            },
            {
                key: "learnersPerToilet",
                label: "Learners per Toilet",
                value: currentData.ratios.learnersPerToilet,
                standard: MINIMUM_STANDARDS.learnersPerToilet,
                description: "Average number of learners per toilet facility",
                color: "#f44336",
                suffix: ":1",
            },
        ]
        : [];

    // ========== RENDER ==========
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

    return (
        <div className={classes.pageWrapper}>
            {/* HEADER */}
            <div className={classes.pageHeader}>
                <Button small icon={<IconArrowLeft24 />} onClick={() => setActivePage("dashboard")} />
                <h2>Cluster Analytics</h2>
            </div>

            {/* VIEW MODE TOGGLE */}
            <Card className={classes.viewModeCard}>
                <div className={classes.viewModeButtons}>
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
                <Card className={classes.selectorCard}>
                    <div className={classes.selectorRow}>
                        <div className={classes.mainSelector}>
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
            ) : (
                <Card className={classes.selectorCard}>
                    <div className={classes.selectorRow}>
                        <div className={classes.mainSelector}>
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

            {/* NO DATA MESSAGE */}
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
                                        {createTimeSeriesChart(metric, metric.color, metric.standard) && (
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
                                        )}

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