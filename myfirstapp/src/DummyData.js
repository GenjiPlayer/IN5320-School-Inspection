// ========== GENERATE MONTHLY DATA ==========
export const generateMonthlyData = (baseData, trend) => {
    const months = [
        "2024-01", "2024-02", "2024-03", "2024-04", "2024-05", "2024-06",
        "2024-07", "2024-08", "2024-09", "2024-10", "2024-11", "2024-12", "2025-01"
    ];

    return months.map((month, index) => {
        const progress = index / 12; // 0 to 1 over the year

        return {
            occurredAt: month,
            dataValues: [
                { dataElement: "learners", value: String(Math.round(baseData.learners + (trend.learners * progress))) },
                { dataElement: "teachers", value: String(Math.round(baseData.teachers + (trend.teachers * progress))) },
                { dataElement: "classrooms", value: String(Math.round(baseData.classrooms + (trend.classrooms * progress))) },
                { dataElement: "seats", value: String(Math.round(baseData.seats + (trend.seats * progress))) },
                { dataElement: "textbooks", value: String(Math.round(baseData.textbooks + (trend.textbooks * progress))) },
                { dataElement: "boysEnrolled", value: String(Math.round(baseData.boys + (trend.boys * progress))) },
                { dataElement: "girlsEnrolled", value: String(Math.round(baseData.girls + (trend.girls * progress))) },
                { dataElement: "toilets", value: String(Math.round(baseData.toilets + (trend.toilets * progress))) },
                { dataElement: "electricity", value: index >= (trend.electricityMonth || 0) ? "yes" : "no" },
                { dataElement: "handwashing", value: index >= (trend.handwashingMonth || 0) ? "yes" : "no" },
                { dataElement: "computerLab", value: index >= (trend.computerLabMonth || 0) ? "yes" : "no" },
            ],
        };
    });
};

// ========== DUMMY CLUSTER DATA ==========
// Jambalaya: Well-performing cluster with steady improvements (monthly data Jan 2024 - Jan 2025)
// Pepper: Struggling cluster with resource challenges (monthly data Jan 2024 - Jan 2025)
// Real school IDs and names from the Jambalaya Cluster API
export const DUMMY_CLUSTER_DATA = {
    "Jambalaya Cluster": {
        schools: [
            {
                id: "f4Wd4p2XTPy",
                name: "Greenfield Primary School",
                events: generateMonthlyData(
                    {
                        learners: 450,
                        teachers: 15,
                        classrooms: 12,
                        seats: 380,      // Starting with shortage (0.84:1)
                        textbooks: 360,  // Starting with shortage (0.80:1)
                        boys: 230,
                        girls: 220,
                        toilets: 18
                    },
                    {
                        learners: -30,
                        teachers: 3,
                        classrooms: 2,
                        seats: 70,       // Gradual improvement to 1:1 ratio
                        textbooks: 90,   // Gradual improvement to 1:1 ratio
                        boys: -20,
                        girls: -10,
                        toilets: 4,
                        electricityMonth: 0,
                        handwashingMonth: 0,
                        computerLabMonth: 6
                    }
                ),
            },
            {
                id: "TA9hturJ5De",
                name: "Riverside Secondary School",
                events: generateMonthlyData(
                    {
                        learners: 520,
                        teachers: 16,
                        classrooms: 14,
                        seats: 460,      // Starting below 1:1 (0.88:1)
                        textbooks: 440,  // Starting below 1:1 (0.85:1)
                        boys: 260,
                        girls: 260,
                        toilets: 20
                    },
                    {
                        learners: -40,
                        teachers: 4,
                        classrooms: 2,
                        seats: 60,       // Improving to 1.08:1 by end
                        textbooks: 80,   // Improving to 1.08:1 by end
                        boys: -25,
                        girls: -15,
                        toilets: 4,
                        electricityMonth: 0,
                        handwashingMonth: 0,
                        computerLabMonth: 0
                    }
                ),
            },
            {
                id: "IYZqNTMjnYK",
                name: "Mountain View Academy",
                events: generateMonthlyData(
                    {
                        learners: 380,
                        teachers: 12,
                        classrooms: 10,
                        seats: 320,      // Starting below (0.84:1)
                        textbooks: 300,  // Starting below (0.79:1)
                        boys: 200,
                        girls: 180,
                        toilets: 14
                    },
                    {
                        learners: -20,
                        teachers: 2,
                        classrooms: 2,
                        seats: 60,       // Improving to 1.06:1
                        textbooks: 80,   // Improving to 1.06:1
                        boys: -20,
                        girls: 0,
                        toilets: 4,
                        electricityMonth: 0,
                        handwashingMonth: 0,
                        computerLabMonth: 8
                    }
                ),
            },
        ],
    },
    "Pepper Cluster": {
        schools: [
            {
                id: "pepperSchool1",
                name: "Valley Elementary",
                events: generateMonthlyData(
                    {
                        learners: 680,
                        teachers: 10,
                        classrooms: 11,
                        seats: 380,      // Severe shortage (0.56:1)
                        textbooks: 320,  // Severe shortage (0.47:1)
                        boys: 380,
                        girls: 300,
                        toilets: 8
                    },
                    {
                        learners: -20,
                        teachers: 2,
                        classrooms: 1,
                        seats: 120,      // Slight improvement but still below (0.76:1 by end)
                        textbooks: 140,  // Slight improvement but still below (0.70:1 by end)
                        boys: -20,
                        girls: 0,
                        toilets: 2,
                        electricityMonth: 10,
                        handwashingMonth: 5,
                        computerLabMonth: 999
                    }
                ),
            },
            {
                id: "pepperSchool2",
                name: "Hillside Community School",
                events: generateMonthlyData(
                    {
                        learners: 550,
                        teachers: 8,
                        classrooms: 9,
                        seats: 280,      // Severe shortage (0.51:1)
                        textbooks: 240,  // Severe shortage (0.44:1)
                        boys: 300,
                        girls: 250,
                        toilets: 6
                    },
                    {
                        learners: -20,
                        teachers: 2,
                        classrooms: 1,
                        seats: 130,      // Improvement to 0.77:1
                        textbooks: 130,  // Improvement to 0.70:1
                        boys: -10,
                        girls: -10,
                        toilets: 2,
                        electricityMonth: 10,
                        handwashingMonth: 5,
                        computerLabMonth: 999
                    }
                ),
            },
        ],
    },
};
