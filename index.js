const TelegramBot = require('node-telegram-bot-api');
const schedule = require('node-schedule');
const fs = require('fs');

const TOKEN = '7919443932:AAHi5pdtfGViGxsaZni0oIgL04iqsJNXUqc';
const bot = new TelegramBot(TOKEN, { polling: true });

const ADMIN_CHAT_IDS = ['1091383569', '234526643'];
const ordersFilePath = './orders.json';

const scheduleData = {
    'Понедельник': {
        "Ногинск → Horseka": ['07:00', '09:00'],
        "Horseka → Ногинск": ['08:15', '18:20 (с заездом в ЧГ)', '21:10 (до Дикси, Заречье)', '22:20']
    },
    'Вторник': {
        "Ногинск → Horseka": ['07:00', '09:00'],
        "Horseka → Ногинск": ['08:15', '18:20 (с заездом в ЧГ)', '21:10 (до Дикси, Заречье)', '22:20']
    },
    'Среда': {
        "Ногинск → Horseka": ['07:00', '09:00'],
        "Horseka → Ногинск": ['08:15', '18:20 (с заездом в ЧГ)', '21:10 (до Дикси, Заречье)', '22:20']
    },
    'Четверг': {
        "Ногинск → Horseka": ['07:00', '09:00'],
        "Horseka → Ногинск": ['08:15', '18:20 (с заездом в ЧГ)', '21:10 (до Дикси, Заречье)', '22:20']
    },
    'Пятница': {
        "Ногинск → Horseka": ['07:00', '09:00'],
        "Horseka → Ногинск": ['08:15', '18:20 (с заездом в ЧГ)', '21:10', '23:20']
    },
    'Суббота': {
        "Ногинск → Horseka": ['07:00', '09:00'],
        "Horseka → Ногинск": ['08:15', '18:20 (с заездом в ЧГ)', '21:10', '23:20']
    },
    'Воскресенье': {
        "Ногинск → Horseka": ['07:00', '09:00'],
        "Horseka → Ногинск": ['08:15', '18:20 (с заездом в ЧГ)', '21:10 (до Дикси, Заречье)', '22:20']
    }
};
function getDayAndDate(dayOfWeek) {
    const today = new Date();
    const daysOfWeek = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];

    const currentDayOfWeek = daysOfWeek[today.getDay()];
    const targetDayIndex = daysOfWeek.indexOf(dayOfWeek);
    const currentDayIndex = daysOfWeek.indexOf(currentDayOfWeek);

    let daysUntilTrip = targetDayIndex - currentDayIndex;
    if (daysUntilTrip < 0) daysUntilTrip += 7; 

    const tripDate = new Date();
    tripDate.setDate(today.getDate() + daysUntilTrip);

    return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }).format(tripDate);
}
function loadOrders() {
    try {
        return JSON.parse(fs.readFileSync(ordersFilePath, 'utf8')) || [];
    } catch (err) {
        return [];
    }
}

function saveOrders(orders) {
    fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2), 'utf8');
}


let orders = loadOrders();
let userState = {};


function sendTomorrowOrdersToAdmin() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toLocaleDateString('ru-RU');

    const ordersForTomorrow = orders.filter(order => order.date === tomorrowDate);

    const message = ordersForTomorrow.length
        ? `Заказы на завтра (${tomorrowDate}):\n\n` + ordersForTomorrow.map(order => `${order.user} - ${order.route} - ${order.time}`).join('\n')
        : 'На завтра заказов нет.';

    ADMIN_CHAT_IDS.forEach(adminId => {
        bot.sendMessage(adminId, message);
    });
}

