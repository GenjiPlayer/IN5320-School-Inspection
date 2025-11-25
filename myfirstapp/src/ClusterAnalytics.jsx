import React, { useState, useEffect } from "react";
import {
    Card,
    Button,
    CircularLoader,
    NoticeBox,
    IconArrowLeft24,
} from "@dhis2/ui";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

import classes from "./ClusterAnalytics.module.css";

const API_BASE = "https://research.im.dhis2.org/in5320g20/api";
const CREDENTIALS = "Basic " + btoa("admin:district");

const LEARNER_DATA_ELEMENT = "ue3QIMOAC7G";
const TEACHER_PROGRAM = "rmuGQ7kBQBU";
const RESOURCE_PROGRAM = "uvpW17dnfUS";

const JAMBALAYA_CLUSTER_ID = "Jj1IUjjPaWf";
const PEPPER_CLUSTER_ID = "GWRcrane4FY";

// Educational standards
const STANDARDS = {
    seatToLearner: { min: 1, max: Infinity, label: "Seat-to-Learner Ratio" },
    textbookToLearner: { min: 1, max: Infinity, label: "Textbook-to-Learner Ratio" },
    learnerToClassroom: { min: 0, max: 53, label: "Learner-to-Classroom Ratio" },
    learnerToTeacher: { min: 0, max: 45, label: "Learner-to-Teacher Ratio" },
    learnerToToilet: { min: 0, max: 25, label: "Learner-to-Toilet Ratio" },
};

