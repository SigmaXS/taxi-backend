const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.post('/api/v2/yandex/overlay-route', (req, res) => {
    try {
        const { lat, lon, dest_lat, dest_lon, classes } = req.body;
        
        let distanceKm = 3.5; // дефолт, если координаты не долетели
        
        // Если телефон прислал реальные координаты точек А и Б
        if (lat && lon && dest_lat && dest_lon) {
            const R = 6371; // радиус Земли в км
            const dLat = (dest_lat - lat) * Math.PI / 180;
            const dLon = (dest_lon - lon) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(lat * Math.PI / 180) * Math.cos(dest_lat * Math.PI / 180) *
                      Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const straightKm = R * c;
            
            // Умножаем на коэффициент извилистости дорог Кишинёва (1.35)
            distanceKm = Math.round(straightKm * 1.35 * 10) / 10;
            if (distanceKm < 1.0) distanceKm = 1.2; // минимальная дистанция
        }

        const durationMin = Math.max(Math.ceil((distanceKm / 18) * 60), 3);
        const requestedClasses = classes || ["econom", "business", "comfortplus"];
        
        const tariffsResponse = [];

        requestedClasses.forEach(cls => {
            let startPrice = 35; // Посадка / минималка в Кишинёве
            let perKm = 4.0;
            
            if (cls.includes("comfort") || cls.includes("business")) {
                startPrice = 50;
                perKm = 5.5;
            }
            if (cls.includes("vip") || cls.includes("plus")) {
                startPrice = 70;
                perKm = 7.0;
            }

            let rawPrice = startPrice + (distanceKm * perKm) + (durationMin * 1.0);
            let price = Math.round(rawPrice);
            if (price < 45) price = 45; // Минимальная стоимость поездки

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