function sendAllOrdersToAdmin() {
    if (orders.length === 0) {
        ADMIN_CHAT_IDS.forEach(adminId => {
            bot.sendMessage(adminId, 'На этой неделе заказов нет.');
        });
        return;
    }


    orders.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (dateA.getTime() === dateB.getTime()) {
     
            const timeA = a.time.split(':').map(Number);
            const timeB = b.time.split(':').map(Number);
            return timeA[0] - timeB[0] || timeA[1] - timeB[1];
        }
        return dateA - dateB;
    });

    const groupedOrders = orders.reduce((acc, order) => {
        if (!acc[order.date]) acc[order.date] = [];
        acc[order.date].push(`${order.user} - ${order.route} - ${order.time}`);
        return acc;
    }, {});

    let message = 'Все заказы на неделю:\n\n';
    for (const [date, orderList] of Object.entries(groupedOrders)) {
        message += `📅 ${date}:\n${orderList.join('\n')}\n\n`;
    }

    ADMIN_CHAT_IDS.forEach(adminId => {
        bot.sendMessage(adminId, message);
    });
}


schedule.scheduleJob('0 22 * * *', sendTomorrowOrdersToAdmin);


bot.onText(/\/start/, (msg) => {
    userState[msg.chat.id] = { step: 'selecting_day' };

    bot.sendMessage(msg.chat.id, 'Выберите день недели:', {
        reply_markup: {
            keyboard: Object.keys(scheduleData).map(day => [day]),
            resize_keyboard: true
        }
    });
});

bot.onText(/\/admin/, (msg) => {
    if (ADMIN_CHAT_IDS.includes(msg.chat.id.toString())) {
        sendTomorrowOrdersToAdmin();
    } else {
        bot.sendMessage(msg.chat.id, 'У вас нет доступа к этому разделу.');
    }
});

bot.onText(/\/all/, (msg) => {
    if (ADMIN_CHAT_IDS.includes(msg.chat.id.toString())) {
        sendAllOrdersToAdmin();
    } else {
        bot.sendMessage(msg.chat.id, 'У вас нет доступа к этому разделу.');
    }
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
console.log(chatId);

    if (text.startsWith('/')) return;

    const user = userState[chatId] || {};
    
    if (user.step === 'selecting_day' && scheduleData[text]) {
        userState[chatId] = { step: 'selecting_direction', day: text };
        bot.sendMessage(chatId, `Выберите направление на ${text}:`, {
            reply_markup: {
                keyboard: Object.keys(scheduleData[text]).map(direction => [direction]),
                resize_keyboard: true
            }
        });
    } else if (user.step === 'selecting_direction' && scheduleData[user.day]?.[text]) {
        userState[chatId] = { step: 'selecting_time', day: user.day, direction: text };
        bot.sendMessage(chatId, `Выберите время рейса ${text} на ${user.day}:`, {
            reply_markup: {
                keyboard: scheduleData[user.day][text].map(time => [time]),
                resize_keyboard: true
            }
        });
    } else if (user.step === 'selecting_time' && Object.values(scheduleData[user.day]).flat().includes(text)) {
       
        const formattedDate = getDayAndDate(user.day);

        orders.push({ user: msg.from.username || msg.from.first_name, route: user.direction, time: text, date: formattedDate });
        saveOrders(orders);

        bot.sendMessage(chatId, `Ваш заказ на ${user.direction} (${text}) на ${formattedDate} принят. Для создания новой заявки пропишите - /start`, {
            reply_markup: { keyboard: [['Да', 'Нет']], resize_keyboard: true }
        });

        userState[chatId] = { step: 'repeat_order' };
    } else if (user.step === 'repeat_order') {
        if (text === 'Да') {
            userState[chatId] = { step: 'selecting_day' };
            bot.sendMessage(chatId, 'Выберите день недели:', {
                reply_markup: { keyboard: Object.keys(scheduleData).map(day => [day]), resize_keyboard: true }
            });
        } else {
            bot.sendMessage(chatId, 'Спасибо! Если хотите создать новую заявку, нажмите /start.');
            delete userState[chatId];
        }
    } 
});


bot.on('polling_error', (error) => console.error('Polling error:', error));