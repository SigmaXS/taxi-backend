const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Функция точного геокодирования адреса через OpenStreetMap для Кишинёва
async function getCoordinatesFromAddress(address) {
    try {
        if (!address) return null;
        const clean = address.split('/')[0].trim();
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(clean + ", Кишинёв, Молдова")}&format=json&limit=1`;
        
        const response = await fetch(url, {
            headers: { 'User-Agent': 'TaxiRadarBackend/1.0' }
        });
        const data = await response.json();
        
        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lon: parseFloat(data[0].lon)
            };
        }
    } catch (e) {
        console.error("Ошибка геокодирования:", e.message);
    }
    return null;
}

app.post('/api/v2/yandex/overlay-route', async (req, res) => {
    try {
        let { lat, lon, dest_lat, dest_lon, pickup_address, destination_address, classes } = req.body;
        
        // Если телефон не прислал координаты, сервер сам находит их по текстам адресов
        if ((!lat || !lon) && pickup_address) {
            const coordsA = await getCoordinatesFromAddress(pickup_address);
            if (coordsA) { lat = coordsA.lat; lon = coordsA.lon; }
        }
        if ((!dest_lat || !dest_lon) && destination_address) {
            const coordsB = await getCoordinatesFromAddress(destination_address);
            if (coordsB) { dest_lat = coordsB.lat; dest_lon = coordsB.lon; }
        }

        let distanceKm = 2.0;
        let durationMin = 5;

        // Если есть обе точки, запрашиваем реальный маршрут по дорогам через OSRM
        if (lat && lon && dest_lat && dest_lon) {
            try {
                const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${lon},${lat};${dest_lon},${dest_lat}?overview=false`;
                const response = await fetch(osrmUrl);
                const data = await response.json();
                
                if (data.routes && data.routes.length > 0) {
                    const route = data.routes[0];
                    distanceKm = Math.round((route.distance / 1000) * 10) / 10;
                    durationMin = Math.ceil(route.duration / 60);
                }
            } catch (err) {
                console.error("Ошибка OSRM маршрута:", err.message);
            }
        }

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
            if (price < 45) price = 45; // Защита минимальной стоимости

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