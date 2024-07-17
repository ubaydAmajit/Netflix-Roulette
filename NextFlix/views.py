from django.shortcuts import render
from .forms import PreferenceForm
from .utils import fetch_genres, fetch_countries  # Import utility functions
import requests
import random


# Fetch Netflix Data
def fetch_movies(genre, min_rating, max_rating, country, min_year=1970, max_year=2024):
    url = "https://unogsng.p.rapidapi.com/search"

    querystring = {
        "start_year": min_year if min_year else "1970",
        "end_year": max_year if max_year else "2024",
        "min_rating": min_rating if min_rating else "0",
        "max_rating": max_rating if max_rating else "10",
        "genrelist": genre if genre else "",
        "countrylist": country if country else "78",
        "limit": "100",
        "orderby": "rating",
        "audiosubtitle_andor": "and",
        "subtitle": "english",
        "audio": "english",
        "country_andorunique": "unique",
        "offset": "0"
    }

    headers = {
        "x-rapidapi-key": "8a632f111fmshea5c7fa67d68cf2p12ac7cjsn52ef161e6b70",
        "x-rapidapi-host": "unogsng.p.rapidapi.com"
    }

    response = requests.get(url, headers=headers, params=querystring)

    if response.status_code == 200:
        results = response.json().get('results', [])
        movies = []
        for result in results:
            netflix_id = result.get('nfid', '')
            genres = fetch_movie_by_genre(netflix_id)
            movie = {
                'img': result.get('img', ''),
                'title': result.get('title', ''),
                'year': result.get('year', ''),
                'imdbrating': result.get('imdbrating', ''),
                'synopsis': result.get('synopsis', ''),
                'genres': genres
            }
            movies.append(movie)
        return movies
    else:
        return []


def fetch_movie_by_genre(netflix_id):
    url = "https://unogsng.p.rapidapi.com/titlegenres"

    querystring = {"netflixid": netflix_id}

    headers = {
        "x-rapidapi-key": "8a632f111fmshea5c7fa67d68cf2p12ac7cjsn52ef161e6b70",
        "x-rapidapi-host": "unogsng.p.rapidapi.com"
    }

    response = requests.get(url, headers=headers, params=querystring)

    if response.status_code == 200:
        genres = response.json().get('results', [])
        return [genre['genre'] for genre in genres]
    else:
        return []


def home(request):
    if request.method == "POST":
        form = PreferenceForm(request.POST)
        if form.is_valid():
            genre = form.cleaned_data.get('genre')
            min_rating = form.cleaned_data.get('min_rating')
            max_rating = form.cleaned_data.get('max_rating')
            country = form.cleaned_data.get('country')

            movies = fetch_movies(genre, min_rating, max_rating, country)

            if movies:
                random_movie = random.choice(movies)
                return render(request, 'home.html', {'form': form, 'movie': random_movie})
            else:
                return render(request, 'home.html', {'form': form, 'error': 'No movies found matching your criteria.'})
    else:
        form = PreferenceForm()

    return render(request, 'home.html', {'form': form})


def login(request):
    return render(request, 'login.html')


def watchlist(request):
    return render(request, 'watchlist.html')
