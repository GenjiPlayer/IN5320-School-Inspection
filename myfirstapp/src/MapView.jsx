import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function MapView({ schools = [], selectedSchool = null }) {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const markersRef = useRef([]);

    useEffect(() => {
        if (!mapRef.current) return;

        // Lag kartet kun én gang
        if (!mapInstance.current) {
            // Center on Gambia
            mapInstance.current = L.map(mapRef.current).setView([13.4432, -15.3101], 8);

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                maxZoom: 19,
                attribution: "© OpenStreetMap contributors",
            }).addTo(mapInstance.current);
        }

        // Clear existing markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        // Add markers for each school with custom colors
        const bounds = [];
        schools.forEach(school => {
            // Create custom colored marker icons
            const markerIcon = L.divIcon({
                className: 'custom-marker',
                html: `<div style="
                    background-color: ${school.markerColor};
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

            const marker = L.marker([school.lat, school.lng], { icon: markerIcon })
                .addTo(mapInstance.current)
                .bindPopup(`<b>${school.name}</b><br/>Last visit: ${school.lastVisitDays} days ago`);

            markersRef.current.push(marker);
            bounds.push([school.lat, school.lng]);
        });

        // Fit map to show all markers if no school is selected
        if (!selectedSchool && bounds.length > 0) {
            mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [schools, selectedSchool]);

    // Zoom to selected school when it changes
    useEffect(() => {
        if (selectedSchool && mapInstance.current) {
            mapInstance.current.setView([selectedSchool.lat, selectedSchool.lng], 15, {
                animate: true,
                duration: 1
            });

            // Open popup for the selected school
            const selectedMarker = markersRef.current.find((marker) => {
                const pos = marker.getLatLng();
                return pos.lat === selectedSchool.lat && pos.lng === selectedSchool.lng;
            });

            if (selectedMarker) {
                selectedMarker.openPopup();
            }
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
}
