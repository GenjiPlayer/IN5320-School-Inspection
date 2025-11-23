import React, { useState, useEffect } from 'react';
import Highcharts from 'highcharts';
import 'highcharts/highcharts-more';
import HighchartsReact from 'highcharts-react-official';
import {
    Card,
    CircularLoader,
    NoticeBox,
    SingleSelectField,
    SingleSelectOption,
    AlertBar,
} from '@dhis2/ui';

export default function Analytics() {
    // State
    const [schools, setSchools] = useState([]);
    const [selectedSchool, setSelectedSchool] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [events, setEvents] = useState([]);
    const [chartData, setChartData] = useState(null);
    const [clusterData, setClusterData] = useState(null);

    // ========== CONFIGURATION ==========
    const RESOURCE_PROGRAM_ID = 'uvpW17dnfUS';

    const DATA_ELEMENTS = {
        TOILETS: 'slYohGwjQme',
        SEATS: 'fgUU2XNkGvI',
        BOOKS: 'm9k3VefvGQw',
        CLASSROOMS: 'mlbyc3CWNyb'
    };

    // Standards with thresholds
    const STANDARDS = {
        toilets: {
            min: 15,
            label: 'Total Toilets',
            warning: 'Limited sanitation capacity',
            errorIcon: true
        },
        seats: {
            min: 50,
            label: 'Total Seats',
            warning: 'Insufficient seating',
            errorIcon: false
        },
        books: {
            min: 100,
            label: 'Total Books',
            warning: 'Insufficient textbooks',
            errorIcon: false
        },
        classrooms: {
            max: 10,
            label: 'Total Classrooms',
            warning: 'Capacity OK',
            successIcon: true
        }
    };

    // ========== 1. FETCH SCHOOLS ==========
    useEffect(() => {
        fetchSchools();
    }, []);

    const fetchSchools = async () => {
        try {
            const res = await fetch(
                'https://research.im.dhis2.org/in5320g20/api/organisationUnits?filter=level:eq:5&filter=parent.name:eq:Jambalaya%20Cluster&fields=id,name&pageSize=1000',
                {
                    headers: {
                        Authorization: 'Basic ' + btoa('admin:district'),
                    }
                }
            );

            const data = await res.json();
            const schoolList = data.organisationUnits || [];
            setSchools(schoolList);

            if (schoolList.length > 0) {
                setSelectedSchool(schoolList[0].id);
            }
        } catch (err) {
            setError('Failed to fetch schools: ' + err.message);
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
    }, [selectedSchool, schools]);

    const fetchEvents = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(
                `https://research.im.dhis2.org/in5320g20/api/tracker/events.json?program=${RESOURCE_PROGRAM_ID}&orgUnit=${selectedSchool}&fields=*`,
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

            console.log('📊 Fetched events:', eventList);
            setEvents(eventList);
            processEvents(eventList);

        } catch (err) {
            setError('Failed to fetch events: ' + err.message);
            console.error('Fetch error:', err);
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
                                Authorization: 'Basic ' + btoa('admin:district'),
                            }
                        }
                    );
                    const data = await res.json();
                    return data.events || [];
                })
            );

            processClusterData(allSchoolsData.flat());
        } catch (err) {
            console.error('Failed to fetch cluster data:', err);
        }
    };

    // ========== 3. PROCESS EVENTS INTO CHART DATA ==========
    const processEvents = (eventList) => {
        const grouped = {};

        eventList.forEach(event => {
            const eventDate = new Date(event.occurredAt || event.createdAt);
            const month = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`;

            if (!grouped[month] || eventDate > grouped[month].date) {
                const resources = {
                    toilets: 0,
                    seats: 0,
                    books: 0,
                    classrooms: 0
                };

                event.dataValues?.forEach(dv => {
                    const value = parseInt(dv.value) || 0;

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
                    ...resources
                };
            }
        });

        const sortedMonths = Object.keys(grouped).sort();
        const processed = sortedMonths.map(month => ({
            month,
            toilets: grouped[month].toilets,
            seats: grouped[month].seats,
            books: grouped[month].books,
            classrooms: grouped[month].classrooms
        }));

        console.log('📊 Processed chart data:', processed);
        setChartData(processed);
    };

    const processClusterData = (eventList) => {
        const grouped = {};

        eventList.forEach(event => {
            const eventDate = new Date(event.occurredAt || event.createdAt);
            const month = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`;

            if (!grouped[month]) {
                grouped[month] = {
                    toilets: [],
                    seats: [],
                    books: [],
                    classrooms: []
                };
            }

            event.dataValues?.forEach(dv => {
                const value = parseInt(dv.value) || 0;

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

        console.log('📊 Cluster data:', grouped);
        setClusterData(grouped);
    };

    // ========== 4. CALCULATE STATISTICS ==========
    const calculateAverage = (values) => {
        if (!values || values.length === 0) return 0;
        const sum = values.reduce((a, b) => a + b, 0);
        return parseFloat((sum / values.length).toFixed(2));
    };

    const calculateStdDev = (values, average) => {
        if (!values || values.length === 0) return 0;
        const squareDiffs = values.map(value => Math.pow(value - average, 2));
        const avgSquareDiff = calculateAverage(squareDiffs);
        return Math.sqrt(avgSquareDiff);
    };

    // ========== 5. CHECK IF STANDARD IS MET ==========
    const checkStandard = (value, standard) => {
        if (standard.min !== undefined) {
            return value >= standard.min;
        } else if (standard.max !== undefined) {
            return value <= standard.max;
        }
        return true;
    };

    // ========== 6. CREATE HIGHCHARTS CONFIG WITH DEVIATION ==========
    const createChartConfig = (title, dataKey, color, standard) => {
        if (!chartData || chartData.length === 0) {
            return null;
        }

        const categories = chartData.map(d => d.month);
        const data = chartData.map(d => d[dataKey]);
        const latestValue = data[data.length - 1];

        // Calculate cluster statistics for each month
        const clusterAverages = [];
        const upperBands = [];
        const lowerBands = [];

        categories.forEach(month => {
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

        return {
            chart: {
                type: 'line',
                height: 350,
                style: {
                    fontFamily: 'Roboto, sans-serif'
                }
            },
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
                    text: 'Current Total'
                },
                plotLines: standard.min !== undefined ? [{
                    color: '#dc3545',
                    dashStyle: 'Dash',
                    value: standard.min,
                    width: 2,
                    label: {
                        text: 'min',
                        style: { color: '#dc3545', fontWeight: 'bold' }
                    }
                }] : standard.max !== undefined ? [{
                    color: '#dc3545',
                    dashStyle: 'Dash',
                    value: standard.max,
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
                name: title,
                data: data,
                color: color,
                marker: {
                    radius: 4,
                    symbol: 'circle'
                },
                lineWidth: 2,
                zIndex: 3
            }, {
                name: 'Average across cluster',
                data: clusterAverages,
                color: '#2196f3',
                dashStyle: 'Dash',
                lineWidth: 2,
                marker: {
                    enabled: false
                },
                zIndex: 2
            }, {
                name: '±1 standard deviation',
                data: upperBands.map((upper, i) => [lowerBands[i], upper]),
                type: 'arearange',
                lineWidth: 0,
                color: '#2196f3',
                fillOpacity: 0.3,
                zIndex: 0,
                marker: {
                    enabled: false
                }
            }],
            plotOptions: {
                line: {
                    dataLabels: {
                        enabled: true,
                        formatter: function() {
                            if (this.point.index === this.series.data.length - 1) {
                                return this.y;
                            }
                            return null;
                        }
                    },
                    enableMouseTracking: true
                },
                arearange: {
                    enableMouseTracking: false
                }
            }
        };
    };

    // ========== 7. RENDER CHART WITH ALERT ==========
    const renderChart = (title, dataKey, color, standard) => {
        const config = createChartConfig(title, dataKey, color, standard);

        if (!config) {
            return null;
        }

        const latestValue = chartData[chartData.length - 1][dataKey];
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

    // ========== 8. RENDER MAIN COMPONENT ==========
    if (loading && !chartData) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
                <CircularLoader />
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '20px' }}>
                <NoticeBox error title="Error">
                    {error}
                </NoticeBox>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px' }}>
            <h1>School Resources Dashboard</h1>
            <p>Jambalaya Cluster - Resource Inspection Metrics</p>

            {/* School Selector */}
            <div style={{ marginBottom: '30px', maxWidth: '400px' }}>
                <SingleSelectField
                    label="Select School"
                    selected={selectedSchool}
                    onChange={({ selected }) => setSelectedSchool(selected)}
                >
                    {schools.map(school => (
                        <SingleSelectOption
                            key={school.id}
                            value={school.id}
                            label={school.name}
                        />
                    ))}
                </SingleSelectField>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
                    <CircularLoader />
                </div>
            ) : chartData && chartData.length > 0 ? (
                <>
                    {renderChart('Total Toilets', 'toilets', '#ff9800', STANDARDS.toilets)}
                    {renderChart('Total Seats', 'seats', '#4caf50', STANDARDS.seats)}
                    {renderChart('Total Books', 'books', '#2196f3', STANDARDS.books)}
                    {renderChart('Total Classrooms', 'classrooms', '#9c27b0', STANDARDS.classrooms)}
                </>
            ) : (
                <NoticeBox warning title="No Data">
                    No resource inspection events found for this school.
                    Submit some inspections first using the Inspection form.
                </NoticeBox>
            )}
        </div>
    );
}