export default function ClusterAnalytics({ setActivePage }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [clusterData, setClusterData] = useState({
        jambalaya: {},
        pepper: {},
    });

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            const jambalayaData = await fetchClusterData(JAMBALAYA_CLUSTER_ID);
            const pepperData = await fetchClusterData(PEPPER_CLUSTER_ID);

            setClusterData({
                jambalaya: jambalayaData,
                pepper: pepperData,
            });
        } catch (err) {
            setError("Failed to load cluster analytics");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchClusterData = async (clusterId) => {
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
            let totalBooks = 0;
            let totalClassrooms = 0;
            let totalToilets = 0;

            // Fetch learner data for each school
            for (const school of schools) {
                const learnersRes = await fetch(
                    `${API_BASE}/analytics.json?dimension=dx:${LEARNER_DATA_ELEMENT}&dimension=ou:${school.id}&dimension=pe:LAST_12_MONTHS`,
                    { headers: { Authorization: CREDENTIALS } }
                );
                const learnersData = await learnersRes.json();
                const learnerCount = learnersData.rows?.[0]?.[3] || 0;
                totalLearners += parseInt(learnerCount);
            }

            // Fetch teacher data
            const teachersRes = await fetch(
                `${API_BASE}/tracker/events.json?program=${TEACHER_PROGRAM}&orgUnit=${clusterId}&ouMode=DESCENDANTS&pageSize=1000`,
                { headers: { Authorization: CREDENTIALS } }
            );
            const teachersData = await teachersRes.json();
            totalTeachers = teachersData.events?.length || 0;

            // Fetch resource data
            for (const school of schools) {
                const resourcesRes = await fetch(
                    `${API_BASE}/tracker/events.json?program=${RESOURCE_PROGRAM}&orgUnit=${school.id}&pageSize=1`,
                    { headers: { Authorization: CREDENTIALS } }
                );
                const resourcesData = await resourcesRes.json();
                const event = resourcesData.events?.[0];

                if (event) {
                    const dataValues = event.dataValues || [];
                    totalSeats += parseInt(dataValues.find((dv) => dv.dataElement === "fgUU2XNkGvI")?.value || 0);
                    totalBooks += parseInt(dataValues.find((dv) => dv.dataElement === "m9k3VefvGQw")?.value || 0);
                    totalClassrooms += parseInt(dataValues.find((dv) => dv.dataElement === "mlbyc3CWNyb")?.value || 0);
                    totalToilets += parseInt(dataValues.find((dv) => dv.dataElement === "slYohGwjQme")?.value || 0);
                }
            }

            // Calculate ratios
            const ratios = {
                seatToLearner: totalLearners > 0 ? (totalSeats / totalLearners).toFixed(2) : 0,
                textbookToLearner: totalLearners > 0 ? (totalBooks / totalLearners).toFixed(2) : 0,
                learnerToClassroom: totalClassrooms > 0 ? (totalLearners / totalClassrooms).toFixed(2) : 0,
                learnerToTeacher: totalTeachers > 0 ? (totalLearners / totalTeachers).toFixed(2) : 0,
                learnerToToilet: totalToilets > 0 ? (totalLearners / totalToilets).toFixed(2) : 0,
            };

            return {
                totalLearners,
                totalTeachers,
                totalSeats,
                totalBooks,
                totalClassrooms,
                totalToilets,
                ratios,
            };
        } catch (err) {
            console.error("Error fetching cluster data:", err);
            return {
                totalLearners: 0,
                totalTeachers: 0,
                totalSeats: 0,
                totalBooks: 0,
                totalClassrooms: 0,
                totalToilets: 0,
                ratios: {},
            };
        }
    };

    const createComparisonChart = (metric, label) => {
        const jambalayaValue = parseFloat(clusterData.jambalaya.ratios?.[metric] || 0);
        const pepperValue = parseFloat(clusterData.pepper.ratios?.[metric] || 0);
        const standard = STANDARDS[metric];

        let zones = [];
        if (standard.min !== 0 || standard.max !== Infinity) {
            zones = [
                { value: standard.min, color: "#f44336" },
                { value: standard.max, color: "#4caf50" },
                { color: "#ff9800" },
            ];
        }

        return {
            chart: { type: "column", height: 300 },
            title: { text: label },
            xAxis: { categories: ["Jambalaya", "Pepper"] },
            yAxis: {
                title: { text: "Ratio" },
                plotLines: standard.max !== Infinity
                    ? [{ value: standard.max, color: "red", dashStyle: "Dash", width: 2, label: { text: `Max: ${standard.max}` } }]
                    : [],
            },
            series: [
                {
                    name: label,
                    data: [jambalayaValue, pepperValue],
                    color: "#2D6693",
                },
            ],
            plotOptions: {
                column: {
                    zones: zones.length > 0 ? zones : undefined,
                },
            },
            credits: { enabled: false },
        };
    };

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
            <div className={classes.pageHeader}>
                <Button small icon={<IconArrowLeft24 />} onClick={() => setActivePage("dashboard")} />
                <h2>Cluster Analytics</h2>
            </div>

            <Card className={classes.summaryCard}>
                <h3>Cluster Summary</h3>
                <div className={classes.summaryGrid}>
                    <div className={classes.summaryItem}>
                        <span className={classes.summaryLabel}>Jambalaya Learners:</span>
                        <span className={classes.summaryValue}>{clusterData.jambalaya.totalLearners}</span>
                    </div>
                    <div className={classes.summaryItem}>
                        <span className={classes.summaryLabel}>Pepper Learners:</span>
                        <span className={classes.summaryValue}>{clusterData.pepper.totalLearners}</span>
                    </div>
                    <div className={classes.summaryItem}>
                        <span className={classes.summaryLabel}>Jambalaya Teachers:</span>
                        <span className={classes.summaryValue}>{clusterData.jambalaya.totalTeachers}</span>
                    </div>
                    <div className={classes.summaryItem}>
                        <span className={classes.summaryLabel}>Pepper Teachers:</span>
                        <span className={classes.summaryValue}>{clusterData.pepper.totalTeachers}</span>
                    </div>
                </div>
            </Card>

            <div className={classes.chartsGrid}>
                {Object.entries(STANDARDS).map(([key, standard]) => (
                    <Card key={key} className={classes.chartCard}>
                        <HighchartsReact highcharts={Highcharts} options={createComparisonChart(key, standard.label)} />
                    </Card>
                ))}
            </div>
        </div>
    );
}