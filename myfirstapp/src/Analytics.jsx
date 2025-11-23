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
    IconCheckmarkCircle24
} from "@dhis2/ui";

import classes from "./Analytics.module.css";

export default function Analytics() {
    // State
    const [schools, setSchools] = useState([]);
    const [selectedSchool, setSelectedSchool] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [events, setEvents] = useState([]);
    const [chartData, setChartData] = useState(null);
    const [clusterData, setClusterData] = useState(null);
    const [openMetric, setOpenMetric] = useState(null); // hvilken indikator som er "details"-åpen

    // ========== CONFIG ==========
    const RESOURCE_PROGRAM_ID = "uvpW17dnfUS";

    const DATA_ELEMENTS = {
        TOILETS: "slYohGwjQme",
        SEATS: "fgUU2XNkGvI",
        BOOKS: "m9k3VefvGQw",
        CLASSROOMS: "mlbyc3CWNyb",
    };

    const STANDARDS = {
        toilets: {
            min: 15,
            label: "Toilet Capacity",
            warning: "Limited sanitation capacity",
        },
        seats: {
            min: 50,
            label: "Seating Availability",
            warning: "Insufficient seating",
        },
        books: {
            min: 100,
            label: "Textbook Availability",
            warning: "Insufficient textbooks",
        },
        classrooms: {
            max: 10,
            label: "Classroom Capacity",
            warning: "Capacity OK",
        },
    };

    // ========== 1. FETCH SCHOOLS ==========
    useEffect(() => {
        fetchSchools();
    }, []);

    const fetchSchools = async () => {
        try {
            const res = await fetch(
                "https://research.im.dhis2.org/in5320g20/api/organisationUnits?filter=level:eq:5&filter=parent.name:eq:Jambalaya%20Cluster&fields=id,name&pageSize=1000",
                {
                    headers: {
                        Authorization: "Basic " + btoa("admin:district"),
                    },
                }
            );

            const data = await res.json();
            const schoolList = data.organisationUnits || [];
            setSchools(schoolList);

            if (schoolList.length > 0) {
                setSelectedSchool(schoolList[0].id);
            }
        } catch (err) {
            setError("Failed to fetch schools: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    // ========== 2. FETCH EVENTS WHEN SCHOOL CHANGES ==========
    useEffect(() => {
        if (selectedSchool && schools.length > 0) {
            fetchEvents();
            fetchClusterData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSchool, schools]);

    const fetchEvents = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(
                `https://research.im.dhis2.org/in5320g20/api/tracker/events.json?program=${RESOURCE_PROGRAM_ID}&orgUnit=${selectedSchool}&fields=*`,
                {
                    headers: {
                        Authorization: "Basic " + btoa("admin:district"),
                    },
                }
            );

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }

            const data = await res.json();
            const eventList = data.events || [];

            setEvents(eventList);
            processEvents(eventList);
        } catch (err) {
            setError("Failed to fetch events: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchClusterData = async () => {
        try {
            const allSchoolsData = await Promise.all(
                schools.map(async (school) => {
                    const res = await fetch(
                        `https://research.im.dhis2.org/in5320g20/api/tracker/events.json?program=${RESOURCE_PROGRAM_ID}&orgUnit=${school.id}&fields=*`,
                        {
                            headers: {
                                Authorization: "Basic " + btoa("admin:district"),
                            },
                        }
                    );
                    const data = await res.json();
                    return data.events || [];
                })
            );

            processClusterData(allSchoolsData.flat());
        } catch (err) {
            console.error("Failed to fetch cluster data:", err);
        }
    };

    
    // ========== 3. PROCESS EVENTS INTO CHART DATA ==========
    const processEvents = (eventList) => {
    const grouped = {};

    eventList.forEach((event) => {
        const eventDate = new Date(event.occurredAt || event.createdAt);
        const month = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, "0")}`;

        if (!grouped[month] || eventDate > grouped[month].date) {
            const resources = {
                toilets: 0,
                seats: 0,
                books: 0,
                classrooms: 0,
                learners: 0, // Antall elever (dersom det er tilgjengelig i dataene)
            };

            event.dataValues?.forEach((dv) => {
                const value = parseInt(dv.value, 10) || 0;

                if (dv.dataElement === DATA_ELEMENTS.TOILETS) {
                    resources.toilets = value;
                } else if (dv.dataElement === DATA_ELEMENTS.SEATS) {
                    resources.seats = value;
                } else if (dv.dataElement === DATA_ELEMENTS.BOOKS) {
                    resources.books = value;
                } else if (dv.dataElement === DATA_ELEMENTS.CLASSROOMS) {
                    resources.classrooms = value;
                } else if (dv.dataElement === DATA_ELEMENTS.LEARNERS) {
                    resources.learners = value;  // Antar at dette er antall elever (må legges til hvis det finnes)
                }
            });

            // Beregn forholdet
            const toiletRatio = calculateRatio(resources.toilets, resources.learners);
            const seatRatio = calculateRatio(resources.seats, resources.learners);
            const bookRatio = calculateRatio(resources.books, resources.learners);
            const classroomRatio = calculateRatio(resources.classrooms, resources.learners);

               // Legg til forholdene i dataene for videre prosessering
            grouped[month] = {
                date: eventDate,
                toiletRatio,
                seatRatio,
                bookRatio,
                classroomRatio,
                learners: resources.learners,
                ...resources, // Legg til de originale ressursene også
            };
        }
    });
        const sortedMonths = Object.keys(grouped).sort();
        const processed = sortedMonths.map((month) => ({
            month,
            toilets: grouped[month].toilets,
            seats: grouped[month].seats,
            books: grouped[month].books,
            classrooms: grouped[month].classrooms,
        }));

        setChartData(processed);
    };

    const processClusterData = (eventList) => {
        const grouped = {};

        eventList.forEach((event) => {
            const eventDate = new Date(event.occurredAt || event.createdAt);
            const month = `${eventDate.getFullYear()}-${String(
                eventDate.getMonth() + 1
            ).padStart(2, "0")}`;

            if (!grouped[month]) {
                grouped[month] = {
                    toilets: [],
                    seats: [],
                    books: [],
                    classrooms: [],
                };
            }

            event.dataValues?.forEach((dv) => {
                const value = parseInt(dv.value, 10) || 0;

                if (dv.dataElement === DATA_ELEMENTS.TOILETS) {
                    grouped[month].toilets.push(value);
                } else if (dv.dataElement === DATA_ELEMENTS.SEATS) {
                    grouped[month].seats.push(value);
                } else if (dv.dataElement === DATA_ELEMENTS.BOOKS) {
                    grouped[month].books.push(value);
                } else if (dv.dataElement === DATA_ELEMENTS.CLASSROOMS) {
                    grouped[month].classrooms.push(value);
                }
            });
        });

        setClusterData(grouped);
    };

    // ========== HELPERS ==========
    const calculateAverage = (values) => {
        if (!values || values.length === 0) return 0;
        const sum = values.reduce((a, b) => a + b, 0);
        return parseFloat((sum / values.length).toFixed(2));
    };

    const calculateStdDev = (values, average) => {
        if (!values || values.length === 0) return 0;
        const squareDiffs = values.map((value) => Math.pow(value - average, 2));
        const avgSquareDiff = calculateAverage(squareDiffs);
        return Math.sqrt(avgSquareDiff);
    };

    const checkStandard = (value, standard) => {
        if (value === null || value === undefined) return false;
        if (standard.min !== undefined) {
            return value >= standard.min;
        } else if (standard.max !== undefined) {
            return value <= standard.max;
        }
        return true;
    };

    //KALKULERER RATIOER
const calculateRatio = (numItems, numLearners) => {
    if (numLearners === 0) {
        return 0; // Unngå deling med null
    }
    return numItems / numLearners;
};

    // Status-klassifisering for liste (Critical / Limited / Adequate)
  const classifyStatus = (value, standard, ratioType = "min") => {
    if (value === null || value === undefined) {
        return { label: "No data", severity: "none" };
    }

    let minValue = standard.min;
    let maxValue = standard.max;

    // For ratio calculations, treat the ratio separately
    if (ratioType === "ratio") {
        if (value > minValue) {
            return { label: "Critical", severity: "critical" };
        } else if (value > minValue * 0.75) {
            return { label: "Limited", severity: "limited" };
        }
        return { label: "Adequate", severity: "adequate" };
    }

    // For normal values like seat availability, toilet availability, etc.
    if (minValue !== undefined) {
        if (value < minValue * 0.5) {
            return { label: "Critical", severity: "critical" };
        } else if (value < minValue) {
            return { label: "Limited", severity: "limited" };
        }
        return { label: "Adequate", severity: "adequate" };
    }

    if (maxValue !== undefined) {
        if (value > maxValue * 1.5) {
            return { label: "Critical", severity: "critical" };
        } else if (value > maxValue) {
            return { label: "Limited", severity: "limited" };
        }
        return { label: "Adequate", severity: "adequate" };
    }

    return { label: "OK", severity: "adequate" };
};


    // ========== CHART CONFIG ==========
// ========== CHART CONFIG ==========
const createChartConfig = (title, dataKey, color, standard) => {
    if (!chartData || chartData.length === 0) {
        return null;
    }

    const categories = chartData.map((d) => d.month);
    const data = chartData.map((d) => d[dataKey]);
    const latestValue = data[data.length - 1];

    const clusterAverages = [];
    const upperBands = [];
    const lowerBands = [];

    categories.forEach((month) => {
        if (clusterData && clusterData[month]) {
            const values = clusterData[month][dataKey];
            const avg = calculateAverage(values);
            const stdDev = calculateStdDev(values, avg);

            clusterAverages.push(parseFloat(avg.toFixed(2)));
            upperBands.push(parseFloat((avg + stdDev).toFixed(2)));
            lowerBands.push(parseFloat((avg - stdDev).toFixed(2)));
        } else {
            const avg = calculateAverage(data);
            clusterAverages.push(avg);
            upperBands.push(avg);
            lowerBands.push(avg);
        }
    });

    const isBelowStandard = !checkStandard(latestValue, standard);

    // Plot lines for min/max depending on standard
    const plotLines = [];

    // Add minimum requirement line (dashed) if applicable
    if (standard.min !== undefined) {
        plotLines.push({
            color: '#dc3545', // Red color for minimum
            dashStyle: 'Dash',
            value: standard.min,
            width: 2,
            label: {
                text: 'min',
                style: {
                    color: '#dc3545',
                    fontWeight: 'bold',
                    fontSize: '12px',
                },
                align: 'left',
                verticalAlign: 'middle',
                x: 0,
                y: -5,
            },
        });
    }

    // Add maximum requirement line (dashed) if applicable
    if (standard.max !== undefined) {
        plotLines.push({
            color: '#dc3545',
            dashStyle: 'Dash',
            value: standard.max,
            width: 2,
            label: {
                text: 'max',
                style: {
                    color: '#dc3545',
                    fontWeight: 'bold',
                    fontSize: '12px',
                },
                align: 'left',
                verticalAlign: 'middle',
                x: 0,
                y: -5,
            },
        });
    }

    // Check if the latest value is below the standard and set the appropriate color
    const severity = classifyStatus(latestValue, standard, "ratio").severity;

    // Customize colors based on severity
    const seriesColor = severity === "critical" ? "#f44336" : severity === "limited" ? "#ff9800" : color;

    return {
        chart: {
            type: "line",
            height: 260,
            style: {
                fontFamily: "Roboto, sans-serif",
            },
        },
        title: { text: "" },
        xAxis: {
            categories,
            tickLength: 0,
        },
        yAxis: {
            title: { text: null },
            gridLineColor: "#e5e7eb",
            plotLines: plotLines, // Here we add the plotLines (min/max)
        },
        tooltip: {
            shared: true,
        },
        legend: {
            enabled: true,
        },
        credits: { enabled: false },
        series: [
            {
                name: title,
                data,
                color: seriesColor,  // Use color based on severity
                marker: {
                    radius: 4,
                    symbol: "circle",
                },
                lineWidth: 2,
                zIndex: 3,
            },
            {
                name: "Average across cluster",
                data: clusterAverages,
                color: "#2196f3",
                dashStyle: "Dash",
                lineWidth: 2,
                marker: { enabled: false },
                zIndex: 2,
            },
            {
                name: "±1 standard deviation",
                data: upperBands.map((upper, i) => [lowerBands[i], upper]),
                type: "arearange",
                lineWidth: 0,
                color: "#2196f3",
                fillOpacity: 0.2,
                zIndex: 1,
                marker: { enabled: false },
            },
        ],
    };
};

// ========== RENDER ==========
if (loading && !chartData) {
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

const currentSchool = schools.find((s) => s.id === selectedSchool) || null;
const latestEntry =
    chartData && chartData.length > 0 ? chartData[chartData.length - 1] : null;

const metrics = latestEntry
    ? [
          {
              key: "toilets",
              label: "Toilet Ratio",
              color: "#4caf50",
              standard: STANDARDS.toilets,
              value: latestEntry.toilets,
          },
          {
              key: "seats",
              label: "Seating Availability",
              color: "#ff9800",
              standard: STANDARDS.seats,
              value: latestEntry.seats,
          },
          {
              key: "books",
              label: "Textbook Availability",
              color: "#ffb74d",
              standard: STANDARDS.books,
              value: latestEntry.books,
          },
          {
              key: "classrooms",
              label: "Classroom Capacity",
              color: "#9c27b0",
              standard: STANDARDS.classrooms,
              value: latestEntry.classrooms,
          },
      ]
    : [];

const problemMetrics = metrics.filter((m) => {
    const s = classifyStatus(m.value, m.standard);
    return s.severity === "critical" || s.severity === "limited";
});

const activeMetric = openMetric && metrics.find((m) => m.key === openMetric);

const activeConfig =
    activeMetric &&
    createChartConfig(
        activeMetric.label,
        activeMetric.key,
        activeMetric.color,
        activeMetric.standard
    );

const renderStatusDot = (severity) => {
    if (severity === "critical") return classes.statusDotRed;
    if (severity === "limited") return classes.statusDotOrange;
    if (severity === "adequate") return classes.statusDotGreen;
    return classes.statusDotGrey;
};

return (
    <div className={classes.pageWrapper}>
        {/* HEADER / TITLE */}
        <div className={classes.pageHeader}>
            <h2>Analytics</h2>
        </div>

        {/* SCHOOL HEADER + SELECTOR */}
        <Card className={classes.schoolCard}>
            <div className={classes.schoolTitleRow}>
                <h3 className={classes.schoolName}>
                    {currentSchool ? currentSchool.name : "Select a school"}
                </h3>
            </div>

            <div className={classes.schoolSelectWrapper}>
                <SingleSelectField
                    label="Select school"
                    selected={selectedSchool}
                    onChange={({ selected }) => setSelectedSchool(selected)}
                >
                    {schools.map((school) => (
                        <SingleSelectOption
                            key={school.id}
                            value={school.id}
                            label={school.name}
                        />
                    ))}
                </SingleSelectField>
            </div>
        </Card>

       {/* STATUS LIST */}
<Card className={classes.statusCard}>
    {metrics.length === 0 && (
        <div className={classes.noDataText}>
            No resource inspection events found for this school.
            Submit some inspections first using the Inspection form.
        </div>
    )}

    {/* Map each metric with an icon and expandable details */}
    {metrics.map((metric) => {
        const status = classifyStatus(metric.value, metric.standard); // Get the severity
        const isExpanded = openMetric === metric.key;

        return (
            <div key={metric.key} className={`${classes.statusRow} ${isExpanded ? 'expanded' : ''}`}>
                {/* Status icon based on severity */}
                <div className={classes.statusIcon}>
                    {status.severity === 'critical' && (
                        <IconWarningFilled24 className={classes.statusIconCritical} />
                    )}
                    {status.severity === 'limited' && (
                        <IconInfoFilled24 className={classes.statusIconWarning} />
                    )}
                    {status.severity === 'adequate' && (
                        <IconCheckmarkCircle24 className={classes.statusIconOK} />
                    )}
                </div>

                <div className={classes.statusTextBlock}>
                    <div className={classes.statusTitle}>
                        {metric.label} – {status.label}
                    </div>
                    <div className={classes.statusSubtitle}>
                        Latest value: <strong>{metric.value ?? "No data"}</strong>
                    </div>
                </div>

                {/* Button to toggle details */}
                <button
                    type="button"
                    className={classes.detailsButton}
                    onClick={() => setOpenMetric(isExpanded ? null : metric.key)}
                >
                    details ▾
                </button>

                {/* Show expanded content if button is clicked */}
                {isExpanded && (
                    <div className={classes.statusDetailContent}>
                        <p>Target: {metric.standard.min ?? "No target defined"}</p>
                        <p>More details here...</p>

                        {/* Show chart for the metric */}
                        {activeConfig && (
                            <div className={classes.chartWrapper}>
                                <HighchartsReact
                                    highcharts={Highcharts}
                                    options={activeConfig}
                                />
                            </div>
                        )}

                        {/* Show recommendation based on status */}
                        <div className={classes.recommendationWrapper}>
                            <h4>Recommendation</h4>
                            <div className={classes.recommendationText}>
                                {(() => {
                                    const status = classifyStatus(
                                        activeMetric?.value,
                                        activeMetric?.standard
                                    );
                                    if (status.severity === "critical") {
                                        return (
                                            <p>
                                                {activeMetric?.label} is{" "}
                                                <strong>critically below</strong> the
                                                suggested standard. Consider prioritising
                                                additional resources or targeted
                                                interventions at this school.
                                            </p>
                                        );
                                    }
                                    if (status.severity === "limited") {
                                        return (
                                            <p>
                                                {activeMetric?.label} is{" "}
                                                <strong>below the suggested level</strong>.
                                                Plan follow-up actions to gradually
                                                improve this indicator over the coming
                                                term.
                                            </p>
                                        );
                                    }
                                    if (status.severity === "adequate") {
                                        return (
                                            <p>
                                                {activeMetric?.label} currently meets the
                                                suggested standard. Monitor changes
                                                over time and maintain this level of
                                                provision.
                                            </p>
                                        );
                                    }
                                    return (
                                        <p>
                                            No clear recommendation can be generated
                                            because there is not enough data for this
                                            indicator.
                                        </p>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    })}
</Card>


        {/* SUMMARY SECTION */}
        {metrics.length > 0 && (
            <div className={classes.summaryWrapper}>
                <h3>Summary</h3>
                <p>
                    <strong>
                        {currentSchool ? currentSchool.name : "This school"}
                    </strong>{" "}
                    shows the following areas needing attention:
                </p>

                {problemMetrics.length > 0 ? (
                    <ul className={classes.summaryList}>
                        {problemMetrics.map((m) => (
                            <li key={m.key}>{m.label}</li>
                        ))}
                    </ul>
                ) : (
                    <p>
                        All tracked indicators meet the basic target levels
                        in the latest inspection.
                    </p>
                )}

                <div className={classes.followUpRow}>
                    <input type="checkbox" defaultChecked />
                    <span>Mark for follow-up</span>
                </div>

                <div className={classes.nextVisitRow}>
                    <span>Next visitation:</span>
                    <strong> (set date here)</strong>
                </div>
            </div>
        )}
    </div>
);
}
