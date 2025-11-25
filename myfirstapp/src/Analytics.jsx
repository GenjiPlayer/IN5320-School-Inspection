// src/D2App/Analytics.jsx
import React, { useState, useEffect } from "react";
import Highcharts from "highcharts";
import "highcharts/highcharts-more";
import HighchartsReact from "highcharts-react-official";
import {
    Card,
    CircularLoader,
    NoticeBox,
    IconWarningFilled24,
    IconInfoFilled24,
    IconCheckmarkCircle24,
} from "@dhis2/ui";

import classes from "./Analytics.module.css";

// ========= API CONFIG =========
const API_BASE = "https://research.im.dhis2.org/in5320g20/api";
const CREDENTIALS = "Basic " + btoa("admin:district");
const RESOURCE_PROGRAM_ID = "uvpW17dnfUS";
const TEACHER_PROGRAM = "rmuGQ7kBQBU";
const LEARNER_DATA_ELEMENT = "ue3QIMOAC7G";

const DATA_ELEMENTS = {
    SEATS: "fgUU2XNkGvI",
    BOOKS: "m9k3VefvGQw",
    CLASSROOMS: "mlbyc3CWNyb",
    TOILETS: "slYohGwjQme",
};

// ========= MINIMUM STANDARDS =========
const MINIMUM_STANDARDS = {
    seatToLearner: {
        min: 1.0,
        label: "1:1 (one seat per learner)",
    },
    textbookToLearner: {
        min: 1.0,
        label: "1:1 (one textbook per learner)",
    },
    learnersPerClassroom: {
        max: 53,
        label: "<53:1 (less than 53 learners per classroom)",
    },
    learnersPerTeacher: {
        max: 45,
        label: "<45:1 (less than 45 learners per teacher)",
    },
    learnersPerToilet: {
        max: 25,
        label: "<25:1 (maximum 25 learners per toilet)",
    },
    genderParityIndex: {
        target: 1.0,
        label: "1.0 (equal ratio of girls to boys)",
    },
};

// ========= HELPERS =========
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

