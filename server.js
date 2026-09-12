const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.post('/api/v2/yandex/overlay-route', (req, res) => {
    try {
        const { pickup_address, destination_address, classes } = req.body;
        
        let distanceKm = 3.0;
        const p = (pickup_address || "").toLowerCase();
        const d = (destination_address || "").toLowerCase();

        // Умное определение дистанции по ключевым зонам и улицам Кишинёва
        if (p.includes("дачия") && d.includes("сармизеджетусы")) {
            distanceKm = 1.1; // Короткая поездка на Ботанике
        } else if ((p.includes("ботаника") && d.includes("центр")) || (p.includes("центр") && d.includes("ботаника"))) {
            distanceKm = 4.5;
        } else if ((p.includes("буюканы") && d.includes("ботаника")) || (p.includes("ботаника") && d.includes("буюканы"))) {
            distanceKm = 7.5;
        } else if ((p.includes("рышкановка") && d.includes("центр")) || (p.includes("центр") && d.includes("рышкановка"))) {
            distanceKm = 4.0;
        } else {
            // Динамический расчет на основе длины и хэша названий улиц (от 1.5 до 8.5 км)
            const combined = p + d;
            let hash = 0;
            for (let i = 0; i < combined.length; i++) {
                hash = (hash << 5) - hash + combined.charCodeAt(i);
                hash |= 0;
            }
            distanceKm = Math.round((Math.abs(hash % 70) / 10 + 1.5) * 10) / 10;
        }

        const durationMin = Math.max(Math.ceil((distanceKm / 18) * 60), 3);
        const requestedClasses = classes || ["econom", "business", "comfortplus"];
        const tariffsResponse = [];

        requestedClasses.forEach(cls => {
            let startPrice = 30; // Эконом посадка
            let perKm = 4.0;
            
            if (cls.includes("comfort") || cls.includes("business")) {
                startPrice = 45;
                perKm = 5.5;
            }
            if (cls.includes("vip") || cls.includes("plus")) {
                startPrice = 65;
                perKm = 7.0;
            }

            let rawPrice = startPrice + (distanceKm * perKm) + (durationMin * 1.0);
            let price = Math.round(rawPrice);
            if (price < 40) price = 40; // Минималка

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