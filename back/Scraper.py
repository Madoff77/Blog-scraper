import requests
from bs4 import BeautifulSoup
from pymongo import MongoClient
from urllib.parse import urlparse
from datetime import datetime
import re

MONGO_URI      = 'mongodb://localhost:27017/'
DB_NAME        = 'blogdumoderateur'
COLLECTION_NAME= 'articles'
MAX_PAGES = 50

# Pages de listing à scrapper pour récupérer les URLs d'articles
LISTING_URLS = [
    'https://www.blogdumoderateur.com/articles/',
]

# CONNEXION MONGO


client     = MongoClient(MONGO_URI)
db         = client[DB_NAME]
collection = db[COLLECTION_NAME]



def extract_author(soup):
    """Extrait l'auteur depuis un span.vcard ou avant la date."""
    span = soup.find('span', class_=re.compile(r'author|vcard'))
    if span:
        a = span.find('a')
        if a:
            return a.get_text(strip=True)
    time_tag = soup.find('time')
    if time_tag:
        prev_a = time_tag.find_previous('a')
        if prev_a and prev_a.get_text(strip=True):
            return prev_a.get_text(strip=True)
    return None

def extract_categories(soup):
    """Extrait catégorie principale et sous-catégorie via meta tags ou éléments actifs."""
    # catégorie principale
    category = None
    if meta := soup.find('meta', property='article:section'):
        category = meta.get('content', '').strip() or None

    if not category:
        if active := soup.select_one('li.current-cat a, a.current-category'):
            category = active.get_text(strip=True)

    # sous-catégorie 
    tags = [mt['content'].strip() for mt in soup.find_all('meta', property='article:tag') if mt.has_attr('content')]
    sous_categorie = tags[0] if tags else category
    return category, sous_categorie

def extract_resume(soup):
    """Extrait le chapô / résumé via lead, entry-summary ou premier paragraphe."""
    if tag := soup.find('p', class_='lead') or soup.find('p', class_='entry-summary') or soup.find('div', class_='excerpt'):
        return tag.get_text(strip=True)
    if title := soup.find('h1'):
        if p := title.find_next('p'):
            return p.get_text(strip=True)
    return None


def is_article_url(url: str) -> bool:
    """
    Détermine si une URL est un réel article :
      - Chemin à un seul segment (slug)
      - Ce segment contient au moins un '-'
    """
    path = urlparse(url).path.rstrip('/')
    parts = [p for p in path.split('/') if p]
    return len(parts) == 1 and '-' in parts[0]

def get_article_links(listing_url: str) -> list[str]:
    """
    Récupère et filtre les liens d'une page de listing.
    Ne garde que ceux qui passent is_article_url.
    """
    resp = requests.get(listing_url)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, 'html.parser')
    domain = urlparse(listing_url).scheme + '://' + urlparse(listing_url).netloc

    links = set()
    for a in soup.find_all('a', href=True):
        href = a['href'].split('#')[0]  
        if not href.startswith(domain):
            continue
        if is_article_url(href):
            links.add(href)

    return list(links)

def gather_all_links() -> list[str]:
    all_links = set()
    for page in range(1, MAX_PAGES+1):
        url = f'https://www.blogdumoderateur.com/articles/page/{page}/'
        try:
            found = get_article_links(url)
        except requests.HTTPError as e:
            print(f"[SKIP] page {page} indisponible ({e}), on arrête.")
            break
        if not found:
            print(f"[DONE] plus aucun lien à la page {page}, stop pagination.")
            break
        print(f"{len(found)} liens trouvés sur la page {page}")
        all_links.update(found)
    print(f"Total d’articles uniques à scraper : {len(all_links)}")
    return list(all_links)


def scrape_article(url: str):
    """Scrape un article, construit le document, et upsert en MongoDB."""
    resp = requests.get(url)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, 'html.parser')

    # titre
    titre = soup.find('h1').get_text(strip=True) if soup.find('h1') else None

    # thumbnail via meta og:image
    thumbnail = None
    if og := soup.find('meta', property='og:image'):
        thumbnail = og.get('content', None)

    # auteur, catégories, résumé
    auteur = extract_author(soup)
    categorie, sous_categorie = extract_categories(soup)
    resume = extract_resume(soup)

    # date de publication 
    date_pub = None
    if time_tag := soup.find('time'):
        if dt := time_tag.get('datetime'):
            date_pub = dt[:10]

    #  les images 
    images = {}
    for idx, img in enumerate(soup.select('article img'), start=1):
        src = img.get('src') or img.get('data-src')
        alt = img.get('alt') or img.get('title') or ''
        images[f'image_{idx}'] = {'url': src, 'description': alt.strip()}

    doc = {
        'url':              url,
        'titre':            titre,
        'thumbnail':        thumbnail,
        'auteur':           auteur,
        'categorie':        categorie,
        'sous_categorie':   sous_categorie,
        'resume':           resume,
        'date_publication': date_pub,
        'images':           images,
        'scraped_at':       datetime.utcnow()
    }

    collection.update_one({'url': url}, {'$set': doc}, upsert=True)
    print(f"[OK] {titre} — auteur: {auteur}, cat: {categorie}, imgs: {len(images)}")



if __name__ == '__main__':
    # 1) Récupérer tous les liens d'articles
    links = gather_all_links()

    # 2) Scrape et upsert chaque article
    print("Démarrage du scraping de tous les articles…")
    for link in links:
        try:
            scrape_article(link)
        except Exception as e:
            print(f"[ERREUR SCRAPING] {link} → {e}")

    print("Scraping terminé, base MongoDB mise à jour.")
