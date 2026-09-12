const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

async function getCoordinates(address) {
    try {
        if (!address) return null;
        const clean = address.split('/')[0].trim();
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(clean + ", Кишинёв, Молдова")}&format=json&limit=1`;
        const response = await fetch(url, { headers: { 'User-Agent': 'TaxiRadar/1.0' } });
        const data = await response.json();
        if (data && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
        }
    } catch (e) {}
    return null;
}

app.post('/api/v2/yandex/overlay-route', async (req, res) => {
    try {
        const { pickup_address, destination_address, classes } = req.body;
        
        console.log("Маршрут от:", pickup_address, "до:", destination_address);

        let distanceKm = 4.0; // Дефолт на случай ошибки геокодера
        let durationMin = 12;

        const coordsA = await getCoordinates(pickup_address);
        const coordsB = await getCoordinates(destination_address);

        if (coordsA && coordsB) {
            try {
                const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsA.lon},${coordsA.lat};${coordsB.lon},${coordsB.lat}?overview=false`;
                const response = await fetch(osrmUrl);
                const data = await response.json();
                
                if (data.routes && data.routes.length > 0) {
                    distanceKm = Math.round((data.routes[0].distance / 1000) * 10) / 10;
                    durationMin = Math.ceil(data.routes[0].duration / 60);
                }
            } catch (err) {}
        }

        const requestedClasses = classes || ["econom", "business", "comfortplus"];
        const tariffsResponse = [];

        requestedClasses.forEach(cls => {
            let startPrice = 35;
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
            if (price < 45) price = 45;

            tariffsResponse.push({
                class_: cls,
                yandex_price: `${price} L`,
                distance_text: `${distanceKm} км`,
                time_text: `${durationMin} мин`,
                price_per_km_text: `${Math.round(perKm)} L/км`
            });
        });

        res.json({ status: "success", tariffs: tariffsResponse });
    } catch (e) {
        res.status(500).json({ status: "error", message: e.message });
    }
});

app.listen(PORT, () => console.log(`Server on port ${PORT}`));