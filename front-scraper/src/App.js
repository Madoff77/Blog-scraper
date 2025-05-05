import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

export default function App() {
  const [filters, setFilters] = useState({
    dateStart: '',
    dateEnd: '',
    auteur: '',
    categorie: '',
    sousCategorie: '',
    titre: '',
  });
  const [categories, setCategories] = useState([]);
  const [subMap, setSubMap] = useState({});
  const [articles, setArticles] = useState([]);
  const [error, setError] = useState(null);

  // Charger les catégories et sous-catégories au montage
  useEffect(() => {
    axios
      .get('http://localhost:8000/api/articles/categories')
      .then(({ data }) => {
        setSubMap(data);
        setCategories(Object.keys(data));
      })
      .catch((err) =>
        console.error('Impossible de charger les catégories', err)
      );
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      // si on change la catégorie, on réinitialise la sous-catégorie
      ...(name === 'categorie' ? { sousCategorie: '' } : {}),
    }));
  };

  const searchArticles = async () => {
    try {
      const { data } = await axios.post(
        'http://localhost:8000/api/articles/search',
        filters
      );
      setArticles(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Impossible de récupérer les articles.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* NAVBAR */}
      <nav className="bg-white shadow-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-indigo-600">Blog Scraper</h1>
          <a href="/" className="text-gray-600 hover:text-indigo-600 transition">
            Accueil
          </a>
        </div>
      </nav>

      <div className="p-6">
        {/* TITRE */}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-5xl font-bold text-center text-gray-800 mb-8"
        >
          Recherche d&apos;Articles
        </motion.h1>

        {/* FILTRE */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white shadow rounded-2xl p-8 mb-12 max-w-4xl mx-auto"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Date de début */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de début
              </label>
              <input
                type="date"
                name="dateStart"
                value={filters.dateStart}
                onChange={handleChange}
                className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            {/* Date de fin */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de fin
              </label>
              <input
                type="date"
                name="dateEnd"
                value={filters.dateEnd}
                onChange={handleChange}
                className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            {/* Auteur */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Auteur
              </label>
              <input
                name="auteur"
                value={filters.auteur}
                onChange={handleChange}
                className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Nom de l'auteur"
              />
            </div>
            {/* Catégorie */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Catégorie
              </label>
              <select
                name="categorie"
                value={filters.categorie}
                onChange={handleChange}
                className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Toutes</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            {/* Sous-catégorie */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sous-catégorie
              </label>
              <select
                name="sousCategorie"
                value={filters.sousCategorie}
                onChange={handleChange}
                disabled={!filters.categorie}
                className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
              >
                <option value="">Toutes</option>
                {(subMap[filters.categorie] || []).map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
            {/* Mot-clé Titre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot-clé Titre
              </label>
              <input
                name="titre"
                value={filters.titre}
                onChange={handleChange}
                className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Votre recherche…"
              />
            </div>
          </div>

          <button
            onClick={searchArticles}
            className="mt-6 w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition flex justify-center items-center gap-2"
          >
            <Search size={20} />
            Lancer la recherche
          </button>
          {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
        </motion.div>

        {/* RÉSULTAT */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {articles.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-gray-600 col-span-full"
            >
              Aucun article trouvé.
            </motion.p>
          ) : (
            articles.map((article) => {
              const imgs = Object.values(article.images || {}).slice(0, 2);
              return (
                <motion.div
                  key={article.url}
                  className="group"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="bg-white rounded-2xl overflow-hidden shadow-md group-hover:shadow-xl transition transform group-hover:-translate-y-1">
                    {/* IMAGE */}
                    {imgs.length > 0 ? (
                      <div className="grid grid-cols-2 gap-1">
                        {imgs.map((img, i) => (
                          <img
                            key={i}
                            src={img.url}
                            alt={img.description}
                            className="w-full h-40 object-cover"
                          />
                        ))}
                      </div>
                    ) : (
                      <img
                        src={article.thumbnail}
                        alt={article.titre}
                        className="w-full h-48 object-cover"
                      />
                    )}

                    <div className="p-6 space-y-4">
                      <span className="inline-block bg-indigo-100 text-indigo-600 text-xs font-semibold px-2 py-1 rounded-full">
                        {article.categorie}
                      </span>
                      <h2 className="text-2xl font-semibold text-gray-800 group-hover:text-indigo-600 transition">
                        {article.titre}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {article.date_publication} • {article.auteur}
                      </p>
                      <p className="text-gray-700 line-clamp-3">
                        {article.resume}
                      </p>
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Lire l’article →
                      </a>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
  