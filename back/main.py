from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from pydantic import BaseModel
from typing import Optional

app = FastAPI()

# Configuration CORS pour autoriser le frontend React
template_front = "http://localhost:3000"
app.add_middleware(
    CORSMiddleware,
    allow_origins=[template_front],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connexion à MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['blogdumoderateur']
collection = db['articles']

# Modèle Pydantic pour les filtres de recherche
class ArticleFilter(BaseModel):
    dateStart: Optional[str] = None
    dateEnd: Optional[str] = None
    auteur: Optional[str] = None
    categorie: Optional[str] = None
    sousCategorie: Optional[str] = None
    titre: Optional[str] = None

@app.post('/api/articles/search')
def search_articles(filters: ArticleFilter):
    # Construction de la requête MongoDB
    query = {}

    if filters.dateStart or filters.dateEnd:
        query['date_publication'] = {}
        if filters.dateStart:
            query['date_publication']['$gte'] = filters.dateStart
        if filters.dateEnd:
            query['date_publication']['$lte'] = filters.dateEnd

    if filters.auteur:
        query['auteur'] = {'$regex': filters.auteur, '$options': 'i'}
    if filters.categorie:
        query['categorie'] = {'$regex': filters.categorie, '$options': 'i'}
    if filters.sousCategorie:
        query['sous_categorie'] = {'$regex': filters.sousCategorie, '$options': 'i'}
    if filters.titre:
        query['titre'] = {'$regex': filters.titre, '$options': 'i'}

    # Exécution de la recherche
    articles = list(collection.find(query, {'_id': 0}))
    return articles

@app.get("/api/articles/categories")
def get_categories():
    """
    Retourne un dict { catégorie: [sous_catégorie, …], … }
    """
    cats = collection.distinct('categorie')
    result = {}
    for cat in cats:
        # on filtre les sous-cats liées à cette catégorie, sans doublons
        subs = collection.distinct('sous_categorie', {'categorie': cat})
        result[cat] = subs
    return result