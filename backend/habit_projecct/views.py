from django.http import HttpResponse

def index(request):
    return HttpResponse("日次習慣トラッカー API（Django 側）は動いています。")
