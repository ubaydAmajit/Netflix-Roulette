from django import forms
from .utils import fetch_genres, fetch_countries

RATING_CHOICES = [(i, str(i)) for i in range(1, 11)]


class PreferenceForm(forms.Form):
    genre = forms.ChoiceField(choices=[], required=False)
    min_rating = forms.ChoiceField(choices=RATING_CHOICES, required=False)
    max_rating = forms.ChoiceField(choices=RATING_CHOICES, required=False)
    country = forms.ChoiceField(choices=[], required=False)

    def __init__(self, *args, **kwargs):
        super(PreferenceForm, self).__init__(*args, **kwargs)
        self.fields['genre'].choices = [('', 'Any Genre')] + fetch_genres()
        self.fields['country'].choices = [('', 'Any Country')] + fetch_countries()
