import requests


def fetch_genres():
    url = "https://unogsng.p.rapidapi.com/genres"

    headers = {
        "x-rapidapi-key": "8a632f111fmshea5c7fa67d68cf2p12ac7cjsn52ef161e6b70",
        "x-rapidapi-host": "unogsng.p.rapidapi.com"
    }

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        # Extract genre id and name from the JSON response
        genres = response.json()
        # genres is a dictionary where key is genre ID and value is genre name
        return [(genre_id, genre_name) for genre_id, genre_name in genres.items()]
    else:
        return []


def fetch_countries():
    url = "https://unogsng.p.rapidapi.com/countries"

    headers = {
        "x-rapidapi-key": "8a632f111fmshea5c7fa67d68cf2p12ac7cjsn52ef161e6b70",
        "x-rapidapi-host": "unogsng.p.rapidapi.com"
    }

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        # Extract country id and name from the JSON response
        countries = response.json().get('results', [])
        return [(country['id'], country['country'].strip()) for country in countries]
    else:
        return []
