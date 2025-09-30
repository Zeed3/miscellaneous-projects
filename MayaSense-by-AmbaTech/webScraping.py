# To run the code and scrape the data from the website, you need to have Python installed on your system along with the `requests` and `beautifulsoup4` libraries. Here are the steps to run the code:

# 1. **Install Python**: If you don't have Python installed, download and install it from [python.org](https://www.python.org/).

# 2. **Install Required Libraries**: Open a terminal or command prompt and run the following commands to install the required libraries:
#     ```sh
#     pip install requests
#     pip install beautifulsoup4
#     ```

# 3. **Save the Code**: Save the provided code in a Python file, for example, `scrape_data.py`.

# 4. **Run the Code**: Open a terminal or command prompt, navigate to the directory where `scrape_data.py` is saved, and run the following command:
#     ```sh
#     python scrape_data.py
#     ```

# This will execute the script, scrape the data from the specified website, and save it to `data.txt`. Make sure to replace `'https://example.com'` with the actual URL of the website you want to scrape.
import requests
from bs4 import BeautifulSoup
import os

# For getting more data about campus by website scraping
def scrape_website(url, filename):
    response = requests.get(url)
    if response.status_code == 200:
        soup = BeautifulSoup(response.content, 'html.parser')
        # Ensure the directory exists
        os.makedirs('dataset', exist_ok=True)
        filepath = os.path.join('dataset', filename + '.txt')
        with open(filepath, 'w', encoding='utf-8') as file:
            file.write(soup.prettify())
        print(f"Data scraped and saved to {filepath}")
    else:
        print(f"Failed to retrieve the website. Status code: {response.status_code}")

if __name__ == "__main__":
    url = input("Enter the website URL: ")
    filename = input("Enter the filename to save the data (without extension): ")
    scrape_website(url, filename)