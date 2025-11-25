import React, { useState, useEffect } from "react";
import Highcharts from "highcharts";
import "highcharts/highcharts-more";
import HighchartsReact from "highcharts-react-official";
import {
    Card,
    Button,
    CircularLoader,
    NoticeBox,
    InputField,
    IconCalendar24,
    IconHome24,
    IconAdd24,
    IconChevronDown24,
    IconChevronUp24,
    IconWarningFilled24,
    IconInfoFilled24,
    IconCheckmarkCircle24,
} from "@dhis2/ui";

import reportClasses from "./InspectionReports.module.css";
import analyticsClasses from "./Analytics.module.css";

const API_BASE = "https://research.im.dhis2.org/in5320g20/api";
const CREDENTIALS = "Basic " + btoa("admin:district");
const PROGRAM_ID = "UxK2o06ScIe";
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

// ========= ANALYTICS HELPERS (from Analytics.jsx) =========
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

    const values = timeSeries.map((p) => p[metricKey]).filter((v) => v != null);
    if (values.length === 0) return null;

    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return { avg, stdDev };
};

const createChartConfig = (timeSeries, metricKey, label, color, currentValue, standard) => {
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
        chart: { type: "line", height: 280, backgroundColor: "#ffffff" },
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
                name: "Cluster Avg",
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

const generateRecommendation = (timeSeries, metricKey, value, standard) => {
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

// ========= ANALYTICS DATA COMPONENT =========
function ReportAnalytics({ schoolId, schoolName }) {
    const [timeSeries, setTimeSeries] = useState([]);
    const [ratios, setRatios] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [openMetric, setOpenMetric] = useState(null);

    useEffect(() => {
        const loadSchoolData = async () => {
            setLoading(true);
            setError(null);

            try {
                const learnersRes = await fetch(
                    `${API_BASE}/analytics.json?dimension=dx:${LEARNER_DATA_ELEMENT}&dimension=ou:${schoolId}&dimension=pe:2020`,
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
                    `${API_BASE}/tracker/events.json?program=${TEACHER_PROGRAM}&orgUnit=${schoolId}&pageSize=1000`,
                    { headers: { Authorization: CREDENTIALS } }
                );
                const teachersData = await teachersRes.json();
                const teacherCount = teachersData.events?.length || 0;

                const resRes = await fetch(
                    `${API_BASE}/tracker/events.json?program=${RESOURCE_PROGRAM_ID}&orgUnit=${schoolId}&pageSize=100`,
                    { headers: { Authorization: CREDENTIALS } }
                );
                const resData = await resRes.json();
                const events = resData.events || [];

                const tsMap = {};

                events.forEach((event) => {
                    const month = (event.occurredAt || event.eventDate || "").slice(0, 7);
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
                    const seatToLearner = d.totalLearners > 0 ? d.seats / d.totalLearners : null;
                    const textbookToLearner = d.totalLearners > 0 ? d.books / d.totalLearners : null;
                    const learnersPerClassroom = d.classrooms > 0 ? d.totalLearners / d.classrooms : null;
                    const learnersPerTeacher = d.totalTeachers > 0 ? d.totalLearners / d.totalTeachers : null;
                    const learnersPerToilet = d.toilets > 0 ? d.totalLearners / d.toilets : null;

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
    }, [schoolId]);

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
                  description: "Ratio of girls to boys enrolled. (Currently no data linked.)",
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

    if (loading) {
        return (
            <div className={analyticsClasses.loadingWrapper}>
                <CircularLoader small />
            </div>
        );
    }

    if (error) {
        return <NoticeBox error title="Error">{error}</NoticeBox>;
    }

    if (metrics.length === 0) {
        return (
            <div className={analyticsClasses.noData}>
                No analytics data available for this school.
            </div>
        );
    }

    return (
        <div style={{ marginTop: "16px" }}>
            <div className={analyticsClasses.metricsSection}>
                {metrics.map((metric) => {
                    const status = getStatusForMetric(metric.value, metric.standard);
                    const isOpen = openMetric === metric.key;

                    return (
                        <div key={metric.key} className={analyticsClasses.metricRow}>
                            <div className={analyticsClasses.metricHeader}>
                                <div className={analyticsClasses.metricIcon}>
                                    {renderStatusIcon(status.severity)}
                                </div>

                                <div className={analyticsClasses.metricText}>
                                    <div className={analyticsClasses.metricTitle}>
                                        {metric.label} – {status.label}
                                    </div>
                                    <div className={analyticsClasses.metricSubtitle}>
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
                                    className={analyticsClasses.detailsButton}
                                    onClick={() =>
                                        setOpenMetric(isOpen ? null : metric.key)
                                    }
                                >
                                    details ▾
                                </button>
                            </div>

                            <div
                                className={`${analyticsClasses.severityBorder} ${
                                    analyticsClasses[`severity${status.severity}`]
                                }`}
                            />

                            {isOpen && (
                                <div className={analyticsClasses.metricDetails}>
                                    <div
                                        className={`${analyticsClasses.chartHeader} ${
                                            analyticsClasses[`chartHeader${status.severity}`]
                                        }`}
                                    >
                                        <span className={analyticsClasses.chartHeaderText}>
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
                                        timeSeries,
                                        metric.key,
                                        metric.label,
                                        metric.color,
                                        metric.value,
                                        metric.standard
                                    ) ? (
                                        <div className={analyticsClasses.chartWrapper}>
                                            <HighchartsReact
                                                highcharts={Highcharts}
                                                options={createChartConfig(
                                                    timeSeries,
                                                    metric.key,
                                                    metric.label,
                                                    metric.color,
                                                    metric.value,
                                                    metric.standard
                                                )}
                                            />
                                        </div>
                                    ) : (
                                        <div className={analyticsClasses.noData}>
                                            Not enough data to render chart.
                                        </div>
                                    )}

                                    <div className={analyticsClasses.metricAnalysis}>
                                        <p className={analyticsClasses.metricDescription}>
                                            <strong>Description:</strong> {metric.description}
                                        </p>

                                        <p className={analyticsClasses.recommendation}>
                                            <strong>Recommendation:</strong>{" "}
                                            {generateRecommendation(
                                                timeSeries,
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

            {problemMetrics.length > 0 && (
                <div style={{ marginTop: "24px", padding: "16px", backgroundColor: "#f9fafb", borderRadius: "4px", border: "1px solid #e8edf2" }}>
                    <h4 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px" }}>Summary</h4>
                    <p style={{ fontSize: "14px", marginBottom: "12px" }}>
                        <strong>{schoolName}</strong> shows areas needing improvement:
                    </p>
                    <ul style={{ paddingLeft: "24px", fontSize: "14px", lineHeight: 1.8 }}>
                        {problemMetrics.map((m) => (
                            <li key={m.key}>{m.label}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

// ========= MAIN COMPONENT =========
export default function InspectionReports({ setActivePage }) {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [openReportId, setOpenReportId] = useState(null);

    const fetchSchools = async () => {
        const res = await fetch(
            `${API_BASE}/organisationUnits?paging=false&fields=id,name`,
            { headers: { Authorization: CREDENTIALS } }
        );
        const data = await res.json();
        return data.organisationUnits || [];
    };

    const fetchEvents = async () => {
        const res = await fetch(
            `${API_BASE}/tracker/events.json?program=${PROGRAM_ID}&paging=false&fields=event,orgUnit,occurredAt,dataValues[dataElement,value]`,
            { headers: { Authorization: CREDENTIALS } }
        );
        const data = await res.json();
        return data.events || [];
    };

    useEffect(() => {
        const loadAll = async () => {
            try {
                setLoading(true);
                const [schoolList, eventList] = await Promise.all([
                    fetchSchools(),
                    fetchEvents(),
                ]);

                const schoolMap = {};
                schoolList.forEach((s) => (schoolMap[s.id] = s.name));

                const formatted = eventList.map((ev) => ({
                    id: ev.event,
                    schoolId: ev.orgUnit,
                    schoolName: schoolMap[ev.orgUnit] || ev.orgUnit,
                    date: ev.occurredAt,
                    values: ev.dataValues || [],
                }));

                formatted.sort((a, b) => new Date(b.date) - new Date(a.date));

                setReports(formatted);
            } catch {
                setError("Failed to load inspection reports");
            } finally {
                setLoading(false);
            }
        };

        loadAll();
    }, []);

    const filteredReports = reports.filter((r) =>
        r.schoolName.toLowerCase().includes(search.toLowerCase())
    );

    const toggleOpen = (id) => {
        setOpenReportId((prev) => (prev === id ? null : id));
    };

    if (loading)
        return (
            <div className={reportClasses.loadingWrapper}>
                <CircularLoader />
            </div>
        );

    if (error)
        return (
            <NoticeBox error title="Error loading reports">
                {error}
            </NoticeBox>
        );

    return (
        <div className={reportClasses.pageWrapper}>
            <Card className={reportClasses.searchCard}>
                <InputField
                    placeholder="Search by school name..."
                    value={search}
                    onChange={({ value }) => setSearch(value)}
                />

                <Button
                    primary
                    icon={<IconAdd24 />}
                    className={reportClasses.addButton}
                    onClick={() => setActivePage("inspection")}
                >
                    Start new inspection
                </Button>
            </Card>

            <div className={reportClasses.reportList}>
                {filteredReports.length === 0 && (
                    <NoticeBox title="No reports found">
                        Try a different search term or submit a new inspection.
                    </NoticeBox>
                )}

                {filteredReports.map((report) => {
                    const isOpen = openReportId === report.id;

                    return (
                        <Card key={report.id} className={reportClasses.reportCard}>
                            <div className={reportClasses.reportContent}>
                                <div className={reportClasses.iconCircle}>
                                    <IconHome24 />
                                </div>

                                <div className={reportClasses.textColumn}>
                                    <h3 className={reportClasses.schoolName}>
                                        {report.schoolName}
                                    </h3>

                                    <div className={reportClasses.rowBetween}>
                                        <div className={reportClasses.dateRow}>
                                            <IconCalendar24 />
                                            <span className={reportClasses.dateLabel}>
                                                Last visit:
                                            </span>
                                            <span>
                                                {new Date(report.date).toLocaleDateString(
                                                    "en-GB",
                                                    {
                                                        day: "2-digit",
                                                        month: "short",
                                                        year: "numeric",
                                                    }
                                                )}
                                            </span>
                                        </div>

                                        <div
                                            className={reportClasses.showMore}
                                            onClick={() => toggleOpen(report.id)}
                                        >
                                            {isOpen ? (
                                                <>
                                                    Hide details
                                                    <IconChevronUp24
                                                        className={reportClasses.showMoreIcon}
                                                    />
                                                </>
                                            ) : (
                                                <>
                                                    Show details
                                                    <IconChevronDown24
                                                        className={reportClasses.showMoreIcon}
                                                    />
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {isOpen && (
                                <div className={reportClasses.reportDetails}>
                                    <ReportAnalytics
                                        schoolId={report.schoolId}
                                        schoolName={report.schoolName}
                                    />
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
