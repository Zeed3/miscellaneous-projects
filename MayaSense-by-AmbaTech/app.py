from flask import Flask, request, jsonify, render_template
import openai
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'Utility'))
import json
import time
import winsound
import pyaudio
import wave
from emoji import demojize
from threading import Thread
from Utility.translate import *
from Utility.TTS import *
from Utility.subtitle import *
from Utility.promptMaker import *

app = Flask(__name__)

# to help the CLI write unicode characters to the terminal
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf8', buffering=1)

# use your own API Key, you can get it from https://openai.com/. I place my API Key in a separate file called config.py
openai.api_key = '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'

conversation = []
# Create a dictionary to hold the message data
history = {"history": conversation}

chat = ""
chat_now = ""
chat_prev = ""
is_Speaking = False
owner_name = "User"
isRecording = False
transcribed_text = ""
selected_text_language = "EN"  # Default text language
selected_voice_language = "EN"  # Default voice language

@app.route('/')
def index():
    # Render the main page
    return render_template('index.html')

@app.route("/get-response")
def get_response():
    # Get the response from the output.txt file
    try:
        with open("output.txt", "r") as file:
            content = file.read()
        return jsonify({"response": content})
    except FileNotFoundError:
        return jsonify({"response": "No response available yet."})

@app.route('/api/chat/history', methods=['GET'])
def get_chat_history():
    # Return the chat history as JSON
    return jsonify(history)

@app.route('/api/chat/ask', methods=['POST'])
def ask_question():
    # Handle the user's question and get a response from OpenAI
    data = request.json
    question = data.get('question')
    if question:
        result = question
        conversation.append({'role': 'user', 'content': result})
        answer = openai_answer()
        return jsonify({'words': answer})
    return jsonify({'error': 'No question provided'}), 400

@app.route('/api/chat/reset', methods=['POST'])
def reset_chat():
    # Reset the chat history
    global conversation
    conversation = []
    history["history"] = conversation
    return jsonify({"success": True})

@app.route('/api/audio/devices', methods=['GET'])
def get_audio_devices():
    # Get the list of available audio input devices
    p = pyaudio.PyAudio()
    device_count = p.get_device_count()
    devices = []
    for i in range(device_count):
        device_info = p.get_device_info_by_index(i)
        if device_info['maxInputChannels'] > 0:
            devices.append({
                'index': i,
                'name': device_info['name']
            })
    p.terminate()
    return jsonify(devices)

@app.route('/api/audio/record', methods=['POST'])
def record_audio():
    # Start recording audio from the specified device
    global isRecording
    data = request.json
    device_index = data.get('device_index', 1)  # Default to device index 1 if not provided
    CHUNK = 1024
    FORMAT = pyaudio.paInt16
    CHANNELS = 1
    RATE = 44100
    WAVE_OUTPUT_FILENAME = "input.wav"
    p = pyaudio.PyAudio()
    stream = p.open(format=FORMAT,
                    channels=CHANNELS,
                    rate=RATE,
                    input=True,
                    input_device_index=device_index,
                    frames_per_buffer=CHUNK)
    frames = []
    isRecording = True
    print("Recording...")

    def record():
        # Record audio in a separate thread
        global isRecording, transcribed_text
        while isRecording:
            data = stream.read(CHUNK)
            frames.append(data)
        print("Stopped recording.")
        stream.stop_stream()
        stream.close()
        p.terminate()
        wf = wave.open(WAVE_OUTPUT_FILENAME, 'wb')
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(p.get_sample_size(FORMAT))
        wf.setframerate(RATE)
        wf.writeframes(b''.join(frames))
        wf.close()
        transcribed_text = transcribe_audio(WAVE_OUTPUT_FILENAME)

    thread = Thread(target=record)
    thread.start()
    return jsonify({"message": "Recording started"})

@app.route('/api/audio/stop', methods=['POST'])
def stop_audio():
    # Stop recording audio and transcribe the recorded audio
    global isRecording, transcribed_text
    isRecording = False
    while transcribed_text == "":
        time.sleep(0.1)
    result = transcribed_text
    conversation.append({'role': 'user', 'content': result})
    answer = openai_answer()
    response = {
        "message": "Recording stopped",
        "transcription": transcribed_text,
        "answer": answer
    }
    transcribed_text = ""
    return jsonify(response)

@app.route('/api/language', methods=['POST'])
def set_language():
    # Set the text and voice language preferences
    global selected_text_language, selected_voice_language
    data = request.json
    text_language = data.get('text_language')
    voice_language = data.get('voice_language')
    if text_language in ["EN", "JA", "ID"] and voice_language in ["EN", "JA", "ID"]:
        selected_text_language = text_language
        selected_voice_language = voice_language
        return jsonify({"message": f"Text language set to {text_language}, Voice language set to {voice_language}"})
    return jsonify({"error": "Invalid language"}), 400

# Function to transcribe the user's audio
def transcribe_audio(file):
    global chat_now
    try:
        audio_file = open(file, "rb")
        transcript = openai.Audio.transcribe("whisper-1", audio_file)
        chat_now = transcript.text
        print("Question: " + chat_now)
    except Exception as e:
        print(f"Error transcribing audio: {e}")
        return ""

    return chat_now

# Function to get an answer from OpenAI
def openai_answer():
    global conversation

    total_characters = sum(len(d['content']) for d in conversation)

    while total_characters > 4000:
        try:
            conversation.pop(2)
            total_characters = sum(len(d['content']) for d in conversation)
        except Exception as e:
            print("Error removing old messages: {0}".format(e))

    with open("conversation.json", "w", encoding="utf-8") as f:
        json.dump(history, f, indent=4)

    prompt = getPrompt()

    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=prompt,
        max_tokens=216,
        temperature=1,
        top_p=0.9
    )
    message = response['choices'][0]['message']['content']
    conversation.append({'role': 'assistant', 'content': message})

    translated_message = translate_text(message)
    
    return translated_message

# Function to translate text and generate TTS
def translate_text(text):
    global is_Speaking, selected_text_language, selected_voice_language
    detect = detect_google(text)
    tts = text
    display_text = text

    # Translate text for display
    if selected_text_language != detect:
        display_text = translate_google(text, detect, selected_text_language)

    # Translate text for TTS
    try:
        if selected_voice_language == "EN":
            tts = translate_google(text, detect, "EN")
            silero_tts(tts, "en", "v3_en", "en_21")
        elif selected_voice_language == "JA":
            tts = translate_google(text, detect, "JA")
            voicevox_tts(tts)
        elif selected_voice_language == "ID":
            tts = translate_google(text, detect, "ID")
            silero_tts(tts, "en", "v3_en", "en_24")
    except Exception as e:
        print("Error printing text: {0}".format(e))
        return

    generate_subtitle(chat_now, display_text)

    print("Answer: " + display_text)

    is_Speaking = True
    winsound.PlaySound("test.wav", winsound.SND_FILENAME)
    is_Speaking = False

    # Wait for 1 second and truncate the files
    time.sleep(1)
    with open("output.txt", "w") as f:
        f.truncate(0)
    with open("chat.txt", "w") as f:
        f.truncate(0)

    return display_text

if __name__ == '__main__':
    app.run(debug=True)