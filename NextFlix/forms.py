from django import forms


class PreferenceForm(forms.Form):
    GENRE_CHOICES = [
        ('action', 'Action'),
        ('comedy', 'Comedy'),
        ('drama', 'Drama'),
        ('horror', 'Horror'),
        ('romance', 'Romance'),
    ]
    genre = forms.MultipleChoiceField(choices=GENRE_CHOICES, widget=forms.CheckboxSelectMultiple)
    min_year = forms.IntegerField(label='Min Year', required=False)
    max_year = forms.IntegerField(label='Max Year', required=False)
    min_rating = forms.FloatField(label='Min Rating', required=False)
    max_rating = forms.FloatField(label='Max Rating', required=False)
