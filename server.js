const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Базовые тарифы для Кишинёва
const TARIFFS = {
    econom: { base: 30, perKm: 4.0, perMin: 1.2 },
    comfort: { base: 45, perKm: 5.5, perMin: 1.5 },
    comfortplus: { base: 65, perKm: 7.0, perMin: 2.0 }
};

app.post('/api/v2/yandex/overlay-route', (req, res) => {
    try {
        const { lat, lon, dest_lat, dest_lon, city, classes } = req.body;
        
        // Упрощенный расчет расстояния по формуле гаверсинусов (можно заменить на гео-базу)
        let distanceKm = 4.0; // средняя по Кишинёву по умолчанию
        if (lat && lon && dest_lat && dest_lon) {
            const R = 6371;
            const dLat = (dest_lat - lat) * Math.PI / 180;
            const dLon = (dest_lon - lon) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(lat * Math.PI / 180) * Math.cos(dest_lat * Math.PI / 180) *
                      Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const straight = R * c;
            distanceKm = Math.max(Math.round(straight * 1.35 * 10) / 10, 2.0);
        }

        const durationMin = Math.max(Math.ceil((distanceKm / 20) * 60), 3);
        const requestedClasses = classes || ["econom", "business", "comfortplus", "vip"];
        
        const tariffsResponse = [];

        requestedClasses.forEach(cls => {
            let key = "econom";
            if (cls.includes("comfort") || cls.includes("business")) key = "comfort";
            if (cls.includes("vip") || cls.includes("plus")) key = "comfortplus";

            const t = TARIFFS[key] || TARIFFS.econom;
            const rawPrice = t.base + ((distanceKm - 2) * t.perKm) + (durationMin * t.perMin);
            const price = Math.round(rawPrice);

            tariffsResponse.push({
                class_: cls,
                yandex_price: `${price} L`,
                distance_text: `${distanceKm} км`,
                time_text: `${durationMin} мин`,
                price_per_km_text: `${Math.round(t.perKm)} L/км`
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
    console.log(`Taxi Radar Backend running on port ${PORT}`);
});