// File path: /api/sendMessage.ts
import { GoogleSpreadsheet } from 'google-spreadsheet';

// Helper to format numbers as RUB currency
const formatCurrency = (value: number) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(value);

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    const formData = request.body;
    if (!formData.name || !formData.phone) {
        return response.status(400).json({ message: 'Имя и телефон обязательны для заполнения.' });
    }

    // --- Task 1: Send notification to Telegram ---
    const sendTelegramMessage = async () => {
        const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;
        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            throw new Error("Telegram environment variables are not set.");
        }

        let message = `*Новая заявка с сайта!*\n\n*Имя:* ${formData.name}\n*Телефон:* ${formData.phone}`;

        if (formData.propertyPrice) {
            message += `\n\n*--- Расчет по ипотеке ---*\n`;
            message += `Стоимость: *${formatCurrency(formData.propertyPrice)}*\n`;
            message += `Первый взнос: *${formatCurrency(formData.downPayment)}*\n`;
            message += `Ежемесячный платеж: *${formatCurrency(formData.monthlyPayment)}*\n`;
            message += `Ставка: *${formData.interestRate}%*\n`;
            if (formData.quickDealDiscount) {
                message += `*🔥 Активирована скидка за быструю сделку! (-100 000 руб)*\n`;
            }
            message += `\n*--- Пожелания клиента ---*\n`;
            message += `Кол-во комнат: *${formData.rooms || 'Не указано'}*\n`;
            message += `Приоритет: *${formData.priority || 'Не указано'}*\n`;
        }

        const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const telegramResponse = await fetch(telegramApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'Markdown',
            }),
        });

        if (!telegramResponse.ok) {
            const data = await telegramResponse.json();
            console.error('Telegram API Error:', data);
            throw new Error(`Ошибка API Telegram: ${data.description || 'Неизвестная ошибка'}`);
        }
    };

    // --- Task 2: Add data to Google Sheet (optional) ---
    const appendToGoogleSheet = async () => {
        const { GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;
        if (!GOOGLE_SHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
            console.log("Google Sheets env variables not found. Skipping.");
            return; // Gracefully skip if not configured
        }
        
        try {
            const doc = new GoogleSpreadsheet(GOOGLE_SHEET_ID);
            await doc.useServiceAccountAuth({
                client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            });

            await doc.loadInfo();
            const sheet = doc.sheetsByIndex[0];

            const headerValues = [ 'Дата', 'Имя', 'Телефон', 'Стоимость', 'Первый взнос', 'Платеж/мес', 'Ставка %', 'Скидка за сделку', 'Комнаты', 'Приоритет' ];
            
            await sheet.loadHeaderRow();
            if (JSON.stringify(sheet.headerValues) !== JSON.stringify(headerValues)) {
                 await sheet.setHeaderRow(headerValues);
            }

            await sheet.addRow({
                'Дата': new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }),
                'Имя': formData.name,
                'Телефон': formData.phone,
                'Стоимость': formData.propertyPrice ? formatCurrency(formData.propertyPrice) : '',
                'Первый взнос': formData.downPayment ? formatCurrency(formData.downPayment) : '',
                'Платеж/мес': formData.monthlyPayment ? formatCurrency(formData.monthlyPayment) : '',
                'Ставка %': formData.interestRate || '',
                'Скидка за сделку': formData.quickDealDiscount ? 'Да' : '',
                'Комнаты': formData.rooms || '',
                'Приоритет': formData.priority || '',
            });
        } catch (error) {
             // Log the error but don't fail the entire request, as Telegram is primary.
             console.error("Could not append to Google Sheet:", error);
        }
    };

    // --- Execute tasks and respond ---
    try {
        // We run them sequentially to ensure Telegram is attempted first, but can be parallel
        await sendTelegramMessage();
        await appendToGoogleSheet();

        return response.status(200).json({ success: true });

    } catch (error) {
        console.error('Error sending message:', error);
        return response.status(500).json({ message: error.message || 'Не удалось отправить сообщение.' });
    }
}
