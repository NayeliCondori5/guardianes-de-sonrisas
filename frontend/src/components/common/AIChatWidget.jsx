import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Sparkles, AlertCircle, HelpCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const AIChatWidget = () => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState('demo'); // 'demo' o 'ai'
    const messagesEndRef = useRef(null);

    // Inicializar el mensaje de bienvenida personalizado por rol
    useEffect(() => {
        let greeting = '¡Hola! 🧸 Bienvenido a **Guardianes de Sonrisas**. Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?';
        
        if (user) {
            if (user.role === 'parent') {
                greeting = `¡Hola, **${user.full_name}**! 🧸 Soy tu asistente virtual. Te puedo ayudar a:\n\n- Recomendarte niñeras y cuidadores en tu ciudad.\n- Explicarte cómo realizar una reserva y adjuntar tu comprobante de pago.\n- Resolver dudas sobre tarifas y políticas de la plataforma.`;
            } else if (user.role === 'sitter') {
                greeting = `¡Hola, **${user.full_name}**! ✨ Soy tu asistente virtual para cuidadores. Te puedo ayudar a:\n\n- Cómo optimizar y completar tu perfil de cuidador.\n- Cargar tus certificaciones para ser verificado por el administrador.\n- Responder tus dudas sobre el cobro de tus servicios y reservas.`;
            } else if (user.role === 'admin') {
                greeting = `¡Hola, Administrador **${user.full_name}**! ⚡ Soy tu asistente virtual. Te puedo ayudar a consultar información sobre cuidadores, estado de reservas y administración del sitio.`;
            }
        } else {
            greeting = '¡Hola! 🧸 Bienvenido a **Guardianes de Sonrisas**. Soy tu asistente virtual.\n\n¿Quieres saber cómo funciona la plataforma para reservar una niñera, o te gustaría registrarte como cuidador? ¡Pregúntame lo que quieras!';
        }

        setMessages([
            { role: 'assistant', content: greeting }
        ]);
    }, [user]);

    // Desplazar automáticamente hacia el último mensaje
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, loading]);

    const handleSend = async (textToSend) => {
        const text = textToSend || input;
        if (!text.trim()) return;

        // Añadir mensaje del usuario
        const newMessages = [...messages, { role: 'user', content: text }];
        setMessages(newMessages);
        setInput('');
        setLoading(true);

        try {
            // Petición al backend
            const response = await api.post('/ai/chat', { messages: newMessages });
            
            if (response.data && response.data.success) {
                setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
                setMode(response.data.mode);
            } else {
                throw new Error('Respuesta inválida del servidor');
            }
        } catch (error) {
            console.error('Error in AI Chat Widget:', error);
            setMessages(prev => [
                ...prev, 
                { 
                    role: 'assistant', 
                    content: '⚠️ Lo siento, ocurrió un error al comunicarme con mi servicio de IA. Por favor, asegúrate de que el backend esté ejecutándose correctamente.' 
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    // Chips de sugerencia para los usuarios
    const getSuggestionChips = () => {
        if (!user) {
            return [
                '¿Cómo funciona la plataforma?',
                '¿Cómo me registro como cuidador?',
                '¿Cuáles son las tarifas promedio?'
            ];
        }
        if (user.role === 'parent') {
            return [
                'Recomiéndame niñeras en Madrid',
                '¿Cómo hago una reserva?',
                '¿Qué métodos de pago aceptan?'
            ];
        }
        return [
            '¿Cómo subo mis certificaciones?',
            '¿Cómo funciona el cobro?',
            '¿Cómo completo mi descripción?'
        ];
    };

    // Renderizado simple de negritas y listas en markdown básico
    const formatMessageContent = (content) => {
        return content.split('\n').map((line, idx) => {
            let rendered = line;
            
            // Negrita: **texto**
            const boldRegex = /\*\*(.*?)\*\*/g;
            rendered = rendered.replace(boldRegex, '<strong>$1</strong>');

            // Código en línea: `código`
            const codeRegex = /`(.*?)`/g;
            rendered = rendered.replace(codeRegex, '<code class="bg-gray-200 dark:bg-slate-700 px-1 rounded text-red-600 dark:text-red-300 font-mono text-sm">$1</code>');

            // Listas: - texto
            if (line.trim().startsWith('- ')) {
                return (
                    <li 
                        key={idx} 
                        className="ml-4 list-disc" 
                        dangerouslySetInnerHTML={{ __html: rendered.substring(2) }}
                    />
                );
            }
            
            return (
                <p 
                    key={idx} 
                    className={line.trim() === '' ? 'h-2' : 'mb-1'}
                    dangerouslySetInnerHTML={{ __html: rendered }}
                />
            );
        });
    };

    return (
        <>
            {/* Botón Flotante Redondeado */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-[#004477] to-[#05677d] text-white shadow-xl hover:scale-110 active:scale-95 cursor-pointer transition-all duration-300 group"
                    title="Asistente de IA"
                >
                    {/* Anillo de pulso/respiración */}
                    <span className="absolute inline-flex h-full w-full rounded-full bg-[#004477] opacity-45 animate-ping group-hover:animate-none"></span>
                    <Sparkles className="w-6 h-6 animate-pulse group-hover:scale-110 transition-transform duration-300" />
                </button>
            )}

            {/* Ventana de Chat Expandida */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] h-[550px] max-h-[calc(100vh-6rem)] bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border border-gray-200/50 dark:border-slate-800 shadow-2xl rounded-2xl flex flex-col transition-all duration-300 ease-out transform scale-100 origin-bottom-right">
                    
                    {/* Cabecera */}
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#004477] to-[#05677d] text-white rounded-t-2xl shadow-md">
                        <div className="flex items-center space-x-2.5">
                            <div className="p-1.5 bg-white/10 rounded-lg">
                                <Sparkles className="w-5 h-5 text-amber-300 animate-spin-slow" />
                            </div>
                            <div>
                                <h3 className="font-semibold font-display-lg text-sm tracking-wide">Asistente Guardianes</h3>
                                <div className="flex items-center space-x-1">
                                    <span className={`w-2 h-2 rounded-full ${mode === 'ai' ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`}></span>
                                    <span className="text-[10px] text-white/80 font-medium font-sans">
                                        {mode === 'ai' ? 'IA Conectada' : 'Modo Demo'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="p-1 bg-white/10 hover:bg-white/20 active:scale-90 rounded-full transition-all duration-200"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Banner de Advertencia de Modo Demo */}


                    {/* Mensajes */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-200">
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`p-3 max-w-[85%] rounded-2xl text-[13px] leading-relaxed shadow-sm font-sans ${
                                        msg.role === 'user'
                                            ? 'bg-gradient-to-br from-[#004477] to-[#05677d] text-white rounded-br-none'
                                            : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200 rounded-bl-none border border-gray-200/20'
                                    }`}
                                >
                                    {formatMessageContent(msg.content)}
                                </div>
                            </div>
                        ))}

                        {/* Indicador de carga / pensando */}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="flex space-x-1.5 p-3.5 bg-gray-100 dark:bg-slate-800 rounded-2xl rounded-bl-none border border-gray-200/20">
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Chips de Sugerencia */}
                    <div className="px-4 pb-2 pt-1 flex flex-wrap gap-1.5 overflow-x-auto select-none shrink-0 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
                        {getSuggestionChips().map((chip, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleSend(chip)}
                                disabled={loading}
                                className="text-[11px] font-sans font-medium px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-full text-gray-600 dark:text-gray-300 transition-all duration-200 shrink-0 shadow-sm active:scale-95 disabled:opacity-50"
                            >
                                {chip}
                            </button>
                        ))}
                    </div>

                    {/* Entrada de texto */}
                    <div className="p-3 border-t border-gray-200/50 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center space-x-2 rounded-b-2xl shrink-0">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyPress}
                            disabled={loading}
                            placeholder="Escribe tu mensaje..."
                            className="flex-1 bg-gray-50 dark:bg-slate-800/60 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl px-4 py-2 text-xs border border-gray-200/70 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-[#004477] transition-all font-sans disabled:opacity-60"
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={loading || !input.trim()}
                            className="p-2.5 bg-gradient-to-tr from-[#004477] to-[#05677d] hover:brightness-110 active:scale-95 text-white rounded-xl shadow-md transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>

                </div>
            )}
        </>
    );
};

export default AIChatWidget;
