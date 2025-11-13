import React, { useState, useEffect } from 'react';
import {
    Table,
    TableHead,
    TableRowHead,
    TableCellHead,
    TableBody,
    TableRow,
    TableCell,
    CircularLoader,
    NoticeBox,
} from "@dhis2/ui";

export default function SchoolPlanner() {
    const [schools, setSchools] = useState([]);
    const [visitData, setVisitData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const RESOURCE_PROGRAM_ID = 'uvpW17dnfUS';

    useEffect(() => {
        fetchSchools();
    }, []);

    const fetchSchools = async () => {
        try {
            const res = await fetch(
                "https://research.im.dhis2.org/in5320g20/api/organisationUnits?filter=level:eq:5&filter=parent.name:eq:Jambalaya%20Cluster&fields=id,name&pageSize=1000",
                {
                    headers: {
                        Authorization: 'Basic ' + btoa('admin:district'),
                    },
                }
            );

            const data = await res.json();
            const schoolList = data.organisationUnits || [];
            setSchools(schoolList);

            await fetchLastVisits(schoolList);
        } catch (err) {
            setError("Failed to fetch schools: " + (err instanceof Error ? err.message : String(err)));
            setLoading(false);
        }
    };

    const fetchLastVisits = async (schoolList) => {
        const results = [];

        for (const school of schoolList) {
            try {
                const res = await fetch(
                    `https://research.im.dhis2.org/in5320g20/api/tracker/events.json?program=${RESOURCE_PROGRAM_ID}&orgUnit=${school.id}&order=occurredAt:desc&pageSize=1`,
                    {
                        headers: {
                            Authorization: "Basic " + btoa("admin:district"),
                        },
                    }
                );

                const data = await res.json();
                const lastEvent = data.events?.[0];

                results.push({
                    id: school.id,
                    name: school.name,
                    lastVisitDate: lastEvent?.occurredAt || lastEvent?.eventDate || null,
                });
            } catch (err) {
                console.error("Error fetching events for", school.name, err);
            }
        }

        setVisitData(results);
        setLoading(false);
    };

    // Helper to determine if school is overdue (> 90 days since last visit)
    const isOverdue = (date) => {
        if (!date) return true;
        const diffDays = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
        return diffDays > 90;
    };

    // Sort schools: overdue ones first
    const sortedData = [...visitData].sort((a, b) => {
        const aOverdue = isOverdue(a.lastVisitDate);
        const bOverdue = isOverdue(b.lastVisitDate);
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        return (new Date(b.lastVisitDate || 0)) - (new Date(a.lastVisitDate || 0));
    });

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", padding: "50px" }}>
                <CircularLoader />
            </div>
        );
    }

    if (error) {
        return (
            <NoticeBox error title="Error loading data">
                {error}
            </NoticeBox>
        );
    }

    return (
        <div style={{ padding: "20px" }}>
            <h1>School Visit Planner</h1>
            <p>This table shows the last recorded inspection date per school. Schools that haven’t been visited in over 90 days are highlighted.</p>

            <Table>
                <TableHead>
                    <TableRowHead>
                        <TableCellHead>School Name</TableCellHead>
                        <TableCellHead>Last Visit Date</TableCellHead>
                        <TableCellHead>Status</TableCellHead>
                    </TableRowHead>
                </TableHead>

                <TableBody>
                    {sortedData.map((school) => {
                        const overdue = isOverdue(school.lastVisitDate);
                        return (
                            <TableRow
                                key={school.id}
                                style={{
                                    backgroundColor: overdue ? '#fff3e0' : 'white',
                                }}
                            >
                                <TableCell>{school.name}</TableCell>
                                <TableCell>
                                    {school.lastVisitDate
                                        ? new Date(school.lastVisitDate).toLocaleDateString()
                                        : 'No visits yet'}
                                </TableCell>
                                <TableCell>
                                    {overdue ? 'Overdue' : 'Up to date'}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
