import React, { useState, useEffect, useRef } from 'react';
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
    Button,
    Card,
} from "@dhis2/ui";

export default function SchoolPlanner() {
    const [schools, setSchools] = useState([]);
    const [visitData, setVisitData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [clusterSchools, setClusterSchools] = useState([]);
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [viewMode, setViewMode] = useState('table');
    const [lastInspectionData, setLastInspectionData] = useState(null);
    const [dataElementNames, setDataElementNames] = useState({});
    const [mapLoaded, setMapLoaded] = useState(false);

    const mapRef = useRef(null);
    const markersRef = useRef([]);

    const RESOURCE_PROGRAM_ID = 'uvpW17dnfUS';
    const SCHOOL_INSPECTION_PROGRAM_ID = 'UxK2o06ScIe';
    const JAMBALAYA_CLUSTER_ID = 'Jj1IUjjPaWf';

    useEffect(() => {
        // Load Leaflet
        if (!document.getElementById('leaflet-css')) {
            const link = document.createElement('link');
            link.id = 'leaflet-css';
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
        }

        if (!window.L && !document.getElementById('leaflet-js')) {
            const script = document.createElement('script');
            script.id = 'leaflet-js';
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = () => setMapLoaded(true);
            document.body.appendChild(script);
        } else if (window.L) {
            setMapLoaded(true);
        }

        fetchDataElementNames();
        fetchClusterSchools();
        fetchSchools();
    }, []);

    // Initialize map only once when switching to map view
    useEffect(() => {
        if (viewMode === 'map' && mapLoaded && clusterSchools.length > 0 && !mapRef.current) {
            setTimeout(() => initializeMap(), 100);
        }
    }, [viewMode, mapLoaded, clusterSchools]);

    // Update markers when selection changes
    useEffect(() => {
        if (mapRef.current && selectedSchool) {
            updateMarkers();
        }
    }, [selectedSchool]);

    const initializeMap = () => {
        const mapContainer = document.getElementById('school-map');
        if (!mapContainer || !window.L || mapRef.current) return;

        // Extract school positions with coordinates
        const schoolsWithCoords = clusterSchools
            .map(school => {
                if (school.geometry?.type === 'Point') {
                    const [lng, lat] = school.geometry.coordinates;
                    const visitInfo = visitData.find(v => v.id === school.id);
                    return {
                        ...school,
                        lat,
                        lng,
                        overdue: visitInfo ? isOverdue(visitInfo.lastVisitDate) : true,
                        lastVisitDate: visitInfo?.lastVisitDate
                    };
                }
                return null;
            })
            .filter(Boolean);

        if (schoolsWithCoords.length === 0) return;

        // Calculate center
        const avgLat = schoolsWithCoords.reduce((sum, s) => sum + s.lat, 0) / schoolsWithCoords.length;
        const avgLng = schoolsWithCoords.reduce((sum, s) => sum + s.lng, 0) / schoolsWithCoords.length;

        // Create map with proper options
        const map = window.L.map('school-map', {
            center: [avgLat, avgLng],
            zoom: 13,
            scrollWheelZoom: true,
            dragging: true,
            touchZoom: true,
            doubleClickZoom: true,
            boxZoom: true,
            keyboard: true,
            zoomControl: true
        });

        mapRef.current = map;

        // Force map to recognize its size
        setTimeout(() => {
            map.invalidateSize();
        }, 100);

        // Add OpenStreetMap tiles
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
        }).addTo(map);

        // Add markers for each school
        schoolsWithCoords.forEach(school => {
            const color = school.overdue ? '#ff9800' : '#4caf50';

            const circleMarker = window.L.circleMarker([school.lat, school.lng], {
                radius: 8,
                fillColor: color,
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(map);

            // Store reference
            markersRef.current.push({
                marker: circleMarker,
                schoolId: school.id,
                school: school
            });

            // Add tooltip with school name
            circleMarker.bindTooltip(school.name, {
                permanent: false,
                direction: 'top',
                className: 'school-tooltip'
            });

            // Add popup with school info
            const popupContent = `
                <div style="min-width: 200px;">
                    <h3 style="margin: 0 0 10px 0;">${school.name}</h3>
                    <p style="margin: 5px 0;"><strong>Status:</strong> 
                        <span style="color: ${color}; font-weight: bold;">
                            ${school.overdue ? 'Overdue' : 'Up to date'}
                        </span>
                    </p>
                    <p style="margin: 5px 0;"><strong>Last Visit:</strong> 
                        ${school.lastVisitDate ? new Date(school.lastVisitDate).toLocaleDateString() : 'No visits yet'}
                    </p>
                </div>
            `;
            circleMarker.bindPopup(popupContent);

            // Handle click - use a wrapper to prevent map drag from triggering
            circleMarker.on('click', (e) => {
                window.L.DomEvent.stopPropagation(e);
                handleSchoolClick(school);
            });
        });

        // Add legend
        const legend = window.L.control({ position: 'bottomright' });
        legend.onAdd = function () {
            const div = window.L.DomUtil.create('div', 'info legend');
            div.innerHTML = `
                <div style="background: white; padding: 10px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                    <strong>Legend</strong><br>
                    <div style="margin-top: 8px;">
                        <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #4caf50; margin-right: 5px;"></span>
                        Up to date<br>
                        <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #ff9800; margin-right: 5px; margin-top: 5px;"></span>
                        Overdue
                    </div>
                </div>
            `;
            return div;
        };
        legend.addTo(map);
    };

    const updateMarkers = () => {
        if (!mapRef.current || !selectedSchool) return;

        // Update all markers
        markersRef.current.forEach(({ marker, schoolId }) => {
            const isSelected = schoolId === selectedSchool.id;

            marker.setStyle({
                radius: isSelected ? 12 : 8,
                weight: isSelected ? 3 : 2,
                color: isSelected ? '#1976d2' : '#fff'
            });
        });
    };

    const fetchDataElementNames = async () => {
        try {
            const [resourceRes, inspectionRes] = await Promise.all([
                fetch(
                    `https://research.im.dhis2.org/in5320g20/api/programs/${RESOURCE_PROGRAM_ID}?fields=programStages[programStageDataElements[dataElement[id,name]]]`,
                    { headers: { Authorization: 'Basic ' + btoa('admin:district') } }
                ),
                fetch(
                    `https://research.im.dhis2.org/in5320g20/api/programs/${SCHOOL_INSPECTION_PROGRAM_ID}?fields=programStages[programStageDataElements[dataElement[id,name]]]`,
                    { headers: { Authorization: 'Basic ' + btoa('admin:district') } }
                )
            ]);

            const resourceData = await resourceRes.json();
            const inspectionData = await inspectionRes.json();

            const names = {};

            resourceData.programStages[0]?.programStageDataElements.forEach(pde => {
                names[pde.dataElement.id] = pde.dataElement.name;
            });

            inspectionData.programStages[0]?.programStageDataElements.forEach(pde => {
                names[pde.dataElement.id] = pde.dataElement.name;
            });

            setDataElementNames(names);
        } catch (err) {
            console.error('Error fetching data element names:', err);
        }
    };

    const fetchClusterSchools = async () => {
        try {
            const res = await fetch(
                `https://research.im.dhis2.org/in5320g20/api/organisationUnits?fields=id,name,geometry&filter=parent.id:eq:${JAMBALAYA_CLUSTER_ID}&filter=geometry:!null:all`,
                {
                    headers: {
                        Authorization: 'Basic ' + btoa('admin:district'),
                    },
                }
            );

            const data = await res.json();
            console.log("📍 Cluster schools with geometry:", data.organisationUnits);
            setClusterSchools(data.organisationUnits || []);
        } catch (err) {
            console.error("Error fetching cluster geometry:", err);
        }
    };

    const fetchSchools = async () => {
        try {
            const res = await fetch(
                "https://research.im.dhis2.org/in5320g20/api/organisationUnits?fields=id,name,geometry&filter=parent.name:eq:Jambalaya%20Cluster&filter=level:eq:5&pageSize=1000",
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
                    `https://research.im.dhis2.org/in5320g20/api/tracker/events.json?program=${SCHOOL_INSPECTION_PROGRAM_ID}&orgUnit=${school.id}&order=occurredAt:desc&pageSize=1`,
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
                    geometry: school.geometry,
                    lastVisitDate: lastEvent?.occurredAt || lastEvent?.eventDate || null,
                    lastEventData: lastEvent
                });
            } catch (err) {
                console.error("Error fetching events for", school.name, err);
            }
        }

        setVisitData(results);
        setLoading(false);
    };

    const fetchLastInspectionDetails = async (schoolId) => {
        try {
            const res = await fetch(
                `https://research.im.dhis2.org/in5320g20/api/tracker/events.json?program=${SCHOOL_INSPECTION_PROGRAM_ID}&orgUnit=${schoolId}&order=occurredAt:desc&pageSize=1`,
                {
                    headers: {
                        Authorization: "Basic " + btoa("admin:district"),
                    },
                }
            );

            const data = await res.json();
            const lastEvent = data.events?.[0];

            if (lastEvent) {
                const inspectionData = {
                    date: lastEvent.occurredAt || lastEvent.eventDate,
                    dataValues: lastEvent.dataValues || []
                };
                setLastInspectionData(inspectionData);
            } else {
                setLastInspectionData(null);
            }
        } catch (err) {
            console.error("Error fetching inspection details:", err);
        }
    };

    const isOverdue = (date) => {
        if (!date) return true;
        const diffDays = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
        return diffDays > 90;
    };

    const sortedData = [...visitData].sort((a, b) => {
        const aOverdue = isOverdue(a.lastVisitDate);
        const bOverdue = isOverdue(b.lastVisitDate);
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        return (new Date(b.lastVisitDate || 0)) - (new Date(a.lastVisitDate || 0));
    });

    const handleSchoolClick = (school) => {
        setSelectedSchool(school);
        fetchLastInspectionDetails(school.id);
    };

    const formatDataValue = (dataElementId, value) => {
        const name = dataElementNames[dataElementId] || dataElementId;

        if (value === 'true') return `${name}: Yes`;
        if (value === 'false') return `${name}: No`;

        const conditionMap = {
            '1': 'Strongly disagree',
            '2': 'Disagree',
            '3': 'Undecided',
            '4': 'Agree',
            '5': 'Strongly agree'
        };

        if (conditionMap[value]) {
            return `${name}: ${conditionMap[value]}`;
        }

        return `${name}: ${value}`;
    };

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", padding: "50px" }}>
                <CircularLoader />
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: "20px" }}>
                <NoticeBox error title="Error loading data">
                    {error}
                </NoticeBox>
            </div>
        );
    }

    return (
        <div style={{ padding: "20px" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h1>School Visit Planner</h1>
                    <p>Schools that haven't been visited in over 90 days are highlighted in orange.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <Button onClick={() => setViewMode('table')} primary={viewMode === 'table'}>
                        Table View
                    </Button>
                    {clusterSchools.length > 0 && (
                        <Button onClick={() => setViewMode('map')} primary={viewMode === 'map'}>
                            Map View
                        </Button>
                    )}
                </div>
            </div>

            {viewMode === 'table' ? (
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
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => handleSchoolClick(school)}
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
            ) : (
                <div style={{ display: 'flex', gap: '20px' }}>
                    {/* Map */}
                    <Card style={{ flex: 1, padding: '20px' }}>
                        <h2>Jambalaya Cluster Schools</h2>
                        {clusterSchools.length > 0 ? (
                            <div
                                id="school-map"
                                style={{
                                    height: '600px',
                                    width: '100%',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '4px'
                                }}
                            />
                        ) : (
                            <NoticeBox warning title="No Map Data">
                                Schools in this cluster do not have geographical coordinates.
                            </NoticeBox>
                        )}
                    </Card>

                    {/* School Details */}
                    <Card style={{ width: '400px', padding: '20px', maxHeight: '600px', overflowY: 'auto' }}>
                        <h2>School Inspection Details</h2>
                        {selectedSchool ? (
                            <div>
                                <h3 style={{ marginTop: 0 }}>{selectedSchool.name}</h3>

                                <div style={{ marginBottom: '20px' }}>
                                    <p><strong>Status:</strong> <span style={{
                                        color: isOverdue(selectedSchool.lastVisitDate) ? '#ff9800' : '#4caf50',
                                        fontWeight: 'bold'
                                    }}>
                                        {isOverdue(selectedSchool.lastVisitDate) ? 'Overdue for inspection' : 'Recently inspected'}
                                    </span></p>
                                    <p><strong>Last Inspection:</strong> {selectedSchool.lastVisitDate
                                        ? new Date(selectedSchool.lastVisitDate).toLocaleDateString()
                                        : 'No inspections yet'}</p>
                                </div>

                                {lastInspectionData ? (
                                    <div>
                                        <h4>Previous Inspection Results:</h4>
                                        <div style={{
                                            backgroundColor: '#f5f5f5',
                                            padding: '15px',
                                            borderRadius: '4px'
                                        }}>
                                            <p><strong>Inspection Date:</strong> {new Date(lastInspectionData.date).toLocaleDateString()}</p>
                                            {lastInspectionData.dataValues.length > 0 ? (
                                                <div>
                                                    <p><strong>Facilities & Conditions:</strong></p>
                                                    <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
                                                        {lastInspectionData.dataValues.map((dv, idx) => (
                                                            <li key={idx}>
                                                                {formatDataValue(dv.dataElement, dv.value)}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ) : (
                                                <p>No inspection data recorded</p>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <NoticeBox warning>
                                        No previous inspection data available for this school.
                                    </NoticeBox>
                                )}
                            </div>
                        ) : (
                            <p style={{ color: '#999', textAlign: 'center', marginTop: '50px' }}>
                                Click on a school marker to view inspection details
                            </p>
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
}