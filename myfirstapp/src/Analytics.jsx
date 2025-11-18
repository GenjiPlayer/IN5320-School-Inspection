import React, { useState, useEffect } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import {
    Card,
    CircularLoader,
    NoticeBox,
    SingleSelectField,
    SingleSelectOption,
} from '@dhis2/ui';

/**
 * Analytics Dashboard - Simplified Version
 *
 * Uses only the Resources event program data that you already have
 * Based on your Inspection.jsx working endpoints
 */

export default function Analytics() {
    // State
    const [schools, setSchools] = useState([]);
    const [selectedSchool, setSelectedSchool] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [events, setEvents] = useState([]);
    const [chartData, setChartData] = useState(null);

    // ========== CONFIGURATION ==========
    const RESOURCE_PROGRAM_ID = 'uvpW17dnfUS'; // Your resources program ID (from screenshot)

    const DATA_ELEMENTS = {
        TOILETS: 'slYohGwjQme',      // "toilets" from screenshot
        SEATS: 'fgUU2XNkGvI',         // "seats" from screenshot
        BOOKS: 'm9k3VefvGQw',         // "books" from screenshot
        CLASSROOMS: 'mlbyc3CWNyb' // Add if you have this
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
        if (selectedSchool) {
            fetchEvents();
        }
    }, [selectedSchool]);

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

            // Process events into chart data
            processEvents(eventList);

        } catch (err) {
            setError('Failed to fetch events: ' + err.message);
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    // ========== 3. PROCESS EVENTS INTO CHART DATA ==========
    const processEvents = (eventList) => {
        // Group events by month, keeping only the LATEST event per month
        const grouped = {};

        eventList.forEach(event => {
            const eventDate = new Date(event.occurredAt || event.createdAt);
            const month = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`;

            // Initialize or update if this event is later
            if (!grouped[month] || eventDate > grouped[month].date) {
                // Extract data values from this event
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

        // Sort months and create chart data
        const sortedMonths = Object.keys(grouped).sort();

        const processed = sortedMonths.map(month => {
            return {
                month,
                toilets: grouped[month].toilets,
                seats: grouped[month].seats,
                books: grouped[month].books,
                classrooms: grouped[month].classrooms
            };
        });
        setChartData(processed);
    };

    // ========== 4. CREATE HIGHCHARTS CONFIG ==========
    const createChartConfig = (title, dataKey, color) => {
        if (!chartData || chartData.length === 0) {
            return null;
        }

        const categories = chartData.map(d => d.month);
        const data = chartData.map(d => d[dataKey]);
        const latestValue = data[data.length - 1];

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
                    fontSize: '18px',
                    fontWeight: 'bold'
                }
            },
            subtitle: {
                text: `<span style="background-color: #2196f3; color: white; padding: 5px 15px; border-radius: 4px; font-weight: bold;">Current: ${latestValue}</span>`,
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
                }
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
                lineWidth: 2
            }],
            plotOptions: {
                line: {
                    dataLabels: {
                        enabled: false
                    },
                    enableMouseTracking: true
                }
            }
        };
    };

    // ========== 5. RENDER CHART ==========
    const renderChart = (title, dataKey, color) => {
        const config = createChartConfig(title, dataKey, color);

        if (!config) {
            return null;
        }

        return (
            <Card key={dataKey} style={{ marginBottom: '20px', padding: '20px' }}>
                <HighchartsReact
                    highcharts={Highcharts}
                    options={config}
                />
            </Card>
        );
    };

    // ========== 6. RENDER MAIN COMPONENT ==========
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
                    {renderChart('Total Toilets', 'toilets', '#ff9800')}
                    {renderChart('Total Seats', 'seats', '#4caf50')}
                    {renderChart('Total Books', 'books', '#2196f3')}
                    {renderChart('Total Classrooms', 'classrooms', '#9c27b0')}
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