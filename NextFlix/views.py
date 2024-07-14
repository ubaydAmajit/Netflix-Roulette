from django.shortcuts import render
import requests
from .forms import PreferenceForm
import random


# Fetch Netflix Data
def fetch_movies(genre, min_year, max_year, min_rating, max_rating):
    url = 'https://unogsng.p.rapidapi.com/genres'

    querystring = {
        "genrelist": ','.join(genre),
        "start_year": min_year if min_year else '',
        "end_year": max_year if max_year else '',
        "minrating": min_rating if min_rating else '',
        "maxrating": max_rating if max_rating else ''
    }

    headers = {
        "x-rapidapi-key": "8a632f111fmshea5c7fa67d68cf2p12ac7cjsn52ef161e6b70",
        "x-rapidapi-host": "unogsng.p.rapidapi.com"
    }

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        return response.json().get('results', [])
    return []


def home(request):
    if request.method == 'POST':
        form = PreferenceForm(request.POST)
        if form.is_valid():
            genre = form.cleaned_data['genre']
            min_year = form.cleaned_data['min_year']
            max_year = form.cleaned_data['max_year']
            min_rating = form.cleaned_data['min_rating']
            max_rating = form.cleaned_data['max_rating']
            movies = fetch_movies(genre, min_year, max_year, min_rating, max_rating)
            if movies:
                selected_movie = random.choice(movies)
                return render(request, 'result.html', {'movie': selected_movie})
            else:
                return render(request, 'home.html', {'form': form, 'error': 'No movies found matching your criteria.'})
    else:
        form = PreferenceForm()
    return render(request, 'home.html', {'form': form})


def login(request):
    return render(request, 'login.html')


def watchlist(request):
    return render(request, 'watchlist.html')
