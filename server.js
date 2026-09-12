const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.post('/api/v2/yandex/overlay-route', (req, res) => {
    try {
        const { pickup_address, destination_address, classes } = req.body;
        
        // Базовый расчет расстояния в зависимости от длины названий улиц (заглушка умнее: от 2.5 до 9 км)
        let distanceKm = 3.5;
        const pLen = (pickup_address || "").length;
        const dLen = (destination_address || "").length;
        if (pLen > 0 && dLen > 0) {
            // Примерная оценка расстояния по городу на основе хэша строк
            distanceKm = Math.min(Math.max(((pLen + dLen) % 7) + 2.0, 2.5), 9.0);
            distanceKm = Math.round(distanceKm * 10) / 10;
        }

        const durationMin = Math.max(Math.ceil((distanceKm / 18) * 60), 4);
        const requestedClasses = classes || ["econom", "business", "comfortplus"];
        
        const tariffsResponse = [];

        requestedClasses.forEach(cls => {
            // Базовые тарифы для Кишинёва
            let startPrice = 30; // Эконом
            let perKm = 4.0;
            
            if (cls.includes("comfort") || cls.includes("business")) {
                startPrice = 45;
                perKm = 5.5;
            }
            if (cls.includes("vip") || cls.includes("plus")) {
                startPrice = 65;
                perKm = 7.0;
            }

            const rawPrice = startPrice + ((distanceKm - 2) > 0 ? (distanceKm - 2) * perKm : 0) + (durationMin * 1.2);
            const price = Math.round(rawPrice);

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