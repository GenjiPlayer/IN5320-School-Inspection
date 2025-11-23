import React, { useState, useEffect } from "react";
import { Card, CircularLoader, NoticeBox } from "@dhis2/ui";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import classes from "./ClusterAnalytics.module.css";

export default function ClusterAnalytics() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [monthlyStudentCounts, setMonthlyStudentCounts] = useState(null); // For total student count per month

    const RESOURCE_PROGRAM_ID = "uvpW17dnfUS";

    useEffect(() => {
        fetchCluster();
    }, []);

    // Function to fetch cluster data
    async function fetchCluster() {
        try {
            const res = await fetch(
                "https://research.im.dhis2.org/in5320g20/api/organisationUnits?filter=level:eq:5&filter=parent.name:eq:Jambalaya%20Cluster&fields=id,name&pageSize=1000",
                { headers: { Authorization: "Basic " + btoa("admin:district") } }
            );
            const data = await res.json();
            const schools = data.organisationUnits || [];
            await fetchEvents(schools);
        } catch (e) {
            setError("Failed to fetch schools: " + e.message);
            setLoading(false);
        }
    }

    // Function to fetch events and calculate monthly total student counts
    async function fetchEvents(schools) {
        setLoading(true);
        try {
            const allEvents = [];

            for (const school of schools) {
                const res = await fetch(
                    `https://research.im.dhis2.org/in5320g20/api/tracker/events.json?program=${RESOURCE_PROGRAM_ID}&orgUnit=${school.id}&fields=*`,
                    { headers: { Authorization: "Basic " + btoa("admin:district") } }
                );
                const data = await res.json();
                allEvents.push(...data.events);
            }

            console.log("All Events: ", allEvents);  // Debugging step

            processMonthlyStudentCounts(allEvents);
        } catch (e) {
            setError("Failed to fetch events: " + e.message);
        } finally {
            setLoading(false);
        }
    }

    // Function to process events into monthly student counts (grouped by createdAt)
    function processMonthlyStudentCounts(events) {
        const grouped = {};

        // Loop through each event and count how many students per month
        events.forEach(evt => {
            const date = new Date(evt.createdAt); // Use createdAt as the student's entry date
            const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

            if (!grouped[month]) {
                grouped[month] = 0; // Initialize count if not present
            }

            // Each event represents a student entry (or a tracked entity entry)
            grouped[month]++;
        });

        console.log("Grouped Data: ", grouped);  // Debugging step

        // Compute monthly data, grouped by 3 months (quarterly)
        const months = Object.keys(grouped).sort();
        const quarterlyData = [];
        let totalStudents = 0;

        // Group into quarterly data (every 3 months)
        for (let i = 0; i < months.length; i++) {
            totalStudents += grouped[months[i]];
            if ((i + 1) % 3 === 0 || i === months.length - 1) { // Every 3 months or last month
                quarterlyData.push({
                    month: `${months[i - 2] ? months[i - 2].slice(0, 7) : ""} - ${months[i].slice(0, 7)}`,
                    totalStudents,
                });
                totalStudents = 0; // Reset for next quarter
            }
        }

        console.log("Quarterly Data: ", quarterlyData);  // Debugging step
        setMonthlyStudentCounts(quarterlyData);
    }

    // Function to build the line chart configuration
    function buildLineChart(title, key, color) {
        const months = monthlyStudentCounts.map(r => r.month);
        const values = monthlyStudentCounts.map(r => r[key]);

        return {
            chart: { type: "line", height: 300 },
            title: { text: title },
            xAxis: { categories: months },
            yAxis: {
                title: { text: "Number of Students" },
                min: 0
            },
            plotOptions: {
                series: {
                    cursor: "pointer",
                    point: {
                        events: {
                            click: function () {
                                alert(`${this.category}: ${this.y.toFixed(0)} students`);
                            }
                        }
                    }
                }
            },
            series: [
                {
                    name: title,
                    data: values,
                    color
                }
            ]
        };
    }

    // Handle loading state
    if (loading) {
        return (
            <div className={classes.loadingWrapper}>
                <CircularLoader />
            </div>
        );
    }

    // Handle error state
    if (error) {
        return (
            <div className={classes.pageWrapper}>
                <NoticeBox error title="Error">{error}</NoticeBox>
            </div>
        );
    }

    // Return null if no monthly student counts
    if (!monthlyStudentCounts) return null;

    return (
        <div className={classes.pageWrapper}>
            <h2>Cluster Analytics – Total Students Over Time</h2>

            <Card>
                <HighchartsReact
                    highcharts={Highcharts}
                    options={buildLineChart("Total Students (Quarterly)", "totalStudents", "#4caf50")}
                />
            </Card>
        </div>
    );
}
