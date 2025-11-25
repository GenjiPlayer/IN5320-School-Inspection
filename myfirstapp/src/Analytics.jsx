// src/D2App/Analytics.jsx
import React, { useState, useEffect } from "react";
import Highcharts from "highcharts";
import "highcharts/highcharts-more";
import HighchartsReact from "highcharts-react-official";
import {
    Card,
    CircularLoader,
    NoticeBox,
    SingleSelectField,
    SingleSelectOption,
    IconWarningFilled24,
    IconInfoFilled24,
    IconCheckmarkCircle24,
} from "@dhis2/ui";

import classes from "./Analytics.module.css";

// ========= API CONFIG (samme som i ClusterAnalytics) =========
const API_BASE = "https://research.im.dhis2.org/in5320g20/api";
const CREDENTIALS = "Basic " + btoa("admin:district");
const RESOURCE_PROGRAM_ID = "uvpW17dnfUS";      // resources (classrooms, seats, toilets, textbooks)
const TEACHER_PROGRAM = "rmuGQ7kBQBU";         // one event per teacher
const LEARNER_DATA_ELEMENT = "ue3QIMOAC7G";    // total learners (analytics)

// dataElements fra resource-programmet
const DATA_ELEMENTS = {
    SEATS: "fgUU2XNkGvI",
    BOOKS: "m9k3VefvGQw",
    CLASSROOMS: "mlbyc3CWNyb",
    TOILETS: "slYohGwjQme",
};

// ========= MINIMUM STANDARDS (gjenbrukt) =========
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

// ========= HJELPERE =========
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
        return <IconWarningFilled24 />;
    }
    if (severity === "limited") {
        return <IconInfoFilled24 />;
    }
    if (severity === "adequate") {
        return <IconCheckmarkCircle24 />;
    }
    return <IconInfoFilled24 />;
};

const formatRatio = (value) => {
    if (value === null || value === undefined || isNaN(value)) return "N/A";
    return Number(value).toFixed(2);
};

