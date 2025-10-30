
import React, { useState } from 'react';

const formatCurrency = (value: number) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(value);

const ROOM_OPTIONS = ["Студия", "1", "2", "3", "4+"];

// Объявляем глобальную функцию ym для TypeScript
declare global {
    interface Window {
        ym: (id: number, action: string, goalName: string) => void;
    }
}


interface ContactFormProps {
    showExtended: boolean;
    calculatorData?: {
        propertyPrice: number;
        downPayment: number;
        interestRate: number;
        monthlyPayment: number;
        quickDealDiscount: boolean;
    };
}

const ContactForm: React.FC<ContactFormProps> = ({ showExtended, calculatorData }) => {
    // Standard fields
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    
    // Extended fields
    const [rooms, setRooms] = useState('');
    const [priority, setPriority] = useState('');
    
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitError(null);

        const submissionData = {
            name,
            phone,
            rooms,
            priority,
            ...(showExtended && calculatorData ? calculatorData : {})
        };

        try {
            const response = await fetch('/api/sendMessage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(submissionData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Произошла ошибка при отправке.');
            }

            setSubmitted(true);
            
            // Отправляем событие в Яндекс.Метрику при успешной отправке
            if (typeof window.ym === 'function') {
                window.ym(97931388, 'reachGoal', 'FORM_SUBMIT_SUCCESS');
            }

        } catch (error: any) {
            console.error("Submit error:", error);
            setSubmitError('Не удалось отправить заявку. Пожалуйста, свяжитесь со мной напрямую или попробуйте позже.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section id="contact" className="py-24 bg-zinc-900">
            <div className="container mx-auto px-6">
                <div className="max-w-3xl mx-auto bg-zinc-800 rounded-2xl p-8 md:p-12 shadow-2xl border border-zinc-700 text-center animate-reveal anim-scale-in">
                    {submitted ? (
                        <div className="py-8">
                            <h3 className="text-3xl font-bold text-amber-400 mb-3">Спасибо!</h3>
                            <p className="text-gray-300">Ваша заявка принята. Я свяжусь с вами в ближайшее время!</p>
                        </div>
                    ) : (
                        <>
                            {showExtended && calculatorData ? (
                                <>
                                    <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">Завершите ваш запрос</h2>
                                    <p className="text-base sm:text-lg text-gray-400 mb-8">
                                        Мы уже знаем ваши финансовые параметры. Уточните детали, и я подберу идеальные варианты.
                                    </p>
                                    <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-4 mb-6 text-left grid grid-cols-2 gap-4 text-sm">
                                        <div><span className="text-gray-400">Стоимость:</span> <strong className="block text-white">{formatCurrency(calculatorData.propertyPrice)}</strong></div>
                                        <div><span className="text-gray-400">Первый взнос:</span> <strong className="block text-white">{formatCurrency(calculatorData.downPayment)}</strong></div>
                                        <div><span className="text-gray-400">Платеж в месяц:</span> <strong className="block text-white">{formatCurrency(calculatorData.monthlyPayment)}</strong></div>
                                        <div><span className="text-gray-400">Ставка:</span> <strong className="block text-white">{calculatorData.interestRate}%</strong></div>
                                    </div>
                                    {calculatorData.quickDealDiscount && (
                                        <div className="bg-amber-500/10 border border-amber-500 text-amber-400 rounded-lg p-4 mb-8 text-center">
                                            <p className="font-bold text-lg">У НАС СРОЧНЫЙ ПОКУПАТЕЛЬ!!!</p>
                                            <p>Активирована персональная скидка -100 000 рублей.</p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">Готовы сделать первый шаг?</h2>
                                    <p className="text-base sm:text-lg text-gray-400 mb-8">
                                        Оставьте контакты, и я подготовлю для вас персональную подборку лучших новостроек Тюмени. Это бесплатно и ни к чему не обязывает.
                                    </p>
                                </>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto text-left">
                                {showExtended && (
                                    <>
                                        <div>
                                            <label className="block font-semibold text-gray-300 mb-3 text-center">Количество комнат</label>
                                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                                {ROOM_OPTIONS.map(opt => (
                                                    <button type="button" key={opt} onClick={() => setRooms(opt)} className={`px-2 py-2 rounded-lg transition-colors duration-200 font-semibold ${rooms === opt ? 'bg-amber-500 text-gray-900' : 'bg-zinc-700 hover:bg-zinc-600 text-white'}`}>
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label htmlFor="priority" className="block font-semibold text-gray-300 mb-2 text-center">Что является приоритетным?</label>
                                            <input
                                                type="text"
                                                id="priority"
                                                value={priority}
                                                onChange={(e) => setPriority(e.target.value)}
                                                className="w-full px-4 py-3 bg-zinc-700 border border-zinc-600 text-white rounded-lg focus:ring-amber-500 focus:border-amber-500 transition placeholder-gray-400"
                                                placeholder="Школа, Детский сад, Район,"
                                            />
                                        </div>
                                    </>
                                )}
                                <div>
                                    <label htmlFor="name" className="sr-only">Ваше имя</label>
                                    <input
                                        type="text"
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 bg-zinc-700 border border-zinc-600 text-white rounded-lg focus:ring-amber-500 focus:border-amber-500 transition placeholder-gray-400"
                                        placeholder="Ваше имя"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="phone" className="sr-only">Номер телефона</label>
                                    <input
                                        type="tel"
                                        id="phone"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 bg-zinc-700 border border-zinc-600 text-white rounded-lg focus:ring-amber-500 focus:border-amber-500 transition placeholder-gray-400"
                                        placeholder="+7 (___) ___-__-__"
                                    />
                                </div>
                                <div>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full py-3 px-4 rounded-full text-lg font-semibold text-gray-900 bg-amber-500 hover:bg-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-500/30 transition-all duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? 'Отправка...' : (showExtended ? 'Отправить и получить подборку' : 'Получить подборку')}
                                    </button>
                                </div>
                                {submitError && (
                                    <p className="text-sm text-red-400 mt-4 text-center bg-red-900/20 p-3 rounded-lg">
                                        {submitError}
                                    </p>
                                )}
                            </form>
                            <p className="text-xs text-gray-500 mt-6 text-center">
                                Нажимая кнопку, вы соглашаетесь с политикой конфиденциальности.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
};

export default ContactForm;
