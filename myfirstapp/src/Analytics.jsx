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
    IconInfoFilled24,
    IconWarningFilled24,
    IconCheckmarkCircle24,
    IconStarFilled16
} from "@dhis2/ui";

import classes from "./Analytics.module.css";

export default function Analytics() {
    // State
    const [schools, setSchools] = useState([]);
    const [selectedSchool, setSelectedSchool] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [chartData, setChartData] = useState(null);
    const [clusterData, setClusterData] = useState(null);
<<<<<<< HEAD
    const [learnerCount, setLearnerCount] = useState(0);
    const [teacherCount, setTeacherCount] = useState(0);

    // ========== CONFIGURATION ==========
    const RESOURCE_PROGRAM_ID = 'uvpW17dnfUS';
    const TEACHER_PROGRAM_ID = 'rmuGQ7kBQBU'; // Staff event program

    // Data element IDs for analytics
    const LEARNER_DATA_ELEMENT = 'ue3QIMOAC7G'; // Total learners
=======
    const [openMetric, setOpenMetric] = useState(null); // hvilken indikator som er "details"-åpen

    // ========== CONFIG ==========
    const RESOURCE_PROGRAM_ID = "uvpW17dnfUS";
>>>>>>> Tina

    const DATA_ELEMENTS = {
        TOILETS: "slYohGwjQme",
        SEATS: "fgUU2XNkGvI",
        BOOKS: "m9k3VefvGQw",
        CLASSROOMS: "mlbyc3CWNyb",
    };

    const STANDARDS = {
        toilets: {
            min: 15,
<<<<<<< HEAD
            label: 'Learners per toilet',
            warning: 'Limited sanitation capacity',
            errorIcon: true,
            isRatio: true,
            maxRatio: 25
        },
        seats: {
            min: 1,
            label: 'Seat to learner ratio',
            warning: 'Insufficient seating',
            errorIcon: false,
            isRatio: true,
            minRatio: 1
        },
        books: {
            min: 1,
            label: 'Book to learner ratio',
            warning: 'Insufficient textbooks',
            errorIcon: false,
            isRatio: true,
            minRatio: 1
        },
        classrooms: {
            max: 53,
            label: 'Learners per classroom',
            warning: 'Overcrowded classrooms',
            errorIcon: false,
            isRatio: true,
            maxRatio: 53
        },
        teachers: {
            max: 45,
            label: 'Learners per teacher',
            warning: 'Teacher shortage',
            errorIcon: true,
            isRatio: true,
            maxRatio: 45
        }
=======
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
>>>>>>> Tina
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
            fetchAllData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSchool, schools]);

    const fetchAllData = async () => {
        setLoading(true);
        setError(null);

        try {
            await Promise.all([
                fetchEvents(),
                fetchLearnerData(),
                fetchTeacherData(),
                fetchClusterData()
            ]);
        } catch (err) {
            setError('Failed to fetch data: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // ========== 3. FETCH LEARNER DATA FROM ANALYTICS ==========
    const fetchLearnerData = async () => {
        try {
            // Fetch multiple years to see what data is available
            const res = await fetch(
                `https://research.im.dhis2.org/in5320g20/api/analytics.json?dimension=dx:${LEARNER_DATA_ELEMENT}&dimension=pe:2020;2021;2022;2023;2024;2025&dimension=ou:${selectedSchool}`,
                {
                    headers: {
                        Authorization: 'Basic ' + btoa('admin:district'),
                    }
                }
            );

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }

            const data = await res.json();

            console.log('📊 Full API response:', data);
            console.log('📊 Total rows returned:', data.rows?.length);

            // Group by year and show totals for each year
            const yearTotals = {};
            if (data.rows && data.rows.length > 0) {
                data.rows.forEach((row, index) => {
                    const year = row[1];
                    const value = parseInt(row[3]) || 0;

                    if (index < 5) {
                        console.log(`📊 Row ${index}:`, row);
                    }

                    if (!yearTotals[year]) {
                        yearTotals[year] = 0;
                    }
                    yearTotals[year] += value;
                });
            }

            console.log('📊 Learners by year:', yearTotals);

            // Use 2020 data as that's what was in your example
            const totalLearners = yearTotals['2020'] || 0;

            setLearnerCount(totalLearners);
            console.log('📊 Using learner count from 2020:', totalLearners);

        } catch (err) {
            console.error('Failed to fetch learner data:', err);
        }
    };

    // ========== 4. FETCH TEACHER DATA FROM EVENT PROGRAM ==========
    const fetchTeacherData = async () => {
        try {
            // Fetch teacher events from the staff program
            const res = await fetch(
                `https://research.im.dhis2.org/in5320g20/api/tracker/events.json?program=${TEACHER_PROGRAM_ID}&orgUnit=${selectedSchool}&fields=*`,
                {
                    headers: {
                        Authorization: 'Basic ' + btoa('admin:district'),
                    }
                }
            );

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }

            const data = await res.json();
            const eventList = data.events || [];

            // Count unique teachers (each event is one teacher)
            const totalTeachers = eventList.length;

            setTeacherCount(totalTeachers);
            console.log('📊 Teacher count from event program:', totalTeachers);

        } catch (err) {
            console.error('Failed to fetch teacher data:', err);
        }
    };

    // ========== 5. FETCH RESOURCE EVENTS ==========
    const fetchEvents = async () => {
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

<<<<<<< HEAD
            console.log('📊 Fetched events:', eventList);
=======
            setEvents(eventList);
>>>>>>> Tina
            processEvents(eventList);
        } catch (err) {
<<<<<<< HEAD
            console.error('Fetch error:', err);
=======
            setError("Failed to fetch events: " + err.message);
        } finally {
            setLoading(false);
>>>>>>> Tina
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

    // ========== 6. PROCESS EVENTS INTO CHART DATA ==========
    const processEvents = (eventList) => {
        const grouped = {};

        eventList.forEach((event) => {
            const eventDate = new Date(event.occurredAt || event.createdAt);
            const month = `${eventDate.getFullYear()}-${String(
                eventDate.getMonth() + 1
            ).padStart(2, "0")}`;

            if (!grouped[month] || eventDate > grouped[month].date) {
                const resources = {
                    toilets: 0,
                    seats: 0,
                    books: 0,
                    classrooms: 0,
<<<<<<< HEAD
                    teachers: 0
=======
>>>>>>> Tina
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
                    }
                });

                grouped[month] = {
                    date: eventDate,
                    ...resources,
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
<<<<<<< HEAD
            teachers: teacherCount
=======
>>>>>>> Tina
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
<<<<<<< HEAD
                    teachers: []
=======
>>>>>>> Tina
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

<<<<<<< HEAD
    // ========== 7. CALCULATE STATISTICS ==========
=======
    // ========== HELPERS ==========
>>>>>>> Tina
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

<<<<<<< HEAD
    // ========== 8. CALCULATE RATIOS ==========
    const calculateRatio = (resourceValue, dataKey) => {
        if (learnerCount === 0) return 0;
        if (resourceValue === 0 && dataKey !== 'teachers') return 0;

        switch(dataKey) {
            case 'toilets':
                return parseFloat((learnerCount / resourceValue).toFixed(2));
            case 'seats':
                return parseFloat((resourceValue / learnerCount).toFixed(2));
            case 'books':
                return parseFloat((resourceValue / learnerCount).toFixed(2));
            case 'classrooms':
                return parseFloat((learnerCount / resourceValue).toFixed(2));
            case 'teachers':
                return teacherCount > 0 ? parseFloat((learnerCount / teacherCount).toFixed(2)) : 0;
            default:
                return 0;
        }
    };

    // ========== 9. CHECK IF STANDARD IS MET ==========
    const checkStandard = (value, standard) => {
        if (standard.minRatio !== undefined) {
            return value >= standard.minRatio;
        } else if (standard.maxRatio !== undefined) {
            return value <= standard.maxRatio;
=======
    const checkStandard = (value, standard) => {
        if (value === null || value === undefined) return false;
        if (standard.min !== undefined) {
            return value >= standard.min;
        } else if (standard.max !== undefined) {
            return value <= standard.max;
>>>>>>> Tina
        }
        return true;
    };

<<<<<<< HEAD
    // ========== 10. CREATE HIGHCHARTS CONFIG WITH DEVIATION ==========
    const createChartConfig = (title, dataKey, color, standard) => {
        if (!chartData || chartData.length === 0) {
            return null;
        }

        const categories = chartData.map(d => d.month);
        const data = chartData.map(d => calculateRatio(d[dataKey], dataKey));
        const latestValue = data[data.length - 1];

        // Calculate cluster statistics for each month
        const clusterAverages = [];
        const upperBands = [];
        const lowerBands = [];

        categories.forEach(month => {
            if (clusterData && clusterData[month]) {
                const values = clusterData[month][dataKey];
                const ratios = values.map(v => calculateRatio(v, dataKey)).filter(r => r > 0);
                const avg = calculateAverage(ratios);
                const stdDev = calculateStdDev(ratios, avg);

                clusterAverages.push(parseFloat(avg.toFixed(2)));
                upperBands.push(parseFloat((avg + stdDev).toFixed(2)));
                lowerBands.push(parseFloat((avg - stdDev).toFixed(2)));
            } else {
                const avg = calculateAverage(data);
                clusterAverages.push(avg);
                upperBands.push(avg);
                lowerBands.push(avg);
=======
    // Status-klassifisering for liste (Critical / Limited / Adequate)
    const classifyStatus = (value, standard) => {
        if (value === null || value === undefined) {
            return { label: "No data", severity: "none" };
        }

        if (standard.min !== undefined) {
            if (value < standard.min * 0.5) {
                return { label: "Critical", severity: "critical" };
            } else if (value < standard.min) {
                return { label: "Limited", severity: "limited" };
>>>>>>> Tina
            }
            return { label: "Adequate", severity: "adequate" };
        }

        if (standard.max !== undefined) {
            if (value > standard.max * 1.5) {
                return { label: "Critical", severity: "critical" };
            } else if (value > standard.max) {
                return { label: "Limited", severity: "limited" };
            }
            return { label: "Adequate", severity: "adequate" };
        }

        return { label: "OK", severity: "adequate" };
    };

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

    return {
        chart: {
            type: "line",
            height: 260,
            style: {
                fontFamily: "Roboto, sans-serif",
            },
<<<<<<< HEAD
            title: {
                text: title,
                align: 'left',
                style: {
                    fontSize: '16px',
                    fontWeight: 'bold'
                }
            },
            subtitle: {
                text: `<span style="background-color: ${isBelowStandard ? '#ff9800' : '#4caf50'}; color: white; padding: 5px 15px; border-radius: 4px; font-weight: bold;">${latestValue}</span>`,
                align: 'right',
                useHTML: true,
                y: 25
            },
            xAxis: {
                categories: categories,
                title: {
                    text: 'Month'
                },
                labels: {
                    rotation: -45
                }
            },
            yAxis: {
                title: {
                    text: 'Ratio'
                },
                plotLines: standard.minRatio !== undefined ? [{
                    color: '#dc3545',
                    dashStyle: 'Dash',
                    value: standard.minRatio,
                    width: 2,
                    label: {
                        text: 'min',
                        style: { color: '#dc3545', fontWeight: 'bold' }
                    }
                }] : standard.maxRatio !== undefined ? [{
                    color: '#dc3545',
                    dashStyle: 'Dash',
                    value: standard.maxRatio,
                    width: 2,
                    label: {
                        text: 'max',
                        style: { color: '#dc3545', fontWeight: 'bold' }
                    }
                }] : []
            },
            tooltip: {
                shared: true,
                crosshairs: true,
                headerFormat: '<b>{point.x}</b><br/>',
                pointFormat: '{series.name}: <b>{point.y}</b><br/>'
            },
            legend: {
                enabled: true
            },
            credits: {
                enabled: false
            },
            series: [{
=======
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
>>>>>>> Tina
                name: title,
                data,
                color,
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

<<<<<<< HEAD
    // ========== 11. RENDER CHART WITH ALERT ==========
    const renderChart = (title, dataKey, color, standard) => {
        const config = createChartConfig(title, dataKey, color, standard);

        if (!config) {
            return null;
        }

        const data = chartData.map(d => calculateRatio(d[dataKey], dataKey));
        const latestValue = data[data.length - 1];
        const isBelowStandard = !checkStandard(latestValue, standard);
        const isAboveStandard = standard.successIcon && checkStandard(latestValue, standard);

        return (
            <div key={dataKey} style={{ marginBottom: '20px' }}>
                {isBelowStandard && standard.errorIcon && (
                    <AlertBar critical>
                        {standard.warning}
                    </AlertBar>
                )}
                {isBelowStandard && !standard.errorIcon && (
                    <AlertBar warning>
                        {standard.warning}
                    </AlertBar>
                )}
                {isAboveStandard && (
                    <AlertBar success>
                        {standard.warning}
                    </AlertBar>
                )}
                <Card style={{ marginTop: (isBelowStandard || isAboveStandard) ? '10px' : '0', padding: '20px' }}>
                    <HighchartsReact
                        highcharts={Highcharts}
                        options={config}
                    />
                </Card>
            </div>
        );
    };

    // ========== 12. RENDER MAIN COMPONENT ==========
=======
    // ========== RENDER ==========
>>>>>>> Tina
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

<<<<<<< HEAD
    return (
        <div style={{ padding: '20px' }}>
            <h1>School Analytics Dashboard</h1>
            <p>Jambalaya Cluster - Educational Standards Monitoring</p>
=======
    const currentSchool =
        schools.find((s) => s.id === selectedSchool) || null;
    const latestEntry =
        chartData && chartData.length > 0
            ? chartData[chartData.length - 1]
            : null;
>>>>>>> Tina

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

    const activeMetric =
        openMetric && metrics.find((m) => m.key === openMetric);

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

<<<<<<< HEAD
            {/* Display learner and teacher counts */}
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                <p><strong>Total Learners:</strong> {learnerCount}</p>
                <p><strong>Total Teachers (Staff):</strong> {teacherCount}</p>
                {learnerCount === 0 && teacherCount === 0 && (
                    <p style={{ color: '#ff9800', marginTop: '10px' }}>
                        <strong>Note:</strong> Check console for available data
                    </p>
                )}
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
                    <CircularLoader />
                </div>
            ) : chartData && chartData.length > 0 ? (
                <>
                    {learnerCount === 0 && (
                        <NoticeBox warning title="Missing Learner Data" style={{ marginBottom: '20px' }}>
                            No learner data found. Ratios will show as 0 until learner data is available.
                        </NoticeBox>
                    )}
                    {renderChart('Learners per toilet', 'toilets', '#ff9800', STANDARDS.toilets)}
                    {renderChart('Seat to learner ratio', 'seats', '#4caf50', STANDARDS.seats)}
                    {renderChart('Book to learner ratio', 'books', '#2196f3', STANDARDS.books)}
                    {renderChart('Learners per classroom', 'classrooms', '#9c27b0', STANDARDS.classrooms)}
                    {renderChart('Learners per teacher', 'teachers', '#ff5722', STANDARDS.teachers)}
                </>
            ) : (
                <NoticeBox warning title="No Data">
                    No resource inspection events found for this school. Submit some inspections first using the Inspection form.
                </NoticeBox>
=======
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

                {metrics.map((metric) => {
    const status = classifyStatus(metric.value, metric.standard);
    const isExpanded = openMetric === metric.key; // Check if the row is expanded
    return (
        <div key={metric.key} className={`${classes.statusRow} ${isExpanded ? 'expanded' : ''}`}>
            {/* Icon for status */}
            <div className={classes.statusIcon}>
{status.severity === 'critical' && <IconWarningFilled24 style={{ color: '#f44336' }} />}
{status.severity === 'limited' && <IconInfoFilled24 style={{ color: '#ff9800' }} />}
{status.severity === 'adequate' && <IconCheckmarkCircle24 style={{ color: '#4caf50' }} />}

                {/* Default icon if severity is none */}
            </div>

            <div className={classes.statusTextBlock}>
                <div className={classes.statusTitle}>
                    {metric.label} – {status.label}
                </div>
                <div className={classes.statusSubtitle}>
                    Latest value: <strong>{metric.value ?? "No data"}</strong>
                </div>
            </div>

            <button
                type="button"
                className={classes.detailsButton}
                onClick={() => setOpenMetric(isExpanded ? null : metric.key)} // Toggle expansion
            >
                details ▾
            </button>

            {/* Show details when expanded */}
            {isExpanded && (
                <div className={classes.statusDetailContent}>
                    <p>Target: {metric.standard.min ?? "No target defined"}</p>
                    <p>...</p>
                </div>
>>>>>>> Tina
            )}
        </div>
    );
})}

            </Card>

            {/* DETAIL VIEW WITH CHART */}
            {activeMetric && (
                <Card className={classes.detailCard}>
                    <div className={classes.detailHeader}>
                        <span className={classes.detailBadge}>
                            {activeMetric.label}:{" "}
                            {activeMetric.value ?? "No data"}{" "}
                            {activeMetric.standard.min !== undefined &&
                                `(Target ≥ ${activeMetric.standard.min})`}
                            {activeMetric.standard.max !== undefined &&
                                `(Target ≤ ${activeMetric.standard.max})`}
                        </span>
                    </div>

                    {activeConfig ? (
                        <div className={classes.chartWrapper}>
                            <HighchartsReact
                                highcharts={Highcharts}
                                options={activeConfig}
                            />
                        </div>
                    ) : (
                        <div className={classes.noDataText}>
                            Not enough data to render chart for this metric.
                        </div>
                    )}

                    {/* Simple explanatory text + recommendation */}
                    <div className={classes.detailTextBlock}>
                        <p>
                            This chart compares the latest value for{" "}
                            <strong>{activeMetric.label}</strong> at this
                            school with the average across the Jambalaya
                            cluster, including ±1 standard deviation.
                        </p>

                        <h4>Recommendation</h4>
                        {(() => {
                            const status = classifyStatus(
                                activeMetric.value,
                                activeMetric.standard
                            );
                            if (status.severity === "critical") {
                                return (
                                    <p>
                                        {activeMetric.label} is{" "}
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
                                        {activeMetric.label} is{" "}
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
                                        {activeMetric.label} currently meets the
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
                </Card>
            )}

            {/* SUMMARY CARD */}
            {metrics.length > 0 && (
                <Card className={classes.summaryCard}>
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
                </Card>
            )}
        </div>
    );
}
