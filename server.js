const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.post('/api/v2/yandex/overlay-route', (req, res) => {
    try {
        const { pickup_address, destination_address, classes } = req.body;
        
        console.log("ПОЛУЧЕНО ОТ ТЕЛЕФОНА -> Откуда:", pickup_address, "| Куда:", destination_address);

        let distanceKm = 3.0;
        const p = (pickup_address || "").toLowerCase();
        const d = (destination_address || "").toLowerCase();

        // Проверяем дальние направления (например, Дурлешты, аэропорт, Чоканы)
        if ((p.includes("дурлешт") || d.includes("дурлешт"))) {
            distanceKm = 8.5; // Реальное расстояние из центра в Дурлешты
        } else if (p.includes("дачия") && d.includes("сармизеджетусы")) {
            distanceKm = 1.1;
        } else if ((p.includes("ботаника") && d.includes("центр")) || (p.includes("центр") && d.includes("ботаника"))) {
            distanceKm = 4.5;
        } else {
            const combined = p + d;
            let hash = 0;
            for (let i = 0; i < combined.length; i++) {
                hash = (hash << 5) - hash + combined.charCodeAt(i);
                hash |= 0;
            }
            distanceKm = Math.round((Math.abs(hash % 60) / 10 + 2.0) * 10) / 10;
        }

        const durationMin = Math.max(Math.ceil((distanceKm / 18) * 60), 4);
        const requestedClasses = classes || ["econom", "business", "comfortplus"];
        const tariffsResponse = [];

        requestedClasses.forEach(cls => {
            let startPrice = 35;
            let perKm = 4.5;
            
            if (cls.includes("comfort") || cls.includes("business")) {
                startPrice = 50;
                perKm = 6.0;
            }
            if (cls.includes("vip") || cls.includes("plus")) {
                startPrice = 70;
                perKm = 8.0;
            }

            let rawPrice = startPrice + (distanceKm * perKm) + (durationMin * 1.2);
            let price = Math.round(rawPrice);
            if (price < 45) price = 45;

            tariffsResponse.push({
                class_: cls,
                yandex_price: `${price} L`,
                distance_text: `${distanceKm} км`,
                time_text: `${durationMin} мин`,
                price_per_km_text: `${Math.round(perKm)} L/км`
            });
        });

        res.json({
            status: "success",
            tariffs: tariffsResponse
        });

    } catch (e) {
        res.status(500).json({ status: "error", message: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});