// ========= MAIN COMPONENT =========
export default function Analytics({ selectedSchoolId: initialSchoolId }) {
    const [schools, setSchools] = useState([]);
    const [selectedSchoolId, setSelectedSchoolId] = useState(
        initialSchoolId || ""
    );
    const [currentSchool, setCurrentSchool] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [timeSeries, setTimeSeries] = useState([]);
    const [ratios, setRatios] = useState(null);
    const [openMetric, setOpenMetric] = useState(null);

    const [followUp, setFollowUp] = useState(true);
    const [nextVisit, setNextVisit] = useState("10. Jan 2026");

    // ---- 1. hent skoler ----
    useEffect(() => {
        const fetchSchools = async () => {
            try {
                const res = await fetch(
                    `${API_BASE}/organisationUnits?filter=level:eq:5&filter=parent.name:eq:Jambalaya%20Cluster&fields=id,name&pageSize=1000`,
                    { headers: { Authorization: CREDENTIALS } }
                );
                const data = await res.json();
                const list = data.organisationUnits || [];
                setSchools(list);

                if (initialSchoolId && list.find((s) => s.id === initialSchoolId)) {
                    setSelectedSchoolId(initialSchoolId);
                    setCurrentSchool(list.find((s) => s.id === initialSchoolId));
                } else if (list.length > 0) {
                    setSelectedSchoolId(list[0].id);
                    setCurrentSchool(list[0]);
                }
            } catch (err) {
                setError("Failed to fetch schools: " + err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchSchools();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ---- 2. hent analytics for valgt skole ----
    useEffect(() => {
        if (!selectedSchoolId) return;

        const school = schools.find((s) => s.id === selectedSchoolId) || null;
        setCurrentSchool(school);

        const loadSchoolData = async () => {
            setLoading(true);
            setError(null);

            try {
                const learnersRes = await fetch(
                    `${API_BASE}/analytics.json?dimension=dx:${LEARNER_DATA_ELEMENT}&dimension=ou:${selectedSchoolId}&dimension=pe:2020`,
                    { headers: { Authorization: CREDENTIALS } }
                );
                const learnersData = await learnersRes.json();

                let learners = 0;
                if (learnersData.rows && learnersData.rows.length > 0) {
                    learnersData.rows.forEach((row) => {
                        const v = parseInt(row[3], 10) || 0;
                        learners += v;
                    });
                }

                const teachersRes = await fetch(
                    `${API_BASE}/tracker/events.json?program=${TEACHER_PROGRAM}&orgUnit=${selectedSchoolId}&pageSize=1000`,
                    { headers: { Authorization: CREDENTIALS } }
                );
                const teachersData = await teachersRes.json();
                const teacherCount = teachersData.events?.length || 0;

                const resRes = await fetch(
                    `${API_BASE}/tracker/events.json?program=${RESOURCE_PROGRAM_ID}&orgUnit=${selectedSchoolId}&pageSize=100`,
                    { headers: { Authorization: CREDENTIALS } }
                );
                const resData = await resRes.json();
                const events = resData.events || [];

                const tsMap = {};

                events.forEach((event) => {
                    const month = (event.occurredAt || event.eventDate || "").slice(
                        0,
                        7
                    );
                    if (!month) return;

                    if (!tsMap[month]) {
                        tsMap[month] = {
                            totalLearners: learners,
                            totalTeachers: teacherCount,
                            seats: 0,
                            books: 0,
                            classrooms: 0,
                            toilets: 0,
                        };
                    }

                    const dvs = event.dataValues || [];
                    const getVal = (id) =>
                        parseInt(
                            dvs.find((dv) => dv.dataElement === id)?.value || 0,
                            10
                        );

                    tsMap[month].seats = getVal(DATA_ELEMENTS.SEATS);
                    tsMap[month].books = getVal(DATA_ELEMENTS.BOOKS);
                    tsMap[month].classrooms = getVal(DATA_ELEMENTS.CLASSROOMS);
                    tsMap[month].toilets = getVal(DATA_ELEMENTS.TOILETS);
                });

                const sortedMonths = Object.keys(tsMap).sort();
                const tsArray = sortedMonths.map((m) => {
                    const d = tsMap[m];
                    const seatToLearner =
                        d.totalLearners > 0 ? d.seats / d.totalLearners : null;
                    const textbookToLearner =
                        d.totalLearners > 0 ? d.books / d.totalLearners : null;
                    const learnersPerClassroom =
                        d.classrooms > 0 ? d.totalLearners / d.classrooms : null;
                    const learnersPerTeacher =
                        d.totalTeachers > 0 ? d.totalLearners / d.totalTeachers : null;
                    const learnersPerToilet =
                        d.toilets > 0 ? d.totalLearners / d.toilets : null;

                    return {
                        month: m,
                        learners: d.totalLearners,
                        teachers: d.totalTeachers,
                        seats: d.seats,
                        books: d.books,
                        classrooms: d.classrooms,
                        toilets: d.toilets,
                        seatToLearner,
                        textbookToLearner,
                        learnersPerClassroom,
                        learnersPerTeacher,
                        learnersPerToilet,
                        genderParityIndex: null,
                    };
                });

                setTimeSeries(tsArray);

                const latest = tsArray.length > 0 ? tsArray[tsArray.length - 1] : null;

                setRatios(
                    latest
                        ? {
                              seatToLearner: latest.seatToLearner,
                              textbookToLearner: latest.textbookToLearner,
                              learnersPerClassroom: latest.learnersPerClassroom,
                              learnersPerTeacher: latest.learnersPerTeacher,
                              learnersPerToilet: latest.learnersPerToilet,
                              genderParityIndex: latest.genderParityIndex,
                          }
                        : null
                );
            } catch (err) {
                console.error(err);
                setError("Failed to fetch analytics for this school: " + err.message);
            } finally {
                setLoading(false);
            }
        };

        loadSchoolData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSchoolId, schools]);

    const calculateClusterStats = (metricKey) => {
        if (!timeSeries || timeSeries.length === 0) return null;

        const values = timeSeries.map((p) => p[metricKey]).filter((v) => v != null);
        if (values.length === 0) return null;

        const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);

        return { avg, stdDev };
    };

    const getSeverityColor = (severity) => {
        if (severity === "critical") return "#d32f2f";
        if (severity === "limited") return "#fb8c00";
        if (severity === "adequate") return "#43a047";
        return "#757575";
    };

    const createChartConfig = (metricKey, label, color, currentValue, standard) => {
        if (!timeSeries || timeSeries.length === 0) return null;

        const clusterStats = calculateClusterStats(metricKey);
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
        const s = MINIMUM_STANDARDS[metricKey] || {};
        if (s.min !== undefined) {
            plotLines.push({
                color: "#d32f2f",
                dashStyle: "Dash",
                value: s.min,
                width: 2,
                label: {
                    text: `Min: ${s.min}`,
                    align: "right",
                    style: { color: "#d32f2f", fontWeight: "bold" },
                },
            });
        }
        if (s.max !== undefined) {
            plotLines.push({
                color: "#d32f2f",
                dashStyle: "Dash",
                value: s.max,
                width: 2,
                label: {
                    text: `Max: ${s.max}`,
                    align: "right",
                    style: { color: "#d32f2f", fontWeight: "bold" },
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
                    name: "Cluster ±1 SD",
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
                    name: "Cluster Average",
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
                            style: { fontSize: "11px", fontWeight: "bold" },
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

    const generateRecommendation = (metricKey, value, standard) => {
        if (value === null || value === undefined || isNaN(value)) {
            return "No data available to generate recommendation.";
        }

        const status = getStatusForMetric(value, standard);
        if (status.severity === "adequate") {
            return "This metric meets the required standard. Continue monitoring.";
        }

        if (metricKey === "seatToLearner" && standard.min !== undefined) {
            const deficit = standard.min - value;
            if (deficit > 0) {
                const latest = timeSeries[timeSeries.length - 1];
                const learnersCount = latest?.learners || 0;
                const additionalSeats = Math.ceil(deficit * learnersCount);
                return `Need for approximately ${additionalSeats} additional seats to reach a full 1:1 seating ratio.`;
            }
        }

        if (metricKey === "textbookToLearner" && standard.min !== undefined) {
            const deficit = standard.min - value;
            if (deficit > 0) {
                const latest = timeSeries[timeSeries.length - 1];
                const learnersCount = latest?.learners || 0;
                const additionalBooks = Math.ceil(deficit * learnersCount);
                return `Need for approximately ${additionalBooks} additional textbooks to achieve 1:1 ratio.`;
            }
        }

        if (metricKey === "learnersPerClassroom" && standard.max !== undefined) {
            const excess = value - standard.max;
            if (excess > 0) {
                const latest = timeSeries[timeSeries.length - 1];
                const currentClassrooms = latest?.classrooms || 1;
                const neededClassrooms = Math.ceil(excess / standard.max);
                return `Approximately ${neededClassrooms} additional classroom(s) needed to reduce overcrowding.`;
            }
        }

        if (metricKey === "learnersPerTeacher" && standard.max !== undefined) {
            const excess = value - standard.max;
            if (excess > 0) {
                const latest = timeSeries[timeSeries.length - 1];
                const learnersCount = latest?.learners || 0;
                const additionalTeachers = Math.ceil(learnersCount / standard.max - (latest?.teachers || 0));
                return `Need for approximately ${additionalTeachers} additional teacher(s) to meet the standard ratio.`;
            }
        }

        if (metricKey === "learnersPerToilet" && standard.max !== undefined) {
            const excess = value - standard.max;
            if (excess > 0) {
                const latest = timeSeries[timeSeries.length - 1];
                const learnersCount = latest?.learners || 0;
                const additionalToilets = Math.ceil(learnersCount / standard.max - (latest?.toilets || 0));
                return `Need for approximately ${additionalToilets} additional toilet(s) to meet hygiene standards.`;
            }
        }

        if (metricKey === "genderParityIndex" && standard.target !== undefined) {
            const diff = Math.abs(value - standard.target);
            if (diff > 0.1) {
                return `Gender imbalance detected. Current ratio is ${value.toFixed(2)}. Target is ${standard.target}.`;
            }
        }

        return "This metric requires attention to meet standards.";
    };

    const metrics = ratios
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
              {
                  key: "genderParityIndex",
                  label: "Gender Parity Index",
                  color: "#7b1fa2",
                  standard: MINIMUM_STANDARDS.genderParityIndex,
                  description:
                      "Ratio of girls to boys enrolled. (Currently no data linked.)",
              },
          ].map((m) => ({
              ...m,
              value: ratios[m.key],
          }))
        : [];

    const problemMetrics = metrics.filter((m) => {
        const s = getStatusForMetric(m.value, m.standard);
        return s.severity === "critical" || s.severity === "limited";
    });

    if (loading && !currentSchool) {
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
            <Card className={classes.mainCard}>
                <div className={classes.header}>
                    <h2 className={classes.schoolTitle}>
                        {currentSchool ? currentSchool.name : "Select a school"}
                    </h2>
                </div>

                {metrics.length === 0 && (
                    <div className={classes.noData}>
                        No inspections found for this school. Submit an inspection first.
                    </div>
                )}

                {metrics.length > 0 && (
                    <>
                        <div className={classes.metricsSection}>
                            {metrics.map((metric) => {
                                const status = getStatusForMetric(
                                    metric.value,
                                    metric.standard
                                );
                                const isOpen = openMetric === metric.key;

                                return (
                                    <div key={metric.key} className={classes.metricRow}>
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
                                                                      : metric.key === "genderParityIndex"
                                                                      ? ""
                                                                      : ":1"
                                                              }`
                                                            : "No data"}
                                                    </strong>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                className={classes.detailsButton}
                                                onClick={() =>
                                                    setOpenMetric(isOpen ? null : metric.key)
                                                }
                                            >
                                                details ▾
                                            </button>
                                        </div>

                                        <div
                                            className={`${classes.severityBorder} ${
                                                classes[`severity${status.severity}`]
                                            }`}
                                        />

                                        {isOpen && (
                                            <div className={classes.metricDetails}>
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

                                                {createChartConfig(
                                                    metric.key,
                                                    metric.label,
                                                    metric.color,
                                                    metric.value,
                                                    metric.standard
                                                ) ? (
                                                    <div className={classes.chartWrapper}>
                                                        <HighchartsReact
                                                            highcharts={Highcharts}
                                                            options={createChartConfig(
                                                                metric.key,
                                                                metric.label,
                                                                metric.color,
                                                                metric.value,
                                                                metric.standard
                                                            )}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className={classes.noData}>
                                                        Not enough data to render a chart for this
                                                        metric.
                                                    </div>
                                                )}

                                                <div className={classes.metricAnalysis}>
                                                    <p className={classes.metricDescription}>
                                                        <strong>Description:</strong>{" "}
                                                        {metric.description}
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
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className={classes.divider} />

                        <div className={classes.summarySection}>
                            <h3 className={classes.summaryTitle}>Summary</h3>

                            <p className={classes.summaryText}>
                                <strong>
                                    {currentSchool ? currentSchool.name : "This school"}
                                </strong>{" "}
                                shows several areas needing improvement, particularly:
                            </p>

                            {problemMetrics.length > 0 ? (
                                <ul className={classes.summaryList}>
                                    {problemMetrics.map((m) => (
                                        <li key={m.key}>{m.label}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className={classes.summaryText}>
                                    All tracked indicators currently meet basic target levels.
                                </p>
                            )}

                            <div className={classes.checkboxRow}>
                                <input
                                    type="checkbox"
                                    id="followUpCheckbox"
                                    checked={followUp}
                                    onChange={(e) => setFollowUp(e.target.checked)}
                                    className={classes.checkbox}
                                />
                                <label htmlFor="followUpCheckbox">Mark for follow-up</label>
                            </div>

                            <div className={classes.nextVisitRow}>
                                <span className={classes.nextVisitLabel}>
                                    Next visitation:
                                </span>
                                <strong className={classes.nextVisitDate}>{nextVisit}</strong>
                                <button
                                    type="button"
                                    className={classes.editButton}
                                    onClick={() => {
                                        const newDate = prompt(
                                            "Set next visitation date:",
                                            nextVisit
                                        );
                                        if (newDate) setNextVisit(newDate);
                                    }}
                                >
                                    edit
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </Card>
        </div>
    );
}