// ========= HOVEDKOMPONENT =========
export default function Analytics({ selectedSchoolId: initialSchoolId }) {
    const [schools, setSchools] = useState([]);
    const [selectedSchoolId, setSelectedSchoolId] = useState(initialSchoolId || "");
    const [currentSchool, setCurrentSchool] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [timeSeries, setTimeSeries] = useState([]); // per-month resource + ratios
    const [ratios, setRatios] = useState(null);       // latest ratios
    const [openMetric, setOpenMetric] = useState(null);

    // enkel state for summary (du kan koble til backend senere)
    const [followUp, setFollowUp] = useState(true);
    const [nextVisit, setNextVisit] = useState("10. Jan 2026");

    // ---- 1. hent skoler (samme filter som andre steder) ----
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

                // velg initialSchoolId hvis den finnes, ellers første i lista
                if (initialSchoolId && list.find(s => s.id === initialSchoolId)) {
                    setSelectedSchoolId(initialSchoolId);
                    setCurrentSchool(list.find(s => s.id === initialSchoolId));
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
                // 2.1 learners (analytics)
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

                // 2.2 teachers (tracker events)
                const teachersRes = await fetch(
                    `${API_BASE}/tracker/events.json?program=${TEACHER_PROGRAM}&orgUnit=${selectedSchoolId}&pageSize=1000`,
                    { headers: { Authorization: CREDENTIALS } }
                );
                const teachersData = await teachersRes.json();
                const teacherCount = teachersData.events?.length || 0;

                // 2.3 resources (tracker events)
                const resRes = await fetch(
                    `${API_BASE}/tracker/events.json?program=${RESOURCE_PROGRAM_ID}&orgUnit=${selectedSchoolId}&pageSize=100`,
                    { headers: { Authorization: CREDENTIALS } }
                );
                const resData = await resRes.json();
                const events = resData.events || [];

                // time series per month
                const tsMap = {};

                events.forEach((event) => {
                    const month = (event.occurredAt || event.eventDate || "").slice(0, 7); // YYYY-MM
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
                        parseInt(dvs.find((dv) => dv.dataElement === id)?.value || 0, 10);

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
                        genderParityIndex: null, // TODO: hvis dere får data
                    };
                });

                setTimeSeries(tsArray);

                // siste inngang = "latest"
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

    // ---- chart-config for en indikator ----
    const createChartConfig = (metricKey, label, color) => {
        if (!timeSeries || timeSeries.length === 0) return null;

        return {
            chart: { type: "line", height: 260 },
            title: { text: "" },
            xAxis: {
                categories: timeSeries.map((p) => p.month),
            },
            yAxis: {
                title: { text: label },
                gridLineColor: "#e5e7eb",
                plotLines: (() => {
                    const s = MINIMUM_STANDARDS[metricKey] || {};
                    if (s.min !== undefined) {
                        return [
                            {
                                color: "#f44336",
                                dashStyle: "Dash",
                                value: s.min,
                                width: 2,
                                label: { text: "min" },
                            },
                        ];
                    }
                    if (s.max !== undefined) {
                        return [
                            {
                                color: "#f44336",
                                dashStyle: "Dash",
                                value: s.max,
                                width: 2,
                                label: { text: "max" },
                            },
                        ];
                    }
                    return [];
                })(),
            },
            credits: { enabled: false },
            tooltip: { shared: true },
            series: [
                {
                    name: label,
                    data: timeSeries.map((p) => p[metricKey]),
                    color,
                    lineWidth: 2,
                    marker: { radius: 3 },
                },
            ],
        };
    };

    // ---- derive metrics-array for UI ----
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

    // ---- RENDER ----
    if (loading && !currentSchool) {
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

    return (
        <div className={classes.pageWrapper}>
            {/* SCHOOL CARD */}
            <Card className={classes.schoolCard}>
                <h3 className={classes.schoolName}>
                    {currentSchool ? currentSchool.name : "Select a school"}
                </h3>
            </Card>

            {/* STATUS LIST (figma-listen) */}
            <Card className={classes.statusCard}>
                {metrics.length === 0 && (
                    <div className={classes.noDataText}>
                        No inspections found for this school. Submit an inspection first.
                    </div>
                )}

                {metrics.map((metric) => {
                    const status = getStatusForMetric(
                        metric.value,
                        metric.standard
                    );
                    const isOpen = openMetric === metric.key;

                    return (
                        <div key={metric.key} className={classes.statusRow}>
                            <div className={classes.statusIcon}>
                                {renderStatusIcon(status.severity)}
                            </div>

                            <div className={classes.statusTextBlock}>
                                <div className={classes.statusTitle}>
                                    {metric.label} – {status.label}
                                </div>
                                <div className={classes.statusSubtitle}>
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

                            {isOpen && (
                                <div className={classes.detailsPanel}>
                                    <p className={classes.metricDescription}>
                                        {metric.description}
                                    </p>

                                    {createChartConfig(
                                        metric.key,
                                        metric.label,
                                        metric.color
                                    ) ? (
                                        <div className={classes.chartWrapper}>
                                            <HighchartsReact
                                                highcharts={Highcharts}
                                                options={createChartConfig(
                                                    metric.key,
                                                    metric.label,
                                                    metric.color
                                                )}
                                            />
                                        </div>
                                    ) : (
                                        <div className={classes.noDataText}>
                                            Not enough data to render a chart for
                                            this metric.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </Card>

            {/* SUMMARY CARD (som i figma) */}
            {metrics.length > 0 && (
                <Card className={classes.summaryCard}>
                    <h3 className={classes.summaryTitle}>Summary</h3>
                    <p className={classes.summaryIntro}>
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
                        <p className={classes.summaryIntro}>
                            All tracked indicators currently meet basic target
                            levels.
                        </p>
                    )}

                    <div className={classes.followUpRow}>
                        <input
                            type="checkbox"
                            checked={followUp}
                            onChange={(e) => setFollowUp(e.target.checked)}
                        />
                        <span>Mark for follow-up</span>
                    </div>

                    <div className={classes.nextVisitRow}>
                        <span>Next visitation:</span>
                        <strong>&nbsp;{nextVisit}</strong>
                        <button
                            type="button"
                            className={classes.nextVisitEdit}
                            onClick={() => {
                                // super enkel; du kan bytte til DatePicker fra dhis2 senere
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
                </Card>
            )}
        </div>
    );
}
