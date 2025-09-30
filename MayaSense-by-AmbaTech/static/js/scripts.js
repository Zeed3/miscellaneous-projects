document.addEventListener('DOMContentLoaded', function() {
    // Side menu elements
    const sideMenu = document.querySelector('.side-menu');
    const menuToggleButton = document.querySelector('.hamburger-icon');
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    document.body.appendChild(overlay);

    // Side menu toggle
    menuToggleButton.addEventListener('click', function(event) {
        event.stopPropagation();
        document.body.classList.toggle('menu-open');
    });

    // Close side menu when clicking outside
    document.body.addEventListener('click', function(event) {
        if (!sideMenu.contains(event.target) && !menuToggleButton.contains(event.target)) {
            document.body.classList.remove('menu-open');
        }
    });

    overlay.addEventListener('click', function() {
        document.body.classList.remove('menu-open');
    });

    // Chat elements
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const chatBox = document.getElementById('chat-box');
    const chatHistoryBtn = document.getElementById('chat-history-btn');
    const chatHistoryPopup = document.getElementById('chat-history-popup');
    const closeChatHistoryBtn = document.getElementById('close-chat-history');
    const chatHistoryContent = document.getElementById('chat-history-content');
    const downloadChatBtn = document.getElementById('download-chat');
    const resetBtn = document.getElementById('reset-btn');
    const resetPopup = document.getElementById('reset-popup');
    const closeResetPopupBtn = document.getElementById('close-reset-popup');
    const confirmResetBtn = document.getElementById('confirm-reset');
    const cancelResetBtn = document.getElementById('cancel-reset');
    const voiceRecognitionButton = document.getElementById('voice-recognition-button');
    const languageBtn = document.getElementById('language-btn');
    const settingsPopup = document.getElementById('settings-popup');
    const closeSettingsPopupBtn = document.getElementById('close-settings-popup');
    const saveSettingsBtn = document.getElementById('save-settings');
    const textLanguageSelect = document.getElementById('text-language');
    const voiceLanguageSelect = document.getElementById('voice-language');
    const thinkingMessage = document.getElementById('thinking-message');
    const helpBtn = document.getElementById('help-btn');
    const feedbackBtn = document.getElementById('feedback-btn');
    const helpPopup = document.getElementById('help-popup');
    const closeHelpPopupBtn = document.getElementById('close-help-popup');
    const feedbackPopup = document.getElementById('feedback-popup');
    const closeFeedbackPopupBtn = document.getElementById('close-feedback-popup');
    const submitFeedbackBtn = document.getElementById('submit-feedback');
    const feedbackTextarea = document.getElementById('feedback-textarea');
    const aboutBtn = document.getElementById('about-btn');
    const aboutPopup = document.getElementById('about-modal');
    const closeAboutPopupBtn = document.querySelector('#about-modal .close-btn');

    let recognition;
    let isRecognizing = false;
    let isRecording = false;

    // Initialize Web Speech API
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        // Event handler for when voice recognition starts
        recognition.onstart = function() {
            console.log('Voice recognition started');
        };

        // Event handler for processing voice recognition results
        recognition.onresult = function(event) {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            chatInput.value = finalTranscript || interimTranscript;
        };

        // Event handler for voice recognition errors
        recognition.onerror = function(event) {
            console.error('Voice recognition error', event);
        };

        // Event handler for when voice recognition ends
        recognition.onend = function() {
            console.log('Voice recognition ended');
            isRecognizing = false;
            voiceRecognitionButton.textContent = '🎤';
            const userInput = chatInput.value.trim();
            if (userInput) {
                addMessageToChat('user', userInput);
                showThinkingMessage();
                fetch('/api/chat/ask', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ question: userInput })
                })
                .then(response => response.json())
                .then(data => {
                    hideThinkingMessage();
                    if (data.words) {
                        addMessageToChat('assistant', formatMessage(data.words));
                    }
                });
            }
        };
    } else {
        console.warn('Web Speech API is not supported in this browser');
    }

    // Event handler for voice recognition button click
    voiceRecognitionButton.addEventListener('click', function() {
        if (isRecording) {
            // Stop recording
            fetch('/api/audio/stop', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                console.log('Recording stopped:', data);
                isRecording = false;
                voiceRecognitionButton.textContent = '🎤';
                // Display the answer
                addMessageToChat('user', data.transcription);
                addMessageToChat('assistant', formatMessage(data.answer));
            })
            .catch(error => {
                console.error('Error stopping recording:', error);
            });
        } else {
            // Start recording
            fetch('/api/audio/devices')
                .then(response => response.json())
                .then(devices => {
                    console.log('Audio devices:', devices);
                    // Select the first available device for simplicity
                    const deviceIndex = devices.length > 0 ? devices[0].index : 1;
                    fetch('/api/audio/record', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ device_index: deviceIndex })
                    })
                    .then(response => response.json())
                    .then(data => {
                        console.log('Recording started:', data);
                        isRecording = true;
                        voiceRecognitionButton.textContent = '🔴';
                    })
                    .catch(error => {
                        console.error('Error starting recording:', error);
                    });
                })
                .catch(error => {
                    console.error('Error fetching audio devices:', error);
                });
        }
    });

    // Event handler for send button click
    sendButton.addEventListener('click', function() {
        const userInput = chatInput.value.trim();
        if (userInput) {
            addMessageToChat('user', userInput);
            chatInput.value = '';
            showThinkingMessage();
            fetch('/api/chat/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ question: userInput })
            })
            .then(response => response.json())
            .then(data => {
                hideThinkingMessage();
                if (data.words) {
                    addMessageToChat('assistant', formatMessage(data.words));
                }
            });
        }
    });

    // Event handler for chat history button click
    chatHistoryBtn.addEventListener('click', function() {
        fetch('/api/chat/history')
            .then(response => response.json())
            .then(data => {
                chatHistoryContent.innerHTML = '';
                data.history.forEach(item => {
                    const message = document.createElement('p');
                    message.innerHTML = `${item.role === 'user' ? 'User' : 'Maya'} : ${formatMessage(item.content)}`;
                    chatHistoryContent.appendChild(message);
                });
                chatHistoryPopup.classList.add('open');
            });
    });

    // Event handler for closing chat history popup
    closeChatHistoryBtn.addEventListener('click', function() {
        chatHistoryPopup.classList.remove('open');
    });

    // Event handler for downloading chat history
    downloadChatBtn.addEventListener('click', function() {
        const chatHistoryText = chatHistoryContent.innerText;
        const blob = new Blob([chatHistoryText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'chat_history.txt';
        a.click();
        URL.revokeObjectURL(url);
    });

    // Event handler for reset button click
    resetBtn.addEventListener('click', function() {
        resetPopup.classList.add('open');
    });

    // Event handler for closing reset popup
    closeResetPopupBtn.addEventListener('click', function() {
        resetPopup.classList.remove('open');
    });

    // Event handler for confirming reset
    confirmResetBtn.addEventListener('click', function() {
        chatBox.innerHTML = '';
        chatHistoryContent.innerHTML = '';
        fetch('/api/chat/reset', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }).then(() => {
            resetPopup.classList.remove('open');
        });
    });

    // Event handler for canceling reset
    cancelResetBtn.addEventListener('click', function() {
        resetPopup.classList.remove('open');
    });

    // Function to add a message to the chat
    function addMessageToChat(role, message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', role);
        messageElement.innerHTML = formatMessage(message);
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
        setTimeout(() => {
            messageElement.classList.add('show');
        }, 10);
    }

    // Function to format the message
    function formatMessage(message) {
        // Replace newline characters with <br> and double asterisks with <b> tags
        return message
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    }

    // Show "Maya is thinking..." message
    function showThinkingMessage() {
        thinkingMessage.style.display = 'block';
    }

    // Hide "Maya is thinking..." message
    function hideThinkingMessage() {
        thinkingMessage.style.display = 'none';
    }

    // Language & Audio Settings
    languageBtn.addEventListener('click', function() {
        settingsPopup.classList.add('open');
    });

    closeSettingsPopupBtn.addEventListener('click', function() {
        settingsPopup.classList.remove('open');
    });

    saveSettingsBtn.addEventListener('click', function() {
        const textLanguage = textLanguageSelect.value;
        const voiceLanguage = voiceLanguageSelect.value;

        fetch('/api/language', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text_language: textLanguage, voice_language: voiceLanguage })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Language settings saved:', data);
            settingsPopup.classList.remove('open');
        })
        .catch(error => {
            console.error('Error saving language settings:', error);
        });
    });

    // About Popup
    aboutBtn.addEventListener('click', function() {
        aboutPopup.classList.add('open');
    });

    closeAboutPopupBtn.addEventListener('click', function() {
        aboutPopup.classList.remove('open');
    });

    // Help Popup
    helpBtn.addEventListener('click', function() {
        helpPopup.classList.add('open');
    });

    closeHelpPopupBtn.addEventListener('click', function() {
        helpPopup.classList.remove('open');
    });

    // Feedback Popup
    feedbackBtn.addEventListener('click', function() {
        feedbackPopup.classList.add('open');
    });

    closeFeedbackPopupBtn.addEventListener('click', function() {
        feedbackPopup.classList.remove('open');
    });

    // Event handler for submitting feedback
    submitFeedbackBtn.addEventListener('click', function() {
        const feedback = feedbackTextarea.value.trim();
        if (feedback) {
            fetch('/api/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ feedback: feedback })
            })
            .then(response => response.json())
            .then(data => {
                console.log('Feedback submitted:', data);
                feedbackTextarea.value = '';
                feedbackPopup.classList.remove('open');
            })
            .catch(error => {
                console.error('Error submitting feedback:', error);
            });
        }
    });
});