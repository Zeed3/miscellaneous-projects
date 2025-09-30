import json
import sys
import os

sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf8', buffering=1)

outputNum = 1000

def getIdentity(identityPath):  
    with open(identityPath, "r", encoding="utf-8") as f:
        identityContext = f.read()
    return {"role": "system", "content": identityContext}

def getTrainingData():
    training_data = []
    datatrain_path = "dataset"
    for filename in os.listdir(datatrain_path):
        if filename.endswith(".txt") or filename.endswith(".json"):
            with open(os.path.join(datatrain_path, filename), "r", encoding="utf-8") as f:
                if filename.endswith(".txt"):
                    content = f.read()
                    training_data.append({"role": "system", "content": content.strip()})
                elif filename.endswith(".json"):
                    data = json.load(f)
                    for item in data:
                        question = item.get("question", "")
                        answer = item.get("answer", "")
                        training_data.append({"role": "system", "content": f"Q: {question}\nA: {answer}"})
    return training_data

def getPrompt():
    prompt = []
    prompt.append(getIdentity("CharacterIdentity.txt"))
    prompt.append({"role": "system", "content": "Below is conversation history to help students with their inquiries.\n"})

    with open("conversation.json", "r") as f:
        data = json.load(f)
    history = data["history"]
    for message in history[:-1]:
        prompt.append(message)

    prompt.append(
        {
            "role": "system",
            "content": f"Here is the latest conversation to assist students.\n*Make sure your response is within {outputNum} characters!\n",
        }
    )

    prompt.append(history[-1])

    # Add training data to the prompt
    training_data = getTrainingData()
    # prompt.extend(training_data)

    total_len = sum(len(d['content']) for d in prompt)
    
    while total_len > 4000:
        if len(prompt) > 2:
            prompt.pop(2)
        else:
            break
        total_len = sum(len(d['content']) for d in prompt)

    return prompt

if __name__ == "__main__":
    prompt = getPrompt()
    print(prompt)
    print(len(prompt))