// Analytics.jsx
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
} from "@dhis2/ui";

/**
 * Analytics.jsx
 * - uses the resource program (events) + student enrollments + teacher enrollments
 * - computes ratios and shows cluster averages
 * - auto-fills learner count from STUDENT_PROGRAM enrollments for the selected school
 *
 * Notes:
 * - RESOURCE_PROGRAM_ID: your resources tracker program
 * - STUDENT_PROGRAM_ID: tracked entity program for students (enrollments)
 * - TEACHER_PROGRAM_ID: staff/tracked program (enrollments or events)
 */

export default function Analytics() {
  // ======= state =======
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [chartData, setChartData] = useState(null); // timeline of resources (per-month)
  const [clusterData, setClusterData] = useState(null); // cluster arrays used for averages/stddev
  const [learnerCount, setLearnerCount] = useState(0);
  const [teacherCount, setTeacherCount] = useState(0);
  const [openMetric, setOpenMetric] = useState(null); // which metric details are open

  // ======= config =======
  const RESOURCE_PROGRAM_ID = "uvpW17dnfUS"; // resources program (events)
  const STUDENT_PROGRAM_ID = "wQaiD2V27Dp"; // students tracked entity program (enrollments)
  const TEACHER_PROGRAM_ID = "rmuGQ7kBQBU"; // staff program (if you have it)

  const DATA_ELEMENTS = {
    TOILETS: "slYohGwjQme",
    SEATS: "fgUU2XNkGvI",
    BOOKS: "m9k3VefvGQw",
    CLASSROOMS: "mlbyc3CWNyb",
  };

  // thresholds from your input
  const STANDARDS = {
    toilets: { max: 100, label: "Toilet capacity", warning: "Limited sanitation capacity" },
    seats: { min: 1, label: "Seats per learner", warning: "Insufficient seating" },
    books: { min: 1, label: "Books per learner", warning: "Insufficient textbooks" },
    classrooms: { max: 100, label: "Learners per classroom", warning: "Classroom capacity" },
    teachers: { max: 100, label: "Learners per teacher", warning: "Teacher shortage" },
    students: { min: 0, label: "Total students", warning: "Student count unusually low" },
  };

  // ======= fetch list of schools (org units) =======
  useEffect(() => {
    const fetchSchools = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          "https://research.im.dhis2.org/in5320g20/api/organisationUnits?filter=level:eq:5&filter=parent.name:eq:Jambalaya%20Cluster&fields=id,name&pageSize=1000",
          {
            headers: { Authorization: "Basic " + btoa("admin:district") },
          }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const list = data.organisationUnits || [];
        setSchools(list);
        if (list.length > 0) setSelectedSchool(list[0].id);
      } catch (err) {
        setError("Failed to fetch schools: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSchools();
  }, []);

  // ======= when school changes, fetch everything =======
  useEffect(() => {
    if (selectedSchool) {
      fetchAllDataForSchool(selectedSchool);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSchool]);

  async function fetchAllDataForSchool(schoolId) {
    setLoading(true);
    setError(null);
    try {
      // parallel: events, students count, teacher count, cluster events
      const promises = [
        fetchResourceEvents(schoolId),
        fetchStudentCount(schoolId),
        fetchTeacherCount(schoolId),
        fetchClusterEvents(), // cluster-level events for comparisons
      ];

      const [eventsForSchool, students, teachers] = await Promise.all(promises.slice(0, 3));
      // cluster fetched separately inside fetchClusterEvents
      setLearnerCount(students);
      setTeacherCount(teachers);

      // process events and inject static student/teacher counts into each time entry
      processEvents(eventsForSchool, students, teachers);
      // cluster events processed inside fetchClusterEvents (setClusterData)
    } catch (err) {
      setError("Failed to fetch data: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // ======= fetch resource events for a single school =======
  async function fetchResourceEvents(schoolId) {
    const url = `https://research.im.dhis2.org/in5320g20/api/tracker/events.json?program=${RESOURCE_PROGRAM_ID}&orgUnit=${schoolId}&fields=*`;
    const res = await fetch(url, {
      headers: { Authorization: "Basic " + btoa("admin:district") },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch events (HTTP ${res.status})`);
    }
    const data = await res.json();
    return data.events || [];
  }

  // ======= fetch cluster events for all schools (used to compute cluster averages/stddev) =======
  async function fetchClusterEvents() {
    try {
      // avoid extra work if we don't have schools yet
      if (!schools || schools.length === 0) return setClusterData(null);

      const all = await Promise.all(
        schools.map(async (s) => {
          const url = `https://research.im.dhis2.org/in5320g20/api/tracker/events.json?program=${RESOURCE_PROGRAM_ID}&orgUnit=${s.id}&fields=*`;
          const res = await fetch(url, {
            headers: { Authorization: "Basic " + btoa("admin:district") },
          });
          if (!res.ok) return [];
          const data = await res.json();
          return data.events || [];
        })
      );

      const flattened = all.flat();
      // group cluster data by month and build arrays of values per dataKey
      const grouped = {};
      flattened.forEach((event) => {
        const eventDate = new Date(event.occurredAt || event.createdAt);
        const month = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, "0")}`;
        if (!grouped[month]) grouped[month] = { toilets: [], seats: [], books: [], classrooms: [] };

        event.dataValues?.forEach((dv) => {
          const v = parseInt(dv.value, 10) || 0;
          if (dv.dataElement === DATA_ELEMENTS.TOILETS) grouped[month].toilets.push(v);
          if (dv.dataElement === DATA_ELEMENTS.SEATS) grouped[month].seats.push(v);
          if (dv.dataElement === DATA_ELEMENTS.BOOKS) grouped[month].books.push(v);
          if (dv.dataElement === DATA_ELEMENTS.CLASSROOMS) grouped[month].classrooms.push(v);
        });
      });

      setClusterData(grouped);
    } catch (err) {
      console.error("Failed fetching cluster events:", err);
      setClusterData(null);
    }
  }

  // ======= fetch student count via enrollments for the student program =======
  // Each enrollment typically represents one tracked entity enrolled (a student).
  async function fetchStudentCount(schoolId) {
    try {
      const url = `https://research.im.dhis2.org/in5320g20/api/tracker/enrollments?program=${STUDENT_PROGRAM_ID}&orgUnit=${schoolId}&fields=id&paging=false`;
      const res = await fetch(url, { headers: { Authorization: "Basic " + btoa("admin:district") } });
      if (!res.ok) {
        // return 0 but log the error
        console.warn("fetchStudentCount response not ok:", res.status);
        return 0;
      }
      const data = await res.json();
      // enrollments array length is the student count
      return (data.enrollments || []).length;
    } catch (err) {
      console.error("Failed to fetch students:", err);
      return 0;
    }
  }

  // ======= fetch teacher count (use staff program enrollments or events) =======
  async function fetchTeacherCount(schoolId) {
    try {
      // try enrollments first
      const urlEnroll = `https://research.im.dhis2.org/in5320g20/api/tracker/enrollments?program=${TEACHER_PROGRAM_ID}&orgUnit=${schoolId}&fields=id&paging=false`;
      const resEnroll = await fetch(urlEnroll, { headers: { Authorization: "Basic " + btoa("admin:district") } });
      if (resEnroll.ok) {
        const data = await resEnroll.json();
        return (data.enrollments || []).length;
      }

      // fallback: try events count
      const urlEv = `https://research.im.dhis2.org/in5320g20/api/tracker/events.json?program=${TEACHER_PROGRAM_ID}&orgUnit=${schoolId}&fields=*`;
      const resEv = await fetch(urlEv, { headers: { Authorization: "Basic " + btoa("admin:district") } });
      if (!resEv.ok) return 0;
      const dataEv = await resEv.json();
      return (dataEv.events || []).length;
    } catch (err) {
      console.error("Failed to fetch teacher count:", err);
      return 0;
    }
  }

  // ======= process resource events into time series + inject student/teacher counts =======
  function processEvents(eventList, students = 0, teachers = 0) {
    // group latest event per month (taking latest date if multiple per month)
    const grouped = {};

    eventList.forEach((event) => {
      const eventDate = new Date(event.occurredAt || event.createdAt);
      const month = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, "0")}`;

      // keep only the most recent event for that month
      if (!grouped[month] || eventDate > grouped[month].date) {
        const resources = { toilets: 0, seats: 0, books: 0, classrooms: 0 };

        event.dataValues?.forEach((dv) => {
          const v = parseInt(dv.value, 10) || 0;
          if (dv.dataElement === DATA_ELEMENTS.TOILETS) resources.toilets = v;
          if (dv.dataElement === DATA_ELEMENTS.SEATS) resources.seats = v;
          if (dv.dataElement === DATA_ELEMENTS.BOOKS) resources.books = v;
          if (dv.dataElement === DATA_ELEMENTS.CLASSROOMS) resources.classrooms = v;
        });

        grouped[month] = { date: eventDate, ...resources };
      }
    });

    const months = Object.keys(grouped).sort();
    const processed = months.map((m) => ({
      month: m,
      toilets: grouped[m].toilets,
      seats: grouped[m].seats,
      books: grouped[m].books,
      classrooms: grouped[m].classrooms,
      students: students, // inject the latest student count for the school
      teachers: teachers, // inject teacher count
    }));

    setChartData(processed);
  }

  // ======= helpers: average, stddev, classify status =======
  const avg = (arr) => {
    if (!arr || arr.length === 0) return 0;
    const s = arr.reduce((a, b) => a + b, 0);
    return s / arr.length;
  };
  const stddev = (arr, mean) => {
    if (!arr || arr.length === 0) return 0;
    const sq = arr.map((v) => Math.pow(v - mean, 2));
    return Math.sqrt(avg(sq));
  };

  function classifyStatus(value, standard) {
    if (value === null || value === undefined) return { label: "No data", severity: "none" };

    if (standard.min !== undefined) {
      if (value < standard.min * 0.5) return { label: "Critical", severity: "critical" };
      if (value < standard.min) return { label: "Limited", severity: "limited" };
      return { label: "Adequate", severity: "adequate" };
    }
    if (standard.max !== undefined) {
      if (value > standard.max * 1.5) return { label: "Critical", severity: "critical" };
      if (value > standard.max) return { label: "Limited", severity: "limited" };
      return { label: "Adequate", severity: "adequate" };
    }
    return { label: "OK", severity: "adequate" };
  }

  // ======= chart config builder (uses raw values per metric) =======
  function createChartConfig(title, dataKey, color, standard) {
    if (!chartData || chartData.length === 0) return null;

    const categories = chartData.map((d) => d.month);
    const data = chartData.map((d) => d[dataKey] ?? 0);
    const latestValue = data[data.length - 1] ?? 0;

    // cluster stats per month (if available)
    const clusterAverages = [];
    const upperBands = [];
    const lowerBands = [];

    categories.forEach((month) => {
      if (clusterData && clusterData[month] && Array.isArray(clusterData[month][dataKey])) {
        const values = clusterData[month][dataKey];
        const a = avg(values);
        const sd = stddev(values, a);
        clusterAverages.push(parseFloat(a.toFixed(2)));
        upperBands.push(parseFloat((a + sd).toFixed(2)));
        lowerBands.push(parseFloat((a - sd).toFixed(2)));
      } else {
        const a = avg(data);
        clusterAverages.push(parseFloat(a.toFixed(2)));
        upperBands.push(parseFloat(a.toFixed(2)));
        lowerBands.push(parseFloat(a.toFixed(2)));
      }
    });

    // plotLines if standard defined
    const plotLines = [];
    if (standard?.min !== undefined) {
      plotLines.push({
        color: "#dc3545",
        dashStyle: "Dash",
        value: standard.min,
        width: 2,
        label: { text: "min", style: { color: "#dc3545", fontWeight: "bold" } },
      });
    }
    if (standard?.max !== undefined) {
      plotLines.push({
        color: "#dc3545",
        dashStyle: "Dash",
        value: standard.max,
        width: 2,
        label: { text: "max", style: { color: "#dc3545", fontWeight: "bold" } },
      });
    }

    return {
      chart: { type: "line", height: 260 },
      title: { text: title },
      xAxis: { categories },
      yAxis: { title: { text: "Value" }, plotLines },
      tooltip: { shared: true },
      credits: { enabled: false },
      series: [
        {
          name: title,
          data,
          color,
          marker: { radius: 4 },
          lineWidth: 2,
          zIndex: 3,
        },
        {
          name: "Avg across cluster",
          data: clusterAverages,
          color: "#2196f3",
          dashStyle: "Dash",
          lineWidth: 2,
          marker: { enabled: false },
          zIndex: 2,
        },
        {
          name: "±1 stddev",
          data: upperBands.map((upper, i) => [lowerBands[i], upper]),
          type: "arearange",
          lineWidth: 0,
          color: "#2196f3",
          fillOpacity: 0.12,
          zIndex: 1,
          marker: { enabled: false },
        },
      ],
    };
  }

  // ======= render small status row with icons =======
  function renderStatusRow(metric, value, standard, onOpen) {
    const status = classifyStatus(value, standard);
    const severity = status.severity;
    const icon =
      severity === "critical" ? (
        <IconWarningFilled24 style={{ color: "#f44336" }} />
      ) : severity === "limited" ? (
        <IconInfoFilled24 style={{ color: "#ff9800" }} />
      ) : (
        <IconCheckmarkCircle24 style={{ color: "#4caf50" }} />
      );

    return (
      <div
        key={metric}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px",
          borderBottom: "1px solid #eee",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36 }}>{icon}</div>
          <div>
            <div style={{ fontWeight: 600 }}>{metric}</div>
            <div style={{ color: "#666", fontSize: 13 }}>
              Latest value: <strong>{value ?? "No data"}</strong>
            </div>
          </div>
        </div>

        <div>
          <button
            onClick={onOpen}
            style={{
              background: "transparent",
              border: "none",
              color: "#1976d2",
              cursor: "pointer",
              padding: 6,
            }}
          >
            details ▾
          </button>
        </div>
      </div>
    );
  }

  // ======= derived values for UI =======
  const latest = chartData && chartData.length > 0 ? chartData[chartData.length - 1] : null;

  const metrics = latest
    ? [
        { key: "toilets", label: "Total Toilets", value: latest.toilets ?? 0, standard: STANDARDS.toilets, color: "#ff9800" },
        { key: "seats", label: "Total Seats", value: latest.seats ?? 0, standard: STANDARDS.seats, color: "#4caf50" },
        { key: "books", label: "Total Books", value: latest.books ?? 0, standard: STANDARDS.books, color: "#2196f3" },
        { key: "classrooms", label: "Total Classrooms", value: latest.classrooms ?? 0, standard: STANDARDS.classrooms, color: "#9c27b0" },
        { key: "students", label: "Total Students", value: latest.students ?? learnerCount, standard: STANDARDS.students, color: "#e91e63" },
        { key: "teachers", label: "Total Teachers", value: latest.teachers ?? teacherCount, standard: STANDARDS.teachers, color: "#ff5722" },
      ]
    : [];

  // If loading and nothing to show, show loader
  if (loading && !chartData) {
    return (
      <div style={{ padding: 40, display: "flex", justifyContent: "center" }}>
        <CircularLoader />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 20 }}>
        <NoticeBox error title="Error">
          {error}
        </NoticeBox>
      </div>
    );
  }

  const activeMetric = openMetric && metrics.find((m) => m.key === openMetric);
  const activeConfig = activeMetric ? createChartConfig(activeMetric.label, activeMetric.key, activeMetric.color, activeMetric.standard) : null;

  return (
    <div style={{ padding: 18, fontFamily: "Roboto, Arial, sans-serif" }}>
      <h2 style={{ marginTop: 0 }}>School Analytics</h2>
      <p style={{ color: "#555" }}>Jambalaya Cluster — resource & learner monitoring</p>

      {/* header: school selector + counts */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: "flex-start" }}>
        <div style={{ minWidth: 360 }}>
          <SingleSelectField
            label="Select school"
            selected={selectedSchool}
            onChange={({ selected }) => setSelectedSchool(selected)}
          >
            {schools.map((s) => (
              <SingleSelectOption key={s.id} value={s.id} label={s.name} />
            ))}
          </SingleSelectField>
        </div>

        <div style={{ flex: 1, padding: 12, background: "#fafafa", borderRadius: 6, border: "1px solid #eee" }}>
          <div style={{ marginBottom: 6 }}>Learners: <strong>{learnerCount}</strong></div>
          <div style={{ marginBottom: 6 }}>Teachers: <strong>{teacherCount}</strong></div>
          <div style={{ color: "#777", fontSize: 13 }}>Notes: student & teacher counts are taken from their respective programs (enrollments/events)</div>
        </div>
      </div>

      {/* STATUS LIST */}
      <Card style={{ marginBottom: 16 }}>
        {metrics.length === 0 ? (
          <div style={{ padding: 20 }}>No resource inspection events found for this school.</div>
        ) : (
          <>
            {metrics.map((m) =>
              renderStatusRow(
                m.label,
                m.value,
                m.standard,
                () => setOpenMetric(openMetric === m.key ? null : m.key)
              )
            )}
          </>
        )}
      </Card>

      {/* detail view */}
      {activeMetric && (
        <Card style={{ marginBottom: 16, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>{activeMetric.label}</strong>{" "}
              <span style={{ color: "#666" }}>Latest: {activeMetric.value ?? "No data"}</span>
            </div>

            <div>
              {activeMetric.standard?.min !== undefined && (
                <small style={{ color: "#666", marginRight: 8 }}>target ≥ {activeMetric.standard.min}</small>
              )}
              {activeMetric.standard?.max !== undefined && <small style={{ color: "#666" }}>target ≤ {activeMetric.standard.max}</small>}
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            {activeConfig ? (
              <HighchartsReact highcharts={Highcharts} options={activeConfig} />
            ) : (
              <div style={{ padding: 12 }}>Not enough data to render chart for this metric.</div>
            )}
          </div>
        </Card>
      )}

      {/* summary card */}
      {metrics.length > 0 && (
        <Card style={{ padding: 12 }}>
          <h4 style={{ marginTop: 0 }}>Summary</h4>
          <p style={{ marginTop: 0 }}>
            Latest values for <strong>{schools.find((s) => s.id === selectedSchool)?.name ?? "selected school"}</strong>.
          </p>
          <ul>
            {metrics.map((m) => {
              const s = classifyStatus(m.value, m.standard);
              return (
                <li key={m.key}>
                  {m.label}: <strong>{m.value}</strong> — {s.label}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
