import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const MapView = forwardRef(({ schools = [], selectedSchool = null, onMarkerClick }, ref) => {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const markersRef = useRef([]);
    const defaultCenter = useRef([13.4432, -15.3101]); // Gambia center
    const defaultZoom = useRef(8);

    // Expose flyToSchool, recenter, and fitBoundsToSchools methods to parent component via ref
    useImperativeHandle(ref, () => ({
        flyToSchool: (school) => {
            if (mapInstance.current && school) {
                mapInstance.current.flyTo([school.lat, school.lng], 14, {
                    animate: true,
                    duration: 1.5
                });

                // Highlight selected marker
                highlightMarker(school);
            }
        },
        recenter: () => {
            if (mapInstance.current) {
                mapInstance.current.flyTo(defaultCenter.current, defaultZoom.current, {
                    animate: true,
                    duration: 1.5
                });
            }
        },
        fitBoundsToSchools: (filteredSchools) => {
            if (mapInstance.current && filteredSchools.length > 0) {
                const bounds = filteredSchools.map(s => [s.lat, s.lng]);

                if (filteredSchools.length === 1) {
                    // If only one school, zoom to it specifically
                    mapInstance.current.flyTo([filteredSchools[0].lat, filteredSchools[0].lng], 13, {
                        animate: true,
                        duration: 1.5
                    });
                } else {
                    // If multiple schools, fit bounds to show all
                    mapInstance.current.fitBounds(bounds, {
                        padding: [80, 80],
                        animate: true,
                        duration: 1.5,
                        maxZoom: 12
                    });
                }
            }
        }
    }));

    // Highlight selected marker
    const highlightMarker = (school) => {
        markersRef.current.forEach((markerData) => {
            const marker = markerData.marker;
            const markerSchool = markerData.school;

            if (markerSchool.id === school.id) {
                // Selected marker - larger and pulsing
                const highlightIcon = L.divIcon({
                    className: 'custom-marker-highlight',
                    html: `
                        <div style="
                            background-color: ${school.markerColor};
                            width: 35px;
                            height: 35px;
                            border-radius: 50% 50% 50% 0;
                            transform: rotate(-45deg);
                            border: 3px solid white;
                            box-shadow: 0 0 20px rgba(37, 99, 235, 0.6), 0 4px 8px rgba(0,0,0,0.3);
                            animation: pulse 2s ease-in-out infinite;
                        "></div>
                        <style>
                            @keyframes pulse {
                                0%, 100% { transform: rotate(-45deg) scale(1); }
                                50% { transform: rotate(-45deg) scale(1.1); }
                            }
                        </style>
                    `,
                    iconSize: [35, 35],
                    iconAnchor: [17, 35],
                });
                marker.setIcon(highlightIcon);
                marker.openPopup();
            } else {
                // Normal marker
                const normalIcon = L.divIcon({
                    className: 'custom-marker',
                    html: `<div style="
                        background-color: ${markerSchool.markerColor};
                        width: 25px;
                        height: 25px;
                        border-radius: 50% 50% 50% 0;
                        transform: rotate(-45deg);
                        border: 2px solid white;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    "></div>`,
                    iconSize: [25, 25],
                    iconAnchor: [12, 24],
                });
                marker.setIcon(normalIcon);
            }
        });
    };

    useEffect(() => {
        if (!mapRef.current) return;

        // Create map only once
        if (!mapInstance.current) {
            mapInstance.current = L.map(mapRef.current, {
                zoomControl: false // Disable default zoom control
            }).setView(defaultCenter.current, defaultZoom.current);

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                maxZoom: 19,
                attribution: "© OpenStreetMap contributors",
            }).addTo(mapInstance.current);

            // Add custom zoom control (positioned to avoid search bar)
            L.control.zoom({
                position: 'bottomright'
            }).addTo(mapInstance.current);

            // Add custom recenter button
            const RecenterControl = L.Control.extend({
                options: {
                    position: 'bottomright'
                },
                onAdd: function () {
                    const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                    const button = L.DomUtil.create('a', 'leaflet-control-recenter', container);

                    button.innerHTML = `
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>
                        </svg>
                    `;
                    button.href = '#';
                    button.title = 'Recenter map';
                    button.style.width = '34px';
                    button.style.height = '34px';
                    button.style.display = 'flex';
                    button.style.alignItems = 'center';
                    button.style.justifyContent = 'center';
                    button.style.cursor = 'pointer';
                    button.style.background = 'white';
                    button.style.border = '2px solid rgba(0,0,0,0.2)';
                    button.style.borderRadius = '4px';
                    button.style.marginTop = '10px';

                    L.DomEvent.on(button, 'click', function (e) {
                        L.DomEvent.stopPropagation(e);
                        L.DomEvent.preventDefault(e);

                        mapInstance.current.flyTo(defaultCenter.current, defaultZoom.current, {
                            animate: true,
                            duration: 1.5
                        });
                    });

                    return container;
                }
            });

            new RecenterControl().addTo(mapInstance.current);
        }

        // Clear existing markers
        markersRef.current.forEach(({ marker }) => marker.remove());
        markersRef.current = [];

        // Add markers for each school with custom colors
        const bounds = [];
        schools.forEach(school => {
            const isSelected = selectedSchool && selectedSchool.id === school.id;

            // Create custom colored marker icons
            const markerIcon = L.divIcon({
                className: isSelected ? 'custom-marker-highlight' : 'custom-marker',
                html: `<div style="
                    background-color: ${school.markerColor};
                    width: ${isSelected ? '35px' : '25px'};
                    height: ${isSelected ? '35px' : '25px'};
                    border-radius: 50% 50% 50% 0;
                    transform: rotate(-45deg);
                    border: ${isSelected ? '3px' : '2px'} solid white;
                    box-shadow: ${isSelected
                        ? '0 0 20px rgba(37, 99, 235, 0.6), 0 4px 8px rgba(0,0,0,0.3)'
                        : '0 2px 4px rgba(0,0,0,0.3)'
                    };
                "></div>`,
                iconSize: [isSelected ? 35 : 25, isSelected ? 35 : 25],
                iconAnchor: [isSelected ? 17 : 12, isSelected ? 35 : 24],
            });

            const marker = L.marker([school.lat, school.lng], { icon: markerIcon })
                .addTo(mapInstance.current)
                .bindPopup(`
                    <div style="padding: 4px 0;">
                        <strong style="font-size: 14px;">${school.name}</strong><br/>
                        <span style="font-size: 12px; color: #666;">
                            ${school.lastVisitDays === 999
                                ? "Never visited"
                                : `Last visit: ${school.lastVisitDays} days ago`}
                        </span><br/>
                        <span style="font-size: 12px; color: #666;">
                            ${school.learners} learners
                        </span>
                    </div>
                `);

            // Add click handler to trigger parent callback
            marker.on('click', () => {
                if (onMarkerClick) {
                    onMarkerClick(school);
                }
            });

            markersRef.current.push({ marker, school });
            bounds.push([school.lat, school.lng]);
        });

        // Fit map to show all markers if no school is selected
        if (!selectedSchool && bounds.length > 0) {
            mapInstance.current.fitBounds(bounds, {
                padding: [50, 50],
                animate: true,
                duration: 1.0
            });
        }
    }, [schools, selectedSchool, onMarkerClick]);

    // Zoom to selected school when it changes
    useEffect(() => {
        if (selectedSchool && mapInstance.current) {
            mapInstance.current.flyTo([selectedSchool.lat, selectedSchool.lng], 14, {
                animate: true,
                duration: 1.5
            });

            highlightMarker(selectedSchool);
        }
    }, [selectedSchool]);

    return (
        <div
            ref={mapRef}
            style={{
                width: "100%",
                height: "100%",
            }}
        />
    );
});

MapView.displayName = "MapView";

export default MapView;
