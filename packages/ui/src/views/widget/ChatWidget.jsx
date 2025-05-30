import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import './ChatWidget.css';

const ChatWidget = () => {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [workflowId, setWorkflowId] = useState('');
    const [userId, setUserId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const params = useParams();

    useEffect(() => {
        if (params.workflowId) {
            setWorkflowId(params.workflowId);
        }
        const searchParams = new URLSearchParams(window.location.search);
        const currentUserId = searchParams.get('user_id');
        if (currentUserId) {
            setUserId(currentUserId);
        }
    }, [params.workflowId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async () => {
        const currentInputValue = inputValue.trim();
        if (!currentInputValue || !workflowId || !userId) return;

        const userMessage = { type: 'user', text: currentInputValue };
        setMessages(prevMessages => [...prevMessages, userMessage]);
        setInputValue('');
        setIsLoading(true);

        // Add a placeholder for the bot's response
        const botMessagePlaceholder = { type: 'bot', text: '', sourceDocuments: [], followUpPrompts: [] };
        setMessages(prevMessages => [...prevMessages, botMessagePlaceholder]);

        try {
            const response = await fetch(`/api/v1/widget/${workflowId}/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question: currentInputValue,
                    chatId: userId, 
                    streaming: true,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', response.status, errorText);
                setMessages(prevMessages => prevMessages.map((msg, index) =>
                    index === prevMessages.length - 1 ? { ...msg, text: `Error: ${response.status} ${errorText || 'Failed to fetch'}`, isError: true } : msg
                ));
                setIsLoading(false);
                return;
            }

            if (response.body) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let accumulatedData = '';

                const processStream = async () => {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            setIsLoading(false);
                            break;
                        }

                        accumulatedData += decoder.decode(value, { stream: true });
                        
                        let eventEndIndex;
                        // Process all complete SSE messages in the accumulated data
                        // SSE messages are separated by double newlines: "\n\n"
                        while ((eventEndIndex = accumulatedData.indexOf('\n\n')) !== -1) {
                            const eventString = accumulatedData.substring(0, eventEndIndex);
                            accumulatedData = accumulatedData.substring(eventEndIndex + 2); // Skip the "\n\n"

                            let eventType = 'data'; // Default Flowise event type if not specified
                            let eventDataContent = ''; // Renamed to avoid conflict with eventData variable in outer scope

                            eventString.split('\n').forEach(line => {
                                if (line.startsWith('event:')) {
                                    eventType = line.substring('event:'.length).trim();
                                } else if (line.startsWith('data:')) {
                                    // Accumulate multi-line data if necessary, though Flowise usually sends JSON on one data line
                                    eventDataContent += line.substring('data:'.length).trim();
                                }
                            });

                            if (eventDataContent) {
                                try {
                                    const parsedData = JSON.parse(eventDataContent);
                                    setMessages(prevMessages => prevMessages.map((msg, index) => {
                                        if (index === prevMessages.length - 1) { // Update last message (bot placeholder)
                                            let updatedMsg = { ...msg };
                                            if (eventType === 'data' || (eventType === 'message' && parsedData.message)) { // Common token stream
                                                updatedMsg.text = (updatedMsg.text || '') + (parsedData.message || parsedData.text || '');
                                            } else if (eventType === 'metadata' && parsedData) { // Metadata event
                                                if (parsedData.sourceDocuments) {
                                                    updatedMsg.sourceDocuments = parsedData.sourceDocuments;
                                                }
                                                if (parsedData.followUpPrompts) {
                                                    updatedMsg.followUpPrompts = parsedData.followUpPrompts;
                                                }
                                                // Store other metadata if needed, e.g., chatId from Flowise
                                                if (parsedData.chatId) updatedMsg.chatId = parsedData.chatId; 
                                                if (parsedData.chatMessageId) updatedMsg.messageId = parsedData.chatMessageId;
                                            } else if (parsedData.text && !eventType) { // Fallback for simple text messages if no event type
                                                updatedMsg.text = (updatedMsg.text || '') + parsedData.text;
                                            }
                                            // Flowise specific handling for different data structures
                                            if (parsedData.type === 'token' && parsedData.message) { // another common token stream
                                                updatedMsg.text = (updatedMsg.text || '') + parsedData.message;
                                            }
                                            if (parsedData.sourceDocuments && !eventType) { // If source documents come without specific event
                                                updatedMsg.sourceDocuments = parsedData.sourceDocuments;
                                            }
                                             if (parsedData.followUpPrompts && !eventType) { // If follow up prompts come without specific event
                                                updatedMsg.followUpPrompts = parsedData.followUpPrompts;
                                            }
                                            return updatedMsg;
                                        }
                                        return msg;
                                    }));
                                } catch (e) {
                                    console.error('Error parsing SSE data JSON:', e, eventDataContent);
                                    // If parsing fails, it might be a plain text string (though Flowise usually sends JSON)
                                    if (eventType === 'data' || eventType === 'message') {
                                         setMessages(prevMessages => prevMessages.map((msg, index) => {
                                            if (index === prevMessages.length - 1) {
                                                return { ...msg, text: (msg.text || '') + eventDataContent };
                                            }
                                            return msg;
                                        }));
                                    }
                                }
                            }
                        }
                    }
                };
                await processStream();
            } else {
                 // Fallback for non-streaming or if body is null (should not happen with streaming: true)
                const responseData = await response.json().catch(() => ({ text: "Received empty or invalid response" }));
                setMessages(prevMessages => prevMessages.map((msg, index) =>
                    index === prevMessages.length - 1 ? { ...msg, text: responseData.text || "No text in response", sourceDocuments: responseData.sourceDocuments, followUpPrompts: responseData.followUpPrompts } : msg
                ));
                setIsLoading(false);
            }

        } catch (error) {
            console.error('Network or other error:', error);
            setMessages(prevMessages => prevMessages.map((msg, index) =>
                index === prevMessages.length - 1 ? { ...msg, text: `Error: ${error.message || 'Network error'}`, isError: true } : msg
            ));
            setIsLoading(false);
        }
    };
    
    const handleFollowUpClick = (promptText) => {
        setInputValue(promptText);
        // To automatically send, uncomment the line below and ensure inputValue is updated synchronously if needed
        // setTimeout(() => handleSendMessage(), 0); // Or handle directly if state updates allow
    };


    return (
        <div className="chat-widget-container">
            <div className="chat-messages">
                {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.type}`}>
                        <div className="message-text">{msg.text}</div>
                        {msg.type === 'bot' && msg.sourceDocuments && msg.sourceDocuments.length > 0 && (
                            <div className="source-documents">
                                <strong>Source Documents:</strong>
                                <ul>
                                    {msg.sourceDocuments.map((doc, i) => (
                                        <li key={i}><a href={doc.docUrl} target="_blank" rel="noopener noreferrer">{doc.docName}</a></li>
                                    ))}
                                </ul>
                            </div>
                        )}
                         {msg.type === 'bot' && msg.followUpPrompts && msg.followUpPrompts.length > 0 && (
                            <div className="follow-up-prompts">
                                {msg.followUpPrompts.map((prompt, i) => (
                                    <button key={i} onClick={() => handleFollowUpClick(prompt)} className="follow-up-prompt">
                                        {prompt}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <div className="chat-input">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
                    placeholder="Type your message..."
                    disabled={isLoading}
                />
                <button onClick={handleSendMessage} disabled={isLoading}>
                    {isLoading ? 'Sending...' : 'Send'}
                </button>
            </div>
        </div>
    );
};

export default ChatWidget;
