const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.post('/api/v2/yandex/overlay-route', async (req, res) => {
    try {
        const { lat, lon, dest_lat, dest_lon, classes } = req.body;
        
        let distanceKm = 3.5;
        let durationMin = 10;

        // Если телефон передал координаты, запрашиваем реальный маршрут по дорогам Кишинёва через OSRM
        if (lat && lon && dest_lat && dest_lon) {
            try {
                const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${lon},${lat};${dest_lon},${dest_lat}?overview=false`;
                const response = await fetch(osrmUrl);
                const data = await response.json();
                
                if (data.routes && data.routes.length > 0) {
                    const route = data.routes[0];
                    distanceKm = Math.round((route.distance / 1000) * 10) / 10; // Переводим метры в километры
                    durationMin = Math.ceil(route.duration / 60); // Переводим секунды в минуты
                }
            } catch (err) {
                console.error("Ошибка построения маршрута по карте, используется фоллбэк:", err.message);
            }
        }

        const requestedClasses = classes || ["econom", "business", "comfortplus"];
        const tariffsResponse = [];

        requestedClasses.forEach(cls => {
            let startPrice = 35; // Базовая посадка в Кишинёве (лей)
            let perKm = 4.0;
            
            if (cls.includes("comfort") || cls.includes("business")) {
                startPrice = 50;
                perKm = 5.5;
            }
            if (cls.includes("vip") || cls.includes("plus")) {
                startPrice = 70;
                perKm = 7.0;
            }

            // Точная формула расчета стоимости поездки
            let rawPrice = startPrice + (distanceKm * perKm) + (durationMin * 1.0);
            let price = Math.round(rawPrice);
            if (price < 45) price = 45; // Жесткий порог минимальной стоимости в Кишинёве

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
    console.log(`Taxi Radar Backend running on port ${PORT}`);
});